namespace Attendance.API.Models.DTOs;

public class AttendanceRecordDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime Date { get; set; }
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public double? WorkedHours { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AttendanceSummaryDto
{
    public int TotalRecords { get; set; }
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
    public int HalfDay { get; set; }
    public double AverageWorkedHours { get; set; }
}

public class EmployeeAttendanceSummaryDto
{
    public Guid EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public int TotalDays { get; set; }
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
    public int HalfDay { get; set; }
    public double TotalWorkedHours { get; set; }
}

public class LeaveRequestDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public double DurationDays { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OvertimeRecordDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public DateTime Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public double Hours { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class HolidayDto
{
    public Guid Id { get; set; }
    public string HolidayName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool IsRecurring { get; set; }
    public string? Description { get; set; }
}
