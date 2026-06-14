using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Attendance.API.Data;
using Attendance.API.Services;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddNewtonsoftJson();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration["DATABASE_URL"]
    ?? builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("postgresql://"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHttpClient<HRCoreService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddSingleton<AttendanceEventService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsASecureKeyForAttendanceAPI2024!@#$%^&*()";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        await context.Response.WriteAsync("{\"error\":\"Internal server error\"}");
    });
});

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""Shifts"" (
                ""Id"" UUID PRIMARY KEY,
                ""ShiftCode"" TEXT NOT NULL,
                ""ShiftName"" TEXT NOT NULL,
                ""StartTime"" INTERVAL NOT NULL,
                ""EndTime"" INTERVAL NOT NULL,
                ""AllowedLateMinutes"" DOUBLE PRECISION NOT NULL DEFAULT 30,
                ""Description"" TEXT NULL,
                ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
                ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                ""UpdatedAt"" TIMESTAMP NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Shifts_ShiftCode"" ON ""Shifts"" (""ShiftCode"");
        ");
        db.Database.ExecuteSqlRaw(@"
            ALTER TABLE ""AttendanceRecords"" ADD COLUMN IF NOT EXISTS ""ShiftId"" UUID NULL;
            CREATE INDEX IF NOT EXISTS ""IX_AttendanceRecords_ShiftId"" ON ""AttendanceRecords"" (""ShiftId"");
        ");
    }
    catch { }
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
