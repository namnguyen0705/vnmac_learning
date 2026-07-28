using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class NotificationService(
    TrainingDbContext dbContext,
    TimeProvider timeProvider,
    NotificationRealtimeService notificationRealtimeService,
    AuditLogService auditLogService)
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

    public AdminNotificationListResponse GetAdminNotifications(
        string? search,
        NotificationAudience? audience,
        NotificationType? type,
        bool? unreadOnly,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 100);

        var baseQuery = dbContext.Notifications.AsNoTracking();
        var query = baseQuery;

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(item =>
                item.Title.Contains(keyword) ||
                item.Message.Contains(keyword) ||
                (item.ActorName != null && item.ActorName.Contains(keyword)) ||
                (item.CourseTitle != null && item.CourseTitle.Contains(keyword)) ||
                (item.RecipientUserId != null && item.RecipientUserId.Contains(keyword)));
        }

        if (audience.HasValue)
        {
            query = query.Where(item => item.Audience == audience.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(item => item.Type == type.Value);
        }

        if (unreadOnly == true)
        {
            query = query.Where(item => item.ReadAt == null);
        }

        var totalItems = query.Count();
        var pageItems = query
            .OrderByDescending(item => item.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();
        var recipientMap = BuildRecipientNameMap(pageItems);

        return new AdminNotificationListResponse
        {
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            UnreadCount = query.Count(item => item.ReadAt == null),
            LearnerAudienceCount = baseQuery.Count(item => item.Audience == NotificationAudience.Learner),
            AdminAudienceCount = baseQuery.Count(item => item.Audience == NotificationAudience.Admin),
            Items = pageItems.Select(item => MapAdmin(item, recipientMap)).ToArray()
        };
    }

    public AdminNotificationResponse CreateAdminNotification(
        CreateAdminNotificationRequest request,
        string? actorUserId,
        string ipAddress,
        string userAgent)
    {
        var title = NormalizeText(request.Title);
        var message = NormalizeText(request.Message);
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(message))
        {
            throw new ServiceException(ServiceErrors.AdminNotificationInvalid);
        }

        var actor = ResolveActor(actorUserId);
        var now = timeProvider.GetUtcNow();
        var linkUrl = string.IsNullOrWhiteSpace(request.LinkUrl)
            ? request.Audience == NotificationAudience.Learner ? "/app/dashboard" : "/admin/system-logs"
            : request.LinkUrl.Trim();

        var created = request.Audience == NotificationAudience.Admin
            ? [BuildNotification(NotificationAudience.Admin, null, request.Type, title, message, actor, null, linkUrl, now)]
            : ResolveLearnerRecipients(request.RecipientUserIds)
                .Select(recipient => BuildNotification(NotificationAudience.Learner, recipient.Id, request.Type, title, message, actor, null, linkUrl, now))
                .ToArray();

        if (created.Length == 0)
        {
            throw new ServiceException(ServiceErrors.AdminUserNotFound);
        }

        dbContext.Notifications.AddRange(created);
        auditLogService.Track(
            actor?.Id,
            "notification",
            "create",
            nameof(Notification),
            created[0].Id,
            $"Tao thong bao {title}",
            new
            {
                request.Audience,
                request.Type,
                RecipientCount = created.Length,
                request.RecipientUserIds,
                LinkUrl = linkUrl
            },
            ipAddress,
            userAgent);
        dbContext.SaveChanges();

        foreach (var notification in created)
        {
            notificationRealtimeService.Publish(notification);
        }

        var recipientMap = BuildRecipientNameMap(created);
        return MapAdmin(created[0], recipientMap);
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
        var notification = BuildNotification(audience, recipientUserId, type, title, message, actor, course, linkUrl, timeProvider.GetUtcNow());

        dbContext.Notifications.Add(notification);
        notificationRealtimeService.Publish(notification);
    }

    private Notification BuildNotification(
        NotificationAudience audience,
        string? recipientUserId,
        NotificationType type,
        string title,
        string message,
        User? actor,
        Course? course,
        string linkUrl,
        DateTimeOffset createdAt)
    {
        return new Notification
        {
            Id = $"noti-{Guid.NewGuid():N}"[..24],
            Audience = audience,
            RecipientUserId = recipientUserId,
            Type = type,
            Title = title,
            Message = message,
            ActorUserId = actor?.Id,
            ActorName = actor?.FullName,
            CourseId = course?.Id,
            CourseTitle = course?.Title,
            LinkUrl = linkUrl,
            CreatedAt = createdAt,
            ReadAt = null
        };
    }

    private User? ResolveActor(string? actorUserId)
    {
        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            return null;
        }

        return dbContext.Users.SingleOrDefault(user => user.Id == actorUserId.Trim());
    }

    private IReadOnlyCollection<User> ResolveLearnerRecipients(IReadOnlyCollection<string> requestedRecipientIds)
    {
        var recipientIds = requestedRecipientIds
            .Select(item => item.Trim())
            .Where(item => item.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var query = dbContext.Users.Where(user => user.Role == UserRole.Learner);
        if (recipientIds.Length > 0)
        {
            query = query.Where(user => recipientIds.Contains(user.Id));
        }

        var recipients = query
            .OrderBy(user => user.FullName)
            .ToArray();

        if (recipientIds.Length > 0 && recipients.Length != recipientIds.Length)
        {
            throw new ServiceException(ServiceErrors.AdminUserNotFound);
        }

        return recipients;
    }

    private IReadOnlyDictionary<string, string> BuildRecipientNameMap(IReadOnlyCollection<Notification> notifications)
    {
        var recipientIds = notifications
            .Select(item => item.RecipientUserId)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (recipientIds.Length == 0)
        {
            return new Dictionary<string, string>();
        }

        return dbContext.Users
            .AsNoTracking()
            .Where(user => recipientIds.Contains(user.Id))
            .ToDictionary(user => user.Id, user => user.FullName);
    }

    private static AdminNotificationResponse MapAdmin(Notification item, IReadOnlyDictionary<string, string> recipientMap)
    {
        return new AdminNotificationResponse
        {
            Id = item.Id,
            Audience = item.Audience,
            RecipientUserId = item.RecipientUserId,
            RecipientName = item.RecipientUserId is not null && recipientMap.TryGetValue(item.RecipientUserId, out var recipientName)
                ? recipientName
                : string.Empty,
            Type = item.Type,
            Title = item.Title,
            Message = item.Message,
            ActorName = item.ActorName ?? string.Empty,
            CourseTitle = item.CourseTitle ?? string.Empty,
            LinkUrl = item.LinkUrl ?? string.Empty,
            CreatedAt = item.CreatedAt,
            ReadAt = item.ReadAt,
            IsRead = item.ReadAt.HasValue
        };
    }

    private static string NormalizeText(string value)
    {
        return value.Trim();
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
