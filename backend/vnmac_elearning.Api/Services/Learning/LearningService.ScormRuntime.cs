using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    private ScormRuntimeSession GetScormSessionInternal(string sessionId)
    {
        var session = dbContext.ScormRuntimeSessions.SingleOrDefault(item => item.Id == sessionId);
        return session ?? throw new ServiceException(ServiceErrors.LearningScormSessionNotFound);
    }

    private ScormRuntimeSession GetActiveScormSessionInternal(string sessionId)
    {
        var session = GetScormSessionInternal(sessionId);
        if (!session.IsActive)
        {
            throw new ServiceException(ServiceErrors.LearningScormSessionInactive);
        }

        return session;
    }

    private Lesson GetScormLessonForSession(ScormRuntimeSession session)
    {
        var course = GetCourseById(dbContext.Lessons
            .Where(item => item.Id == session.LessonId)
            .Select(item => item.CourseId)
            .SingleOrDefault() ?? string.Empty);
        var orderedLessons = GetOrderedLessons(course);
        var lesson = GetLessonInternal(session.LessonId, orderedLessons);
        if (lesson.Type != LessonType.Scorm || lesson.ScormPackage is null)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotScorm);
        }

        return lesson;
    }

    private static ScormSco ResolveLaunchSco(ScormPackage package, string? requestedScoId)
    {
        var candidateId = string.IsNullOrWhiteSpace(requestedScoId)
            ? package.LaunchScoId
            : requestedScoId.Trim();

        if (!string.IsNullOrWhiteSpace(candidateId))
        {
            var match = package.Scos.SingleOrDefault(item => item.Id == candidateId);
            if (match is not null)
            {
                return match;
            }
        }

        return package.Scos.OrderBy(item => item.Order).First();
    }

    private static bool ShouldResumeRegistration(ScormRegistration registration)
    {
        return !string.IsNullOrWhiteSpace(registration.SuspendData)
            || !string.IsNullOrWhiteSpace(registration.Location)
            || registration.CompletionStatus == ScormCompletionStatus.Incomplete;
    }

    private void ValidateScormElement(string element)
    {
        if (string.IsNullOrWhiteSpace(element))
        {
            throw new ServiceException(ServiceErrors.LearningScormElementRequired);
        }
    }

    private string ResolveScormValue(
        ScormRuntimeSession session,
        Lesson lesson,
        ScormRegistration registration,
        User learner,
        string element)
    {
        var normalizedElement = NormalizeElement(element);

        var stored = dbContext.ScormRuntimeValues
            .SingleOrDefault(item =>
                item.UserId == session.UserId &&
                item.LessonId == session.LessonId &&
                item.ScoId == session.ScoId &&
                item.Element == normalizedElement);

        if (stored is not null)
        {
            return stored.Value;
        }

        return BuildDefaultScormValue(session, lesson, registration, learner, normalizedElement);
    }

    private void SetRuntimeValue(string userId, string lessonId, string scoId, string element, string? value)
    {
        var normalizedElement = NormalizeElement(element);
        var stored = dbContext.ScormRuntimeValues.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lessonId &&
            item.ScoId == scoId &&
            item.Element == normalizedElement);

        if (stored is null)
        {
            stored = new ScormRuntimeValue
            {
                UserId = userId,
                LessonId = lessonId,
                ScoId = scoId,
                Element = normalizedElement,
                Value = value ?? string.Empty,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            dbContext.ScormRuntimeValues.Add(stored);
        }
        else
        {
            stored.Value = value ?? string.Empty;
            stored.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private void ApplySessionValue(ScormRuntimeSession session, Lesson lesson, string element, string value)
    {
        var normalizedElement = NormalizeElement(element);
        if (IsSessionTimeElement(lesson, normalizedElement))
        {
            session.SessionTimeSeconds = ParseDurationSeconds(lesson.ScormPackage!.Version, normalizedElement, value);
        }

        if (IsExitElement(lesson, normalizedElement))
        {
            session.ExitMode = value.Trim();
        }
    }

    private void SynchronizeScormState(ScormRuntimeSession session, Lesson lesson, ScormRegistration registration)
    {
        var package = lesson.ScormPackage ?? throw new ServiceException(ServiceErrors.LearningScormPackageMissing);
        registration.CurrentScoId = session.ScoId;
        registration.Location = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), GetLocationElement(package.Version));
        registration.SuspendData = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), "cmi.suspend_data");

        var scoreRawValue = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), GetScoreRawElement(package.Version));
        var scoreMinValue = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), GetScoreMinElement(package.Version));
        var scoreMaxValue = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), GetScoreMaxElement(package.Version));
        registration.ScoreRaw = ParseDecimal(scoreRawValue);
        registration.ScoreMin = ParseDecimal(scoreMinValue);
        registration.ScoreMax = ParseDecimal(scoreMaxValue);

        if (package.Version == ScormVersion.Scorm12)
        {
            var lessonStatus = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), "cmi.core.lesson_status");
            ApplyScorm12Status(lessonStatus, registration, session);
        }
        else
        {
            var completionStatus = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), "cmi.completion_status");
            var successStatus = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), "cmi.success_status");
            registration.CompletionStatus = MapScorm2004Completion(completionStatus);
            registration.SuccessStatus = MapScorm2004Success(successStatus);
            session.CompletionStatus = registration.CompletionStatus;
            session.SuccessStatus = registration.SuccessStatus;
        }

        var totalTimeElement = GetTotalTimeElement(package.Version);
        var totalTimeValue = ResolveScormValue(session, lesson, registration, GetLearner(session.UserId), totalTimeElement);
        var parsedTotalTime = ParseDurationSeconds(package.Version, totalTimeElement, totalTimeValue);
        registration.TotalTimeSeconds = parsedTotalTime > 0
            ? parsedTotalTime
            : session.BaseTotalTimeSeconds + session.SessionTimeSeconds;

        session.ScoreRaw = registration.ScoreRaw;
        if (IsScormLessonCompleted(registration))
        {
            registration.CompletedAt ??= DateTimeOffset.UtcNow;
        }
    }

    private void UpdateProgressFromScormRegistration(string userId, Lesson lesson, ScormRegistration registration)
    {
        var progress = GetOrCreateProgressInternal(userId, lesson.Id);
        progress.Status = IsScormLessonCompleted(registration)
            ? LessonProgressStatus.Completed
            : registration.AttemptCount > 0
                ? LessonProgressStatus.InProgress
                : LessonProgressStatus.NotStarted;
        progress.CompletionTime = progress.Status == LessonProgressStatus.Completed
            ? registration.CompletedAt ?? DateTimeOffset.UtcNow
            : null;
    }

    private static bool IsScormLessonCompleted(ScormRegistration registration)
    {
        if (registration.SuccessStatus == ScormSuccessStatus.Failed || registration.CompletionStatus == ScormCompletionStatus.Failed)
        {
            return false;
        }

        return registration.SuccessStatus == ScormSuccessStatus.Passed
            || registration.CompletionStatus is ScormCompletionStatus.Completed or ScormCompletionStatus.Passed;
    }

    private string BuildDefaultScormValue(
        ScormRuntimeSession session,
        Lesson lesson,
        ScormRegistration registration,
        User learner,
        string element)
    {
        var version = lesson.ScormPackage!.Version;
        return version == ScormVersion.Scorm12
            ? BuildScorm12DefaultValue(session, registration, learner, element)
            : BuildScorm2004DefaultValue(session, registration, learner, element);
    }

    private static string BuildScorm12DefaultValue(
        ScormRuntimeSession session,
        ScormRegistration registration,
        User learner,
        string element)
    {
        return element switch
        {
            "cmi.core.student_id" => learner.Id,
            "cmi.core.student_name" => learner.FullName,
            "cmi.core.lesson_location" => registration.Location,
            "cmi.suspend_data" => registration.SuspendData,
            "cmi.core.lesson_status" => MapScorm12LessonStatus(registration),
            "cmi.core.entry" => session.EntryMode,
            "cmi.core.credit" => "credit",
            "cmi.core.lesson_mode" => "normal",
            "cmi.core.total_time" => FormatScorm12Time(registration.TotalTimeSeconds),
            "cmi.core.score.raw" => FormatDecimal(registration.ScoreRaw),
            "cmi.core.score.min" => FormatDecimal(registration.ScoreMin),
            "cmi.core.score.max" => FormatDecimal(registration.ScoreMax),
            _ => string.Empty
        };
    }

    private static string BuildScorm2004DefaultValue(
        ScormRuntimeSession session,
        ScormRegistration registration,
        User learner,
        string element)
    {
        return element switch
        {
            "cmi.learner_id" => learner.Id,
            "cmi.learner_name" => learner.FullName,
            "cmi.location" => registration.Location,
            "cmi.suspend_data" => registration.SuspendData,
            "cmi.completion_status" => MapScorm2004Completion(registration.CompletionStatus),
            "cmi.success_status" => MapScorm2004Success(registration.SuccessStatus),
            "cmi.entry" => session.EntryMode,
            "cmi.credit" => "credit",
            "cmi.mode" => "normal",
            "cmi.total_time" => XmlConvert.ToString(TimeSpan.FromSeconds(registration.TotalTimeSeconds)),
            "cmi.score.raw" => FormatDecimal(registration.ScoreRaw),
            "cmi.score.min" => FormatDecimal(registration.ScoreMin),
            "cmi.score.max" => FormatDecimal(registration.ScoreMax),
            _ => string.Empty
        };
    }

    private void LogScormEvent(ScormRuntimeSession session, string action, string? element, string? value)
    {
        session.EventCount += 1;
        dbContext.ScormRuntimeEvents.Add(new ScormRuntimeEvent
        {
            Id = $"scorm-event-{Guid.NewGuid():N}"[..28],
            SessionId = session.Id,
            Sequence = session.EventCount,
            Action = action,
            Element = string.IsNullOrWhiteSpace(element) ? null : NormalizeElement(element),
            Value = value,
            CreatedAt = DateTimeOffset.UtcNow
        });
    }

    private static void ApplyScorm12Status(string lessonStatus, ScormRegistration registration, ScormRuntimeSession session)
    {
        switch (Normalize(lessonStatus))
        {
            case "passed":
                registration.CompletionStatus = ScormCompletionStatus.Passed;
                registration.SuccessStatus = ScormSuccessStatus.Passed;
                break;
            case "completed":
                registration.CompletionStatus = ScormCompletionStatus.Completed;
                registration.SuccessStatus = ScormSuccessStatus.Unknown;
                break;
            case "failed":
                registration.CompletionStatus = ScormCompletionStatus.Failed;
                registration.SuccessStatus = ScormSuccessStatus.Failed;
                break;
            case "incomplete":
                registration.CompletionStatus = ScormCompletionStatus.Incomplete;
                registration.SuccessStatus = ScormSuccessStatus.Unknown;
                break;
            case "browsed":
                registration.CompletionStatus = ScormCompletionStatus.Browsed;
                registration.SuccessStatus = ScormSuccessStatus.Unknown;
                break;
            default:
                registration.CompletionStatus = ScormCompletionStatus.NotAttempted;
                registration.SuccessStatus = ScormSuccessStatus.Unknown;
                break;
        }

        session.CompletionStatus = registration.CompletionStatus;
        session.SuccessStatus = registration.SuccessStatus;
    }

    private static ScormCompletionStatus MapScorm2004Completion(string value)
    {
        return Normalize(value) switch
        {
            "completed" => ScormCompletionStatus.Completed,
            "incomplete" => ScormCompletionStatus.Incomplete,
            "not attempted" => ScormCompletionStatus.NotAttempted,
            _ => ScormCompletionStatus.Unknown
        };
    }

    private static ScormSuccessStatus MapScorm2004Success(string value)
    {
        return Normalize(value) switch
        {
            "passed" => ScormSuccessStatus.Passed,
            "failed" => ScormSuccessStatus.Failed,
            _ => ScormSuccessStatus.Unknown
        };
    }

    private static string MapScorm12LessonStatus(ScormRegistration registration)
    {
        return registration.CompletionStatus switch
        {
            ScormCompletionStatus.Passed => "passed",
            ScormCompletionStatus.Completed => "completed",
            ScormCompletionStatus.Failed => "failed",
            ScormCompletionStatus.Incomplete => "incomplete",
            ScormCompletionStatus.Browsed => "browsed",
            _ => "not attempted"
        };
    }

    private static string MapScorm2004Completion(ScormCompletionStatus status)
    {
        return status switch
        {
            ScormCompletionStatus.Completed or ScormCompletionStatus.Passed => "completed",
            ScormCompletionStatus.Incomplete => "incomplete",
            ScormCompletionStatus.NotAttempted => "not attempted",
            _ => "unknown"
        };
    }

    private static string MapScorm2004Success(ScormSuccessStatus status)
    {
        return status switch
        {
            ScormSuccessStatus.Passed => "passed",
            ScormSuccessStatus.Failed => "failed",
            _ => "unknown"
        };
    }

    private static string GetLocationElement(ScormVersion version)
    {
        return version == ScormVersion.Scorm12 ? "cmi.core.lesson_location" : "cmi.location";
    }

    private static string GetScoreRawElement(ScormVersion version)
    {
        return version == ScormVersion.Scorm12 ? "cmi.core.score.raw" : "cmi.score.raw";
    }

    private static string GetScoreMinElement(ScormVersion version)
    {
        return version == ScormVersion.Scorm12 ? "cmi.core.score.min" : "cmi.score.min";
    }

    private static string GetScoreMaxElement(ScormVersion version)
    {
        return version == ScormVersion.Scorm12 ? "cmi.core.score.max" : "cmi.score.max";
    }

    private static string GetTotalTimeElement(ScormVersion version)
    {
        return version == ScormVersion.Scorm12 ? "cmi.core.total_time" : "cmi.total_time";
    }

    private static bool IsSessionTimeElement(Lesson lesson, string element)
    {
        var version = lesson.ScormPackage!.Version;
        return version == ScormVersion.Scorm12
            ? element == "cmi.core.session_time"
            : element == "cmi.session_time";
    }

    private static bool IsExitElement(Lesson lesson, string element)
    {
        var version = lesson.ScormPackage!.Version;
        return version == ScormVersion.Scorm12
            ? element == "cmi.core.exit"
            : element == "cmi.exit";
    }

    private static int ParseDurationSeconds(ScormVersion version, string element, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        if (version == ScormVersion.Scorm12)
        {
            var normalized = value.Trim();
            var parts = normalized.Split(':', StringSplitOptions.TrimEntries);
            if (parts.Length != 3)
            {
                return 0;
            }

            var hours = int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedHours)
                ? parsedHours
                : 0;
            var minutes = int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedMinutes)
                ? parsedMinutes
                : 0;

            var secondPart = parts[2].Split('.', StringSplitOptions.TrimEntries);
            var seconds = int.TryParse(secondPart[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedSeconds)
                ? parsedSeconds
                : 0;

            return (hours * 3600) + (minutes * 60) + seconds;
        }

        try
        {
            return (int)Math.Round(XmlConvert.ToTimeSpan(value.Trim()).TotalSeconds, MidpointRounding.AwayFromZero);
        }
        catch
        {
            return 0;
        }
    }

    private static decimal? ParseDecimal(string value)
    {
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static string FormatDecimal(decimal? value)
    {
        return value?.ToString("0.##", CultureInfo.InvariantCulture) ?? string.Empty;
    }

    private static string FormatScorm12Time(int totalTimeSeconds)
    {
        var hours = totalTimeSeconds / 3600;
        var minutes = (totalTimeSeconds % 3600) / 60;
        var seconds = totalTimeSeconds % 60;
        return $"{hours:0000}:{minutes:00}:{seconds:00}";
    }

}
