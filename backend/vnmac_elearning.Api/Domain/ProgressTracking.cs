namespace vnmac_elearning.Api.Domain;

public sealed class ProgressTracking
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public LessonProgressStatus Status { get; set; }
    public DateTimeOffset? CompletionTime { get; set; }
    public int WatchPercent { get; set; }
    public int WatchTimeMinutes { get; set; }
    public int InteractionAttempts { get; set; }
}
