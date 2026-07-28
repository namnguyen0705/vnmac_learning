using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace vnmac_elearning.Api.Domain;

public sealed class User
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastLogin { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public bool CreatedByAdmin { get; set; }
    public bool IsLocked { get; set; }
    public UserRole Role { get; set; }
    public string? RoleId { get; set; }
    [NotMapped]
    public string RoleName { get; set; } = string.Empty;
    [NotMapped]
    public bool HasAdminAccess { get; set; }
    [NotMapped]
    public IReadOnlyCollection<string> Permissions { get; set; } = [];
    public string Province { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;

    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;
}
