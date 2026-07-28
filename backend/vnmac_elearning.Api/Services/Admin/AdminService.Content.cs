using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Infrastructure;

namespace vnmac_elearning.Api.Services;

public sealed partial class AdminService
{
    public IReadOnlyCollection<Course> GetCourses()
    {
        return CourseGraphQuery()
            .OrderBy(course => course.Title)
            .ToArray();
    }

    public Course CreateCourse(CreateCourseRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminCourseTitleRequired);

        var course = new Course
        {
            Id = $"course-{Guid.NewGuid():N}"[..18],
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = request.Status,
            Sections = []
        };

        dbContext.Courses.Add(course);
        TrackAdmin("create", nameof(Course), course.Id, $"Tao khoa hoc {course.Title}");
        dbContext.SaveChanges();
        return course;
    }

    public Course UpdateCourse(string courseId, UpdateCourseRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminCourseTitleRequired);

        var course = GetCourseInternal(courseId);
        course.Title = request.Title.Trim();
        course.Description = request.Description.Trim();
        course.Status = request.Status;
        TrackAdmin("update", nameof(Course), course.Id, $"Cap nhat khoa hoc {course.Title}");
        dbContext.SaveChanges();
        return course;
    }

    public void DeleteCourse(string courseId)
    {
        var course = GetCourseInternal(courseId);
        var lessonIds = course.Sections
            .SelectMany(section => section.Lessons)
            .Select(lesson => lesson.Id)
            .ToHashSet(StringComparer.Ordinal);

        dbContext.ScormRuntimeValues.RemoveRange(dbContext.ScormRuntimeValues.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRuntimeSessions.RemoveRange(dbContext.ScormRuntimeSessions.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRegistrations.RemoveRange(dbContext.ScormRegistrations.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.ProgressTrackings.RemoveRange(dbContext.ProgressTrackings.Where(progress => lessonIds.Contains(progress.LessonId)));
        dbContext.QuizResults.RemoveRange(dbContext.QuizResults.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.QuizAttempts.RemoveRange(dbContext.QuizAttempts.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.InteractionAttempts.RemoveRange(dbContext.InteractionAttempts.Where(result => lessonIds.Contains(result.LessonId)));
        dbContext.Certificates.RemoveRange(dbContext.Certificates.Where(item => item.CourseId == courseId));
        dbContext.CourseEnrollments.RemoveRange(dbContext.CourseEnrollments.Where(item => item.CourseId == courseId));
        dbContext.Courses.Remove(course);
        TrackAdmin("delete", nameof(Course), course.Id, $"Xoa khoa hoc {course.Title}");
        dbContext.SaveChanges();
    }

    public CourseSection CreateSection(string courseId, CreateSectionRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminSectionTitleRequired);

        _ = GetCourseInternal(courseId);

        var section = new CourseSection
        {
            Id = $"section-{Guid.NewGuid():N}"[..18],
            CourseId = courseId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Order = request.Order,
            Lessons = []
        };

        dbContext.CourseSections.Add(section);
        TrackAdmin("create", nameof(CourseSection), section.Id, $"Tao phan hoc {section.Title}");
        dbContext.SaveChanges();
        return section;
    }

    public CourseSection UpdateSection(string courseId, string sectionId, UpdateSectionRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminSectionTitleRequired);
        var section = GetSectionInternal(courseId, sectionId);
        section.Title = request.Title.Trim();
        section.Description = request.Description.Trim();
        section.Order = request.Order;
        TrackAdmin("update", nameof(CourseSection), section.Id, $"Cap nhat phan hoc {section.Title}");
        dbContext.SaveChanges();
        return section;
    }

    public IReadOnlyCollection<CourseQuiz> GetQuizzes(string? courseId = null, string? sectionId = null)
    {
        return dbContext.CourseQuizzes
            .Where(item =>
                (string.IsNullOrWhiteSpace(courseId) || item.CourseId == courseId) &&
                (string.IsNullOrWhiteSpace(sectionId) || item.SectionId == sectionId))
            .OrderBy(item => item.CourseId)
            .ThenBy(item => item.SectionId)
            .ThenBy(item => item.Order)
            .ThenBy(item => item.Title)
            .ToArray();
    }

    public AdminLessonCatalogResponse GetLessonCatalog(
        string? search,
        string? topic,
        LessonPublicationStatus? status,
        LessonDifficulty? difficulty,
        int page,
        int pageSize)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 50);
        var courses = CourseGraphQuery().ToArray();
        var contentLessons = courses
            .SelectMany(course => course.Sections.SelectMany(section => section.Lessons.Select(lesson => new
            {
                Course = course,
                Section = section,
                Lesson = lesson
            })))
            .Where(item => item.Lesson.Type != LessonType.Quiz)
            .ToArray();
        var lessonIds = contentLessons.Select(item => item.Lesson.Id).ToHashSet(StringComparer.Ordinal);
        var learnerCounts = dbContext.ProgressTrackings
            .Where(progress => lessonIds.Contains(progress.LessonId) &&
                (progress.Status != LessonProgressStatus.NotStarted ||
                    progress.WatchPercent > 0 ||
                    progress.WatchTimeMinutes > 0 ||
                    progress.InteractionAttempts > 0))
            .GroupBy(progress => progress.LessonId)
            .Select(group => new { LessonId = group.Key, Count = group.Select(progress => progress.UserId).Distinct().Count() })
            .ToDictionary(item => item.LessonId, item => item.Count, StringComparer.Ordinal);

        var allRows = contentLessons
            .OrderBy(item => item.Course.Title)
            .ThenBy(item => item.Section.Order)
            .ThenBy(item => item.Lesson.Order)
            .Select(item => MapAdminLessonCatalogRow(item.Course, item.Section, item.Lesson, learnerCounts))
            .ToArray();
        var filteredRows = allRows.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            filteredRows = filteredRows.Where(item =>
                item.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                item.Description.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                item.Topic.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                item.CourseTitle.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                item.SectionTitle.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(topic) && !string.Equals(topic, "all", StringComparison.OrdinalIgnoreCase))
        {
            filteredRows = filteredRows.Where(item => string.Equals(item.Topic, topic.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (status is not null)
        {
            filteredRows = filteredRows.Where(item => item.PublicationStatus == status);
        }

        if (difficulty is not null)
        {
            filteredRows = filteredRows.Where(item => item.Difficulty == difficulty);
        }

        var filteredArray = filteredRows.ToArray();
        var newSince = timeProvider.GetUtcNow().AddDays(-7);

        return new AdminLessonCatalogResponse
        {
            TotalLessons = allRows.Length,
            PublishedLessons = allRows.Count(item => item.PublicationStatus == LessonPublicationStatus.Published),
            DraftLessons = allRows.Count(item => item.PublicationStatus == LessonPublicationStatus.Draft),
            ArchivedLessons = allRows.Count(item => item.PublicationStatus == LessonPublicationStatus.Archived),
            NewLessonsThisWeek = allRows.Count(item => item.CreatedAt >= newSince),
            Page = safePage,
            PageSize = safePageSize,
            TotalItems = filteredArray.Length,
            Topics = allRows
                .Select(item => item.Topic)
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(item => item)
                .ToArray(),
            Items = filteredArray
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToArray()
        };
    }

    public LessonContent GetLessonContent(string lessonId)
    {
        var lesson = GetLessonInternal(lessonId);
        return NormalizeLessonContent(lesson.Content ?? CreateEmptyLessonContent(lesson));
    }

    public LessonContent UpsertLessonContent(string lessonId, LessonContent request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var lesson = GetLessonInternal(lessonId);
        lesson.Content = NormalizeLessonContent(request);
        lesson.UpdatedAt = timeProvider.GetUtcNow();
        TrackAdmin("upsert_content", nameof(Lesson), lesson.Id, $"Cap nhat noi dung bai hoc {lesson.Title}");
        dbContext.SaveChanges();
        return lesson.Content;
    }

    public void DeleteLessonContent(string lessonId)
    {
        var lesson = GetLessonInternal(lessonId);
        lesson.Content = NormalizeLessonContent(new LessonContent());
        lesson.UpdatedAt = timeProvider.GetUtcNow();
        TrackAdmin("delete_content", nameof(Lesson), lesson.Id, $"Xoa noi dung bai hoc {lesson.Title}");
        dbContext.SaveChanges();
    }

    public Lesson CreateLesson(UpsertLessonRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminLessonTitleRequired);

        if (request.Type == LessonType.Quiz)
        {
            throw new ServiceException(ServiceErrors.AdminLessonQuizSeparated);
        }

        var section = GetSectionInternal(request.CourseId, request.SectionId);
        var lessonId = $"lesson-{Guid.NewGuid():N}"[..18];
        var now = timeProvider.GetUtcNow();

        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = request.CourseId,
            SectionId = section.Id,
            Title = request.Title.Trim(),
            Type = request.Type,
            Order = request.Order,
            DurationMinutes = request.DurationMinutes,
            StatusLabel = request.StatusLabel.Trim(),
            Topic = NormalizeAdminTopic(request.Topic, section),
            Difficulty = request.Difficulty,
            PublicationStatus = request.PublicationStatus,
            ThumbnailUrl = NormalizeThumbnailUrl(request.ThumbnailUrl, request.VideoContent),
            CreatedAt = now,
            UpdatedAt = now,
            Content = request.Content is null ? null : NormalizeLessonContent(request.Content),
            VideoContent = request.Type == LessonType.Video ? request.VideoContent ?? new VideoContent() : null,
            Assessment = request.Type is LessonType.Interactive or LessonType.Quiz
                ? CreateAssessment(lessonId, request.Type, request.Assessment)
                : null,
            ScormPackage = request.Type == LessonType.Scorm
                ? CreateScormPackage(lessonId, request.ScormPackage)
                : null
        };

        dbContext.Lessons.Add(lesson);
        TrackAdmin("create", nameof(Lesson), lesson.Id, $"Tao bai hoc {lesson.Title}");
        dbContext.SaveChanges();
        return GetLessonInternal(lesson.Id);
    }

    public CourseQuiz CreateQuiz(CreateCourseQuizRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminQuizTitleRequired);

        var course = GetCourseInternal(request.CourseId);
        var hostSection = ResolveQuizHostSection(course, request.SectionId);
        var lessonId = $"lesson-{Guid.NewGuid():N}"[..18];
        var quizId = $"quiz-{Guid.NewGuid():N}"[..18];

        var lesson = new Lesson
        {
            Id = lessonId,
            CourseId = request.CourseId,
            SectionId = hostSection.Id,
            Title = BuildQuizHostTitle(request.Title),
            Type = LessonType.Quiz,
            Order = GetNextHiddenQuizOrder(hostSection),
            DurationMinutes = 1,
            StatusLabel = "__quiz_host__",
            Topic = NormalizeAdminTopic(string.Empty, hostSection),
            Difficulty = LessonDifficulty.Advanced,
            PublicationStatus = LessonPublicationStatus.Published,
            ThumbnailUrl = string.Empty,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow(),
            VideoContent = null,
            Assessment = CreateAssessment(lessonId, LessonType.Quiz, request.Assessment),
            ScormPackage = null
        };

        var quiz = new CourseQuiz
        {
            Id = quizId,
            CourseId = request.CourseId,
            SectionId = NormalizeSectionId(request.SectionId),
            AssessmentLessonId = lessonId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Order = request.Order
        };

        dbContext.Lessons.Add(lesson);
        dbContext.CourseQuizzes.Add(quiz);
        TrackAdmin("create", nameof(CourseQuiz), quiz.Id, $"Tao bai kiem tra {quiz.Title}");
        dbContext.SaveChanges();
        return GetCourseQuizInternal(quizId);
    }

    public Lesson UpdateLesson(string lessonId, UpsertLessonRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminLessonTitleRequired);

        if (request.Type == LessonType.Quiz)
        {
            throw new ServiceException(ServiceErrors.AdminLessonQuizSeparated);
        }

        var lesson = dbContext.Lessons
            .Include(item => item.Assessment)
            .Include(item => item.ScormPackage)
                .ThenInclude(item => item!.Scos)
            .SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);

        var section = GetSectionInternal(request.CourseId, request.SectionId);

        lesson.CourseId = request.CourseId;
        lesson.SectionId = request.SectionId;
        lesson.Title = request.Title.Trim();
        lesson.Type = request.Type;
        lesson.Order = request.Order;
        lesson.DurationMinutes = request.DurationMinutes;
        lesson.StatusLabel = request.StatusLabel.Trim();
        lesson.Topic = NormalizeAdminTopic(request.Topic, section);
        lesson.Difficulty = request.Difficulty;
        lesson.PublicationStatus = request.PublicationStatus;
        lesson.ThumbnailUrl = NormalizeThumbnailUrl(request.ThumbnailUrl, request.VideoContent);
        lesson.CreatedAt = lesson.CreatedAt == default ? timeProvider.GetUtcNow() : lesson.CreatedAt;
        lesson.UpdatedAt = timeProvider.GetUtcNow();
        lesson.Content = request.Content is null ? lesson.Content : NormalizeLessonContent(request.Content);
        lesson.VideoContent = request.Type == LessonType.Video ? request.VideoContent ?? new VideoContent() : null;

        if (request.Type == LessonType.Video)
        {
            if (lesson.Assessment is not null)
            {
                dbContext.LessonAssessments.Remove(lesson.Assessment);
                lesson.Assessment = null;
            }

            if (lesson.ScormPackage is not null)
            {
                dbContext.ScormPackages.Remove(lesson.ScormPackage);
                lesson.ScormPackage = null;
            }
        }
        else if (request.Type is LessonType.Interactive or LessonType.Quiz)
        {
            if (lesson.ScormPackage is not null)
            {
                dbContext.ScormPackages.Remove(lesson.ScormPackage);
                lesson.ScormPackage = null;
            }

            if (lesson.Assessment is null)
            {
                lesson.Assessment = CreateAssessment(lessonId, request.Type, request.Assessment);
            }
            else
            {
                ApplyAssessment(lesson.Assessment, request.Type, request.Assessment);
            }
        }
        else if (request.Type == LessonType.Scorm)
        {
            lesson.VideoContent = null;

            if (lesson.Assessment is not null)
            {
                dbContext.LessonAssessments.Remove(lesson.Assessment);
                lesson.Assessment = null;
            }

            if (lesson.ScormPackage is null)
            {
                lesson.ScormPackage = CreateScormPackage(lessonId, request.ScormPackage);
            }
            else
            {
                ApplyScormPackage(lesson.ScormPackage, request.ScormPackage);
            }
        }

        TrackAdmin("update", nameof(Lesson), lesson.Id, $"Cap nhat bai hoc {lesson.Title}");
        dbContext.SaveChanges();
        return GetLessonInternal(lessonId);
    }

    public Lesson UpdateLessonMetadata(string lessonId, UpdateLessonMetadataRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminLessonTitleRequired);
        var lesson = dbContext.Lessons.SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);
        var section = GetSectionInternal(request.CourseId, request.SectionId);
        lesson.CourseId = request.CourseId;
        lesson.SectionId = section.Id;
        lesson.Title = request.Title.Trim();
        lesson.Order = request.Order;
        lesson.DurationMinutes = request.DurationMinutes;
        lesson.StatusLabel = request.StatusLabel.Trim();
        lesson.Topic = NormalizeAdminTopic(request.Topic, section);
        lesson.Difficulty = request.Difficulty;
        lesson.PublicationStatus = request.PublicationStatus;
        lesson.UpdatedAt = timeProvider.GetUtcNow();
        TrackAdmin("update_metadata", nameof(Lesson), lesson.Id, $"Cap nhat thong tin bai hoc {lesson.Title}");
        dbContext.SaveChanges();
        return GetLessonInternal(lessonId);
    }

    public CourseQuiz UpdateQuiz(string quizId, UpdateCourseQuizRequest request)
    {
        ValidateText(request.Title, ServiceErrors.AdminQuizTitleRequired);

        var quiz = GetCourseQuizInternal(quizId);
        var course = GetCourseInternal(request.CourseId);
        var hostSection = ResolveQuizHostSection(course, request.SectionId);
        var assessmentLesson = GetLessonInternal(quiz.AssessmentLessonId);

        quiz.CourseId = request.CourseId;
        quiz.SectionId = NormalizeSectionId(request.SectionId);
        quiz.Title = request.Title.Trim();
        quiz.Description = request.Description.Trim();
        quiz.Order = request.Order;

        assessmentLesson.CourseId = request.CourseId;
        assessmentLesson.SectionId = hostSection.Id;
        assessmentLesson.Title = BuildQuizHostTitle(request.Title);
        assessmentLesson.Type = LessonType.Quiz;
        assessmentLesson.StatusLabel = "__quiz_host__";
        assessmentLesson.Topic = NormalizeAdminTopic(string.Empty, hostSection);
        assessmentLesson.Difficulty = LessonDifficulty.Advanced;
        assessmentLesson.PublicationStatus = LessonPublicationStatus.Published;
        assessmentLesson.UpdatedAt = timeProvider.GetUtcNow();
        assessmentLesson.DurationMinutes = Math.Max(assessmentLesson.DurationMinutes, 1);
        assessmentLesson.VideoContent = null;
        assessmentLesson.ScormPackage = null;

        if (assessmentLesson.Assessment is null)
        {
            assessmentLesson.Assessment = CreateAssessment(assessmentLesson.Id, LessonType.Quiz, request.Assessment);
        }
        else
        {
            ApplyAssessment(assessmentLesson.Assessment, LessonType.Quiz, request.Assessment);
        }

        TrackAdmin("update", nameof(CourseQuiz), quiz.Id, $"Cap nhat bai kiem tra {quiz.Title}");
        dbContext.SaveChanges();
        return GetCourseQuizInternal(quizId);
    }

    public void DeleteLesson(string lessonId)
    {
        var lesson = dbContext.Lessons.SingleOrDefault(item => item.Id == lessonId)
            ?? throw new ServiceException(ServiceErrors.AdminLessonNotFound);

        if (lesson.PublicationStatus == LessonPublicationStatus.Archived)
        {
            return;
        }

        lesson.PublicationStatus = LessonPublicationStatus.Archived;
        lesson.StatusLabel = "Đã lưu trữ";
        lesson.UpdatedAt = timeProvider.GetUtcNow();
        TrackAdmin("archive", nameof(Lesson), lesson.Id, $"Luu tru bai hoc {lesson.Title}");
        dbContext.SaveChanges();
    }

    public void DeleteQuiz(string quizId)
    {
        var quiz = GetCourseQuizInternal(quizId);
        TrackAdmin("archive", nameof(CourseQuiz), quiz.Id, $"Luu tru bai kiem tra {quiz.Title}");
        DeleteLesson(quiz.AssessmentLessonId);
    }

    public IReadOnlyCollection<LessonQuestion> GetQuestions(string? lessonId, string? quizId)
    {
        var resolvedLessonId = ResolveQuestionOwnerLessonId(lessonId, quizId, allowEmpty: true);
        var query = QuestionGraphQuery();
        if (string.IsNullOrWhiteSpace(resolvedLessonId))
        {
            var quizLessonIds = dbContext.CourseQuizzes.Select(quiz => quiz.AssessmentLessonId);
            query = query.Where(question => quizLessonIds.Contains(question.LessonId));
        }

        return query
            .Where(question => string.IsNullOrWhiteSpace(resolvedLessonId) || question.LessonId == resolvedLessonId)
            .OrderBy(question => question.LessonId)
            .ThenBy(question => question.Order)
            .ToArray();
    }

    public LessonQuestion CreateQuestion(UpsertLessonQuestionRequest request)
    {
        ValidateQuestionRequest(request);
        var lessonId = ResolveQuestionOwnerLessonId(request.LessonId, request.QuizId);

        var questionId = $"question-{Guid.NewGuid():N}"[..20];
        var question = BuildQuestion(questionId, lessonId, request);
        dbContext.LessonQuestions.Add(question);
        TrackAdmin("create", nameof(LessonQuestion), question.Id, $"Tao cau hoi {question.Prompt}");
        dbContext.SaveChanges();

        return GetQuestionInternal(questionId);
    }

    public LessonQuestion UpdateQuestion(string questionId, UpsertLessonQuestionRequest request)
    {
        ValidateQuestionRequest(request);
        var lessonId = ResolveQuestionOwnerLessonId(request.LessonId, request.QuizId);

        var question = GetQuestionInternal(questionId);
        dbContext.LessonQuestionOptions.RemoveRange(question.Options);
        dbContext.LessonQuestionHotspotTargets.RemoveRange(question.HotspotTargets);
        dbContext.LessonQuestionDragItems.RemoveRange(question.DragItems);
        dbContext.LessonQuestionDragTargets.RemoveRange(question.DragTargets);
        dbContext.LessonQuestionDragPairs.RemoveRange(question.CorrectPairs);

        question.LessonId = lessonId;
        question.Type = request.Type;
        question.Order = request.Order;
        question.Prompt = request.Prompt.Trim();
        question.Explanation = request.Explanation.Trim();
        question.Statement = string.IsNullOrWhiteSpace(request.Statement) ? null : request.Statement.Trim();
        question.MediaTitle = string.IsNullOrWhiteSpace(request.MediaTitle) ? null : request.MediaTitle.Trim();
        question.MediaUrl = string.IsNullOrWhiteSpace(request.MediaUrl) ? null : request.MediaUrl.Trim();
        question.ScenarioTitle = string.IsNullOrWhiteSpace(request.ScenarioTitle) ? null : request.ScenarioTitle.Trim();
        question.ScenarioContext = string.IsNullOrWhiteSpace(request.ScenarioContext) ? null : request.ScenarioContext.Trim();
        question.Options = BuildOptions(questionId, request.Options);
        question.HotspotTargets = BuildHotspotTargets(questionId, request.HotspotTargets);
        question.DragItems = BuildDragItems(questionId, request.DragItems);
        question.DragTargets = BuildDragTargets(questionId, request.DragTargets);
        question.CorrectPairs = BuildDragPairs(questionId, request.CorrectPairs);

        TrackAdmin("update", nameof(LessonQuestion), question.Id, $"Cap nhat cau hoi {question.Prompt}");
        dbContext.SaveChanges();
        return GetQuestionInternal(questionId);
    }

    public void DeleteQuestion(string questionId)
    {
        var question = dbContext.LessonQuestions.SingleOrDefault(item => item.Id == questionId)
            ?? throw new ServiceException(ServiceErrors.AdminQuestionNotFound);

        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(result => result.QuestionId == questionId));
        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(result => result.QuestionId == questionId));
        dbContext.LessonQuestions.Remove(question);
        TrackAdmin("delete", nameof(LessonQuestion), question.Id, $"Xoa cau hoi {question.Prompt}");
        dbContext.SaveChanges();
    }

}
