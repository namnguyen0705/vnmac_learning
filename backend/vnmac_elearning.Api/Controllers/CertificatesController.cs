using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/certificates")]
public sealed class CertificatesController(LearningService learningService) : ControllerBase
{
    [HttpGet("verify/{certificateId}")]
    public ActionResult<CertificateVerificationResponse> VerifyCertificate(string certificateId)
    {
        var response = learningService.VerifyCertificate(certificateId);
        return response.IsValid ? Ok(response) : NotFound(response);
    }
}
