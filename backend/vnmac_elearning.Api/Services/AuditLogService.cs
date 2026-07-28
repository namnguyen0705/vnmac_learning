using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class AuditLogService(TrainingDbContext dbContext, TimeProvider timeProvider)
{
    public void Track(
        string? actorUserId,
        string module,
        string action,
        string entityType,
        string entityId,
        string summary,
        object? detail = null,
        string ipAddress = "",
        string userAgent = "")
    {
        var normalizedActorId = actorUserId?.Trim() ?? string.Empty;
        var actor = string.IsNullOrWhiteSpace(normalizedActorId)
            ? null
            : dbContext.Users.AsNoTracking().SingleOrDefault(user => user.Id == normalizedActorId);

        dbContext.SystemAuditLogs.Add(new SystemAuditLog
        {
            Id = $"audit-{Guid.NewGuid():N}"[..24],
            OccurredAt = timeProvider.GetUtcNow(),
            ActorUserId = normalizedActorId,
            ActorName = actor?.FullName ?? actor?.Username ?? (string.IsNullOrWhiteSpace(normalizedActorId) ? "System" : normalizedActorId),
            ActorRole = actor?.Role,
            Module = Normalize(module, 64),
            Action = Normalize(action, 64),
            EntityType = Normalize(entityType, 80),
            EntityId = Normalize(entityId, 128),
            Summary = Normalize(summary, 512),
            DetailJson = detail is null ? "{}" : JsonStorage.Serialize(detail),
            IpAddress = Normalize(ipAddress, 64),
            UserAgent = Normalize(userAgent, 512)
        });
    }

    public void SaveChanges()
    {
        dbContext.SaveChanges();
    }

    public SystemAuditLogResponse GetLogs(
        string? search,
        string? module,
        string? action,
        string? actorUserId,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 100);

        var baseQuery = dbContext.SystemAuditLogs.AsNoTracking();
        var modules = baseQuery
            .Select(log => log.Module)
            .Where(value => value != string.Empty)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        var actions = baseQuery
            .Select(log => log.Action)
            .Where(value => value != string.Empty)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        var query = baseQuery;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(log =>
                log.Summary.Contains(keyword) ||
                log.ActorName.Contains(keyword) ||
                log.EntityId.Contains(keyword) ||
                log.DetailJson.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(module))
        {
            var value = module.Trim();
            query = query.Where(log => log.Module == value);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var value = action.Trim();
            query = query.Where(log => log.Action == value);
        }

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            var value = actorUserId.Trim();
            query = query.Where(log => log.ActorUserId == value);
        }

        var totalItems = query.Count();
        var items = query
            .OrderByDescending(log => log.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new SystemAuditLogRow
            {
                Id = log.Id,
                OccurredAt = log.OccurredAt,
                ActorUserId = log.ActorUserId,
                ActorName = log.ActorName,
                ActorRole = log.ActorRole,
                Module = log.Module,
                Action = log.Action,
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                Summary = log.Summary,
                DetailJson = log.DetailJson,
                IpAddress = log.IpAddress
            })
            .ToArray();

        return new SystemAuditLogResponse
        {
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            Modules = modules,
            Actions = actions,
            Items = items
        };
    }

    private static string Normalize(string? value, int maxLength)
    {
        var normalized = (value ?? string.Empty).Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }
}
