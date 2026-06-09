namespace vnmac_elearning.Api.Domain;

public sealed class QuizAttempt
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public int Score { get; set; }
    public DateTimeOffset AttemptedAt { get; set; }
    public List<QuizAttemptWrongQuestion> WrongQuestions { get; set; } = [];
}
