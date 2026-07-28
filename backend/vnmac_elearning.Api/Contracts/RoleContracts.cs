namespace vnmac_elearning.Api.Contracts;

public sealed class RolePermissionRequest
{
    public string Resource { get; init; } = string.Empty;
    public bool CanView { get; init; }
    public bool CanCreate { get; init; }
    public bool CanUpdate { get; init; }
    public bool CanDelete { get; init; }
}

public sealed class UpsertRoleRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public IReadOnlyCollection<RolePermissionRequest> Permissions { get; init; } = [];
}

public sealed class RoleResponse
{
    public string Id { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool IsSystem { get; init; }
    public bool IsAdmin { get; init; }
    public int UserCount { get; init; }
    public IReadOnlyCollection<RolePermissionRequest> Permissions { get; init; } = [];
}

public sealed class AssignUserRoleRequest
{
    public string RoleId { get; init; } = string.Empty;
}
