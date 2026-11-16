using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/learning/learners/{userId}/lessons/{lessonId}/flow")]
public sealed class LearningFlowController(LearningService learningService) : ControllerBase
{
    private bool Owns(string userId) => User.FindFirstValue(ClaimTypes.NameIdentifier) == userId;

    [HttpGet]
    public IActionResult Get(string userId, string lessonId, [FromQuery] int? reviewStep, [FromQuery] int reviewItem = 0)
    {
        if (!Owns(userId)) return Forbid();
        try { return Ok(learningService.GetLearningFlow(userId, lessonId, reviewStep, reviewItem)); }
        catch (vnmac_elearning.Api.Infrastructure.ServiceException exception) when (exception.Message.Contains("Nội dung đã được cập nhật"))
        {
            return Conflict(new { key = "flow.content_updated", message = "Bài học đã được cập nhật. Bạn có thể bắt đầu lại khóa học để học theo nội dung mới." });
        }
    }

    [HttpPost("restart-updated")]
    public IActionResult RestartUpdated(string userId, string lessonId)
    {
        if (!Owns(userId)) return Forbid();
        learningService.RestartUpdatedLearningFlow(userId, lessonId);
        return NoContent();
    }

    [HttpPost]
    public IActionResult Act(string userId, string lessonId, LearningFlowActionRequest request)
        => !Owns(userId) ? Forbid() : Ok(learningService.ActLearningFlow(userId, lessonId, request));
}
