namespace vnmac_elearning.Api.Domain;

public sealed class SystemSettings
{
    public string Id { get; set; } = "default";
    public string SiteTitle { get; set; } = "RAPPORT Project";
    public string HeaderTitle { get; set; } = "RAPPORT PROJECT";
    public string HeaderSubtitle { get; set; } = "DU AN GIAO DUC NGUY CO BOM MIN VAT NO VA THAY DOI HANH VI XA HOI";
    public string ProjectLogoUrl { get; set; } = string.Empty;
    public string LoginLogoUrl { get; set; } = string.Empty;
    public string VnmacLogoUrl { get; set; } = string.Empty;
    public string VietnamFlagUrl { get; set; } = string.Empty;
    public string UsFlagUrl { get; set; } = string.Empty;
    public string CrsLogoUrl { get; set; } = string.Empty;
    public string HeaderBackgroundColor { get; set; } = "#ffffff";
    public string HeaderBackgroundImageUrl { get; set; } = string.Empty;
    public string LoginBackgroundImageUrl { get; set; } = string.Empty;
    public string CertificateTemplateUrl { get; set; } = string.Empty;
    public string CertificateTitle { get; set; } = "CHUNG NHAN";
    public string CertificateCourseTitle { get; set; } = "GIAO DUC NGUY CO BOM MIN, VAT NO VA THAY DOI HANH VI XA HOI";
    public DateTimeOffset UpdatedAt { get; set; }
    public string UpdatedByUserId { get; set; } = string.Empty;
}
