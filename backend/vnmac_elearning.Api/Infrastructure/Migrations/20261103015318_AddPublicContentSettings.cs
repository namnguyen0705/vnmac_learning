using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicContentSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicContentJson",
                table: "SystemSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicContentJson",
                table: "SystemSettings");
        }
    }
}
