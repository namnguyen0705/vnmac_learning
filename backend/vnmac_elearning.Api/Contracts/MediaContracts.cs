namespace vnmac_elearning.Api.Contracts;

public sealed class MediaUploadResponse
{
    public required string FileName { get; init; }

    public required string OriginalFileName { get; init; }

    public required string Url { get; init; }

    public required string ContentType { get; init; }

    public long SizeBytes { get; init; }

    public required string MediaType { get; init; }
}
