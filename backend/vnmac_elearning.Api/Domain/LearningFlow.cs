namespace vnmac_elearning.Api.Domain;

// Stored inside Lesson.Content. Answer keys never leave the authenticated runtime.
public sealed class LearningFlowStep
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public List<LearningFlowDrawRule>? DrawRules { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault)]
    public int TimeLimitSeconds { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault)]
    public int PassCount { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault)]
    public bool IsHidden { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Policy { get; set; } = "practice";
    public bool ShuffleOnRetry { get; set; }
    public bool AutoAdvance { get; set; }
    public List<LearningFlowItem> Items { get; set; } = [];
}

public sealed class LearningFlowItem
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public string? FeedbackAudioUrl { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? FeedbackByCode { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public List<LearningFlowOption>? LeftItems { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public string? GroupId { get; set; }
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault)]
    public bool IsHidden { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = "text";
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Narration { get; set; } = string.Empty;
    public string ProductionNotes { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public bool AutoAdvance { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool RequiresImage { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public bool RequiresAudio { get; set; }
    public string VideoUrl { get; set; } = string.Empty;
    public string CaptionUrl { get; set; } = string.Empty;
    public double DurationSeconds { get; set; } = 3;
    public string ReviewNote { get; set; } = string.Empty;
    public bool Multiple { get; set; }
    public List<LearningFlowOption> Options { get; set; } = [];
    public List<string> CorrectCodes { get; set; } = [];
    public string CorrectFeedback { get; set; } = "Chính xác!";
    public string WrongFeedback { get; set; } = "Chưa chính xác. Hãy quan sát và lựa chọn lại.";
}

public sealed class LearningFlowOption
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public string? AudioUrl { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public bool RequiresImage { get; set; }
    // Visible locations; correctness is held separately in CorrectCodes.
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; } = 10;
    public double Height { get; set; } = 10;
    public List<LearningFlowPoint> Polygon { get; set; } = [];
}

public sealed class LearningFlowPoint
{
    public double X { get; set; }
    public double Y { get; set; }
}

public sealed class LearningFlowProgress
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string ContentVersion { get; set; } = string.Empty;
    public string StateJson { get; set; } = "{}";
    public long Revision { get; set; }
}

public sealed class LearningFlowState
{
    public DateTimeOffset? ExamDeadline { get; set; }
    public bool ExamSubmitted { get; set; }
    public bool ExamPassed { get; set; }
    public List<string> ExamOrder { get; set; } = [];
    public Dictionary<string, LearningFlowAnswer> ExamAnswers { get; set; } = [];
    public int StepIndex { get; set; }
    public int ItemIndex { get; set; }
    public List<string> CompletedSteps { get; set; } = [];
    public List<string> Order { get; set; } = [];
    public Dictionary<string, LearningFlowAnswer> Answers { get; set; } = [];
    public Dictionary<string, LearningFlowAnswer> CompletedAnswers { get; set; } = [];
    public List<LearningFlowAnswerEvent> PracticeHistory { get; set; } = [];
    public int Attempts { get; set; }
    public bool QuizFinished { get; set; }
    public DateTimeOffset EnteredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastWatchAt { get; set; } = DateTimeOffset.UtcNow;
    public double WatchedSeconds { get; set; }
    public double LastPosition { get; set; }
    public DateTimeOffset LastActivityAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class LearningFlowDrawRule
{
    public string Kind { get; set; } = "choice";
    public int Count { get; set; }
}

public sealed class LearningFlowAnswerEvent
{
    public string ItemId { get; set; } = string.Empty;
    public DateTimeOffset AnsweredAt { get; set; }
    public LearningFlowAnswer Answer { get; set; } = new();
}

public sealed class LearningFlowAnswer
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? CorrectCodes { get; set; }
    public List<string> Codes { get; set; } = [];
    public bool Correct { get; set; }
    public string Feedback { get; set; } = string.Empty;
}
