using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeAssessmentQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LessonAssessments",
                columns: table => new
                {
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Intro = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RetryHint = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PassScore = table.Column<int>(type: "int", nullable: false),
                    RandomizeQuestionOrder = table.Column<bool>(type: "bit", nullable: false),
                    RandomizeOptionOrder = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonAssessments", x => x.LessonId);
                    table.ForeignKey(
                        name: "FK_LessonAssessments_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Prompt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Statement = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MediaTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScenarioTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScenarioContext = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonQuestions_LessonAssessments_LessonId",
                        column: x => x.LessonId,
                        principalTable: "LessonAssessments",
                        principalColumn: "LessonId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestionDragItems",
                columns: table => new
                {
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestionDragItems", x => new { x.QuestionId, x.Code });
                    table.ForeignKey(
                        name: "FK_LessonQuestionDragItems_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestionDragPairs",
                columns: table => new
                {
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DragItemCode = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DragTargetCode = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestionDragPairs", x => new { x.QuestionId, x.DragItemCode, x.DragTargetCode });
                    table.ForeignKey(
                        name: "FK_LessonQuestionDragPairs_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestionDragTargets",
                columns: table => new
                {
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestionDragTargets", x => new { x.QuestionId, x.Code });
                    table.ForeignKey(
                        name: "FK_LessonQuestionDragTargets_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestionHotspotTargets",
                columns: table => new
                {
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Shape = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    X = table.Column<double>(type: "float", nullable: false),
                    Y = table.Column<double>(type: "float", nullable: false),
                    Width = table.Column<double>(type: "float", nullable: false),
                    Height = table.Column<double>(type: "float", nullable: false),
                    Radius = table.Column<double>(type: "float", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestionHotspotTargets", x => new { x.QuestionId, x.Code });
                    table.ForeignKey(
                        name: "FK_LessonQuestionHotspotTargets_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonQuestionOptions",
                columns: table => new
                {
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonQuestionOptions", x => new { x.QuestionId, x.Code });
                    table.ForeignKey(
                        name: "FK_LessonQuestionOptions_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestionDragItems_QuestionId_Order",
                table: "LessonQuestionDragItems",
                columns: new[] { "QuestionId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestionDragTargets_QuestionId_Order",
                table: "LessonQuestionDragTargets",
                columns: new[] { "QuestionId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestionHotspotTargets_QuestionId_Order",
                table: "LessonQuestionHotspotTargets",
                columns: new[] { "QuestionId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestionOptions_QuestionId_Order",
                table: "LessonQuestionOptions",
                columns: new[] { "QuestionId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestions_LessonId_Order",
                table: "LessonQuestions",
                columns: new[] { "LessonId", "Order" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LessonQuestionDragItems");

            migrationBuilder.DropTable(
                name: "LessonQuestionDragPairs");

            migrationBuilder.DropTable(
                name: "LessonQuestionDragTargets");

            migrationBuilder.DropTable(
                name: "LessonQuestionHotspotTargets");

            migrationBuilder.DropTable(
                name: "LessonQuestionOptions");

            migrationBuilder.DropTable(
                name: "LessonQuestions");

            migrationBuilder.DropTable(
                name: "LessonAssessments");
        }
    }
}
