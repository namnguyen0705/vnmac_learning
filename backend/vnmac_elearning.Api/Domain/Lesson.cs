namespace vnmac_elearning.Api.Domain;

public sealed class Lesson
{
    public string Id { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string SectionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public LessonType Type { get; set; }
    public int Order { get; set; }
    public int DurationMinutes { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public LessonDifficulty Difficulty { get; set; } = LessonDifficulty.Basic;
    public LessonPublicationStatus PublicationStatus { get; set; } = LessonPublicationStatus.Published;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public LessonContent? Content { get; set; }
    public VideoContent? VideoContent { get; set; }
    public LessonAssessment? Assessment { get; set; }
    public ScormPackage? ScormPackage { get; set; }
}
