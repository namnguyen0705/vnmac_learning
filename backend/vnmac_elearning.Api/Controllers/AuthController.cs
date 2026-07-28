using System.Security.Claims;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService authService, TrainingDbContext dbContext) : ControllerBase
{
    [HttpGet("provinces")]
    [ProducesResponseType(typeof(IReadOnlyCollection<string>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyCollection<string>> GetProvinces()
    {
        return Ok(dbContext.Provinces
            .AsNoTracking()
            .Where(province => province.IsActive)
            .OrderBy(province => province.SortOrder)
            .Select(province => province.Name)
            .ToArray());
    }

    [EnableRateLimiting("login")]
    [HttpPost("register")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterRequest request)
    {
        return Ok(await authService.RegisterAsync(request));
    }

    [EnableRateLimiting("login")]
    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationEmailRequest request)
    {
        await authService.ResendVerificationEmailAsync(request);
        return NoContent();
    }

    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(VerifyEmailResponse), StatusCodes.Status200OK)]
    public ActionResult<VerifyEmailResponse> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        return Ok(authService.VerifyEmail(request));
    }

    [EnableRateLimiting("login")]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        return Ok(authService.Login(request));
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    public ActionResult<AuthTokenResponse> Refresh([FromBody] RefreshTokenRequest request)
    {
        return Ok(authService.Refresh(request));
    }

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout([FromBody] LogoutRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        authService.Logout(userId, request);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(Domain.User), StatusCodes.Status200OK)]
    public ActionResult<Domain.User> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Ok(authService.GetCurrentUser(userId));
    }

    [Authorize]
    [HttpPut("profile")]
    [ProducesResponseType(typeof(Domain.User), StatusCodes.Status200OK)]
    public ActionResult<Domain.User> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Ok(authService.UpdateProfile(userId, request));
    }

    [Authorize]
    [HttpPut("password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        authService.ChangePassword(userId, request);
        return NoContent();
    }
}
