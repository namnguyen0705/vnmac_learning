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
        if (!string.IsNullOrWhiteSpace(lesson.Content?.Summary)) return lesson.Content.Summary.Trim();
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

        return string.Empty;
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
            Flow = LearningFlowValidation.Validate(request.Flow),
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
            Steps = [],
            Objectives = videoContent?.Objectives is null ? [] : [.. videoContent.Objectives],
            MainPoints = videoContent?.Checkpoints is null ? [] : [.. videoContent.Checkpoints],
            InteractionTypes = [],
            Activities = [],
            ReinforcementPoints = videoContent?.Checkpoints is null ? [] : [.. videoContent.Checkpoints],
            Quiz = new LessonContentQuiz
            {
                QuestionCount = assessment?.Questions.Count ?? 0,
                PassScore = assessment?.PassScore ?? 0,
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
        var normalized = steps?
            .Select((step, index) =>
            {
                var key = string.IsNullOrWhiteSpace(step.Key) ? $"step-{index + 1}" : step.Key.Trim();
                return new LessonContentStep
                {
                    Key = key,
                    Order = step.Order <= 0 ? index + 1 : step.Order,
                    Label = NormalizeText(step.Label),
                    ScreenType = NormalizeText(step.ScreenType),
                    Description = NormalizeText(step.Description),
                    ProgressPercent = Math.Clamp(step.ProgressPercent, 0, 100),
                    IsRequired = step.IsRequired,
                    Title = NormalizeText(step.Title),
                    Subtitle = NormalizeText(step.Subtitle),
                    Body = NormalizeText(step.Body),
                    Instruction = NormalizeText(step.Instruction),
                    AlertText = NormalizeText(step.AlertText),
                    PrimaryActionLabel = NormalizeText(step.PrimaryActionLabel),
                    SecondaryActionLabel = NormalizeText(step.SecondaryActionLabel),
                    MediaUrl = NormalizeText(step.MediaUrl),
                    MediaType = NormalizeText(step.MediaType),
                    PosterUrl = NormalizeText(step.PosterUrl),
                    CaptionUrl = NormalizeText(step.CaptionUrl),
                    MediaAlt = NormalizeText(step.MediaAlt),
                    ObjectiveImageUrl = NormalizeText(step.ObjectiveImageUrl),
                    ObjectiveImageAlt = NormalizeText(step.ObjectiveImageAlt),
                    ExplanationTitle = NormalizeText(step.ExplanationTitle),
                    Explanation = NormalizeText(step.Explanation),
                    Points = NormalizeTextList(step.Points),
                    Tips = NormalizeTextList(step.Tips),
                    Items = NormalizeTextList(step.Items),
                    Targets = NormalizeTextList(step.Targets),
                    Options = NormalizeTextList(step.Options),
                    DragQuestions = NormalizeDragQuestions(step.DragQuestions),
                    Questions = NormalizeCheckQuestions(step.Questions),
                    Feedback = NormalizeText(step.Feedback)
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

        return normalized;
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
