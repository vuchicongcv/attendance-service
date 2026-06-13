using Microsoft.EntityFrameworkCore;
using Attendance.API.Models.Entities;

namespace Attendance.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<OvertimeRecord> OvertimeRecords => Set<OvertimeRecord>();
    public DbSet<Holiday> Holidays => Set<Holiday>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasIndex(e => e.EmployeeId);
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasIndex(e => e.EmployeeId);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<OvertimeRecord>(entity =>
        {
            entity.HasIndex(e => e.EmployeeId);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<Holiday>(entity =>
        {
            entity.HasIndex(e => e.Date);
        });
    }
}
