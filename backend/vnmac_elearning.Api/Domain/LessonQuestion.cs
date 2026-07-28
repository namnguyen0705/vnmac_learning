namespace vnmac_elearning.Api.Domain;

public sealed class LessonQuestion
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public int Order { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string? Statement { get; set; }
    public string? MediaTitle { get; set; }
    public string? MediaUrl { get; set; }
    public string? ScenarioTitle { get; set; }
    public string? ScenarioContext { get; set; }
    public List<LessonQuestionOption> Options { get; set; } = [];
    public List<LessonQuestionHotspotTarget> HotspotTargets { get; set; } = [];
    public List<LessonQuestionDragItem> DragItems { get; set; } = [];
    public List<LessonQuestionDragTarget> DragTargets { get; set; } = [];
    public List<LessonQuestionDragPair> CorrectPairs { get; set; } = [];
}
