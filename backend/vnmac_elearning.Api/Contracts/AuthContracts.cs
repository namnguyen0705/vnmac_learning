using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Contracts;

public sealed class LoginRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string? CaptchaToken { get; init; }
}

public sealed class RegisterRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public string? CaptchaToken { get; init; }
}

public sealed class RegisterResponse
{
    public string UserId { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public bool RequiresEmailVerification { get; init; }
    public DateTimeOffset VerificationExpiresAt { get; init; }
    public string Message { get; init; } = string.Empty;
}

public sealed class ResendVerificationEmailRequest
{
    public string Email { get; init; } = string.Empty;
}

public sealed class VerifyEmailRequest
{
    public string Token { get; init; } = string.Empty;
}

public sealed class VerifyEmailResponse
{
    public required User User { get; init; }
    public string Message { get; init; } = string.Empty;
}

public sealed class LoginResponse
{
    public required User User { get; init; }
    public required string RateLimitPolicy { get; init; }
    public required string LoginMode { get; init; }
    public bool OtpValidated { get; init; }
    public bool CaptchaValidated { get; init; }
    public required AuthTokenResponse Tokens { get; init; }
    public string Message { get; init; } = string.Empty;
}

public sealed class RefreshTokenRequest
{
    public string RefreshToken { get; init; } = string.Empty;
}

public sealed class LogoutRequest
{
    public string? RefreshToken { get; init; }
}

public sealed class UpdateProfileRequest
{
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
}

public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public sealed class AuthTokenResponse
{
    public string TokenType { get; init; } = "Bearer";
    public required string AccessToken { get; init; }
    public DateTimeOffset AccessTokenExpiresAt { get; init; }
    public required string RefreshToken { get; init; }
    public DateTimeOffset RefreshTokenExpiresAt { get; init; }
}
