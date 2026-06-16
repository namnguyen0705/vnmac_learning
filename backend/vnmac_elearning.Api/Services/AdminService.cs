using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class AdminService(
    TrainingDbContext dbContext,
    LearningService learningService,
    PasswordService passwordService,
    TimeProvider timeProvider)
{
    public IReadOnlyCollection<Course> GetCourses()
    {
        return CourseGraphQuery()
            .OrderBy(course => course.Title)
            .ToArray();
    }

    public Course CreateCourse(CreateCourseRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminCourseTitleRequired);

        var course = new Course
        {
            Id = $"course-{Guid.NewGuid():N}"[..18],
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = request.Status,
            Sections = []
        };

        dbContext.Courses.Add(course);
        dbContext.SaveChanges();
        return course;
    }

    public Course UpdateCourse(string courseId, UpdateCourseRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminCourseTitleRequired);

        var course = GetCourseInternal(courseId);
        course.Title = request.Title.Trim();
        course.Description = request.Description.Trim();
        course.Status = request.Status;
        dbContext.SaveChanges();
        return course;
    }

    public void DeleteCourse(string courseId)
    {
        var course = GetCourseInternal(courseId);
        var lessonIds = course.Sections
            .SelectMany(section => section.Lessons)
            .Select(lesson => lesson.Id)
            .ToHashSet(StringComparer.Ordinal);

        dbContext.ScormRuntimeValues.RemoveRange(dbContext.ScormRuntimeValues.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRuntimeSessions.RemoveRange(dbContext.ScormRuntimeSessions.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRegistrations.RemoveRange(dbContext.ScormRegistrations.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.ProgressTrackings.RemoveRange(dbContext.ProgressTrackings.Where(progress => lessonIds.Contains(progress.LessonId)));
        dbContext.QuizResults.RemoveRange(dbContext.QuizResults.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.QuizAttempts.RemoveRange(dbContext.QuizAttempts.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.InteractionAttempts.RemoveRange(dbContext.InteractionAttempts.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.Certificates.RemoveRange(dbContext.Certificates.Where(item => item.CourseId == courseId));
        dbContext.CourseEnrollments.RemoveRange(dbContext.CourseEnrollments.Where(item => item.CourseId == courseId));
        dbContext.Courses.Remove(course);
        dbContext.SaveChanges();
    }

    public CourseSection CreateSection(string courseId, CreateSectionRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminSectionTitleRequired);

        _ = GetCourseInternal(courseId);

        var section = new CourseSection
        {
            Id = $"section-{Guid.NewGuid():N}"[..18],
            CourseId = courseId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Order = request.Order,
            Lessons = []
        };

        dbContext.CourseSections.Add(section);
        dbContext.SaveChanges();
        return section;
    }

    public IReadOnlyCollection<CourseQuiz> GetQuizzes(string? courseId = null, string? sectionId = null)
    {
        return dbContext.CourseQuizzes
            .Where(item =>
                (string.IsNullOrWhiteSpace(courseId) || item.CourseId == courseId) &&
                (string.IsNullOrWhiteSpace(sectionId) || item.SectionId == sectionId))
            .OrderBy(item => item.CourseId)
            .ThenBy(item => item.SectionId)
            .ThenBy(item => item.Order)
            .ThenBy(item => item.Title)
            .ToArray();
    }

    public Lesson CreateLesson(UpsertLessonRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminLessonTitleRequired);

        if (request.Type == LessonType.Quiz)
        {
            throw new ServiceException(ServiceErrors.AdminLessonQuizSeparated);
        }

        var section = GetSectionInternal(request.CourseId, request.SectionId);
        var lessonId = $"lesson-{Guid.NewGuid():N}"[..18];

        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = request.CourseId,
            SectionId = section.Id,
            Title = request.Title.Trim(),
            Type = request.Type,
            Order = request.Order,
            DurationMinutes = request.DurationMinutes,
            StatusLabel = request.StatusLabel.Trim(),
            VideoContent = request.Type == LessonType.Video ? request.VideoContent ?? new VideoContent() : null,
            Assessment = request.Type is LessonType.Interactive or LessonType.Quiz
                ? CreateAssessment(lessonId, request.Type, request.Assessment)
                : null,
            ScormPackage = request.Type == LessonType.Scorm
                ? CreateScormPackage(lessonId, request.ScormPackage)
                : null
        };

        dbContext.Lessons.Add(lesson);
        dbContext.SaveChanges();
        return GetLessonInternal(lesson.Id);
    }

    public CourseQuiz CreateQuiz(CreateCourseQuizRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminQuizTitleRequired);

        var course = GetCourseInternal(request.CourseId);
        var hostSection = ResolveQuizHostSection(course, request.SectionId);
        var lessonId = $"lesson-{Guid.NewGuid():N}"[..18];
        var quizId = $"quiz-{Guid.NewGuid():N}"[..18];

        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = request.CourseId,
            SectionId = hostSection.Id,
            Title = BuildQuizHostTitle(request.Title),
            Type = LessonType.Quiz,
            Order = GetNextHiddenQuizOrder(hostSection),
            DurationMinutes = 1,
            StatusLabel = "__quiz_host__",
            VideoContent = null,
            Assessment = CreateAssessment(lessonId, LessonType.Quiz, request.Assessment),
            ScormPackage = null
        };

        var quiz = new CourseQuiz
        {
            Id = quizId,
            CourseId = request.CourseId,
            SectionId = NormalizeSectionId(request.SectionId),
            AssessmentLessonId = lessonId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Order = request.Order
        };

        dbContext.Lessons.Add(lesson);
        dbContext.CourseQuizzes.Add(quiz);
        dbContext.SaveChanges();
        return GetCourseQuizInternal(quizId);
    }

    public Lesson UpdateLesson(string lessonId, UpsertLessonRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminLessonTitleRequired);

        if (request.Type == LessonType.Quiz)
        {
            throw new ServiceException(ServiceErrors.AdminLessonQuizSeparated);
        }

        var lesson = dbContext.Lessons
            .Include(item => item.Assessment)
            .Include(item => item.ScormPackage)
                .ThenInclude(item => item!.Scos)
            .SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);

        _ = GetSectionInternal(request.CourseId, request.SectionId);

        lesson.CourseId = request.CourseId;
        lesson.SectionId = request.SectionId;
        lesson.Title = request.Title.Trim();
        lesson.Type = request.Type;
        lesson.Order = request.Order;
        lesson.DurationMinutes = request.DurationMinutes;
        lesson.StatusLabel = request.StatusLabel.Trim();
        lesson.VideoContent = request.Type == LessonType.Video ? request.VideoContent ?? new VideoContent() : null;

        if (request.Type == LessonType.Video)
        {
            if (lesson.Assessment is not null)
            {
                dbContext.LessonAssessments.Remove(lesson.Assessment);
                lesson.Assessment = null;
            }

            if (lesson.ScormPackage is not null)
            {
                dbContext.ScormPackages.Remove(lesson.ScormPackage);
                lesson.ScormPackage = null;
            }
        }
        else if (request.Type is LessonType.Interactive or LessonType.Quiz)
        {
            if (lesson.ScormPackage is not null)
            {
                dbContext.ScormPackages.Remove(lesson.ScormPackage);
                lesson.ScormPackage = null;
            }

            if (lesson.Assessment is null)
            {
                lesson.Assessment = CreateAssessment(lessonId, request.Type, request.Assessment);
            }
            else
            {
                ApplyAssessment(lesson.Assessment, request.Type, request.Assessment);
            }
        }
        else if (request.Type == LessonType.Scorm)
        {
            lesson.VideoContent = null;

            if (lesson.Assessment is not null)
            {
                dbContext.LessonAssessments.Remove(lesson.Assessment);
                lesson.Assessment = null;
            }

            if (lesson.ScormPackage is null)
            {
                lesson.ScormPackage = CreateScormPackage(lessonId, request.ScormPackage);
            }
            else
            {
                ApplyScormPackage(lesson.ScormPackage, request.ScormPackage);
            }
        }

        dbContext.SaveChanges();
        return GetLessonInternal(lessonId);
    }

    public CourseQuiz UpdateQuiz(string quizId, UpdateCourseQuizRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminQuizTitleRequired);

        var quiz = GetCourseQuizInternal(quizId);
        var course = GetCourseInternal(request.CourseId);
        var hostSection = ResolveQuizHostSection(course, request.SectionId);
        var assessmentLesson = GetLessonInternal(quiz.AssessmentLessonId);

        quiz.CourseId = request.CourseId;
        quiz.SectionId = NormalizeSectionId(request.SectionId);
        quiz.Title = request.Title.Trim();
        quiz.Description = request.Description.Trim();
        quiz.Order = request.Order;

        assessmentLesson.CourseId = request.CourseId;
        assessmentLesson.SectionId = hostSection.Id;
        assessmentLesson.Title = BuildQuizHostTitle(request.Title);
        assessmentLesson.Type = LessonType.Quiz;
        assessmentLesson.StatusLabel = "__quiz_host__";
        assessmentLesson.DurationMinutes = Math.Max(assessmentLesson.DurationMinutes, 1);
        assessmentLesson.VideoContent = null;
        assessmentLesson.ScormPackage = null;

        if (assessmentLesson.Assessment is null)
        {
            assessmentLesson.Assessment = CreateAssessment(assessmentLesson.Id, LessonType.Quiz, request.Assessment);
        }
        else
        {
            ApplyAssessment(assessmentLesson.Assessment, LessonType.Quiz, request.Assessment);
        }

        dbContext.SaveChanges();
        return GetCourseQuizInternal(quizId);
    }

    public void DeleteLesson(string lessonId)
    {
        var lesson = dbContext.Lessons.SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);

        dbContext.CourseQuizzes.RemoveRange(dbContext.CourseQuizzes.Where(item => item.AssessmentLessonId == lessonId));
        dbContext.ScormRuntimeValues.RemoveRange(dbContext.ScormRuntimeValues.Where(item => item.LessonId == lessonId));
        dbContext.ScormRuntimeSessions.RemoveRange(dbContext.ScormRuntimeSessions.Where(item => item.LessonId == lessonId));
        dbContext.ScormRegistrations.RemoveRange(dbContext.ScormRegistrations.Where(item => item.LessonId == lessonId));
        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(result => result.LessonId == lessonId));
        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(result => result.LessonId == lessonId));
        dbContext.ProgressTrackings.RemoveRange(dbContext.ProgressTrackings.Where(progress => progress.LessonId == lessonId));
        dbContext.QuizResults.RemoveRange(dbContext.QuizResults.Where(result => result.LessonId == lessonId));
        dbContext.QuizAttempts.RemoveRange(dbContext.QuizAttempts.Where(result => result.LessonId == lessonId));
        dbContext.InteractionAttempts.RemoveRange(dbContext.InteractionAttempts.Where(result => result.LessonId == lessonId));
        dbContext.Lessons.Remove(lesson);
        dbContext.SaveChanges();
    }

    public void DeleteQuiz(string quizId)
    {
        var quiz = GetCourseQuizInternal(quizId);
        DeleteLesson(quiz.AssessmentLessonId);
    }

    public IReadOnlyCollection<LessonQuestion> GetQuestions(string? lessonId, string? quizId)
    {
        var resolvedLessonId = ResolveQuestionOwnerLessonId(lessonId, quizId, allowEmpty: true);
        return QuestionGraphQuery()
            .Where(question => string.IsNullOrWhiteSpace(resolvedLessonId) || question.LessonId == resolvedLessonId)
            .OrderBy(question => question.LessonId)
            .ThenBy(question => question.Order)
            .ToArray();
    }

    public LessonQuestion CreateQuestion(UpsertLessonQuestionRequest request)
    {
        ValidateQuestionRequest(request);
        var lessonId = ResolveQuestionOwnerLessonId(request.LessonId, request.QuizId);

        var questionId = $"question-{Guid.NewGuid():N}"[..20];
        var question = BuildQuestion(questionId, lessonId, request);
        dbContext.LessonQuestions.Add(question);
        dbContext.SaveChanges();

        return GetQuestionInternal(questionId);
    }

    public LessonQuestion UpdateQuestion(string questionId, UpsertLessonQuestionRequest request)
    {
        ValidateQuestionRequest(request);
        var lessonId = ResolveQuestionOwnerLessonId(request.LessonId, request.QuizId);

        var question = GetQuestionInternal(questionId);
        dbContext.LessonQuestionOptions.RemoveRange(question.Options);
        dbContext.LessonQuestionHotspotTargets.RemoveRange(question.HotspotTargets);
        dbContext.LessonQuestionDragItems.RemoveRange(question.DragItems);
        dbContext.LessonQuestionDragTargets.RemoveRange(question.DragTargets);
        dbContext.LessonQuestionDragPairs.RemoveRange(question.CorrectPairs);

        question.LessonId = lessonId;
        question.Type = request.Type;
        question.Order = request.Order;
        question.Prompt = request.Prompt.Trim();
        question.Explanation = request.Explanation.Trim();
        question.Statement = string.IsNullOrWhiteSpace(request.Statement) ? null : request.Statement.Trim();
        question.MediaTitle = string.IsNullOrWhiteSpace(request.MediaTitle) ? null : request.MediaTitle.Trim();
        question.ScenarioTitle = string.IsNullOrWhiteSpace(request.ScenarioTitle) ? null : request.ScenarioTitle.Trim();
        question.ScenarioContext = string.IsNullOrWhiteSpace(request.ScenarioContext) ? null : request.ScenarioContext.Trim();
        question.Options = BuildOptions(questionId, request.Options);
        question.HotspotTargets = BuildHotspotTargets(questionId, request.HotspotTargets);
        question.DragItems = BuildDragItems(questionId, request.DragItems);
        question.DragTargets = BuildDragTargets(questionId, request.DragTargets);
        question.CorrectPairs = BuildDragPairs(questionId, request.CorrectPairs);

        dbContext.SaveChanges();
        return GetQuestionInternal(questionId);
    }

    public void DeleteQuestion(string questionId)
    {
        var question = dbContext.LessonQuestions.SingleOrDefault(item => item.Id == questionId)
            ?? throw new ServiceException(ServiceErrors.AdminQuestionNotFound);

        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(result => result.QuestionId == questionId));
        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(result => result.QuestionId == questionId));
        dbContext.LessonQuestions.Remove(question);
        dbContext.SaveChanges();
    }

    public IReadOnlyCollection<AdminUserRow> GetUserAccounts(string? province, string? group, UserRole? role = null)
    {
        var users = FilterUsers(province, group, role).ToArray();
        return users
            .Select(BuildAdminUserRow)
            .OrderBy(item => item.Role == UserRole.Learner ? 0 : 1)
            .ThenBy(item => item.FullName)
            .ToArray();
    }

    public AdminUserRow CreateUser(CreateAdminUserRequest request)
    {
        ValidateUserFields(
            request.Username,
            request.Email,
            request.FullName,
            request.PhoneNumber,
            request.Password,
            requirePassword: true);

        var normalizedUsername = AuthService.NormalizeUsername(request.Username);
        var normalizedEmail = AuthService.NormalizeEmail(request.Email);
        var normalizedPhoneNumber = AuthService.NormalizePhoneNumber(request.PhoneNumber);

        EnsureUniqueUserFields(normalizedUsername, normalizedEmail, normalizedPhoneNumber);

        var now = timeProvider.GetUtcNow();
        var user = new User
        {
            Id = $"user-{Guid.NewGuid():N}"[..18],
            Username = normalizedUsername,
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PhoneNumber = normalizedPhoneNumber,
            CreatedAt = now,
            LastLogin = now,
            IsEmailVerified = request.MarkEmailAsVerified,
            EmailVerifiedAt = request.MarkEmailAsVerified ? now : null,
            CreatedByAdmin = true,
            IsLocked = request.IsLocked,
            Role = request.Role,
            Province = request.Province.Trim(),
            Group = request.Group.Trim()
        };

        user.PasswordHash = passwordService.HashPassword(user, request.Password.Trim());
        dbContext.Users.Add(user);
        dbContext.SaveChanges();

        return BuildAdminUserRow(user);
    }

    public AdminUserRow UpdateUser(string userId, UpdateAdminUserRequest request)
    {
        ValidateUserFields(
            request.Username,
            request.Email,
            request.FullName,
            request.PhoneNumber,
            request.Password,
            requirePassword: false);

        var user = GetUserInternal(userId);
        var normalizedUsername = AuthService.NormalizeUsername(request.Username);
        var normalizedEmail = AuthService.NormalizeEmail(request.Email);
        var normalizedPhoneNumber = AuthService.NormalizePhoneNumber(request.PhoneNumber);

        EnsureUniqueUserFields(normalizedUsername, normalizedEmail, normalizedPhoneNumber, user.Id);

        user.Username = normalizedUsername;
        user.Email = normalizedEmail;
        user.FullName = request.FullName.Trim();
        user.PhoneNumber = normalizedPhoneNumber;
        user.Role = request.Role;
        user.Province = request.Province.Trim();
        user.Group = request.Group.Trim();
        user.IsEmailVerified = request.IsEmailVerified;
        user.IsLocked = request.IsLocked;
        user.EmailVerifiedAt = request.IsEmailVerified
            ? user.EmailVerifiedAt ?? timeProvider.GetUtcNow()
            : null;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = passwordService.HashPassword(user, request.Password.Trim());
        }

        dbContext.SaveChanges();
        return BuildAdminUserRow(user);
    }

    public void DeleteUser(string userId)
    {
        var user = GetUserInternal(userId);
        dbContext.Users.Remove(user);
        dbContext.SaveChanges();
    }

    public IReadOnlyCollection<LearnerAdminRow> GetLearners(string? province, string? group)
    {
        var learners = FilterLearners(province, group).ToArray();
        return learners
            .Select(learner =>
            {
                var enrollments = learningService.GetEnrollmentSummaries(learner.Id)
                    .Select(item => new LearnerEnrollmentAdminRow
                    {
                        CourseId = item.CourseId,
                        CourseTitle = item.Title,
                        EnrollmentStatus = item.EnrollmentStatus,
                        ContentCompletionPercent = item.ContentCompletionPercent,
                        QuizCompletionPercent = item.QuizCompletionPercent,
                        OverallCompletionPercent = item.OverallCompletionPercent,
                        QuizUnlocked = item.QuizUnlocked,
                        PassedAllQuizzes = item.QuizCompletionPercent == 100,
                        CertificateIssued = item.CertificateIssued,
                        CertificateId = item.CertificateId,
                        NextLessonId = item.NextLessonId
                    })
                    .ToArray();

                var completionPercent = enrollments.Length == 0
                    ? 0
                    : (int)Math.Round(enrollments.Average(item => item.OverallCompletionPercent));
                var passed = enrollments.Any(item => item.CertificateIssued);

                return new LearnerAdminRow
                {
                    UserId = learner.Id,
                    Username = learner.Username,
                    Email = learner.Email,
                    FullName = learner.FullName,
                    PhoneNumber = learner.PhoneNumber,
                    CreatedAt = learner.CreatedAt,
                    LastLogin = learner.LastLogin,
                    IsEmailVerified = learner.IsEmailVerified,
                    EmailVerifiedAt = learner.EmailVerifiedAt,
                    CreatedByAdmin = learner.CreatedByAdmin,
                    IsLocked = learner.IsLocked,
                    Province = learner.Province,
                    Group = learner.Group,
                    CompletionPercent = completionPercent,
                    Passed = passed,
                    StudyTimeMinutes = learningService.CalculateStudyTimeMinutes(learner.Id),
                    StalledAtLessonId = learningService.GetStalledLessonId(learner.Id)
                    ,
                    CertificateCount = enrollments.Count(item => item.CertificateIssued),
                    Enrollments = enrollments
                };
            })
            .OrderByDescending(item => item.CompletionPercent)
            .ThenBy(item => item.FullName)
            .ToArray();
    }

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

    private IQueryable<LessonQuestion> QuestionGraphQuery()
    {
        return dbContext.LessonQuestions
            .Include(question => question.Options)
            .Include(question => question.HotspotTargets)
            .Include(question => question.DragItems)
            .Include(question => question.DragTargets)
            .Include(question => question.CorrectPairs);
    }

    private AdminUserRow BuildAdminUserRow(User user)
    {
        var enrollments = user.Role == UserRole.Learner
            ? learningService.GetEnrollmentSummaries(user.Id)
                .Select(item => new LearnerEnrollmentAdminRow
                {
                    CourseId = item.CourseId,
                    CourseTitle = item.Title,
                    EnrollmentStatus = item.EnrollmentStatus,
                    ContentCompletionPercent = item.ContentCompletionPercent,
                    QuizCompletionPercent = item.QuizCompletionPercent,
                    OverallCompletionPercent = item.OverallCompletionPercent,
                    QuizUnlocked = item.QuizUnlocked,
                    PassedAllQuizzes = item.QuizCompletionPercent == 100,
                    CertificateIssued = item.CertificateIssued,
                    CertificateId = item.CertificateId,
                    NextLessonId = item.NextLessonId,
                    NextQuizId = item.NextQuizId
                })
                .ToArray()
            : [];

        var completionPercent = enrollments.Length == 0
            ? 0
            : (int)Math.Round(enrollments.Average(item => item.OverallCompletionPercent));
        var passed = enrollments.Any(item => item.CertificateIssued);

        return new AdminUserRow
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            CreatedAt = user.CreatedAt,
            LastLogin = user.LastLogin,
            IsEmailVerified = user.IsEmailVerified,
            EmailVerifiedAt = user.EmailVerifiedAt,
            CreatedByAdmin = user.CreatedByAdmin,
            IsLocked = user.IsLocked,
            Role = user.Role,
            Province = user.Province,
            Group = user.Group,
            CompletionPercent = completionPercent,
            Passed = passed,
            StudyTimeMinutes = user.Role == UserRole.Learner ? learningService.CalculateStudyTimeMinutes(user.Id) : 0,
            StalledAtLessonId = user.Role == UserRole.Learner ? learningService.GetStalledLessonId(user.Id) : string.Empty,
            CertificateCount = enrollments.Count(item => item.CertificateIssued),
            Enrollments = enrollments
        };
    }

    private IQueryable<User> FilterLearners(string? province, string? group)
    {
        return dbContext.Users.Where(user =>
            user.Role == UserRole.Learner &&
            (string.IsNullOrWhiteSpace(province) || user.Province == province) &&
            (string.IsNullOrWhiteSpace(group) || user.Group == group));
    }

    private IQueryable<User> FilterUsers(string? province, string? group, UserRole? role)
    {
        return dbContext.Users.Where(user =>
            (!role.HasValue || user.Role == role.Value) &&
            (string.IsNullOrWhiteSpace(province) || user.Province == province) &&
            (string.IsNullOrWhiteSpace(group) || user.Group == group));
    }

    private Course GetCourseInternal(string courseId)
    {
        return CourseGraphQuery()
            .SingleOrDefault(course => course.Id == courseId)
            ?? throw new ServiceException(ServiceErrors.AdminCourseNotFound);
    }

    private CourseSection GetSectionInternal(string courseId, string sectionId)
    {
        return dbContext.CourseSections
            .Include(section => section.Lessons)
            .SingleOrDefault(section => section.Id == sectionId && section.CourseId == courseId)
            ?? throw new ServiceException(ServiceErrors.AdminSectionNotFound);
    }

    private CourseQuiz GetCourseQuizInternal(string quizId)
    {
        return dbContext.CourseQuizzes.SingleOrDefault(item => item.Id == quizId)
            ?? throw new ServiceException(ServiceErrors.AdminQuizNotFound);
    }

    private Lesson GetLessonInternal(string lessonId)
    {
        return dbContext.Lessons
            .Include(item => item.Assessment)
                .ThenInclude(item => item!.Questions)
                    .ThenInclude(item => item.Options)
            .Include(item => item.Assessment)
                .ThenInclude(item => item!.Questions)
                    .ThenInclude(item => item.HotspotTargets)
            .Include(item => item.Assessment)
                .ThenInclude(item => item!.Questions)
                    .ThenInclude(item => item.DragItems)
            .Include(item => item.Assessment)
                .ThenInclude(item => item!.Questions)
                    .ThenInclude(item => item.DragTargets)
            .Include(item => item.Assessment)
                .ThenInclude(item => item!.Questions)
                    .ThenInclude(item => item.CorrectPairs)
            .Include(item => item.ScormPackage)
                .ThenInclude(item => item!.Scos)
            .SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);
    }

    private Lesson GetAssessmentLessonInternal(string lessonId)
    {
        var lesson = GetLessonInternal(lessonId);
        if (lesson.Type is LessonType.Video or LessonType.Scorm || lesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.AdminAssessmentLessonRequired);
        }

        return lesson;
    }

    private string ResolveQuestionOwnerLessonId(string? lessonId, string? quizId, bool allowEmpty = false)
    {
        var normalizedLessonId = string.IsNullOrWhiteSpace(lessonId) ? null : lessonId.Trim();
        var normalizedQuizId = string.IsNullOrWhiteSpace(quizId) ? null : quizId.Trim();

        if (normalizedLessonId is not null && normalizedQuizId is not null)
        {
            throw new ServiceException(ServiceErrors.AdminQuestionOwnerConflict);
        }

        if (normalizedQuizId is not null)
        {
            return GetCourseQuizInternal(normalizedQuizId).AssessmentLessonId;
        }

        if (normalizedLessonId is not null)
        {
            return GetAssessmentLessonInternal(normalizedLessonId).Id;
        }

        if (allowEmpty)
        {
            return string.Empty;
        }

        throw new ServiceException(ServiceErrors.AdminQuestionOwnerRequired);
    }

    private LessonQuestion GetQuestionInternal(string questionId)
    {
        return QuestionGraphQuery()
            .SingleOrDefault(item => item.Id == questionId)
            ?? throw new ServiceException(ServiceErrors.AdminQuestionNotFound);
    }

    private User GetUserInternal(string userId)
    {
        return dbContext.Users.SingleOrDefault(item => item.Id == userId)
            ?? throw new ServiceException(ServiceErrors.AdminUserNotFound);
    }

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

    private void EnsureUniqueUserFields(string normalizedUsername, string normalizedEmail, string normalizedPhoneNumber, string? exceptUserId = null)
    {
        var duplicateUsername = dbContext.Users.Any(item =>
            item.Username == normalizedUsername &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicateUsername)
        {
            throw new ServiceException(ServiceErrors.AuthUsernameAlreadyExists);
        }

        var duplicateEmail = dbContext.Users.Any(item =>
            item.Email == normalizedEmail &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicateEmail)
        {
            throw new ServiceException(ServiceErrors.AuthEmailAlreadyExists);
        }

        var duplicatePhoneNumber = dbContext.Users.Any(item =>
            item.PhoneNumber == normalizedPhoneNumber &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicatePhoneNumber)
        {
            throw new ServiceException(ServiceErrors.AuthPhoneNumberAlreadyExists);
        }
    }

    private static void ValidateUserFields(
        string username,
        string email,
        string fullName,
        string phoneNumber,
        string? password,
        bool requirePassword)
    {
        ValidateText(username, ServiceErrors.AuthInvalidUsername);

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidEmail);
        }

        try
        {
            _ = new MailAddress(email.Trim());
        }
        catch
        {
            throw new ServiceException(ServiceErrors.AuthInvalidEmail);
        }

        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 4)
        {
            throw new ServiceException(ServiceErrors.AuthInvalidFullName);
        }

        var normalizedPhoneNumber = AuthService.NormalizePhoneNumber(phoneNumber);
        if (normalizedPhoneNumber.Length is < 9 or > 11 || !normalizedPhoneNumber.All(char.IsDigit))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPhoneNumber);
        }

        if (requirePassword && string.IsNullOrWhiteSpace(password))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPassword);
        }

        if (!string.IsNullOrWhiteSpace(password) && password.Trim().Length < 8)
        {
            throw new ServiceException(ServiceErrors.AuthWeakPassword);
        }
    }

    private static string EscapeCsv(string value)
    {
        return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}
