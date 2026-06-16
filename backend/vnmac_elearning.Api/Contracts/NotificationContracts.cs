using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Contracts;

public sealed class NotificationListResponse
{
    public int UnreadCount { get; init; }

    public required IReadOnlyCollection<NotificationResponse> Items { get; init; }
}

public sealed class NotificationResponse
{
    public required string Id { get; init; }

    public NotificationAudience Audience { get; init; }

    public NotificationType Type { get; init; }

    public required string Title { get; init; }

    public required string Message { get; init; }

    public string? ActorUserId { get; init; }

    public string? ActorName { get; init; }

    public string? CourseId { get; init; }

    public string? CourseTitle { get; init; }

    public string? LinkUrl { get; init; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset? ReadAt { get; init; }

    public bool IsRead { get; init; }
}
