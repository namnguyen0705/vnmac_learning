using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    private static List<string> DrawFlowOrder(LearningFlowStep step, int attempt = 0, IReadOnlyList<string>? previous = null)
    {
        if (step.DrawRules is null) return step.Items.Select(i => i.Id).ToList();
        List<string> Draw()
        {
            IEnumerable<LearningFlowItem> picked;
            if (step.Policy == "exam")
            {
                var groups = step.Items.GroupBy(i => i.GroupId).OrderBy(g => g.Key).ToArray();
                picked = groups.SelectMany((g, index) => g.OrderBy(_ => Random.Shared.Next()).Take((index + attempt * 3) % 6 < 3 ? 3 : 2));
            }
            else picked = step.DrawRules.SelectMany(r => step.Items.Where(i => i.Kind == r.Kind).OrderBy(_ => Random.Shared.Next()).Take(r.Count));
            return picked.OrderBy(_ => Random.Shared.Next()).Select(i => i.Id).ToList();
        }
        var order = Draw();
        for (var i = 0; previous is not null && i < 20 && (order.ToHashSet().SetEquals(previous) || order[0] == previous[0]); i++) order = Draw();
        return order;
    }

    private static bool IsFlowQuestion(LearningFlowItem item) => item.Kind is "choice" or "classify" or "sort" or "hotspot" or "match" or "group";

    private static void ValidateFlowPairs(LearningFlowItem item, List<string> selected)
    {
        var left = item.LeftItems ?? [];
        FlowRequire(selected.Count == left.Count && selected.Distinct().Count() == selected.Count && left.All(l => selected.Count(c => c.StartsWith(l.Code + ":") && item.Options.Any(o => c == l.Code + ":" + o.Code)) == 1), "Hãy chọn nhóm hoặc ghép đủ từng mục.");
        if (item.Kind == "match") FlowRequire(selected.Select(c => c.Split(':').Last()).Distinct().Count() == left.Count, "Mỗi ý bên phải chỉ được ghép một lần.");
    }

    private void SubmitFlowExam(string userId, Lesson lesson, LearningFlowStep step, LearningFlowState state, DateTimeOffset now)
    {
        if (state.ExamSubmitted) return;
        foreach (var id in state.Order)
        {
            var q = step.Items.Single(i => i.Id == id);
            var codes = state.Answers.GetValueOrDefault(id)?.Codes ?? [];
            var correct = codes.ToHashSet().SetEquals(q.CorrectCodes);
            state.Answers[id] = new LearningFlowAnswer { Codes = codes, Correct = correct, Feedback = q.CorrectFeedback };
        }
        state.ExamSubmitted = true;
        state.ExamPassed = state.Answers.Count(a => a.Value.Correct) >= step.PassCount;
        state.ExamOrder = state.Order.ToList();
        state.ExamAnswers = state.Answers.ToDictionary(a => a.Key, a => a.Value);
        state.Attempts++;
        SaveFlowQuizAttempt(userId, lesson, step, state, state.ExamPassed, now);
    }

    private void ExpireFlowExam(string userId, Lesson lesson, List<LearningFlowStep> flow, LearningFlowProgress record, LearningFlowState state)
    {
        if (state.StepIndex >= flow.Count || flow[state.StepIndex].Policy != "exam" || state.ExamSubmitted || state.ExamDeadline is null || DateTimeOffset.UtcNow < state.ExamDeadline) return;
        SubmitFlowExam(userId, lesson, flow[state.StepIndex], state, DateTimeOffset.UtcNow);
        record.StateJson = JsonStorage.Serialize(state); record.Revision++;
    }

    private void ActFlowExam(string userId, Lesson lesson, List<LearningFlowStep> flow, LearningFlowState state, LearningFlowActionRequest request, DateTimeOffset now)
    {
        var step = flow[state.StepIndex];
        switch (request.Action)
        {
            case "answer":
                FlowRequire(!state.ExamSubmitted && now < state.ExamDeadline, "Lượt kiểm tra đã kết thúc.");
                var item = FlowItem(step, state);
                FlowRequire(request.Codes.Count == 1 && item.Options.Any(o => o.Code == request.Codes[0]), "Hãy chọn một đáp án hợp lệ.");
                state.Answers[item.Id] = new LearningFlowAnswer { Codes = request.Codes.ToList() };
                break;
            case "navigate":
                FlowRequire(!state.ExamSubmitted && request.TargetIndex >= 0 && request.TargetIndex < state.Order.Count, "Không thể mở câu hỏi này.");
                state.ItemIndex = request.TargetIndex!.Value;
                break;
            case "submit":
                SubmitFlowExam(userId, lesson, step, state, now);
                break;
            case "retry":
                FlowRequire(state.ExamSubmitted && !state.ExamPassed, "Chỉ được làm lại khi chưa đạt.");
                state.Order = DrawFlowOrder(step, state.Attempts, state.Order);
                state.Answers.Clear(); state.ItemIndex = 0; state.ExamSubmitted = false; state.ExamPassed = false;
                state.ExamDeadline = now.AddSeconds(step.TimeLimitSeconds);
                break;
            case "advance":
                FlowRequire(state.ExamSubmitted && state.ExamPassed, "Cần đạt ít nhất 12/15 câu.");
                FinishFlowStep(userId, lesson, flow, state, now);
                break;
            default: FlowRequire(false, "Thao tác kiểm tra không hợp lệ."); break;
        }
    }

    private static object? ExamFlowView(List<LearningFlowStep> flow, LearningFlowState state)
    {
        var step = flow.SingleOrDefault(s => s.Policy == "exam");
        if (step is null || state.ExamDeadline is null) return null;
        var submitted = state.ExamSubmitted;
        var order = state.ExamSubmitted ? state.ExamOrder : state.Order;
        var answers = state.ExamSubmitted ? state.ExamAnswers : state.Answers;
        return new {
            Deadline = state.ExamDeadline, Submitted = submitted, Passed = state.ExamPassed,
            CorrectCount = submitted ? state.ExamAnswers.Count(a => a.Value.Correct) : (int?)null,
            Questions = order.Select((id, index) => {
                var q = step.Items.Single(i => i.Id == id); var answer = answers.GetValueOrDefault(id);
                return new { q.Id, Index = index, q.Title, q.Options, Codes = answer?.Codes ?? [],
                    CorrectCodes = submitted ? q.CorrectCodes : null, Explanation = submitted ? q.CorrectFeedback : null,
                    AudioUrl = q.AudioUrl, FeedbackAudioUrl = submitted ? q.FeedbackAudioUrl : null,
                    Correct = submitted ? answer?.Correct ?? false : (bool?)null };
            })
        };
    }
}
