using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
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
            LastLogin = user.LastLogin == default ? null : user.LastLogin,
            IsEmailVerified = user.IsEmailVerified,
            EmailVerifiedAt = user.EmailVerifiedAt,
            CreatedByAdmin = user.CreatedByAdmin,
            IsLocked = user.IsLocked,
            Role = user.Role,
            RoleId = user.RoleId ?? string.Empty,
            RoleName = dbContext.AppRoles
                .Where(role => role.Id == user.RoleId)
                .Select(role => role.Name)
                .FirstOrDefault() ?? user.Role.ToString(),
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

}
