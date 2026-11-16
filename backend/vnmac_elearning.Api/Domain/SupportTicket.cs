namespace vnmac_elearning.Api.Domain;

public enum SupportTicketStatus { New, InProgress, WaitingForLearner, Resolved, Closed }

public enum SupportTicketCategory { Account, CourseContent, LearningProgress, Quiz, Certificate, Other }

public sealed class SupportTicket
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string LearnerUserId { get; set; }
    public SupportTicketCategory Category { get; set; }
    public required string Subject { get; set; }
    public required string Description { get; set; }
    public string? AttachmentUrl { get; set; }
    public SupportTicketStatus Status { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AdminResponse { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
