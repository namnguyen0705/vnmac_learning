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
    private void SaveChangesIfNeeded()
    {
        if (dbContext.ChangeTracker.HasChanges())
        {
            dbContext.SaveChanges();
        }
    }

    private static string Normalize(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string NormalizeElement(string value)
    {
        return Normalize(value);
    }

    private static string NormalizeUrlPath(string value)
    {
        return value.Trim().TrimStart('/').Replace('\\', '/');
    }
}
