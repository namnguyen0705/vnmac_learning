using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
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
        EnsureValidProvince(request.Province);
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
            RoleId = request.RoleId ?? (request.Role == UserRole.Learner ? "role-learner" : null),
            Province = request.Province.Trim(),
            Group = request.Group.Trim()
        };

        user.PasswordHash = passwordService.HashPassword(user, request.Password.Trim());
        dbContext.Users.Add(user);
        TrackAdmin("create", nameof(User), user.Id, $"Tao nguoi dung {user.Username}", new { user.Role, user.Province, user.Group });
        dbContext.SaveChanges();

        return BuildAdminUserRow(user);
    }

    public AdminUserRow UpdateUser(string userId, UpdateAdminUserRequest request)
    {
        EnsureValidProvince(request.Province);
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
        if (!string.IsNullOrWhiteSpace(request.RoleId))
        {
            roleService.AssignUser(user.Id, request.RoleId);
        }
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
            var refreshTokens = dbContext.RefreshTokens.Where(item => item.UserId == user.Id);
            dbContext.RefreshTokens.RemoveRange(refreshTokens);
        }

        TrackAdmin("update", nameof(User), user.Id, $"Cap nhat nguoi dung {user.Username}", new { user.Role, user.Province, user.Group, user.IsLocked });
        dbContext.SaveChanges();
        return BuildAdminUserRow(user);
    }

    public void DeleteUser(string userId)
    {
        var user = GetUserInternal(userId);
        dbContext.Users.Remove(user);
        TrackAdmin("delete", nameof(User), user.Id, $"Xoa nguoi dung {user.Username}", new { user.Role, user.Province, user.Group });
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
                    LastLogin = learner.LastLogin == default ? null : learner.LastLogin,
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

    private void EnsureValidProvince(string province)
    {
        var normalized = province.Trim();
        if (normalized.Length == 0 || !dbContext.Provinces.Any(item => item.IsActive && item.Name == normalized))
        {
            throw new ServiceException(ServiceErrors.InvalidProvince);
        }
    }

}
