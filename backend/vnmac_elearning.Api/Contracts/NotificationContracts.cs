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

public sealed class AdminNotificationListResponse
{
    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalItems { get; init; }

    public int UnreadCount { get; init; }

    public int LearnerAudienceCount { get; init; }

    public int AdminAudienceCount { get; init; }

    public required IReadOnlyCollection<AdminNotificationResponse> Items { get; init; }
}

public sealed class AdminNotificationResponse
{
    public required string Id { get; init; }

    public NotificationAudience Audience { get; init; }

    public string? RecipientUserId { get; init; }

    public string RecipientName { get; init; } = string.Empty;

    public NotificationType Type { get; init; }

    public required string Title { get; init; }

    public required string Message { get; init; }

    public string ActorName { get; init; } = string.Empty;

    public string CourseTitle { get; init; } = string.Empty;

    public string LinkUrl { get; init; } = string.Empty;

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset? ReadAt { get; init; }

    public bool IsRead { get; init; }
}

public sealed class CreateAdminNotificationRequest
{
    public NotificationAudience Audience { get; init; } = NotificationAudience.Learner;

    public NotificationType Type { get; init; } = NotificationType.SystemAnnouncement;

    public string Title { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;

    public string LinkUrl { get; init; } = string.Empty;

    public List<string> RecipientUserIds { get; init; } = [];
}
