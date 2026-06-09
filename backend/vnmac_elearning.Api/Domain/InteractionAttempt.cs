namespace vnmac_elearning.Api.Domain;

public sealed class InteractionAttempt
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public bool Passed { get; set; }
    public DateTimeOffset AttemptedAt { get; set; }
    public List<InteractionAttemptResult> QuestionResults { get; set; } = [];
}
