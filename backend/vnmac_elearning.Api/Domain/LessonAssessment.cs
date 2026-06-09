namespace vnmac_elearning.Api.Domain;

public sealed class LessonAssessment
{
    public string LessonId { get; set; } = string.Empty;
    public string Intro { get; set; } = string.Empty;
    public string RetryHint { get; set; } = string.Empty;
    public int PassScore { get; set; } = 100;
    public bool RandomizeQuestionOrder { get; set; }
    public bool RandomizeOptionOrder { get; set; }
    public List<LessonQuestion> Questions { get; set; } = [];
}
