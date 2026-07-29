using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    private static LessonAssessment CreateAssessment(string lessonId, LessonType type, LessonAssessmentRequest? request)
    {
        var assessment = new LessonAssessment { LessonId = lessonId };
        ApplyAssessment(assessment, type, request);
        return assessment;
    }

    private static void ApplyAssessment(LessonAssessment assessment, LessonType type, LessonAssessmentRequest? request)
    {
        var defaults = GetAssessmentDefaults(type, request);
        assessment.Intro = defaults.Intro.Trim();
        assessment.RetryHint = defaults.RetryHint.Trim();
        assessment.PassScore = Math.Clamp(defaults.PassScore, 1, 100);
        assessment.QuestionLimit = defaults.QuestionLimit is > 0 ? defaults.QuestionLimit : null;
        assessment.RandomizeQuestionOrder = defaults.RandomizeQuestionOrder;
        assessment.RandomizeOptionOrder = defaults.RandomizeOptionOrder;
    }

    private static LessonAssessmentRequest GetAssessmentDefaults(LessonType type, LessonAssessmentRequest? request)
    {
        if (request is not null)
        {
            return request;
        }

        return type == LessonType.Quiz
            ? new LessonAssessmentRequest
            {
                Intro = "Quiz lesson",
                RetryHint = "Retry until you reach the required score.",
                PassScore = 100,
                RandomizeQuestionOrder = true,
                RandomizeOptionOrder = true
            }
            : new LessonAssessmentRequest
            {
                Intro = "Interactive lesson",
                RetryHint = "Retry until every answer is correct.",
                PassScore = 100,
                RandomizeQuestionOrder = false,
                RandomizeOptionOrder = false
            };
    }

    private static ScormPackage CreateScormPackage(string lessonId, ScormPackageRequest? request)
    {
        ValidateScormPackageRequest(request);

        var package = new ScormPackage
        {
            Id = $"scorm-{Guid.NewGuid():N}"[..18],
            LessonId = lessonId
        };

        ApplyScormPackage(package, request);
        return package;
    }

    private static void ApplyScormPackage(ScormPackage package, ScormPackageRequest? request)
    {
        ValidateScormPackageRequest(request);
        var scormRequest = request!;

        package.Version = scormRequest.Version;
        package.Identifier = scormRequest.Identifier.Trim();
        package.Title = string.IsNullOrWhiteSpace(scormRequest.Title) ? scormRequest.Identifier.Trim() : scormRequest.Title.Trim();
        package.EntryPath = NormalizePath(scormRequest.EntryPath);
        package.ManifestVersion = string.IsNullOrWhiteSpace(scormRequest.ManifestVersion) ? null : scormRequest.ManifestVersion.Trim();
        package.Scos = scormRequest.Scos.Select(item => BuildScormSco(package.Id, item)).ToList();
        package.LaunchScoId = string.IsNullOrWhiteSpace(scormRequest.LaunchScoId)
            ? package.Scos.OrderBy(item => item.Order).First().Id
            : scormRequest.LaunchScoId.Trim();
    }

    private static LessonQuestion BuildQuestion(string questionId, string lessonId, UpsertLessonQuestionRequest request)
    {
        return new LessonQuestion
        {
            Id = questionId,
            LessonId = lessonId,
            Type = request.Type,
            Order = request.Order,
            Prompt = request.Prompt.Trim(),
            Explanation = request.Explanation.Trim(),
            Statement = string.IsNullOrWhiteSpace(request.Statement) ? null : request.Statement.Trim(),
            MediaTitle = string.IsNullOrWhiteSpace(request.MediaTitle) ? null : request.MediaTitle.Trim(),
            MediaUrl = string.IsNullOrWhiteSpace(request.MediaUrl) ? null : request.MediaUrl.Trim(),
            ScenarioTitle = string.IsNullOrWhiteSpace(request.ScenarioTitle) ? null : request.ScenarioTitle.Trim(),
            ScenarioContext = string.IsNullOrWhiteSpace(request.ScenarioContext) ? null : request.ScenarioContext.Trim(),
            Options = BuildOptions(questionId, request.Options),
            HotspotTargets = BuildHotspotTargets(questionId, request.HotspotTargets),
            DragItems = BuildDragItems(questionId, request.DragItems),
            DragTargets = BuildDragTargets(questionId, request.DragTargets),
            CorrectPairs = BuildDragPairs(questionId, request.CorrectPairs)
        };
    }

    private static ScormSco BuildScormSco(string packageId, ScormScoRequest request)
    {
        return new ScormSco
        {
            Id = request.Id.Trim(),
            PackageId = packageId,
            Identifier = request.Identifier.Trim(),
            Title = request.Title.Trim(),
            LaunchPath = NormalizePath(request.LaunchPath),
            ItemType = request.ItemType,
            Order = request.Order,
            MasteryScore = request.MasteryScore
        };
    }

    private static List<LessonQuestionOption> BuildOptions(string questionId, IReadOnlyCollection<QuestionOptionRequest> requests)
    {
        return requests
            .Select(item => new LessonQuestionOption
            {
                QuestionId = questionId,
                Code = NormalizeCode(item.Code),
                Label = item.Label.Trim(),
                Order = item.Order,
                IsCorrect = item.IsCorrect
            })
            .ToList();
    }

    private static List<LessonQuestionHotspotTarget> BuildHotspotTargets(string questionId, IReadOnlyCollection<QuestionHotspotTargetRequest> requests)
    {
        return requests
            .Select(item => new LessonQuestionHotspotTarget
            {
                QuestionId = questionId,
                Code = NormalizeCode(item.Code),
                Label = item.Label.Trim(),
                Order = item.Order,
                Shape = item.Shape,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                Radius = item.Radius,
                IsCorrect = item.IsCorrect
            })
            .ToList();
    }

    private static List<LessonQuestionDragItem> BuildDragItems(string questionId, IReadOnlyCollection<QuestionDragItemRequest> requests)
    {
        return requests
            .Select(item => new LessonQuestionDragItem
            {
                QuestionId = questionId,
                Code = NormalizeCode(item.Code),
                Label = item.Label.Trim(),
                Order = item.Order
            })
            .ToList();
    }

    private static List<LessonQuestionDragTarget> BuildDragTargets(string questionId, IReadOnlyCollection<QuestionDragTargetRequest> requests)
    {
        return requests
            .Select(item => new LessonQuestionDragTarget
            {
                QuestionId = questionId,
                Code = NormalizeCode(item.Code),
                Label = item.Label.Trim(),
                Order = item.Order
            })
            .ToList();
    }

    private static List<LessonQuestionDragPair> BuildDragPairs(string questionId, IReadOnlyCollection<QuestionDragPairRequest> requests)
    {
        return requests
            .Select(item => new LessonQuestionDragPair
            {
                QuestionId = questionId,
                DragItemCode = NormalizeCode(item.DragItemCode),
                DragTargetCode = NormalizeCode(item.DragTargetCode)
            })
            .ToList();
    }

    private static void ValidateQuestionRequest(UpsertLessonQuestionRequest request)
    {
        var hasLessonId = !string.IsNullOrWhiteSpace(request.LessonId);
        var hasQuizId = !string.IsNullOrWhiteSpace(request.QuizId);
        if (hasLessonId && hasQuizId)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionOwnerConflict);
        }

        if (!hasLessonId && !hasQuizId)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionOwnerRequired);
        }

        ValidateText(request.Prompt, ServiceErrors.AdminQuestionTextRequired);

        switch (request.Type)
        {
            case QuestionType.TrueFalse:
            case QuestionType.MultipleChoice:
            case QuestionType.Scenario:
                ValidateOptionQuestion(request.Options);
                break;
            case QuestionType.Hotspot:
                ValidateHotspotQuestion(request.HotspotTargets);
                break;
            case QuestionType.DragDrop:
                ValidateDragDropQuestion(request.DragItems, request.DragTargets, request.CorrectPairs);
                break;
        }
    }

    private static void ValidateScormPackageRequest(ScormPackageRequest? request)
    {
        if (request is null)
        {
            throw new ServiceException(ServiceErrors.AdminScormPackageRequired);
        }

        ValidateText(request.Identifier, ServiceErrors.AdminScormPackageIdentifierRequired);
        ValidateText(request.EntryPath, ServiceErrors.AdminScormPackageEntryPathRequired);

        if (request.Scos.Count == 0)
        {
            throw new ServiceException(ServiceErrors.AdminScormScoRequired);
        }

        var ids = request.Scos.Select(item => item.Id.Trim()).ToArray();
        var identifiers = request.Scos.Select(item => item.Identifier.Trim()).ToArray();
        if (ids.Any(string.IsNullOrWhiteSpace) ||
            ids.Distinct(StringComparer.OrdinalIgnoreCase).Count() != ids.Length ||
            identifiers.Any(string.IsNullOrWhiteSpace) ||
            identifiers.Distinct(StringComparer.OrdinalIgnoreCase).Count() != identifiers.Length)
        {
            throw new ServiceException(ServiceErrors.AdminScormScoInvalid);
        }

        foreach (var sco in request.Scos)
        {
            ValidateText(sco.Id, ServiceErrors.AdminScormScoInvalid);
            ValidateText(sco.Identifier, ServiceErrors.AdminScormScoInvalid);
            ValidateText(sco.Title, ServiceErrors.AdminScormScoInvalid);
            ValidateText(sco.LaunchPath, ServiceErrors.AdminScormScoInvalid);
        }

        if (!string.IsNullOrWhiteSpace(request.LaunchScoId) &&
            !ids.Contains(request.LaunchScoId.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            throw new ServiceException(ServiceErrors.AdminScormLaunchScoInvalid);
        }
    }

    private static void ValidateOptionQuestion(IReadOnlyCollection<QuestionOptionRequest> options)
    {
        if (options.Count < 2)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionOptionsMinimum);
        }

        ValidateDistinctCodes(options.Select(item => item.Code));

        if (!options.Any(item => item.IsCorrect))
        {
            throw new ServiceException(ServiceErrors.AdminQuestionCorrectOptionRequired);
        }

        foreach (var option in options)
        {
            ValidateText(option.Code, ServiceErrors.AdminQuestionTextRequired);
            ValidateText(option.Label, ServiceErrors.AdminQuestionTextRequired);
        }
    }

    private static void ValidateHotspotQuestion(IReadOnlyCollection<QuestionHotspotTargetRequest> targets)
    {
        if (targets.Count == 0)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionHotspotTargetRequired);
        }

        ValidateDistinctCodes(targets.Select(item => item.Code));

        if (!targets.Any(item => item.IsCorrect))
        {
            throw new ServiceException(ServiceErrors.AdminQuestionHotspotCorrectRequired);
        }

        foreach (var target in targets)
        {
            ValidateText(target.Code, ServiceErrors.AdminQuestionTextRequired);
            ValidateText(target.Label, ServiceErrors.AdminQuestionTextRequired);
        }
    }

    private static void ValidateDragDropQuestion(
        IReadOnlyCollection<QuestionDragItemRequest> dragItems,
        IReadOnlyCollection<QuestionDragTargetRequest> dragTargets,
        IReadOnlyCollection<QuestionDragPairRequest> correctPairs)
    {
        if (dragItems.Count == 0)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionDragItemRequired);
        }

        if (dragTargets.Count == 0)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionDragTargetRequired);
        }

        if (correctPairs.Count == 0)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionDragPairRequired);
        }

        ValidateDistinctCodes(dragItems.Select(item => item.Code));
        ValidateDistinctCodes(dragTargets.Select(item => item.Code));

        var itemCodes = dragItems.Select(item => NormalizeCode(item.Code)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var targetCodes = dragTargets.Select(item => NormalizeCode(item.Code)).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var item in dragItems)
        {
            ValidateText(item.Code, ServiceErrors.AdminQuestionTextRequired);
            ValidateText(item.Label, ServiceErrors.AdminQuestionTextRequired);
        }

        foreach (var target in dragTargets)
        {
            ValidateText(target.Code, ServiceErrors.AdminQuestionTextRequired);
            ValidateText(target.Label, ServiceErrors.AdminQuestionTextRequired);
        }

        var pairKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var pair in correctPairs)
        {
            var dragItemCode = NormalizeCode(pair.DragItemCode);
            var dragTargetCode = NormalizeCode(pair.DragTargetCode);
            if (!itemCodes.Contains(dragItemCode) || !targetCodes.Contains(dragTargetCode))
            {
                throw new ServiceException(ServiceErrors.AdminQuestionDragPairInvalid);
            }

            pairKeys.Add($"{dragItemCode}|{dragTargetCode}");
        }

        if (pairKeys.Count != correctPairs.Count)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionDragPairInvalid);
        }
    }

    private static void ValidateDistinctCodes(IEnumerable<string> codes)
    {
        var normalized = codes.Select(NormalizeCode).ToArray();
        if (normalized.Any(string.IsNullOrWhiteSpace) || normalized.Distinct(StringComparer.OrdinalIgnoreCase).Count() != normalized.Length)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionDragPairInvalid);
        }
    }

    private static void ValidateText(string value, ServiceError error)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ServiceException(error);
        }
    }

    private static string? NormalizeSectionId(string? sectionId)
    {
        return string.IsNullOrWhiteSpace(sectionId) ? null : sectionId.Trim();
    }

    private static string BuildQuizHostTitle(string title)
    {
        return $"[QUIZ HOST] {title.Trim()}";
    }

    private static int GetNextHiddenQuizOrder(CourseSection section)
    {
        return section.Lessons.Select(item => item.Order).DefaultIfEmpty(0).Max() + 1;
    }

    private static int ResolveAvailableLessonOrder(CourseSection section, int requestedOrder, string? excludedLessonId = null)
    {
        var occupiedOrders = section.Lessons
            .Where(item => item.Id != excludedLessonId)
            .Select(item => item.Order)
            .ToHashSet();

        if (requestedOrder > 0 && !occupiedOrders.Contains(requestedOrder))
        {
            return requestedOrder;
        }

        return occupiedOrders.DefaultIfEmpty(0).Max() + 1;
    }

    private CourseSection ResolveQuizHostSection(Course course, string? sectionId)
    {
        if (!string.IsNullOrWhiteSpace(sectionId))
        {
            return GetSectionInternal(course.Id, sectionId.Trim());
        }

        return course.Sections
            .OrderBy(item => item.Order)
            .FirstOrDefault()
            ?? throw new ServiceException(ServiceErrors.AdminSectionNotFound);
    }

    private static string NormalizeCode(string code)
    {
        return code.Trim().ToLowerInvariant();
    }

    private static string NormalizePath(string value)
    {
        return value.Trim().TrimStart('/').Replace('\\', '/');
    }

}
