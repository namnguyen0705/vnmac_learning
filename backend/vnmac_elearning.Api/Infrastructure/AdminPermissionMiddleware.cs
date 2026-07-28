using System.Security.Claims;

namespace vnmac_elearning.Api.Infrastructure;

public sealed class AdminPermissionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api/learning/learners") &&
            context.User.Identity?.IsAuthenticated == true &&
            string.Equals(context.User.FindFirstValue("admin_access"), "true", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                key = "auth.learner_access_denied",
                message = "Tài khoản quản trị không được phép tham gia học hoặc làm bài kiểm tra."
            });
            return;
        }

        if (!context.Request.Path.StartsWithSegments("/api/admin"))
        {
            await next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var hasAdminAccess = string.Equals(
            context.User.FindFirstValue("admin_access"),
            "true",
            StringComparison.OrdinalIgnoreCase);
        if (!hasAdminAccess)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                key = "auth.admin_access_required",
                message = "Tài khoản học viên không được phép truy cập khu vực quản trị."
            });
            return;
        }

        if (context.User.IsInRole("Admin"))
        {
            await next(context);
            return;
        }

        var resource = ResolveResource(context.Request.Path);
        var action = context.Request.Method switch
        {
            "GET" or "HEAD" => "view",
            "POST" => "create",
            "PUT" or "PATCH" => "update",
            "DELETE" => "delete",
            _ => "view"
        };
        var required = $"{resource}.{action}";
        var allowed = context.User.FindAll("permission").Any(item => item.Value == required);
        if (!allowed)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                key = "auth.permission_denied",
                message = $"Bạn không có quyền {action} đối với chức năng {resource}."
            });
            return;
        }

        await next(context);
    }

    private static string ResolveResource(PathString path)
    {
        var segment = path.Value?
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Skip(2)
            .FirstOrDefault() ?? "overview";
        return segment switch
        {
            "analytics" => "reports",
            "media" => "materials",
            "user-accounts" or "users" => "users",
            "system-settings" => "settings",
            "audit-logs" => "system-logs",
            _ => segment
        };
    }
}
