namespace vnmac_elearning.Api.Domain;

public sealed class LessonQuestionDragItem
{
    public string QuestionId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Order { get; set; }
}
