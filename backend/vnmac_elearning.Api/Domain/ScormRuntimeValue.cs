namespace vnmac_elearning.Api.Domain;

public sealed class ScormRuntimeValue
{
    public string UserId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string ScoId { get; set; } = string.Empty;
    public string Element { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; }
}
