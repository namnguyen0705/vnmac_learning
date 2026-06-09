namespace vnmac_elearning.Api.Domain;

public sealed class ScormPackage
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public ScormVersion Version { get; set; }
    public string Identifier { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string EntryPath { get; set; } = string.Empty;
    public string? LaunchScoId { get; set; }
    public string? ManifestVersion { get; set; }
    public List<ScormSco> Scos { get; set; } = [];
}
