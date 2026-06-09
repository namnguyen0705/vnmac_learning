using System.Text;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController(AdminService adminService) : ControllerBase
{
    [HttpGet("courses")]
    public ActionResult<object> GetCourses()
    {
        return Ok(adminService.GetCourses().Select(CourseResponseMapper.Map).ToArray());
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

    [HttpGet("users/export")]
    public IActionResult ExportLearners([FromQuery] string? province = null, [FromQuery] string? group = null)
    {
        var csv = adminService.ExportLearnersCsv(province, group);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", "learners-export.csv");
    }
}
