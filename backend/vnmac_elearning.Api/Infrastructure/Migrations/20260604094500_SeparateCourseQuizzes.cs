using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations;

[DbContext(typeof(TrainingDbContext))]
[Migration("20260604094500_SeparateCourseQuizzes")]
public class SeparateCourseQuizzes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CourseQuizzes",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                SectionId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                AssessmentLessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Order = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseQuizzes", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseQuizzes_Courses_CourseId",
                    column: x => x.CourseId,
                    principalTable: "Courses",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_CourseQuizzes_Lessons_AssessmentLessonId",
                    column: x => x.AssessmentLessonId,
                    principalTable: "Lessons",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CourseQuizzes_AssessmentLessonId",
            table: "CourseQuizzes",
            column: "AssessmentLessonId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_CourseQuizzes_CourseId_SectionId_Order",
            table: "CourseQuizzes",
            columns: new[] { "CourseId", "SectionId", "Order" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "CourseQuizzes");
    }
}
