using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Contracts;

public sealed class LearnerDashboardResponse
{
    public required User User { get; init; }
    public int TotalEnrolledCourses { get; init; }
    public int TotalCompletedCourses { get; init; }
    public int TotalCertificates { get; init; }
    public int TotalStudyTimeMinutes { get; init; }
    public required IReadOnlyCollection<LearnerEnrollmentSummary> Courses { get; init; }
}

public sealed class LearnerCourseCatalogResponse
{
    public string UserId { get; init; } = string.Empty;
    public required IReadOnlyCollection<LearnerCourseCatalogItem> Courses { get; init; }
}

public sealed class LearnerCourseCatalogItem
{
    public string CourseId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public CourseStatus Status { get; init; }
    public int TotalSections { get; init; }
    public int TotalLessons { get; init; }
    public int TotalQuizzes { get; init; }
    public int EstimatedStudyTimeMinutes { get; init; }
    public bool IsEnrolled { get; init; }
    public LearnerEnrollmentSummary? Enrollment { get; init; }
}

public sealed class LearnerEnrollmentSummary
{
    public string CourseId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public CourseStatus Status { get; init; }
    public CourseEnrollmentStatus EnrollmentStatus { get; init; }
    public DateTimeOffset EnrolledAt { get; init; }
    public DateTimeOffset? StartedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
    public DateTimeOffset? LastAccessedAt { get; init; }
    public int ContentCompletionPercent { get; init; }
    public int QuizCompletionPercent { get; init; }
    public int OverallCompletionPercent { get; init; }
    public bool QuizUnlocked { get; init; }
    public bool CertificateIssued { get; init; }
    public string? CertificateId { get; init; }
    public string? NextLessonId { get; init; }
    public string? NextQuizId { get; init; }
    public int TotalLessons { get; init; }
    public int CompletedLessons { get; init; }
    public int TotalQuizzes { get; init; }
    public int PassedQuizzes { get; init; }
}

public sealed class LearningResultsResponse
{
    public string UserId { get; init; } = string.Empty;
    public string CourseId { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public CourseEnrollmentStatus EnrollmentStatus { get; init; }
    public int ContentCompletionPercent { get; init; }
    public int QuizCompletionPercent { get; init; }
    public int OverallCompletionPercent { get; init; }
    public int TotalLessons { get; init; }
    public int CompletedLessons { get; init; }
    public int InProgressLessons { get; init; }
    public int LockedLessons { get; init; }
    public int TotalQuizzes { get; init; }
    public int PassedQuizzes { get; init; }
    public int StudyTimeMinutes { get; init; }
    public string? CurrentLessonId { get; init; }
    public string? CurrentLessonTitle { get; init; }
    public string CurrentStep { get; init; } = "intro";
    public string? NextLessonId { get; init; }
    public string? NextLessonTitle { get; init; }
    public string? NextQuizId { get; init; }
    public string? NextQuizTitle { get; init; }
    public int LatestQuizScore { get; init; }
    public int LatestQuizAttempts { get; init; }
    public bool CertificateIssued { get; init; }
}

public sealed class LearnerLessonSummary
{
    public string CourseId { get; init; } = string.Empty;
    public string SectionId { get; init; } = string.Empty;
    public string LessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public LessonType Type { get; init; }
    public LessonProgressStatus Status { get; init; }
    public bool IsUnlocked { get; init; }
    public string CurrentStep { get; init; } = "intro";
    public DateTimeOffset? LastAccessedAt { get; init; }
    public int WatchPercent { get; init; }
    public int WatchTimeMinutes { get; init; }
    public int InteractionAttempts { get; init; }
    public int QuizScore { get; init; }
    public int QuizAttempts { get; init; }
    public int ScormAttempts { get; init; }
    public decimal? ScormScore { get; init; }
    public ScormCompletionStatus? ScormCompletionStatus { get; init; }
    public ScormSuccessStatus? ScormSuccessStatus { get; init; }
}

public sealed class ProgressSnapshotResponse
{
    public string UserId { get; init; } = string.Empty;
    public string CourseId { get; init; } = string.Empty;
    public string? NextLessonId { get; init; }
    public string? NextQuizId { get; init; }
    public int ContentCompletionPercent { get; init; }
    public int QuizCompletionPercent { get; init; }
    public int OverallCompletionPercent { get; init; }
    public bool QuizUnlocked { get; init; }
    public bool CertificateIssued { get; init; }
    public required IReadOnlyCollection<LearnerLessonSummary> Lessons { get; init; }
    public required IReadOnlyCollection<LearnerCourseQuizSummary> Quizzes { get; init; }
    public required IReadOnlyCollection<ProgressTracking> Progress { get; init; }
    public required IReadOnlyCollection<QuizResult> QuizResults { get; init; }
    public required IReadOnlyCollection<ScormRegistration> ScormRegistrations { get; init; }
}

public sealed class LearnerCourseQuizSummary
{
    public string QuizId { get; init; } = string.Empty;
    public string CourseId { get; init; } = string.Empty;
    public string? SectionId { get; init; }
    public string AssessmentLessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int Order { get; init; }
    public bool IsUnlocked { get; init; }
    public bool Passed { get; init; }
    public int Score { get; init; }
    public int Attempts { get; init; }
}

public sealed class UpdateVideoProgressRequest
{
    public int WatchPercent { get; init; }
    public int WatchTimeMinutes { get; init; }
    public int LastPositionSeconds { get; init; }
}

public sealed class LessonStudyStateRequest
{
    public string CurrentStep { get; init; } = "intro";
    public int ActiveSeconds { get; init; }
}

public sealed class InteractiveAttemptRequest
{
    public List<QuestionSubmissionRequest> Answers { get; init; } = [];
}

public sealed class QuestionSubmissionRequest
{
    public string QuestionId { get; init; } = string.Empty;
    public List<string> SelectedOptionCodes { get; init; } = [];
    public List<string> SelectedHotspotCodes { get; init; } = [];
    public List<HotspotClickSubmission> HotspotClicks { get; init; } = [];
    public List<DragDropMatchSubmission> Matches { get; init; } = [];
}

public sealed class HotspotClickSubmission
{
    public double X { get; init; }
    public double Y { get; init; }
}

public sealed class DragDropMatchSubmission
{
    public string DragItemCode { get; init; } = string.Empty;
    public string DragTargetCode { get; init; } = string.Empty;
}

public sealed class InteractiveAttemptResponse
{
    public bool Passed { get; init; }
    public int AttemptNumber { get; init; }
    public required IReadOnlyCollection<InteractionTaskResult> Results { get; init; }
    public required ProgressTracking Progress { get; init; }
}

public sealed class QuizSessionResponse
{
    public string QuizId { get; init; } = string.Empty;
    public string AssessmentLessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Intro { get; init; } = string.Empty;
    public int PassScore { get; init; }
    public required IReadOnlyCollection<LearnerQuestionPayload> Questions { get; init; }
}

public sealed class LearnerQuestionPayload
{
    public string Id { get; init; } = string.Empty;
    public QuestionType Type { get; init; }
    public int Order { get; init; }
    public string Prompt { get; init; } = string.Empty;
    public string? Statement { get; init; }
    public string? MediaTitle { get; init; }
    public string? MediaUrl { get; init; }
    public string? ScenarioTitle { get; init; }
    public string? ScenarioContext { get; init; }
    public bool AllowMultipleAnswers { get; init; }
    public required IReadOnlyCollection<LearnerQuestionOptionPayload> Options { get; init; }
    public required IReadOnlyCollection<LearnerHotspotTargetPayload> HotspotTargets { get; init; }
    public required IReadOnlyCollection<LearnerDragItemPayload> DragItems { get; init; }
    public required IReadOnlyCollection<LearnerDragTargetPayload> DragTargets { get; init; }
}

public sealed class LearnerQuestionOptionPayload
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class LearnerHotspotTargetPayload
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
    public HotspotShape Shape { get; init; }
    public double X { get; init; }
    public double Y { get; init; }
    public double Width { get; init; }
    public double Height { get; init; }
    public double Radius { get; init; }
}

public sealed class LearnerDragItemPayload
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class LearnerDragTargetPayload
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class QuizAttemptRequest
{
    public List<QuestionSubmissionRequest> Answers { get; init; } = [];
}

public sealed class QuizAttemptResponse
{
    public string QuizId { get; init; } = string.Empty;
    public bool Passed { get; init; }
    public int Score { get; init; }
    public int AttemptNumber { get; init; }
    public required IReadOnlyCollection<string> WrongQuestionIds { get; init; }
    public required QuizResult Result { get; init; }
}

public sealed class CertificateResponse
{
    public string UserId { get; init; } = string.Empty;
    public string CourseId { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public bool IsEligible { get; init; }
    public required IReadOnlyCollection<string> OutstandingRequirements { get; init; }
    public Certificate? Certificate { get; init; }
}

public sealed class LearnerCertificatesResponse
{
    public string UserId { get; init; } = string.Empty;
    public required IReadOnlyCollection<CertificateResponse> Certificates { get; init; }
}

public sealed class CertificateVerificationResponse
{
    public bool IsValid { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? LearnerName { get; init; }
    public string? CourseId { get; init; }
    public string? CourseTitle { get; init; }
    public string? CertificateId { get; init; }
    public DateTimeOffset? IssuedDate { get; init; }
}

public sealed class ScormLaunchResponse
{
    public string LessonId { get; init; } = string.Empty;
    public string PackageId { get; init; } = string.Empty;
    public string PackageTitle { get; init; } = string.Empty;
    public ScormVersion Version { get; init; }
    public string SessionId { get; init; } = string.Empty;
    public string ScoId { get; init; } = string.Empty;
    public string ScoTitle { get; init; } = string.Empty;
    public string LaunchContentUrl { get; init; } = string.Empty;
    public string PlayerUrl { get; init; } = string.Empty;
    public required ScormRegistrationSnapshot Registration { get; init; }
}

public sealed class ScormRegistrationSnapshot
{
    public string UserId { get; init; } = string.Empty;
    public string LessonId { get; init; } = string.Empty;
    public int AttemptCount { get; init; }
    public string? CurrentScoId { get; init; }
    public ScormCompletionStatus CompletionStatus { get; init; }
    public ScormSuccessStatus SuccessStatus { get; init; }
    public decimal? ScoreRaw { get; init; }
    public decimal? ScoreMin { get; init; }
    public decimal? ScoreMax { get; init; }
    public int TotalTimeSeconds { get; init; }
    public string Location { get; init; } = string.Empty;
    public bool HasSuspendData { get; init; }
    public DateTimeOffset? LastLaunchedAt { get; init; }
    public DateTimeOffset? LastCommittedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
}

public sealed class ScormInitializeResponse
{
    public string SessionId { get; init; } = string.Empty;
    public string EntryMode { get; init; } = string.Empty;
    public required ScormRegistrationSnapshot Registration { get; init; }
}

public sealed class ScormValueResponse
{
    public string Element { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
}

public sealed class ScormSetValueRequest
{
    public string Element { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
}

public sealed class ScormCommitResponse
{
    public string SessionId { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public required ScormRegistrationSnapshot Registration { get; init; }
}
