using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class MediaStorageService(IWebHostEnvironment environment, TrainingDbContext dbContext)
{
    private const long MaxVideoBytes = 2L * 1024 * 1024 * 1024;
    private const long MaxImageBytes = 20L * 1024 * 1024;
    private const long MaxCaptionBytes = 5L * 1024 * 1024;
    private const long MaxDocumentBytes = 100L * 1024 * 1024;

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".webm", ".mov", ".m4v"
    };

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> CaptionExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".vtt", ".srt"
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
        ".mp4", ".webm", ".mov", ".m4v"
    };

    public async Task<MediaUploadResponse> SaveAsync(
        IFormFile file,
        string mediaType,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("File upload không hợp lệ.");
        }

        var normalizedType = NormalizeMediaType(mediaType);
        var extension = Path.GetExtension(file.FileName);
        ValidateFile(normalizedType, extension, file.Length);

        var folder = normalizedType switch
        {
            "video" => "videos",
            "poster" => "posters",
            "caption" => "captions",
            "document" => "documents",
            _ => "files"
        };

        var targetDirectory = Path.Combine(GetWebRoot(), "uploads", folder);
        Directory.CreateDirectory(targetDirectory);

        var safeBaseName = Path.GetFileNameWithoutExtension(file.FileName).Trim().ToLowerInvariant();
        safeBaseName = string.Concat(safeBaseName.Select(character =>
            char.IsLetterOrDigit(character) ? character : '-')).Trim('-');
        if (string.IsNullOrWhiteSpace(safeBaseName))
        {
            safeBaseName = "media";
        }

        var fileName = $"{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{safeBaseName}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var targetPath = Path.Combine(targetDirectory, fileName);
        await using (var stream = File.Create(targetPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return new MediaUploadResponse
        {
            FileName = fileName,
            OriginalFileName = file.FileName,
            Url = $"/uploads/{folder}/{fileName}",
            ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? GetContentType(extension)
                : file.ContentType,
            SizeBytes = file.Length,
            MediaType = normalizedType
        };
    }

    public IReadOnlyCollection<MediaLibraryItemResponse> GetLibrary()
    {
        var uploadsRoot = Path.Combine(GetWebRoot(), "uploads");
        if (!Directory.Exists(uploadsRoot))
        {
            return [];
        }

        var documents = dbContext.LibraryDocuments.ToDictionary(item => item.FileName);
        return Directory
            .EnumerateFiles(uploadsRoot, "*", SearchOption.AllDirectories)
            .Select(path =>
            {
                var info = new FileInfo(path);
                var relativePath = Path.GetRelativePath(uploadsRoot, path).Replace('\\', '/');
                var folder = relativePath.Split('/')[0];
                documents.TryGetValue(info.Name, out var document);
                return new MediaLibraryItemResponse
                {
                    Id = document?.Id,
                    FileName = info.Name,
                    OriginalFileName = document?.OriginalFileName ?? info.Name,
                    Url = $"/uploads/{relativePath}",
                    ContentType = GetContentType(info.Extension),
                    SizeBytes = info.Length,
                    MediaType = folder switch
                    {
                        "videos" => "video",
                        "posters" => "image",
                        "captions" => "caption",
                        _ => "document"
                    },
                    UploadedAt = document?.CreatedAt ?? info.CreationTimeUtc,
                    IsPublic = document is not null,
                    Title = document?.Title ?? info.Name,
                    Description = document?.Description ?? string.Empty,
                    ThumbnailUrl = document?.ThumbnailUrl ?? string.Empty,
                    Category = document?.Category ?? string.Empty,
                    Tags = SplitTags(document?.Tags),
                    IsPublished = document?.IsPublished ?? false,
                    SortOrder = document?.SortOrder ?? 0,
                    Usages = GetUsages(info.Name)
                };
            })
            .OrderByDescending(item => item.UploadedAt)
            .ToArray();
    }

    public bool Delete(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName))
        {
            return false;
        }

        var uploadsRoot = Path.Combine(GetWebRoot(), "uploads");
        var path = Directory.Exists(uploadsRoot)
            ? Directory.EnumerateFiles(uploadsRoot, safeName, SearchOption.AllDirectories).FirstOrDefault()
            : null;
        if (path is null)
        {
            return false;
        }

        if (GetUsages(safeName).Count > 0)
        {
            throw new InvalidOperationException("Tài liệu đang được sử dụng trong nội dung và không thể xóa tại thư viện.");
        }

        File.Delete(path);
        var document = dbContext.LibraryDocuments.FirstOrDefault(item => item.FileName == safeName);
        if (document is not null)
        {
            dbContext.LibraryDocuments.Remove(document);
            dbContext.SaveChanges();
        }
        return true;
    }

    public MediaLibraryItemResponse CreateLibraryDocument(UpsertLibraryDocumentRequest request)
    {
        if (dbContext.LibraryDocuments.Any(item => item.FileName == request.FileName))
        {
            throw new InvalidOperationException("File đã có trong thư viện học viên.");
        }

        var now = DateTimeOffset.UtcNow;
        var document = new LibraryDocument
        {
            Id = Guid.NewGuid().ToString("N"),
            FileName = Path.GetFileName(request.FileName),
            OriginalFileName = request.OriginalFileName.Trim(),
            FileUrl = request.FileUrl.Trim(),
            ContentType = request.ContentType.Trim(),
            SizeBytes = request.SizeBytes,
            Title = RequireTitle(request.Title),
            Description = request.Description.Trim(),
            ThumbnailUrl = request.ThumbnailUrl.Trim(),
            Category = request.Category.Trim(),
            Tags = JoinTags(request.Tags),
            IsPublished = request.IsPublished,
            SortOrder = request.SortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };
        dbContext.LibraryDocuments.Add(document);
        dbContext.SaveChanges();
        return MapDocument(document);
    }

    public MediaLibraryItemResponse UpdateLibraryDocument(string id, UpdateLibraryDocumentRequest request)
    {
        var document = dbContext.LibraryDocuments.FirstOrDefault(item => item.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy tài liệu thư viện.");
        document.Title = RequireTitle(request.Title);
        document.Description = request.Description.Trim();
        document.ThumbnailUrl = request.ThumbnailUrl.Trim();
        document.Category = request.Category.Trim();
        document.Tags = JoinTags(request.Tags);
        document.IsPublished = request.IsPublished;
        document.SortOrder = request.SortOrder;
        document.UpdatedAt = DateTimeOffset.UtcNow;
        dbContext.SaveChanges();
        return MapDocument(document);
    }

    public IReadOnlyCollection<MediaLibraryItemResponse> GetPublicLibrary()
    {
        return dbContext.LibraryDocuments
            .AsNoTracking()
            .Where(item => item.IsPublished)
            .OrderBy(item => item.SortOrder)
            .ThenByDescending(item => item.UpdatedAt)
            .AsEnumerable()
            .Select(item => MapDocument(item, false))
            .ToArray();
    }

    private MediaLibraryItemResponse MapDocument(LibraryDocument document, bool includeUsages = true)
    {
        return new MediaLibraryItemResponse
        {
            Id = document.Id,
            FileName = document.FileName,
            OriginalFileName = document.OriginalFileName,
            Url = document.FileUrl,
            ContentType = document.ContentType,
            SizeBytes = document.SizeBytes,
            MediaType = document.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
                ? "image"
                : document.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? "video" : "document",
            UploadedAt = document.CreatedAt,
            IsPublic = true,
            Title = document.Title,
            Description = document.Description,
            ThumbnailUrl = document.ThumbnailUrl,
            Category = document.Category,
            Tags = SplitTags(document.Tags),
            IsPublished = document.IsPublished,
            SortOrder = document.SortOrder,
            Usages = includeUsages ? GetUsages(document.FileName) : []
        };
    }

    private static string RequireTitle(string value)
    {
        var title = value.Trim();
        return string.IsNullOrWhiteSpace(title)
            ? throw new InvalidOperationException("Tên tài liệu là bắt buộc.")
            : title;
    }

    private static string JoinTags(IEnumerable<string> tags) =>
        string.Join(',', tags.Select(item => item.Trim()).Where(item => item.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase));

    private static List<string> SplitTags(string? tags) =>
        string.IsNullOrWhiteSpace(tags)
            ? []
            : tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private List<MediaUsageResponse> GetUsages(string fileName)
    {
        var usages = new List<MediaUsageResponse>();
        var lessons = dbContext.Lessons.ToArray();
        var lessonTitles = lessons.ToDictionary(item => item.Id, item => item.Title);

        foreach (var lesson in lessons)
        {
            void AddLessonUsage(string? url, string field)
            {
                if (!ReferencesFile(url, fileName)) return;
                usages.Add(new MediaUsageResponse
                {
                    SourceType = "Lesson",
                    SourceId = lesson.Id,
                    SourceTitle = lesson.Title,
                    Field = field,
                    AdminUrl = $"/admin/lessons/{lesson.Id}/content"
                });
            }

            AddLessonUsage(lesson.ThumbnailUrl, "Ảnh đại diện bài học");
            AddLessonUsage(lesson.VideoContent?.VideoUrl, "Video bài học");
            AddLessonUsage(lesson.VideoContent?.PosterUrl, "Ảnh bìa video");
            AddLessonUsage(lesson.VideoContent?.CaptionsUrl, "Phụ đề video");

            foreach (var step in lesson.Content?.Steps ?? [])
            {
                AddLessonUsage(step.MediaUrl, $"Bước {step.Order}: nội dung media");
                AddLessonUsage(step.PosterUrl, $"Bước {step.Order}: ảnh bìa");
                AddLessonUsage(step.CaptionUrl, $"Bước {step.Order}: phụ đề");
                AddLessonUsage(step.ObjectiveImageUrl, $"Bước {step.Order}: ảnh minh họa");
                foreach (var question in step.Questions)
                {
                    AddLessonUsage(question.ImageUrl, $"Bước {step.Order}: câu hỏi {question.Order}");
                }
                foreach (var question in step.DragQuestions)
                {
                    AddLessonUsage(question.ImageUrl, $"Bước {step.Order}: câu kéo thả {question.Order}");
                    foreach (var answer in question.Answers)
                    {
                        AddLessonUsage(answer.ImageUrl, $"Bước {step.Order}: đáp án kéo thả {answer.Order}");
                    }
                }
            }
        }

        foreach (var question in dbContext.LessonQuestions)
        {
            if (!ReferencesFile(question.MediaUrl, fileName)) continue;
            var lessonTitle = lessonTitles.GetValueOrDefault(question.LessonId, question.LessonId);
            usages.Add(new MediaUsageResponse
            {
                SourceType = "Question",
                SourceId = question.Id,
                SourceTitle = $"{lessonTitle} — {question.Prompt}",
                Field = "Ảnh/media câu hỏi",
                AdminUrl = $"/admin/questions?lessonId={Uri.EscapeDataString(question.LessonId)}"
            });
        }

        return usages
            .GroupBy(item => $"{item.SourceType}|{item.SourceId}|{item.Field}")
            .Select(group => group.First())
            .ToList();
    }

    private static bool ReferencesFile(string? url, string fileName)
    {
        return !string.IsNullOrWhiteSpace(url) &&
               Uri.UnescapeDataString(url).Contains(fileName, StringComparison.OrdinalIgnoreCase);
    }

    private string GetWebRoot()
    {
        return string.IsNullOrWhiteSpace(environment.WebRootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot")
            : environment.WebRootPath;
    }

    private static string NormalizeMediaType(string mediaType)
    {
        return mediaType.Trim().ToLowerInvariant() switch
        {
            "video" => "video",
            "poster" or "image" => "poster",
            "caption" or "captions" or "subtitle" => "caption",
            "document" or "file" or "library" => "document",
            _ => throw new InvalidOperationException("Loại tài nguyên không được hỗ trợ.")
        };
    }

    private static void ValidateFile(string mediaType, string extension, long sizeBytes)
    {
        var (allowedExtensions, maxBytes) = mediaType switch
        {
            "video" => (VideoExtensions, MaxVideoBytes),
            "poster" => (ImageExtensions, MaxImageBytes),
            "caption" => (CaptionExtensions, MaxCaptionBytes),
            "document" => (DocumentExtensions, MaxDocumentBytes),
            _ => throw new InvalidOperationException("Loại tài nguyên không được hỗ trợ.")
        };

        if (!allowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Định dạng file không được hỗ trợ.");
        }

        if (sizeBytes > maxBytes)
        {
            throw new InvalidOperationException("File vượt quá dung lượng cho phép.");
        }
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            _ => "application/octet-stream"
        };
    }
}
