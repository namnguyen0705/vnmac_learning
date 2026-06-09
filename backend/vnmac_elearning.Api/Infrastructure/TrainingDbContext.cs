using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Domain;

namespace vnmac_elearning.Api.Infrastructure;

public sealed class TrainingDbContext(DbContextOptions<TrainingDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Course> Courses => Set<Course>();

    public DbSet<CourseQuiz> CourseQuizzes => Set<CourseQuiz>();

    public DbSet<CourseEnrollment> CourseEnrollments => Set<CourseEnrollment>();

    public DbSet<CourseSection> CourseSections => Set<CourseSection>();

    public DbSet<Lesson> Lessons => Set<Lesson>();

    public DbSet<LessonAssessment> LessonAssessments => Set<LessonAssessment>();

    public DbSet<LessonQuestion> LessonQuestions => Set<LessonQuestion>();

    public DbSet<LessonQuestionOption> LessonQuestionOptions => Set<LessonQuestionOption>();

    public DbSet<LessonQuestionHotspotTarget> LessonQuestionHotspotTargets => Set<LessonQuestionHotspotTarget>();

    public DbSet<LessonQuestionDragItem> LessonQuestionDragItems => Set<LessonQuestionDragItem>();

    public DbSet<LessonQuestionDragTarget> LessonQuestionDragTargets => Set<LessonQuestionDragTarget>();

    public DbSet<LessonQuestionDragPair> LessonQuestionDragPairs => Set<LessonQuestionDragPair>();

    public DbSet<ScormPackage> ScormPackages => Set<ScormPackage>();

    public DbSet<ScormSco> ScormScos => Set<ScormSco>();

    public DbSet<ScormRegistration> ScormRegistrations => Set<ScormRegistration>();

    public DbSet<ScormRuntimeSession> ScormRuntimeSessions => Set<ScormRuntimeSession>();

    public DbSet<ScormRuntimeValue> ScormRuntimeValues => Set<ScormRuntimeValue>();

    public DbSet<ScormRuntimeEvent> ScormRuntimeEvents => Set<ScormRuntimeEvent>();

    public DbSet<QuizResult> QuizResults => Set<QuizResult>();

    public DbSet<ProgressTracking> ProgressTrackings => Set<ProgressTracking>();

    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();

    public DbSet<QuizAttemptWrongQuestion> QuizAttemptWrongQuestions => Set<QuizAttemptWrongQuestion>();

    public DbSet<InteractionAttempt> InteractionAttempts => Set<InteractionAttempt>();

    public DbSet<InteractionAttemptResult> InteractionAttemptResults => Set<InteractionAttemptResult>();

    public DbSet<Certificate> Certificates => Set<Certificate>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.PhoneNumber).IsUnique();
            entity.HasIndex(item => item.Email)
                .IsUnique()
                .HasFilter("[Email] <> ''");
            entity.HasIndex(item => item.Username)
                .IsUnique()
                .HasFilter("[Username] <> ''");
            entity.Property(item => item.Role).HasConversion<string>();
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Status).HasConversion<string>();
            entity.HasMany(item => item.Sections)
                .WithOne()
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.Quizzes)
                .WithOne()
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CourseQuiz>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.AssessmentLessonId).IsUnique();
            entity.HasIndex(item => new { item.CourseId, item.SectionId, item.Order });
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.AssessmentLessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<CourseEnrollment>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.CourseId });
            entity.Property(item => item.Status).HasConversion<string>();
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Course>()
                .WithMany()
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CourseSection>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasAlternateKey(item => new { item.Id, item.CourseId });
            entity.HasIndex(item => new { item.CourseId, item.Order }).IsUnique();
            entity.HasMany(item => item.Lessons)
                .WithOne()
                .HasForeignKey(item => new { item.SectionId, item.CourseId })
                .HasPrincipalKey(item => new { item.Id, item.CourseId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.SectionId, item.Order }).IsUnique();
            entity.Property(item => item.Type).HasConversion<string>();
            entity.HasOne(item => item.Assessment)
                .WithOne()
                .HasForeignKey<LessonAssessment>(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.ScormPackage)
                .WithOne()
                .HasForeignKey<ScormPackage>(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            ConfigureJsonProperty(entity.Property(item => item.VideoContent));
        });

        modelBuilder.Entity<LessonAssessment>(entity =>
        {
            entity.HasKey(item => item.LessonId);
            entity.HasMany(item => item.Questions)
                .WithOne()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LessonQuestion>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.LessonId, item.Order }).IsUnique();
            entity.Property(item => item.Type).HasConversion<string>();
            entity.HasMany(item => item.Options)
                .WithOne()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.HotspotTargets)
                .WithOne()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.DragItems)
                .WithOne()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.DragTargets)
                .WithOne()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.CorrectPairs)
                .WithOne()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LessonQuestionOption>(entity =>
        {
            entity.HasKey(item => new { item.QuestionId, item.Code });
            entity.HasIndex(item => new { item.QuestionId, item.Order }).IsUnique();
        });

        modelBuilder.Entity<LessonQuestionHotspotTarget>(entity =>
        {
            entity.HasKey(item => new { item.QuestionId, item.Code });
            entity.HasIndex(item => new { item.QuestionId, item.Order }).IsUnique();
            entity.Property(item => item.Shape).HasConversion<string>();
        });

        modelBuilder.Entity<LessonQuestionDragItem>(entity =>
        {
            entity.HasKey(item => new { item.QuestionId, item.Code });
            entity.HasIndex(item => new { item.QuestionId, item.Order }).IsUnique();
        });

        modelBuilder.Entity<LessonQuestionDragTarget>(entity =>
        {
            entity.HasKey(item => new { item.QuestionId, item.Code });
            entity.HasIndex(item => new { item.QuestionId, item.Order }).IsUnique();
        });

        modelBuilder.Entity<LessonQuestionDragPair>(entity =>
        {
            entity.HasKey(item => new { item.QuestionId, item.DragItemCode, item.DragTargetCode });
            entity.HasOne<LessonQuestionDragItem>()
                .WithMany()
                .HasForeignKey(item => new { item.QuestionId, item.DragItemCode })
                .HasPrincipalKey(item => new { item.QuestionId, item.Code })
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<LessonQuestionDragTarget>()
                .WithMany()
                .HasForeignKey(item => new { item.QuestionId, item.DragTargetCode })
                .HasPrincipalKey(item => new { item.QuestionId, item.Code })
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ScormPackage>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.LessonId).IsUnique();
            entity.HasIndex(item => item.Identifier);
            entity.Property(item => item.Version).HasConversion<string>();
            entity.HasMany(item => item.Scos)
                .WithOne()
                .HasForeignKey(item => item.PackageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScormSco>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.PackageId, item.Order }).IsUnique();
            entity.HasIndex(item => new { item.PackageId, item.Identifier }).IsUnique();
            entity.Property(item => item.ItemType).HasConversion<string>();
        });

        modelBuilder.Entity<ScormRegistration>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId });
            entity.Property(item => item.CompletionStatus).HasConversion<string>();
            entity.Property(item => item.SuccessStatus).HasConversion<string>();
            entity.Property(item => item.ScoreRaw).HasPrecision(9, 2);
            entity.Property(item => item.ScoreMin).HasPrecision(9, 2);
            entity.Property(item => item.ScoreMax).HasPrecision(9, 2);
            entity.Property(item => item.SuspendData).HasColumnType("nvarchar(max)");
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ScormSco>()
                .WithMany()
                .HasForeignKey(item => item.CurrentScoId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ScormRuntimeSession>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.LessonId, item.AttemptNumber }).IsUnique();
            entity.HasIndex(item => new { item.UserId, item.LessonId, item.IsActive });
            entity.Property(item => item.CompletionStatus).HasConversion<string>();
            entity.Property(item => item.SuccessStatus).HasConversion<string>();
            entity.Property(item => item.ScoreRaw).HasPrecision(9, 2);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ScormSco>()
                .WithMany()
                .HasForeignKey(item => item.ScoId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasMany<ScormRuntimeEvent>()
                .WithOne()
                .HasForeignKey(item => item.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScormRuntimeValue>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId, item.ScoId, item.Element });
            entity.Property(item => item.Value).HasColumnType("nvarchar(max)");
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ScormSco>()
                .WithMany()
                .HasForeignKey(item => item.ScoId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ScormRuntimeEvent>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.SessionId, item.Sequence }).IsUnique();
            entity.Property(item => item.Value).HasColumnType("nvarchar(max)");
        });

        modelBuilder.Entity<ProgressTracking>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId });
            entity.Property(item => item.Status).HasConversion<string>();
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizResult>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId });
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttempt>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId, item.AttemptNumber });
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.WrongQuestions)
                .WithOne()
                .HasForeignKey(item => new { item.UserId, item.LessonId, item.AttemptNumber })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttemptWrongQuestion>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId, item.AttemptNumber, item.QuestionId });
            entity.HasOne<LessonQuestion>()
                .WithMany()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<InteractionAttempt>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId, item.AttemptNumber });
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Lesson>()
                .WithMany()
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(item => item.QuestionResults)
                .WithOne()
                .HasForeignKey(item => new { item.UserId, item.LessonId, item.AttemptNumber })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InteractionAttemptResult>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.LessonId, item.AttemptNumber, item.QuestionId });
            entity.HasOne<LessonQuestion>()
                .WithMany()
                .HasForeignKey(item => item.QuestionId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Certificate>(entity =>
        {
            entity.HasKey(item => new { item.UserId, item.CourseId });
            entity.HasIndex(item => item.CertificateId).IsUnique();
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Course>()
                .WithMany()
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.TokenHash).IsUnique();
            entity.HasIndex(item => item.UserId);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.TokenHash).IsUnique();
            entity.HasIndex(item => item.UserId);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureJsonProperty<T>(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<T?> property)
        where T : class
    {
        property.HasColumnType("nvarchar(max)");
        property.HasConversion(
            value => value == null ? null : JsonStorage.Serialize(value),
            value => JsonStorage.Deserialize<T>(value));
        property.Metadata.SetValueComparer(CreateJsonComparer<T>());
    }

    private static void ConfigureJsonProperty<T>(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<List<T>> property)
    {
        property.HasColumnType("nvarchar(max)");
        property.HasConversion(
            value => JsonStorage.Serialize(value),
            value => JsonStorage.Deserialize<List<T>>(value) ?? new List<T>());
        property.Metadata.SetValueComparer(CreateJsonListComparer<T>());
    }

    private static ValueComparer<T?> CreateJsonComparer<T>()
        where T : class
    {
        return new ValueComparer<T?>(
            (left, right) => JsonStorage.Serialize(left) == JsonStorage.Serialize(right),
            value => value == null ? 0 : JsonStorage.Serialize(value).GetHashCode(StringComparison.Ordinal),
            value => JsonStorage.Clone(value));
    }

    private static ValueComparer<List<T>> CreateJsonListComparer<T>()
    {
        return new ValueComparer<List<T>>(
            (left, right) => JsonStorage.Serialize(left) == JsonStorage.Serialize(right),
            value => JsonStorage.Serialize(value).GetHashCode(StringComparison.Ordinal),
            value => JsonStorage.Clone(value) ?? new List<T>());
    }
}
