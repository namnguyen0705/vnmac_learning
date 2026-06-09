namespace vnmac_elearning.Api.Domain;

public sealed class ScormSco
{
    public string Id { get; set; } = string.Empty;
    public string PackageId { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string LaunchPath { get; set; } = string.Empty;
    public ScormScoType ItemType { get; set; }
    public int Order { get; set; }
    public int? MasteryScore { get; set; }
}
