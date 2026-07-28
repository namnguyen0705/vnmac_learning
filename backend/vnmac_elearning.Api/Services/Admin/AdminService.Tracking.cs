using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    private static TrackingCourseProgress BuildTrackingCourseProgress(
        string userId,
        LearnerEnrollmentAdminRow enrollment,
        Course course,
        IReadOnlyDictionary<(string UserId, string LessonId), ProgressTracking> progressMap,
        IReadOnlyDictionary<(string UserId, string LessonId), QuizResult> quizResultMap,
        IReadOnlyDictionary<(string UserId, string LessonId), int> quizAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), int> interactionAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), ScormRegistration> scormMap)
    {
        var lessons = FlattenCourseLessons(course)
            .Select(item => BuildTrackingLessonProgress(
                userId,
                item.Lesson,
                progressMap,
                quizResultMap,
                quizAttemptCounts,
                interactionAttemptCounts,
                scormMap))
            .ToArray();
        var currentLesson = !string.IsNullOrWhiteSpace(enrollment.NextLessonId)
            ? lessons.FirstOrDefault(item => item.LessonId == enrollment.NextLessonId)
            : lessons.FirstOrDefault(item => item.Status != LessonProgressStatus.Completed);

        return new TrackingCourseProgress
        {
            CourseId = course.Id,
            CourseTitle = course.Title,
            EnrolledAt = DateTimeOffset.MinValue,
            LastAccessedAt = MaxDate(lessons.SelectMany(item => new[]
            {
                item.LastWatchedAt,
                item.CompletionTime
            })),
            OverallCompletionPercent = enrollment.OverallCompletionPercent,
            ContentCompletionPercent = enrollment.ContentCompletionPercent,
            QuizCompletionPercent = enrollment.QuizCompletionPercent,
            CurrentLessonId = currentLesson?.LessonId,
            CurrentLessonTitle = currentLesson?.Title,
            CurrentLessonType = currentLesson?.Type,
            LastPositionSeconds = currentLesson?.LastPositionSeconds ?? 0,
            Lessons = lessons
        };
    }

    private static TrackingLessonProgress BuildTrackingLessonProgress(
        string userId,
        Lesson lesson,
        IReadOnlyDictionary<(string UserId, string LessonId), ProgressTracking> progressMap,
        IReadOnlyDictionary<(string UserId, string LessonId), QuizResult> quizResultMap,
        IReadOnlyDictionary<(string UserId, string LessonId), int> quizAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), int> interactionAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), ScormRegistration> scormMap)
    {
        var key = (userId, lesson.Id);
        progressMap.TryGetValue(key, out var progress);
        quizResultMap.TryGetValue(key, out var quizResult);
        scormMap.TryGetValue(key, out var scorm);

        return new TrackingLessonProgress
        {
            LessonId = lesson.Id,
            Title = lesson.Title,
            Type = lesson.Type,
            Status = progress?.Status ?? LessonProgressStatus.NotStarted,
            WatchPercent = progress?.WatchPercent ?? 0,
            WatchTimeMinutes = progress?.WatchTimeMinutes ?? 0,
            LastPositionSeconds = progress?.LastPositionSeconds ?? 0,
            LastWatchedAt = progress?.LastWatchedAt,
            CompletionTime = progress?.CompletionTime,
            InteractionAttempts = interactionAttemptCounts.GetValueOrDefault(key, progress?.InteractionAttempts ?? 0),
            QuizAttempts = quizAttemptCounts.GetValueOrDefault(key, quizResult?.Attempts ?? 0),
            QuizScore = quizResult?.Score ?? 0,
            ScormAttempts = scorm?.AttemptCount ?? 0,
            ScormTotalTimeSeconds = scorm?.TotalTimeSeconds ?? 0,
            ScormLocation = scorm?.Location ?? string.Empty,
            ScormCompletionStatus = scorm?.CompletionStatus,
            ScormSuccessStatus = scorm?.SuccessStatus
        };
    }

    private static IReadOnlyCollection<TrackingTimelineEvent> BuildTrackingTimeline(
        LearnerAdminRow learner,
        IReadOnlySet<string> lessonIds,
        IReadOnlyDictionary<string, (Course Course, Lesson Lesson)> lessonMap,
        IReadOnlyDictionary<(string UserId, string LessonId), ProgressTracking> progressMap,
        IReadOnlyCollection<QuizAttempt> quizAttempts,
        IReadOnlyCollection<InteractionAttempt> interactionAttempts,
        IReadOnlyCollection<ScormRegistration> scormRegistrations)
    {
        var events = new List<TrackingTimelineEvent>();

        foreach (var progress in progressMap.Values.Where(item => item.UserId == learner.UserId && lessonIds.Contains(item.LessonId)))
        {
            if (!lessonMap.TryGetValue(progress.LessonId, out var context))
            {
                continue;
            }

            if (progress.LastWatchedAt is not null)
            {
                events.Add(new TrackingTimelineEvent
                {
                    Id = $"video-{progress.UserId}-{progress.LessonId}",
                    UserId = learner.UserId,
                    LearnerName = learner.FullName,
                    CourseTitle = context.Course.Title,
                    LessonTitle = context.Lesson.Title,
                    Type = "Video",
                    Detail = $"Da xem {progress.WatchPercent}% - dung tai {progress.LastPositionSeconds}s",
                    OccurredAt = progress.LastWatchedAt.Value
                });
            }

            if (progress.CompletionTime is not null)
            {
                events.Add(new TrackingTimelineEvent
                {
                    Id = $"complete-{progress.UserId}-{progress.LessonId}",
                    UserId = learner.UserId,
                    LearnerName = learner.FullName,
                    CourseTitle = context.Course.Title,
                    LessonTitle = context.Lesson.Title,
                    Type = "Hoan thanh",
                    Detail = "Hoan thanh bai hoc",
                    OccurredAt = progress.CompletionTime.Value
                });
            }
        }

        foreach (var attempt in quizAttempts.Where(item => item.UserId == learner.UserId && lessonIds.Contains(item.LessonId)))
        {
            if (!lessonMap.TryGetValue(attempt.LessonId, out var context))
            {
                continue;
            }

            events.Add(new TrackingTimelineEvent
            {
                Id = $"quiz-{attempt.UserId}-{attempt.LessonId}-{attempt.AttemptNumber}",
                UserId = learner.UserId,
                LearnerName = learner.FullName,
                CourseTitle = context.Course.Title,
                LessonTitle = context.Lesson.Title,
                Type = "Quiz",
                Detail = $"Lan {attempt.AttemptNumber} - {attempt.Score} diem",
                OccurredAt = attempt.AttemptedAt
            });
        }

        foreach (var attempt in interactionAttempts.Where(item => item.UserId == learner.UserId && lessonIds.Contains(item.LessonId)))
        {
            if (!lessonMap.TryGetValue(attempt.LessonId, out var context))
            {
                continue;
            }

            events.Add(new TrackingTimelineEvent
            {
                Id = $"interaction-{attempt.UserId}-{attempt.LessonId}-{attempt.AttemptNumber}",
                UserId = learner.UserId,
                LearnerName = learner.FullName,
                CourseTitle = context.Course.Title,
                LessonTitle = context.Lesson.Title,
                Type = "Tuong tac",
                Detail = attempt.Passed ? "Dat bai tuong tac" : "Chua dat bai tuong tac",
                OccurredAt = attempt.AttemptedAt
            });
        }

        foreach (var registration in scormRegistrations.Where(item => item.UserId == learner.UserId && lessonIds.Contains(item.LessonId)))
        {
            if (!lessonMap.TryGetValue(registration.LessonId, out var context))
            {
                continue;
            }

            if (registration.LastLaunchedAt is not null)
            {
                events.Add(new TrackingTimelineEvent
                {
                    Id = $"scorm-launch-{registration.UserId}-{registration.LessonId}",
                    UserId = learner.UserId,
                    LearnerName = learner.FullName,
                    CourseTitle = context.Course.Title,
                    LessonTitle = context.Lesson.Title,
                    Type = "SCORM",
                    Detail = $"Mo SCORM - {registration.CompletionStatus}",
                    OccurredAt = registration.LastLaunchedAt.Value
                });
            }

            if (registration.LastCommittedAt is not null)
            {
                events.Add(new TrackingTimelineEvent
                {
                    Id = $"scorm-commit-{registration.UserId}-{registration.LessonId}",
                    UserId = learner.UserId,
                    LearnerName = learner.FullName,
                    CourseTitle = context.Course.Title,
                    LessonTitle = context.Lesson.Title,
                    Type = "SCORM",
                    Detail = $"Luu SCORM - {registration.SuccessStatus}",
                    OccurredAt = registration.LastCommittedAt.Value
                });
            }
        }

        return events;
    }

    private static string ResolveTrackingStatus(
        LearnerAdminRow learner,
        IReadOnlyCollection<TrackingCourseProgress> courses,
        DateTimeOffset? lastActivity)
    {
        if (courses.Count > 0 && courses.All(item => item.OverallCompletionPercent >= 100))
        {
            return "Hoan thanh";
        }

        if (!string.IsNullOrWhiteSpace(learner.StalledAtLessonId))
        {
            return "Mac ket";
        }

        if (lastActivity is null && courses.All(item => item.OverallCompletionPercent <= 0))
        {
            return "Chua bat dau";
        }

        return "Dang hoc";
    }

    private static bool MatchesTrackingStatus(TrackingLearnerRow row, string? status)
    {
        if (string.IsNullOrWhiteSpace(status) || status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return status.Trim().ToLowerInvariant() switch
        {
            "active" => row.Status == "Dang hoc",
            "stalled" => row.Status == "Mac ket",
            "completed" => row.Status == "Hoan thanh",
            "not-started" => row.Status == "Chua bat dau",
            _ => true
        };
    }

    private static IEnumerable<(Course Course, Lesson Lesson)> FlattenCourseLessons(Course course)
    {
        return course.Sections
            .OrderBy(section => section.Order)
            .SelectMany(section => section.Lessons.OrderBy(lesson => lesson.Order).Select(lesson => (course, lesson)));
    }

    private static DateTimeOffset? MaxDate(IEnumerable<DateTimeOffset?> values)
    {
        var concreteValues = values.Where(value => value is not null).Select(value => value!.Value).ToArray();
        return concreteValues.Length == 0 ? null : concreteValues.Max();
    }

}
