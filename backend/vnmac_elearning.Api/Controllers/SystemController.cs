using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/system")]
public sealed class SystemController(SystemSettingsService settingsService) : ControllerBase
{
    [HttpGet("settings")]
    public ActionResult<SystemSettingsResponse> GetSettings()
    {
        return Ok(settingsService.GetSettings());
    }
}
