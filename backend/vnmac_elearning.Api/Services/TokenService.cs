using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class TokenService(IOptions<JwtOptions> jwtOptions, TimeProvider timeProvider)
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public AuthTokenResponse CreateTokenResponse(User user)
    {
        var now = timeProvider.GetUtcNow();
        var accessTokenExpiresAt = now.AddMinutes(_jwtOptions.AccessTokenLifetimeMinutes);
        var refreshTokenExpiresAt = now.AddDays(_jwtOptions.RefreshTokenLifetimeDays);

        return new AuthTokenResponse
        {
            TokenType = "Bearer",
            AccessToken = CreateAccessToken(user, now, accessTokenExpiresAt),
            AccessTokenExpiresAt = accessTokenExpiresAt,
            RefreshToken = CreateRefreshToken(),
            RefreshTokenExpiresAt = refreshTokenExpiresAt
        };
    }

    public string HashRefreshToken(string refreshToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToHexString(hash);
    }

    private string CreateAccessToken(User user, DateTimeOffset issuedAt, DateTimeOffset expiresAt)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.MobilePhone, user.PhoneNumber),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("role_id", user.RoleId ?? string.Empty),
            new("admin_access", user.HasAdminAccess.ToString().ToLowerInvariant())
        };
        claims.AddRange(user.Permissions.Select(permission => new Claim("permission", permission)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey)),
            SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static string CreateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}
