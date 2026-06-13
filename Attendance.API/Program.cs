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
            CREATE TABLE IF NOT EXISTS ""EmployeeInfo"" (
                ""Id"" UUID PRIMARY KEY,
                ""EmployeeCode"" TEXT NOT NULL,
                ""FullName"" TEXT NOT NULL,
                ""Email"" TEXT NULL,
                ""DepartmentId"" UUID NULL,
                ""DepartmentName"" TEXT NULL,
                ""PositionId"" UUID NULL,
                ""PositionName"" TEXT NULL,
                ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
                ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                ""UpdatedAt"" TIMESTAMP NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_EmployeeInfo_EmployeeCode"" ON ""EmployeeInfo"" (""EmployeeCode"");
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
