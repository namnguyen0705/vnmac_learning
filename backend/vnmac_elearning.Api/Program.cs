using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using vnmac_elearning.Api.Infrastructure;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.AddDebug();

        builder.Services
            .AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
            });

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("JWT settings were not found.");

        builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Elearning API",
                Version = "v1",
                Description = "Online training API for UXO safety education."
            });

            var bearerScheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Description = "Nhap Bearer access token. Vi du: Bearer {token}",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = JwtBearerDefaults.AuthenticationScheme,
                BearerFormat = "JWT"
            };

            options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, bearerScheme);
            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, document, null)] = []
            });
        });

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });
        builder.Services.AddAuthorization();

        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddFixedWindowLimiter("login", limiterOptions =>
            {
                limiterOptions.PermitLimit = 5;
                limiterOptions.Window = TimeSpan.FromMinutes(1);
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit = 0;
            });
        });

        builder.Services.AddDbContext<TrainingDbContext>(options => options.UseSqlServer(connectionString));
        builder.Services.AddScoped<PasswordService>();
        builder.Services.AddScoped<TokenService>();
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<LearningService>();
        builder.Services.AddScoped<AdminService>();

        var app = builder.Build();

        DatabaseInitializer.Initialize(app.Services);

        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

                if (exception is ServiceException serviceException)
                {
                    context.Response.StatusCode = serviceException.StatusCode;
                    await context.Response.WriteAsJsonAsync(new ServiceErrorResponse(
                        serviceException.Key,
                        serviceException.Message));
                    return;
                }

                if (exception is not null)
                {
                    app.Logger.LogError(exception, "Unhandled exception while processing request.");
                }

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                if (app.Environment.IsDevelopment() && exception is not null)
                {
                    await context.Response.WriteAsJsonAsync(new
                    {
                        key = "common.internal_server_error",
                        message = "An unexpected error occurred.",
                        detail = exception.ToString()
                    });
                    return;
                }

                await context.Response.WriteAsJsonAsync(new ServiceErrorResponse(
                    "common.internal_server_error",
                    "An unexpected error occurred."));
            });
        });

        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseStaticFiles();
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapGet("/", () => Results.Ok(new
        {
            service = "vnmac_elearning API",
            framework = ".NET 10",
            timestamp = DateTimeOffset.UtcNow,
            endpoints = new[]
            {
                "/swagger",
                "/api/auth/register",
                "/api/auth/verify-email",
                "/api/auth/login",
                "/api/auth/refresh",
                "/api/auth/me",
                "/api/courses",
                "/api/learning/learners/{userId}/dashboard",
                "/api/learning/learners/{userId}/courses/{courseId}/progress",
                "/api/learning/learners/{userId}/quizzes/{quizId}/session",
                "/api/learning/learners/{userId}/lessons/{lessonId}/scorm/launch",
                "/api/scorm/player/{sessionId}",
                "/api/certificates/verify/{certificateId}",
                "/api/admin/analytics",
                "/api/admin/quizzes",
                "/api/admin/user-accounts"
            }
        }));

        app.MapControllers();
        app.Run();
    }
}
