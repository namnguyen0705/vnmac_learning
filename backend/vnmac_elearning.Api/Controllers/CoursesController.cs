using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/courses")]
public sealed class CoursesController(LearningService learningService) : ControllerBase
{
    [HttpGet]
    public ActionResult<object[]> GetPublishedCourses()
    {
        var courses = learningService.GetPublishedCourses();
        return Ok(CourseResponseMapper.MapCollection(courses));
    }

    [HttpGet("{courseId}")]
    public ActionResult<object> GetCourseById(string courseId)
    {
        var course = learningService.GetCourseById(courseId);
        return Ok(CourseResponseMapper.Map(course));
    }
}
