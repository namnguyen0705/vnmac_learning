using System.Data;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Infrastructure;

public static class DatabaseInitializer
{
    private const string InitialMigrationId = "20260414030329_InitialCreate";
    private const string ProductVersion = "10.0.0";
    private static readonly IReadOnlyDictionary<string, string> SeedUsernames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["admin-1"] = "admin",
        ["content-1"] = "content",
        ["viewer-1"] = "viewer",
        ["learner-01"] = "learner01",
        ["learner-02"] = "learner02",
        ["learner-03"] = "learner03",
        ["learner-04"] = "learner04"
    };

    public const string SeedDefaultPassword = "Vnmac@123";

    public static void Initialize(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TrainingDbContext>();
        var passwordService = scope.ServiceProvider.GetRequiredService<PasswordService>();

        BaselineLegacySchemaIfNeeded(dbContext);
        dbContext.Database.Migrate();
        SeedIfEmpty(dbContext);
        EnsureCourseEnrollments(dbContext);
        EnsureCertificateCourseLinks(dbContext);
        EnsureCourseQuizzesFromLegacyLessons(dbContext);
        EnsureVideoAssets(dbContext);
        EnsureAssessmentData(dbContext);
        EnsureSeedDataLocalized(dbContext);
        EnsureUserCredentials(dbContext, passwordService);
    }

    private static void BaselineLegacySchemaIfNeeded(TrainingDbContext dbContext)
    {
        if (!dbContext.Database.CanConnect())
        {
            return;
        }

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;

        if (shouldClose)
        {
            connection.Open();
        }

        try
        {
            if (InitialMigrationExists(connection) || !LegacySchemaExists(connection))
            {
                return;
            }

            using var command = connection.CreateCommand();
            command.CommandText = $"""
                IF OBJECT_ID(N'__EFMigrationsHistory', N'U') IS NULL
                BEGIN
                    CREATE TABLE [__EFMigrationsHistory]
                    (
                        [MigrationId] nvarchar(150) NOT NULL,
                        [ProductVersion] nvarchar(32) NOT NULL,
                        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                    );
                END;

                IF NOT EXISTS
                (
                    SELECT 1
                    FROM [__EFMigrationsHistory]
                    WHERE [MigrationId] = N'{InitialMigrationId}'
                )
                BEGIN
                    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
                    VALUES (N'{InitialMigrationId}', N'{ProductVersion}');
                END;
                """;
            command.ExecuteNonQuery();
        }
        finally
        {
            if (shouldClose)
            {
                connection.Close();
            }
        }
    }

    private static bool InitialMigrationExists(System.Data.Common.DbConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"""
            IF OBJECT_ID(N'__EFMigrationsHistory', N'U') IS NULL
            BEGIN
                SELECT 0;
            END
            ELSE
            BEGIN
                SELECT CASE
                    WHEN EXISTS
                    (
                        SELECT 1
                        FROM [__EFMigrationsHistory]
                        WHERE [MigrationId] = N'{InitialMigrationId}'
                    )
                    THEN 1
                    ELSE 0
                END;
            END;
            """;
        return Convert.ToInt32(command.ExecuteScalar()) == 1;
    }

    private static bool LegacySchemaExists(System.Data.Common.DbConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT CASE
                WHEN EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Courses')
                 AND EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Users')
                 AND EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Certificates')
                THEN 1
                ELSE 0
            END;
            """;
        return Convert.ToInt32(command.ExecuteScalar()) == 1;
    }

    private static void SeedIfEmpty(TrainingDbContext dbContext)
    {
        if (dbContext.Users.Any() || dbContext.Courses.Any())
        {
            return;
        }

        var seed = SeedDataFactory.Create();

        dbContext.Users.AddRange(seed.Users);
        dbContext.Courses.AddRange(seed.Courses);
        dbContext.CourseEnrollments.AddRange(seed.CourseEnrollments);
        dbContext.ProgressTrackings.AddRange(seed.ProgressTrackings);
        dbContext.QuizResults.AddRange(seed.QuizResults);
        dbContext.QuizAttempts.AddRange(seed.QuizAttempts);
        dbContext.InteractionAttempts.AddRange(seed.InteractionAttempts);
        dbContext.Certificates.AddRange(seed.Certificates);
        dbContext.SaveChanges();
    }

    private static void EnsureCourseEnrollments(TrainingDbContext dbContext)
    {
        var publishedCourseIds = dbContext.Courses
            .Where(course => course.Status == CourseStatus.Published)
            .OrderBy(course => course.Title)
            .Select(course => course.Id)
            .ToArray();

        if (publishedCourseIds.Length == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var learners = dbContext.Users
            .Where(user => user.Role == UserRole.Learner)
            .ToArray();

        var existingKeys = dbContext.CourseEnrollments
            .Select(item => new { item.UserId, item.CourseId })
            .ToArray()
            .ToHashSet();

        var changed = false;
        foreach (var learner in learners)
        {
            if (publishedCourseIds.Any(courseId => existingKeys.Contains(new { UserId = learner.Id, CourseId = courseId })))
            {
                continue;
            }

            dbContext.CourseEnrollments.Add(new CourseEnrollment
            {
                UserId = learner.Id,
                CourseId = publishedCourseIds[0],
                EnrolledAt = learner.CreatedAt,
                StartedAt = null,
                CompletedAt = null,
                LastAccessedAt = learner.LastLogin,
                Status = CourseEnrollmentStatus.Enrolled
            });
            changed = true;
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static void EnsureCertificateCourseLinks(TrainingDbContext dbContext)
    {
        var defaultCourseId = dbContext.Courses
            .Where(course => course.Status == CourseStatus.Published)
            .OrderBy(course => course.Title)
            .Select(course => course.Id)
            .FirstOrDefault();

        if (string.IsNullOrWhiteSpace(defaultCourseId))
        {
            return;
        }

        var changed = false;
        foreach (var certificate in dbContext.Certificates.Where(item => string.IsNullOrWhiteSpace(item.CourseId)))
        {
            certificate.CourseId = defaultCourseId;
            changed = true;
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static void EnsureAssessmentData(TrainingDbContext dbContext)
    {
        var existingLessonIds = dbContext.Lessons.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var seededAssessments = SeedDataFactory.Create().Courses
            .SelectMany(course => course.Sections)
            .SelectMany(section => section.Lessons)
            .Where(lesson => lesson.Assessment is not null && existingLessonIds.Contains(lesson.Id))
            .Select(lesson => lesson.Assessment!)
            .ToArray();

        var existingAssessmentLessonIds = dbContext.LessonAssessments
            .Select(item => item.LessonId)
            .ToHashSet(StringComparer.Ordinal);

        var missingAssessments = seededAssessments
            .Where(item => !existingAssessmentLessonIds.Contains(item.LessonId))
            .Select(CloneAssessment)
            .ToArray();

        if (missingAssessments.Length == 0)
        {
            return;
        }

        dbContext.LessonAssessments.AddRange(missingAssessments);
        dbContext.SaveChanges();
    }

    private static void EnsureCourseQuizzesFromLegacyLessons(TrainingDbContext dbContext)
    {
        var existingHostLessonIds = dbContext.CourseQuizzes
            .Select(item => item.AssessmentLessonId)
            .ToHashSet(StringComparer.Ordinal);

        var legacyQuizLessons = dbContext.Lessons
            .Include(item => item.Assessment)
            .Where(item => item.Type == LessonType.Quiz)
            .OrderBy(item => item.CourseId)
            .ThenBy(item => item.SectionId)
            .ThenBy(item => item.Order)
            .ToArray();

        var changed = false;
        foreach (var lesson in legacyQuizLessons)
        {
            if (existingHostLessonIds.Contains(lesson.Id))
            {
                continue;
            }

            dbContext.CourseQuizzes.Add(new CourseQuiz
            {
                Id = $"quiz-{Guid.NewGuid():N}"[..18],
                CourseId = lesson.CourseId,
                SectionId = lesson.SectionId,
                AssessmentLessonId = lesson.Id,
                Title = NormalizeLegacyQuizTitle(lesson.Title),
                Description = lesson.Assessment?.Intro ?? string.Empty,
                Order = lesson.Order
            });
            changed = true;
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static void EnsureVideoAssets(TrainingDbContext dbContext)
    {
        var seededVideos = SeedDataFactory.Create().Courses
            .SelectMany(course => course.Sections)
            .SelectMany(section => section.Lessons)
            .Where(lesson => lesson.Type == LessonType.Video && lesson.VideoContent is not null)
            .ToDictionary(lesson => lesson.Id, lesson => lesson.VideoContent!, StringComparer.Ordinal);

        if (seededVideos.Count == 0)
        {
            return;
        }

        var seededLessonIds = seededVideos.Keys.ToArray();
        var existingLessons = dbContext.Lessons
            .Where(lesson => seededLessonIds.Contains(lesson.Id) && lesson.Type == LessonType.Video)
            .ToArray();

        var changed = false;
        foreach (var lesson in existingLessons)
        {
            if (!seededVideos.TryGetValue(lesson.Id, out var seededVideo))
            {
                continue;
            }

            if (lesson.VideoContent is null)
            {
                lesson.VideoContent = CloneVideoContent(seededVideo);
                changed = true;
                continue;
            }

            if (string.IsNullOrWhiteSpace(lesson.VideoContent.VideoUrl))
            {
                lesson.VideoContent.VideoUrl = seededVideo.VideoUrl;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(lesson.VideoContent.PosterUrl) && !string.IsNullOrWhiteSpace(seededVideo.PosterUrl))
            {
                lesson.VideoContent.PosterUrl = seededVideo.PosterUrl;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(lesson.VideoContent.CaptionsUrl) && !string.IsNullOrWhiteSpace(seededVideo.CaptionsUrl))
            {
                lesson.VideoContent.CaptionsUrl = seededVideo.CaptionsUrl;
                changed = true;
            }
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static void EnsureSeedDataLocalized(TrainingDbContext dbContext)
    {
        var seed = SeedDataFactory.Create();
        var changed = false;

        var seededUsers = seed.Users.ToDictionary(item => item.Id, StringComparer.Ordinal);
        var seededUserIds = seededUsers.Keys.ToArray();
        var existingUsers = dbContext.Users
            .Where(item => seededUserIds.Contains(item.Id))
            .ToArray();

        foreach (var user in existingUsers)
        {
            var seededUser = seededUsers[user.Id];

            if (!StringComparer.Ordinal.Equals(user.FullName, seededUser.FullName))
            {
                user.FullName = seededUser.FullName;
                changed = true;
            }

            if (!StringComparer.Ordinal.Equals(user.Province, seededUser.Province))
            {
                user.Province = seededUser.Province;
                changed = true;
            }

            if (!StringComparer.Ordinal.Equals(user.Group, seededUser.Group))
            {
                user.Group = seededUser.Group;
                changed = true;
            }
        }

        var seededCourses = seed.Courses.ToDictionary(item => item.Id, StringComparer.Ordinal);
        var seededCourseIds = seededCourses.Keys.ToArray();
        var existingCourses = dbContext.Courses
            .Where(item => seededCourseIds.Contains(item.Id))
            .Include(item => item.Sections)
                .ThenInclude(item => item.Lessons)
                    .ThenInclude(item => item.Assessment)
                        .ThenInclude(item => item!.Questions)
                            .ThenInclude(item => item.Options)
            .Include(item => item.Sections)
                .ThenInclude(item => item.Lessons)
                    .ThenInclude(item => item.Assessment)
                        .ThenInclude(item => item!.Questions)
                            .ThenInclude(item => item.HotspotTargets)
            .Include(item => item.Sections)
                .ThenInclude(item => item.Lessons)
                    .ThenInclude(item => item.Assessment)
                        .ThenInclude(item => item!.Questions)
                            .ThenInclude(item => item.DragItems)
            .Include(item => item.Sections)
                .ThenInclude(item => item.Lessons)
                    .ThenInclude(item => item.Assessment)
                        .ThenInclude(item => item!.Questions)
                            .ThenInclude(item => item.DragTargets)
            .ToArray();

        foreach (var course in existingCourses)
        {
            if (!seededCourses.TryGetValue(course.Id, out var seededCourse))
            {
                continue;
            }

            if (!StringComparer.Ordinal.Equals(course.Title, seededCourse.Title))
            {
                course.Title = seededCourse.Title;
                changed = true;
            }

            if (!StringComparer.Ordinal.Equals(course.Description, seededCourse.Description))
            {
                course.Description = seededCourse.Description;
                changed = true;
            }

            var seededSections = seededCourse.Sections.ToDictionary(item => item.Id, StringComparer.Ordinal);
            foreach (var section in course.Sections)
            {
                if (!seededSections.TryGetValue(section.Id, out var seededSection))
                {
                    continue;
                }

                if (!StringComparer.Ordinal.Equals(section.Title, seededSection.Title))
                {
                    section.Title = seededSection.Title;
                    changed = true;
                }

                if (!StringComparer.Ordinal.Equals(section.Description, seededSection.Description))
                {
                    section.Description = seededSection.Description;
                    changed = true;
                }

                var seededLessons = seededSection.Lessons.ToDictionary(item => item.Id, StringComparer.Ordinal);
                foreach (var lesson in section.Lessons)
                {
                    if (!seededLessons.TryGetValue(lesson.Id, out var seededLesson))
                    {
                        continue;
                    }

                    if (!StringComparer.Ordinal.Equals(lesson.Title, seededLesson.Title))
                    {
                        lesson.Title = seededLesson.Title;
                        changed = true;
                    }

                    if (!StringComparer.Ordinal.Equals(lesson.StatusLabel, seededLesson.StatusLabel))
                    {
                        lesson.StatusLabel = seededLesson.StatusLabel;
                        changed = true;
                    }

                    if (seededLesson.VideoContent is not null)
                    {
                        lesson.VideoContent ??= CloneVideoContent(seededLesson.VideoContent);

                        if (!StringComparer.Ordinal.Equals(lesson.VideoContent.Intro, seededLesson.VideoContent.Intro))
                        {
                            lesson.VideoContent.Intro = seededLesson.VideoContent.Intro;
                            changed = true;
                        }

                        if (!lesson.VideoContent.Objectives.SequenceEqual(seededLesson.VideoContent.Objectives, StringComparer.Ordinal))
                        {
                            lesson.VideoContent.Objectives = [.. seededLesson.VideoContent.Objectives];
                            changed = true;
                        }

                        if (!lesson.VideoContent.Checkpoints.SequenceEqual(seededLesson.VideoContent.Checkpoints, StringComparer.Ordinal))
                        {
                            lesson.VideoContent.Checkpoints = [.. seededLesson.VideoContent.Checkpoints];
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(lesson.VideoContent.TranscriptHighlight, seededLesson.VideoContent.TranscriptHighlight))
                        {
                            lesson.VideoContent.TranscriptHighlight = seededLesson.VideoContent.TranscriptHighlight;
                            changed = true;
                        }

                        if (string.IsNullOrWhiteSpace(lesson.VideoContent.VideoUrl))
                        {
                            lesson.VideoContent.VideoUrl = seededLesson.VideoContent.VideoUrl;
                            changed = true;
                        }

                        if (string.IsNullOrWhiteSpace(lesson.VideoContent.PosterUrl) && !string.IsNullOrWhiteSpace(seededLesson.VideoContent.PosterUrl))
                        {
                            lesson.VideoContent.PosterUrl = seededLesson.VideoContent.PosterUrl;
                            changed = true;
                        }

                        if (string.IsNullOrWhiteSpace(lesson.VideoContent.CaptionsUrl) && !string.IsNullOrWhiteSpace(seededLesson.VideoContent.CaptionsUrl))
                        {
                            lesson.VideoContent.CaptionsUrl = seededLesson.VideoContent.CaptionsUrl;
                            changed = true;
                        }
                    }

                    if (seededLesson.Assessment is null)
                    {
                        continue;
                    }

                    if (lesson.Assessment is null)
                    {
                        lesson.Assessment = CloneAssessment(seededLesson.Assessment);
                        changed = true;
                        continue;
                    }

                    if (!StringComparer.Ordinal.Equals(lesson.Assessment.Intro, seededLesson.Assessment.Intro))
                    {
                        lesson.Assessment.Intro = seededLesson.Assessment.Intro;
                        changed = true;
                    }

                    if (!StringComparer.Ordinal.Equals(lesson.Assessment.RetryHint, seededLesson.Assessment.RetryHint))
                    {
                        lesson.Assessment.RetryHint = seededLesson.Assessment.RetryHint;
                        changed = true;
                    }

                    var seededQuestions = seededLesson.Assessment.Questions.ToDictionary(item => item.Id, StringComparer.Ordinal);
                    foreach (var question in lesson.Assessment.Questions)
                    {
                        if (!seededQuestions.TryGetValue(question.Id, out var seededQuestion))
                        {
                            continue;
                        }

                        if (!StringComparer.Ordinal.Equals(question.Prompt, seededQuestion.Prompt))
                        {
                            question.Prompt = seededQuestion.Prompt;
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(question.Explanation, seededQuestion.Explanation))
                        {
                            question.Explanation = seededQuestion.Explanation;
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(question.Statement, seededQuestion.Statement))
                        {
                            question.Statement = seededQuestion.Statement;
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(question.MediaTitle, seededQuestion.MediaTitle))
                        {
                            question.MediaTitle = seededQuestion.MediaTitle;
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(question.ScenarioTitle, seededQuestion.ScenarioTitle))
                        {
                            question.ScenarioTitle = seededQuestion.ScenarioTitle;
                            changed = true;
                        }

                        if (!StringComparer.Ordinal.Equals(question.ScenarioContext, seededQuestion.ScenarioContext))
                        {
                            question.ScenarioContext = seededQuestion.ScenarioContext;
                            changed = true;
                        }

                        var seededOptions = seededQuestion.Options.ToDictionary(item => item.Code, StringComparer.Ordinal);
                        foreach (var option in question.Options)
                        {
                            if (seededOptions.TryGetValue(option.Code, out var seededOption) &&
                                !StringComparer.Ordinal.Equals(option.Label, seededOption.Label))
                            {
                                option.Label = seededOption.Label;
                                changed = true;
                            }
                        }

                        var seededTargets = seededQuestion.HotspotTargets.ToDictionary(item => item.Code, StringComparer.Ordinal);
                        foreach (var target in question.HotspotTargets)
                        {
                            if (seededTargets.TryGetValue(target.Code, out var seededTarget) &&
                                !StringComparer.Ordinal.Equals(target.Label, seededTarget.Label))
                            {
                                target.Label = seededTarget.Label;
                                changed = true;
                            }
                        }

                        var seededDragItems = seededQuestion.DragItems.ToDictionary(item => item.Code, StringComparer.Ordinal);
                        foreach (var dragItem in question.DragItems)
                        {
                            if (seededDragItems.TryGetValue(dragItem.Code, out var seededDragItem) &&
                                !StringComparer.Ordinal.Equals(dragItem.Label, seededDragItem.Label))
                            {
                                dragItem.Label = seededDragItem.Label;
                                changed = true;
                            }
                        }

                        var seededDragTargets = seededQuestion.DragTargets.ToDictionary(item => item.Code, StringComparer.Ordinal);
                        foreach (var dragTarget in question.DragTargets)
                        {
                            if (seededDragTargets.TryGetValue(dragTarget.Code, out var seededDragTarget) &&
                                !StringComparer.Ordinal.Equals(dragTarget.Label, seededDragTarget.Label))
                            {
                                dragTarget.Label = seededDragTarget.Label;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        var interactionResults = dbContext.InteractionAttemptResults
            .Where(item => item.Explanation == "Correct." || item.Explanation == "Retry using the safe response guidance.")
            .ToArray();

        foreach (var result in interactionResults)
        {
            var localized = result.Correct
                ? "Chính xác."
                : "Hãy thử lại và chọn phương án an toàn nhất.";

            if (!StringComparer.Ordinal.Equals(result.Explanation, localized))
            {
                result.Explanation = localized;
                changed = true;
            }
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static void EnsureUserCredentials(TrainingDbContext dbContext, PasswordService passwordService)
    {
        var usedUsernames = dbContext.Users
            .Where(user => !string.IsNullOrWhiteSpace(user.Username))
            .Select(user => user.Username)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var usedEmails = dbContext.Users
            .Where(user => !string.IsNullOrWhiteSpace(user.Email))
            .Select(user => user.Email)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var changed = false;
        foreach (var user in dbContext.Users)
        {
            if (string.IsNullOrWhiteSpace(user.Username))
            {
                user.Username = GenerateUsername(user, usedUsernames);
                usedUsernames.Add(user.Username);
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.Email))
            {
                user.Email = GenerateEmail(user, usedEmails);
                usedEmails.Add(user.Email);
                changed = true;
            }

            if (!user.IsEmailVerified)
            {
                user.IsEmailVerified = true;
                user.EmailVerifiedAt = user.CreatedAt;
                changed = true;
            }
            else if (!user.EmailVerifiedAt.HasValue)
            {
                user.EmailVerifiedAt = user.CreatedAt;
                changed = true;
            }

            if (user.Role != UserRole.Learner && !user.CreatedByAdmin)
            {
                user.CreatedByAdmin = true;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                user.PasswordHash = passwordService.HashPassword(user, SeedDefaultPassword);
                changed = true;
            }
        }

        if (changed)
        {
            dbContext.SaveChanges();
        }
    }

    private static string GenerateUsername(User user, ISet<string> usedUsernames)
    {
        if (SeedUsernames.TryGetValue(user.Id, out var seedUsername) && !usedUsernames.Contains(seedUsername))
        {
            return seedUsername;
        }

        var baseUsername = SanitizeUsername(user.Username);
        if (string.IsNullOrWhiteSpace(baseUsername))
        {
            baseUsername = SanitizeUsername(user.FullName);
        }

        if (string.IsNullOrWhiteSpace(baseUsername))
        {
            baseUsername = SanitizeUsername(user.PhoneNumber);
        }

        if (string.IsNullOrWhiteSpace(baseUsername))
        {
            baseUsername = SanitizeUsername(user.Id);
        }

        if (string.IsNullOrWhiteSpace(baseUsername))
        {
            baseUsername = $"user{Math.Abs(user.Id.GetHashCode())}";
        }

        var candidate = baseUsername;
        var suffix = 1;

        while (usedUsernames.Contains(candidate))
        {
            candidate = $"{baseUsername}{suffix}";
            suffix++;
        }

        return candidate;
    }

    private static string GenerateEmail(User user, ISet<string> usedEmails)
    {
        var baseLocalPart = SanitizeUsername(user.Username);
        if (string.IsNullOrWhiteSpace(baseLocalPart))
        {
            baseLocalPart = SanitizeUsername(user.FullName);
        }

        if (string.IsNullOrWhiteSpace(baseLocalPart))
        {
            baseLocalPart = SanitizeUsername(user.Id);
        }

        if (string.IsNullOrWhiteSpace(baseLocalPart))
        {
            baseLocalPart = $"user{Math.Abs(user.Id.GetHashCode())}";
        }

        var candidate = $"{baseLocalPart}@vnmac.local";
        var suffix = 1;

        while (usedEmails.Contains(candidate))
        {
            candidate = $"{baseLocalPart}{suffix}@vnmac.local";
            suffix++;
        }

        return candidate;
    }

    private static string SanitizeUsername(string value)
    {
        return new string(value
            .Trim()
            .ToLowerInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());
    }

    private static LessonAssessment CloneAssessment(LessonAssessment source)
    {
        return new LessonAssessment
        {
            LessonId = source.LessonId,
            Intro = source.Intro,
            RetryHint = source.RetryHint,
            PassScore = source.PassScore,
            RandomizeQuestionOrder = source.RandomizeQuestionOrder,
            RandomizeOptionOrder = source.RandomizeOptionOrder,
            Questions = source.Questions.Select(CloneQuestion).ToList()
        };
    }

    private static VideoContent CloneVideoContent(VideoContent source)
    {
        return new VideoContent
        {
            Intro = source.Intro,
            VideoUrl = source.VideoUrl,
            PosterUrl = source.PosterUrl,
            CaptionsUrl = source.CaptionsUrl,
            Objectives = [.. source.Objectives],
            Checkpoints = [.. source.Checkpoints],
            TranscriptHighlight = source.TranscriptHighlight
        };
    }

    private static string NormalizeLegacyQuizTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "Bài quiz";
        }

        return title.Replace("Bài kiểm tra", "Quiz", StringComparison.OrdinalIgnoreCase).Trim();
    }

    private static LessonQuestion CloneQuestion(LessonQuestion source)
    {
        return new LessonQuestion
        {
            Id = source.Id,
            LessonId = source.LessonId,
            Type = source.Type,
            Order = source.Order,
            Prompt = source.Prompt,
            Explanation = source.Explanation,
            Statement = source.Statement,
            MediaTitle = source.MediaTitle,
            ScenarioTitle = source.ScenarioTitle,
            ScenarioContext = source.ScenarioContext,
            Options = source.Options.Select(item => new LessonQuestionOption
            {
                QuestionId = item.QuestionId,
                Code = item.Code,
                Label = item.Label,
                Order = item.Order,
                IsCorrect = item.IsCorrect
            }).ToList(),
            HotspotTargets = source.HotspotTargets.Select(item => new LessonQuestionHotspotTarget
            {
                QuestionId = item.QuestionId,
                Code = item.Code,
                Label = item.Label,
                Order = item.Order,
                Shape = item.Shape,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                Radius = item.Radius,
                IsCorrect = item.IsCorrect
            }).ToList(),
            DragItems = source.DragItems.Select(item => new LessonQuestionDragItem
            {
                QuestionId = item.QuestionId,
                Code = item.Code,
                Label = item.Label,
                Order = item.Order
            }).ToList(),
            DragTargets = source.DragTargets.Select(item => new LessonQuestionDragTarget
            {
                QuestionId = item.QuestionId,
                Code = item.Code,
                Label = item.Label,
                Order = item.Order
            }).ToList(),
            CorrectPairs = source.CorrectPairs.Select(item => new LessonQuestionDragPair
            {
                QuestionId = item.QuestionId,
                DragItemCode = item.DragItemCode,
                DragTargetCode = item.DragTargetCode
            }).ToList()
        };
    }
}
