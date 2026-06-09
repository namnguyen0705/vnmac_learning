namespace vnmac_elearning.Api.Domain;

public sealed class ScormRuntimeEvent
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Element { get; set; }
    public string? Value { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
