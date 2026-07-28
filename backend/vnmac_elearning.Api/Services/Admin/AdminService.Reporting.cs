using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    public AnalyticsResponse GetAnalytics(string? province, string? group)
    {
        var learners = GetLearners(province, group).ToArray();
        var lessonMap = dbContext.Lessons.ToDictionary(lesson => lesson.Id, lesson => lesson.Title, StringComparer.Ordinal);
        var questionLessonMap = dbContext.LessonQuestions.ToDictionary(question => question.Id, question => question.LessonId, StringComparer.Ordinal);
        var filteredUserIds = learners.Select(item => item.UserId).ToHashSet(StringComparer.Ordinal);

        var difficultLessons = dbContext.QuizAttemptWrongQuestions
            .Where(attempt => filteredUserIds.Contains(attempt.UserId))
            .Select(attempt => attempt.QuestionId)
            .AsEnumerable()
            .Where(questionLessonMap.ContainsKey)
            .GroupBy(questionId => questionLessonMap[questionId])
            .Select(grouping => new AnalyticsItem
            {
                Id = grouping.Key,
                Title = lessonMap.GetValueOrDefault(grouping.Key, grouping.Key),
                Total = grouping.Count()
            })
            .OrderByDescending(item => item.Total)
            .Take(5)
            .ToArray();

        var dropOffLessons = learners
            .Where(item => item.CompletionPercent < 100)
            .GroupBy(item => item.StalledAtLessonId)
            .Select(grouping => new AnalyticsItem
            {
                Id = grouping.Key,
                Title = lessonMap.GetValueOrDefault(grouping.Key, grouping.Key),
                Total = grouping.Count()
            })
            .OrderByDescending(item => item.Total)
            .Take(5)
            .ToArray();

        var totalLearners = learners.Length;
        var completionRate = totalLearners == 0 ? 0 : (int)Math.Round((double)learners.Count(item => item.CompletionPercent == 100) / totalLearners * 100);
        var passRate = totalLearners == 0 ? 0 : (int)Math.Round((double)learners.Count(item => item.Passed) / totalLearners * 100);
        var averageStudyTime = totalLearners == 0 ? 0 : (int)Math.Round(learners.Average(item => item.StudyTimeMinutes));

        return new AnalyticsResponse
        {
            ProvinceFilter = string.IsNullOrWhiteSpace(province) ? "Tat ca" : province,
            GroupFilter = string.IsNullOrWhiteSpace(group) ? "Tat ca" : group,
            TotalLearners = totalLearners,
            CompletionRatePercent = completionRate,
            PassRatePercent = passRate,
            AverageStudyTimeMinutes = averageStudyTime,
            TopDifficultLessons = difficultLessons,
            DropOffLessons = dropOffLessons,
            Learners = learners
        };
    }

    public TrackingResponse GetTracking(string? courseId, string? province, string? group, string? status)
    {
        var courses = CourseGraphQuery()
            .OrderBy(course => course.Title)
            .ToArray();
        var courseMap = courses.ToDictionary(course => course.Id, StringComparer.Ordinal);
        var lessons = courses.SelectMany(FlattenCourseLessons).ToArray();
        var lessonMap = lessons.ToDictionary(item => item.Lesson.Id, StringComparer.Ordinal);
        var progressMap = dbContext.ProgressTrackings
            .AsEnumerable()
            .GroupBy(item => (item.UserId, item.LessonId))
            .ToDictionary(grouping => grouping.Key, grouping => grouping.First());
        var quizResultMap = dbContext.QuizResults
            .AsEnumerable()
            .GroupBy(item => (item.UserId, item.LessonId))
            .ToDictionary(grouping => grouping.Key, grouping => grouping.First());
        var quizAttempts = dbContext.QuizAttempts.ToArray();
        var interactionAttempts = dbContext.InteractionAttempts.ToArray();
        var scormRegistrations = dbContext.ScormRegistrations.ToArray();
        var quizAttemptCounts = quizAttempts
            .GroupBy(item => (item.UserId, item.LessonId))
            .ToDictionary(grouping => grouping.Key, grouping => grouping.Count());
        var interactionAttemptCounts = interactionAttempts
            .GroupBy(item => (item.UserId, item.LessonId))
            .ToDictionary(grouping => grouping.Key, grouping => grouping.Count());
        var scormMap = scormRegistrations
            .GroupBy(item => (item.UserId, item.LessonId))
            .ToDictionary(grouping => grouping.Key, grouping => grouping.First());

        var learners = GetLearners(province, group)
            .Select(learner => BuildTrackingLearner(
                learner,
                courseId,
                courseMap,
                lessonMap,
                progressMap,
                quizResultMap,
                quizAttemptCounts,
                interactionAttemptCounts,
                scormMap,
                quizAttempts,
                interactionAttempts,
                scormRegistrations))
            .Where(item => item.Courses.Count > 0)
            .Where(item => MatchesTrackingStatus(item, status))
            .OrderByDescending(item => item.LastActivityAt ?? DateTimeOffset.MinValue)
            .ThenBy(item => item.FullName)
            .ToArray();

        var dropOffLessons = learners
            .SelectMany(item => item.Courses.Select(course => new
            {
                course.CourseTitle,
                course.CurrentLessonId,
                course.CurrentLessonTitle,
                course.OverallCompletionPercent,
                course.LastPositionSeconds,
                Progress = course.CurrentLessonId is null
                    ? null
                    : course.Lessons.FirstOrDefault(lesson => lesson.LessonId == course.CurrentLessonId)
            }))
            .Where(item => item.CurrentLessonId is not null && item.OverallCompletionPercent < 100)
            .GroupBy(item => item.CurrentLessonId!, StringComparer.Ordinal)
            .Select(grouping => new TrackingDropOffItem
            {
                LessonId = grouping.Key,
                Title = grouping.First().CurrentLessonTitle ?? grouping.Key,
                CourseTitle = grouping.First().CourseTitle,
                LearnerCount = grouping.Count(),
                AverageWatchPercent = grouping.Any(item => item.Progress is not null)
                    ? (int)Math.Round(grouping.Average(item => item.Progress?.WatchPercent ?? 0))
                    : 0
            })
            .OrderByDescending(item => item.LearnerCount)
            .ThenBy(item => item.Title)
            .Take(8)
            .ToArray();

        var recentEvents = learners
            .SelectMany(item => item.Timeline)
            .OrderByDescending(item => item.OccurredAt)
            .Take(12)
            .ToArray();
        var courseSummaries = BuildCourseSummaries(learners);
        var lessonSummaries = BuildLessonSummaries(learners);
        var videoSummaries = BuildVideoSummaries(learners);

        return new TrackingResponse
        {
            Overview = new TrackingOverview
            {
                TotalLearners = learners.Length,
                ActiveLearners = learners.Count(item => item.Status == "Dang hoc"),
                StalledLearners = learners.Count(item => item.Status == "Mac ket"),
                CompletedCourses = learners.Sum(item => item.Courses.Count(course => course.OverallCompletionPercent >= 100))
            },
            Courses = courses.Select(course => new TrackingCourseOption
            {
                CourseId = course.Id,
                Title = course.Title
            }).ToArray(),
            Learners = learners,
            CourseSummaries = courseSummaries,
            LessonSummaries = lessonSummaries,
            VideoSummaries = videoSummaries,
            DropOffLessons = dropOffLessons,
            RecentEvents = recentEvents
        };
    }

    public string ExportTrackingCsv(string? courseId, string? province, string? group, string? status)
    {
        var tracking = GetTracking(courseId, province, group, status);
        var builder = new StringBuilder();

        builder.AppendLine("Section,CourseId,CourseTitle,LessonId,LessonTitle,LessonType,LearnerId,LearnerName,Province,Group,Status,EnrolledLearners,StartedLearners,CompletedLearners,DropOffLearners,AverageCompletionPercent,AverageProgressPercent,AverageWatchPercent,AverageStopPositionSeconds,LastActivityAt");

        foreach (var course in tracking.CourseSummaries)
        {
            builder.AppendLine(string.Join(",",
                "Course",
                EscapeCsv(course.CourseId),
                EscapeCsv(course.CourseTitle),
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                course.EnrolledLearners,
                course.ActiveLearners,
                course.CompletedLearners,
                string.Empty,
                course.AverageCompletionPercent,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty));
        }

        foreach (var lesson in tracking.LessonSummaries)
        {
            builder.AppendLine(string.Join(",",
                "Lesson",
                string.Empty,
                EscapeCsv(lesson.CourseTitle),
                EscapeCsv(lesson.LessonId),
                EscapeCsv(lesson.Title),
                lesson.Type,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                lesson.StartedLearners,
                lesson.CompletedLearners,
                lesson.DropOffLearners,
                string.Empty,
                lesson.AverageProgressPercent,
                string.Empty,
                string.Empty,
                string.Empty));
        }

        foreach (var video in tracking.VideoSummaries)
        {
            builder.AppendLine(string.Join(",",
                "Video",
                string.Empty,
                EscapeCsv(video.CourseTitle),
                EscapeCsv(video.LessonId),
                EscapeCsv(video.Title),
                LessonType.Video,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                video.StartedLearners,
                video.CompletedLearners,
                video.DropOffLearners,
                string.Empty,
                string.Empty,
                video.AverageWatchPercent,
                video.AverageStopPositionSeconds,
                string.Empty));
        }

        foreach (var learner in tracking.Learners)
        {
            var primaryCourse = learner.Courses.FirstOrDefault(item => item.OverallCompletionPercent > 0 && item.OverallCompletionPercent < 100)
                ?? learner.Courses.FirstOrDefault();
            builder.AppendLine(string.Join(",",
                "Learner",
                EscapeCsv(primaryCourse?.CourseId ?? string.Empty),
                EscapeCsv(primaryCourse?.CourseTitle ?? string.Empty),
                EscapeCsv(primaryCourse?.CurrentLessonId ?? string.Empty),
                EscapeCsv(primaryCourse?.CurrentLessonTitle ?? string.Empty),
                primaryCourse?.CurrentLessonType?.ToString() ?? string.Empty,
                EscapeCsv(learner.UserId),
                EscapeCsv(learner.FullName),
                EscapeCsv(learner.Province),
                EscapeCsv(learner.Group),
                EscapeCsv(learner.Status),
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty,
                primaryCourse?.OverallCompletionPercent.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
                string.Empty,
                string.Empty,
                primaryCourse?.LastPositionSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
                learner.LastActivityAt?.ToString("O") ?? string.Empty));
        }

        return builder.ToString();
    }

    public string ExportLearnersCsv(string? province, string? group)
    {
        var rows = GetLearners(province, group);
        var builder = new StringBuilder();
        builder.AppendLine("UserId,Username,FullName,PhoneNumber,Province,Group,CompletionPercent,Passed,StudyTimeMinutes,StalledAtLessonId,CertificateCount,Enrollments");

        foreach (var row in rows)
        {
            var enrollments = string.Join(" | ", row.Enrollments.Select(item =>
                $"{item.CourseTitle}:{item.OverallCompletionPercent}%:Quiz{item.QuizCompletionPercent}%"));
            builder.AppendLine(string.Join(",",
                EscapeCsv(row.UserId),
                EscapeCsv(row.Username),
                EscapeCsv(row.FullName),
                EscapeCsv(row.PhoneNumber),
                EscapeCsv(row.Province),
                EscapeCsv(row.Group),
                row.CompletionPercent,
                row.Passed,
                row.StudyTimeMinutes,
                EscapeCsv(row.StalledAtLessonId),
                row.CertificateCount,
                EscapeCsv(enrollments)));
        }

        return builder.ToString();
    }

    private TrackingLearnerRow BuildTrackingLearner(
        LearnerAdminRow learner,
        string? courseId,
        IReadOnlyDictionary<string, Course> courseMap,
        IReadOnlyDictionary<string, (Course Course, Lesson Lesson)> lessonMap,
        IReadOnlyDictionary<(string UserId, string LessonId), ProgressTracking> progressMap,
        IReadOnlyDictionary<(string UserId, string LessonId), QuizResult> quizResultMap,
        IReadOnlyDictionary<(string UserId, string LessonId), int> quizAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), int> interactionAttemptCounts,
        IReadOnlyDictionary<(string UserId, string LessonId), ScormRegistration> scormMap,
        IReadOnlyCollection<QuizAttempt> quizAttempts,
        IReadOnlyCollection<InteractionAttempt> interactionAttempts,
        IReadOnlyCollection<ScormRegistration> scormRegistrations)
    {
        var courseProgress = learner.Enrollments
            .Where(enrollment => string.IsNullOrWhiteSpace(courseId) || enrollment.CourseId == courseId)
            .Where(enrollment => courseMap.ContainsKey(enrollment.CourseId))
            .Select(enrollment => BuildTrackingCourseProgress(
                learner.UserId,
                enrollment,
                courseMap[enrollment.CourseId],
                progressMap,
                quizResultMap,
                quizAttemptCounts,
                interactionAttemptCounts,
                scormMap))
            .ToArray();

        var timeline = BuildTrackingTimeline(
                learner,
                courseProgress.SelectMany(item => item.Lessons).Select(item => item.LessonId).ToHashSet(StringComparer.Ordinal),
                lessonMap,
                progressMap,
                quizAttempts,
                interactionAttempts,
                scormRegistrations)
            .OrderByDescending(item => item.OccurredAt)
            .Take(16)
            .ToArray();

        var lastActivity = MaxDate(courseProgress.Select(item => item.LastAccessedAt)
            .Concat(timeline.Select(item => (DateTimeOffset?)item.OccurredAt)));

        return new TrackingLearnerRow
        {
            UserId = learner.UserId,
            Username = learner.Username,
            FullName = learner.FullName,
            PhoneNumber = learner.PhoneNumber,
            Province = learner.Province,
            Group = learner.Group,
            Status = ResolveTrackingStatus(learner, courseProgress, lastActivity),
            LastActivityAt = lastActivity,
            Courses = courseProgress,
            Timeline = timeline
        };
    }

    private static IReadOnlyCollection<TrackingCourseSummary> BuildCourseSummaries(IReadOnlyCollection<TrackingLearnerRow> learners)
    {
        return learners
            .SelectMany(learner => learner.Courses)
            .GroupBy(course => new { course.CourseId, course.CourseTitle })
            .Select(grouping => new TrackingCourseSummary
            {
                CourseId = grouping.Key.CourseId,
                CourseTitle = grouping.Key.CourseTitle,
                EnrolledLearners = grouping.Count(),
                ActiveLearners = grouping.Count(item => item.OverallCompletionPercent > 0 && item.OverallCompletionPercent < 100),
                CompletedLearners = grouping.Count(item => item.OverallCompletionPercent >= 100),
                AverageCompletionPercent = grouping.Any()
                    ? (int)Math.Round(grouping.Average(item => item.OverallCompletionPercent))
                    : 0
            })
            .OrderByDescending(item => item.EnrolledLearners)
            .ThenByDescending(item => item.ActiveLearners)
            .ThenBy(item => item.CourseTitle)
            .ToArray();
    }

    private static IReadOnlyCollection<TrackingLessonSummary> BuildLessonSummaries(IReadOnlyCollection<TrackingLearnerRow> learners)
    {
        return learners
            .SelectMany(learner => learner.Courses.SelectMany(course => course.Lessons.Select(lesson => new
            {
                course.CourseTitle,
                Lesson = lesson
            })))
            .GroupBy(item => new
            {
                item.Lesson.LessonId,
                item.Lesson.Title,
                item.CourseTitle,
                item.Lesson.Type
            })
            .Select(grouping => new TrackingLessonSummary
            {
                LessonId = grouping.Key.LessonId,
                Title = grouping.Key.Title,
                CourseTitle = grouping.Key.CourseTitle,
                Type = grouping.Key.Type,
                StartedLearners = grouping.Count(item => IsLessonStarted(item.Lesson)),
                CompletedLearners = grouping.Count(item => item.Lesson.Status == LessonProgressStatus.Completed),
                DropOffLearners = grouping.Count(item => IsLessonDropOff(item.Lesson)),
                AverageProgressPercent = grouping.Any()
                    ? (int)Math.Round(grouping.Average(item => LessonProgressPercent(item.Lesson)))
                    : 0
            })
            .OrderByDescending(item => item.StartedLearners)
            .ThenByDescending(item => item.DropOffLearners)
            .ThenBy(item => item.Title)
            .ToArray();
    }

    private static IReadOnlyCollection<TrackingVideoSummary> BuildVideoSummaries(IReadOnlyCollection<TrackingLearnerRow> learners)
    {
        return learners
            .SelectMany(learner => learner.Courses.SelectMany(course => course.Lessons
                .Where(lesson => lesson.Type == LessonType.Video)
                .Select(lesson => new
                {
                    course.CourseTitle,
                    Lesson = lesson
                })))
            .GroupBy(item => new
            {
                item.Lesson.LessonId,
                item.Lesson.Title,
                item.CourseTitle
            })
            .Select(grouping =>
            {
                var started = grouping.Where(item => IsLessonStarted(item.Lesson)).ToArray();
                return new TrackingVideoSummary
                {
                    LessonId = grouping.Key.LessonId,
                    Title = grouping.Key.Title,
                    CourseTitle = grouping.Key.CourseTitle,
                    StartedLearners = started.Length,
                    CompletedLearners = grouping.Count(item => item.Lesson.Status == LessonProgressStatus.Completed),
                    DropOffLearners = grouping.Count(item => item.Lesson.WatchPercent > 0 && item.Lesson.WatchPercent < 90),
                    AverageWatchPercent = started.Length == 0
                        ? 0
                        : (int)Math.Round(started.Average(item => item.Lesson.WatchPercent)),
                    AverageStopPositionSeconds = started.Length == 0
                        ? 0
                        : (int)Math.Round(started.Average(item => item.Lesson.LastPositionSeconds))
                };
            })
            .OrderByDescending(item => item.StartedLearners)
            .ThenByDescending(item => item.DropOffLearners)
            .ThenBy(item => item.Title)
            .ToArray();
    }

    private static bool IsLessonStarted(TrackingLessonProgress lesson)
    {
        return lesson.Status != LessonProgressStatus.NotStarted ||
            lesson.WatchPercent > 0 ||
            lesson.WatchTimeMinutes > 0 ||
            lesson.InteractionAttempts > 0 ||
            lesson.QuizAttempts > 0 ||
            lesson.ScormAttempts > 0;
    }

    private static bool IsLessonDropOff(TrackingLessonProgress lesson)
    {
        if (lesson.Status == LessonProgressStatus.Completed)
        {
            return false;
        }

        return lesson.Type == LessonType.Video
            ? lesson.WatchPercent > 0 && lesson.WatchPercent < 90
            : IsLessonStarted(lesson);
    }

    private static int LessonProgressPercent(TrackingLessonProgress lesson)
    {
        if (lesson.Status == LessonProgressStatus.Completed)
        {
            return 100;
        }

        return lesson.Type == LessonType.Video
            ? lesson.WatchPercent
            : IsLessonStarted(lesson) ? 50 : 0;
    }

}
