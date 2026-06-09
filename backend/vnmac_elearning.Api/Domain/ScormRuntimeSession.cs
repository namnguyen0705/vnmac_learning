namespace vnmac_elearning.Api.Domain;

public sealed class ScormRuntimeSession
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string ScoId { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public bool IsActive { get; set; }
    public int EventCount { get; set; }
    public string EntryMode { get; set; } = string.Empty;
    public string ExitMode { get; set; } = string.Empty;
    public ScormCompletionStatus CompletionStatus { get; set; } = ScormCompletionStatus.NotAttempted;
    public ScormSuccessStatus SuccessStatus { get; set; } = ScormSuccessStatus.Unknown;
    public decimal? ScoreRaw { get; set; }
    public int BaseTotalTimeSeconds { get; set; }
    public int SessionTimeSeconds { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? InitializedAt { get; set; }
    public DateTimeOffset? LastCommittedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
}
