using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/learning")]
public sealed class LearningController(
    LearningService learningService,
    MediaStorageService mediaStorageService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("library")]
    public ActionResult<IReadOnlyCollection<MediaLibraryItemResponse>> GetLibrary()
    {
        return Ok(mediaStorageService.GetPublicLibrary());
    }

    [HttpGet("learners/{userId}/catalog")]
    public ActionResult<LearnerCourseCatalogResponse> GetCatalog(string userId)
    {
        return Ok(learningService.GetCatalog(userId));
    }

    [HttpGet("learners/{userId}/dashboard")]
    public ActionResult<LearnerDashboardResponse> GetDashboard(string userId)
    {
        return Ok(learningService.GetDashboard(userId));
    }

    [HttpPost("learners/{userId}/courses/{courseId}/enroll")]
    public ActionResult<LearnerEnrollmentSummary> EnrollCourse(string userId, string courseId)
    {
        return Ok(learningService.EnrollCourse(userId, courseId));
    }

    [HttpGet("learners/{userId}/courses/{courseId}/progress")]
    public ActionResult<ProgressSnapshotResponse> GetCourseProgress(string userId, string courseId)
    {
        return Ok(learningService.GetCourseProgress(userId, courseId));
    }

    [HttpGet("learners/{userId}/courses/{courseId}/learning-results")]
    public ActionResult<LearningResultsResponse> GetLearningResults(string userId, string courseId)
    {
        return Ok(learningService.GetLearningResults(userId, courseId));
    }

    [HttpPost("learners/{userId}/lessons/{lessonId}/study-state")]
    public ActionResult<ProgressTracking> UpdateLessonStudyState(
        string userId,
        string lessonId,
        [FromBody] LessonStudyStateRequest request)
    {
        return Ok(learningService.UpdateLessonStudyState(userId, lessonId, request));
    }

    [HttpPost("learners/{userId}/lessons/{lessonId}/complete")]
    public ActionResult<ProgressTracking> CompleteLessonContent(string userId, string lessonId)
    {
        return Ok(learningService.CompleteLessonContent(userId, lessonId));
    }

    [HttpPost("learners/{userId}/lessons/{lessonId}/video-progress")]
    public ActionResult<ProgressTracking> UpdateVideoProgress(
        string userId,
        string lessonId,
        [FromBody] UpdateVideoProgressRequest request)
    {
        return Ok(learningService.UpdateVideoProgress(userId, lessonId, request));
    }

    [HttpPost("learners/{userId}/lessons/{lessonId}/interactive-attempts")]
    public ActionResult<InteractiveAttemptResponse> SubmitInteractiveAttempt(
        string userId,
        string lessonId,
        [FromBody] InteractiveAttemptRequest request)
    {
        return Ok(learningService.SubmitInteractiveAttempt(userId, lessonId, request));
    }

    [HttpGet("learners/{userId}/quizzes/{quizId}/session")]
    public ActionResult<QuizSessionResponse> GetQuizSession(string userId, string quizId)
    {
        return Ok(learningService.CreateQuizSession(userId, quizId));
    }

    [HttpPost("learners/{userId}/quizzes/{quizId}/attempts")]
    public ActionResult<QuizAttemptResponse> SubmitQuizAttempt(
        string userId,
        string quizId,
        [FromBody] QuizAttemptRequest request)
    {
        return Ok(learningService.SubmitQuizAttempt(userId, quizId, request));
    }

    [HttpGet("learners/{userId}/certificates")]
    public ActionResult<LearnerCertificatesResponse> GetCertificates(string userId)
    {
        return Ok(learningService.GetCertificates(userId));
    }

    [HttpGet("learners/{userId}/courses/{courseId}/certificate")]
    public ActionResult<CertificateResponse> GetCertificate(string userId, string courseId)
    {
        return Ok(learningService.GetCertificate(userId, courseId));
    }

    [HttpPost("learners/{userId}/lessons/{lessonId}/scorm/launch")]
    public ActionResult<ScormLaunchResponse> LaunchScormLesson(
        string userId,
        string lessonId,
        [FromQuery] string? scoId = null)
    {
        return Ok(learningService.LaunchScormLesson(userId, lessonId, scoId));
    }
}
