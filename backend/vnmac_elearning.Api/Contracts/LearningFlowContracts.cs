namespace vnmac_elearning.Api.Contracts;

public sealed class LearningFlowActionRequest
{
    public long Revision { get; set; }
    public string StepId { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public int? TargetIndex { get; set; }
    public List<string> Codes { get; set; } = [];
    public double PositionSeconds { get; set; }
    public double? X { get; set; }
    public double? Y { get; set; }
}
