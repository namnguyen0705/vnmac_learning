namespace vnmac_elearning.Api.Domain;

public sealed class LessonQuestionDragPair
{
    public string QuestionId { get; set; } = string.Empty;
    public string DragItemCode { get; set; } = string.Empty;
    public string DragTargetCode { get; set; } = string.Empty;
}
