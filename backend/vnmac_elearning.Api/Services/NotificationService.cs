using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class NotificationService(
    TrainingDbContext dbContext,
    TimeProvider timeProvider,
    NotificationRealtimeService notificationRealtimeService)
{
    private static readonly UserRole[] AdminRoles =
    [
        UserRole.Admin,
        UserRole.ContentManager,
        UserRole.DataViewer
    ];

    public NotificationListResponse GetForUser(User user, int take = 20)
    {
        var normalizedTake = Math.Clamp(take, 1, 50);
        var query = dbContext.Notifications
            .Where(item =>
                (item.Audience == NotificationAudience.Learner && item.RecipientUserId == user.Id) ||
                (item.Audience == NotificationAudience.Admin && AdminRoles.Contains(user.Role)))
            .OrderByDescending(item => item.CreatedAt);

        var items = query
            .Take(normalizedTake)
            .Select(Map)
            .ToArray();

        return new NotificationListResponse
        {
            UnreadCount = query.Count(item => item.ReadAt == null),
            Items = items
        };
    }

    public NotificationListResponse MarkAsRead(User user, string notificationId)
    {
        var notification = GetVisibleNotification(user, notificationId);
        notification.ReadAt ??= timeProvider.GetUtcNow();
        dbContext.SaveChanges();
        return GetForUser(user);
    }

    public NotificationListResponse MarkAllAsRead(User user)
    {
        var now = timeProvider.GetUtcNow();
        var notifications = dbContext.Notifications
            .Where(item =>
                item.ReadAt == null &&
                ((item.Audience == NotificationAudience.Learner && item.RecipientUserId == user.Id) ||
                (item.Audience == NotificationAudience.Admin && AdminRoles.Contains(user.Role))))
            .ToArray();

        foreach (var notification in notifications)
        {
            notification.ReadAt = now;
        }

        if (notifications.Length > 0)
        {
            dbContext.SaveChanges();
        }

        return GetForUser(user);
    }

    public void NotifyLearnerRegistered(User learner)
    {
        AddAdminNotification(
            NotificationType.LearnerRegistered,
            "Học viên mới đăng ký",
            $"{learner.FullName} vừa tạo tài khoản học viên.",
            learner,
            null,
            "/admin/users");
    }

    public void NotifyCourseEnrolled(User learner, Course course)
    {
        AddLearnerNotification(
            learner.Id,
            NotificationType.CourseEnrolled,
            "Đăng ký khóa học thành công",
            $"Bạn đã đăng ký khóa học {course.Title}.",
            learner,
            course,
            $"/app/courses/{course.Id}");

        AddAdminNotification(
            NotificationType.CourseEnrolled,
            "Học viên đăng ký khóa học",
            $"{learner.FullName} vừa đăng ký khóa học {course.Title}.",
            learner,
            course,
            "/admin/tracking");
    }

    public void NotifyCourseCompleted(User learner, Course course)
    {
        AddLearnerNotification(
            learner.Id,
            NotificationType.CourseCompleted,
            "Bạn đã hoàn thành khóa học",
            $"Khóa học {course.Title} đã hoàn thành và chứng chỉ đã được cấp.",
            learner,
            course,
            "/app/certificate");

        AddAdminNotification(
            NotificationType.CourseCompleted,
            "Học viên hoàn thành khóa học",
            $"{learner.FullName} đã hoàn thành khóa học {course.Title}.",
            learner,
            course,
            "/admin/tracking");
    }

    private Notification GetVisibleNotification(User user, string notificationId)
    {
        var notification = dbContext.Notifications.SingleOrDefault(item => item.Id == notificationId);
        if (notification is null)
        {
            throw new ServiceException(ServiceErrors.AuthCurrentUserNotFound);
        }

        var visible =
            notification.Audience == NotificationAudience.Learner && notification.RecipientUserId == user.Id ||
            notification.Audience == NotificationAudience.Admin && AdminRoles.Contains(user.Role);

        if (!visible)
        {
            throw new ServiceException(ServiceErrors.AuthCurrentUserNotFound);
        }

        return notification;
    }

    private void AddLearnerNotification(
        string recipientUserId,
        NotificationType type,
        string title,
        string message,
        User actor,
        Course? course,
        string linkUrl)
    {
        AddNotification(NotificationAudience.Learner, recipientUserId, type, title, message, actor, course, linkUrl);
    }

    private void AddAdminNotification(
        NotificationType type,
        string title,
        string message,
        User actor,
        Course? course,
        string linkUrl)
    {
        AddNotification(NotificationAudience.Admin, null, type, title, message, actor, course, linkUrl);
    }

    private void AddNotification(
        NotificationAudience audience,
        string? recipientUserId,
        NotificationType type,
        string title,
        string message,
        User actor,
        Course? course,
        string linkUrl)
    {
        var notification = new Notification
        {
            Id = $"noti-{Guid.NewGuid():N}"[..24],
            Audience = audience,
            RecipientUserId = recipientUserId,
            Type = type,
            Title = title,
            Message = message,
            ActorUserId = actor.Id,
            ActorName = actor.FullName,
            CourseId = course?.Id,
            CourseTitle = course?.Title,
            LinkUrl = linkUrl,
            CreatedAt = timeProvider.GetUtcNow(),
            ReadAt = null
        };

        dbContext.Notifications.Add(notification);
        notificationRealtimeService.Publish(notification);
    }

    private static NotificationResponse Map(Notification item)
    {
        return new NotificationResponse
        {
            Id = item.Id,
            Audience = item.Audience,
            Type = item.Type,
            Title = item.Title,
            Message = item.Message,
            ActorUserId = item.ActorUserId,
            ActorName = item.ActorName,
            CourseId = item.CourseId,
            CourseTitle = item.CourseTitle,
            LinkUrl = item.LinkUrl,
            CreatedAt = item.CreatedAt,
            ReadAt = item.ReadAt,
            IsRead = item.ReadAt.HasValue
        };
    }
}
