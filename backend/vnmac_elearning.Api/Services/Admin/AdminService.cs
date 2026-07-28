using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;
public sealed partial class AdminService
{
    private readonly TrainingDbContext dbContext;
    private readonly LearningService learningService;
    private readonly PasswordService passwordService;
    private readonly TimeProvider timeProvider;
    private readonly AuditLogService auditLogService;
    private readonly RoleService roleService;

    public AdminService(
        TrainingDbContext dbContext,
        LearningService learningService,
        PasswordService passwordService,
        TimeProvider timeProvider,
        AuditLogService auditLogService,
        RoleService roleService)
    {
        this.dbContext = dbContext;
        this.learningService = learningService;
        this.passwordService = passwordService;
        this.timeProvider = timeProvider;
        this.auditLogService = auditLogService;
        this.roleService = roleService;
    }
}
