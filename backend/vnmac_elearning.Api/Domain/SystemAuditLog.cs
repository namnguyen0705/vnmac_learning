namespace vnmac_elearning.Api.Domain;

public sealed class SystemAuditLog
{
    public string Id { get; set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; set; }
    public string ActorUserId { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public UserRole? ActorRole { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string DetailJson { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
}
