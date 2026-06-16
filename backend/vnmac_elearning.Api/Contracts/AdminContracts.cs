using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Contracts;

public sealed class AnalyticsResponse
{
    public string ProvinceFilter { get; init; } = "Tat ca";
    public string GroupFilter { get; init; } = "Tat ca";
    public int TotalLearners { get; init; }
    public int CompletionRatePercent { get; init; }
    public int PassRatePercent { get; init; }
    public int AverageStudyTimeMinutes { get; init; }
    public required IReadOnlyCollection<AnalyticsItem> TopDifficultLessons { get; init; }
    public required IReadOnlyCollection<AnalyticsItem> DropOffLessons { get; init; }
    public required IReadOnlyCollection<LearnerAdminRow> Learners { get; init; }
}

public sealed class TrackingResponse
{
    public required TrackingOverview Overview { get; init; }
    public required IReadOnlyCollection<TrackingCourseOption> Courses { get; init; }
    public required IReadOnlyCollection<TrackingLearnerRow> Learners { get; init; }
    public required IReadOnlyCollection<TrackingCourseSummary> CourseSummaries { get; init; }
    public required IReadOnlyCollection<TrackingLessonSummary> LessonSummaries { get; init; }
    public required IReadOnlyCollection<TrackingVideoSummary> VideoSummaries { get; init; }
    public required IReadOnlyCollection<TrackingDropOffItem> DropOffLessons { get; init; }
    public required IReadOnlyCollection<TrackingTimelineEvent> RecentEvents { get; init; }
}

public sealed class TrackingOverview
{
    public int TotalLearners { get; init; }
    public int ActiveLearners { get; init; }
    public int StalledLearners { get; init; }
    public int CompletedCourses { get; init; }
}

public sealed class TrackingCourseOption
{
    public string CourseId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
}

public sealed class TrackingLearnerRow
{
    public string UserId { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTimeOffset? LastActivityAt { get; init; }
    public required IReadOnlyCollection<TrackingCourseProgress> Courses { get; init; }
    public required IReadOnlyCollection<TrackingTimelineEvent> Timeline { get; init; }
}

public sealed class TrackingCourseProgress
{
    public string CourseId { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public DateTimeOffset EnrolledAt { get; init; }
    public DateTimeOffset? LastAccessedAt { get; init; }
    public int OverallCompletionPercent { get; init; }
    public int ContentCompletionPercent { get; init; }
    public int QuizCompletionPercent { get; init; }
    public string? CurrentLessonId { get; init; }
    public string? CurrentLessonTitle { get; init; }
    public LessonType? CurrentLessonType { get; init; }
    public int LastPositionSeconds { get; init; }
    public required IReadOnlyCollection<TrackingLessonProgress> Lessons { get; init; }
}

public sealed class TrackingLessonProgress
{
    public string LessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public LessonType Type { get; init; }
    public LessonProgressStatus Status { get; init; }
    public int WatchPercent { get; init; }
    public int WatchTimeMinutes { get; init; }
    public int LastPositionSeconds { get; init; }
    public DateTimeOffset? LastWatchedAt { get; init; }
    public DateTimeOffset? CompletionTime { get; init; }
    public int InteractionAttempts { get; init; }
    public int QuizAttempts { get; init; }
    public int QuizScore { get; init; }
    public int ScormAttempts { get; init; }
    public int ScormTotalTimeSeconds { get; init; }
    public string ScormLocation { get; init; } = string.Empty;
    public ScormCompletionStatus? ScormCompletionStatus { get; init; }
    public ScormSuccessStatus? ScormSuccessStatus { get; init; }
}

public sealed class TrackingDropOffItem
{
    public string LessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public int LearnerCount { get; init; }
    public int AverageWatchPercent { get; init; }
}

public sealed class TrackingCourseSummary
{
    public string CourseId { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public int EnrolledLearners { get; init; }
    public int ActiveLearners { get; init; }
    public int CompletedLearners { get; init; }
    public int AverageCompletionPercent { get; init; }
}

public sealed class TrackingLessonSummary
{
    public string LessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public LessonType Type { get; init; }
    public int StartedLearners { get; init; }
    public int CompletedLearners { get; init; }
    public int DropOffLearners { get; init; }
    public int AverageProgressPercent { get; init; }
}

public sealed class TrackingVideoSummary
{
    public string LessonId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public int StartedLearners { get; init; }
    public int CompletedLearners { get; init; }
    public int DropOffLearners { get; init; }
    public int AverageWatchPercent { get; init; }
    public int AverageStopPositionSeconds { get; init; }
}

public sealed class TrackingTimelineEvent
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string LearnerName { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public string LessonTitle { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Detail { get; init; } = string.Empty;
    public DateTimeOffset OccurredAt { get; init; }
}

public sealed class AdminUserRow
{
    public string UserId { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset LastLogin { get; init; }
    public bool IsEmailVerified { get; init; }
    public DateTimeOffset? EmailVerifiedAt { get; init; }
    public bool CreatedByAdmin { get; init; }
    public bool IsLocked { get; init; }
    public UserRole Role { get; init; }
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public int CompletionPercent { get; init; }
    public bool Passed { get; init; }
    public int StudyTimeMinutes { get; init; }
    public string StalledAtLessonId { get; init; } = string.Empty;
    public int CertificateCount { get; init; }
    public required IReadOnlyCollection<LearnerEnrollmentAdminRow> Enrollments { get; init; }
}

public sealed class AnalyticsItem
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public int Total { get; init; }
}

public sealed class LearnerAdminRow
{
    public string UserId { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset LastLogin { get; init; }
    public bool IsEmailVerified { get; init; }
    public DateTimeOffset? EmailVerifiedAt { get; init; }
    public bool CreatedByAdmin { get; init; }
    public bool IsLocked { get; init; }
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public int CompletionPercent { get; init; }
    public bool Passed { get; init; }
    public int StudyTimeMinutes { get; init; }
    public string StalledAtLessonId { get; init; } = string.Empty;
    public int CertificateCount { get; init; }
    public required IReadOnlyCollection<LearnerEnrollmentAdminRow> Enrollments { get; init; }
}

public sealed class LearnerEnrollmentAdminRow
{
    public string CourseId { get; init; } = string.Empty;
    public string CourseTitle { get; init; } = string.Empty;
    public CourseEnrollmentStatus EnrollmentStatus { get; init; }
    public int ContentCompletionPercent { get; init; }
    public int QuizCompletionPercent { get; init; }
    public int OverallCompletionPercent { get; init; }
    public bool QuizUnlocked { get; init; }
    public bool PassedAllQuizzes { get; init; }
    public bool CertificateIssued { get; init; }
    public string? CertificateId { get; init; }
    public string? NextLessonId { get; init; }
    public string? NextQuizId { get; init; }
}

public sealed class CreateAdminUserRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public UserRole Role { get; init; } = UserRole.Learner;
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public bool MarkEmailAsVerified { get; init; } = true;
    public bool IsLocked { get; init; }
}

public sealed class UpdateAdminUserRequest
{
    public string Username { get; init; } = string.Empty;
    public string? Password { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public UserRole Role { get; init; } = UserRole.Learner;
    public string Province { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public bool IsEmailVerified { get; init; }
    public bool IsLocked { get; init; }
}

public sealed class CreateCourseRequest
{
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public CourseStatus Status { get; init; } = CourseStatus.Draft;
}

public sealed class UpdateCourseRequest
{
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public CourseStatus Status { get; init; } = CourseStatus.Draft;
}

public sealed class CreateSectionRequest
{
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class UpsertLessonRequest
{
    public string CourseId { get; init; } = string.Empty;
    public string SectionId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public LessonType Type { get; init; }
    public int Order { get; init; }
    public int DurationMinutes { get; init; }
    public string StatusLabel { get; init; } = string.Empty;
    public VideoContent? VideoContent { get; init; }
    public LessonAssessmentRequest? Assessment { get; init; }
    public ScormPackageRequest? ScormPackage { get; init; }
}

public sealed class CreateCourseQuizRequest
{
    public string CourseId { get; init; } = string.Empty;
    public string? SectionId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int Order { get; init; }
    public LessonAssessmentRequest? Assessment { get; init; }
}

public sealed class UpdateCourseQuizRequest
{
    public string CourseId { get; init; } = string.Empty;
    public string? SectionId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int Order { get; init; }
    public LessonAssessmentRequest? Assessment { get; init; }
}

public sealed class LessonAssessmentRequest
{
    public string Intro { get; init; } = string.Empty;
    public string RetryHint { get; init; } = string.Empty;
    public int PassScore { get; init; } = 100;
    public bool RandomizeQuestionOrder { get; init; }
    public bool RandomizeOptionOrder { get; init; }
}

public sealed class UpsertLessonQuestionRequest
{
    public string? LessonId { get; init; }
    public string? QuizId { get; init; }
    public QuestionType Type { get; init; }
    public int Order { get; init; }
    public string Prompt { get; init; } = string.Empty;
    public string Explanation { get; init; } = string.Empty;
    public string? Statement { get; init; }
    public string? MediaTitle { get; init; }
    public string? ScenarioTitle { get; init; }
    public string? ScenarioContext { get; init; }
    public List<QuestionOptionRequest> Options { get; init; } = [];
    public List<QuestionHotspotTargetRequest> HotspotTargets { get; init; } = [];
    public List<QuestionDragItemRequest> DragItems { get; init; } = [];
    public List<QuestionDragTargetRequest> DragTargets { get; init; } = [];
    public List<QuestionDragPairRequest> CorrectPairs { get; init; } = [];
}

public sealed class QuestionOptionRequest
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
    public bool IsCorrect { get; init; }
}

public sealed class QuestionHotspotTargetRequest
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
    public HotspotShape Shape { get; init; } = HotspotShape.Rectangle;
    public double X { get; init; }
    public double Y { get; init; }
    public double Width { get; init; }
    public double Height { get; init; }
    public double Radius { get; init; }
    public bool IsCorrect { get; init; }
}

public sealed class QuestionDragItemRequest
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class QuestionDragTargetRequest
{
    public string Code { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Order { get; init; }
}

public sealed class QuestionDragPairRequest
{
    public string DragItemCode { get; init; } = string.Empty;
    public string DragTargetCode { get; init; } = string.Empty;
}

public sealed class ScormPackageRequest
{
    public ScormVersion Version { get; init; } = ScormVersion.Scorm12;
    public string Identifier { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string EntryPath { get; init; } = string.Empty;
    public string? LaunchScoId { get; init; }
    public string? ManifestVersion { get; init; }
    public List<ScormScoRequest> Scos { get; init; } = [];
}

public sealed class ScormScoRequest
{
    public string Id { get; init; } = string.Empty;
    public string Identifier { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string LaunchPath { get; init; } = string.Empty;
    public ScormScoType ItemType { get; init; } = ScormScoType.Sco;
    public int Order { get; init; }
    public int? MasteryScore { get; init; }
}
