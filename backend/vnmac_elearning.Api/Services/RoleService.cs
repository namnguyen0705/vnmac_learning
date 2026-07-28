using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed class RoleService(TrainingDbContext dbContext, TimeProvider timeProvider)
{
    public static readonly string[] Resources =
    [
        "overview", "courses", "lessons", "questions", "quizzes", "materials",
        "notifications", "users", "roles", "tracking", "reports", "settings", "system-logs"
    ];

    public void InitializeDefaults()
    {
        if (dbContext.AppRoles.Any())
        {
            return;
        }

        var now = timeProvider.GetUtcNow();
        var admin = CreateSystemRole("role-admin", "admin", "Quản trị hệ thống", true, now, Resources);
        var content = CreateSystemRole(
            "role-content-manager", "content-manager", "Quản lý nội dung", false, now,
            ["overview", "courses", "lessons", "questions", "quizzes", "materials", "notifications", "reports"]);
        var viewer = CreateSystemRole(
            "role-data-viewer", "data-viewer", "Theo dõi dữ liệu", false, now,
            ["overview", "tracking", "reports", "system-logs"]);
        var learner = CreateSystemRole("role-learner", "learner", "Học viên", false, now, []);

        dbContext.AppRoles.AddRange(admin, content, viewer, learner);
        foreach (var user in dbContext.Users)
        {
            user.RoleId = user.Role switch
            {
                UserRole.Admin => admin.Id,
                UserRole.ContentManager => content.Id,
                UserRole.DataViewer => viewer.Id,
                _ => learner.Id
            };
        }
        dbContext.SaveChanges();
    }

    public IReadOnlyCollection<RoleResponse> GetRoles()
    {
        return dbContext.AppRoles
            .Include(item => item.Permissions)
            .OrderByDescending(item => item.IsAdmin)
            .ThenBy(item => item.Name)
            .AsEnumerable()
            .Select(Map)
            .ToArray();
    }

    public RoleResponse Create(UpsertRoleRequest request)
    {
        Validate(request);
        var code = NormalizeCode(request.Code);
        if (dbContext.AppRoles.Any(item => item.Code == code))
        {
            throw new ServiceException(ServiceErrors.AdminRoleCodeExists);
        }

        var now = timeProvider.GetUtcNow();
        var role = new AppRole
        {
            Id = $"role-{Guid.NewGuid():N}"[..23],
            Code = code,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            CreatedAt = now,
            UpdatedAt = now,
            IsAdmin = false,
            IsSystem = false,
            Permissions = BuildPermissions(request.Permissions)
        };
        dbContext.AppRoles.Add(role);
        dbContext.SaveChanges();
        return Map(role);
    }

    public RoleResponse Update(string roleId, UpsertRoleRequest request)
    {
        Validate(request);
        var role = GetInternal(roleId);
        var code = NormalizeCode(request.Code);
        if (dbContext.AppRoles.Any(item => item.Id != roleId && item.Code == code))
        {
            throw new ServiceException(ServiceErrors.AdminRoleCodeExists);
        }

        role.Name = request.Name.Trim();
        role.Description = request.Description.Trim();
        if (!role.IsSystem)
        {
            role.Code = code;
        }
        role.UpdatedAt = timeProvider.GetUtcNow();
        if (!role.IsAdmin)
        {
            dbContext.RolePermissions.RemoveRange(role.Permissions);
            role.Permissions = BuildPermissions(request.Permissions);
        }
        dbContext.SaveChanges();
        return Map(role);
    }

    public void Delete(string roleId)
    {
        var role = GetInternal(roleId);
        if (role.IsSystem || dbContext.Users.Any(item => item.RoleId == roleId))
        {
            throw new ServiceException(ServiceErrors.AdminRoleCannotDelete);
        }
        dbContext.AppRoles.Remove(role);
        dbContext.SaveChanges();
    }

    public void AssignUser(string userId, string roleId)
    {
        var user = dbContext.Users.SingleOrDefault(item => item.Id == userId)
            ?? throw new ServiceException(ServiceErrors.AdminUserNotFound);
        var role = GetInternal(roleId);
        user.RoleId = role.Id;
        user.Role = role.Code switch
        {
            "admin" => UserRole.Admin,
            "learner" => UserRole.Learner,
            "content-manager" => UserRole.ContentManager,
            _ => UserRole.DataViewer
        };
        dbContext.SaveChanges();
    }

    public void PopulateAccess(User user)
    {
        var role = user.RoleId is null
            ? null
            : dbContext.AppRoles.Include(item => item.Permissions).SingleOrDefault(item => item.Id == user.RoleId);
        user.RoleName = role?.Name ?? user.Role.ToString();
        user.HasAdminAccess = role?.Code != "learner" && user.Role != UserRole.Learner;
        user.Permissions = role?.IsAdmin == true
            ? Resources.SelectMany(resource => Actions(resource)).ToArray()
            : role?.Permissions.SelectMany(ToClaims).ToArray() ?? [];
    }

    private AppRole GetInternal(string roleId) =>
        dbContext.AppRoles.Include(item => item.Permissions).SingleOrDefault(item => item.Id == roleId)
        ?? throw new ServiceException(ServiceErrors.AdminRoleNotFound);

    private RoleResponse Map(AppRole role) => new()
    {
        Id = role.Id,
        Code = role.Code,
        Name = role.Name,
        Description = role.Description,
        IsSystem = role.IsSystem,
        IsAdmin = role.IsAdmin,
        UserCount = dbContext.Users.Count(item => item.RoleId == role.Id),
        Permissions = role.Permissions.Select(item => new RolePermissionRequest
        {
            Resource = item.Resource,
            CanView = item.CanView,
            CanCreate = item.CanCreate,
            CanUpdate = item.CanUpdate,
            CanDelete = item.CanDelete
        }).ToArray()
    };

    private static AppRole CreateSystemRole(
        string id, string code, string name, bool isAdmin, DateTimeOffset now, IReadOnlyCollection<string> resources) =>
        new()
        {
            Id = id,
            Code = code,
            Name = name,
            Description = name,
            IsSystem = true,
            IsAdmin = isAdmin,
            CreatedAt = now,
            UpdatedAt = now,
            Permissions = resources.Select(resource => new RolePermission
            {
                RoleId = id,
                Resource = resource,
                CanView = true,
                CanCreate = isAdmin || code == "content-manager",
                CanUpdate = isAdmin || code == "content-manager",
                CanDelete = isAdmin || code == "content-manager"
            }).ToArray()
        };

    private static List<RolePermission> BuildPermissions(IEnumerable<RolePermissionRequest> requests) =>
        requests.Where(item => Resources.Contains(item.Resource)).Select(item => new RolePermission
        {
            Resource = item.Resource,
            CanView = item.CanView,
            CanCreate = item.CanCreate,
            CanUpdate = item.CanUpdate,
            CanDelete = item.CanDelete
        }).ToList();

    private static IEnumerable<string> ToClaims(RolePermission permission)
    {
        if (permission.CanView) yield return $"{permission.Resource}.view";
        if (permission.CanCreate) yield return $"{permission.Resource}.create";
        if (permission.CanUpdate) yield return $"{permission.Resource}.update";
        if (permission.CanDelete) yield return $"{permission.Resource}.delete";
    }

    private static IEnumerable<string> Actions(string resource) =>
        new[] { "view", "create", "update", "delete" }.Select(action => $"{resource}.{action}");

    private static void Validate(UpsertRoleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            throw new ServiceException(ServiceErrors.AdminRoleInvalid);
        }
    }

    private static string NormalizeCode(string value) =>
        string.Join("-", value.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}
