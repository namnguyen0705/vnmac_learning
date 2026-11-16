using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

internal static class CourseResponseMapper
{
    public static object[] MapCollection(IEnumerable<Course> courses)
    {
        return courses.Select(Map).ToArray();
    }

    public static object Map(Course course) => MapCore(course, false);

    // Authoring endpoints need the flow tree; public/learner endpoints never expose it.
    public static object MapForAdmin(Course course) => MapCore(course, true);

    private static object MapCore(Course course, bool includeFlow)
    {
        var lessonById = course.Sections
            .Where(section => includeFlow || !section.IsHidden)
            .SelectMany(section => section.Lessons)
            .Where(lesson => includeFlow || LearningFlowPublication.IsVisibleLesson(lesson))
            .ToDictionary(lesson => lesson.Id, StringComparer.Ordinal);

        return new
        {
            course.Id,
            course.Title,
            course.Description,
            course.Status,
            Sections = course.Sections
                .Where(section => includeFlow || !section.IsHidden)
                .OrderBy(section => section.Order)
                .Select(section => new
                {
                    section.Id,
                    section.CourseId,
                    section.Title,
                    section.Description,
                    section.Order,
                    section.IsHidden,
                    Lessons = section.Lessons
                        .Where(lesson => includeFlow || LearningFlowPublication.IsVisibleLesson(lesson))
                        .OrderBy(lesson => lesson.Order)
                        .Select(lesson => MapLesson(lesson, includeFlow))
                        .ToArray(),
                    Quizzes = course.Quizzes
                        .Where(quiz =>
                            string.Equals(quiz.SectionId, section.Id, StringComparison.Ordinal) &&
                            lessonById.ContainsKey(quiz.AssessmentLessonId))
                        .OrderBy(quiz => quiz.Order)
                        .Select(quiz => MapQuiz(quiz, lessonById))
                        .ToArray()
                })
                .ToArray(),
            Quizzes = course.Quizzes
                .Where(quiz =>
                    string.IsNullOrWhiteSpace(quiz.SectionId) &&
                    lessonById.ContainsKey(quiz.AssessmentLessonId))
                .OrderBy(quiz => quiz.Order)
                .Select(quiz => MapQuiz(quiz, lessonById))
                .ToArray()
        };
    }

    private static object MapLesson(Lesson lesson, bool includeFlow)
    {
        return new
        {
            lesson.Id,
            lesson.CourseId,
            lesson.SectionId,
            lesson.Title,
            lesson.Type,
            lesson.Order,
            Outline = (lesson.Content?.Flow ?? []).Where(step => !step.IsHidden && step.Items.Any(item => !item.IsHidden))
                .Select((step, index) => new { step.Id, step.Title, Order = index + 1, ItemCount = step.Items.Count(item => !item.IsHidden) })
                .ToArray(),
            lesson.DurationMinutes,
            lesson.StatusLabel,
            lesson.Topic,
            lesson.PublicationStatus,
            lesson.ThumbnailUrl,
            lesson.CreatedAt,
            lesson.UpdatedAt,
            Content = includeFlow ? lesson.Content : PublicContent(lesson.Content),
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
                    lesson.Assessment.QuestionLimit,
                    lesson.Assessment.RandomizeQuestionOrder,
                    lesson.Assessment.RandomizeOptionOrder,
                    QuestionCount = GetEffectiveQuestionCount(lesson.Assessment),
                    BankQuestionCount = lesson.Assessment.Questions.Count,
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
                    assessment.QuestionLimit,
                    assessment.RandomizeQuestionOrder,
                    assessment.RandomizeOptionOrder,
                    QuestionCount = GetEffectiveQuestionCount(assessment),
                    BankQuestionCount = assessment.Questions.Count
                }
        };
    }

    private static int GetEffectiveQuestionCount(LessonAssessment assessment)
    {
        return assessment.QuestionLimit is > 0
            ? Math.Min(assessment.QuestionLimit.Value, assessment.Questions.Count)
            : assessment.Questions.Count;
    }

    private static LessonContent? PublicContent(LessonContent? content)
    {
        var safe = Infrastructure.JsonStorage.Clone(content);
        if (safe is not null) safe.Flow = [];
        return safe;
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
