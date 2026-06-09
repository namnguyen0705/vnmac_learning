namespace vnmac_elearning.Api.Domain;

public sealed class VideoContent
{
    public string Intro { get; set; } = string.Empty;
    public string VideoUrl { get; set; } = string.Empty;
    public string? PosterUrl { get; set; }
    public string? CaptionsUrl { get; set; }
    public List<string> Objectives { get; set; } = [];
    public List<string> Checkpoints { get; set; } = [];
    public string TranscriptHighlight { get; set; } = string.Empty;
}
