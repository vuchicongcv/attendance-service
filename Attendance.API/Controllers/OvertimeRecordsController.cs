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
public class OvertimeRecordsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly HRCoreService _hr;

    public OvertimeRecordsController(AppDbContext db, HRCoreService hr)
    {
        _db = db;
        _hr = hr;
    }

    [HttpGet]
    public async Task<ActionResult<List<OvertimeRecordDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] string? status)
    {
        var query = _db.OvertimeRecords.AsQueryable();
        if (employeeId.HasValue) query = query.Where(o => o.EmployeeId == employeeId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OvertimeStatus>(status, true, out var statusEnum))
            query = query.Where(o => o.Status == statusEnum);

        var records = await query.OrderByDescending(o => o.Date).ToListAsync();
        var empMap = await _hr.GetEmployeeMapAsync();
        return records.Select(o => MapToDto(o, empMap.GetValueOrDefault(o.EmployeeId))).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OvertimeRecordDto>> GetById(Guid id)
    {
        var record = await _db.OvertimeRecords.FindAsync(id);
        if (record == null) return NotFound();
        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<List<OvertimeRecordDto>>> GetByEmployee(Guid employeeId)
    {
        var records = await _db.OvertimeRecords
            .Where(o => o.EmployeeId == employeeId)
            .OrderByDescending(o => o.Date)
            .ToListAsync();
        var emp = await _hr.GetEmployeeAsync(employeeId);
        return records.Select(o => MapToDto(o, emp)).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<OvertimeRecordDto>> Create(CreateOvertimeRequest request)
    {
        var emp = await _hr.GetEmployeeAsync(request.EmployeeId);
        if (emp == null)
            return BadRequest(new { message = "Employee not found" });

        var hours = (request.EndTime - request.StartTime).TotalHours;
        if (hours <= 0)
            return BadRequest(new { message = "End time must be after start time" });

        var record = new OvertimeRecord
        {
            EmployeeId = request.EmployeeId,
            Date = request.Date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Hours = Math.Round(hours, 2),
            Reason = request.Reason
        };

        _db.OvertimeRecords.Add(record);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = record.Id }, MapToDto(record, emp));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OvertimeRecordDto>> Update(Guid id, UpdateOvertimeRequest request)
    {
        var record = await _db.OvertimeRecords.FindAsync(id);
        if (record == null) return NotFound();

        if (request.StartTime.HasValue) record.StartTime = request.StartTime.Value;
        if (request.EndTime.HasValue) record.EndTime = request.EndTime.Value;
        if (request.Reason != null) record.Reason = request.Reason;

        record.Hours = Math.Round((record.EndTime - record.StartTime).TotalHours, 2);
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpPatch("{id}/approve")]
    public async Task<ActionResult<OvertimeRecordDto>> Approve(Guid id, ApproveOvertimeRequest request)
    {
        var record = await _db.OvertimeRecords.FindAsync(id);
        if (record == null) return NotFound();

        if (!Enum.TryParse<OvertimeStatus>(request.Status, true, out var status))
            return BadRequest(new { message = $"Invalid status: {request.Status}" });

        record.Status = status;
        record.ApprovedDate = DateTime.UtcNow;
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var record = await _db.OvertimeRecords.FindAsync(id);
        if (record == null) return NotFound();
        _db.OvertimeRecords.Remove(record);
        await _db.SaveChangesAsync();
        return Ok();
    }

    private static OvertimeRecordDto MapToDto(OvertimeRecord o, EmployeeInfo? emp) => new()
    {
        Id = o.Id,
        EmployeeId = o.EmployeeId,
        EmployeeCode = emp?.EmployeeCode,
        EmployeeName = emp?.FullName,
        Date = o.Date,
        StartTime = o.StartTime,
        EndTime = o.EndTime,
        Hours = o.Hours,
        Reason = o.Reason,
        Status = o.Status.ToString(),
        CreatedAt = o.CreatedAt
    };
}
