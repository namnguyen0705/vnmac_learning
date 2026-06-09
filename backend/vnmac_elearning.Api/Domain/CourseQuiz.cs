namespace vnmac_elearning.Api.Domain;

public sealed class CourseQuiz
{
    public string Id { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string? SectionId { get; set; }
    public string AssessmentLessonId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }
}
