using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class EmailSender(IOptions<EmailOptions> options, ILogger<EmailSender> logger)
{
    private readonly EmailOptions settings = options.Value;

    public async Task SendAccountActivationAsync(User user, string rawToken, DateTimeOffset expiresAt)
    {
        var activationUrl =
            $"{settings.PublicAppUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(rawToken)}";

        if (string.Equals(settings.DeliveryMethod, "Log", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Email delivery is in Log mode. Activation link for {Email}: {ActivationUrl}",
                user.Email,
                activationUrl);
            return;
        }

        ValidateSmtpSettings();

        using var message = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName, Encoding.UTF8),
            Subject = "Kích hoạt tài khoản VNMAC E-Learning",
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true,
            Body = BuildActivationEmail(user, activationUrl, expiresAt)
        };
        message.To.Add(new MailAddress(user.Email, user.FullName, Encoding.UTF8));

        using var smtpClient = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.EnableSsl,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(settings.Username, settings.Password)
        };

        await smtpClient.SendMailAsync(message);
    }

    private void ValidateSmtpSettings()
    {
        if (string.IsNullOrWhiteSpace(settings.Host) ||
            string.IsNullOrWhiteSpace(settings.FromAddress) ||
            string.IsNullOrWhiteSpace(settings.Username) ||
            string.IsNullOrWhiteSpace(settings.Password))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình SMTP. Hãy thiết lập Email:Host, Username, Password và FromAddress.");
        }
    }

    private static string BuildActivationEmail(User user, string activationUrl, DateTimeOffset expiresAt)
    {
        var safeName = WebUtility.HtmlEncode(user.FullName);
        var safeUrl = WebUtility.HtmlEncode(activationUrl);
        var expiry = expiresAt.ToLocalTime().ToString("dd/MM/yyyy HH:mm");

        return $$"""
            <!doctype html>
            <html lang="vi">
            <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
              <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:18px;padding:32px">
                <h1 style="font-size:22px;margin:0 0 18px">Kích hoạt tài khoản VNMAC E-Learning</h1>
                <p>Xin chào {{safeName}},</p>
                <p>Tài khoản của bạn đã được tạo. Bấm nút bên dưới để xác nhận email và kích hoạt tài khoản.</p>
                <p style="margin:28px 0">
                  <a href="{{safeUrl}}" style="background:#1d4ed8;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:700">
                    Kích hoạt tài khoản
                  </a>
                </p>
                <p style="font-size:13px;color:#64748b">Liên kết hết hạn lúc {{expiry}}. Nếu nút không hoạt động, hãy sao chép liên kết sau:</p>
                <p style="font-size:13px;word-break:break-all"><a href="{{safeUrl}}">{{safeUrl}}</a></p>
                <p style="font-size:13px;color:#64748b">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.</p>
              </div>
            </body>
            </html>
            """;
    }
}
