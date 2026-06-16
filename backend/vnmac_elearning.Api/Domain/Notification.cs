namespace vnmac_elearning.Api.Domain;

public sealed class Notification
{
    public required string Id { get; set; }

    public NotificationAudience Audience { get; set; }

    public string? RecipientUserId { get; set; }

    public NotificationType Type { get; set; }

    public required string Title { get; set; }

    public required string Message { get; set; }

    public string? ActorUserId { get; set; }

    public string? ActorName { get; set; }

    public string? CourseId { get; set; }

    public string? CourseTitle { get; set; }

    public string? LinkUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? ReadAt { get; set; }
}
