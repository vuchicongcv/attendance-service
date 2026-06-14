using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;

var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(Environment.GetEnvironmentVariable(\"DATABASE_URL\")).Options;
using var db = new AppDbContext(options);
foreach (var e in db.EmployeeInfo.ToList()) {
    Console.WriteLine($"{e.Id} - {e.EmployeeCode} - {e.FullName}");
}
