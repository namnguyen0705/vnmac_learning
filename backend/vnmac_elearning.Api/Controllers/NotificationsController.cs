using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(
    AuthService authService,
    NotificationService notificationService,
    NotificationRealtimeService notificationRealtimeService) : ControllerBase
{
    [HttpGet("me")]
    public ActionResult<NotificationListResponse> GetMine([FromQuery] int take = 20)
    {
        var user = authService.GetCurrentUser(User.FindFirstValue(ClaimTypes.NameIdentifier));
        return Ok(notificationService.GetForUser(user, take));
    }

    [HttpPost("{notificationId}/read")]
    public ActionResult<NotificationListResponse> MarkAsRead(string notificationId)
    {
        var user = authService.GetCurrentUser(User.FindFirstValue(ClaimTypes.NameIdentifier));
        return Ok(notificationService.MarkAsRead(user, notificationId));
    }

    [HttpPost("read-all")]
    public ActionResult<NotificationListResponse> MarkAllAsRead()
    {
        var user = authService.GetCurrentUser(User.FindFirstValue(ClaimTypes.NameIdentifier));
        return Ok(notificationService.MarkAllAsRead(user));
    }

    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        var user = authService.GetCurrentUser(User.FindFirstValue(ClaimTypes.NameIdentifier));
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        await WriteEvent("notifications.connected", new { connected = true }, cancellationToken);

        await foreach (var item in notificationRealtimeService.Subscribe(user, cancellationToken))
        {
            await WriteEvent("notifications.changed", item, cancellationToken);
        }
    }

    private async Task WriteEvent(string eventName, object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload);
        await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
