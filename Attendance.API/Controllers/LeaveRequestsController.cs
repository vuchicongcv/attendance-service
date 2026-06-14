using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Attendance.API.Models.DTOs;
using Attendance.API.Models.Requests;
using Attendance.API.Services;

namespace Attendance.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeaveRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly HRCoreService _hr;

    public LeaveRequestsController(AppDbContext db, HRCoreService hr)
    {
        _db = db;
        _hr = hr;
    }

    [HttpGet]
    public async Task<ActionResult<List<LeaveRequestDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] string? status,
        [FromQuery] string? leaveType)
    {
        var query = _db.LeaveRequests.AsQueryable();
        if (employeeId.HasValue) query = query.Where(l => l.EmployeeId == employeeId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<LeaveStatus>(status, true, out var statusEnum))
            query = query.Where(l => l.Status == statusEnum);
        if (!string.IsNullOrEmpty(leaveType) && Enum.TryParse<LeaveType>(leaveType, true, out var typeEnum))
            query = query.Where(l => l.LeaveType == typeEnum);

        var requests = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
        var empMap = await _hr.GetEmployeeMapAsync();
        return requests.Select(l => MapToDto(l, empMap.GetValueOrDefault(l.EmployeeId))).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LeaveRequestDto>> GetById(Guid id)
    {
        var request = await _db.LeaveRequests.FindAsync(id);
        if (request == null) return NotFound();
        var emp = await _hr.GetEmployeeAsync(request.EmployeeId);
        return MapToDto(request, emp);
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<List<LeaveRequestDto>>> GetByEmployee(Guid employeeId)
    {
        var requests = await _db.LeaveRequests
            .Where(l => l.EmployeeId == employeeId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
        var emp = await _hr.GetEmployeeAsync(employeeId);
        return requests.Select(l => MapToDto(l, emp)).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<LeaveRequestDto>> Create(CreateLeaveRequest request)
    {
        var emp = await _hr.GetEmployeeAsync(request.EmployeeId);
        if (emp == null)
            return BadRequest(new { message = "Employee not found" });

        if (!Enum.TryParse<LeaveType>(request.LeaveType, true, out var leaveType))
            return BadRequest(new { message = $"Invalid leave type: {request.LeaveType}" });

        if (request.StartDate >= request.EndDate)
            return BadRequest(new { message = "End date must be after start date" });

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = request.EmployeeId,
            LeaveType = leaveType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason
        };

        _db.LeaveRequests.Add(leaveRequest);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = leaveRequest.Id }, MapToDto(leaveRequest, emp));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<LeaveRequestDto>> Update(Guid id, UpdateLeaveRequest request)
    {
        var leaveRequest = await _db.LeaveRequests.FindAsync(id);
        if (leaveRequest == null) return NotFound();

        if (request.LeaveType != null && Enum.TryParse<LeaveType>(request.LeaveType, true, out var leaveType))
            leaveRequest.LeaveType = leaveType;
        if (request.StartDate.HasValue) leaveRequest.StartDate = request.StartDate.Value;
        if (request.EndDate.HasValue) leaveRequest.EndDate = request.EndDate.Value;
        if (request.Reason != null) leaveRequest.Reason = request.Reason;
        leaveRequest.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var emp = await _hr.GetEmployeeAsync(leaveRequest.EmployeeId);
        return MapToDto(leaveRequest, emp);
    }

    [HttpPatch("{id}/approve")]
    public async Task<ActionResult<LeaveRequestDto>> Approve(Guid id, ApproveLeaveRequest request)
    {
        var leaveRequest = await _db.LeaveRequests.FindAsync(id);
        if (leaveRequest == null) return NotFound();

        if (!Enum.TryParse<LeaveStatus>(request.Status, true, out var status))
            return BadRequest(new { message = $"Invalid status: {request.Status}" });

        leaveRequest.Status = status;
        leaveRequest.ApprovedDate = DateTime.UtcNow;
        leaveRequest.RejectionReason = request.RejectionReason;
        leaveRequest.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var emp = await _hr.GetEmployeeAsync(leaveRequest.EmployeeId);
        return MapToDto(leaveRequest, emp);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var leaveRequest = await _db.LeaveRequests.FindAsync(id);
        if (leaveRequest == null) return NotFound();
        _db.LeaveRequests.Remove(leaveRequest);
        await _db.SaveChangesAsync();
        return Ok();
    }

    private static LeaveRequestDto MapToDto(LeaveRequest l, EmployeeInfo? emp) => new()
    {
        Id = l.Id,
        EmployeeId = l.EmployeeId,
        EmployeeCode = emp?.EmployeeCode,
        EmployeeName = emp?.FullName,
        LeaveType = l.LeaveType.ToString(),
        StartDate = l.StartDate,
        EndDate = l.EndDate,
        DurationDays = (l.EndDate - l.StartDate).TotalDays + 1,
        Reason = l.Reason,
        Status = l.Status.ToString(),
        ApprovedBy = l.ApprovedBy,
        ApprovedDate = l.ApprovedDate,
        RejectionReason = l.RejectionReason,
        CreatedAt = l.CreatedAt
    };
}
