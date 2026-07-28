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

public sealed class MediaLibraryItemResponse
{
    public string? Id { get; init; }
    public required string FileName { get; init; }
    public string OriginalFileName { get; init; } = string.Empty;
    public required string Url { get; init; }
    public required string ContentType { get; init; }
    public long SizeBytes { get; init; }
    public required string MediaType { get; init; }
    public DateTimeOffset UploadedAt { get; init; }
    public bool IsPublic { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string ThumbnailUrl { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public List<string> Tags { get; init; } = [];
    public bool IsPublished { get; init; }
    public int SortOrder { get; init; }
    public bool IsInUse => Usages.Count > 0;
    public List<MediaUsageResponse> Usages { get; init; } = [];
}

public sealed class UpsertLibraryDocumentRequest
{
    public required string FileName { get; init; }
    public string OriginalFileName { get; init; } = string.Empty;
    public required string FileUrl { get; init; }
    public required string ContentType { get; init; }
    public long SizeBytes { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public string ThumbnailUrl { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public List<string> Tags { get; init; } = [];
    public bool IsPublished { get; init; } = true;
    public int SortOrder { get; init; }
}

public sealed class UpdateLibraryDocumentRequest
{
    public required string Title { get; init; }
    public string Description { get; init; } = string.Empty;
    public string ThumbnailUrl { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public List<string> Tags { get; init; } = [];
    public bool IsPublished { get; init; }
    public int SortOrder { get; init; }
}

public sealed class MediaUsageResponse
{
    public required string SourceType { get; init; }
    public required string SourceId { get; init; }
    public required string SourceTitle { get; init; }
    public required string Field { get; init; }
    public required string AdminUrl { get; init; }
}
