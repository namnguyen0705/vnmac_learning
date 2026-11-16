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
        if (request.PublicContentJson is not null)
        {
            try { using var document = System.Text.Json.JsonDocument.Parse(request.PublicContentJson); if (document.RootElement.ValueKind != System.Text.Json.JsonValueKind.Object) throw new System.Text.Json.JsonException(); }
            catch (System.Text.Json.JsonException) { throw new ServiceException(new ServiceError("settings.invalid_public_content", "Nội dung trang công khai không hợp lệ.", 400)); }
            settings.PublicContentJson = request.PublicContentJson;
        }
        settings.HomeContentJson = request.HomeContentJson?.Trim() ?? string.Empty;
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
            ProjectLogoUrl = Clean(settings.ProjectLogoUrl, "/branding/rapport.png"),
            LoginLogoUrl = Clean(settings.LoginLogoUrl, Clean(settings.ProjectLogoUrl, "/branding/rapport.png")),
            VnmacLogoUrl = Clean(settings.VnmacLogoUrl, "/branding/vnmac.png"),
            VietnamFlagUrl = Clean(settings.VietnamFlagUrl, "/branding/vietnam.png"),
            UsFlagUrl = Clean(settings.UsFlagUrl, "/branding/us-flag.png"),
            CrsLogoUrl = Clean(settings.CrsLogoUrl, "/branding/crs.png"),
            HeaderBackgroundColor = settings.HeaderBackgroundColor,
            HeaderBackgroundImageUrl = settings.HeaderBackgroundImageUrl,
            LoginBackgroundImageUrl = settings.LoginBackgroundImageUrl,
            CertificateTemplateUrl = settings.CertificateTemplateUrl,
            CertificateTitle = settings.CertificateTitle,
            CertificateCourseTitle = settings.CertificateCourseTitle,
            PublicContentJson = settings.PublicContentJson,
            HomeContentJson = settings.HomeContentJson,
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
