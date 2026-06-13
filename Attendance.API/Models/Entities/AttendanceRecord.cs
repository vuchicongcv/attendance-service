using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Attendance.API.Models.Entities;

public enum AttendanceStatus
{
    Present = 0,
    Late = 1,
    Absent = 2,
    HalfDay = 3
}

[Table("AttendanceRecords")]
public class AttendanceRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public DateTime Date { get; set; }

    public Guid? ShiftId { get; set; }

    public DateTime? CheckIn { get; set; }

    public DateTime? CheckOut { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
