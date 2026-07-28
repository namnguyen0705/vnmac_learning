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
    public ProgressTracking UpdateLessonStudyState(string userId, string lessonId, LessonStudyStateRequest request)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        _ = GetLearnerCourseInternal(userId, course.Id);

        if (!visibleLessons.Any(item => item.Id == lesson.Id))
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotFound);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var now = DateTimeOffset.UtcNow;
        var progress = GetOrCreateProgressInternal(userId, lessonId);
        var currentStep = NormalizeLessonStep(request.CurrentStep);
        // A heartbeat is sent only while the lesson page is visible. Cap each
        // increment so a suspended tab or manipulated request cannot inflate time.
        progress.ActiveStudySeconds += Math.Clamp(request.ActiveSeconds, 0, 60);
        progress.CurrentStep = currentStep == "complete" && progress.Status != LessonProgressStatus.Completed
            ? "check"
            : currentStep;
        progress.LastAccessedAt = now;
        if (progress.Status == LessonProgressStatus.NotStarted)
        {
            progress.Status = LessonProgressStatus.InProgress;
        }

        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        TouchEnrollmentInternal(enrollment, now);
        UpdateEnrollmentStateInternal(userId, visibleLessons, GetOrderedQuizzes(course), orderedLessons, enrollment);
        auditLogService.Track(
            userId,
            "learning",
            "study_state",
            nameof(Lesson),
            lesson.Id,
            $"Cap nhat buoc hoc {lesson.Title}",
            new { courseId = course.Id, lesson.Title, progress.CurrentStep, progress.Status });
        SaveChangesIfNeeded();
        return progress;
    }

    public ProgressTracking CompleteLessonContent(string userId, string lessonId)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        _ = GetLearnerCourseInternal(userId, course.Id);

        if (!visibleLessons.Any(item => item.Id == lesson.Id))
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotFound);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var now = DateTimeOffset.UtcNow;
        var progress = GetOrCreateProgressInternal(userId, lessonId);
        progress.Status = LessonProgressStatus.Completed;
        progress.CurrentStep = "complete";
        progress.LastAccessedAt = now;
        progress.CompletionTime ??= now;
        if (lesson.Type == LessonType.Interactive)
        {
            progress.InteractionAttempts = Math.Max(1, progress.InteractionAttempts + 1);
        }
        else if (lesson.Type == LessonType.Video)
        {
            progress.WatchPercent = 100;
            progress.WatchTimeMinutes = Math.Max(progress.WatchTimeMinutes, Math.Max(1, lesson.DurationMinutes));
            progress.LastPositionSeconds = Math.Max(progress.LastPositionSeconds, Math.Max(0, lesson.DurationMinutes * 60));
            progress.LastWatchedAt = now;
        }

        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        TouchEnrollmentInternal(enrollment, now);
        UpdateEnrollmentStateInternal(userId, visibleLessons, GetOrderedQuizzes(course), orderedLessons, enrollment);
        EnsureCertificateIssuedInternal(userId, course);
        auditLogService.Track(
            userId,
            "learning",
            "lesson_complete",
            nameof(Lesson),
            lesson.Id,
            $"Hoan thanh bai hoc {lesson.Title}",
            new { courseId = course.Id, lesson.Title, lesson.Type });
        SaveChangesIfNeeded();
        return progress;
    }

    public ProgressTracking UpdateVideoProgress(string userId, string lessonId, UpdateVideoProgressRequest request)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        EnsureLearnerExists(userId);
        var hasStructuredVideoStep = lesson.Content?.Steps.Any(step =>
            string.Equals(step.Key, "video", StringComparison.OrdinalIgnoreCase)) == true;

        if (lesson.Type != LessonType.Video && !hasStructuredVideoStep)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotVideo);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var progress = GetOrCreateProgressInternal(userId, lessonId);
        progress.WatchPercent = Math.Clamp(Math.Max(progress.WatchPercent, request.WatchPercent), 0, 100);
        var durationMinutes = Math.Max(lesson.DurationMinutes, request.WatchTimeMinutes);
        progress.WatchTimeMinutes = Math.Clamp(
            Math.Max(progress.WatchTimeMinutes, request.WatchTimeMinutes),
            0,
            Math.Max(1, durationMinutes));
        progress.LastPositionSeconds = Math.Clamp(
            request.LastPositionSeconds,
            0,
            Math.Max(0, Math.Max(lesson.DurationMinutes * 60, request.LastPositionSeconds)));
        var now = DateTimeOffset.UtcNow;
        var hasStructuredLessonFlow = lesson.Content?.Steps.Count > 0;
        progress.CurrentStep = hasStructuredLessonFlow
            ? "video"
            : request.WatchPercent >= 100
                ? "complete"
                : "video";
        progress.LastAccessedAt = now;
        progress.LastWatchedAt = now;
        if (hasStructuredLessonFlow && progress.Status != LessonProgressStatus.Completed)
        {
            progress.Status = LessonProgressStatus.InProgress;
            progress.CompletionTime = null;
        }
        else
        {
            progress.Status = progress.WatchPercent >= 100
                ? LessonProgressStatus.Completed
                : LessonProgressStatus.InProgress;
            progress.CompletionTime = progress.Status == LessonProgressStatus.Completed
                ? now
                : null;
        }

        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        TouchEnrollmentInternal(enrollment, now);
        UpdateEnrollmentStateInternal(userId, visibleLessons, GetOrderedQuizzes(course), orderedLessons, enrollment);
        EnsureCertificateIssuedInternal(userId, course);
        if (request.WatchPercent >= 100)
        {
            auditLogService.Track(
                userId,
                "learning",
                "video_complete",
                nameof(Lesson),
                lesson.Id,
                $"Xem het video {lesson.Title}",
                new { courseId = course.Id, lesson.Title, request.WatchPercent, request.WatchTimeMinutes });
        }
        SaveChangesIfNeeded();
        return progress;
    }

    public InteractiveAttemptResponse SubmitInteractiveAttempt(
        string userId,
        string lessonId,
        InteractiveAttemptRequest request)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        EnsureLearnerExists(userId);

        if (lesson.Type != LessonType.Interactive || lesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotInteractive);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var results = EvaluateAssessment(lesson.Assessment, request.Answers);
        var score = CalculateScore(results);
        var passed = score >= lesson.Assessment.PassScore;
        var attemptNumber = dbContext.InteractionAttempts.Count(item => item.UserId == userId && item.LessonId == lessonId) + 1;

        dbContext.InteractionAttempts.Add(new InteractionAttempt
        {
            UserId = userId,
            LessonId = lessonId,
            AttemptNumber = attemptNumber,
            AttemptedAt = DateTimeOffset.UtcNow,
            Passed = passed,
            QuestionResults = results
                .Select(item => new InteractionAttemptResult
                {
                    UserId = userId,
                    LessonId = lessonId,
                    AttemptNumber = attemptNumber,
                    QuestionId = item.TaskId,
                    Correct = item.Correct,
                    Explanation = item.Explanation
                })
                .ToList()
        });

        var progress = GetOrCreateProgressInternal(userId, lessonId);
        progress.InteractionAttempts = attemptNumber;
        progress.CurrentStep = passed ? "complete" : "check";
        progress.LastAccessedAt = DateTimeOffset.UtcNow;
        progress.Status = passed ? LessonProgressStatus.Completed : LessonProgressStatus.InProgress;
        progress.CompletionTime = passed ? progress.LastAccessedAt : null;

        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
        auditLogService.Track(
            userId,
            "learning",
            "interactive_submit",
            nameof(Lesson),
            lesson.Id,
            $"Nop tuong tac {lesson.Title}",
            new { courseId = course.Id, lesson.Title, score, passed, attemptNumber });
        SaveChangesIfNeeded();

        return new InteractiveAttemptResponse
        {
            Passed = passed,
            AttemptNumber = attemptNumber,
            Results = results,
            Progress = progress
        };
    }

}
