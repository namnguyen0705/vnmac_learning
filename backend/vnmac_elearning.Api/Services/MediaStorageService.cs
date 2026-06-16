using vnmac_elearning.Api.Contracts;

namespace vnmac_elearning.Api.Services;

public sealed class MediaStorageService(IWebHostEnvironment environment)
{
    private const long MaxVideoBytes = 2L * 1024 * 1024 * 1024;
    private const long MaxImageBytes = 20L * 1024 * 1024;
    private const long MaxCaptionBytes = 5L * 1024 * 1024;

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".webm", ".mov", ".m4v"
    };

    private static readonly HashSet<string> PosterExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> CaptionExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".vtt", ".srt"
    };

    public async Task<MediaUploadResponse> SaveAsync(IFormFile file, string mediaType, CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("File upload không hợp lệ.");
        }

        var normalizedType = NormalizeMediaType(mediaType);
        var extension = Path.GetExtension(file.FileName);
        ValidateFile(normalizedType, extension, file.Length);

        var root = environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(environment.ContentRootPath, "wwwroot");
        }

        var folder = normalizedType switch
        {
            "video" => "videos",
            "poster" => "posters",
            "caption" => "captions",
            _ => "files"
        };

        var targetDirectory = Path.Combine(root, "uploads", folder);
        Directory.CreateDirectory(targetDirectory);

        var safeBaseName = Path.GetFileNameWithoutExtension(file.FileName)
            .Trim()
            .ToLowerInvariant();
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
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            MediaType = normalizedType
        };
    }

    private static string NormalizeMediaType(string mediaType)
    {
        return mediaType.Trim().ToLowerInvariant() switch
        {
            "video" => "video",
            "poster" or "image" => "poster",
            "caption" or "captions" or "subtitle" => "caption",
            _ => throw new InvalidOperationException("Loại tài nguyên không được hỗ trợ.")
        };
    }

    private static void ValidateFile(string mediaType, string extension, long sizeBytes)
    {
        var (allowedExtensions, maxBytes) = mediaType switch
        {
            "video" => (VideoExtensions, MaxVideoBytes),
            "poster" => (PosterExtensions, MaxImageBytes),
            "caption" => (CaptionExtensions, MaxCaptionBytes),
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
}
