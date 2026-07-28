using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/roles")]
public sealed class RolesController(RoleService roleService) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyCollection<RoleResponse>> GetRoles() => Ok(roleService.GetRoles());

    [HttpPost]
    public ActionResult<RoleResponse> Create([FromBody] UpsertRoleRequest request) =>
        Ok(roleService.Create(request));

    [HttpPut("{roleId}")]
    public ActionResult<RoleResponse> Update(string roleId, [FromBody] UpsertRoleRequest request) =>
        Ok(roleService.Update(roleId, request));

    [HttpDelete("{roleId}")]
    public IActionResult Delete(string roleId)
    {
        roleService.Delete(roleId);
        return NoContent();
    }

    [HttpPut("users/{userId}")]
    public IActionResult AssignUser(string userId, [FromBody] AssignUserRoleRequest request)
    {
        roleService.AssignUser(userId, request.RoleId);
        return NoContent();
    }
}
