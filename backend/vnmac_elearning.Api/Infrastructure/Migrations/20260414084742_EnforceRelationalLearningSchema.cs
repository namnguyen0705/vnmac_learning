using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceRelationalLearningSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Lessons_CourseSections_SectionId",
                table: "Lessons");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_SectionId",
                table: "Lessons");

            migrationBuilder.DropIndex(
                name: "IX_CourseSections_CourseId_Order",
                table: "CourseSections");

            migrationBuilder.AlterColumn<string>(
                name: "CourseId",
                table: "Lessons",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_CourseSections_Id_CourseId",
                table: "CourseSections",
                columns: new[] { "Id", "CourseId" });

            migrationBuilder.CreateTable(
                name: "InteractionAttemptResults",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Correct = table.Column<bool>(type: "bit", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InteractionAttemptResults", x => new { x.UserId, x.LessonId, x.AttemptNumber, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_InteractionAttemptResults_InteractionAttempts_UserId_LessonId_AttemptNumber",
                        columns: x => new { x.UserId, x.LessonId, x.AttemptNumber },
                        principalTable: "InteractionAttempts",
                        principalColumns: new[] { "UserId", "LessonId", "AttemptNumber" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InteractionAttemptResults_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuizAttemptWrongQuestions",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizAttemptWrongQuestions", x => new { x.UserId, x.LessonId, x.AttemptNumber, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_QuizAttemptWrongQuestions_LessonQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "LessonQuestions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QuizAttemptWrongQuestions_QuizAttempts_UserId_LessonId_AttemptNumber",
                        columns: x => new { x.UserId, x.LessonId, x.AttemptNumber },
                        principalTable: "QuizAttempts",
                        principalColumns: new[] { "UserId", "LessonId", "AttemptNumber" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                IF COL_LENGTH(N'QuizAttempts', N'WrongQuestionIds') IS NOT NULL
                BEGIN
                    INSERT INTO [QuizAttemptWrongQuestions] ([UserId], [LessonId], [AttemptNumber], [QuestionId])
                    SELECT [qa].[UserId],
                           [qa].[LessonId],
                           [qa].[AttemptNumber],
                           [q].[Id]
                    FROM [QuizAttempts] AS [qa]
                    CROSS APPLY OPENJSON([qa].[WrongQuestionIds]) AS [j]
                    INNER JOIN [LessonQuestions] AS [q] ON [q].[Id] = CAST([j].[value] AS nvarchar(450))
                    WHERE ISJSON([qa].[WrongQuestionIds]) = 1
                      AND NOT EXISTS
                      (
                          SELECT 1
                          FROM [QuizAttemptWrongQuestions] AS [existing]
                          WHERE [existing].[UserId] = [qa].[UserId]
                            AND [existing].[LessonId] = [qa].[LessonId]
                            AND [existing].[AttemptNumber] = [qa].[AttemptNumber]
                            AND [existing].[QuestionId] = [q].[Id]
                      );
                END;
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH(N'InteractionAttempts', N'Results') IS NOT NULL
                BEGIN
                    INSERT INTO [InteractionAttemptResults] ([UserId], [LessonId], [AttemptNumber], [QuestionId], [Correct], [Explanation])
                    SELECT [ia].[UserId],
                           [ia].[LessonId],
                           [ia].[AttemptNumber],
                           [q].[Id],
                           [result].[Correct],
                           COALESCE([result].[Explanation], N'')
                    FROM [InteractionAttempts] AS [ia]
                    CROSS APPLY OPENJSON([ia].[Results])
                    WITH
                    (
                        [QuestionId] nvarchar(450) '$.TaskId',
                        [Correct] bit '$.Correct',
                        [Explanation] nvarchar(max) '$.Explanation'
                    ) AS [result]
                    INNER JOIN [LessonQuestions] AS [q] ON [q].[Id] = [result].[QuestionId]
                    WHERE ISJSON([ia].[Results]) = 1
                      AND [result].[QuestionId] IS NOT NULL
                      AND NOT EXISTS
                      (
                          SELECT 1
                          FROM [InteractionAttemptResults] AS [existing]
                          WHERE [existing].[UserId] = [ia].[UserId]
                            AND [existing].[LessonId] = [ia].[LessonId]
                            AND [existing].[AttemptNumber] = [ia].[AttemptNumber]
                            AND [existing].[QuestionId] = [q].[Id]
                      );
                END;
                """);

            migrationBuilder.DropColumn(
                name: "WrongQuestionIds",
                table: "QuizAttempts");

            migrationBuilder.DropColumn(
                name: "InteractiveContent",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "QuizContent",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "Results",
                table: "InteractionAttempts");

            migrationBuilder.DropTable(
                name: "QuizQuestions");

            migrationBuilder.CreateIndex(
                name: "IX_QuizResults_LessonId",
                table: "QuizResults",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttempts_LessonId",
                table: "QuizAttempts",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressTrackings_LessonId",
                table: "ProgressTrackings",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_SectionId_CourseId",
                table: "Lessons",
                columns: new[] { "SectionId", "CourseId" });

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_SectionId_Order",
                table: "Lessons",
                columns: new[] { "SectionId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonQuestionDragPairs_QuestionId_DragTargetCode",
                table: "LessonQuestionDragPairs",
                columns: new[] { "QuestionId", "DragTargetCode" });

            migrationBuilder.CreateIndex(
                name: "IX_InteractionAttempts_LessonId",
                table: "InteractionAttempts",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseSections_CourseId_Order",
                table: "CourseSections",
                columns: new[] { "CourseId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InteractionAttemptResults_QuestionId",
                table: "InteractionAttemptResults",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttemptWrongQuestions_QuestionId",
                table: "QuizAttemptWrongQuestions",
                column: "QuestionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Certificates_Users_UserId",
                table: "Certificates",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InteractionAttempts_Lessons_LessonId",
                table: "InteractionAttempts",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InteractionAttempts_Users_UserId",
                table: "InteractionAttempts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LessonQuestionDragPairs_LessonQuestionDragItems_QuestionId_DragItemCode",
                table: "LessonQuestionDragPairs",
                columns: new[] { "QuestionId", "DragItemCode" },
                principalTable: "LessonQuestionDragItems",
                principalColumns: new[] { "QuestionId", "Code" });

            migrationBuilder.AddForeignKey(
                name: "FK_LessonQuestionDragPairs_LessonQuestionDragTargets_QuestionId_DragTargetCode",
                table: "LessonQuestionDragPairs",
                columns: new[] { "QuestionId", "DragTargetCode" },
                principalTable: "LessonQuestionDragTargets",
                principalColumns: new[] { "QuestionId", "Code" });

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_CourseSections_SectionId_CourseId",
                table: "Lessons",
                columns: new[] { "SectionId", "CourseId" },
                principalTable: "CourseSections",
                principalColumns: new[] { "Id", "CourseId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressTrackings_Lessons_LessonId",
                table: "ProgressTrackings",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressTrackings_Users_UserId",
                table: "ProgressTrackings",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuizAttempts_Lessons_LessonId",
                table: "QuizAttempts",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuizAttempts_Users_UserId",
                table: "QuizAttempts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuizResults_Lessons_LessonId",
                table: "QuizResults",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuizResults_Users_UserId",
                table: "QuizResults",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Certificates_Users_UserId",
                table: "Certificates");

            migrationBuilder.DropForeignKey(
                name: "FK_InteractionAttempts_Lessons_LessonId",
                table: "InteractionAttempts");

            migrationBuilder.DropForeignKey(
                name: "FK_InteractionAttempts_Users_UserId",
                table: "InteractionAttempts");

            migrationBuilder.DropForeignKey(
                name: "FK_LessonQuestionDragPairs_LessonQuestionDragItems_QuestionId_DragItemCode",
                table: "LessonQuestionDragPairs");

            migrationBuilder.DropForeignKey(
                name: "FK_LessonQuestionDragPairs_LessonQuestionDragTargets_QuestionId_DragTargetCode",
                table: "LessonQuestionDragPairs");

            migrationBuilder.DropForeignKey(
                name: "FK_Lessons_CourseSections_SectionId_CourseId",
                table: "Lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_ProgressTrackings_Lessons_LessonId",
                table: "ProgressTrackings");

            migrationBuilder.DropForeignKey(
                name: "FK_ProgressTrackings_Users_UserId",
                table: "ProgressTrackings");

            migrationBuilder.DropForeignKey(
                name: "FK_QuizAttempts_Lessons_LessonId",
                table: "QuizAttempts");

            migrationBuilder.DropForeignKey(
                name: "FK_QuizAttempts_Users_UserId",
                table: "QuizAttempts");

            migrationBuilder.DropForeignKey(
                name: "FK_QuizResults_Lessons_LessonId",
                table: "QuizResults");

            migrationBuilder.DropForeignKey(
                name: "FK_QuizResults_Users_UserId",
                table: "QuizResults");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "InteractionAttemptResults");

            migrationBuilder.DropTable(
                name: "QuizAttemptWrongQuestions");

            migrationBuilder.DropIndex(
                name: "IX_QuizResults_LessonId",
                table: "QuizResults");

            migrationBuilder.DropIndex(
                name: "IX_QuizAttempts_LessonId",
                table: "QuizAttempts");

            migrationBuilder.DropIndex(
                name: "IX_ProgressTrackings_LessonId",
                table: "ProgressTrackings");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_SectionId_CourseId",
                table: "Lessons");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_SectionId_Order",
                table: "Lessons");

            migrationBuilder.DropIndex(
                name: "IX_LessonQuestionDragPairs_QuestionId_DragTargetCode",
                table: "LessonQuestionDragPairs");

            migrationBuilder.DropIndex(
                name: "IX_InteractionAttempts_LessonId",
                table: "InteractionAttempts");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_CourseSections_Id_CourseId",
                table: "CourseSections");

            migrationBuilder.DropIndex(
                name: "IX_CourseSections_CourseId_Order",
                table: "CourseSections");

            migrationBuilder.AddColumn<string>(
                name: "WrongQuestionIds",
                table: "QuizAttempts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "CourseId",
                table: "Lessons",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "InteractiveContent",
                table: "Lessons",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuizContent",
                table: "Lessons",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Results",
                table: "InteractionAttempts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE [qa]
                SET [WrongQuestionIds] = COALESCE([wrong].[WrongQuestionIds], N'[]')
                FROM [QuizAttempts] AS [qa]
                OUTER APPLY
                (
                    SELECT
                    (
                        SELECT [wrong].[QuestionId] AS [value]
                        FROM [QuizAttemptWrongQuestions] AS [wrong]
                        WHERE [wrong].[UserId] = [qa].[UserId]
                          AND [wrong].[LessonId] = [qa].[LessonId]
                          AND [wrong].[AttemptNumber] = [qa].[AttemptNumber]
                        FOR JSON PATH
                    ) AS [WrongQuestionIds]
                ) AS [wrong];
                """);

            migrationBuilder.Sql("""
                UPDATE [ia]
                SET [Results] = COALESCE([result].[Results], N'[]')
                FROM [InteractionAttempts] AS [ia]
                OUTER APPLY
                (
                    SELECT
                    (
                        SELECT [result].[QuestionId] AS [TaskId],
                               [result].[Correct],
                               [result].[Explanation]
                        FROM [InteractionAttemptResults] AS [result]
                        WHERE [result].[UserId] = [ia].[UserId]
                          AND [result].[LessonId] = [ia].[LessonId]
                          AND [result].[AttemptNumber] = [ia].[AttemptNumber]
                        FOR JSON PATH
                    ) AS [Results]
                ) AS [result];
                """);

            migrationBuilder.CreateTable(
                name: "QuizQuestions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CorrectAnswer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Options = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Rationale = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizQuestions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_SectionId",
                table: "Lessons",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseSections_CourseId_Order",
                table: "CourseSections",
                columns: new[] { "CourseId", "Order" });

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_CourseSections_SectionId",
                table: "Lessons",
                column: "SectionId",
                principalTable: "CourseSections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
