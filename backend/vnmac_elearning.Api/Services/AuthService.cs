using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class AuthService(
    TrainingDbContext dbContext,
    TokenService tokenService,
    PasswordService passwordService,
    TimeProvider timeProvider,
    NotificationService notificationService,
    AuditLogService auditLogService,
    EmailSender emailSender,
    RoleService roleService)
{
    private static readonly TimeSpan VerificationLifetime = TimeSpan.FromHours(24);

    public User GetCurrentUser(string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ServiceException(ServiceErrors.AuthCurrentUserNotFound);
        }

        var user = dbContext.Users.SingleOrDefault(item => item.Id == userId);
        if (user is null)
        {
            throw new ServiceException(ServiceErrors.AuthCurrentUserNotFound);
        }

        roleService.PopulateAccess(user);
        return user;
    }

    public User UpdateProfile(string? userId, UpdateProfileRequest request)
    {
        EnsureValidProvince(request.Province);
        var user = GetCurrentUser(userId);
        ValidateFullName(request.FullName);
        ValidatePhoneNumber(request.PhoneNumber);

        var normalizedPhone = NormalizePhoneNumber(request.PhoneNumber);
        var phoneInUse = dbContext.Users.Any(item => item.Id != user.Id && item.PhoneNumber == normalizedPhone);
        if (phoneInUse)
        {
            throw new ServiceException(ServiceErrors.AuthPhoneNumberAlreadyExists);
        }

        if (request.AvatarUrl is not null)
        {
            var avatar = request.AvatarUrl.Trim();
            var isValidAvatar = avatar.Length == 0 ||
                (avatar.Length <= 2_800_000 &&
                 (avatar.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ||
                  avatar.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ||
                  avatar.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase)));
            if (!isValidAvatar)
            {
                throw new ServiceException(ServiceErrors.AuthAvatarInvalid);
            }

            user.AvatarUrl = avatar;
        }

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = normalizedPhone;
        user.Province = request.Province.Trim();
        user.Group = request.Group.Trim();
        auditLogService.Track(user.Id, "auth", "update-profile", nameof(User), user.Id, "Cap nhat ho so ca nhan");
        dbContext.SaveChanges();
        return user;
    }

    public void ChangePassword(string? userId, ChangePasswordRequest request)
    {
        var user = GetCurrentUser(userId);
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
            !passwordService.VerifyPassword(user, request.CurrentPassword))
        {
            throw new ServiceException(ServiceErrors.AuthCurrentPasswordIncorrect);
        }

        ValidatePassword(request.NewPassword);
        user.PasswordHash = passwordService.HashPassword(user, request.NewPassword.Trim());
        auditLogService.Track(user.Id, "auth", "change-password", nameof(User), user.Id, "Doi mat khau");
        dbContext.SaveChanges();
    }

    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request)
    {
        EnsureValidProvince(request.Province);
        ValidateFullName(request.FullName);
        ValidatePhoneNumber(request.PhoneNumber);
        ValidateEmail(request.Email);
        ValidatePassword(request.Password);

        if (!string.Equals(request.CaptchaToken, "demo-pass", StringComparison.Ordinal))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidCaptchaToken);
        }

        var normalizedUsername = NormalizeUsername(request.Username);
        var normalizedEmail = NormalizeEmail(request.Email);
        var normalizedPhone = NormalizePhoneNumber(request.PhoneNumber);

        EnsureUniqueUserFields(normalizedUsername, normalizedEmail, normalizedPhone);

        var now = timeProvider.GetUtcNow();
        var user = new User
        {
            Id = $"user-{Guid.NewGuid():N}"[..18],
            Username = normalizedUsername,
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PhoneNumber = normalizedPhone,
            CreatedAt = now,
            LastLogin = now,
            IsEmailVerified = false,
            EmailVerifiedAt = null,
            CreatedByAdmin = false,
            Role = UserRole.Learner,
            RoleId = "role-learner",
            Province = request.Province.Trim(),
            Group = request.Group.Trim()
        };

        user.PasswordHash = passwordService.HashPassword(user, request.Password);
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        dbContext.Users.Add(user);
        notificationService.NotifyLearnerRegistered(user);
        auditLogService.Track(
            user.Id,
            "auth",
            "register",
            nameof(User),
            user.Id,
            $"Dang ky tai khoan {user.Username}",
            new { user.Username, user.Role, user.Province, user.Group });

        var verificationToken = CreateEmailVerificationToken(user);
        dbContext.EmailVerificationTokens.Add(verificationToken.Record);
        dbContext.SaveChanges();
        await emailSender.SendAccountActivationAsync(
            user,
            verificationToken.RawToken,
            verificationToken.Record.ExpiresAt);
        await transaction.CommitAsync();

        return new RegisterResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            RequiresEmailVerification = true,
            VerificationExpiresAt = verificationToken.Record.ExpiresAt,
            Message = "Tài khoản đã được tạo. Vui lòng kiểm tra email và bấm liên kết kích hoạt trước khi đăng nhập."
        };
    }

    public async Task ResendVerificationEmailAsync(ResendVerificationEmailRequest request)
    {
        ValidateEmail(request.Email);
        var email = NormalizeEmail(request.Email);
        var user = dbContext.Users.SingleOrDefault(item => item.Email == email);

        // Không tiết lộ email có tồn tại hay không.
        if (user is null || user.IsEmailVerified)
        {
            return;
        }

        var now = timeProvider.GetUtcNow();
        var recentToken = dbContext.EmailVerificationTokens
            .Where(item => item.UserId == user.Id && !item.ConsumedAt.HasValue)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefault();
        if (recentToken is not null && recentToken.CreatedAt > now.AddMinutes(-2))
        {
            return;
        }

        var verificationToken = CreateEmailVerificationToken(user);
        dbContext.EmailVerificationTokens.Add(verificationToken.Record);
        dbContext.SaveChanges();
        await emailSender.SendAccountActivationAsync(
            user,
            verificationToken.RawToken,
            verificationToken.Record.ExpiresAt);
    }

    public VerifyEmailResponse VerifyEmail(VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new ServiceException(ServiceErrors.AuthVerificationTokenRequired);
        }

        var tokenHash = HashVerificationToken(request.Token);
        var verificationToken = dbContext.EmailVerificationTokens
            .SingleOrDefault(item => item.TokenHash == tokenHash);

        if (verificationToken is null)
        {
            throw new ServiceException(ServiceErrors.AuthVerificationTokenInvalid);
        }

        if (verificationToken.ConsumedAt.HasValue)
        {
            throw new ServiceException(ServiceErrors.AuthVerificationTokenConsumed);
        }

        if (verificationToken.ExpiresAt <= timeProvider.GetUtcNow())
        {
            throw new ServiceException(ServiceErrors.AuthVerificationTokenExpired);
        }

        var user = dbContext.Users.SingleOrDefault(item => item.Id == verificationToken.UserId);
        if (user is null)
        {
            throw new ServiceException(ServiceErrors.AuthCurrentUserNotFound);
        }

        user.IsEmailVerified = true;
        user.EmailVerifiedAt = timeProvider.GetUtcNow();
        verificationToken.ConsumedAt = timeProvider.GetUtcNow();
        dbContext.SaveChanges();
        roleService.PopulateAccess(user);

        return new VerifyEmailResponse
        {
            User = user,
            Message = "Xác thực email thành công. Bạn có thể đăng nhập vào hệ thống."
        };
    }

    public LoginResponse Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidUsername);
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPassword);
        }

        if (!string.Equals(request.CaptchaToken, "demo-pass", StringComparison.Ordinal))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidCaptchaToken);
        }

        var identifier = request.Username.Trim();
        var normalizedIdentifier = identifier.ToLowerInvariant();
        var user = dbContext.Users.SingleOrDefault(item =>
            item.Username == normalizedIdentifier ||
            item.Email == normalizedIdentifier);

        if (user is null)
        {
            var normalizedPhone = NormalizePhoneNumber(identifier);
            user = dbContext.Users
                .AsEnumerable()
                .SingleOrDefault(item => NormalizePhoneNumber(item.PhoneNumber) == normalizedPhone);
        }
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash) || !passwordService.VerifyPassword(user, request.Password))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidCredentials);
        }

        if (!user.IsEmailVerified)
        {
            throw new ServiceException(ServiceErrors.AuthEmailNotVerified);
        }

        if (user.IsLocked)
        {
            throw new ServiceException(ServiceErrors.AuthAccountLocked);
        }

        user.LastLogin = timeProvider.GetUtcNow();
        roleService.PopulateAccess(user);

        var tokens = IssueTokens(user);
        auditLogService.Track(
            user.Id,
            "auth",
            "login",
            nameof(User),
            user.Id,
            $"Dang nhap {user.Username}",
            new { user.Role, user.Province, user.Group });
        dbContext.SaveChanges();

        return BuildResponse(user, tokens);
    }

    public AuthTokenResponse Refresh(RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ServiceException(ServiceErrors.AuthRefreshTokenRequired);
        }

        var refreshTokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var refreshToken = dbContext.RefreshTokens.SingleOrDefault(item => item.TokenHash == refreshTokenHash);
        if (refreshToken is null)
        {
            throw new ServiceException(ServiceErrors.AuthInvalidRefreshToken);
        }

        if (refreshToken.RevokedAt.HasValue)
        {
            throw new ServiceException(ServiceErrors.AuthRevokedRefreshToken);
        }

        if (refreshToken.ExpiresAt <= timeProvider.GetUtcNow())
        {
            throw new ServiceException(ServiceErrors.AuthExpiredRefreshToken);
        }

        var user = dbContext.Users.SingleOrDefault(item => item.Id == refreshToken.UserId);
        if (user is null)
        {
            throw new ServiceException(ServiceErrors.AuthInvalidRefreshToken);
        }

        if (!user.IsEmailVerified)
        {
            throw new ServiceException(ServiceErrors.AuthEmailNotVerified);
        }

        if (user.IsLocked)
        {
            throw new ServiceException(ServiceErrors.AuthAccountLocked);
        }

        roleService.PopulateAccess(user);
        var tokens = IssueTokens(user, refreshToken);
        dbContext.SaveChanges();
        return tokens;
    }

    public void Logout(string? userId, LogoutRequest request)
    {
        var user = GetCurrentUser(userId);
        var activeTokens = dbContext.RefreshTokens
            .Where(item =>
                item.UserId == user.Id &&
                !item.RevokedAt.HasValue &&
                item.ExpiresAt > timeProvider.GetUtcNow());

        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var refreshTokenHash = tokenService.HashRefreshToken(request.RefreshToken);
            activeTokens = activeTokens.Where(item => item.TokenHash == refreshTokenHash);
        }

        var tokens = activeTokens.ToArray();
        foreach (var token in tokens)
        {
            token.RevokedAt = timeProvider.GetUtcNow();
        }

        if (tokens.Length > 0)
        {
            auditLogService.Track(
                user.Id,
                "auth",
                "logout",
                nameof(User),
                user.Id,
                $"Dang xuat {user.Username}",
                new { revokedTokens = tokens.Length });
            dbContext.SaveChanges();
        }
    }

    public static string NormalizeUsername(string username)
    {
        return username.Trim().ToLowerInvariant();
    }

    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    public static string NormalizePhoneNumber(string phoneNumber)
    {
        return phoneNumber.Trim();
    }

    private (EmailVerificationToken Record, string RawToken) CreateEmailVerificationToken(User user)
    {
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var now = timeProvider.GetUtcNow();

        return (
            new EmailVerificationToken
            {
                Id = $"evt-{Guid.NewGuid():N}"[..18],
                UserId = user.Id,
                Email = user.Email,
                TokenHash = HashVerificationToken(rawToken),
                CreatedAt = now,
                ExpiresAt = now.Add(VerificationLifetime),
                ConsumedAt = null
            },
            rawToken);
    }

    private void EnsureUniqueUserFields(
        string normalizedUsername,
        string normalizedEmail,
        string normalizedPhone,
        string? exceptUserId = null)
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

        var duplicatePhone = dbContext.Users.Any(item =>
            item.PhoneNumber == normalizedPhone &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicatePhone)
        {
            throw new ServiceException(ServiceErrors.AuthPhoneNumberAlreadyExists);
        }
    }

    private static string HashVerificationToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(hash);
    }

    private AuthTokenResponse IssueTokens(User user, RefreshToken? rotatedToken = null)
    {
        var tokens = tokenService.CreateTokenResponse(user);
        var newRefreshTokenHash = tokenService.HashRefreshToken(tokens.RefreshToken);

        if (rotatedToken is not null)
        {
            rotatedToken.RevokedAt = timeProvider.GetUtcNow();
            rotatedToken.ReplacedByTokenHash = newRefreshTokenHash;
        }

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = $"rt-{Guid.NewGuid():N}",
            UserId = user.Id,
            TokenHash = newRefreshTokenHash,
            CreatedAt = timeProvider.GetUtcNow(),
            ExpiresAt = tokens.RefreshTokenExpiresAt,
            RevokedAt = null,
            ReplacedByTokenHash = null
        });

        return tokens;
    }

    private static LoginResponse BuildResponse(User user, AuthTokenResponse tokens)
    {
        return new LoginResponse
        {
            User = user,
            RateLimitPolicy = "5 requests/phut",
            LoginMode = "username-password",
            OtpValidated = false,
            CaptchaValidated = true,
            Tokens = tokens,
            Message = "Đăng nhập thành công."
        };
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPassword);
        }

        if (password.Trim().Length < 8)
        {
            throw new ServiceException(ServiceErrors.AuthWeakPassword);
        }
    }

    private static void ValidateEmail(string email)
    {
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
    }

    private static void ValidatePhoneNumber(string phoneNumber)
    {
        var normalized = NormalizePhoneNumber(phoneNumber);
        if (normalized.Length is < 9 or > 11 || !normalized.All(char.IsDigit))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPhoneNumber);
        }
    }

    private static void ValidateFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 4)
        {
            throw new ServiceException(ServiceErrors.AuthInvalidFullName);
        }
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
