using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScormLmsRuntime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScormPackages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Identifier = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntryPath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LaunchScoId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManifestVersion = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormPackages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScormPackages_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScormScos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PackageId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Identifier = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LaunchPath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ItemType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    MasteryScore = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormScos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScormScos_ScormPackages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "ScormPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScormRegistrations",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    CurrentScoId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CompletionStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SuccessStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScoreRaw = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true),
                    ScoreMin = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true),
                    ScoreMax = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true),
                    TotalTimeSeconds = table.Column<int>(type: "int", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SuspendData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastLaunchedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastCommittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormRegistrations", x => new { x.UserId, x.LessonId });
                    table.ForeignKey(
                        name: "FK_ScormRegistrations_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScormRegistrations_ScormScos_CurrentScoId",
                        column: x => x.CurrentScoId,
                        principalTable: "ScormScos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScormRegistrations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScormRuntimeSessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ScoId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    EventCount = table.Column<int>(type: "int", nullable: false),
                    EntryMode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExitMode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompletionStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SuccessStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScoreRaw = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true),
                    BaseTotalTimeSeconds = table.Column<int>(type: "int", nullable: false),
                    SessionTimeSeconds = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    InitializedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastCommittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormRuntimeSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScormRuntimeSessions_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScormRuntimeSessions_ScormScos_ScoId",
                        column: x => x.ScoId,
                        principalTable: "ScormScos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScormRuntimeSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScormRuntimeValues",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ScoId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Element = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormRuntimeValues", x => new { x.UserId, x.LessonId, x.ScoId, x.Element });
                    table.ForeignKey(
                        name: "FK_ScormRuntimeValues_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScormRuntimeValues_ScormScos_ScoId",
                        column: x => x.ScoId,
                        principalTable: "ScormScos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScormRuntimeValues_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScormRuntimeEvents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SessionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Element = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScormRuntimeEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScormRuntimeEvents_ScormRuntimeSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ScormRuntimeSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScormPackages_Identifier",
                table: "ScormPackages",
                column: "Identifier");

            migrationBuilder.CreateIndex(
                name: "IX_ScormPackages_LessonId",
                table: "ScormPackages",
                column: "LessonId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScormRegistrations_CurrentScoId",
                table: "ScormRegistrations",
                column: "CurrentScoId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormRegistrations_LessonId",
                table: "ScormRegistrations",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeEvents_SessionId_Sequence",
                table: "ScormRuntimeEvents",
                columns: new[] { "SessionId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeSessions_LessonId",
                table: "ScormRuntimeSessions",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeSessions_ScoId",
                table: "ScormRuntimeSessions",
                column: "ScoId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeSessions_UserId_LessonId_AttemptNumber",
                table: "ScormRuntimeSessions",
                columns: new[] { "UserId", "LessonId", "AttemptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeSessions_UserId_LessonId_IsActive",
                table: "ScormRuntimeSessions",
                columns: new[] { "UserId", "LessonId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeValues_LessonId",
                table: "ScormRuntimeValues",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormRuntimeValues_ScoId",
                table: "ScormRuntimeValues",
                column: "ScoId");

            migrationBuilder.CreateIndex(
                name: "IX_ScormScos_PackageId_Identifier",
                table: "ScormScos",
                columns: new[] { "PackageId", "Identifier" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScormScos_PackageId_Order",
                table: "ScormScos",
                columns: new[] { "PackageId", "Order" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScormRegistrations");

            migrationBuilder.DropTable(
                name: "ScormRuntimeEvents");

            migrationBuilder.DropTable(
                name: "ScormRuntimeValues");

            migrationBuilder.DropTable(
                name: "ScormRuntimeSessions");

            migrationBuilder.DropTable(
                name: "ScormScos");

            migrationBuilder.DropTable(
                name: "ScormPackages");
        }
    }
}
