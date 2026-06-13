using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Attendance.API.Models.Entities;

[Table("Shifts")]
public class Shift
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string ShiftCode { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public double AllowedLateMinutes { get; set; } = 30;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
