namespace vnmac_elearning.Api.Domain;

public sealed class LessonQuestionHotspotTarget
{
    public string QuestionId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Order { get; set; }
    public HotspotShape Shape { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Radius { get; set; }
    public bool IsCorrect { get; set; }
}
