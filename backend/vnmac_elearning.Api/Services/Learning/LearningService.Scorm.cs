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
    public ScormLaunchResponse LaunchScormLesson(string userId, string lessonId, string? requestedScoId = null)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        EnsureLearnerExists(userId);

        if (lesson.Type != LessonType.Scorm)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotScorm);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var package = lesson.ScormPackage ?? throw new ServiceException(ServiceErrors.LearningScormPackageMissing);
        var sco = ResolveLaunchSco(package, requestedScoId);
        var registration = GetOrCreateScormRegistrationInternal(userId, lesson);
        var sessionId = $"scorm-session-{Guid.NewGuid():N}"[..30];
        var now = DateTimeOffset.UtcNow;
        var entryMode = ShouldResumeRegistration(registration) ? "resume" : "ab-initio";

        registration.AttemptCount += 1;
        registration.CurrentScoId = sco.Id;
        registration.LastLaunchedAt = now;
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course), now);

        dbContext.ScormRuntimeSessions.Add(new ScormRuntimeSession
        {
            Id = sessionId,
            UserId = userId,
            LessonId = lessonId,
            ScoId = sco.Id,
            AttemptNumber = registration.AttemptCount,
            IsActive = true,
            EventCount = 0,
            EntryMode = entryMode,
            ExitMode = string.Empty,
            CompletionStatus = registration.CompletionStatus,
            SuccessStatus = registration.SuccessStatus,
            ScoreRaw = registration.ScoreRaw,
            BaseTotalTimeSeconds = registration.TotalTimeSeconds,
            SessionTimeSeconds = 0,
            CreatedAt = now
        });

        SaveChangesIfNeeded();
        return BuildScormLaunchResponse(package, sco, sessionId, registration);
    }

    public ScormLaunchResponse GetScormLaunchContext(string sessionId)
    {
        var session = GetScormSessionInternal(sessionId);
        var lesson = GetScormLessonForSession(session);
        var package = lesson.ScormPackage ?? throw new ServiceException(ServiceErrors.LearningScormPackageMissing);
        var sco = package.Scos.Single(item => item.Id == session.ScoId);
        var registration = GetOrCreateScormRegistrationInternal(session.UserId, lesson);
        SaveChangesIfNeeded();
        return BuildScormLaunchResponse(package, sco, session.Id, registration);
    }

    public ScormInitializeResponse InitializeScormSession(string sessionId)
    {
        var session = GetActiveScormSessionInternal(sessionId);
        session.InitializedAt ??= DateTimeOffset.UtcNow;
        LogScormEvent(session, "Initialize", null, null);

        var lesson = GetScormLessonForSession(session);
        var registration = GetOrCreateScormRegistrationInternal(session.UserId, lesson);

        SaveChangesIfNeeded();
        return new ScormInitializeResponse
        {
            SessionId = session.Id,
            EntryMode = session.EntryMode,
            Registration = MapScormRegistrationSnapshot(registration)
        };
    }

    public ScormValueResponse GetScormValue(string sessionId, string element)
    {
        ValidateScormElement(element);

        var session = GetActiveScormSessionInternal(sessionId);
        var lesson = GetScormLessonForSession(session);
        var registration = GetOrCreateScormRegistrationInternal(session.UserId, lesson);
        var learner = GetLearner(session.UserId);
        var value = ResolveScormValue(session, lesson, registration, learner, element);

        LogScormEvent(session, "GetValue", element, value);
        SaveChangesIfNeeded();

        return new ScormValueResponse
        {
            Element = NormalizeElement(element),
            Value = value
        };
    }

    public ScormValueResponse SetScormValue(string sessionId, ScormSetValueRequest request)
    {
        ValidateScormElement(request.Element);

        var session = GetActiveScormSessionInternal(sessionId);
        var lesson = GetScormLessonForSession(session);
        SetRuntimeValue(session.UserId, lesson.Id, session.ScoId, request.Element, request.Value);
        ApplySessionValue(session, lesson, request.Element, request.Value);
        LogScormEvent(session, "SetValue", request.Element, request.Value);
        SaveChangesIfNeeded();

        return new ScormValueResponse
        {
            Element = NormalizeElement(request.Element),
            Value = request.Value ?? string.Empty
        };
    }

    public ScormCommitResponse CommitScormSession(string sessionId)
    {
        var session = GetActiveScormSessionInternal(sessionId);
        var lesson = GetScormLessonForSession(session);
        var course = GetCourseById(lesson.CourseId);
        var registration = GetOrCreateScormRegistrationInternal(session.UserId, lesson);

        SynchronizeScormState(session, lesson, registration);
        UpdateProgressFromScormRegistration(session.UserId, lesson, registration);
        registration.LastCommittedAt = DateTimeOffset.UtcNow;
        session.LastCommittedAt = registration.LastCommittedAt;

        LogScormEvent(session, "Commit", null, null);
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(session.UserId, course));
        EnsureCertificateIssuedInternal(session.UserId, course);
        SaveChangesIfNeeded();

        return new ScormCommitResponse
        {
            SessionId = session.Id,
            IsActive = session.IsActive,
            Registration = MapScormRegistrationSnapshot(registration)
        };
    }

    public ScormCommitResponse TerminateScormSession(string sessionId)
    {
        var session = GetActiveScormSessionInternal(sessionId);
        var lesson = GetScormLessonForSession(session);
        var course = GetCourseById(lesson.CourseId);
        var registration = GetOrCreateScormRegistrationInternal(session.UserId, lesson);

        SynchronizeScormState(session, lesson, registration);
        UpdateProgressFromScormRegistration(session.UserId, lesson, registration);
        registration.LastCommittedAt = DateTimeOffset.UtcNow;
        session.LastCommittedAt = registration.LastCommittedAt;
        session.IsActive = false;
        session.EndedAt = DateTimeOffset.UtcNow;

        LogScormEvent(session, "Terminate", null, null);
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(session.UserId, course));
        EnsureCertificateIssuedInternal(session.UserId, course);
        SaveChangesIfNeeded();

        return new ScormCommitResponse
        {
            SessionId = session.Id,
            IsActive = session.IsActive,
            Registration = MapScormRegistrationSnapshot(registration)
        };
    }

}
