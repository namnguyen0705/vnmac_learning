namespace vnmac_elearning.Api.Domain;

public sealed class QuizAttemptWrongQuestion
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public string QuestionId { get; set; } = string.Empty;
}
