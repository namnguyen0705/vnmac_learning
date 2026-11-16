using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;
using Microsoft.Extensions.Options;

namespace vnmac_elearning.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/support")]
public sealed class SupportController(TrainingDbContext db, TimeProvider timeProvider, IWebHostEnvironment environment, IOptions<SupportInfoOptions> supportInfo) : ControllerBase
{
    [HttpGet("info")]
    [AllowAnonymous]
    public ActionResult<SupportInfoResponse> Info()
    {
        var info = supportInfo.Value;
        var json = db.SystemSettings.AsNoTracking().Where(x => x.Id == "default").Select(x => x.PublicContentJson).FirstOrDefault();
        using var content = System.Text.Json.JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
        string Contact(string key, string fallback) => content.RootElement.TryGetProperty(key, out var value) && value.ValueKind == System.Text.Json.JsonValueKind.String ? value.GetString()! : fallback;
        return Ok(new SupportInfoResponse(
            Contact("email", info.Email), Contact("phone", info.Phone), Contact("workingHours", info.WorkingHours), Contact("operatorName", info.OperatorName),
            info.Faqs.Where(item => !string.IsNullOrWhiteSpace(item.Question))
                .Select(item => new SupportFaqResponse(item.Question.Trim(), item.Answer.Trim()))
                .ToArray()));
    }

    [HttpGet("mine")]
    public ActionResult<IReadOnlyList<SupportTicketResponse>> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var tickets = db.SupportTickets
            .AsNoTracking()
            .Where(x => x.LearnerUserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToArray();
        return Ok(MapTickets(tickets));
    }

    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<SupportTicketResponse>> Create(
        [FromForm] CreateSupportTicketForm request,
        CancellationToken cancellationToken)
    {
        var subject = request.Subject.Trim();
        var description = request.Description.Trim();
        if (subject.Length is < 5 or > 240 || description.Length is < 10 or > 5000)
            return BadRequest(new { message = "Tiêu đề hoặc nội dung yêu cầu chưa hợp lệ." });

        string? attachmentUrl = null;
        if (request.Attachment is not null)
        {
            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(request.Attachment.ContentType) || request.Attachment.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Ảnh đính kèm phải là JPG, PNG hoặc WebP và không quá 5 MB." });
            var extension = request.Attachment.ContentType switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };
            var folder = Path.Combine(environment.WebRootPath, "uploads", "support");
            Directory.CreateDirectory(folder);
            var fileName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(folder, fileName));
            await request.Attachment.CopyToAsync(stream, cancellationToken);
            attachmentUrl = $"/uploads/support/{fileName}";
        }

        var now = timeProvider.GetUtcNow();
        var ticket = new SupportTicket {
            Id = Guid.NewGuid().ToString("N"), Code = ($"HT-{now:yyMMdd}-{Guid.NewGuid():N}")[..18].ToUpperInvariant(),
            LearnerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!, Category = request.Category,
            Subject = subject, Description = description, AttachmentUrl = attachmentUrl,
            Status = SupportTicketStatus.New, CreatedAt = now, UpdatedAt = now
        };
        db.SupportTickets.Add(ticket); await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Mine), MapTickets([ticket]).Single());
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin,ContentManager,DataViewer")]
    public ActionResult<SupportTicketListResponse> AdminList(string? search, SupportTicketStatus? status, SupportTicketCategory? category, int page = 1, int pageSize = 20)
    {
        var query = db.SupportTickets.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Code.Contains(search) || x.Subject.Contains(search) || x.Description.Contains(search));
        if (status.HasValue) query = query.Where(x => x.Status == status);
        if (category.HasValue) query = query.Where(x => x.Category == category);
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 100);
        var now = timeProvider.GetUtcNow();
        var tickets = query.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();
        var response = new SupportTicketListResponse(
            MapTickets(tickets),
            query.Count(), query.Count(x => x.Status == SupportTicketStatus.New),
            query.Count(x => x.Status == SupportTicketStatus.InProgress || x.Status == SupportTicketStatus.WaitingForLearner),
            query.Count(x => x.Status != SupportTicketStatus.Resolved && x.Status != SupportTicketStatus.Closed && x.CreatedAt < now.AddHours(-24)),
            query.Count(x => x.Status == SupportTicketStatus.Resolved || x.Status == SupportTicketStatus.Closed), page, pageSize);
        return Ok(response);
    }

    [HttpPut("admin/{id}")]
    [Authorize(Roles = "Admin,ContentManager")]
    public async Task<ActionResult<SupportTicketResponse>> Update(string id, UpdateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        var ticket = await db.SupportTickets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (ticket is null) return NotFound();
        if (!string.IsNullOrWhiteSpace(request.AssignedUserId) && !await db.Users.AnyAsync(x => x.Id == request.AssignedUserId && x.Role != UserRole.Learner, cancellationToken))
            return BadRequest(new { message = "Người được phân công không hợp lệ." });
        ticket.Status = request.Status; ticket.AssignedUserId = string.IsNullOrWhiteSpace(request.AssignedUserId) ? null : request.AssignedUserId;
        ticket.AdminResponse = string.IsNullOrWhiteSpace(request.AdminResponse) ? null : request.AdminResponse.Trim();
        ticket.UpdatedAt = timeProvider.GetUtcNow();
        ticket.ResolvedAt = request.Status is SupportTicketStatus.Resolved or SupportTicketStatus.Closed ? ticket.UpdatedAt : null;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(MapTickets([ticket]).Single());
    }

    private SupportTicketResponse[] MapTickets(IReadOnlyCollection<SupportTicket> tickets)
    {
        var userIds = tickets
            .SelectMany(ticket => new[] { ticket.LearnerUserId, ticket.AssignedUserId })
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToArray();
        var users = db.Users
            .AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .ToDictionary(user => user.Id);

        return tickets.Select(ticket =>
        {
            users.TryGetValue(ticket.LearnerUserId, out var learner);
            var assignee = ticket.AssignedUserId is not null && users.TryGetValue(ticket.AssignedUserId, out var value)
                ? value
                : null;
            return new SupportTicketResponse(
                ticket.Id, ticket.Code, ticket.LearnerUserId, learner?.FullName ?? "",
                learner?.PhoneNumber ?? "", learner?.Group ?? "", learner?.Province ?? "",
                ticket.Category, ticket.Subject, ticket.Description, ticket.AttachmentUrl,
                ticket.Status, ticket.AssignedUserId, assignee?.FullName, ticket.AdminResponse,
                ticket.CreatedAt, ticket.UpdatedAt, ticket.ResolvedAt);
        }).ToArray();
    }
}
