using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLearnerType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LearnerType",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LearnerType",
                table: "Users");
        }
    }
}
