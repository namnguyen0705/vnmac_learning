using System.Collections.Concurrent;
using System.Threading.Channels;
using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Services;

public sealed record NotificationRealtimeEvent(
    string Id,
    NotificationAudience Audience,
    string? RecipientUserId,
    NotificationType Type,
    DateTimeOffset CreatedAt);

public sealed class NotificationRealtimeService
{
    private static readonly UserRole[] AdminRoles =
    [
        UserRole.Admin,
        UserRole.ContentManager,
        UserRole.DataViewer
    ];

    private readonly ConcurrentDictionary<string, Subscription> _subscriptions = new(StringComparer.Ordinal);

    public async IAsyncEnumerable<NotificationRealtimeEvent> Subscribe(
        User user,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var subscription = new Subscription(GetChannelKey(user), Channel.CreateUnbounded<NotificationRealtimeEvent>());
        _subscriptions[subscription.Id] = subscription;

        try
        {
            while (true)
            {
                NotificationRealtimeEvent item;
                try
                {
                    item = await subscription.Channel.Reader.ReadAsync(cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    yield break;
                }

                yield return item;
            }
        }
        finally
        {
            _subscriptions.TryRemove(subscription.Id, out _);
        }
    }

    public void Publish(Notification notification)
    {
        var channelKey = notification.Audience == NotificationAudience.Admin
            ? "admin"
            : $"user:{notification.RecipientUserId}";

        var payload = new NotificationRealtimeEvent(
            notification.Id,
            notification.Audience,
            notification.RecipientUserId,
            notification.Type,
            notification.CreatedAt);

        foreach (var subscription in _subscriptions.Values)
        {
            if (subscription.ChannelKey == channelKey)
            {
                subscription.Channel.Writer.TryWrite(payload);
            }
        }
    }

    private static string GetChannelKey(User user)
    {
        return AdminRoles.Contains(user.Role) ? "admin" : $"user:{user.Id}";
    }

    private sealed record Subscription(string ChannelKey, Channel<NotificationRealtimeEvent> Channel)
    {
        public string Id { get; } = Guid.NewGuid().ToString("N");
    }
}
