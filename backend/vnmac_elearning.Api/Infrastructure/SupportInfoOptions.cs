namespace vnmac_elearning.Api.Infrastructure;

public sealed class SupportInfoOptions
{
    public const string SectionName = "SupportInfo";
    public string Email { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string WorkingHours { get; init; } = string.Empty;
    public string OperatorName { get; init; } = string.Empty;
    public List<SupportFaqOptions> Faqs { get; init; } = [];
}

public sealed class SupportFaqOptions
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
}
