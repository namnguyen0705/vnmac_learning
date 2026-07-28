using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    [DbContext(typeof(TrainingDbContext))]
    [Migration("20260714090000_AddLessonAdminMetadata")]
    public partial class AddLessonAdminMetadata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "Lessons",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "Lessons",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Basic");

            migrationBuilder.AddColumn<string>(
                name: "PublicationStatus",
                table: "Lessons",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Published");

            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                table: "Lessons",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "Lessons",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "Lessons",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_Difficulty",
                table: "Lessons",
                column: "Difficulty");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_PublicationStatus",
                table: "Lessons",
                column: "PublicationStatus");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Lessons_Difficulty",
                table: "Lessons");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_PublicationStatus",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "PublicationStatus",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "Topic",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Lessons");
        }
    }
}
