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
        ["learner-01"] = "learner01",
        ["learner-02"] = "learner02",
        ["learner-03"] = "learner03",
        ["learner-04"] = "learner04",
        ["learner-05"] = "learner05"
    };
    private static readonly string[] LegacyCatalogCourseIds =
    [
        "course-community-safety",
        "course-school-awareness",
        "course-first-response",
        "course-risk-communication",
        "course-child-safety",
        "course-farmer-safety",
        "course-volunteer-training",
        "course-local-officer",
        "course-safe-travel"
    ];

    public const string SeedDefaultPassword = "Vnmac@123";

    public static void Initialize(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TrainingDbContext>();
        var passwordService = scope.ServiceProvider.GetRequiredService<PasswordService>();

        BaselineLegacySchemaIfNeeded(dbContext);
        dbContext.Database.Migrate();
        EnsureProvinceCatalog(dbContext);
        EnsureUserLockStatusSchema(dbContext);
        EnsureNotificationsSchema(dbContext);
        EnsureSystemSettingsSchema(dbContext);
        EnsureSystemAuditLogSchema(dbContext);
        EnsureDefaultSystemSettings(dbContext);
        SeedIfEmpty(dbContext);
        PurgeLegacyCatalogCourses(dbContext);
        EnsureSeedUsers(dbContext);
        EnsureOfficialCourseGraph(dbContext);
        EnsureCourseEnrollments(dbContext);
        EnsureCertificateCourseLinks(dbContext);
        EnsureBeginnerLearnerDemoState(dbContext);
        EnsureCourseQuizzesFromLegacyLessons(dbContext);
        EnsureVideoAssets(dbContext);
        EnsureAssessmentData(dbContext);
        EnsureSeedDataLocalized(dbContext);
        EnsureUserCredentials(dbContext, passwordService);
    }

    private static void EnsureProvinceCatalog(TrainingDbContext dbContext)
    {
        var cities = new HashSet<string>(StringComparer.Ordinal)
        {
            "Hà Nội", "Hải Phòng", "Huế", "Đà Nẵng", "Cần Thơ", "Thành phố Hồ Chí Minh"
        };
        string[] names =
        [
            "Hà Nội", "Cao Bằng", "Tuyên Quang", "Điện Biên", "Lai Châu", "Sơn La", "Lào Cai",
            "Thái Nguyên", "Lạng Sơn", "Quảng Ninh", "Bắc Ninh", "Phú Thọ", "Hải Phòng", "Hưng Yên",
            "Ninh Bình", "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Trị", "Huế", "Đà Nẵng",
            "Quảng Ngãi", "Gia Lai", "Đắk Lắk", "Khánh Hòa", "Lâm Đồng", "Đồng Nai",
            "Thành phố Hồ Chí Minh", "Tây Ninh", "Đồng Tháp", "Vĩnh Long", "An Giang", "Cần Thơ", "Cà Mau"
        ];

        var existing = dbContext.Provinces.Select(item => item.Name).ToHashSet(StringComparer.Ordinal);
        dbContext.Provinces.AddRange(names
            .Select((name, index) => new Province
            {
                Code = $"VN-{index + 1:00}",
                Name = name,
                Type = cities.Contains(name) ? "Thành phố" : "Tỉnh",
                SortOrder = index + 1,
                IsActive = true
            })
            .Where(item => !existing.Contains(item.Name)));

        foreach (var user in dbContext.Users.Where(item => item.Province == "Quảng Bình"))
        {
            user.Province = "Quảng Trị";
        }
        dbContext.SaveChanges();
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

    private static void EnsureNotificationsSchema(TrainingDbContext dbContext)
    {
        dbContext.Database.ExecuteSqlRaw("""
            IF OBJECT_ID(N'[Notifications]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Notifications]
                (
                    [Id] nvarchar(450) NOT NULL,
                    [Audience] nvarchar(450) NOT NULL,
                    [RecipientUserId] nvarchar(450) NULL,
                    [Type] nvarchar(max) NOT NULL,
                    [Title] nvarchar(220) NOT NULL,
                    [Message] nvarchar(max) NOT NULL,
                    [ActorUserId] nvarchar(450) NULL,
                    [ActorName] nvarchar(220) NULL,
                    [CourseId] nvarchar(450) NULL,
                    [CourseTitle] nvarchar(320) NULL,
                    [LinkUrl] nvarchar(500) NULL,
                    [CreatedAt] datetimeoffset NOT NULL,
                    [ReadAt] datetimeoffset NULL,
                    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Notifications_Courses_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [Courses] ([Id]),
                    CONSTRAINT [FK_Notifications_Users_ActorUserId] FOREIGN KEY ([ActorUserId]) REFERENCES [Users] ([Id]),
                    CONSTRAINT [FK_Notifications_Users_RecipientUserId] FOREIGN KEY ([RecipientUserId]) REFERENCES [Users] ([Id])
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_ActorUserId' AND object_id = OBJECT_ID(N'[Notifications]'))
                CREATE INDEX [IX_Notifications_ActorUserId] ON [Notifications] ([ActorUserId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_Audience_CreatedAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                CREATE INDEX [IX_Notifications_Audience_CreatedAt] ON [Notifications] ([Audience], [CreatedAt]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_CourseId' AND object_id = OBJECT_ID(N'[Notifications]'))
                CREATE INDEX [IX_Notifications_CourseId] ON [Notifications] ([CourseId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_ReadAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                CREATE INDEX [IX_Notifications_ReadAt] ON [Notifications] ([ReadAt]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notifications_RecipientUserId_CreatedAt' AND object_id = OBJECT_ID(N'[Notifications]'))
                CREATE INDEX [IX_Notifications_RecipientUserId_CreatedAt] ON [Notifications] ([RecipientUserId], [CreatedAt]);
            """);
    }

    private static void EnsureUserLockStatusSchema(TrainingDbContext dbContext)
    {
        dbContext.Database.ExecuteSqlRaw("""
            IF OBJECT_ID(N'[Users]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[Users]', N'IsLocked') IS NULL
            BEGIN
                ALTER TABLE [Users]
                ADD [IsLocked] bit NOT NULL
                    CONSTRAINT [DF_Users_IsLocked] DEFAULT CAST(0 AS bit);
            END;
            """);
    }

    private static void EnsureSystemSettingsSchema(TrainingDbContext dbContext)
    {
        dbContext.Database.ExecuteSqlRaw("""
            IF OBJECT_ID(N'[SystemSettings]', N'U') IS NULL
            BEGIN
                CREATE TABLE [SystemSettings]
                (
                    [Id] nvarchar(64) NOT NULL,
                    [SiteTitle] nvarchar(220) NOT NULL,
                    [HeaderTitle] nvarchar(220) NOT NULL,
                    [HeaderSubtitle] nvarchar(500) NOT NULL,
                    [ProjectLogoUrl] nvarchar(1024) NOT NULL,
                    [LoginLogoUrl] nvarchar(1024) NOT NULL,
                    [VnmacLogoUrl] nvarchar(1024) NOT NULL,
                    [VietnamFlagUrl] nvarchar(1024) NOT NULL,
                    [UsFlagUrl] nvarchar(1024) NOT NULL,
                    [CrsLogoUrl] nvarchar(1024) NOT NULL,
                    [HeaderBackgroundColor] nvarchar(32) NOT NULL,
                    [HeaderBackgroundImageUrl] nvarchar(1024) NOT NULL,
                    [LoginBackgroundImageUrl] nvarchar(1024) NOT NULL,
                    [CertificateTemplateUrl] nvarchar(1024) NOT NULL,
                    [CertificateTitle] nvarchar(220) NOT NULL,
                    [CertificateCourseTitle] nvarchar(500) NOT NULL,
                    [UpdatedAt] datetimeoffset NOT NULL,
                    [UpdatedByUserId] nvarchar(450) NOT NULL,
                    CONSTRAINT [PK_SystemSettings] PRIMARY KEY ([Id])
                );
            END;

            IF COL_LENGTH(N'[SystemSettings]', N'CertificateTemplateUrl') IS NULL
                ALTER TABLE [SystemSettings] ADD [CertificateTemplateUrl] nvarchar(1024) NOT NULL CONSTRAINT [DF_SystemSettings_CertificateTemplateUrl] DEFAULT N'';

            IF COL_LENGTH(N'[SystemSettings]', N'LoginBackgroundImageUrl') IS NULL
                ALTER TABLE [SystemSettings] ADD [LoginBackgroundImageUrl] nvarchar(1024) NOT NULL CONSTRAINT [DF_SystemSettings_LoginBackgroundImageUrl] DEFAULT N'';
            """);
    }

    private static void EnsureSystemAuditLogSchema(TrainingDbContext dbContext)
    {
        dbContext.Database.ExecuteSqlRaw("""
            IF OBJECT_ID(N'[SystemAuditLogs]', N'U') IS NULL
            BEGIN
                CREATE TABLE [SystemAuditLogs]
                (
                    [Id] nvarchar(450) NOT NULL,
                    [OccurredAt] datetimeoffset NOT NULL,
                    [ActorUserId] nvarchar(450) NOT NULL,
                    [ActorName] nvarchar(220) NOT NULL,
                    [ActorRole] nvarchar(32) NULL,
                    [Module] nvarchar(80) NOT NULL,
                    [Action] nvarchar(80) NOT NULL,
                    [EntityType] nvarchar(120) NOT NULL,
                    [EntityId] nvarchar(450) NOT NULL,
                    [Summary] nvarchar(1000) NOT NULL,
                    [DetailJson] nvarchar(max) NOT NULL,
                    [IpAddress] nvarchar(80) NOT NULL,
                    [UserAgent] nvarchar(500) NOT NULL,
                    CONSTRAINT [PK_SystemAuditLogs] PRIMARY KEY ([Id])
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SystemAuditLogs_OccurredAt' AND object_id = OBJECT_ID(N'[SystemAuditLogs]'))
                CREATE INDEX [IX_SystemAuditLogs_OccurredAt] ON [SystemAuditLogs] ([OccurredAt]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SystemAuditLogs_ActorUserId' AND object_id = OBJECT_ID(N'[SystemAuditLogs]'))
                CREATE INDEX [IX_SystemAuditLogs_ActorUserId] ON [SystemAuditLogs] ([ActorUserId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SystemAuditLogs_Module' AND object_id = OBJECT_ID(N'[SystemAuditLogs]'))
                CREATE INDEX [IX_SystemAuditLogs_Module] ON [SystemAuditLogs] ([Module]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SystemAuditLogs_Action' AND object_id = OBJECT_ID(N'[SystemAuditLogs]'))
                CREATE INDEX [IX_SystemAuditLogs_Action] ON [SystemAuditLogs] ([Action]);
            """);
    }

    private static void EnsureDefaultSystemSettings(TrainingDbContext dbContext)
    {
        if (dbContext.SystemSettings.Any(item => item.Id == "default"))
        {
            return;
        }

        dbContext.SystemSettings.Add(new SystemSettings
        {
            Id = "default",
            UpdatedAt = DateTimeOffset.UtcNow,
            UpdatedByUserId = "system"
        });
        dbContext.SaveChanges();
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

    private static void PurgeLegacyCatalogCourses(TrainingDbContext dbContext)
    {
        var courseIds = dbContext.Courses
            .Where(item => LegacyCatalogCourseIds.Contains(item.Id))
            .Select(item => item.Id)
            .ToArray();

        if (courseIds.Length == 0)
        {
            return;
        }

        var lessonIds = dbContext.Lessons
            .Where(item => courseIds.Contains(item.CourseId))
            .Select(item => item.Id)
            .ToArray();

        RemoveLessonRuntimeRows(dbContext, lessonIds);
        dbContext.CourseQuizzes.RemoveRange(dbContext.CourseQuizzes.Where(item => courseIds.Contains(item.CourseId)));
        dbContext.CourseEnrollments.RemoveRange(dbContext.CourseEnrollments.Where(item => courseIds.Contains(item.CourseId)));
        dbContext.Certificates.RemoveRange(dbContext.Certificates.Where(item => courseIds.Contains(item.CourseId)));
        dbContext.Courses.RemoveRange(dbContext.Courses.Where(item => courseIds.Contains(item.Id)));
        dbContext.SaveChanges();
    }

    private static void EnsureSeedUsers(TrainingDbContext dbContext)
    {
        var seed = SeedDataFactory.Create();
        var existingUserIds = dbContext.Users
            .Select(item => item.Id)
            .ToHashSet(StringComparer.Ordinal);
        var missingUsers = seed.Users
            .Where(item => !existingUserIds.Contains(item.Id))
            .Select(CloneUser)
            .ToArray();

        if (missingUsers.Length == 0)
        {
            return;
        }

        dbContext.Users.AddRange(missingUsers);
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

    private static void EnsureOfficialCourseGraph(TrainingDbContext dbContext)
    {
        var seed = SeedDataFactory.Create();
        var seededCourse = seed.Courses.SingleOrDefault(item => item.Id == "course-vnmac-elearning");
        if (seededCourse is null)
        {
            return;
        }

        var course = dbContext.Courses
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
            .Include(item => item.Sections)
                .ThenInclude(item => item.Lessons)
                    .ThenInclude(item => item.Assessment)
                        .ThenInclude(item => item!.Questions)
                            .ThenInclude(item => item.CorrectPairs)
            .Include(item => item.Quizzes)
            .SingleOrDefault(item => item.Id == seededCourse.Id);

        if (course is null)
        {
            dbContext.Courses.Add(CloneCourse(seed.Courses.Single(item => item.Id == seededCourse.Id)));
            dbContext.SaveChanges();
            AddOfficialSeedProgress(dbContext, seed, seededCourse);
            return;
        }

        var existingSectionIds = course.Sections.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var seededSectionIds = seededCourse.Sections.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var existingLessonIds = course.Sections.SelectMany(item => item.Lessons).Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var seededLessonIds = seededCourse.Sections.SelectMany(item => item.Lessons).Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var existingQuizIds = course.Quizzes.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var seededQuizIds = seededCourse.Quizzes.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);

        if (existingSectionIds.SetEquals(seededSectionIds) &&
            existingLessonIds.SetEquals(seededLessonIds) &&
            existingQuizIds.SetEquals(seededQuizIds))
        {
            if (SyncOfficialCourseMetadata(dbContext, course, seededCourse))
            {
                dbContext.SaveChanges();
            }

            AddOfficialSeedProgress(dbContext, seed, seededCourse);
            return;
        }

        RemoveLessonRuntimeRows(dbContext, existingLessonIds);
        dbContext.CourseQuizzes.RemoveRange(dbContext.CourseQuizzes.Where(item => item.CourseId == course.Id));
        dbContext.CourseSections.RemoveRange(dbContext.CourseSections.Where(item => item.CourseId == course.Id));
        dbContext.SaveChanges();

        course.Title = seededCourse.Title;
        course.Description = seededCourse.Description;
        course.Status = seededCourse.Status;
        course.Sections = seededCourse.Sections.Select(CloneSection).ToList();
        course.Quizzes = seededCourse.Quizzes.Select(CloneCourseQuiz).ToList();
        dbContext.SaveChanges();

        AddOfficialSeedProgress(dbContext, seed, seededCourse);
    }

    private static bool SyncOfficialCourseMetadata(TrainingDbContext dbContext, Course course, Course seededCourse)
    {
        var changed = false;

        if (course.Title != seededCourse.Title)
        {
            course.Title = seededCourse.Title;
            changed = true;
        }

        if (course.Description != seededCourse.Description)
        {
            course.Description = seededCourse.Description;
            changed = true;
        }

        if (course.Status != seededCourse.Status)
        {
            course.Status = seededCourse.Status;
            changed = true;
        }

        var sectionsById = course.Sections.ToDictionary(item => item.Id, StringComparer.Ordinal);
        foreach (var seededSection in seededCourse.Sections)
        {
            if (!sectionsById.TryGetValue(seededSection.Id, out var section))
            {
                continue;
            }

            if (section.Title != seededSection.Title)
            {
                section.Title = seededSection.Title;
                changed = true;
            }

            if (section.Description != seededSection.Description)
            {
                section.Description = seededSection.Description;
                changed = true;
            }

            if (section.Order != seededSection.Order)
            {
                section.Order = seededSection.Order;
                changed = true;
            }

            var lessonsById = section.Lessons.ToDictionary(item => item.Id, StringComparer.Ordinal);
            foreach (var seededLesson in seededSection.Lessons)
            {
                if (lessonsById.TryGetValue(seededLesson.Id, out var lesson))
                {
                    changed |= SyncOfficialLessonMetadata(lesson, seededLesson);
                    changed |= SyncOfficialLessonAssessment(dbContext, lesson, seededLesson);
                }
            }
        }

        var quizzesById = course.Quizzes.ToDictionary(item => item.Id, StringComparer.Ordinal);
        foreach (var seededQuiz in seededCourse.Quizzes)
        {
            if (!quizzesById.TryGetValue(seededQuiz.Id, out var quiz))
            {
                continue;
            }

            if (quiz.Title != seededQuiz.Title)
            {
                quiz.Title = seededQuiz.Title;
                changed = true;
            }

            if (quiz.Description != seededQuiz.Description)
            {
                quiz.Description = seededQuiz.Description;
                changed = true;
            }

            if (quiz.Order != seededQuiz.Order)
            {
                quiz.Order = seededQuiz.Order;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SyncOfficialLessonMetadata(Lesson lesson, Lesson seededLesson)
    {
        var changed = false;

        if (lesson.Title != seededLesson.Title)
        {
            lesson.Title = seededLesson.Title;
            changed = true;
        }

        if (lesson.Type != seededLesson.Type)
        {
            lesson.Type = seededLesson.Type;
            changed = true;
        }

        if (lesson.Order != seededLesson.Order)
        {
            lesson.Order = seededLesson.Order;
            changed = true;
        }

        if (lesson.DurationMinutes != seededLesson.DurationMinutes)
        {
            lesson.DurationMinutes = seededLesson.DurationMinutes;
            changed = true;
        }

        if (lesson.Topic != seededLesson.Topic)
        {
            lesson.Topic = seededLesson.Topic;
            changed = true;
        }

        if (lesson.Difficulty != seededLesson.Difficulty)
        {
            lesson.Difficulty = seededLesson.Difficulty;
            changed = true;
        }

        if (lesson.ThumbnailUrl != seededLesson.ThumbnailUrl)
        {
            lesson.ThumbnailUrl = seededLesson.ThumbnailUrl;
            changed = true;
        }

        if (lesson.CreatedAt == default || lesson.CreatedAt != seededLesson.CreatedAt)
        {
            lesson.CreatedAt = seededLesson.CreatedAt;
            changed = true;
        }

        if (lesson.UpdatedAt == default)
        {
            lesson.UpdatedAt = seededLesson.UpdatedAt;
            changed = true;
        }

        if (seededLesson.Content is not null && ShouldSyncOfficialLessonContent(lesson.Content, seededLesson.Content))
        {
            lesson.Content = JsonStorage.Clone(seededLesson.Content);
            changed = true;
        }
        else if (seededLesson.Content is not null)
        {
            changed |= SyncOfficialLessonCheckQuestions(lesson.Content, seededLesson.Content);
        }

        return changed;
    }

    private static bool SyncOfficialLessonCheckQuestions(LessonContent? existingContent, LessonContent seededContent)
    {
        if (existingContent is null)
        {
            return false;
        }

        var existingCheckStep = existingContent.Steps.FirstOrDefault(step =>
            string.Equals(step.Key, "check", StringComparison.OrdinalIgnoreCase));
        var seededCheckStep = seededContent.Steps.FirstOrDefault(step =>
            string.Equals(step.Key, "check", StringComparison.OrdinalIgnoreCase));

        if (existingCheckStep is null || seededCheckStep is null || seededCheckStep.Questions.Count == 0)
        {
            return false;
        }

        var seededQuestions = JsonStorage.Clone(seededCheckStep.Questions.OrderBy(question => question.Order).ToList()) ?? [];
        if (existingCheckStep.Questions.Count >= seededQuestions.Count)
        {
            return false;
        }

        var mergedQuestions = existingCheckStep.Questions.OrderBy(question => question.Order).ToList();
        mergedQuestions.AddRange(seededQuestions.Skip(mergedQuestions.Count).Take(seededQuestions.Count - mergedQuestions.Count));

        for (var index = 0; index < mergedQuestions.Count; index++)
        {
            mergedQuestions[index].Order = index + 1;
        }

        existingCheckStep.Questions = mergedQuestions;
        return true;
    }

    private static bool ShouldSyncOfficialLessonContent(LessonContent? existingContent, LessonContent seededContent)
    {
        if (existingContent is null)
        {
            return true;
        }

        if (existingContent.Steps.Count == 0 && seededContent.Steps.Count > 0)
        {
            return true;
        }

        var activityStep = existingContent.Steps.FirstOrDefault(step =>
            string.Equals(step.Key, "activity", StringComparison.OrdinalIgnoreCase));
        return string.Equals(activityStep?.Title?.Trim(), "Phân loại", StringComparison.OrdinalIgnoreCase);
    }

    private static bool SyncOfficialLessonAssessment(TrainingDbContext dbContext, Lesson lesson, Lesson seededLesson)
    {
        if (seededLesson.Assessment is not null || lesson.Assessment is null)
        {
            return false;
        }

        var questionIds = lesson.Assessment.Questions
            .Select(item => item.Id)
            .ToArray();
        RemoveQuestionRuntimeRows(dbContext, questionIds);
        dbContext.LessonAssessments.Remove(lesson.Assessment);
        lesson.Assessment = null;
        return true;
    }

    private static void RemoveLessonRuntimeRows(TrainingDbContext dbContext, IReadOnlyCollection<string> lessonIds)
    {
        if (lessonIds.Count == 0)
        {
            return;
        }

        var questionIds = dbContext.LessonQuestions
            .Where(item => lessonIds.Contains(item.LessonId))
            .Select(item => item.Id)
            .ToArray();
        var sessionIds = dbContext.ScormRuntimeSessions
            .Where(item => lessonIds.Contains(item.LessonId))
            .Select(item => item.Id)
            .ToArray();

        if (questionIds.Length > 0)
        {
            dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(item => questionIds.Contains(item.QuestionId)));
            dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(item => questionIds.Contains(item.QuestionId)));
        }

        if (sessionIds.Length > 0)
        {
            dbContext.ScormRuntimeEvents.RemoveRange(dbContext.ScormRuntimeEvents.Where(item => sessionIds.Contains(item.SessionId)));
        }

        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.InteractionAttempts.RemoveRange(dbContext.InteractionAttempts.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.QuizAttempts.RemoveRange(dbContext.QuizAttempts.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.QuizResults.RemoveRange(dbContext.QuizResults.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ProgressTrackings.RemoveRange(dbContext.ProgressTrackings.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRuntimeValues.RemoveRange(dbContext.ScormRuntimeValues.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRuntimeSessions.RemoveRange(dbContext.ScormRuntimeSessions.Where(item => lessonIds.Contains(item.LessonId)));
        dbContext.ScormRegistrations.RemoveRange(dbContext.ScormRegistrations.Where(item => lessonIds.Contains(item.LessonId)));
    }

    private static void RemoveQuestionRuntimeRows(TrainingDbContext dbContext, IReadOnlyCollection<string> questionIds)
    {
        if (questionIds.Count == 0)
        {
            return;
        }

        dbContext.QuizAttemptWrongQuestions.RemoveRange(dbContext.QuizAttemptWrongQuestions.Where(item => questionIds.Contains(item.QuestionId)));
        dbContext.InteractionAttemptResults.RemoveRange(dbContext.InteractionAttemptResults.Where(item => questionIds.Contains(item.QuestionId)));
    }

    private static void AddOfficialSeedProgress(TrainingDbContext dbContext, SeedSnapshot seed, Course seededCourse)
    {
        var officialLessonIds = seededCourse.Sections
            .SelectMany(item => item.Lessons)
            .Select(item => item.Id)
            .ToHashSet(StringComparer.Ordinal);

        var existingProgressKeys = dbContext.ProgressTrackings
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Select(item => new { item.UserId, item.LessonId })
            .ToHashSet();
        var missingProgress = seed.ProgressTrackings
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Where(item => !existingProgressKeys.Contains(new { item.UserId, item.LessonId }))
            .Select(CloneProgress)
            .ToArray();

        var existingQuizResultKeys = dbContext.QuizResults
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Select(item => new { item.UserId, item.LessonId })
            .ToHashSet();
        var missingQuizResults = seed.QuizResults
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Where(item => !existingQuizResultKeys.Contains(new { item.UserId, item.LessonId }))
            .Select(CloneQuizResult)
            .ToArray();

        var existingQuizAttemptKeys = dbContext.QuizAttempts
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Select(item => new { item.UserId, item.LessonId, item.AttemptNumber })
            .ToHashSet();
        var missingQuizAttempts = seed.QuizAttempts
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Where(item => !existingQuizAttemptKeys.Contains(new { item.UserId, item.LessonId, item.AttemptNumber }))
            .Select(CloneQuizAttempt)
            .ToArray();

        var existingInteractionAttemptKeys = dbContext.InteractionAttempts
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Select(item => new { item.UserId, item.LessonId, item.AttemptNumber })
            .ToHashSet();
        var missingInteractionAttempts = seed.InteractionAttempts
            .Where(item => officialLessonIds.Contains(item.LessonId))
            .Where(item => !existingInteractionAttemptKeys.Contains(new { item.UserId, item.LessonId, item.AttemptNumber }))
            .Select(CloneInteractionAttempt)
            .ToArray();

        if (missingProgress.Length == 0 &&
            missingQuizResults.Length == 0 &&
            missingQuizAttempts.Length == 0 &&
            missingInteractionAttempts.Length == 0)
        {
            return;
        }

        dbContext.ProgressTrackings.AddRange(missingProgress);
        dbContext.QuizResults.AddRange(missingQuizResults);
        dbContext.QuizAttempts.AddRange(missingQuizAttempts);
        dbContext.InteractionAttempts.AddRange(missingInteractionAttempts);
        dbContext.SaveChanges();
    }

    private static void EnsureBeginnerLearnerDemoState(TrainingDbContext dbContext)
    {
        const string userId = "learner-01";
        const string courseId = "course-vnmac-elearning";

        var lessonIds = dbContext.Lessons
            .Where(item => item.CourseId == courseId)
            .Select(item => item.Id)
            .ToArray();
        if (lessonIds.Length == 0)
        {
            return;
        }

        var learner = dbContext.Users.SingleOrDefault(item => item.Id == userId);
        if (learner is null)
        {
            return;
        }

        var enrollment = dbContext.CourseEnrollments.SingleOrDefault(item =>
            item.UserId == userId &&
            item.CourseId == courseId);
        if (enrollment is null)
        {
            enrollment = new CourseEnrollment
            {
                UserId = userId,
                CourseId = courseId,
                EnrolledAt = learner.CreatedAt,
                StartedAt = null,
                CompletedAt = null,
                LastAccessedAt = null,
                Status = CourseEnrollmentStatus.Enrolled
            };
            dbContext.CourseEnrollments.Add(enrollment);
        }
        else
        {
            enrollment.StartedAt = null;
            enrollment.CompletedAt = null;
            enrollment.LastAccessedAt = null;
            enrollment.Status = CourseEnrollmentStatus.Enrolled;
        }

        var progressByLessonId = dbContext.ProgressTrackings
            .Where(item => item.UserId == userId && lessonIds.Contains(item.LessonId))
            .ToDictionary(item => item.LessonId, StringComparer.Ordinal);
        foreach (var lessonId in lessonIds)
        {
            if (!progressByLessonId.TryGetValue(lessonId, out var progress))
            {
                progress = new ProgressTracking
                {
                    UserId = userId,
                    LessonId = lessonId
                };
                dbContext.ProgressTrackings.Add(progress);
            }

            progress.Status = LessonProgressStatus.NotStarted;
            progress.CompletionTime = null;
            progress.CurrentStep = "intro";
            progress.LastAccessedAt = null;
            progress.WatchPercent = 0;
            progress.WatchTimeMinutes = 0;
            progress.LastPositionSeconds = 0;
            progress.LastWatchedAt = null;
            progress.InteractionAttempts = 0;
        }

        var quizAttempts = dbContext.QuizAttempts
            .Include(item => item.WrongQuestions)
            .Where(item => item.UserId == userId && lessonIds.Contains(item.LessonId))
            .ToArray();
        dbContext.QuizAttempts.RemoveRange(quizAttempts);

        var interactionAttempts = dbContext.InteractionAttempts
            .Include(item => item.QuestionResults)
            .Where(item => item.UserId == userId && lessonIds.Contains(item.LessonId))
            .ToArray();
        dbContext.InteractionAttempts.RemoveRange(interactionAttempts);

        var quizLessonIds = dbContext.CourseQuizzes
            .Where(item => item.CourseId == courseId)
            .Select(item => item.AssessmentLessonId)
            .ToArray();
        foreach (var quizLessonId in quizLessonIds)
        {
            var quizResult = dbContext.QuizResults.SingleOrDefault(item =>
                item.UserId == userId &&
                item.LessonId == quizLessonId);
            if (quizResult is null)
            {
                dbContext.QuizResults.Add(new QuizResult
                {
                    UserId = userId,
                    LessonId = quizLessonId,
                    Score = 0,
                    Attempts = 0,
                    LastAttemptAt = null
                });
                continue;
            }

            quizResult.Score = 0;
            quizResult.Attempts = 0;
            quizResult.LastAttemptAt = null;
        }

        dbContext.Certificates.RemoveRange(dbContext.Certificates.Where(item =>
            item.UserId == userId &&
            item.CourseId == courseId));

        dbContext.SaveChanges();
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
        var existingSeededCourseIds = dbContext.Courses
            .Where(item => seededCourseIds.Contains(item.Id))
            .Select(item => item.Id)
            .ToHashSet(StringComparer.Ordinal);
        var missingSeededCourses = seed.Courses
            .Where(item => !existingSeededCourseIds.Contains(item.Id))
            .ToArray();

        if (missingSeededCourses.Length > 0)
        {
            dbContext.Courses.AddRange(missingSeededCourses);
            changed = true;
        }

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

                    if (lesson.Assessment.PassScore != seededLesson.Assessment.PassScore)
                    {
                        lesson.Assessment.PassScore = seededLesson.Assessment.PassScore;
                        changed = true;
                    }

                    if (lesson.Assessment.QuestionLimit != seededLesson.Assessment.QuestionLimit)
                    {
                        lesson.Assessment.QuestionLimit = seededLesson.Assessment.QuestionLimit;
                        changed = true;
                    }

                    if (lesson.Assessment.RandomizeQuestionOrder != seededLesson.Assessment.RandomizeQuestionOrder)
                    {
                        lesson.Assessment.RandomizeQuestionOrder = seededLesson.Assessment.RandomizeQuestionOrder;
                        changed = true;
                    }

                    if (lesson.Assessment.RandomizeOptionOrder != seededLesson.Assessment.RandomizeOptionOrder)
                    {
                        lesson.Assessment.RandomizeOptionOrder = seededLesson.Assessment.RandomizeOptionOrder;
                        changed = true;
                    }

                    changed |= SyncAssessmentQuestions(dbContext, lesson.Assessment, seededLesson.Assessment);
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

    private static User CloneUser(User source)
    {
        return new User
        {
            Id = source.Id,
            Username = source.Username,
            Email = source.Email,
            FullName = source.FullName,
            PhoneNumber = source.PhoneNumber,
            CreatedAt = source.CreatedAt,
            LastLogin = source.LastLogin,
            IsEmailVerified = source.IsEmailVerified,
            EmailVerifiedAt = source.EmailVerifiedAt,
            CreatedByAdmin = source.CreatedByAdmin,
            IsLocked = source.IsLocked,
            PasswordHash = source.PasswordHash,
            Role = source.Role,
            Province = source.Province,
            Group = source.Group
        };
    }

    private static Course CloneCourse(Course source)
    {
        return new Course
        {
            Id = source.Id,
            Title = source.Title,
            Description = source.Description,
            Status = source.Status,
            Sections = source.Sections.Select(CloneSection).ToList(),
            Quizzes = source.Quizzes.Select(CloneCourseQuiz).ToList()
        };
    }

    private static CourseSection CloneSection(CourseSection source)
    {
        return new CourseSection
        {
            Id = source.Id,
            CourseId = source.CourseId,
            Title = source.Title,
            Description = source.Description,
            Order = source.Order,
            Lessons = source.Lessons.Select(CloneLesson).ToList()
        };
    }

    private static Lesson CloneLesson(Lesson source)
    {
        return new Lesson
        {
            Id = source.Id,
            CourseId = source.CourseId,
            SectionId = source.SectionId,
            Title = source.Title,
            Type = source.Type,
            Order = source.Order,
            DurationMinutes = source.DurationMinutes,
            StatusLabel = source.StatusLabel,
            Topic = source.Topic,
            Difficulty = source.Difficulty,
            PublicationStatus = source.PublicationStatus,
            ThumbnailUrl = source.ThumbnailUrl,
            CreatedAt = source.CreatedAt,
            UpdatedAt = source.UpdatedAt,
            Content = source.Content is null ? null : JsonStorage.Clone(source.Content),
            VideoContent = source.VideoContent is null ? null : CloneVideoContent(source.VideoContent),
            Assessment = source.Assessment is null ? null : CloneAssessment(source.Assessment),
            ScormPackage = source.ScormPackage
        };
    }

    private static CourseQuiz CloneCourseQuiz(CourseQuiz source)
    {
        return new CourseQuiz
        {
            Id = source.Id,
            CourseId = source.CourseId,
            SectionId = source.SectionId,
            AssessmentLessonId = source.AssessmentLessonId,
            Title = source.Title,
            Description = source.Description,
            Order = source.Order
        };
    }

    private static ProgressTracking CloneProgress(ProgressTracking source)
    {
        return new ProgressTracking
        {
            UserId = source.UserId,
            LessonId = source.LessonId,
            Status = source.Status,
            CompletionTime = source.CompletionTime,
            CurrentStep = source.CurrentStep,
            LastAccessedAt = source.LastAccessedAt,
            WatchPercent = source.WatchPercent,
            WatchTimeMinutes = source.WatchTimeMinutes,
            LastPositionSeconds = source.LastPositionSeconds,
            LastWatchedAt = source.LastWatchedAt,
            InteractionAttempts = source.InteractionAttempts
        };
    }

    private static QuizResult CloneQuizResult(QuizResult source)
    {
        return new QuizResult
        {
            UserId = source.UserId,
            LessonId = source.LessonId,
            Score = source.Score,
            Attempts = source.Attempts,
            LastAttemptAt = source.LastAttemptAt
        };
    }

    private static QuizAttempt CloneQuizAttempt(QuizAttempt source)
    {
        return new QuizAttempt
        {
            UserId = source.UserId,
            LessonId = source.LessonId,
            AttemptNumber = source.AttemptNumber,
            Score = source.Score,
            AttemptedAt = source.AttemptedAt,
            WrongQuestions = source.WrongQuestions.Select(item => new QuizAttemptWrongQuestion
            {
                UserId = item.UserId,
                LessonId = item.LessonId,
                AttemptNumber = item.AttemptNumber,
                QuestionId = item.QuestionId
            }).ToList()
        };
    }

    private static InteractionAttempt CloneInteractionAttempt(InteractionAttempt source)
    {
        return new InteractionAttempt
        {
            UserId = source.UserId,
            LessonId = source.LessonId,
            AttemptNumber = source.AttemptNumber,
            AttemptedAt = source.AttemptedAt,
            Passed = source.Passed,
            QuestionResults = source.QuestionResults.Select(item => new InteractionAttemptResult
            {
                UserId = item.UserId,
                LessonId = item.LessonId,
                AttemptNumber = item.AttemptNumber,
                QuestionId = item.QuestionId,
                Correct = item.Correct,
                Explanation = item.Explanation
            }).ToList()
        };
    }

    private static LessonAssessment CloneAssessment(LessonAssessment source)
    {
        return new LessonAssessment
        {
            LessonId = source.LessonId,
            Intro = source.Intro,
            RetryHint = source.RetryHint,
            PassScore = source.PassScore,
            QuestionLimit = source.QuestionLimit,
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

    private static bool SyncAssessmentQuestions(TrainingDbContext dbContext, LessonAssessment assessment, LessonAssessment seededAssessment)
    {
        var changed = false;
        var seededQuestions = seededAssessment.Questions.ToDictionary(item => item.Id, StringComparer.Ordinal);
        var staleQuestions = assessment.Questions
            .Where(item => !seededQuestions.ContainsKey(item.Id))
            .ToArray();

        if (staleQuestions.Length > 0)
        {
            var staleQuestionIds = staleQuestions.Select(item => item.Id).ToArray();
            RemoveQuestionRuntimeRows(dbContext, staleQuestionIds);
            dbContext.LessonQuestions.RemoveRange(staleQuestions);
            foreach (var question in staleQuestions)
            {
                assessment.Questions.Remove(question);
            }

            dbContext.SaveChanges();
            changed = true;
        }

        var existingQuestions = assessment.Questions.ToDictionary(item => item.Id, StringComparer.Ordinal);
        foreach (var seededQuestion in seededAssessment.Questions.OrderBy(item => item.Order))
        {
            if (!existingQuestions.TryGetValue(seededQuestion.Id, out var question))
            {
                assessment.Questions.Add(CloneQuestion(seededQuestion));
                changed = true;
                continue;
            }

            changed |= SyncQuestion(question, seededQuestion);
        }

        return changed;
    }

    private static bool SyncQuestion(LessonQuestion question, LessonQuestion seededQuestion)
    {
        var changed = false;

        if (question.Type != seededQuestion.Type)
        {
            question.Type = seededQuestion.Type;
            changed = true;
        }

        if (question.Order != seededQuestion.Order)
        {
            question.Order = seededQuestion.Order;
            changed = true;
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

        if (!StringComparer.Ordinal.Equals(question.MediaUrl, seededQuestion.MediaUrl))
        {
            question.MediaUrl = seededQuestion.MediaUrl;
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

        changed |= SyncQuestionOptions(question.Options, seededQuestion.Options, question.Id);
        changed |= SyncHotspotTargets(question.HotspotTargets, seededQuestion.HotspotTargets, question.Id);
        changed |= SyncDragPairs(question.CorrectPairs, seededQuestion.CorrectPairs, question.Id);
        changed |= SyncDragItems(question.DragItems, seededQuestion.DragItems, question.Id);
        changed |= SyncDragTargets(question.DragTargets, seededQuestion.DragTargets, question.Id);

        return changed;
    }

    private static bool SyncQuestionOptions(List<LessonQuestionOption> options, IReadOnlyCollection<LessonQuestionOption> seededOptions, string questionId)
    {
        var changed = false;
        var seededOptionsByCode = seededOptions.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var option in options.Where(item => !seededOptionsByCode.ContainsKey(item.Code)).ToArray())
        {
            options.Remove(option);
            changed = true;
        }

        var optionsByCode = options.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var seededOption in seededOptions.OrderBy(item => item.Order))
        {
            if (!optionsByCode.TryGetValue(seededOption.Code, out var option))
            {
                options.Add(new LessonQuestionOption
                {
                    QuestionId = questionId,
                    Code = seededOption.Code,
                    Label = seededOption.Label,
                    Order = seededOption.Order,
                    IsCorrect = seededOption.IsCorrect
                });
                changed = true;
                continue;
            }

            if (!StringComparer.Ordinal.Equals(option.Label, seededOption.Label))
            {
                option.Label = seededOption.Label;
                changed = true;
            }

            if (option.Order != seededOption.Order)
            {
                option.Order = seededOption.Order;
                changed = true;
            }

            if (option.IsCorrect != seededOption.IsCorrect)
            {
                option.IsCorrect = seededOption.IsCorrect;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SyncHotspotTargets(List<LessonQuestionHotspotTarget> targets, IReadOnlyCollection<LessonQuestionHotspotTarget> seededTargets, string questionId)
    {
        var changed = false;
        var seededTargetsByCode = seededTargets.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var target in targets.Where(item => !seededTargetsByCode.ContainsKey(item.Code)).ToArray())
        {
            targets.Remove(target);
            changed = true;
        }

        var targetsByCode = targets.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var seededTarget in seededTargets.OrderBy(item => item.Order))
        {
            if (!targetsByCode.TryGetValue(seededTarget.Code, out var target))
            {
                targets.Add(new LessonQuestionHotspotTarget
                {
                    QuestionId = questionId,
                    Code = seededTarget.Code,
                    Label = seededTarget.Label,
                    Order = seededTarget.Order,
                    Shape = seededTarget.Shape,
                    X = seededTarget.X,
                    Y = seededTarget.Y,
                    Width = seededTarget.Width,
                    Height = seededTarget.Height,
                    Radius = seededTarget.Radius,
                    IsCorrect = seededTarget.IsCorrect
                });
                changed = true;
                continue;
            }

            if (!StringComparer.Ordinal.Equals(target.Label, seededTarget.Label))
            {
                target.Label = seededTarget.Label;
                changed = true;
            }

            if (target.Order != seededTarget.Order ||
                target.Shape != seededTarget.Shape ||
                target.X != seededTarget.X ||
                target.Y != seededTarget.Y ||
                target.Width != seededTarget.Width ||
                target.Height != seededTarget.Height ||
                target.Radius != seededTarget.Radius ||
                target.IsCorrect != seededTarget.IsCorrect)
            {
                target.Order = seededTarget.Order;
                target.Shape = seededTarget.Shape;
                target.X = seededTarget.X;
                target.Y = seededTarget.Y;
                target.Width = seededTarget.Width;
                target.Height = seededTarget.Height;
                target.Radius = seededTarget.Radius;
                target.IsCorrect = seededTarget.IsCorrect;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SyncDragItems(List<LessonQuestionDragItem> dragItems, IReadOnlyCollection<LessonQuestionDragItem> seededDragItems, string questionId)
    {
        var changed = false;
        var seededItemsByCode = seededDragItems.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var dragItem in dragItems.Where(item => !seededItemsByCode.ContainsKey(item.Code)).ToArray())
        {
            dragItems.Remove(dragItem);
            changed = true;
        }

        var dragItemsByCode = dragItems.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var seededDragItem in seededDragItems.OrderBy(item => item.Order))
        {
            if (!dragItemsByCode.TryGetValue(seededDragItem.Code, out var dragItem))
            {
                dragItems.Add(new LessonQuestionDragItem
                {
                    QuestionId = questionId,
                    Code = seededDragItem.Code,
                    Label = seededDragItem.Label,
                    Order = seededDragItem.Order
                });
                changed = true;
                continue;
            }

            if (!StringComparer.Ordinal.Equals(dragItem.Label, seededDragItem.Label))
            {
                dragItem.Label = seededDragItem.Label;
                changed = true;
            }

            if (dragItem.Order != seededDragItem.Order)
            {
                dragItem.Order = seededDragItem.Order;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SyncDragTargets(List<LessonQuestionDragTarget> dragTargets, IReadOnlyCollection<LessonQuestionDragTarget> seededDragTargets, string questionId)
    {
        var changed = false;
        var seededTargetsByCode = seededDragTargets.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var dragTarget in dragTargets.Where(item => !seededTargetsByCode.ContainsKey(item.Code)).ToArray())
        {
            dragTargets.Remove(dragTarget);
            changed = true;
        }

        var dragTargetsByCode = dragTargets.ToDictionary(item => item.Code, StringComparer.Ordinal);
        foreach (var seededDragTarget in seededDragTargets.OrderBy(item => item.Order))
        {
            if (!dragTargetsByCode.TryGetValue(seededDragTarget.Code, out var dragTarget))
            {
                dragTargets.Add(new LessonQuestionDragTarget
                {
                    QuestionId = questionId,
                    Code = seededDragTarget.Code,
                    Label = seededDragTarget.Label,
                    Order = seededDragTarget.Order
                });
                changed = true;
                continue;
            }

            if (!StringComparer.Ordinal.Equals(dragTarget.Label, seededDragTarget.Label))
            {
                dragTarget.Label = seededDragTarget.Label;
                changed = true;
            }

            if (dragTarget.Order != seededDragTarget.Order)
            {
                dragTarget.Order = seededDragTarget.Order;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SyncDragPairs(List<LessonQuestionDragPair> pairs, IReadOnlyCollection<LessonQuestionDragPair> seededPairs, string questionId)
    {
        var changed = false;
        var seededPairKeys = seededPairs.Select(GetPairKey).ToHashSet(StringComparer.Ordinal);
        foreach (var pair in pairs.Where(item => !seededPairKeys.Contains(GetPairKey(item))).ToArray())
        {
            pairs.Remove(pair);
            changed = true;
        }

        var pairKeys = pairs.Select(GetPairKey).ToHashSet(StringComparer.Ordinal);
        foreach (var seededPair in seededPairs)
        {
            if (pairKeys.Contains(GetPairKey(seededPair)))
            {
                continue;
            }

            pairs.Add(new LessonQuestionDragPair
            {
                QuestionId = questionId,
                DragItemCode = seededPair.DragItemCode,
                DragTargetCode = seededPair.DragTargetCode
            });
            changed = true;
        }

        return changed;
    }

    private static string GetPairKey(LessonQuestionDragPair pair)
    {
        return $"{pair.DragItemCode}\u001f{pair.DragTargetCode}";
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
            MediaUrl = source.MediaUrl,
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
