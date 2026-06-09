namespace vnmac_elearning.Api.Domain;

public enum UserRole
{
    Learner,
    Admin,
    ContentManager,
    DataViewer
}

public enum CourseStatus
{
    Draft,
    Published
}

public enum CourseEnrollmentStatus
{
    Enrolled,
    InProgress,
    Completed
}

public enum LessonType
{
    Video,
    Interactive,
    Quiz,
    Scorm
}

public enum LessonProgressStatus
{
    NotStarted,
    InProgress,
    Completed
}

public enum QuestionType
{
    TrueFalse,
    MultipleChoice,
    DragDrop,
    Hotspot,
    Scenario
}

public enum HotspotShape
{
    Rectangle,
    Circle
}

public enum ScormVersion
{
    Scorm12,
    Scorm2004
}

public enum ScormScoType
{
    Sco,
    Asset
}

public enum ScormCompletionStatus
{
    NotAttempted,
    Incomplete,
    Completed,
    Passed,
    Failed,
    Browsed,
    Unknown
}

public enum ScormSuccessStatus
{
    Unknown,
    Passed,
    Failed
}
