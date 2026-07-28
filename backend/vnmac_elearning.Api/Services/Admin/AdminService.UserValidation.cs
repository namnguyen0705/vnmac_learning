using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    private void EnsureUniqueUserFields(string normalizedUsername, string normalizedEmail, string normalizedPhoneNumber, string? exceptUserId = null)
    {
        var duplicateUsername = dbContext.Users.Any(item =>
            item.Username == normalizedUsername &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicateUsername)
        {
            throw new ServiceException(ServiceErrors.AuthUsernameAlreadyExists);
        }

        var duplicateEmail = dbContext.Users.Any(item =>
            item.Email == normalizedEmail &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicateEmail)
        {
            throw new ServiceException(ServiceErrors.AuthEmailAlreadyExists);
        }

        var duplicatePhoneNumber = dbContext.Users.Any(item =>
            item.PhoneNumber == normalizedPhoneNumber &&
            (exceptUserId == null || item.Id != exceptUserId));
        if (duplicatePhoneNumber)
        {
            throw new ServiceException(ServiceErrors.AuthPhoneNumberAlreadyExists);
        }
    }

    private static void ValidateUserFields(
        string username,
        string email,
        string fullName,
        string phoneNumber,
        string? password,
        bool requirePassword)
    {
        ValidateText(username, ServiceErrors.AuthInvalidUsername);

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidEmail);
        }

        try
        {
            _ = new MailAddress(email.Trim());
        }
        catch
        {
            throw new ServiceException(ServiceErrors.AuthInvalidEmail);
        }

        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 4)
        {
            throw new ServiceException(ServiceErrors.AuthInvalidFullName);
        }

        var normalizedPhoneNumber = AuthService.NormalizePhoneNumber(phoneNumber);
        if (normalizedPhoneNumber.Length is < 9 or > 11 || !normalizedPhoneNumber.All(char.IsDigit))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPhoneNumber);
        }

        if (requirePassword && string.IsNullOrWhiteSpace(password))
        {
            throw new ServiceException(ServiceErrors.AuthInvalidPassword);
        }

        if (!string.IsNullOrWhiteSpace(password) && password.Trim().Length < 8)
        {
            throw new ServiceException(ServiceErrors.AuthWeakPassword);
        }
    }

    private void TrackAdmin(string action, string entityType, string entityId, string summary, object? detail = null)
    {
        auditLogService.Track("admin-1", "admin", action, entityType, entityId, summary, detail);
    }

    private static string EscapeCsv(string value)
    {
        return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}
