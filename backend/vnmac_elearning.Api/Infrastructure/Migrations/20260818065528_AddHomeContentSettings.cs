using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHomeContentSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HomeContentJson",
                table: "SystemSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HomeContentJson",
                table: "SystemSettings");
        }
    }
}
