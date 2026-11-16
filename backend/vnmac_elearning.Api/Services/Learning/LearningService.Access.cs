using vnmac_elearning.Api.Domain;
namespace vnmac_elearning.Api.Services;
public sealed partial class LearningService
{
    public Course GetAccessibleCourse(string courseId, string? userId) => ScopeCourse(userId, GetCourseById(courseId));
    public IReadOnlyCollection<Course> GetAccessibleCourses(string? userId)
    {
        var user = FindCourseAccessUser(userId);
        return GetPublishedCoursesInternal().Select(course => ScopeCourseForUser(user, course)).ToArray();
    }

    private User? FindCourseAccessUser(string? userId) =>
        userId is null ? null : dbContext.Users.Find(userId);

    private Course ScopeCourse(string? userId, Course course) =>
        ScopeCourseForUser(FindCourseAccessUser(userId), course);

    private static Course ScopeCourseForUser(User? user, Course course)
    {
        if (user is not null && (user.Role != UserRole.Learner || user.LearnerType == LearnerType.Collaborator)) return course;
        var sections = course.Sections.Where(x => x.Order == 1).ToList();
        var ids = sections.Select(x => x.Id).ToHashSet();
        var lessons = sections.SelectMany(x => x.Lessons).Select(x => x.Id).ToHashSet();
        return new Course { Id = course.Id, Title = course.Title, Description = course.Description, Status = course.Status,
            CertificateEnabled = true, Sections = sections,
            Quizzes = course.Quizzes.Where(x => lessons.Contains(x.AssessmentLessonId) && (x.SectionId == null || ids.Contains(x.SectionId))).ToList() };
    }
}
