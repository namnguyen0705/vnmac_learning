namespace vnmac_elearning.Api.Domain;

public sealed class ScormRegistration
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public string? CurrentScoId { get; set; }
    public ScormCompletionStatus CompletionStatus { get; set; } = ScormCompletionStatus.NotAttempted;
    public ScormSuccessStatus SuccessStatus { get; set; } = ScormSuccessStatus.Unknown;
    public decimal? ScoreRaw { get; set; }
    public decimal? ScoreMin { get; set; }
    public decimal? ScoreMax { get; set; }
    public int TotalTimeSeconds { get; set; }
    public string Location { get; set; } = string.Empty;
    public string SuspendData { get; set; } = string.Empty;
    public DateTimeOffset? LastLaunchedAt { get; set; }
    public DateTimeOffset? LastCommittedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
