using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyLessonDifficulty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Lessons_Difficulty",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "Lessons");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "Lessons",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Basic");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_Difficulty",
                table: "Lessons",
                column: "Difficulty");
        }
    }
}

