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
    public QuizSessionResponse CreateQuizSession(string userId, string quizId)
    {
        var (course, orderedLessons, visibleLessons, orderedQuizzes, quiz, assessmentLesson) = ResolveQuizContext(quizId);
        EnsureLearnerExists(userId);

        if (assessmentLesson.Type != LessonType.Quiz || assessmentLesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.LearningQuizNotFound);
        }

        EnsureQuizUnlocked(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes);
        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        auditLogService.Track(
            userId,
            "quiz",
            "start",
            nameof(CourseQuiz),
            quiz.Id,
            $"Bat dau bai kiem tra {quiz.Title}",
            new { courseId = course.Id, quiz.Title, assessmentLessonId = assessmentLesson.Id });
        SaveChangesIfNeeded();

        return new QuizSessionResponse
        {
            QuizId = quizId,
            AssessmentLessonId = assessmentLesson.Id,
            Title = quiz.Title,
            Intro = assessmentLesson.Assessment.Intro,
            PassScore = assessmentLesson.Assessment.PassScore,
            Questions = MapLearnerQuestions(assessmentLesson.Assessment, includeAllQuestions: true)
        };
    }

    public QuizAttemptResponse SubmitQuizAttempt(string userId, string quizId, QuizAttemptRequest request)
    {
        var (course, orderedLessons, visibleLessons, orderedQuizzes, quiz, assessmentLesson) = ResolveQuizContext(quizId);
        EnsureLearnerExists(userId);

        if (assessmentLesson.Type != LessonType.Quiz || assessmentLesson.Assessment is null)
        {
            throw new ServiceException(ServiceErrors.LearningQuizNotFound);
        }

        EnsureQuizUnlocked(userId, course, quiz, visibleLessons, orderedLessons, orderedQuizzes);

        var results = EvaluateAssessment(assessmentLesson.Assessment, request.Answers, submittedQuestionsOnly: true);
        var wrongQuestionIds = results.Where(item => !item.Correct).Select(item => item.TaskId).ToArray();
        var score = CalculateScore(results);
        var assessmentLessonId = assessmentLesson.Id;
        var attemptNumber = dbContext.QuizAttempts.Count(item => item.UserId == userId && item.LessonId == assessmentLessonId) + 1;

        dbContext.QuizAttempts.Add(new QuizAttempt
        {
            UserId = userId,
            LessonId = assessmentLessonId,
            AttemptNumber = attemptNumber,
            Score = score,
            WrongQuestions = wrongQuestionIds
                .Select(questionId => new QuizAttemptWrongQuestion
                {
                    UserId = userId,
                    LessonId = assessmentLessonId,
                    AttemptNumber = attemptNumber,
                    QuestionId = questionId
                })
                .ToList(),
            AttemptedAt = DateTimeOffset.UtcNow
        });

        var result = GetOrCreateQuizResultInternal(userId, assessmentLessonId, orderedLessons)!;
        result.Score = score;
        result.Attempts = attemptNumber;
        result.LastAttemptAt = DateTimeOffset.UtcNow;

        var progress = GetOrCreateProgressInternal(userId, assessmentLessonId);
        progress.CurrentStep = score >= assessmentLesson.Assessment.PassScore ? "complete" : "check";
        progress.LastAccessedAt = DateTimeOffset.UtcNow;
        progress.Status = score >= assessmentLesson.Assessment.PassScore
            ? LessonProgressStatus.Completed
            : LessonProgressStatus.InProgress;
        progress.CompletionTime = progress.Status == LessonProgressStatus.Completed
            ? progress.LastAccessedAt
            : null;

        TouchEnrollmentInternal(GetOrCreateEnrollmentInternal(userId, course));
        EnsureCertificateIssuedInternal(userId, course);
        auditLogService.Track(
            userId,
            "quiz",
            "submit",
            nameof(CourseQuiz),
            quiz.Id,
            $"Nop bai kiem tra {quiz.Title}",
            new
            {
                courseId = course.Id,
                quiz.Title,
                score,
                passed = score >= assessmentLesson.Assessment.PassScore,
                attemptNumber,
                wrongCount = wrongQuestionIds.Length
            });
        SaveChangesIfNeeded();

        return new QuizAttemptResponse
        {
            QuizId = quizId,
            Passed = score >= assessmentLesson.Assessment.PassScore,
            Score = score,
            AttemptNumber = attemptNumber,
            WrongQuestionIds = wrongQuestionIds,
            Result = result
        };
    }

}
