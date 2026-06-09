using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class LearningService(TrainingDbContext dbContext)
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

        _ = GetOrCreateEnrollmentInternal(userId, course);
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

    public ProgressTracking UpdateVideoProgress(string userId, string lessonId, UpdateVideoProgressRequest request)
    {
        var (course, orderedLessons, lesson) = ResolveLessonContext(lessonId);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        EnsureLearnerExists(userId);

        if (lesson.Type != LessonType.Video)
        {
            throw new ServiceException(ServiceErrors.LearningLessonNotVideo);
        }

        EnsureLessonUnlocked(userId, lessonId, visibleLessons);

        var progress = GetOrCreateProgressInternal(userId, lessonId);
        progress.WatchPercent = Math.Clamp(Math.Max(progress.WatchPercent, request.WatchPercent), 0, 100);
        progress.WatchTimeMinutes = Math.Clamp(
            Math.Max(progress.WatchTimeMinutes, request.WatchTimeMinutes),
            0,
            lesson.DurationMinutes);
        progress.Status = progress.WatchPercent >= 100
            ? LessonProgressStatus.Completed
            : LessonProgressStatus.InProgress;
        progress.CompletionTime = progress.Status == LessonProgressStatus.Completed
            ? DateTimeOffset.UtcNow
            : null;

        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
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
        progress.Status = passed ? LessonProgressStatus.Completed : LessonProgressStatus.InProgress;
        progress.CompletionTime = passed ? DateTimeOffset.UtcNow : null;

        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
        SaveChangesIfNeeded();

        return new InteractiveAttemptResponse
        {
            Passed = passed,
            AttemptNumber = attemptNumber,
            Results = results,
            Progress = progress
        };
    }

    public QuizSessionResponse CreateQuizSession(string userId, string quizId)
    {
        var (course, orderedLessons, visibleLessons, orderedQuizzes, quiz, assessmentLesson) = ResolveQuizContext(quizId);
        EnsureLearnerExists(userId);

        if (assessmentLesson.Type != LessonType.Quiz || assessmentLesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.LearningQuizNotFound);
        }

        EnsureQuizUnlocked(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes);
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));

        return new QuizSessionResponse
        {
            QuizId = quizId,
            AssessmentLessonId = assessmentLesson.Id,
            Title = quiz.Title,
            Intro = assessmentLesson.Assessment.Intro,
            PassScore = assessmentLesson.Assessment.PassScore,
            Questions = MapLearnerQuestions(assessmentLesson.Assessment, includeAllQuestions: true)
        };
    }

    public QuizAttemptResponse SubmitQuizAttempt(string userId, string quizId, QuizAttemptRequest request)
    {
        var (course, orderedLessons, visibleLessons, orderedQuizzes, quiz, assessmentLesson) = ResolveQuizContext(quizId);
        EnsureLearnerExists(userId);

        if (assessmentLesson.Type != LessonType.Quiz || assessmentLesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.LearningQuizNotFound);
        }

        EnsureQuizUnlocked(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes);

        var results = EvaluateAssessment(assessmentLesson.Assessment, request.Answers);
        var wrongQuestionIds = results.Where(item => !item.Correct).Select(item => item.TaskId).ToArray();
        var score = CalculateScore(results);
        var assessmentLessonId = assessmentLesson.Id;
        var attemptNumber = dbContext.QuizAttempts.Count(item => item.UserId == userId && item.LessonId == assessmentLessonId) + 1;

        dbContext.QuizAttempts.Add(new QuizAttempt
        {
            UserId = userId,
            LessonId = assessmentLessonId,
            AttemptNumber = attemptNumber,
            Score = score,
            WrongQuestions = wrongQuestionIds
                .Select(questionId => new QuizAttemptWrongQuestion
                {
                    UserId = userId,
                    LessonId = assessmentLessonId,
                    AttemptNumber = attemptNumber,
                    QuestionId = questionId
                })
                .ToList(),
            AttemptedAt = DateTimeOffset.UtcNow
        });

        var result = GetOrCreateQuizResultInternal(userId, assessmentLessonId, orderedLessons)!;
        result.Score = score;
        result.Attempts = attemptNumber;
        result.LastAttemptAt = DateTimeOffset.UtcNow;

        var progress = GetOrCreateProgressInternal(userId, assessmentLessonId);
        progress.Status = score >= assessmentLesson.Assessment.PassScore
            ? LessonProgressStatus.Completed
            : LessonProgressStatus.InProgress;
        progress.CompletionTime = progress.Status == LessonProgressStatus.Completed
            ? DateTimeOffset.UtcNow
            : null;

        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
        SaveChangesIfNeeded();

        return new QuizAttemptResponse
        {
            QuizId = quizId,
            Passed = score >= assessmentLesson.Assessment.PassScore,
            Score = score,
            AttemptNumber = attemptNumber,
            WrongQuestionIds = wrongQuestionIds,
            Result = result
        };
    }

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

    public LearnerCertificatesResponse GetCertificates(string userId)
    {
        _ = GetLearner(userId);
        var certificates = GetLearnerCoursesInternal(userId)
            .Select(course => GetCertificate(userId, course.Id))
            .OrderBy(item => item.CourseTitle)
            .ToArray();
        SaveChangesIfNeeded();

        return new LearnerCertificatesResponse
        {
            UserId = userId,
            Certificates = certificates
        };
    }

    public CertificateResponse GetCertificate(string userId, string courseId)
    {
        var course = GetLearnerCourseInternal(userId, courseId);
        var orderedLessons = GetOrderedLessons(course);
        var visibleLessons = GetVisibleLessons(course, orderedLessons);
        var orderedQuizzes = GetOrderedQuizzes(course);
        EnsureLearnerExists(userId);
        EnsureCertificateIssuedInternal(userId, course);
        SaveChangesIfNeeded();

        var certificate = dbContext.Certificates.SingleOrDefault(item => item.UserId == userId && item.CourseId == courseId);
        if (certificate is not null)
        {
            return new CertificateResponse
            {
                UserId = userId,
                CourseId = courseId,
                CourseTitle = course.Title,
                IsEligible = true,
                OutstandingRequirements = [],
                Certificate = certificate
            };
        }

        var outstanding = new List<string>();
        if (CalculateContentCompletionPercentInternal(userId, visibleLessons) < 100)
        {
            outstanding.Add("Hoàn thành 100% nội dung khóa học.");
        }

        if (!HasPassedAllCourseQuizzesInternal(userId, orderedQuizzes, orderedLessons))
        {
            outstanding.Add("Đạt 100% bài quiz của khóa học.");
        }

        SaveChangesIfNeeded();

        return new CertificateResponse
        {
            UserId = userId,
            CourseId = courseId,
            CourseTitle = course.Title,
            IsEligible = false,
            OutstandingRequirements = outstanding,
            Certificate = null
        };
    }

    public CertificateVerificationResponse VerifyCertificate(string certificateId)
    {
        var certificate = dbContext.Certificates.SingleOrDefault(item =>
            item.CertificateId == certificateId);

        if (certificate is null)
        {
            return new CertificateVerificationResponse
            {
                IsValid = false,
                Message = "Khong tim thay chung nhan."
            };
        }

        var learner = dbContext.Users.Single(user => user.Id == certificate.UserId);
        return new CertificateVerificationResponse
        {
            IsValid = true,
            Message = "Chung nhan hop le.",
            LearnerName = learner.FullName,
            CourseId = certificate.CourseId,
            CourseTitle = dbContext.Courses.Single(course => course.Id == certificate.CourseId).Title,
            CertificateId = certificate.CertificateId,
            IssuedDate = certificate.IssuedDate
        };
    }

    public int CalculateCompletionPercent(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course =>
            {
                var orderedLessons = GetOrderedLessons(course);
                var visibleLessons = GetVisibleLessons(course, orderedLessons);
                var orderedQuizzes = GetOrderedQuizzes(course);
                return CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons);
            })
            .DefaultIfEmpty(0)
            .Max();
        SaveChangesIfNeeded();
        return result;
    }

    public int CalculateStudyTimeMinutes(string userId)
    {
        return CalculateStudyTimeMinutesInternal(userId);
    }

    public bool HasPassedAllQuizzes(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course =>
            {
                var orderedLessons = GetOrderedLessons(course);
                return HasPassedAllCourseQuizzesInternal(userId, GetOrderedQuizzes(course), orderedLessons);
            })
            .DefaultIfEmpty(false)
            .Any(value => value);

        SaveChangesIfNeeded();
        return result;
    }

    public string GetStalledLessonId(string userId)
    {
        var result = GetLearnerCoursesInternal(userId)
            .Select(course => GetNextLessonIdInternal(userId, GetVisibleLessons(course, GetOrderedLessons(course))))
            .FirstOrDefault(lessonId => !string.IsNullOrWhiteSpace(lessonId))
            ?? string.Empty;
        SaveChangesIfNeeded();
        return result;
    }

    public IReadOnlyCollection<LearnerEnrollmentSummary> GetEnrollmentSummaries(string userId)
    {
        _ = GetLearner(userId);
        var courses = GetLearnerCoursesInternal(userId)
            .Select(course => BuildEnrollmentSummary(userId, course))
            .OrderByDescending(course => course.LastAccessedAt ?? course.EnrolledAt)
            .ThenBy(course => course.Title)
            .ToArray();
        SaveChangesIfNeeded();
        return courses;
    }

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
            .SelectMany(section => section.Lessons.OrderBy(lesson => lesson.Order))
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

        return course.Quizzes
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
            ContentCompletionPercent = CalculateContentCompletionPercentInternal(userId, visibleLessons),
            QuizCompletionPercent = CalculateQuizCompletionPercentInternal(userId, orderedQuizzes, orderedLessons),
            OverallCompletionPercent = CalculateOverallCompletionPercentInternal(userId, visibleLessons, orderedQuizzes, orderedLessons),
            QuizUnlocked = IsAnyQuizUnlockedInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            CertificateIssued = certificate is not null,
            CertificateId = certificate?.CertificateId,
            NextLessonId = GetNextLessonIdInternal(userId, visibleLessons),
            NextQuizId = GetNextQuizIdInternal(userId, course, visibleLessons, orderedLessons, orderedQuizzes),
            TotalLessons = visibleLessons.Count,
            CompletedLessons = completedLessons,
            TotalQuizzes = orderedQuizzes.Count,
            PassedQuizzes = passedQuizzes
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

        return scopedLessons.Count == 0 || scopedLessons.All(lesson => GetOrCreateProgressInternal(userId, lesson.Id).Status == LessonProgressStatus.Completed);
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
        var watchMinutes = dbContext.ProgressTrackings
            .Where(item => item.UserId == userId)
            .Sum(item => item.WatchTimeMinutes + (item.InteractionAttempts * 2));

        var quizMinutes = dbContext.QuizResults
            .Where(item => item.UserId == userId)
            .Sum(item => item.Attempts * 2);

        var scormMinutes = dbContext.ScormRegistrations
            .Where(item => item.UserId == userId)
            .AsEnumerable()
            .Sum(item => (int)Math.Round(item.TotalTimeSeconds / 60d, MidpointRounding.AwayFromZero));

        return watchMinutes + quizMinutes + scormMinutes;
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
            ApiAdapterName = package.Version == ScormVersion.Scorm12 ? "API" : "API_1484_11",
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

    private static IReadOnlyCollection<InteractionTaskResult> EvaluateAssessment(
        LessonAssessment assessment,
        IReadOnlyCollection<QuestionSubmissionRequest> submissions)
    {
        var submissionMap = submissions
            .Where(item => !string.IsNullOrWhiteSpace(item.QuestionId))
            .GroupBy(item => item.QuestionId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Last(), StringComparer.Ordinal);

        return assessment.Questions
            .OrderBy(question => question.Order)
            .Select(question =>
            {
                submissionMap.TryGetValue(question.Id, out var submission);
                return EvaluateQuestion(question, submission);
            })
            .ToArray();
    }

    private static InteractionTaskResult EvaluateQuestion(LessonQuestion question, QuestionSubmissionRequest? submission)
    {
        var correct = question.Type switch
        {
            QuestionType.TrueFalse or QuestionType.MultipleChoice or QuestionType.Scenario => CompareCodeSets(
                question.Options.Where(item => item.IsCorrect).Select(item => item.Code),
                submission?.SelectedOptionCodes),
            QuestionType.Hotspot => CompareCodeSets(
                question.HotspotTargets.Where(item => item.IsCorrect).Select(item => item.Code),
                submission?.SelectedHotspotCodes),
            QuestionType.DragDrop => ComparePairSets(
                question.CorrectPairs.Select(item => $"{Normalize(item.DragItemCode)}|{Normalize(item.DragTargetCode)}"),
                submission?.Matches),
            _ => false
        };

        return new InteractionTaskResult
        {
            TaskId = question.Id,
            Correct = correct,
            Explanation = question.Explanation
        };
    }

    private static int CalculateScore(IReadOnlyCollection<InteractionTaskResult> results)
    {
        if (results.Count == 0)
        {
            return 0;
        }

        var correctCount = results.Count(item => item.Correct);
        return (int)Math.Round((double)correctCount / results.Count * 100);
    }

    private static bool CompareCodeSets(IEnumerable<string> expectedCodes, IReadOnlyCollection<string>? submittedCodes)
    {
        var expected = expectedCodes.Select(Normalize).ToHashSet(StringComparer.Ordinal);
        var actual = (submittedCodes ?? [])
            .Select(Normalize)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToHashSet(StringComparer.Ordinal);

        return expected.SetEquals(actual);
    }

    private static bool ComparePairSets(IEnumerable<string> expectedPairs, IReadOnlyCollection<DragDropMatchSubmission>? submittedPairs)
    {
        var expected = expectedPairs.ToHashSet(StringComparer.Ordinal);
        var actual = (submittedPairs ?? [])
            .Select(item => $"{Normalize(item.DragItemCode)}|{Normalize(item.DragTargetCode)}")
            .ToHashSet(StringComparer.Ordinal);

        return expected.SetEquals(actual);
    }

    private static IReadOnlyCollection<LearnerQuestionPayload> MapLearnerQuestions(LessonAssessment assessment, bool includeAllQuestions)
    {
        var orderedQuestions = assessment.Questions.OrderBy(question => question.Order).ToArray();
        if (assessment.RandomizeQuestionOrder && includeAllQuestions)
        {
            orderedQuestions = orderedQuestions.OrderBy(_ => Random.Shared.Next()).ToArray();
        }

        return orderedQuestions
            .Select(question => new LearnerQuestionPayload
            {
                QuestionId = question.Id,
                Type = question.Type,
                Order = question.Order,
                Prompt = question.Prompt,
                Statement = question.Statement,
                MediaTitle = question.MediaTitle,
                ScenarioTitle = question.ScenarioTitle,
                ScenarioContext = question.ScenarioContext,
                Options = OrderItems(question.Options, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerQuestionOptionPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray(),
                HotspotTargets = question.HotspotTargets
                    .OrderBy(item => item.Order)
                    .Select(item => new LearnerHotspotTargetPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order,
                        Shape = item.Shape,
                        X = item.X,
                        Y = item.Y,
                        Width = item.Width,
                        Height = item.Height,
                        Radius = item.Radius
                    })
                    .ToArray(),
                DragItems = OrderItems(question.DragItems, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerDragItemPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray(),
                DragTargets = OrderItems(question.DragTargets, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerDragTargetPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray()
            })
            .ToArray();
    }

    private static IReadOnlyCollection<T> OrderItems<T>(IEnumerable<T> items, bool randomize)
        where T : class
    {
        return randomize
            ? items.OrderBy(_ => Random.Shared.Next()).ToArray()
            : items.OrderBy(item => item switch
            {
                LessonQuestionOption option => option.Order,
                LessonQuestionDragItem dragItem => dragItem.Order,
                LessonQuestionDragTarget dragTarget => dragTarget.Order,
                _ => 0
            }).ToArray();
    }

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

    private void SaveChangesIfNeeded()
    {
        if (dbContext.ChangeTracker.HasChanges())
        {
            dbContext.SaveChanges();
        }
    }

    private static string Normalize(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string NormalizeElement(string value)
    {
        return Normalize(value);
    }

    private static string NormalizeUrlPath(string value)
    {
        return value.Trim().TrimStart('/').Replace('\\', '/');
    }
}
