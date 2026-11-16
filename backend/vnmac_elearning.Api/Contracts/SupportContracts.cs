using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Contracts;

public sealed class CreateSupportTicketForm
{
    public string Subject { get; init; } = string.Empty;
    public SupportTicketCategory Category { get; init; }
    public string Description { get; init; } = string.Empty;
    public IFormFile? Attachment { get; init; }
}

public sealed record SupportTicketResponse(
    string Id, string Code, string LearnerUserId, string LearnerName, string PhoneNumber,
    string Group, string Province, SupportTicketCategory Category, string Subject,
    string Description, string? AttachmentUrl, SupportTicketStatus Status,
    string? AssignedUserId, string? AssignedUserName, string? AdminResponse,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, DateTimeOffset? ResolvedAt);

public sealed record SupportTicketListResponse(
    IReadOnlyList<SupportTicketResponse> Items, int TotalItems, int NewCount,
    int InProgressCount, int OverdueCount, int ResolvedCount, int Page, int PageSize);

public sealed record UpdateSupportTicketRequest(
    SupportTicketStatus Status, string? AssignedUserId, string? AdminResponse);

public sealed record SupportFaqResponse(string Question, string Answer);
public sealed record SupportInfoResponse(
    string Email, string Phone, string WorkingHours, string OperatorName,
    IReadOnlyList<SupportFaqResponse> Faqs);
