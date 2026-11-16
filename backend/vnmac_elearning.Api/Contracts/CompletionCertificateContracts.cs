namespace vnmac_elearning.Api.Contracts;

public sealed class ConfirmCompletionCertificateRequest
{
    public string FullName { get; set; } = "";
    public string Address { get; set; } = "";
    public string TemplateVersion { get; set; } = "";
    public bool Confirmed { get; set; }
}
