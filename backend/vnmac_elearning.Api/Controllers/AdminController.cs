using System.Text;
using System.Security.Claims;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminController(
    AdminService adminService,
    MediaStorageService mediaStorageService,
    SystemSettingsService settingsService,
    AuditLogService auditLogService,
    NotificationService notificationService,
    RoleService roleService) : ControllerBase
{
    [HttpGet("courses")]
    public ActionResult<object> GetCourses()
    {
        return Ok(adminService.GetCourses().Select(CourseResponseMapper.Map).ToArray());
    }

    [HttpPost("media/upload")]
    [RequestSizeLimit(2L * 1024 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2L * 1024 * 1024 * 1024)]
    public async Task<ActionResult<MediaUploadResponse>> UploadMedia(
        [FromForm] IFormFile file,
        [FromForm] string mediaType,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await mediaStorageService.SaveAsync(file, mediaType, cancellationToken);
            auditLogService.Track(
                GetActorUserId(),
                "media",
                "upload",
                "Media",
                result.FileName,
                $"Upload {mediaType}: {result.OriginalFileName}",
                new { result.Url, result.ContentType, result.SizeBytes },
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
                Request.Headers.UserAgent.ToString());
            auditLogService.SaveChanges();
            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { key = "media.upload_invalid", message = exception.Message });
        }
    }

    [HttpGet("media/library")]
    public ActionResult<IReadOnlyCollection<MediaLibraryItemResponse>> GetMediaLibrary()
    {
        return Ok(mediaStorageService.GetLibrary());
    }

    [HttpPost("media/library")]
    public ActionResult<MediaLibraryItemResponse> CreateMediaLibraryItem(
        [FromBody] UpsertLibraryDocumentRequest request)
    {
        try
        {
            return Ok(mediaStorageService.CreateLibraryDocument(request));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { key = "library.invalid", message = exception.Message });
        }
    }

    [HttpPut("media/library/{id}")]
    public ActionResult<MediaLibraryItemResponse> UpdateMediaLibraryItem(
        string id,
        [FromBody] UpdateLibraryDocumentRequest request)
    {
        try
        {
            return Ok(mediaStorageService.UpdateLibraryDocument(id, request));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { key = "library.not_found", message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { key = "library.invalid", message = exception.Message });
        }
    }

    [HttpDelete("media/library/{fileName}")]
    public IActionResult DeleteMediaLibraryItem(string fileName)
    {
        try
        {
            if (!mediaStorageService.Delete(fileName))
            {
                return NotFound(new { key = "media.not_found", message = "Không tìm thấy tài liệu." });
            }
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { key = "media.in_use", message = exception.Message });
        }

        auditLogService.Track(
            GetActorUserId(),
            "media",
            "delete",
            "Media",
            fileName,
            $"Xóa tài liệu: {fileName}",
            new { fileName },
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            Request.Headers.UserAgent.ToString());
        auditLogService.SaveChanges();
        return NoContent();
    }

    [HttpGet("settings")]
    public ActionResult<SystemSettingsResponse> GetSettings()
    {
        return Ok(settingsService.GetSettings());
    }

    [HttpPut("settings")]
    public ActionResult<SystemSettingsResponse> UpdateSettings([FromBody] UpdateSystemSettingsRequest request)
    {
        return Ok(settingsService.UpdateSettings(request, GetActorUserId()));
    }

    [HttpGet("system-logs")]
    public ActionResult<SystemAuditLogResponse> GetSystemLogs(
        [FromQuery] string? search = null,
        [FromQuery] string? module = null,
        [FromQuery] string? action = null,
        [FromQuery] string? actorUserId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(auditLogService.GetLogs(search, module, action, actorUserId, page, pageSize));
    }

    [HttpGet("notifications")]
    public ActionResult<AdminNotificationListResponse> GetNotifications(
        [FromQuery] string? search = null,
        [FromQuery] NotificationAudience? audience = null,
        [FromQuery] NotificationType? type = null,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(notificationService.GetAdminNotifications(search, audience, type, unreadOnly, page, pageSize));
    }

    [HttpPost("notifications")]
    public ActionResult<AdminNotificationResponse> CreateNotification([FromBody] CreateAdminNotificationRequest request)
    {
        return Ok(notificationService.CreateAdminNotification(
            request,
            GetActorUserId(),
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            Request.Headers.UserAgent.ToString()));
    }

    [HttpPost("courses")]
    public ActionResult<Course> CreateCourse([FromBody] CreateCourseRequest request)
    {
        var course = adminService.CreateCourse(request);
        return CreatedAtAction(nameof(GetCourses), new { courseId = course.Id }, course);
    }

    [HttpPut("courses/{courseId}")]
    public ActionResult<Course> UpdateCourse(string courseId, [FromBody] UpdateCourseRequest request)
    {
        return Ok(adminService.UpdateCourse(courseId, request));
    }

    [HttpDelete("courses/{courseId}")]
    public IActionResult DeleteCourse(string courseId)
    {
        adminService.DeleteCourse(courseId);
        return NoContent();
    }

    [HttpPost("courses/{courseId}/sections")]
    public ActionResult<CourseSection> CreateSection(string courseId, [FromBody] CreateSectionRequest request)
    {
        return Ok(adminService.CreateSection(courseId, request));
    }

    [HttpPut("courses/{courseId}/sections/{sectionId}")]
    public ActionResult<CourseSection> UpdateSection(string courseId, string sectionId, [FromBody] UpdateSectionRequest request)
    {
        return Ok(adminService.UpdateSection(courseId, sectionId, request));
    }

    [HttpGet("quizzes")]
    public ActionResult<IReadOnlyCollection<CourseQuiz>> GetQuizzes(
        [FromQuery] string? courseId = null,
        [FromQuery] string? sectionId = null)
    {
        return Ok(adminService.GetQuizzes(courseId, sectionId));
    }

    [HttpPost("lessons")]
    public ActionResult<Lesson> CreateLesson([FromBody] UpsertLessonRequest request)
    {
        return Ok(adminService.CreateLesson(request));
    }

    [HttpGet("lessons/catalog")]
    public ActionResult<AdminLessonCatalogResponse> GetLessonCatalog(
        [FromQuery] string? search = null,
        [FromQuery] string? topic = null,
        [FromQuery] LessonPublicationStatus? status = null,
        [FromQuery] LessonDifficulty? difficulty = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        return Ok(adminService.GetLessonCatalog(search, topic, status, difficulty, page, pageSize));
    }

    [HttpGet("lessons/{lessonId}/content")]
    public ActionResult<LessonContent> GetLessonContent(string lessonId)
    {
        return Ok(adminService.GetLessonContent(lessonId));
    }

    [HttpPost("lessons/{lessonId}/content")]
    public ActionResult<LessonContent> CreateLessonContent(string lessonId, [FromBody] LessonContent request)
    {
        return Ok(adminService.UpsertLessonContent(lessonId, request));
    }

    [HttpPut("lessons/{lessonId}/content")]
    public ActionResult<LessonContent> UpdateLessonContent(string lessonId, [FromBody] LessonContent request)
    {
        return Ok(adminService.UpsertLessonContent(lessonId, request));
    }

    [HttpDelete("lessons/{lessonId}/content")]
    public IActionResult DeleteLessonContent(string lessonId)
    {
        adminService.DeleteLessonContent(lessonId);
        return NoContent();
    }

    [HttpPost("quizzes")]
    public ActionResult<CourseQuiz> CreateQuiz([FromBody] CreateCourseQuizRequest request)
    {
        return Ok(adminService.CreateQuiz(request));
    }

    [HttpPut("lessons/{lessonId}")]
    public ActionResult<Lesson> UpdateLesson(string lessonId, [FromBody] UpsertLessonRequest request)
    {
        return Ok(adminService.UpdateLesson(lessonId, request));
    }

    [HttpPut("lessons/{lessonId}/metadata")]
    public ActionResult<Lesson> UpdateLessonMetadata(string lessonId, [FromBody] UpdateLessonMetadataRequest request)
    {
        return Ok(adminService.UpdateLessonMetadata(lessonId, request));
    }

    [HttpPut("quizzes/{quizId}")]
    public ActionResult<CourseQuiz> UpdateQuiz(string quizId, [FromBody] UpdateCourseQuizRequest request)
    {
        return Ok(adminService.UpdateQuiz(quizId, request));
    }

    [HttpDelete("lessons/{lessonId}")]
    public IActionResult DeleteLesson(string lessonId)
    {
        adminService.DeleteLesson(lessonId);
        return NoContent();
    }

    [HttpDelete("quizzes/{quizId}")]
    public IActionResult DeleteQuiz(string quizId)
    {
        adminService.DeleteQuiz(quizId);
        return NoContent();
    }

    [HttpGet("questions")]
    public ActionResult<IReadOnlyCollection<LessonQuestion>> GetQuestions(
        [FromQuery] string? lessonId = null,
        [FromQuery] string? quizId = null)
    {
        return Ok(adminService.GetQuestions(lessonId, quizId));
    }

    [HttpPost("questions")]
    public ActionResult<LessonQuestion> CreateQuestion([FromBody] UpsertLessonQuestionRequest request)
    {
        return Ok(adminService.CreateQuestion(request));
    }

    [HttpPut("questions/{questionId}")]
    public ActionResult<LessonQuestion> UpdateQuestion(string questionId, [FromBody] UpsertLessonQuestionRequest request)
    {
        return Ok(adminService.UpdateQuestion(questionId, request));
    }

    [HttpDelete("questions/{questionId}")]
    public IActionResult DeleteQuestion(string questionId)
    {
        adminService.DeleteQuestion(questionId);
        return NoContent();
    }

    [HttpGet("user-accounts")]
    public ActionResult<IReadOnlyCollection<AdminUserRow>> GetUserAccounts(
        [FromQuery] string? province = null,
        [FromQuery] string? group = null,
        [FromQuery] UserRole? role = null)
    {
        return Ok(adminService.GetUserAccounts(province, group, role));
    }

    [HttpPost("user-accounts")]
    public ActionResult<AdminUserRow> CreateUser([FromBody] CreateAdminUserRequest request)
    {
        return Ok(adminService.CreateUser(request));
    }

    [HttpPut("user-accounts/{userId}")]
    public ActionResult<AdminUserRow> UpdateUser(string userId, [FromBody] UpdateAdminUserRequest request)
    {
        return Ok(adminService.UpdateUser(userId, request));
    }

    [HttpPut("user-accounts/{userId}/role")]
    public IActionResult AssignUserRole(string userId, [FromBody] AssignUserRoleRequest request)
    {
        roleService.AssignUser(userId, request.RoleId);
        return NoContent();
    }

    [HttpDelete("user-accounts/{userId}")]
    public IActionResult DeleteUser(string userId)
    {
        adminService.DeleteUser(userId);
        return NoContent();
    }

    [HttpGet("users")]
    public ActionResult<IReadOnlyCollection<LearnerAdminRow>> GetLearners(
        [FromQuery] string? province = null,
        [FromQuery] string? group = null)
    {
        return Ok(adminService.GetLearners(province, group));
    }

    [HttpGet("analytics")]
    public ActionResult<AnalyticsResponse> GetAnalytics(
        [FromQuery] string? province = null,
        [FromQuery] string? group = null)
    {
        return Ok(adminService.GetAnalytics(province, group));
    }

    [HttpGet("tracking")]
    public ActionResult<TrackingResponse> GetTracking(
        [FromQuery] string? courseId = null,
        [FromQuery] string? province = null,
        [FromQuery] string? group = null,
        [FromQuery] string? status = null)
    {
        return Ok(adminService.GetTracking(courseId, province, group, status));
    }

    [HttpGet("tracking/export")]
    public IActionResult ExportTracking(
        [FromQuery] string? courseId = null,
        [FromQuery] string? province = null,
        [FromQuery] string? group = null,
        [FromQuery] string? status = null)
    {
        var csv = adminService.ExportTrackingCsv(courseId, province, group, status);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", "tracking-report.csv");
    }

    [HttpGet("users/export")]
    public IActionResult ExportLearners([FromQuery] string? province = null, [FromQuery] string? group = null)
    {
        var csv = adminService.ExportLearnersCsv(province, group);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", "learners-export.csv");
    }

    private string? GetActorUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    }
}
