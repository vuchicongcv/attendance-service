using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Attendance.API.Models.DTOs;
using Attendance.API.Models.Requests;
using Attendance.API.Services;
using Attendance.API.DTOs;

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
    public async Task<ActionResult<PagedResult<OvertimeRecordDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.OvertimeRecords.AsQueryable();
        if (employeeId.HasValue) query = query.Where(o => o.EmployeeId == employeeId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OvertimeStatus>(status, true, out var statusEnum))
            query = query.Where(o => o.Status == statusEnum);

        var totalCount = await query.CountAsync();
        var records = await query.OrderByDescending(o => o.Date)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var empMap = await _hr.GetEmployeeMapAsync();
        return new PagedResult<OvertimeRecordDto>
        {
            Items = records.Select(o => MapToDto(o, empMap.GetValueOrDefault(o.EmployeeId))),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
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
    public async Task<ActionResult<PagedResult<OvertimeRecordDto>>> GetByEmployee(
        Guid employeeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.OvertimeRecords.Where(o => o.EmployeeId == employeeId);
        var totalCount = await query.CountAsync();
        var records = await query.OrderByDescending(o => o.Date)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var emp = await _hr.GetEmployeeAsync(employeeId);
        return new PagedResult<OvertimeRecordDto>
        {
            Items = records.Select(o => MapToDto(o, emp)),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
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

        var overlap = await _db.OvertimeRecords.AnyAsync(o => 
            o.EmployeeId == request.EmployeeId &&
            o.Date == request.Date &&
            o.StartTime < request.EndTime && 
            o.EndTime > request.StartTime);
            
        if (overlap)
            return BadRequest(new { message = "Overtime overlaps with an existing record" });

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
