using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    [DbContext(typeof(TrainingDbContext))]
    [Migration("20260714103000_AddAssessmentQuestionLimit")]
    public partial class AddAssessmentQuestionLimit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuestionLimit",
                table: "LessonAssessments",
                type: "int",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuestionLimit",
                table: "LessonAssessments");
        }
    }
}
