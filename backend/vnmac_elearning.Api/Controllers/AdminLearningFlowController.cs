using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/lessons/{lessonId}/flow")]
public sealed class AdminLearningFlowController(TrainingDbContext db) : ControllerBase
{
    [HttpPost("reset-progress")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetProgress(string lessonId)
    {
        var lesson = await db.Lessons.FindAsync(lessonId);
        if (lesson is null) return NotFound();
        // Content revisions can change prerequisites. Invalidate the entire course, not only one screen.
        var ids = db.Lessons.Where(x => x.CourseId == lesson.CourseId).Select(x => x.Id);
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.LearningFlowProgresses.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.QuizAttemptWrongQuestions.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.QuizAttempts.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.InteractionAttemptResults.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.InteractionAttempts.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.ProgressTrackings.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.QuizResults.Where(x => ids.Contains(x.LessonId)).ExecuteDeleteAsync();
        await db.Certificates.Where(x => x.CourseId == lesson.CourseId).ExecuteDeleteAsync();
        await db.CourseEnrollments.Where(x => x.CourseId == lesson.CourseId).ExecuteUpdateAsync(update => update
            .SetProperty(x => x.Status, Domain.CourseEnrollmentStatus.Enrolled)
            .SetProperty(x => x.StartedAt, (DateTimeOffset?)null)
            .SetProperty(x => x.CompletedAt, (DateTimeOffset?)null));
        await transaction.CommitAsync();
        return NoContent();
    }
}
