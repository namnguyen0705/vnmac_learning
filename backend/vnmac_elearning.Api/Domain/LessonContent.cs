namespace vnmac_elearning.Api.Domain;

public sealed class LessonContent
{
    public string Summary { get; set; } = string.Empty;
    public string CoreMessage { get; set; } = string.Empty;
    public string MainContentType { get; set; } = "Video hoặc slide";
    public List<LessonContentStep> Steps { get; set; } = [];
    public List<string> Objectives { get; set; } = [];
    public List<string> MainPoints { get; set; } = [];
    public List<string> InteractionTypes { get; set; } = [];
    public List<LessonContentActivity> Activities { get; set; } = [];
    public List<string> ReinforcementPoints { get; set; } = [];
    public LessonContentQuiz Quiz { get; set; } = new();
    public LessonCompletionContent Completion { get; set; } = new();
}

public sealed class LessonContentStep
{
    public string Key { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Label { get; set; } = string.Empty;
    public string ScreenType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ProgressPercent { get; set; }
    public bool IsRequired { get; set; } = true;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Instruction { get; set; } = string.Empty;
    public string AlertText { get; set; } = string.Empty;
    public string PrimaryActionLabel { get; set; } = string.Empty;
    public string SecondaryActionLabel { get; set; } = string.Empty;
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string PosterUrl { get; set; } = string.Empty;
    public string CaptionUrl { get; set; } = string.Empty;
    public string MediaAlt { get; set; } = string.Empty;
    public string ObjectiveImageUrl { get; set; } = string.Empty;
    public string ObjectiveImageAlt { get; set; } = string.Empty;
    public string ExplanationTitle { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public List<string> Points { get; set; } = [];
    public List<string> Tips { get; set; } = [];
    public List<string> Items { get; set; } = [];
    public List<string> Targets { get; set; } = [];
    public List<string> Options { get; set; } = [];
    public List<LessonContentDragQuestion> DragQuestions { get; set; } = [];
    public List<LessonContentCheckQuestion> Questions { get; set; } = [];
    public string Feedback { get; set; } = string.Empty;
}

public sealed class LessonContentActivity
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instruction { get; set; } = string.Empty;
    public List<string> Items { get; set; } = [];
    public List<string> Targets { get; set; } = [];
    public string Feedback { get; set; } = string.Empty;
}

public sealed class LessonContentDragQuestion
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tone { get; set; } = "blue";
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageAlt { get; set; } = string.Empty;
    public List<LessonContentDragAnswer> Answers { get; set; } = [];
}

public sealed class LessonContentDragAnswer
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageAlt { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
}

public sealed class LessonContentCheckQuestion
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string ImageAlt { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
    public List<LessonContentCheckOption> Options { get; set; } = [];
}

public sealed class LessonContentCheckOption
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Order { get; set; }
    public string Label { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public sealed class LessonContentQuiz
{
    public int QuestionCount { get; set; } = 5;
    public int PassScore { get; set; } = 100;
    public string Description { get; set; } = string.Empty;
}

public sealed class LessonCompletionContent
{
    public string Title { get; set; } = "Hoàn thành";
    public string Message { get; set; } = string.Empty;
    public string NextActionLabel { get; set; } = "Sang bài tiếp theo";
}
