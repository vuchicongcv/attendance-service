using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddNewtonsoftJson();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<HRCoreService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddSingleton<AttendanceEventService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    try
    {
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
    }
    catch { }
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
