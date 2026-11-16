using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "CourseSections",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "CourseSections");
        }
    }
}
