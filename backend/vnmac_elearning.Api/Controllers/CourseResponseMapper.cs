using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Controllers;

internal static class CourseResponseMapper
{
    public static object[] MapCollection(IEnumerable<Course> courses)
    {
        return courses.Select(Map).ToArray();
    }

    public static object Map(Course course)
    {
        var quizHostLessonIds = course.Quizzes
            .Select(item => item.AssessmentLessonId)
            .ToHashSet(StringComparer.Ordinal);
        var lessonById = course.Sections
            .SelectMany(section => section.Lessons)
            .ToDictionary(lesson => lesson.Id, StringComparer.Ordinal);

        return new
        {
            course.Id,
            course.Title,
            course.Description,
            course.Status,
            Sections = course.Sections
                .OrderBy(section => section.Order)
                .Select(section => new
                {
                    section.Id,
                    section.CourseId,
                    section.Title,
                    section.Description,
                    section.Order,
                    Lessons = section.Lessons
                        .Where(lesson => !quizHostLessonIds.Contains(lesson.Id))
                        .OrderBy(lesson => lesson.Order)
                        .Select(MapLesson)
                        .ToArray(),
                    Quizzes = course.Quizzes
                        .Where(quiz => string.Equals(quiz.SectionId, section.Id, StringComparison.Ordinal))
                        .OrderBy(quiz => quiz.Order)
                        .Select(quiz => MapQuiz(quiz, lessonById))
                        .ToArray()
                })
                .ToArray(),
            Quizzes = course.Quizzes
                .Where(quiz => string.IsNullOrWhiteSpace(quiz.SectionId))
                .OrderBy(quiz => quiz.Order)
                .Select(quiz => MapQuiz(quiz, lessonById))
                .ToArray()
        };
    }

    private static object MapLesson(Lesson lesson)
    {
        return new
        {
            lesson.Id,
            lesson.CourseId,
            lesson.SectionId,
            lesson.Title,
            lesson.Type,
            lesson.Order,
            lesson.DurationMinutes,
            lesson.StatusLabel,
            lesson.VideoContent,
            ScormPackage = lesson.ScormPackage is null
                ? null
                : new
                {
                    lesson.ScormPackage.Id,
                    lesson.ScormPackage.Version,
                    lesson.ScormPackage.Identifier,
                    lesson.ScormPackage.Title,
                    lesson.ScormPackage.EntryPath,
                    lesson.ScormPackage.LaunchScoId,
                    lesson.ScormPackage.ManifestVersion,
                    Scos = lesson.ScormPackage.Scos
                        .OrderBy(sco => sco.Order)
                        .Select(sco => new
                        {
                            sco.Id,
                            sco.Identifier,
                            sco.Title,
                            sco.LaunchPath,
                            sco.ItemType,
                            sco.Order,
                            sco.MasteryScore
                        })
                        .ToArray()
                },
            Assessment = lesson.Assessment is null
                ? null
                : new
                {
                    lesson.Assessment.Intro,
                    lesson.Assessment.RetryHint,
                    lesson.Assessment.PassScore,
                    lesson.Assessment.RandomizeQuestionOrder,
                    lesson.Assessment.RandomizeOptionOrder,
                    QuestionCount = lesson.Assessment.Questions.Count,
                    Questions = lesson.Type == LessonType.Interactive
                        ? lesson.Assessment.Questions
                            .OrderBy(question => question.Order)
                            .Select(MapQuestion)
                            .ToArray()
                        : null
                }
        };
    }

    private static object MapQuiz(CourseQuiz quiz, IReadOnlyDictionary<string, Lesson> lessonById)
    {
        lessonById.TryGetValue(quiz.AssessmentLessonId, out var lesson);
        var assessment = lesson?.Assessment;

        return new
        {
            quiz.Id,
            quiz.CourseId,
            quiz.SectionId,
            quiz.AssessmentLessonId,
            quiz.Title,
            quiz.Description,
            quiz.Order,
            DurationMinutes = lesson?.DurationMinutes ?? 0,
            Assessment = assessment is null
                ? null
                : new
                {
                    assessment.Intro,
                    assessment.RetryHint,
                    assessment.PassScore,
                    assessment.RandomizeQuestionOrder,
                    assessment.RandomizeOptionOrder,
                    QuestionCount = assessment.Questions.Count
                }
        };
    }

    private static object MapQuestion(LessonQuestion question)
    {
        return new
        {
            question.Id,
            question.Type,
            question.Order,
            question.Prompt,
            question.Statement,
            question.MediaTitle,
            question.ScenarioTitle,
            question.ScenarioContext,
            Options = question.Options
                .OrderBy(option => option.Order)
                .Select(option => new
                {
                    option.Code,
                    option.Label,
                    option.Order
                })
                .ToArray(),
            HotspotTargets = question.HotspotTargets
                .OrderBy(target => target.Order)
                .Select(target => new
                {
                    target.Code,
                    target.Label,
                    target.Order,
                    target.Shape,
                    target.X,
                    target.Y,
                    target.Width,
                    target.Height,
                    target.Radius
                })
                .ToArray(),
            DragItems = question.DragItems
                .OrderBy(item => item.Order)
                .Select(item => new
                {
                    item.Code,
                    item.Label,
                    item.Order
                })
                .ToArray(),
            DragTargets = question.DragTargets
                .OrderBy(target => target.Order)
                .Select(target => new
                {
                    target.Code,
                    target.Label,
                    target.Order
                })
                .ToArray()
        };
    }
}
