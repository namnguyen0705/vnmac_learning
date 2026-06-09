namespace vnmac_elearning.Api.Domain;

public sealed class Course
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CourseStatus Status { get; set; }
    public List<CourseSection> Sections { get; set; } = [];
    public List<CourseQuiz> Quizzes { get; set; } = [];
}
