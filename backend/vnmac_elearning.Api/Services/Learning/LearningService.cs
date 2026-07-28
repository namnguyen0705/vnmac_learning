using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;
public sealed partial class LearningService
{
    private readonly TrainingDbContext dbContext;
    private readonly NotificationService notificationService;
    private readonly AuditLogService auditLogService;

    public LearningService(
        TrainingDbContext dbContext,
        NotificationService notificationService,
        AuditLogService auditLogService)
    {
        this.dbContext = dbContext;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    private static readonly HashSet<string> LessonStepKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "intro",
        "video",
        "classify",
        "reinforce",
        "check",
        "complete"
    };
}
