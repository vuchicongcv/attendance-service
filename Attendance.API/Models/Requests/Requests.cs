namespace Attendance.API.Models.Requests;

public class CheckInRequest
{
    public Guid EmployeeId { get; set; }
    public DateTime CheckIn { get; set; }
    public string? Note { get; set; }
}

public class CheckOutRequest
{
    public DateTime CheckOut { get; set; }
    public string? Note { get; set; }
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
