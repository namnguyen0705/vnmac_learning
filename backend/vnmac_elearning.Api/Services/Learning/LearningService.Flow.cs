using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    private static void RejectLegacyFlowWrite(Lesson lesson) => FlowRequire(lesson.Content?.Flow.Count is not > 0, "Bài học này phải được hoàn thành qua trình phát Phần 1.");
    public void RestartUpdatedLearningFlow(string userId, string lessonId)
    {
        using var transaction = BeginFlowTransaction(userId, lessonId);
        var (_, lesson, flow) = ResolveFlow(userId, lessonId);
        var record = dbContext.LearningFlowProgresses.SingleOrDefault(x => x.UserId == userId && x.LessonId == lessonId);
        var version = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonStorage.Serialize(flow))));
        FlowRequire(record is not null && record.ContentVersion != version, "Bài học không cần bắt đầu lại.", 409);
        // A changed prerequisite affects this learner's course; never reset other learners.
        var ids = dbContext.Lessons.Where(x => x.CourseId == lesson.CourseId).Select(x => x.Id);
        dbContext.QuizAttemptWrongQuestions.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.QuizAttempts.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.InteractionAttemptResults.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.InteractionAttempts.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.LearningFlowProgresses.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.ProgressTrackings.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.QuizResults.Where(x => x.UserId == userId && ids.Contains(x.LessonId)).ExecuteDelete();
        dbContext.Certificates.Where(x => x.UserId == userId && x.CourseId == lesson.CourseId).ExecuteDelete();
        dbContext.CourseEnrollments.Where(x => x.UserId == userId && x.CourseId == lesson.CourseId).ExecuteUpdate(update => update
            .SetProperty(x => x.Status, CourseEnrollmentStatus.Enrolled)
            .SetProperty(x => x.StartedAt, (DateTimeOffset?)null)
            .SetProperty(x => x.CompletedAt, (DateTimeOffset?)null));
        transaction.Commit();
    }

    public object GetLearningFlow(string userId, string lessonId, int? reviewStep = null, int reviewItem = 0)
    {
        using var transaction = BeginFlowTransaction(userId, lessonId);
        var (course, lesson, flow) = ResolveFlow(userId, lessonId);
        var record = GetFlowRecord(userId, lesson, flow);
        var state = JsonStorage.Deserialize<LearningFlowState>(record.StateJson)!;
        ExpireFlowExam(userId, lesson, flow, record, state);
        SaveChangesIfNeeded();
        var view = FlowView(course, lesson, flow, record, state, reviewStep, reviewItem);
        transaction.Commit();
        return view;
    }

    public object ActLearningFlow(string userId, string lessonId, LearningFlowActionRequest request)
    {
        using var transaction = BeginFlowTransaction(userId, lessonId);
        var (course, lesson, flow) = ResolveFlow(userId, lessonId);
        var record = GetFlowRecord(userId, lesson, flow);
        var state = JsonStorage.Deserialize<LearningFlowState>(record.StateJson)!;
        var beforeExpiry = record.Revision;
        ExpireFlowExam(userId, lesson, flow, record, state);
        if (beforeExpiry != record.Revision) {
            dbContext.SaveChanges();
            var expiredView = FlowView(course, lesson, flow, record, state);
            transaction.Commit(); return expiredView;
        }
        FlowRequire(record.Revision == request.Revision, "Nội dung đã thay đổi ở phiên khác. Vui lòng tải lại.", 409);
        FlowRequire(state.StepIndex < flow.Count, "Bài học đã hoàn thành.");
        var step = flow[state.StepIndex];
        var item = FlowItem(step, state);
        FlowRequire(request.StepId == step.Id && request.ItemId == item.Id, "Không được bỏ qua nội dung chưa hoàn thành.");
        FlowRequire(string.IsNullOrWhiteSpace(BlockedReason(item)), BlockedReason(item));
        var now = DateTimeOffset.UtcNow;
        var activity = GetOrCreateProgressInternal(userId, lesson.Id);
        activity.ActiveStudySeconds += (int)Math.Clamp((now - state.LastActivityAt).TotalSeconds, 0, 60);
        activity.LastAccessedAt = now;
        state.LastActivityAt = now;
        if (step.Policy == "exam") ActFlowExam(userId, lesson, flow, state, request, now);
        else switch (request.Action)
        {
            case "watch":
                FlowRequire(item.Kind == "video" && !state.QuizFinished, "Nội dung không phải video.");
                FlowRequire(double.IsFinite(request.PositionSeconds) && request.PositionSeconds >= 0 && request.PositionSeconds <= item.DurationSeconds + 1, "Vị trí video không hợp lệ.");
                var elapsed = Math.Max(0, (now - state.LastWatchAt).TotalSeconds);
                var delta = request.PositionSeconds - state.LastPosition;
                FlowRequire(delta <= Math.Min(elapsed + 1, 12), "Hãy xem video theo trình tự, không tua bỏ qua.");
                state.WatchedSeconds = Math.Min(item.DurationSeconds, state.WatchedSeconds + Math.Max(0, Math.Min(delta, elapsed)));
                // Browser events and request latency can leave sub-second accounting drift.
                // Only normalize the final second after verified sequential playback.
                if (request.PositionSeconds >= item.DurationSeconds && state.WatchedSeconds >= item.DurationSeconds - 1)
                    state.WatchedSeconds = item.DurationSeconds;
                state.LastPosition = request.PositionSeconds;
                state.LastWatchAt = now;
                break;
            case "answer":
                FlowRequire(IsFlowQuestion(item), "Nội dung không có câu hỏi.");
                FlowRequire(!state.QuizFinished && (!state.Answers.ContainsKey(item.Id) || step.Policy == "practice" && !state.Answers[item.Id].Correct), "Câu trả lời đã được chấm. Hãy tiếp tục hoặc làm lại toàn bộ bài.");
                var selected = request.Codes ?? [];
                if (item.Kind == "hotspot")
                {
                    FlowRequire(request.X.HasValue && request.Y.HasValue && double.IsFinite(request.X.Value) && double.IsFinite(request.Y.Value), "Hãy chọn trực tiếp vị trí trên ảnh.");
                    FlowRequire(request.X >= 0 && request.X <= 100 && request.Y >= 0 && request.Y <= 100, "Vị trí ngoài ảnh.");
                    selected = item.Options.Where(x => FlowContains(x, request.X!.Value, request.Y!.Value)).Select(x => x.Code).ToList();
                }
                if (item.Kind is "match" or "group") ValidateFlowPairs(item, selected);
                else {
                    FlowRequire(selected.Distinct().Count() == selected.Count && selected.All(code => item.Options.Any(x => x.Code == code)), "Lựa chọn không hợp lệ.");
                    FlowRequire(item.Multiple || item.Kind == "sort" || selected.Count <= 1, "Chỉ chọn một đáp án.");
                }
                var correct = item.Kind == "sort"
                    ? selected.SequenceEqual(item.CorrectCodes)
                    : selected.ToHashSet().SetEquals(item.CorrectCodes);
                state.Answers[item.Id] = new LearningFlowAnswer { Codes = selected, Correct = correct, Feedback = selected.Count == 1 && item.FeedbackByCode?.TryGetValue(selected[0], out var branchFeedback) == true ? branchFeedback : correct ? item.CorrectFeedback : item.WrongFeedback };
                if (step.Policy != "quiz")
                {
                    state.PracticeHistory.Add(new LearningFlowAnswerEvent { ItemId = item.Id, AnsweredAt = now, Answer = state.Answers[item.Id] });
                    activity.InteractionAttempts++;
                }
                break;
            case "retry":
                FlowRequire(step.Policy == "quiz" && state.QuizFinished, "Chưa thể làm lại bài kiểm tra.");
                var previous = state.Order.ToArray();
                state.Order = DrawFlowOrder(step, state.Attempts, previous);
                if (step.ShuffleOnRetry && step.DrawRules is null)
                {
                    Random.Shared.Shuffle(System.Runtime.InteropServices.CollectionsMarshal.AsSpan(state.Order));
                    // Make a new attempt visibly different from its first question as well.
                    if (state.Order.Count > 1 && state.Order[0] == previous[0])
                    {
                        var swapIndex = Random.Shared.Next(1, state.Order.Count);
                        (state.Order[0], state.Order[swapIndex]) = (state.Order[swapIndex], state.Order[0]);
                    }
                }
                state.Answers.Clear();
                state.ItemIndex = 0;
                state.QuizFinished = false;
                ResetFlowClock(state, now);
                break;
            case "advance":
                FlowRequire(!state.QuizFinished, "Hãy làm lại toàn bộ bài kiểm tra.");
                if (IsFlowQuestion(item))
                    FlowRequire(state.Answers.TryGetValue(item.Id, out var answer) && (step.Policy != "practice" || answer.Correct), "Hãy hoàn thành câu hỏi hiện tại.");
                else
                {
                    var requiredSeconds = item.Kind == "video" ? item.DurationSeconds : Math.Max(item.DurationSeconds, 1);
                    FlowRequire((now - state.EnteredAt).TotalSeconds >= requiredSeconds, "Hãy xem hết nội dung trước khi tiếp tục.");
                    if (item.Kind == "video") FlowRequire(state.WatchedSeconds >= item.DurationSeconds - 1 && state.LastPosition >= item.DurationSeconds - 1, "Hãy xem hết video trước khi tiếp tục.");
                }
                if (state.ItemIndex + 1 < state.Order.Count)
                {
                    state.ItemIndex++;
                    ResetFlowClock(state, now);
                }
                else if (step.Policy == "quiz")
                {
                    FlowRequire(state.Answers.Count == state.Order.Count, "Phải trả lời đầy đủ bộ câu hỏi.");
                    state.Attempts++;
                    var passed = state.Order.All(id => state.Answers.TryGetValue(id, out var a) && a.Correct);
                    SaveFlowQuizAttempt(userId, lesson, step, state, passed, now);
                    if (!passed) state.QuizFinished = true;
                    else FinishFlowStep(userId, lesson, flow, state, now);
                }
                else FinishFlowStep(userId, lesson, flow, state, now);
                break;
            default: throw new ServiceException(new ServiceError("flow.invalid_action", "Thao tác không hợp lệ.", 400));
        }
        record.StateJson = JsonStorage.Serialize(state);
        record.Revision++;
        try { dbContext.SaveChanges(); }
        catch (DbUpdateConcurrencyException) { throw new ServiceException(new ServiceError("flow.conflict", "Phiên học đã thay đổi. Vui lòng tải lại.", 409)); }
        var view = FlowView(course, lesson, flow, record, state);
        transaction.Commit();
        return view;
    }

    private (Course Course, Lesson Lesson, List<LearningFlowStep> Flow) ResolveFlow(string userId, string lessonId)
    {
        var (course, ordered, lesson) = ResolveLessonContext(lessonId, userId);
        _ = GetLearnerCourseInternal(userId, course.Id);
        var visible = GetVisibleLessons(course, ordered);
        if (lesson.Type == LessonType.Quiz)
        {
            var quiz = course.Quizzes.SingleOrDefault(x => x.AssessmentLessonId == lessonId);
            FlowRequire(quiz is not null, "Không tìm thấy bài kiểm tra.", 404);
            EnsureQuizUnlocked(userId, course, quiz!, visible, ordered, GetOrderedQuizzes(course));
        }
        else
        {
            FlowRequire(visible.Any(x => x.Id == lessonId), "Không tìm thấy bài học.", 404);
            EnsureLessonUnlocked(userId, lessonId, visible);
        }
        var flow = LearningFlowPublication.Visible(lesson.Content?.Flow ?? []);
        FlowRequire(flow.Count > 0, "Bài học chưa được cấu hình nội dung Phần 1.", 404);
        return (course, lesson, flow);
    }

    // Serialize requests for one learner/lesson across API processes. The lock must
    // precede every read: two first visits must not both stage a new progress row.
    private IDbContextTransaction BeginFlowTransaction(string userId, string lessonId)
    {
        var transaction = dbContext.Database.BeginTransaction();
        try
        {
            using var command = dbContext.Database.GetDbConnection().CreateCommand();
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = "DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @resource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000; SELECT @result;";
            var resource = command.CreateParameter();
            resource.ParameterName = "@resource";
            resource.Value = "learning-flow:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userId + "\0" + lessonId)));
            command.Parameters.Add(resource);
            var result = Convert.ToInt32(command.ExecuteScalar());
            FlowRequire(result >= 0, "Phiên học đang được xử lý. Vui lòng thử lại.", 409);
            return transaction;
        }
        catch
        {
            transaction.Dispose();
            throw;
        }
    }

    private LearningFlowProgress GetFlowRecord(string userId, Lesson lesson, List<LearningFlowStep> flow)
    {
        var version = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonStorage.Serialize(flow))));
        var record = dbContext.LearningFlowProgresses.SingleOrDefault(x => x.UserId == userId && x.LessonId == lesson.Id);
        if (record is null)
        {
            record = new LearningFlowProgress { UserId = userId, LessonId = lesson.Id, ContentVersion = version };
            dbContext.LearningFlowProgresses.Add(record);
            var state = new LearningFlowState { Order = flow[0].Items.Select(x => x.Id).ToList() };
            record.StateJson = JsonStorage.Serialize(state);
            var progress = GetOrCreateProgressInternal(userId, lesson.Id);
            progress.Status = LessonProgressStatus.InProgress;
            progress.LastAccessedAt = DateTimeOffset.UtcNow;
            progress.CurrentStep = flow[0].Id;
        }
        if (record.ContentVersion != version)
        {
            var previous = JsonStorage.Deserialize<LearningFlowState>(record.StateJson);
            var intro = flow[0];
            // A learner who has only opened the text introduction has no assessed
            // progress to invalidate. Restart that introduction on the new version.
            // Never carry answers, completed sections or watched video across versions.
            var canRestartIntro = previous is not null && previous.StepIndex == 0
                && previous.CompletedSteps.Count == 0 && previous.Answers.Count == 0
                && previous.CompletedAnswers.Count == 0 && previous.PracticeHistory.Count == 0
                && previous.Attempts == 0 && !previous.QuizFinished
                && previous.WatchedSeconds == 0 && previous.LastPosition == 0
                && intro.Id == "intro" && intro.Items.All(item => item.Kind == "text")
                && previous.Order.Count > 0 && previous.ItemIndex >= 0 && previous.ItemIndex < previous.Order.Count
                && previous.Order.All(id => intro.Items.Any(item => item.Id == id));
            var progress = GetOrCreateProgressInternal(userId, lesson.Id);
            if (canRestartIntro && progress.Status != LessonProgressStatus.Completed && progress.CompletionTime is null
                && progress.WatchPercent == 0 && progress.WatchTimeMinutes == 0
                && progress.LastPositionSeconds == 0 && progress.InteractionAttempts == 0)
            {
                record.ContentVersion = version;
                record.StateJson = JsonStorage.Serialize(new LearningFlowState { Order = intro.Items.Select(item => item.Id).ToList() });
                record.Revision++;
                progress.CurrentStep = intro.Id;
                progress.LastAccessedAt = DateTimeOffset.UtcNow;
            }
        }
        FlowRequire(record.ContentVersion == version, "Nội dung đã được cập nhật. Quản trị viên cần đặt lại tiến độ bài này trước khi học tiếp.", 409);
        return record;
    }

    private static LearningFlowItem FlowItem(LearningFlowStep step, LearningFlowState state) => step.Items.Single(x => x.Id == state.Order[state.ItemIndex]);

    private static void ResetFlowClock(LearningFlowState state, DateTimeOffset now)
    {
        state.EnteredAt = now; state.LastWatchAt = now; state.WatchedSeconds = 0; state.LastPosition = 0;
    }

    private void FinishFlowStep(string userId, Lesson lesson, List<LearningFlowStep> flow, LearningFlowState state, DateTimeOffset now)
    {
        foreach (var answer in state.Answers) state.CompletedAnswers[answer.Key] = answer.Value;
        if (flow[state.StepIndex].Items.Any(x => x.Kind == "video"))
        {
            var videoProgress = GetOrCreateProgressInternal(userId, lesson.Id);
            videoProgress.WatchPercent = 100;
            videoProgress.LastPositionSeconds = (int)Math.Ceiling(flow[state.StepIndex].Items.LastOrDefault(item => item.Kind == "video")?.DurationSeconds ?? 0);
            videoProgress.WatchTimeMinutes = Math.Max(videoProgress.WatchTimeMinutes, (int)Math.Ceiling(flow[state.StepIndex].Items.Where(x => x.Kind == "video").Sum(x => x.DurationSeconds) / 60));
            videoProgress.LastWatchedAt = now;
        }
        state.CompletedSteps.Add(flow[state.StepIndex].Id);
        state.StepIndex++; state.ItemIndex = 0; state.Answers.Clear(); state.QuizFinished = false;
        ResetFlowClock(state, now);
        var progress = GetOrCreateProgressInternal(userId, lesson.Id);
        progress.LastAccessedAt = now;
        progress.CurrentStep = state.StepIndex == flow.Count ? "complete" : flow[state.StepIndex].Id;
        progress.Status = state.StepIndex == flow.Count ? LessonProgressStatus.Completed : LessonProgressStatus.InProgress;
        if (state.StepIndex == flow.Count) progress.CompletionTime ??= now;
        else {
            state.Order = DrawFlowOrder(flow[state.StepIndex], state.Attempts);
            if (flow[state.StepIndex].Policy == "exam") {
                state.ExamDeadline = now.AddSeconds(flow[state.StepIndex].TimeLimitSeconds);
                state.Answers.Clear(); state.ExamSubmitted = false; state.ExamPassed = false;
            }
        }
        var course = ScopeCourse(userId, GetCourseById(lesson.CourseId));
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course), now);
        UpdateEnrollmentStateInternal(userId, GetVisibleLessons(course, GetOrderedLessons(course)), GetOrderedQuizzes(course), GetOrderedLessons(course), GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
    }

    private void SaveFlowQuizAttempt(string userId, Lesson lesson, LearningFlowStep step, LearningFlowState state, bool passed, DateTimeOffset now)
    {
        // All quiz items have matching relational question IDs for reporting and admin tools.
        if (lesson.Assessment is null) return;
        var wrong = state.Order.Where(id => !state.Answers.TryGetValue(id, out var answer) || !answer.Correct).ToArray();
        var attempt = dbContext.QuizAttempts.Count(x => x.UserId == userId && x.LessonId == lesson.Id) + 1;
        var score = (int)Math.Round(100d * (state.Order.Count - wrong.Length) / state.Order.Count);
        dbContext.QuizAttempts.Add(new QuizAttempt {
            UserId = userId, LessonId = lesson.Id, AttemptNumber = attempt, Score = score, AttemptedAt = now,
            WrongQuestions = wrong.Select(id => new QuizAttemptWrongQuestion { UserId = userId, LessonId = lesson.Id, AttemptNumber = attempt, QuestionId = id }).ToList()
        });
        if (lesson.Type == LessonType.Quiz)
        {
            var result = GetOrCreateQuizResultInternal(userId, lesson.Id, GetOrderedLessons(GetCourseById(lesson.CourseId)))!;
            // Preserve a previous pass when reviewing a completed assessment.
            result.Score = Math.Max(result.Score, score); result.Attempts = attempt; result.LastAttemptAt = now;
        }
    }

    private object FlowView(Course course, Lesson lesson, List<LearningFlowStep> flow, LearningFlowProgress record, LearningFlowState state, int? reviewStep = null, int reviewItem = 0)
    {
        var complete = state.StepIndex >= flow.Count;
        var reviewing = reviewStep.HasValue;
        if (reviewing) FlowRequire(reviewStep >= 0 && reviewStep < flow.Count && state.CompletedSteps.Contains(flow[reviewStep!.Value].Id), "Chỉ được xem lại phần đã hoàn thành.");
        var index = reviewing ? reviewStep!.Value : Math.Min(state.StepIndex, flow.Count - 1);
        var step = flow[index];
        FlowRequire(!reviewing || reviewItem >= 0 && reviewItem < step.Items.Count, "Nội dung xem lại không hợp lệ.");
        var item = reviewing ? step.Items[reviewItem] : complete ? step.Items[^1] : FlowItem(step, state);
        state.Answers.TryGetValue(item.Id, out var answer);
        answer = JsonStorage.Clone(answer);
        if (step.Policy == "quiz" && answer is not null && lesson.Id.StartsWith("p2-")) answer.CorrectCodes = item.CorrectCodes;
        var ordered = GetOrderedLessons(course);
        var visible = GetVisibleLessons(course, ordered);
        var next = visible.FirstOrDefault(x => x.Order > lesson.Order && x.SectionId == lesson.SectionId);
        var quiz = course.Quizzes.FirstOrDefault(x => x.SectionId == lesson.SectionId);
        var followingSection = course.Sections.Where(s => !s.IsHidden && s.Order > course.Sections.Single(s => s.Id == lesson.SectionId).Order).OrderBy(s => s.Order).FirstOrDefault();
        var followingLesson = followingSection?.Lessons.Where(LearningFlowPublication.IsVisibleLesson).Where(l => l.Type != LessonType.Quiz).OrderBy(l => l.Order).FirstOrDefault();
        var nextUrl = next is not null ? $"/app/courses/{course.Id}/lessons/{next.Id}" : lesson.Type != LessonType.Quiz && quiz is not null ? $"/app/courses/{course.Id}/quizzes/{quiz.Id}" : $"/app/courses/{course.Id}";
        if (lesson.Type == LessonType.Quiz && followingLesson is not null) nextUrl = $"/app/courses/{course.Id}/lessons/{followingLesson.Id}";
        var assessmentCount = lesson.Assessment?.QuestionLimit ?? 0;
        var quizStep = flow.FirstOrDefault(x => x.Policy is "quiz" or "exam");
        var quizPassed = quizStep is not null && state.CompletedSteps.Contains(quizStep.Id);
        var assessmentAnswered = quizPassed ? assessmentCount : state.Answers.Count;
        var percent = lesson.Type == LessonType.Quiz
            ? (int)Math.Floor(100d * (quizPassed ? assessmentCount : state.Answers.Count(x => x.Value.Correct)) / Math.Max(1, assessmentCount))
            : (int)Math.Floor(100d * state.CompletedSteps.Count / flow.Count);
        return new {
            lesson.Id, lesson.Title, lesson.CourseId, record.Revision, ServerTime = DateTimeOffset.UtcNow, Completed = complete, Reviewing = reviewing,
            ProgressPercent = percent, IsSectionAssessment = lesson.Type == LessonType.Quiz, AssessmentQuestionCount = assessmentCount, AssessmentAnsweredCount = assessmentAnswered,
            Steps = flow.Select((x, i) => new { x.Id, x.Title, Index = i, Completed = state.CompletedSteps.Contains(x.Id) }),
            StepId = step.Id, StepTitle = step.Title, Policy = step.Policy, step.AutoAdvance, ItemIndex = reviewing ? reviewItem : state.ItemIndex, ItemCount = reviewing ? step.Items.Count : complete ? step.Items.Count : state.Order.Count,
            Item = new { item.Id, item.Kind, item.Title, item.Body, item.Narration, item.ActionLabel, item.AutoAdvance, item.ImageUrl, item.RequiresImage, item.AudioUrl, item.RequiresAudio, item.VideoUrl, item.CaptionUrl, item.DurationSeconds, item.Multiple, item.LeftItems, Options = item.Kind == "sort" ? item.Options.OrderBy(x => x.Code).ToArray() : item.Kind == "match" ? item.Options.OrderBy(x => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(record.UserId + item.Id + state.Attempts + x.Code)))).ToArray() : item.Options.ToArray() },
            Answer = reviewing || step.Policy == "exam" ? null : answer,
            FeedbackAudioUrl = answer is not null && step.Policy != "exam" ? item.FeedbackAudioUrl : null,
            Exam = ExamFlowView(flow, state), BlockedReason = BlockedReason(item), state.QuizFinished,
            CorrectCount = state.Answers.Count(x => x.Value.Correct), AnsweredCount = state.Answers.Count,
            EnteredAt = state.EnteredAt, state.LastPosition, state.WatchedSeconds, NextUrl = nextUrl,
            NextLabel = lesson.Type == LessonType.Quiz ? followingLesson is not null ? "Học phần tiếp theo" : "Về phần học" : next is not null ? "Tiếp tục bài học tiếp theo" : quiz is not null ? quiz.Title : "Về phần học"
        };
    }

    private static string BlockedReason(LearningFlowItem item)
    {
        List<string> pending = [];
        if (item.Kind == "video" && (string.IsNullOrWhiteSpace(item.VideoUrl) || item.DurationSeconds <= 1))
            pending.Add("video và thời lượng phát");
        if (item.RequiresAudio && string.IsNullOrWhiteSpace(item.AudioUrl))
            pending.Add("bản thu lời đọc");
        if ((item.RequiresImage && string.IsNullOrWhiteSpace(item.ImageUrl))
            || item.Options.Any(x => x.RequiresImage && string.IsNullOrWhiteSpace(x.ImageUrl)))
            pending.Add("ảnh minh họa");
        if (item.Kind == "hotspot" && !string.IsNullOrWhiteSpace(item.ReviewNote) && item.CorrectCodes.Count == 0)
            pending.Add("vùng nhấn và đáp án được duyệt");
        else if (!string.IsNullOrWhiteSpace(item.ReviewNote))
            pending.Add("xác nhận của đơn vị chuyên môn");
        return pending.Count == 0 ? string.Empty : $"Nội dung này đang chờ {string.Join(", ", pending)}. Vui lòng quay lại sau.";
    }

    private static bool FlowContains(LearningFlowOption option, double x, double y)
    {
        if (option.Polygon.Count < 3) return Math.Abs(x - option.X) <= option.Width / 2 && Math.Abs(y - option.Y) <= option.Height / 2;
        var inside = false;
        for (int i = 0, j = option.Polygon.Count - 1; i < option.Polygon.Count; j = i++)
        {
            var a = option.Polygon[i]; var b = option.Polygon[j];
            if ((a.Y > y) != (b.Y > y) && x < (b.X - a.X) * (y - a.Y) / (b.Y - a.Y) + a.X) inside = !inside;
        }
        return inside;
    }

    private static void FlowRequire(bool condition, string message, int status = 400)
    {
        if (!condition) throw new ServiceException(new ServiceError("flow.invalid_state", message, status));
    }
}

