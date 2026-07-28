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
    public IReadOnlyCollection<Course> GetPublishedCourses()
    {
        return GetPublishedCoursesInternal();
    }

    public Course GetPublishedCourse()
    {
        return GetPublishedCourseInternal();
    }

    public Course GetCourseById(string courseId)
    {
        return CourseGraphQuery()
            .SingleOrDefault(course => course.Id == courseId)
            ?? throw new ServiceException(ServiceErrors.CoursesCourseNotFound);
    }

    public LearnerCourseCatalogResponse GetCatalog(string userId)
    {
        _ = GetLearner(userId);
        var enrollmentCourseIds = dbContext.CourseEnrollments
            .Where(item => item.UserId == userId)
            .Select(item => item.CourseId)
            .ToHashSet(StringComparer.Ordinal);

        var courses = GetPublishedCoursesInternal()
            .Select(course =>
            {
                var isEnrolled = enrollmentCourseIds.Contains(course.Id);
                return new LearnerCourseCatalogItem
                {
                    CourseId = course.Id,
                    Title = course.Title,
                    Description = course.Description,
                    Status = course.Status,
                    TotalSections = course.Sections.Count,
                    TotalLessons = GetVisibleLessons(course, GetOrderedLessons(course)).Count,
                    TotalQuizzes = GetOrderedQuizzes(course).Count,
                    EstimatedStudyTimeMinutes = GetVisibleLessons(course, GetOrderedLessons(course)).Sum(item => item.DurationMinutes)
                        + GetOrderedQuizzes(course)
                            .Select(quiz =>
                            {
                                var lesson = course.Sections
                                    .SelectMany(section => section.Lessons)
                                    .SingleOrDefault(candidate => candidate.Id == quiz.AssessmentLessonId);
                                return lesson?.DurationMinutes ?? 0;
                            })
                            .Sum(),
                    IsEnrolled = isEnrolled,
                    Enrollment = isEnrolled ? BuildEnrollmentSummary(userId, course) : null
                };
            })
            .OrderBy(item => item.Title)
            .ToArray();

        SaveChangesIfNeeded();

        return new LearnerCourseCatalogResponse
        {
            UserId = userId,
            Courses = courses
        };
    }

    public LearnerDashboardResponse GetDashboard(string userId)
    {
        var learner = GetLearner(userId);
        var courses = GetLearnerCoursesInternal(userId)
            .Select(course => BuildEnrollmentSummary(userId, course))
            .OrderByDescending(course => course.LastAccessedAt ?? course.EnrolledAt)
            .ThenBy(course => course.Title)
            .ToArray();

        SaveChangesIfNeeded();

        return new LearnerDashboardResponse
        {
            User = learner,
            TotalEnrolledCourses = courses.Length,
            TotalCompletedCourses = courses.Count(course => course.EnrollmentStatus == CourseEnrollmentStatus.Completed),
            TotalCertificates = courses.Count(course => course.CertificateIssued),
            TotalStudyTimeMinutes = CalculateStudyTimeMinutesInternal(userId),
            Courses = courses
        };
    }

    public LearnerEnrollmentSummary EnrollCourse(string userId, string courseId)
    {
        _ = GetLearner(userId);
        var course = GetCourseById(courseId);
        if (course.Status != CourseStatus.Published)
        {
            throw new ServiceException(ServiceErrors.CoursesCourseNotFound);
        }

        var learner = GetLearner(userId);
        var alreadyEnrolled = dbContext.CourseEnrollments.Any(item => item.UserId == userId && item.CourseId == courseId);
        _ = GetOrCreateEnrollmentInternal(userId, course);
        if (!alreadyEnrolled)
        {
            notificationService.NotifyCourseEnrolled(learner, course);
            auditLogService.Track(
                userId,
                "learning",
                "enroll",
                nameof(Course),
                course.Id,
                $"Dang ky khoa hoc {course.Title}",
                new { course.Id, course.Title });
        }
        SaveChangesIfNeeded();
        return BuildEnrollmentSummary(userId, course);
    }

    public ProgressSnapshotResponse GetCourseProgress(string userId, string courseId)
    {
        var course = GetLearnerCourseInternal(userId, courseId);
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);

        var progress = visibleLessons.Select(lesson => GetOrCreateProgressInternal(userId, lesson.Id)).ToArray();
        var quizResults = orderedQuizzes
            .Select(quiz => GetOrCreateQuizResultInternal(userId, quiz.AssessmentLessonId, orderedLessons)!)
            .ToArray();
        var scormRegistrations = visibleLessons
            .Where(lesson => lesson.Type == LessonType.Scorm)
            .Select(lesson => GetOrCreateScormRegistrationInternal(userId, lesson))
            .ToArray();

        SaveChangesIfNeeded();

        return new ProgressSnapshotResponse
        {
            UserId = userId,
            CourseId = courseId,
            NextLessonId = GetNextLessonIdInternal(userId, visibleLessons),
            NextQuizId = GetNextQuizIdInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            ContentCompletionPercent = CalculateContentCompletionPercentInternal(userId, visibleLessons),
            QuizCompletionPercent = CalculateQuizCompletionPercentInternal(userId, orderedQuizzes, orderedLessons),
            OverallCompletionPercent = CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons),
            QuizUnlocked = IsAnyQuizUnlockedInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            CertificateIssued = dbContext.Certificates.Any(item => item.UserId == userId && item.CourseId == courseId),
            Lessons = BuildLessonSummaries(userId, visibleLessons),
            Quizzes = BuildQuizSummaries(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            Progress = progress,
            QuizResults = quizResults,
            ScormRegistrations = scormRegistrations
        };
    }

    public LearningResultsResponse GetLearningResults(string userId, string courseId)
    {
        var course = GetLearnerCourseInternal(userId, courseId);
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        var lessonStates = visibleLessons
            .Select(lesson => new
            {
                Lesson = lesson,
                Progress = GetOrCreateProgressInternal(userId, lesson.Id),
                IsUnlocked = IsLessonUnlockedInternal(userId, lesson.Id, visibleLessons)
            })
            .ToArray();
        var lessonSummaries = BuildLessonSummaries(userId, visibleLessons).ToArray();
        var quizSummaries = BuildQuizSummaries(userId, course, visibleLessons, orderedLessons, orderedQuizzes).ToArray();
        var currentLessonState = lessonStates
            .Where(item => item.IsUnlocked && item.Progress.Status == LessonProgressStatus.InProgress)
            .OrderBy(item => item.Lesson.Order)
            .FirstOrDefault()
            ?? lessonStates
                .Where(item => item.IsUnlocked && item.Progress.Status == LessonProgressStatus.NotStarted)
                .OrderBy(item => item.Lesson.Order)
                .FirstOrDefault();
        var nextLessonId = GetNextLessonIdInternal(userId, visibleLessons);
        var nextLesson = nextLessonId is null ? null : visibleLessons.SingleOrDefault(lesson => lesson.Id == nextLessonId);
        var nextQuizId = GetNextQuizIdInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes);
        var nextQuiz = nextQuizId is null ? null : orderedQuizzes.SingleOrDefault(quiz => quiz.Id == nextQuizId);
        var latestQuizResult = orderedQuizzes
            .Select(quiz => GetOrCreateQuizResultInternal(userId, quiz.AssessmentLessonId, orderedLessons))
            .Where(result => result is not null && result.Attempts > 0)
            .OrderByDescending(result => result!.LastAttemptAt ?? DateTimeOffset.MinValue)
            .FirstOrDefault();

        SaveChangesIfNeeded();

        return new LearningResultsResponse
        {
            UserId = userId,
            CourseId = course.Id,
            CourseTitle = course.Title,
            EnrollmentStatus = enrollment.Status,
            ContentCompletionPercent = CalculateContentCompletionPercentInternal(userId, visibleLessons),
            QuizCompletionPercent = CalculateQuizCompletionPercentInternal(userId, orderedQuizzes, orderedLessons),
            OverallCompletionPercent = CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons),
            TotalLessons = visibleLessons.Count,
            CompletedLessons = lessonSummaries.Count(lesson => lesson.Status == LessonProgressStatus.Completed),
            InProgressLessons = lessonSummaries.Count(lesson => lesson.Status == LessonProgressStatus.InProgress),
            LockedLessons = lessonSummaries.Count(lesson => !lesson.IsUnlocked),
            TotalQuizzes = orderedQuizzes.Count,
            PassedQuizzes = quizSummaries.Count(quiz => quiz.Passed),
            StudyTimeMinutes = CalculateStudyTimeMinutesInternal(userId),
            CurrentLessonId = currentLessonState?.Lesson.Id ?? nextLesson?.Id,
            CurrentLessonTitle = currentLessonState?.Lesson.Title ?? nextLesson?.Title,
            CurrentStep = currentLessonState?.Progress.CurrentStep ?? "intro",
            NextLessonId = nextLesson?.Id,
            NextLessonTitle = nextLesson?.Title,
            NextQuizId = nextQuiz?.Id,
            NextQuizTitle = nextQuiz?.Title,
            LatestQuizScore = latestQuizResult?.Score ?? 0,
            LatestQuizAttempts = latestQuizResult?.Attempts ?? 0,
            CertificateIssued = dbContext.Certificates.Any(item => item.UserId == userId && item.CourseId == course.Id)
        };
    }

}
