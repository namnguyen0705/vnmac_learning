using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class LearningService
{
    private static IReadOnlyCollection<InteractionTaskResult> EvaluateAssessment(
        LessonAssessment assessment,
        IReadOnlyCollection<QuestionSubmissionRequest> submissions,
        bool submittedQuestionsOnly = false)
    {
        var submissionMap = submissions
            .Where(item => !string.IsNullOrWhiteSpace(item.QuestionId))
            .GroupBy(item => item.QuestionId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Last(), StringComparer.Ordinal);

        var questions = assessment.Questions
            .OrderBy(question => question.Order)
            .Where(question => !submittedQuestionsOnly || submissionMap.ContainsKey(question.Id))
            .ToArray();

        if (submittedQuestionsOnly && assessment.QuestionLimit is > 0 && questions.Length != assessment.QuestionLimit.Value)
        {
            return assessment.Questions
                .OrderBy(question => question.Order)
                .Take(assessment.QuestionLimit.Value)
                .Select(question => new InteractionTaskResult
                {
                    TaskId = question.Id,
                    Correct = false,
                    Explanation = assessment.RetryHint
                })
                .ToArray();
        }

        return questions
            .Select(question =>
            {
                submissionMap.TryGetValue(question.Id, out var submission);
                return EvaluateQuestion(question, submission);
            })
            .ToArray();
    }

    private static InteractionTaskResult EvaluateQuestion(LessonQuestion question, QuestionSubmissionRequest? submission)
    {
        var correct = question.Type switch
        {
            QuestionType.TrueFalse or QuestionType.MultipleChoice or QuestionType.Scenario => CompareCodeSets(
                question.Options.Where(item => item.IsCorrect).Select(item => item.Code),
                submission?.SelectedOptionCodes),
            QuestionType.Hotspot => EvaluateHotspot(question, submission),
            QuestionType.DragDrop => ComparePairSets(
                question.CorrectPairs.Select(item => $"{Normalize(item.DragItemCode)}|{Normalize(item.DragTargetCode)}"),
                submission?.Matches),
            _ => false
        };

        return new InteractionTaskResult
        {
            TaskId = question.Id,
            Correct = correct,
            Explanation = question.Explanation
        };
    }

    private static bool EvaluateHotspot(LessonQuestion question, QuestionSubmissionRequest? submission)
    {
        var clicks = submission?.HotspotClicks ?? [];
        if (clicks.Count != 1)
        {
            return false;
        }

        var click = clicks[0];
        return click.X is >= 0 and <= 100 &&
               click.Y is >= 0 and <= 100 &&
               question.HotspotTargets
                   .Where(target => target.IsCorrect)
                   .Any(target => ContainsHotspotPoint(target, click.X, click.Y));
    }

    private static bool ContainsHotspotPoint(LessonQuestionHotspotTarget target, double x, double y)
    {
        var deltaX = x - target.X;
        var deltaY = y - target.Y;

        return target.Shape switch
        {
            HotspotShape.Circle => (deltaX * deltaX) + (deltaY * deltaY) <= target.Radius * target.Radius,
            HotspotShape.Rectangle =>
                Math.Abs(deltaX) <= target.Width / 2 &&
                Math.Abs(deltaY) <= target.Height / 2,
            _ => false
        };
    }

    private static int CalculateScore(IReadOnlyCollection<InteractionTaskResult> results)
    {
        if (results.Count == 0)
        {
            return 0;
        }

        var correctCount = results.Count(item => item.Correct);
        return (int)Math.Round((double)correctCount / results.Count * 100);
    }

    private static bool CompareCodeSets(IEnumerable<string> expectedCodes, IReadOnlyCollection<string>? submittedCodes)
    {
        var expected = expectedCodes.Select(Normalize).ToHashSet(StringComparer.Ordinal);
        var actual = (submittedCodes ?? [])
            .Select(Normalize)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToHashSet(StringComparer.Ordinal);

        return expected.SetEquals(actual);
    }

    private static bool ComparePairSets(IEnumerable<string> expectedPairs, IReadOnlyCollection<DragDropMatchSubmission>? submittedPairs)
    {
        var expected = expectedPairs.ToHashSet(StringComparer.Ordinal);
        var actual = (submittedPairs ?? [])
            .Select(item => $"{Normalize(item.DragItemCode)}|{Normalize(item.DragTargetCode)}")
            .ToHashSet(StringComparer.Ordinal);

        return expected.SetEquals(actual);
    }

    private static IReadOnlyCollection<LearnerQuestionPayload> MapLearnerQuestions(LessonAssessment assessment, bool includeAllQuestions)
    {
        var orderedQuestions = assessment.Questions.OrderBy(question => question.Order).ToArray();
        if (assessment.RandomizeQuestionOrder && includeAllQuestions)
        {
            orderedQuestions = orderedQuestions.OrderBy(_ => Random.Shared.Next()).ToArray();
        }

        if (includeAllQuestions && assessment.QuestionLimit is > 0)
        {
            orderedQuestions = orderedQuestions.Take(assessment.QuestionLimit.Value).ToArray();
        }

        return orderedQuestions
            .Select(question => new LearnerQuestionPayload
            {
                Id = question.Id,
                Type = question.Type,
                Order = question.Order,
                Prompt = question.Prompt,
                Statement = question.Statement,
                MediaTitle = question.MediaTitle,
                MediaUrl = question.MediaUrl,
                ScenarioTitle = question.ScenarioTitle,
                ScenarioContext = question.ScenarioContext,
                AllowMultipleAnswers = question.Type switch
                {
                    QuestionType.Hotspot => false,
                    QuestionType.DragDrop => false,
                    _ => question.Options.Count(item => item.IsCorrect) > 1
                },
                Options = OrderItems(question.Options, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerQuestionOptionPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray(),
                // Không gửi vùng đáp án cho client học viên để tránh làm lộ vị trí đúng.
                HotspotTargets = [],
                DragItems = OrderItems(question.DragItems, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerDragItemPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray(),
                DragTargets = OrderItems(question.DragTargets, assessment.RandomizeOptionOrder)
                    .Select(item => new LearnerDragTargetPayload
                    {
                        Code = item.Code,
                        Label = item.Label,
                        Order = item.Order
                    })
                    .ToArray()
            })
            .ToArray();
    }

    private static IReadOnlyCollection<T> OrderItems<T>(IEnumerable<T> items, bool randomize)
        where T : class
    {
        return randomize
            ? items.OrderBy(_ => Random.Shared.Next()).ToArray()
            : items.OrderBy(item => item switch
            {
                LessonQuestionOption option => option.Order,
                LessonQuestionDragItem dragItem => dragItem.Order,
                LessonQuestionDragTarget dragTarget => dragTarget.Order,
                _ => 0
            }).ToArray();
    }

}
