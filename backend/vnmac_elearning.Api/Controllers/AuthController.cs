using System.Security.Claims;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService authService) : ControllerBase
{
    [EnableRateLimiting("login")]
    [HttpPost("register")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status200OK)]
    public ActionResult<RegisterResponse> Register([FromBody] RegisterRequest request)
    {
        return Ok(authService.Register(request));
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
}
