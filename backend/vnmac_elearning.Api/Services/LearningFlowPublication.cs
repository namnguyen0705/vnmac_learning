using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Services;

public static class LearningFlowPublication
{
    public static bool IsVisibleLesson(Lesson lesson)
    {
        if (lesson.PublicationStatus != LessonPublicationStatus.Published) return false;
        if (lesson.Content?.Flow.Count is not > 0) return true;
        var flow = Visible(lesson.Content.Flow);
        return flow.Count > 0 && (lesson.Type != LessonType.Quiz || flow.Any(step => step.Policy is "quiz" or "exam"));
    }
    public static List<LearningFlowStep> Visible(IEnumerable<LearningFlowStep> flow) => flow
        .Where(step => !step.IsHidden)
        .Select(step => new LearningFlowStep { Id = step.Id, Title = step.Title, Policy = step.Policy,
            ShuffleOnRetry = step.ShuffleOnRetry, AutoAdvance = step.AutoAdvance,
            DrawRules = step.DrawRules, TimeLimitSeconds = step.TimeLimitSeconds, PassCount = step.PassCount,
            Items = step.Items.Where(item => !item.IsHidden).ToList() })
        .Where(step => step.Items.Count > 0).ToList();
}
