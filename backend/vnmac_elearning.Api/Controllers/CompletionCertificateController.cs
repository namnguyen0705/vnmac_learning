using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController, Authorize]
[Route("api/learning/learners/{userId}/courses/{courseId}/completion-certificate")]
public sealed class CompletionCertificateController(LearningService learning) : ControllerBase
{
    private bool Owns(string userId) => User.FindFirstValue(ClaimTypes.NameIdentifier) == userId;
    [HttpGet]
    public IActionResult Get(string userId,string courseId) => !Owns(userId)?Forbid():Ok(learning.GetCompletionCertificate(userId,courseId));
    [HttpPost]
    public IActionResult Confirm(string userId,string courseId,ConfirmCompletionCertificateRequest request) => !Owns(userId)?Forbid():Ok(learning.ConfirmCompletionCertificate(userId,courseId,request));
    [HttpGet("document")]
    public IActionResult Document(string userId,string courseId) {
        if(!Owns(userId))return Forbid();
        Response.Headers.CacheControl="no-store";
        return Content(learning.GetCompletionCertificateDocument(userId,courseId),"image/svg+xml",Encoding.UTF8);
    }
}
