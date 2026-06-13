using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Attendance.API.Models.Entities;

[Table("Holidays")]
public class Holiday
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string HolidayName { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public bool IsRecurring { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
