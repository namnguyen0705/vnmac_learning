using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    private static AdminLessonCatalogRow MapAdminLessonCatalogRow(
        Course course,
        CourseSection section,
        Lesson lesson,
        IReadOnlyDictionary<string, int> learnerCounts)
    {
        var updatedAt = lesson.UpdatedAt == default ? lesson.CreatedAt : lesson.UpdatedAt;
        if (updatedAt == default)
        {
            updatedAt = DateTimeOffset.UtcNow;
        }

        var createdAt = lesson.CreatedAt == default ? updatedAt : lesson.CreatedAt;

        return new AdminLessonCatalogRow
        {
            LessonId = lesson.Id,
            CourseId = course.Id,
            SectionId = section.Id,
            CourseTitle = course.Title,
            SectionTitle = section.Title,
            Title = lesson.Title,
            Description = GetLessonDescription(course, section, lesson),
            Type = lesson.Type,
            Order = lesson.Order,
            StatusLabel = lesson.StatusLabel,
            Topic = GetSectionTopic(section),
            Difficulty = lesson.Difficulty,
            PublicationStatus = lesson.PublicationStatus,
            LearnerCount = learnerCounts.GetValueOrDefault(lesson.Id),
            QuestionCount = lesson.Assessment?.Questions.Count ?? 0,
            DurationMinutes = lesson.DurationMinutes,
            ThumbnailUrl = ResolveLessonThumbnail(lesson),
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }

    private static string GetLessonDescription(Course course, CourseSection section, Lesson lesson)
    {
        if (!string.IsNullOrWhiteSpace(lesson.VideoContent?.Intro))
        {
            return lesson.VideoContent.Intro.Trim();
        }

        if (!string.IsNullOrWhiteSpace(lesson.Assessment?.Intro))
        {
            return lesson.Assessment.Intro.Trim();
        }

        if (!string.IsNullOrWhiteSpace(lesson.StatusLabel))
        {
            return lesson.StatusLabel.Trim();
        }

        return string.IsNullOrWhiteSpace(section.Description)
            ? course.Description
            : section.Description;
    }

    private static string ResolveLessonThumbnail(Lesson lesson)
    {
        if (!string.IsNullOrWhiteSpace(lesson.ThumbnailUrl))
        {
            return lesson.ThumbnailUrl.Trim();
        }

        if (!string.IsNullOrWhiteSpace(lesson.VideoContent?.PosterUrl))
        {
            return lesson.VideoContent.PosterUrl.Trim();
        }

        return $"https://picsum.photos/seed/{Uri.EscapeDataString(lesson.Id)}/240/160";
    }

    private static string NormalizeAdminTopic(string topic, CourseSection section)
    {
        return GetSectionTopic(section);
    }

    private static string NormalizeThumbnailUrl(string thumbnailUrl, VideoContent? videoContent)
    {
        if (!string.IsNullOrWhiteSpace(thumbnailUrl))
        {
            return thumbnailUrl.Trim();
        }

        return videoContent?.PosterUrl?.Trim() ?? string.Empty;
    }

    private static LessonContent NormalizeLessonContent(LessonContent request)
    {
        var quiz = request.Quiz ?? new LessonContentQuiz();
        var completion = request.Completion ?? new LessonCompletionContent();

        return new LessonContent
        {
            Summary = NormalizeText(request.Summary),
            CoreMessage = NormalizeText(request.CoreMessage),
            MainContentType = string.IsNullOrWhiteSpace(request.MainContentType)
                ? "Video hoặc slide"
                : request.MainContentType.Trim(),
            Steps = NormalizeLessonSteps(request.Steps),
            Objectives = NormalizeTextList(request.Objectives),
            MainPoints = NormalizeTextList(request.MainPoints),
            InteractionTypes = NormalizeTextList(request.InteractionTypes),
            Activities = (request.Activities ?? [])
                .Select(activity => new LessonContentActivity
                {
                    Type = NormalizeText(activity.Type),
                    Title = NormalizeText(activity.Title),
                    Instruction = NormalizeText(activity.Instruction),
                    Items = NormalizeTextList(activity.Items),
                    Targets = NormalizeTextList(activity.Targets),
                    Feedback = NormalizeText(activity.Feedback)
                })
                .Where(activity =>
                    !string.IsNullOrWhiteSpace(activity.Type) ||
                    !string.IsNullOrWhiteSpace(activity.Title) ||
                    !string.IsNullOrWhiteSpace(activity.Instruction) ||
                    activity.Items.Count > 0 ||
                    activity.Targets.Count > 0 ||
                    !string.IsNullOrWhiteSpace(activity.Feedback))
                .ToList(),
            ReinforcementPoints = NormalizeTextList(request.ReinforcementPoints),
            Quiz = new LessonContentQuiz
            {
                QuestionCount = Math.Clamp(quiz.QuestionCount, 0, 100),
                PassScore = Math.Clamp(quiz.PassScore, 0, 100),
                Description = NormalizeText(quiz.Description)
            },
            Completion = new LessonCompletionContent
            {
                Title = string.IsNullOrWhiteSpace(completion.Title) ? "Hoàn thành" : completion.Title.Trim(),
                Message = NormalizeText(completion.Message),
                NextActionLabel = string.IsNullOrWhiteSpace(completion.NextActionLabel)
                    ? "Tiếp tục"
                    : completion.NextActionLabel.Trim()
            }
        };
    }

    private static LessonContent CreateEmptyLessonContent(Lesson lesson)
    {
        var assessment = lesson.Assessment;
        var videoContent = lesson.VideoContent;

        return new LessonContent
        {
            Summary = FirstNonEmpty(videoContent?.Intro, assessment?.Intro, lesson.StatusLabel),
            CoreMessage = videoContent?.TranscriptHighlight ?? string.Empty,
            MainContentType = lesson.Type == LessonType.Video ? "Video" : "Video hoặc slide",
            Steps = CreateDefaultLessonSteps(),
            Objectives = videoContent?.Objectives is null ? [] : [.. videoContent.Objectives],
            MainPoints = videoContent?.Checkpoints is null ? [] : [.. videoContent.Checkpoints],
            InteractionTypes = [],
            Activities = [],
            ReinforcementPoints = videoContent?.Checkpoints is null ? [] : [.. videoContent.Checkpoints],
            Quiz = new LessonContentQuiz
            {
                QuestionCount = assessment?.Questions.Count ?? 5,
                PassScore = assessment?.PassScore ?? 100,
                Description = assessment?.Intro ?? string.Empty
            },
            Completion = new LessonCompletionContent
            {
                Title = $"Hoàn thành {lesson.Title}",
                Message = lesson.StatusLabel,
                NextActionLabel = "Tiếp tục"
            }
        };
    }

    private static string FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? string.Empty;
    }

    private static List<LessonContentStep> NormalizeLessonSteps(IEnumerable<LessonContentStep>? steps)
    {
        var defaultSteps = CreateDefaultLessonSteps();
        ApplyDefaultStepContent(defaultSteps);
        var defaultByKey = defaultSteps.ToDictionary(step => step.Key, StringComparer.OrdinalIgnoreCase);

        var normalized = steps?
            .Select((step, index) =>
            {
                var key = string.IsNullOrWhiteSpace(step.Key) ? $"step-{index + 1}" : step.Key.Trim();
                defaultByKey.TryGetValue(key, out var fallback);

                return new LessonContentStep
                {
                    Key = key,
                    Order = step.Order <= 0 ? fallback?.Order ?? index + 1 : step.Order,
                    Label = FirstNonEmpty(step.Label, fallback?.Label),
                    ScreenType = FirstNonEmpty(step.ScreenType, fallback?.ScreenType),
                    Description = FirstNonEmpty(step.Description, fallback?.Description),
                    ProgressPercent = Math.Clamp(step.ProgressPercent == 0 ? fallback?.ProgressPercent ?? 0 : step.ProgressPercent, 0, 100),
                    IsRequired = step.IsRequired,
                    Title = FirstNonEmpty(step.Title, fallback?.Title),
                    Subtitle = FirstNonEmpty(step.Subtitle, fallback?.Subtitle),
                    Body = FirstNonEmpty(step.Body, fallback?.Body),
                    Instruction = FirstNonEmpty(step.Instruction, fallback?.Instruction),
                    AlertText = FirstNonEmpty(step.AlertText, fallback?.AlertText),
                    PrimaryActionLabel = FirstNonEmpty(step.PrimaryActionLabel, fallback?.PrimaryActionLabel),
                    SecondaryActionLabel = FirstNonEmpty(step.SecondaryActionLabel, fallback?.SecondaryActionLabel),
                    MediaUrl = NormalizeText(step.MediaUrl),
                    MediaType = FirstNonEmpty(step.MediaType, fallback?.MediaType),
                    PosterUrl = NormalizeText(step.PosterUrl),
                    CaptionUrl = NormalizeText(step.CaptionUrl),
                    MediaAlt = FirstNonEmpty(step.MediaAlt, fallback?.MediaAlt),
                    ObjectiveImageUrl = NormalizeText(step.ObjectiveImageUrl),
                    ObjectiveImageAlt = FirstNonEmpty(step.ObjectiveImageAlt, fallback?.ObjectiveImageAlt),
                    ExplanationTitle = FirstNonEmpty(step.ExplanationTitle, fallback?.ExplanationTitle),
                    Explanation = FirstNonEmpty(step.Explanation, fallback?.Explanation),
                    Points = NormalizeTextListWithFallback(step.Points, fallback?.Points),
                    Tips = NormalizeTextListWithFallback(step.Tips, fallback?.Tips),
                    Items = NormalizeTextListWithFallback(step.Items, fallback?.Items),
                    Targets = NormalizeTextListWithFallback(step.Targets, fallback?.Targets),
                    Options = NormalizeTextListWithFallback(step.Options, fallback?.Options),
                    DragQuestions = NormalizeDragQuestionsWithFallback(step.DragQuestions, fallback?.DragQuestions),
                    Questions = NormalizeCheckQuestionsWithFallback(step.Questions, fallback?.Questions),
                    Feedback = FirstNonEmpty(step.Feedback, fallback?.Feedback)
                };
            })
            .Where(step =>
                !string.IsNullOrWhiteSpace(step.Label) ||
                !string.IsNullOrWhiteSpace(step.ScreenType) ||
                !string.IsNullOrWhiteSpace(step.Description) ||
                !string.IsNullOrWhiteSpace(step.Title) ||
                !string.IsNullOrWhiteSpace(step.MediaUrl) ||
                !string.IsNullOrWhiteSpace(step.ObjectiveImageUrl) ||
                !string.IsNullOrWhiteSpace(step.PosterUrl) ||
                !string.IsNullOrWhiteSpace(step.CaptionUrl))
            .OrderBy(step => step.Order)
            .ToList() ?? [];

        return normalized.Count == 0 ? defaultSteps : normalized;
    }

    private static void ApplyDefaultStepContent(List<LessonContentStep> steps)
    {
        foreach (var step in steps)
        {
            switch (step.Key.Trim().ToLowerInvariant())
            {
                case "intro":
                    step.Title = "Nhận diện vật nổ";
                    step.Subtitle = "GIỚI THIỆU BÀI HỌC";
                    step.Body = "Trong cuộc sống hằng ngày, chúng ta có thể gặp những vật lạ nguy hiểm. Bài học này giúp bạn nhận biết và xử lý an toàn.";
                    step.PrimaryActionLabel = "Bắt đầu học";
                    step.MediaType = "image";
                    step.MediaAlt = "Minh họa khu vực nguy hiểm có bom mìn";
                    step.ObjectiveImageAlt = "Ảnh mục tiêu bài học";
                    step.ExplanationTitle = "Mục tiêu bài học";
                    step.Explanation = "Giới thiệu mục tiêu, bối cảnh và thông điệp an toàn chính của bài học.";
                    step.Points = ["Nhận biết một số loại vật nổ thường gặp", "Phân biệt vật nguy hiểm - không chắc - an toàn", "Biết cách xử lý đúng khi gặp vật lạ"];
                    step.Tips = ["Nhận biết - Tránh xa - Báo ngay"];
                    break;
                case "video":
                    step.Title = "Xem video";
                    step.Subtitle = "Nội dung chính";
                    step.Body = "Video hoặc slide trình bày nội dung chính bằng hình ảnh trực quan và ngôn ngữ đơn giản.";
                    step.AlertText = "Hãy luôn cảnh giác! Khi không chắc chắn, hãy coi là nguy hiểm.";
                    step.PrimaryActionLabel = "Tiếp tục";
                    step.MediaType = "video";
                    step.MediaAlt = "Video bài học";
                    step.ExplanationTitle = "Nội dung chính";
                    step.Explanation = "Tóm tắt các ý chính xuất hiện bên phải video để người học dễ theo dõi.";
                    step.Points = ["Vật nổ còn sót lại từ chiến tranh", "Có thể xuất hiện ở nhiều địa điểm khác nhau", "Nhiều vật bị gỉ sét, vỡ nát, khó nhận biết", "Nhận diện đúng và xử lý an toàn", "Bảo vệ bản thân và cộng đồng"];
                    step.Tips = ["Nhận biết - Tránh xa - Báo ngay"];
                    break;
                case "activity":
                    step.Title = "Phân loại";
                    step.Subtitle = "Hãy kéo từng vật vào nhóm phù hợp.";
                    step.Instruction = "Nhấn giữ chuột vào vật, kéo và thả vào nhóm phù hợp. Phân loại đúng tất cả để tiếp tục.";
                    step.AlertText = "Khi không chắc chắn -> coi là nguy hiểm.";
                    step.PrimaryActionLabel = "Kiểm tra";
                    step.SecondaryActionLabel = "Tiếp tục";
                    step.MediaType = "image";
                    step.ExplanationTitle = "Mẹo nhớ";
                    step.Explanation = "Không chạm vào vật lạ, tránh xa khi phát hiện và báo ngay cho người có trách nhiệm.";
                    step.Targets = ["Nguy hiểm", "Không chắc", "An toàn"];
                    step.Items = ["Bom phá", "Mìn chống tăng", "Lựu đạn", "Đá", "Lon nước", "Đạn cối", "Chai nhựa", "Vật lạ gỉ sét"];
                    step.DragQuestions =
                    [
                        new LessonContentDragQuestion
                        {
                            Id = "danger",
                            Order = 1,
                            Prompt = "Nguy hiểm",
                            Description = "Vật nổ chắc chắn, rất nguy hiểm",
                            Tone = "red",
                            Answers =
                            [
                                new LessonContentDragAnswer { Id = "bom-pha", Order = 1, Label = "Bom phá" },
                                new LessonContentDragAnswer { Id = "min-chong-tang", Order = 2, Label = "Mìn chống tăng" },
                                new LessonContentDragAnswer { Id = "luu-dan", Order = 3, Label = "Lựu đạn" },
                                new LessonContentDragAnswer { Id = "dan-coi", Order = 4, Label = "Đạn cối" }
                            ]
                        },
                        new LessonContentDragQuestion
                        {
                            Id = "uncertain",
                            Order = 2,
                            Prompt = "Không chắc",
                            Description = "Không chắc là vật nổ, cần thận trọng",
                            Tone = "amber",
                            Answers =
                            [
                                new LessonContentDragAnswer { Id = "vat-la-gi-set", Order = 1, Label = "Vật lạ gỉ sét" }
                            ]
                        },
                        new LessonContentDragQuestion
                        {
                            Id = "safe",
                            Order = 3,
                            Prompt = "An toàn",
                            Description = "Vật dụng thông thường, an toàn",
                            Tone = "green",
                            Answers =
                            [
                                new LessonContentDragAnswer { Id = "da", Order = 1, Label = "Đá" },
                                new LessonContentDragAnswer { Id = "lon-nuoc", Order = 2, Label = "Lon nước" },
                                new LessonContentDragAnswer { Id = "chai-nhua", Order = 3, Label = "Chai nhựa" }
                            ]
                        }
                    ];
                    step.Tips = ["Không chạm vào vật lạ", "Tránh xa khi phát hiện", "Báo ngay cho người có trách nhiệm", "Bảo vệ bản thân và cộng đồng"];
                    break;
                case "reinforce":
                    step.Title = "Củng cố kiến thức";
                    step.Subtitle = "Hãy ghi nhớ những nguyên tắc an toàn quan trọng";
                    step.Body = "Ghi nhớ quan trọng";
                    step.AlertText = "Khi không chắc chắn -> LUÔN coi là nguy hiểm";
                    step.MediaType = "image";
                    step.MediaAlt = "Minh họa cán bộ cảnh báo khu vực nguy hiểm";
                    step.ExplanationTitle = "Mẹo nhớ";
                    step.Explanation = "Tổng hợp các nguyên tắc người học cần ghi nhớ trước khi làm kiểm tra.";
                    step.Points = ["Không chạm vào vật lạ", "Tránh xa ngay lập tức", "Báo cho người có trách nhiệm"];
                    step.Tips = ["Không chạm vào vật lạ", "Tránh xa ngay lập tức", "Báo ngay cho người có trách nhiệm", "Bảo vệ bản thân và cộng đồng"];
                    step.Feedback = "Bạn đã hiểu cách nhận diện vật nguy hiểm. Hãy tiếp tục để kiểm tra lại kiến thức.";
                    break;
                case "check":
                    step.Title = "Kiểm tra cuối bài";
                    step.Subtitle = "Chọn câu trả lời đúng nhất.";
                    step.Body = "Bạn thấy một vật kim loại lạ trong ruộng, bạn nên làm gì?";
                    step.AlertText = "Đạt 100% để hoàn thành bài học";
                    step.MediaType = "image";
                    step.MediaAlt = "Minh họa câu hỏi kiểm tra cuối bài";
                    step.ExplanationTitle = "Thông tin bài kiểm tra";
                    step.Explanation = "Phần này chỉ là cấu trúc hiển thị cho kiểm tra cuối bài. Bộ câu hỏi chính thức từng bài sẽ bổ sung sau.";
                    step.Options = ["Nhặt lên xem", "Mang về nhà", "Tránh xa và báo cho người lớn / người có trách nhiệm"];
                    step.Feedback = "Chính xác! Đây là hành vi an toàn.";
                    break;
                case "complete":
                    step.Title = "Hoàn thành";
                    step.Subtitle = "Chúc mừng!";
                    step.Body = "Bạn đã hoàn thành bài học.";
                    step.PrimaryActionLabel = "Sang bài tiếp theo";
                    step.SecondaryActionLabel = "Xem lại nội dung";
                    step.MediaType = "image";
                    step.MediaAlt = "Minh họa hoàn thành bài học";
                    step.ExplanationTitle = "Kết quả bài học";
                    step.Explanation = "Hiển thị điểm, trạng thái đạt yêu cầu và tiến độ khóa học.";
                    step.Points = ["Bạn đã đạt 100% điểm trong bài kiểm tra", "Bạn đã nắm vững kiến thức nhận diện vật nguy hiểm"];
                    step.Tips = ["Học lại bài học", "Xem lại nội dung", "Sang bài tiếp theo"];
                    break;
            }
        }
    }

    private static List<LessonContentStep> CreateDefaultLessonSteps()
    {
        return
        [
            new LessonContentStep
            {
                Key = "intro",
                Order = 1,
                Label = "Giới thiệu",
                ScreenType = "Giới thiệu bài học và mục tiêu",
                Description = "Mở đầu bài học, giới thiệu bối cảnh và mục tiêu cần đạt.",
                ProgressPercent = 0
            },
            new LessonContentStep
            {
                Key = "video",
                Order = 2,
                Label = "Video",
                ScreenType = "Nội dung chính bằng video hoặc slide",
                Description = "Trình bày nội dung chính bằng hình ảnh trực quan, ngôn ngữ đơn giản.",
                ProgressPercent = 25
            },
            new LessonContentStep
            {
                Key = "activity",
                Order = 3,
                Label = "Kéo thả",
                ScreenType = "Hoạt động nhận dạng hoặc thực hành tương tác",
                Description = "Người học thực hành phân biệt hành vi đúng - sai hoặc xử lý tình huống.",
                ProgressPercent = 70
            },
            new LessonContentStep
            {
                Key = "reinforce",
                Order = 4,
                Label = "Củng cố",
                ScreenType = "Phản hồi và củng cố nội dung",
                Description = "Tóm tắt thông điệp quan trọng, phản hồi ngay để người học ghi nhớ.",
                ProgressPercent = 70
            },
            new LessonContentStep
            {
                Key = "check",
                Order = 5,
                Label = "Kiểm tra",
                ScreenType = "Bài kiểm tra cuối bài",
                Description = "Mô tả phần kiểm tra cuối bài trong cấu trúc nội dung; câu hỏi thật chưa tạo trong DB.",
                ProgressPercent = 90,
                Questions =
                [
                    new LessonContentCheckQuestion
                    {
                        Id = "check-1",
                        Order = 1,
                        Prompt = "Ban thay mot vat kim loai la trong ruong, ban nen lam gi?",
                        Feedback = "Chinh xac! Day la hanh vi an toan. Ban can tranh xa va bao ngay cho nguoi co trach nhiem.",
                        Options =
                        [
                            new LessonContentCheckOption { Id = "option-a", Code = "A", Order = 1, Label = "Nhat len xem" },
                            new LessonContentCheckOption { Id = "option-b", Code = "B", Order = 2, Label = "Mang ve nha" },
                            new LessonContentCheckOption { Id = "option-c", Code = "C", Order = 3, Label = "Tranh xa va bao cho nguoi co trach nhiem", IsCorrect = true }
                        ]
                    }
                ]
            },
            new LessonContentStep
            {
                Key = "complete",
                Order = 6,
                Label = "Hoàn thành",
                ScreenType = "Màn hình hoàn thành",
                Description = "Xác nhận hoàn thành bài học và hướng người học sang bước tiếp theo.",
                ProgressPercent = 100
            }
        ];
    }

    private static string NormalizeText(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }

    private static List<string> NormalizeTextList(IEnumerable<string>? values)
    {
        return values?
            .Select(NormalizeText)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToList() ?? [];
    }

    private static List<string> NormalizeTextListWithFallback(IEnumerable<string>? values, IEnumerable<string>? fallback)
    {
        var normalized = NormalizeTextList(values);
        return normalized.Count == 0 ? NormalizeTextList(fallback) : normalized;
    }

    private static List<LessonContentDragQuestion> NormalizeDragQuestionsWithFallback(
        IEnumerable<LessonContentDragQuestion>? values,
        IEnumerable<LessonContentDragQuestion>? fallback)
    {
        var normalized = NormalizeDragQuestions(values);
        return normalized.Count == 0 ? NormalizeDragQuestions(fallback) : normalized;
    }

    private static List<LessonContentDragQuestion> NormalizeDragQuestions(IEnumerable<LessonContentDragQuestion>? values)
    {
        return values?
            .Select((question, index) =>
            {
                var id = NormalizeSlug(question.Id, $"question-{index + 1}");
                var answers = question.Answers?
                    .Select((answer, answerIndex) => new LessonContentDragAnswer
                    {
                        Id = NormalizeSlug(answer.Id, $"{id}-answer-{answerIndex + 1}"),
                        Order = answer.Order <= 0 ? answerIndex + 1 : answer.Order,
                        Label = NormalizeText(answer.Label),
                        Description = NormalizeText(answer.Description),
                        ImageUrl = NormalizeText(answer.ImageUrl),
                        ImageAlt = NormalizeText(answer.ImageAlt),
                        Feedback = NormalizeText(answer.Feedback)
                    })
                    .Where(answer =>
                        !string.IsNullOrWhiteSpace(answer.Label) ||
                        !string.IsNullOrWhiteSpace(answer.ImageUrl) ||
                        !string.IsNullOrWhiteSpace(answer.Description))
                    .OrderBy(answer => answer.Order)
                    .ToList() ?? [];

                return new LessonContentDragQuestion
                {
                    Id = id,
                    Order = question.Order <= 0 ? index + 1 : question.Order,
                    Prompt = NormalizeText(question.Prompt),
                    Description = NormalizeText(question.Description),
                    Tone = NormalizeTone(question.Tone),
                    ImageUrl = NormalizeText(question.ImageUrl),
                    ImageAlt = NormalizeText(question.ImageAlt),
                    Answers = answers
                };
            })
            .Where(question =>
                !string.IsNullOrWhiteSpace(question.Prompt) ||
                !string.IsNullOrWhiteSpace(question.ImageUrl) ||
                question.Answers.Count > 0)
            .OrderBy(question => question.Order)
            .ToList() ?? [];
    }

    private static List<LessonContentCheckQuestion> NormalizeCheckQuestionsWithFallback(
        IEnumerable<LessonContentCheckQuestion>? values,
        IEnumerable<LessonContentCheckQuestion>? fallback)
    {
        var normalized = NormalizeCheckQuestions(values);
        return normalized.Count == 0 ? NormalizeCheckQuestions(fallback) : normalized;
    }

    private static List<LessonContentCheckQuestion> NormalizeCheckQuestions(IEnumerable<LessonContentCheckQuestion>? values)
    {
        return values?
            .Select((question, index) =>
            {
                var id = NormalizeSlug(question.Id, $"check-{index + 1}");
                var options = question.Options?
                    .Select((option, optionIndex) => new LessonContentCheckOption
                    {
                        Id = NormalizeSlug(option.Id, $"{id}-option-{optionIndex + 1}"),
                        Code = string.IsNullOrWhiteSpace(option.Code) ? ((char)('A' + optionIndex)).ToString() : option.Code.Trim(),
                        Order = option.Order <= 0 ? optionIndex + 1 : option.Order,
                        Label = NormalizeText(option.Label),
                        IsCorrect = option.IsCorrect
                    })
                    .Where(option => !string.IsNullOrWhiteSpace(option.Label))
                    .OrderBy(option => option.Order)
                    .ToList() ?? [];

                if (options.Count > 0 && !options.Any(option => option.IsCorrect))
                {
                    options[0].IsCorrect = true;
                }

                return new LessonContentCheckQuestion
                {
                    Id = id,
                    Order = question.Order <= 0 ? index + 1 : question.Order,
                    Prompt = NormalizeText(question.Prompt),
                    ImageUrl = NormalizeText(question.ImageUrl),
                    ImageAlt = NormalizeText(question.ImageAlt),
                    Explanation = NormalizeText(question.Explanation),
                    Feedback = NormalizeText(question.Feedback),
                    Options = options
                };
            })
            .Where(question =>
                !string.IsNullOrWhiteSpace(question.Prompt) ||
                !string.IsNullOrWhiteSpace(question.ImageUrl) ||
                question.Options.Count > 0)
            .OrderBy(question => question.Order)
            .ToList() ?? [];
    }

    private static string NormalizeSlug(string? value, string fallback)
    {
        var normalized = NormalizeText(value);
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static string NormalizeTone(string? value)
    {
        var normalized = NormalizeText(value).ToLowerInvariant();
        return normalized is "red" or "amber" or "green" or "blue" ? normalized : "blue";
    }

    private static string GetSectionTopic(CourseSection section)
    {
        return string.IsNullOrWhiteSpace(section.Title) ? "Phần học" : section.Title.Trim();
    }

}
