namespace vnmac_elearning.Api.Domain;

public sealed class Certificate
{
    public string UserId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CertificateId { get; set; } = string.Empty;
    public DateTimeOffset IssuedDate { get; set; }
    public string QrCode { get; set; } = string.Empty;
}
