using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using vnmac_elearning.Api.Domain;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Infrastructure;

public static class PartOneDatabase
{
    public static async Task RunAsync(IServiceProvider services, string[] args, string contentRoot)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TrainingDbContext>();
        var connection = (SqlConnection)db.Database.GetDbConnection();
        await connection.OpenAsync();
        var database = connection.Database;
        Console.WriteLine($"Database target: {connection.DataSource} / {database}");
        if (args.Contains("--inspect-database"))
        {
            foreach (var table in new[] { "Users", "Courses", "Lessons", "QuizAttempts", "ProgressTrackings" })
            {
                using var command = new SqlCommand($"SELECT COUNT_BIG(*) FROM [dbo].[{table}]", connection);
                Console.WriteLine($"{table}: {await command.ExecuteScalarAsync()}");
            }
            return;
        }
        var expected = args.SkipWhile(x => x != "--expected-database").Skip(1).FirstOrDefault();
        if (expected != database) throw new InvalidOperationException("Pass --expected-database with the inspected database name.");
        var jsonPath = Path.Combine(contentRoot, "Content", "part1.json");
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        var course = JsonSerializer.Deserialize<Course>(await File.ReadAllTextAsync(jsonPath), options)!;
        foreach (var lesson in course.Sections.SelectMany(x => x.Lessons))
            LearningFlowValidation.Validate(lesson.Content!.Flow);

        if (args.Contains("--apply-part1-content"))
        {
            if (await db.LearningFlowProgresses.AnyAsync() || await db.QuizAttempts.AnyAsync())
                throw new InvalidOperationException("Content refresh is allowed only before anyone starts learning. Use the admin editor for published revisions.");
            var existing = await db.Lessons.Where(x => x.CourseId == course.Id).ToListAsync();
            var incoming = course.Sections.SelectMany(x => x.Lessons).ToArray();
            if (!existing.Select(x => x.Id).ToHashSet().SetEquals(incoming.Select(x => x.Id)))
                throw new InvalidOperationException("Content refresh cannot add or remove lessons.");
            foreach (var lesson in existing)
            {
                lesson.Content = incoming.Single(x => x.Id == lesson.Id).Content;
                lesson.UpdatedAt = DateTimeOffset.UtcNow;
            }
            await db.SaveChangesAsync();
            Console.WriteLine("Refreshed Part 1 content. Accounts and reference catalog unchanged.");
            return;
        }
        var password = Environment.GetEnvironmentVariable("VNMAC_RESET_ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(password) || password.Length < 12) throw new InvalidOperationException("VNMAC_RESET_ADMIN_PASSWORD must contain at least 12 characters.");

        // SQL Server writes its backup to its configured backup directory; never overwrite an older backup.
        using var pathCommand = new SqlCommand("SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000))", connection);
        var backupRoot = Convert.ToString(await pathCommand.ExecuteScalarAsync());
        if (string.IsNullOrWhiteSpace(backupRoot)) throw new InvalidOperationException("SQL Server backup directory is unavailable; reset aborted.");
        var backup = Path.Combine(backupRoot, $"{database}-before-part1-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.bak");
        using (var backupCommand = new SqlCommand("BACKUP DATABASE " + Quote(database) + " TO DISK = @path WITH COPY_ONLY, CHECKSUM", connection) { CommandTimeout = 180 })
        {
            backupCommand.Parameters.AddWithValue("@path", backup);
            await backupCommand.ExecuteNonQueryAsync();
        }
        using (var verify = new SqlCommand("RESTORE VERIFYONLY FROM DISK = @path WITH CHECKSUM", connection) { CommandTimeout = 180 })
        {
            verify.Parameters.AddWithValue("@path", backup);
            await verify.ExecuteNonQueryAsync();
        }
        Console.WriteLine("Verified backup: " + backup);

        // Provinces are a reference catalog, not learner data. Recreate it after the reset.
        var provinces = await db.Provinces.AsNoTracking().ToListAsync();
        var tables = new List<string>();
        using (var list = new SqlCommand("SELECT QUOTENAME(s.name)+'.'+QUOTENAME(t.name) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE t.is_ms_shipped=0 AND t.name <> '__EFMigrationsHistory'", connection))
        using (var reader = await list.ExecuteReaderAsync())
            while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
        await using var transaction = await db.Database.BeginTransactionAsync();
        foreach (var table in tables) await db.Database.ExecuteSqlRawAsync($"ALTER TABLE {table} NOCHECK CONSTRAINT ALL");
        foreach (var table in tables) await db.Database.ExecuteSqlRawAsync($"DELETE FROM {table}");
        foreach (var table in tables) await db.Database.ExecuteSqlRawAsync($"ALTER TABLE {table} WITH CHECK CHECK CONSTRAINT ALL");
        db.ChangeTracker.Clear();
        var now = DateTimeOffset.UtcNow;
        db.AppRoles.AddRange(
            new AppRole { Id = "role-admin", Code = "admin", Name = "Quản trị viên", IsSystem = true, IsAdmin = true, CreatedAt = now, UpdatedAt = now },
            new AppRole { Id = "role-learner", Code = "learner", Name = "Học viên", IsSystem = true, CreatedAt = now, UpdatedAt = now });
        var admin = new User { Id = $"admin-{Guid.NewGuid():N}", Username = "admin", FullName = "Quản trị viên VNMAC", PhoneNumber = "0000000000", Role = UserRole.Admin, RoleId = "role-admin", CreatedAt = now, LastLogin = now, IsEmailVerified = true, CreatedByAdmin = true };
        admin.PasswordHash = scope.ServiceProvider.GetRequiredService<PasswordService>().HashPassword(admin, password);
        db.Users.Add(admin);
        db.Provinces.AddRange(provinces);
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        Console.WriteLine($"Reset complete. Accounts: 1 administrator. Course: {course.Id}. Content lessons: 4. Section assessment: 12 questions.");
    }

    private static string Quote(string name) => "[" + name.Replace("]", "]]") + "]";
}
