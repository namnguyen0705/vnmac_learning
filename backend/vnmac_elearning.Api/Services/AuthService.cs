using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class AuthService(
    TrainingDbContext dbContext,
    TokenService tokenService,
    PasswordService passwordService,
    TimeProvider timeProvider,
    NotificationService notificationService)
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

        return user;
    }

    public RegisterResponse Register(RegisterRequest request)
    {
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
            Province = request.Province.Trim(),
            Group = request.Group.Trim()
        };

        user.PasswordHash = passwordService.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        notificationService.NotifyLearnerRegistered(user);

        var verificationToken = CreateEmailVerificationToken(user);
        dbContext.EmailVerificationTokens.Add(verificationToken.Record);
        dbContext.SaveChanges();

        return new RegisterResponse
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            RequiresEmailVerification = true,
            VerificationToken = verificationToken.RawToken,
            VerificationPath = $"/verify-email?token={Uri.EscapeDataString(verificationToken.RawToken)}",
            VerificationExpiresAt = verificationToken.Record.ExpiresAt,
            Message = "Tài khoản đã được tạo. Vui lòng xác thực email trước khi đăng nhập."
        };
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

        var normalizedUsername = NormalizeUsername(request.Username);
        var user = dbContext.Users.SingleOrDefault(item => item.Username == normalizedUsername);
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

        var tokens = IssueTokens(user);
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
}
