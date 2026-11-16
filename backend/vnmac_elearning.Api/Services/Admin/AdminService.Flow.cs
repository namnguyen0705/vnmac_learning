using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    private void RebaseDisplayOnlyFlowChanges(Lesson lesson, List<LearningFlowStep>? previous)
    {
        if (previous is null || lesson.Content is null) return;
        var oldFlow = LearningFlowPublication.Visible(previous);
        var newFlow = LearningFlowPublication.Visible(lesson.Content.Flow);
        string Version(List<LearningFlowStep> flow) => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(JsonStorage.Serialize(flow))));
        string Rules(List<LearningFlowStep> flow) => JsonStorage.Serialize(flow.Select(step => new {
            step.Id, step.Policy, step.DrawRules, step.TimeLimitSeconds, step.PassCount, Items = step.Items.Select(item => new {
                item.Id, item.Kind, item.Multiple, item.CorrectCodes, item.ImageUrl, item.AudioUrl,
                item.VideoUrl, item.DurationSeconds, item.RequiresImage, item.RequiresAudio, item.ReviewNote,
                item.Options, item.LeftItems, item.GroupId
            })
        }));
        if (Rules(oldFlow) != Rules(newFlow)) return;
        var oldVersion = Version(oldFlow);
        var newVersion = Version(newFlow);
        if (oldVersion == newVersion) return;
        foreach (var record in dbContext.LearningFlowProgresses.Where(record => record.LessonId == lesson.Id && record.ContentVersion == oldVersion))
        {
            record.ContentVersion = newVersion;
            record.Revision++;
        }
    }

    private void SynchronizeFlowAssessment(Lesson lesson)
    {
        var quizzes = lesson.Content?.Flow.Where(x => x.Policy is "quiz" or "exam" && !x.IsHidden).ToArray() ?? [];
        if (quizzes.Length == 0) return;
        if (quizzes.Length != 1) throw new ServiceException(new ServiceError("flow.one_quiz", "Mỗi bài chỉ có một bộ kiểm tra cuối bài.", 400));
        var items = quizzes[0].Items.Where(item => !item.IsHidden).ToList();
        if (items.Count == 0) return;
        lesson.Assessment ??= new LessonAssessment { LessonId = lesson.Id };
        var assessment = lesson.Assessment;
        assessment.PassScore = quizzes[0].Policy == "exam" ? 80 : 100;
        assessment.QuestionLimit = quizzes[0].DrawRules?.Sum(r => r.Count) ?? items.Count;
        assessment.RandomizeQuestionOrder = quizzes[0].ShuffleOnRetry;
        assessment.RandomizeOptionOrder = false;
        var removed = assessment.Questions.Where(q => quizzes[0].Items.All(x => x.Id != q.Id)).ToArray();
        if (removed.Length > 0 && dbContext.QuizAttempts.Any(x => x.LessonId == lesson.Id))
            throw new ServiceException(new ServiceError("flow.reset_required", "Hãy đặt lại tiến độ khóa học trước khi xóa câu hỏi đã có lượt làm bài.", 409));
        foreach (var question in removed) { dbContext.LessonQuestions.Remove(question); assessment.Questions.Remove(question); }
        // Avoid unique Order conflicts when an editor reorders questions.
        // Persisting Order is unnecessary here: runtime order belongs to the flow, not the question-bank row.
        var nextOrder = assessment.Questions.Select(q => q.Order).DefaultIfEmpty(0).Max() + 1;
        foreach (var item in items)
        {
            if (item.Kind is not ("choice" or "match" or "group")) throw new ServiceException(new ServiceError("flow.quiz_choice_required", "Loại câu kiểm tra không được hỗ trợ.", 400));
            var question = assessment.Questions.SingleOrDefault(q => q.Id == item.Id);
            if (question is null) { question = new LessonQuestion { Id = item.Id, LessonId = lesson.Id, Order = nextOrder++ }; assessment.Questions.Add(question); }
            question.Prompt = item.Title; question.Explanation = item.CorrectFeedback; question.Type = QuestionType.MultipleChoice;
            foreach (var option in question.Options.Where(o => item.Options.All(x => x.Code != o.Code)).ToArray()) { dbContext.LessonQuestionOptions.Remove(option); question.Options.Remove(option); }
            var optionOrder = question.Options.Select(o => o.Order).DefaultIfEmpty(0).Max() + 1;
            foreach (var source in item.Options)
            {
                var option = question.Options.SingleOrDefault(o => o.Code == source.Code);
                if (option is null) { option = new LessonQuestionOption { QuestionId = item.Id, Code = source.Code, Order = optionOrder++ }; question.Options.Add(option); }
                option.Label = source.Label; option.IsCorrect = item.CorrectCodes.Contains(source.Code);
            }
        }
    }

    private void EnsureQuestionNotFlowManaged(string lessonId)
    {
        var content = dbContext.Lessons.Where(x => x.Id == lessonId).Select(x => x.Content).SingleOrDefault();
        if (content?.Flow.Count > 0) throw new ServiceException(new ServiceError("flow.edit_in_lesson", "Câu hỏi này thuộc nội dung Phần 1. Hãy sửa tại Nội dung bài học để giữ đồng bộ câu hỏi, hình ảnh và tiến độ.", 409));
    }
}
