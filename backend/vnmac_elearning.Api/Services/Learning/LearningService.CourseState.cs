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
    private IQueryable<Course> CourseGraphQuery()
    {
        return dbContext.Courses
            .Include(course => course.Quizzes)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.Assessment)
                        .ThenInclude(assessment => assessment!.Questions)
                            .ThenInclude(question => question.Options)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.Assessment)
                        .ThenInclude(assessment => assessment!.Questions)
                            .ThenInclude(question => question.HotspotTargets)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.Assessment)
                        .ThenInclude(assessment => assessment!.Questions)
                            .ThenInclude(question => question.DragItems)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.Assessment)
                        .ThenInclude(assessment => assessment!.Questions)
                            .ThenInclude(question => question.DragTargets)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.Assessment)
                        .ThenInclude(assessment => assessment!.Questions)
                            .ThenInclude(question => question.CorrectPairs)
            .Include(course => course.Sections)
                .ThenInclude(section => section.Lessons)
                    .ThenInclude(lesson => lesson.ScormPackage)
                        .ThenInclude(package => package!.Scos);
    }

    private User GetLearner(string userId)
    {
        var user = dbContext.Users.SingleOrDefault(item =>
            item.Id == userId &&
            item.Role == UserRole.Learner);

        return user ?? throw new ServiceException(ServiceErrors.LearningLearnerNotFound);
    }

    private void EnsureLearnerExists(string userId)
    {
        _ = GetLearner(userId);
    }

    private IReadOnlyCollection<Course> GetLearnerCoursesInternal(string userId)
    {
        var existingCourseIds = dbContext.CourseEnrollments
            .Where(item => item.UserId == userId)
            .Select(item => item.CourseId)
            .ToArray();

        return CourseGraphQuery()
            .Where(course => existingCourseIds.Contains(course.Id))
            .OrderBy(course => course.Title)
            .ToArray();
    }

    private Course GetLearnerCourseInternal(string userId, string courseId)
    {
        var course = GetCourseById(courseId);
        if (!dbContext.CourseEnrollments.Any(item => item.UserId == userId && item.CourseId == courseId))
        {
            throw new ServiceException(ServiceErrors.LearningCourseNotEnrolled);
        }

        return course;
    }

    private CourseEnrollment GetOrCreateEnrollmentInternal(string userId, Course course)
    {
        var enrollment = dbContext.CourseEnrollments.Local.SingleOrDefault(item =>
            item.UserId == userId &&
            item.CourseId == course.Id);

        enrollment ??= dbContext.CourseEnrollments.SingleOrDefault(item =>
            item.UserId == userId &&
            item.CourseId == course.Id);

        if (enrollment is null)
        {
            if (course.Status != CourseStatus.Published)
            {
                throw new ServiceException(ServiceErrors.LearningCourseNotEnrolled);
            }

            enrollment = new CourseEnrollment
            {
                UserId = userId,
                CourseId = course.Id,
                EnrolledAt = DateTimeOffset.UtcNow,
                StartedAt = null,
                CompletedAt = null,
                LastAccessedAt = null,
                Status = CourseEnrollmentStatus.Enrolled
            };
            dbContext.CourseEnrollments.Add(enrollment);
        }

        return enrollment;
    }

    private static IReadOnlyList<Lesson> GetOrderedLessonsInternal(Course course)
    {
        return course.Sections
            .OrderBy(section => section.Order)
            .SelectMany(section => section.Lessons
                .Where(lesson => lesson.PublicationStatus != LessonPublicationStatus.Archived)
                .OrderBy(lesson => lesson.Order))
            .ToArray();
    }

    private static IReadOnlyList<Lesson> GetVisibleLessons(Course course, IReadOnlyList<Lesson> orderedLessons)
    {
        if (course.Quizzes.Count == 0)
        {
            return orderedLessons;
        }

        var quizHostLessonIds = course.Quizzes
            .Select(item => item.AssessmentLessonId)
            .ToHashSet(StringComparer.Ordinal);

        return orderedLessons
            .Where(lesson => !quizHostLessonIds.Contains(lesson.Id))
            .ToArray();
    }

    private static IReadOnlyList<CourseQuiz> GetOrderedQuizzes(Course course)
    {
        var sectionOrderById = course.Sections.ToDictionary(item => item.Id, item => item.Order, StringComparer.Ordinal);
        var archivedLessonIds = course.Sections
            .SelectMany(item => item.Lessons)
            .Where(item => item.PublicationStatus == LessonPublicationStatus.Archived)
            .Select(item => item.Id)
            .ToHashSet(StringComparer.Ordinal);

        return course.Quizzes
            .Where(item => !archivedLessonIds.Contains(item.AssessmentLessonId))
            .OrderBy(item => item.SectionId is null ? 1 : 0)
            .ThenBy(item => item.SectionId is null
                ? int.MaxValue
                : sectionOrderById.GetValueOrDefault(item.SectionId, int.MaxValue))
            .ThenBy(item => item.Order)
            .ThenBy(item => item.Title)
            .ToArray();
    }

    private IReadOnlyCollection<Course> GetPublishedCoursesInternal()
    {
        return CourseGraphQuery()
            .Where(course => course.Status == CourseStatus.Published)
            .OrderBy(course => course.Title)
            .ToArray();
    }

    private Course GetPublishedCourseInternal()
    {
        return GetPublishedCoursesInternal()
            .FirstOrDefault()
            ?? throw new ServiceException(ServiceErrors.CoursesPublishedCourseNotFound);
    }

    private IReadOnlyList<Lesson> GetOrderedLessons(Course course)
    {
        return GetOrderedLessonsInternal(course);
    }

    private (Course Course, IReadOnlyList<Lesson> OrderedLessons, IReadOnlyList<Lesson> VisibleLessons, IReadOnlyList<CourseQuiz> OrderedQuizzes, CourseQuiz Quiz, Lesson AssessmentLesson) ResolveQuizContext(string quizId)
    {
        var quizCourseId = dbContext.CourseQuizzes
            .Where(item => item.Id == quizId)
            .Select(item => item.CourseId)
            .SingleOrDefault();

        if (string.IsNullOrWhiteSpace(quizCourseId))
        {
            throw new ServiceException(ServiceErrors.LearningQuizNotFound);
        }

        var course = GetCourseById(quizCourseId);
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        var quiz = GetQuizInternal(quizId, orderedQuizzes);
        var assessmentLesson = GetLessonInternal(quiz.AssessmentLessonId, orderedLessons);
        return (course, orderedLessons, visibleLessons, orderedQuizzes, quiz, assessmentLesson);
    }

    private (Course Course, IReadOnlyList<Lesson> Lessons, Lesson Lesson) ResolveLessonContext(string lessonId)
    {
        var lessonCourseId = dbContext.Lessons
            .Where(item => item.Id == lessonId)
            .Select(item => item.CourseId)
            .SingleOrDefault();

        if (string.IsNullOrWhiteSpace(lessonCourseId))
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotFound);
        }

        var course = GetCourseById(lessonCourseId);
        var orderedLessons = GetOrderedLessons(course);
        var lesson = GetLessonInternal(lessonId, orderedLessons);
        return (course, orderedLessons, lesson);
    }

    private Lesson GetLessonInternal(string lessonId, IReadOnlyList<Lesson> orderedLessons)
    {
        return orderedLessons.SingleOrDefault(lesson => string.Equals(lesson.Id, lessonId, StringComparison.Ordinal))
            ?? throw new ServiceException(ServiceErrors.LearningLessonNotFound);
    }

    private static CourseQuiz GetQuizInternal(string quizId, IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        return orderedQuizzes.SingleOrDefault(quiz => string.Equals(quiz.Id, quizId, StringComparison.Ordinal))
            ?? throw new ServiceException(ServiceErrors.LearningQuizNotFound);
    }

    private ProgressTracking GetOrCreateProgressInternal(string userId, string lessonId)
    {
        var progress = dbContext.ProgressTrackings.Local.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lessonId);

        progress ??= dbContext.ProgressTrackings.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lessonId);

        if (progress is not null)
        {
            return progress;
        }

        progress = new ProgressTracking
        {
            UserId = userId,
            LessonId = lessonId,
            Status = LessonProgressStatus.NotStarted,
            CompletionTime = null,
            CurrentStep = "intro",
            LastAccessedAt = null,
            WatchPercent = 0,
            WatchTimeMinutes = 0,
            InteractionAttempts = 0
        };

        dbContext.ProgressTrackings.Add(progress);
        return progress;
    }

    private QuizResult? GetOrCreateQuizResultInternal(string userId, string lessonId, IReadOnlyList<Lesson>? orderedLessons = null)
    {
        IReadOnlyList<Lesson> lessons;
        if (orderedLessons is null)
        {
            var (_, resolvedLessons, _) = ResolveLessonContext(lessonId);
            lessons = resolvedLessons;
        }
        else
        {
            lessons = orderedLessons;
        }

        var lesson = GetLessonInternal(lessonId, lessons);
        if (lesson.Type != LessonType.Quiz)
        {
            return null;
        }

        var result = dbContext.QuizResults.Local.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lessonId);

        result ??= dbContext.QuizResults.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lessonId);

        if (result is not null)
        {
            return result;
        }

        result = new QuizResult
        {
            UserId = userId,
            LessonId = lessonId,
            Score = 0,
            Attempts = 0,
            LastAttemptAt = null
        };

        dbContext.QuizResults.Add(result);
        return result;
    }

    private ScormRegistration GetOrCreateScormRegistrationInternal(string userId, Lesson lesson)
    {
        if (lesson.Type != LessonType.Scorm)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotScorm);
        }

        var registration = dbContext.ScormRegistrations.Local.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lesson.Id);

        registration ??= dbContext.ScormRegistrations.SingleOrDefault(item =>
            item.UserId == userId &&
            item.LessonId == lesson.Id);

        if (registration is not null)
        {
            return registration;
        }

        registration = new ScormRegistration
        {
            UserId = userId,
            LessonId = lesson.Id,
            AttemptCount = 0,
            CurrentScoId = lesson.ScormPackage?.LaunchScoId,
            CompletionStatus = ScormCompletionStatus.NotAttempted,
            SuccessStatus = ScormSuccessStatus.Unknown,
            ScoreRaw = null,
            ScoreMin = null,
            ScoreMax = null,
            TotalTimeSeconds = 0,
            Location = string.Empty,
            SuspendData = string.Empty
        };

        dbContext.ScormRegistrations.Add(registration);
        return registration;
    }

    private IReadOnlyCollection<LearnerLessonSummary> BuildLessonSummaries(string userId, IReadOnlyList<Lesson> visibleLessons)
    {
        return visibleLessons
            .Select(lesson =>
            {
                var progress = GetOrCreateProgressInternal(userId, lesson.Id);
                var scormRegistration = lesson.Type == LessonType.Scorm
                    ? GetOrCreateScormRegistrationInternal(userId, lesson)
                    : null;

                return new LearnerLessonSummary
                {
                    CourseId = lesson.CourseId,
                    SectionId = lesson.SectionId,
                    LessonId = lesson.Id,
                    Title = lesson.Title,
                    Type = lesson.Type,
                    Status = progress.Status,
                    IsUnlocked = IsLessonUnlockedInternal(userId, lesson.Id, visibleLessons),
                    CurrentStep = progress.CurrentStep,
                    LastAccessedAt = progress.LastAccessedAt,
                    WatchPercent = progress.WatchPercent,
                    WatchTimeMinutes = progress.WatchTimeMinutes,
                    InteractionAttempts = progress.InteractionAttempts,
                    QuizScore = 0,
                    QuizAttempts = 0,
                    ScormAttempts = scormRegistration?.AttemptCount ?? 0,
                    ScormScore = scormRegistration?.ScoreRaw,
                    ScormCompletionStatus = scormRegistration?.CompletionStatus,
                    ScormSuccessStatus = scormRegistration?.SuccessStatus
                };
            })
            .ToArray();
    }

    private IReadOnlyCollection<LearnerCourseQuizSummary> BuildQuizSummaries(
        string userId,
        Course course,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<Lesson> orderedLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        return orderedQuizzes
            .Select(quiz =>
            {
                var result = GetOrCreateQuizResultInternal(userId, quiz.AssessmentLessonId, orderedLessons)!;

                return new LearnerCourseQuizSummary
                {
                    QuizId = quiz.Id,
                    CourseId = quiz.CourseId,
                    SectionId = quiz.SectionId,
                    AssessmentLessonId = quiz.AssessmentLessonId,
                    Title = quiz.Title,
                    Description = quiz.Description,
                    Order = quiz.Order,
                    IsUnlocked = IsQuizUnlockedInternal(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes),
                    Passed = result.Score == 100,
                    Score = result.Score,
                    Attempts = result.Attempts
                };
            })
            .ToArray();
    }

    private LearnerEnrollmentSummary BuildEnrollmentSummary(string userId, Course course)
    {
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        EnsureCertificateIssuedInternal(userId, course);

        var certificate = dbContext.Certificates.SingleOrDefault(item => item.UserId == userId && item.CourseId == course.Id);
        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        var hasCertificate = certificate is not null;
        if (certificate is not null && enrollment.Status != CourseEnrollmentStatus.Completed)
        {
            enrollment.Status = CourseEnrollmentStatus.Completed;
            enrollment.StartedAt ??= certificate.IssuedDate;
            enrollment.CompletedAt ??= certificate.IssuedDate;
            enrollment.LastAccessedAt ??= certificate.IssuedDate;
            dbContext.SaveChanges();
        }

        var completedLessons = visibleLessons.Count(lesson => GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
        var passedQuizzes = orderedQuizzes.Count(quiz => HasPassedQuizInternal(userId, quiz, orderedLessons));

        return new LearnerEnrollmentSummary
        {
            CourseId = course.Id,
            Title = course.Title,
            Description = course.Description,
            Status = course.Status,
            EnrollmentStatus = enrollment.Status,
            EnrolledAt = enrollment.EnrolledAt,
            StartedAt = enrollment.StartedAt,
            CompletedAt = enrollment.CompletedAt,
            LastAccessedAt = enrollment.LastAccessedAt,
            ContentCompletionPercent = hasCertificate ? 100 : CalculateContentCompletionPercentInternal(userId, visibleLessons),
            QuizCompletionPercent = hasCertificate ? 100 : CalculateQuizCompletionPercentInternal(userId, orderedQuizzes, orderedLessons),
            OverallCompletionPercent = hasCertificate ? 100 : CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons),
            QuizUnlocked = IsAnyQuizUnlockedInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            CertificateIssued = hasCertificate,
            CertificateId = certificate?.CertificateId,
            NextLessonId = hasCertificate ? null : GetNextLessonIdInternal(userId, visibleLessons),
            NextQuizId = hasCertificate ? null : GetNextQuizIdInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            TotalLessons = visibleLessons.Count,
            CompletedLessons = hasCertificate ? visibleLessons.Count : completedLessons,
            TotalQuizzes = orderedQuizzes.Count,
            PassedQuizzes = hasCertificate ? orderedQuizzes.Count : passedQuizzes
        };
    }

    private bool IsLessonUnlockedInternal(string userId, string lessonId, IReadOnlyList<Lesson> visibleLessons)
    {
        var lesson = GetLessonInternal(lessonId, visibleLessons);
        var contentLessonIndex = visibleLessons.Select((item, index) => new { item, index })
            .Single(item => item.item.Id == lessonId)
            .index;

        if (contentLessonIndex <= 0)
        {
            return true;
        }

        var previousContentLessonId = visibleLessons[contentLessonIndex - 1].Id;
        return GetOrCreateProgressInternal(userId, previousContentLessonId).Status == LessonProgressStatus.Completed;
    }

    private void EnsureLessonUnlocked(string userId, string lessonId, IReadOnlyList<Lesson> visibleLessons)
    {
        if (!IsLessonUnlockedInternal(userId, lessonId, visibleLessons))
        {
            throw new ServiceException(ServiceErrors.LearningLessonLocked);
        }
    }

    private bool AreAllContentLessonsCompletedInternal(string userId, IReadOnlyList<Lesson> visibleLessons)
    {
        return visibleLessons.Count == 0 || visibleLessons.All(lesson => GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
    }

    private int CalculateContentCompletionPercentInternal(string userId, IReadOnlyList<Lesson> visibleLessons)
    {
        var completed = visibleLessons.Count(lesson => GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
        return visibleLessons.Count == 0 ? 100 : (int)Math.Round((double)completed / visibleLessons.Count * 100);
    }

    private int CalculateQuizCompletionPercentInternal(string userId, IReadOnlyList<CourseQuiz> orderedQuizzes, IReadOnlyList<Lesson> orderedLessons)
    {
        var passed = orderedQuizzes.Count(quiz => HasPassedQuizInternal(userId, quiz, orderedLessons));
        return orderedQuizzes.Count == 0 ? 100 : (int)Math.Round((double)passed / orderedQuizzes.Count * 100);
    }

    private int CalculateOverallCompletionPercentInternal(
        string userId,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes,
        IReadOnlyList<Lesson> orderedLessons)
    {
        var completedLessons = visibleLessons.Count(lesson => GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
        var passedQuizzes = orderedQuizzes.Count(quiz => HasPassedQuizInternal(userId, quiz, orderedLessons));
        var totalUnits = visibleLessons.Count + orderedQuizzes.Count;
        return totalUnits == 0 ? 0 : (int)Math.Round((double)(completedLessons + passedQuizzes) / totalUnits * 100);
    }

    private bool HasStartedCourseInternal(
        string userId,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes,
        IReadOnlyList<Lesson> orderedLessons)
    {
        if (visibleLessons.Any(lesson =>
        {
            var progress = GetOrCreateProgressInternal(userId, lesson.Id);
            if (progress.Status != LessonProgressStatus.NotStarted || progress.WatchPercent > 0 || progress.WatchTimeMinutes > 0 || progress.InteractionAttempts > 0)
            {
                return true;
            }

            if (lesson.Type == LessonType.Scorm)
            {
                var registration = GetOrCreateScormRegistrationInternal(userId, lesson);
                return registration.AttemptCount > 0 || registration.TotalTimeSeconds > 0;
            }

            return false;
        }))
        {
            return true;
        }

        return orderedQuizzes.Any(quiz =>
        {
            var quizResult = GetOrCreateQuizResultInternal(userId, quiz.AssessmentLessonId, orderedLessons);
            return quizResult is not null && (quizResult.Attempts > 0 || quizResult.Score > 0);
        });
    }

    private bool HasPassedQuizInternal(string userId, CourseQuiz quiz, IReadOnlyList<Lesson> orderedLessons)
    {
        return GetOrCreateQuizResultInternal(userId, quiz.AssessmentLessonId, orderedLessons)?.Score == 100;
    }

    private bool HasCompletedQuizScopeInternal(string userId, CourseQuiz quiz, IReadOnlyList<Lesson> visibleLessons)
    {
        var scopedLessons = string.IsNullOrWhiteSpace(quiz.SectionId)
            ? visibleLessons
            : visibleLessons.Where(lesson => string.Equals(lesson.SectionId, quiz.SectionId, StringComparison.Ordinal)).ToArray();

        // A quiz-only section (for example the final assessment section) has no
        // content lessons of its own. In that case its scope is the whole course,
        // not an empty set that would incorrectly unlock the quiz immediately.
        var requiredLessons = scopedLessons.Count == 0 ? visibleLessons : scopedLessons;
        return requiredLessons.Count == 0 ||
            requiredLessons.All(lesson =>
                GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
    }

    private bool IsQuizUnlockedInternal(
        string userId,
        Course course,
        CourseQuiz quiz,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<Lesson> orderedLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        if (!HasCompletedQuizScopeInternal(userId, quiz, visibleLessons))
        {
            return false;
        }

        var scopedQuizzes = orderedQuizzes
            .Where(item => string.Equals(item.SectionId, quiz.SectionId, StringComparison.Ordinal))
            .ToArray();
        var quizIndex = Array.FindIndex(scopedQuizzes, item => string.Equals(item.Id, quiz.Id, StringComparison.Ordinal));

        if (quizIndex <= 0)
        {
            return true;
        }

        return HasPassedQuizInternal(userId, scopedQuizzes[quizIndex - 1], orderedLessons);
    }

    private bool IsAnyQuizUnlockedInternal(
        string userId,
        Course course,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<Lesson> orderedLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        return orderedQuizzes.Count == 0 || orderedQuizzes.Any(quiz => IsQuizUnlockedInternal(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes));
    }

    private void EnsureQuizUnlocked(
        string userId,
        Course course,
        CourseQuiz quiz,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<Lesson> orderedLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        if (!IsQuizUnlockedInternal(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes))
        {
            throw new ServiceException(ServiceErrors.LearningQuizLocked);
        }
    }

    private void UpdateEnrollmentStateInternal(
        string userId,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes,
        IReadOnlyList<Lesson> orderedLessons,
        CourseEnrollment enrollment)
    {
        var started = HasStartedCourseInternal(userId, visibleLessons, orderedQuizzes, orderedLessons);
        var completed = AreAllContentLessonsCompletedInternal(userId, visibleLessons) &&
            HasPassedAllCourseQuizzesInternal(userId, orderedQuizzes, orderedLessons);

        if (started && !enrollment.StartedAt.HasValue)
        {
            enrollment.StartedAt = DateTimeOffset.UtcNow;
        }

        if (completed)
        {
            enrollment.Status = CourseEnrollmentStatus.Completed;
            enrollment.CompletedAt ??= DateTimeOffset.UtcNow;
        }
        else if (started)
        {
            enrollment.Status = CourseEnrollmentStatus.InProgress;
            enrollment.CompletedAt = null;
        }
        else
        {
            enrollment.Status = CourseEnrollmentStatus.Enrolled;
            enrollment.CompletedAt = null;
        }

        if (enrollment.LastAccessedAt is null && started)
        {
            enrollment.LastAccessedAt = enrollment.StartedAt;
        }
    }

    private void TouchEnrollmentInternal(CourseEnrollment enrollment, DateTimeOffset? timestamp = null)
    {
        enrollment.LastAccessedAt = timestamp ?? DateTimeOffset.UtcNow;
    }

    private int CalculateStudyTimeMinutesInternal(string userId)
    {
        var lessonProgress = dbContext.ProgressTrackings
            .Where(item => item.UserId == userId)
            .Select(item => new
            {
                item.ActiveStudySeconds,
                item.WatchTimeMinutes,
                item.InteractionAttempts
            })
            .ToArray();

        var trackedStudySeconds = lessonProgress.Sum(item => item.ActiveStudySeconds);
        // Preserve meaningful values for records created before active-time
        // tracking existed, without double-counting newly tracked lessons.
        var legacyMinutes = lessonProgress
            .Where(item => item.ActiveStudySeconds == 0)
            .Sum(item => item.WatchTimeMinutes + (item.InteractionAttempts * 2));

        var quizMinutes = dbContext.QuizResults
            .Where(item => item.UserId == userId)
            .Sum(item => item.Attempts * 2);

        var scormMinutes = dbContext.ScormRegistrations
            .Where(item => item.UserId == userId)
            .AsEnumerable()
            .Sum(item => (int)Math.Round(item.TotalTimeSeconds / 60d, MidpointRounding.AwayFromZero));

        var activeMinutes = trackedStudySeconds == 0
            ? 0
            : (int)Math.Ceiling(trackedStudySeconds / 60d);

        return activeMinutes + legacyMinutes + quizMinutes + scormMinutes;
    }

    private static string NormalizeLessonStep(string? value)
    {
        var step = string.IsNullOrWhiteSpace(value) ? "intro" : value.Trim();
        return LessonStepKeys.Contains(step) ? step.ToLowerInvariant() : "intro";
    }

    private string? GetNextLessonIdInternal(string userId, IReadOnlyList<Lesson> visibleLessons)
    {
        return visibleLessons
            .FirstOrDefault(lesson =>
                IsLessonUnlockedInternal(userId, lesson.Id, visibleLessons) &&
                GetOrCreateProgressInternal(userId, lesson.Id).Status != LessonProgressStatus.Completed)
            ?.Id;
    }

    private string? GetNextQuizIdInternal(
        string userId,
        Course course,
        IReadOnlyList<Lesson> visibleLessons,
        IReadOnlyList<Lesson> orderedLessons,
        IReadOnlyList<CourseQuiz> orderedQuizzes)
    {
        return orderedQuizzes
            .FirstOrDefault(quiz =>
                IsQuizUnlockedInternal(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes) &&
                !HasPassedQuizInternal(userId, quiz, orderedLessons))
            ?.Id;
    }

    private bool HasPassedAllCourseQuizzesInternal(string userId, IReadOnlyList<CourseQuiz> orderedQuizzes, IReadOnlyList<Lesson> orderedLessons)
    {
        return orderedQuizzes.Count == 0 || orderedQuizzes.All(quiz => HasPassedQuizInternal(userId, quiz, orderedLessons));
    }

    private void EnsureCertificateIssuedInternal(string userId, Course course)
    {
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        var allContentCompleted = AreAllContentLessonsCompletedInternal(userId, visibleLessons);
        var allQuizzesPassed = HasPassedAllCourseQuizzesInternal(userId, orderedQuizzes, orderedLessons);

        var enrollment = GetOrCreateEnrollmentInternal(userId, course);
        UpdateEnrollmentStateInternal(userId, visibleLessons, orderedQuizzes, orderedLessons, enrollment);

        if (!allContentCompleted || !allQuizzesPassed)
        {
            return;
        }

        var existingCertificate = dbContext.Certificates.SingleOrDefault(item =>
            item.UserId == userId &&
            item.CourseId == course.Id);
        if (existingCertificate is not null)
        {
            return;
        }

        var learner = GetLearner(userId);
        var certificateId = $"CERT-{learner.PhoneNumber[^4..]}-{DateTimeOffset.UtcNow:yyyyMMdd}-{course.Id[^4..]}";

        dbContext.Certificates.Add(new Certificate
        {
            UserId = userId,
            CourseId = course.Id,
            CertificateId = certificateId,
            IssuedDate = DateTimeOffset.UtcNow,
            QrCode = $"verify:{userId}:{course.Id}:{certificateId}"
        });
        notificationService.NotifyCourseCompleted(learner, course);
        auditLogService.Track(
            userId,
            "certificate",
            "issue",
            nameof(Certificate),
            certificateId,
            $"Cap chung chi {course.Title}",
            new { course.Id, course.Title, certificateId });
    }

    private ScormLaunchResponse BuildScormLaunchResponse(
        ScormPackage package,
        ScormSco sco,
        string sessionId,
        ScormRegistration registration)
    {
        return new ScormLaunchResponse
        {
            LessonId = package.LessonId,
            PackageId = package.Id,
            PackageTitle = package.Title,
            Version = package.Version,
            SessionId = sessionId,
            ScoId = sco.Id,
            ScoTitle = sco.Title,
            LaunchContentUrl = $"/{NormalizeUrlPath(sco.LaunchPath)}",
            PlayerUrl = $"/api/scorm/player/{sessionId}",
            Registration = MapScormRegistrationSnapshot(registration)
        };
    }

    private ScormRegistrationSnapshot MapScormRegistrationSnapshot(ScormRegistration registration)
    {
        return new ScormRegistrationSnapshot
        {
            UserId = registration.UserId,
            LessonId = registration.LessonId,
            AttemptCount = registration.AttemptCount,
            CurrentScoId = registration.CurrentScoId,
            CompletionStatus = registration.CompletionStatus,
            SuccessStatus = registration.SuccessStatus,
            ScoreRaw = registration.ScoreRaw,
            ScoreMin = registration.ScoreMin,
            ScoreMax = registration.ScoreMax,
            TotalTimeSeconds = registration.TotalTimeSeconds,
            Location = registration.Location,
            HasSuspendData = !string.IsNullOrWhiteSpace(registration.SuspendData),
            LastLaunchedAt = registration.LastLaunchedAt,
            LastCommittedAt = registration.LastCommittedAt,
            CompletedAt = registration.CompletedAt
        };
    }

}
