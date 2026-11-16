using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPartTwoCertificateSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AddressSnapshot",
                table: "Certificates",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DocumentSvg",
                table: "Certificates",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FullNameSnapshot",
                table: "Certificates",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TemplateVersion",
                table: "Certificates",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AddressSnapshot",
                table: "Certificates");

            migrationBuilder.DropColumn(
                name: "DocumentSvg",
                table: "Certificates");

            migrationBuilder.DropColumn(
                name: "FullNameSnapshot",
                table: "Certificates");

            migrationBuilder.DropColumn(
                name: "TemplateVersion",
                table: "Certificates");
        }
    }
}
