using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Attendance.API.Models.Entities;

public enum OvertimeStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}

[Table("OvertimeRecords")]
public class OvertimeRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }

    public DateTime Date { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public double Hours { get; set; }

    public string? Reason { get; set; }

    public OvertimeStatus Status { get; set; } = OvertimeStatus.Pending;

    public Guid? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
