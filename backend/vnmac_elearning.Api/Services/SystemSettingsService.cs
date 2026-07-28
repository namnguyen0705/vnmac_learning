using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class SystemSettingsService(
    TrainingDbContext dbContext,
    TimeProvider timeProvider,
    AuditLogService auditLogService)
{
    private const string DefaultSettingsId = "default";

    public SystemSettingsResponse GetSettings()
    {
        return Map(GetOrCreateSettingsInternal());
    }

    public SystemSettingsResponse UpdateSettings(UpdateSystemSettingsRequest request, string? actorUserId)
    {
        var settings = GetOrCreateSettingsInternal();
        settings.SiteTitle = Clean(request.SiteTitle, "RAPPORT Project");
        settings.HeaderTitle = Clean(request.HeaderTitle, "RAPPORT PROJECT");
        settings.HeaderSubtitle = Clean(request.HeaderSubtitle, "DU AN GIAO DUC NGUY CO BOM MIN VAT NO VA THAY DOI HANH VI XA HOI");
        settings.ProjectLogoUrl = CleanUrl(request.ProjectLogoUrl);
        settings.LoginLogoUrl = CleanUrl(request.LoginLogoUrl);
        settings.VnmacLogoUrl = CleanUrl(request.VnmacLogoUrl);
        settings.VietnamFlagUrl = CleanUrl(request.VietnamFlagUrl);
        settings.UsFlagUrl = CleanUrl(request.UsFlagUrl);
        settings.CrsLogoUrl = CleanUrl(request.CrsLogoUrl);
        settings.HeaderBackgroundColor = Clean(request.HeaderBackgroundColor, "#ffffff");
        settings.HeaderBackgroundImageUrl = CleanUrl(request.HeaderBackgroundImageUrl);
        settings.LoginBackgroundImageUrl = CleanUrl(request.LoginBackgroundImageUrl);
        settings.CertificateTemplateUrl = CleanUrl(request.CertificateTemplateUrl);
        settings.CertificateTitle = Clean(request.CertificateTitle, "CHUNG NHAN");
        settings.CertificateCourseTitle = Clean(request.CertificateCourseTitle, "GIAO DUC NGUY CO BOM MIN, VAT NO VA THAY DOI HANH VI XA HOI");
        settings.UpdatedAt = timeProvider.GetUtcNow();
        settings.UpdatedByUserId = actorUserId?.Trim() ?? string.Empty;

        auditLogService.Track(
            actorUserId,
            "settings",
            "update",
            nameof(SystemSettings),
            settings.Id,
            "Cap nhat cau hinh chung",
            new
            {
                settings.SiteTitle,
                settings.HeaderTitle,
                hasProjectLogo = !string.IsNullOrWhiteSpace(settings.ProjectLogoUrl),
                hasCertificateTemplate = !string.IsNullOrWhiteSpace(settings.CertificateTemplateUrl)
            });
        dbContext.SaveChanges();

        return Map(settings);
    }

    private SystemSettings GetOrCreateSettingsInternal()
    {
        var settings = dbContext.SystemSettings.SingleOrDefault(item => item.Id == DefaultSettingsId);
        if (settings is not null)
        {
            return settings;
        }

        settings = new SystemSettings
        {
            Id = DefaultSettingsId,
            UpdatedAt = timeProvider.GetUtcNow(),
            UpdatedByUserId = "system"
        };
        dbContext.SystemSettings.Add(settings);
        dbContext.SaveChanges();
        return settings;
    }

    private static SystemSettingsResponse Map(SystemSettings settings)
    {
        return new SystemSettingsResponse
        {
            SiteTitle = settings.SiteTitle,
            HeaderTitle = settings.HeaderTitle,
            HeaderSubtitle = settings.HeaderSubtitle,
            ProjectLogoUrl = settings.ProjectLogoUrl,
            LoginLogoUrl = settings.LoginLogoUrl,
            VnmacLogoUrl = settings.VnmacLogoUrl,
            VietnamFlagUrl = settings.VietnamFlagUrl,
            UsFlagUrl = settings.UsFlagUrl,
            CrsLogoUrl = settings.CrsLogoUrl,
            HeaderBackgroundColor = settings.HeaderBackgroundColor,
            HeaderBackgroundImageUrl = settings.HeaderBackgroundImageUrl,
            LoginBackgroundImageUrl = settings.LoginBackgroundImageUrl,
            CertificateTemplateUrl = settings.CertificateTemplateUrl,
            CertificateTitle = settings.CertificateTitle,
            CertificateCourseTitle = settings.CertificateCourseTitle,
            UpdatedAt = settings.UpdatedAt,
            UpdatedByUserId = settings.UpdatedByUserId
        };
    }

    private static string Clean(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static string CleanUrl(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }
}
