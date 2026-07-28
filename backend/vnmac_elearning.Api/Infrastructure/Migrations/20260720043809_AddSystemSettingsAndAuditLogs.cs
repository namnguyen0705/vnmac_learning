using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemSettingsAndAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemAuditLogs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ActorUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    ActorName = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    ActorRole = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Module = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DetailJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SiteTitle = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    HeaderTitle = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    HeaderSubtitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ProjectLogoUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    LoginLogoUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    VnmacLogoUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    VietnamFlagUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    UsFlagUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    CrsLogoUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    HeaderBackgroundColor = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    HeaderBackgroundImageUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    LoginBackgroundImageUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    CertificateTemplateUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    CertificateTitle = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    CertificateCourseTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditLogs_Action",
                table: "SystemAuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditLogs_ActorUserId",
                table: "SystemAuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditLogs_Module",
                table: "SystemAuditLogs",
                column: "Module");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditLogs_OccurredAt",
                table: "SystemAuditLogs",
                column: "OccurredAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemAuditLogs");

            migrationBuilder.DropTable(
                name: "SystemSettings");
        }
    }
}
