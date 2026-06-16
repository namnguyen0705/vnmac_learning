using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace vnmac_elearning.Api.Infrastructure.Migrations;

[DbContext(typeof(TrainingDbContext))]
[Migration("20260609090000_AddVideoPlaybackTracking")]
public class AddVideoPlaybackTracking : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "LastPositionSeconds",
            table: "ProgressTrackings",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "LastWatchedAt",
            table: "ProgressTrackings",
            type: "datetimeoffset",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "LastPositionSeconds",
            table: "ProgressTrackings");

        migrationBuilder.DropColumn(
            name: "LastWatchedAt",
            table: "ProgressTrackings");
    }
}
