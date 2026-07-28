using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    [DbContext(typeof(TrainingDbContext))]
    [Migration("20260715130000_AddLessonStudyState")]
    public partial class AddLessonStudyState : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentStep",
                table: "ProgressTrackings",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "intro");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastAccessedAt",
                table: "ProgressTrackings",
                type: "datetimeoffset",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentStep",
                table: "ProgressTrackings");

            migrationBuilder.DropColumn(
                name: "LastAccessedAt",
                table: "ProgressTrackings");
        }
    }
}
