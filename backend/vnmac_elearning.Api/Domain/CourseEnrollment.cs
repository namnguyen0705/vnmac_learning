namespace vnmac_elearning.Api.Domain;

public sealed class CourseEnrollment
{
    public string UserId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public DateTimeOffset EnrolledAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? LastAccessedAt { get; set; }
    public CourseEnrollmentStatus Status { get; set; }
}
