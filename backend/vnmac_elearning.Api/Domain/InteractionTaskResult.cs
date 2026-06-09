namespace vnmac_elearning.Api.Domain;

public sealed class InteractionTaskResult
{
    public string TaskId { get; set; } = string.Empty;
    public bool Correct { get; set; }
    public string Explanation { get; set; } = string.Empty;
}
