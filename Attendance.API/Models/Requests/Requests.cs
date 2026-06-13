using Microsoft.AspNetCore.Mvc;

namespace Attendance.API.Models.Requests;

public class CheckInRequest
{
    public Guid EmployeeId { get; set; }
    public DateTime CheckIn { get; set; }
    public Guid? ShiftId { get; set; }
    public string? Note { get; set; }
}

public class CheckOutRequest
{
    public DateTime CheckOut { get; set; }
    public string? Note { get; set; }
}

public class UpdateAttendanceRequest
{
    public Guid? ShiftId { get; set; }
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public string? Status { get; set; }
    public string? Note { get; set; }
}

public class CreateShiftRequest
{
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = "08:00";
    public string EndTime { get; set; } = "17:00";
    public double AllowedLateMinutes { get; set; } = 30;
    public string? Description { get; set; }
}

public class UpdateShiftRequest
{
    public string? ShiftName { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public double? AllowedLateMinutes { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class CreateLeaveRequest
{
    public Guid EmployeeId { get; set; }
    public string LeaveType { get; set; } = "Annual";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}

public class UpdateLeaveRequest
{
    public string? LeaveType { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Reason { get; set; }
}

public class ApproveLeaveRequest
{
    public string Status { get; set; } = "Approved";
    public string? RejectionReason { get; set; }
}

public class CreateOvertimeRequest
{
    public Guid EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Reason { get; set; }
}

public class UpdateOvertimeRequest
{
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Reason { get; set; }
}

public class ApproveOvertimeRequest
{
    public string Status { get; set; } = "Approved";
}

public class CreateHolidayRequest
{
    public string HolidayName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool IsRecurring { get; set; }
    public string? Description { get; set; }
}

public class UpdateHolidayRequest
{
    public string? HolidayName { get; set; }
    public DateTime? Date { get; set; }
    public bool? IsRecurring { get; set; }
    public string? Description { get; set; }
}
