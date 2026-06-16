using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace vnmac_elearning.Api.Infrastructure.Migrations;

[DbContext(typeof(TrainingDbContext))]
[Migration("20260615090000_AddUserLockStatus")]
public sealed class AddUserLockStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsLocked",
            table: "Users",
            type: "bit",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsLocked",
            table: "Users");
    }
}
