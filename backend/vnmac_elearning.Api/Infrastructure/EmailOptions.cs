namespace vnmac_elearning.Api.Infrastructure;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string DeliveryMethod { get; init; } = "Log";
    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public bool EnableSsl { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = "VNMAC E-Learning";
    public string PublicAppUrl { get; init; } = "http://localhost:5173";
}
