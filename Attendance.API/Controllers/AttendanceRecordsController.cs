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
public class AttendanceRecordsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly HRCoreService _hr;

    public AttendanceRecordsController(AppDbContext db, HRCoreService hr)
    {
        _db = db;
        _hr = hr;
    }

    [HttpGet]
    public async Task<ActionResult<List<AttendanceRecordDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status)
    {
        var query = _db.AttendanceRecords.AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(a => a.EmployeeId == employeeId.Value);
        if (fromDate.HasValue)
            query = query.Where(a => a.Date >= fromDate.Value);
        if (toDate.HasValue)
            query = query.Where(a => a.Date <= toDate.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<AttendanceStatus>(status, true, out var statusEnum))
            query = query.Where(a => a.Status == statusEnum);

        var records = await query.OrderByDescending(a => a.Date).ThenByDescending(a => a.CreatedAt).ToListAsync();
        var empMap = await _hr.GetEmployeeMapAsync();

        return records.Select(r => MapToDto(r, empMap.GetValueOrDefault(r.EmployeeId))).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> GetById(Guid id)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpGet("employee/{employeeId}/today")]
    public async Task<ActionResult<AttendanceRecordDto>> GetToday(Guid employeeId)
    {
        var today = DateTime.UtcNow.Date;
        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == today);
        if (record == null) return NotFound();

        var emp = await _hr.GetEmployeeAsync(employeeId);
        return MapToDto(record, emp);
    }

    [HttpGet("employee/{employeeId}/history")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> GetHistory(
        Guid employeeId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var query = _db.AttendanceRecords.Where(a => a.EmployeeId == employeeId);
        if (fromDate.HasValue) query = query.Where(a => a.Date >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(a => a.Date <= toDate.Value);

        var records = await query.OrderByDescending(a => a.Date).ToListAsync();
        var emp = await _hr.GetEmployeeAsync(employeeId);

        return records.Select(r => MapToDto(r, emp)).ToList();
    }

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckIn(CheckInRequest request)
    {
        var emp = await _hr.GetEmployeeAsync(request.EmployeeId);
        if (emp == null)
            return BadRequest(new { message = "Employee not found. Sync employees from HRCore first." });

        var today = request.CheckIn.Date;
        var existing = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today);

        if (existing != null)
            return Conflict(new { message = $"Already checked in at {existing.CheckIn:HH:mm:ss}" });

        var lateThreshold = new TimeSpan(8, 31, 0);
        var status = request.CheckIn.TimeOfDay > lateThreshold
            ? AttendanceStatus.Late
            : AttendanceStatus.Present;

        var record = new AttendanceRecord
        {
            EmployeeId = request.EmployeeId,
            Date = today,
            CheckIn = request.CheckIn,
            Status = status,
            Note = request.Note
        };

        _db.AttendanceRecords.Add(record);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = record.Id }, MapToDto(record, emp));
    }

    [HttpPatch("{id}/check-out")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckOut(Guid id, CheckOutRequest request)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();
        if (record.CheckOut.HasValue)
            return Conflict(new { message = "Already checked out" });

        record.CheckOut = request.CheckOut;
        record.UpdatedAt = DateTime.UtcNow;

        if (request.Note != null)
            record.Note = request.Note;

        if (record.CheckIn.HasValue)
        {
            var workedHours = (record.CheckOut.Value - record.CheckIn.Value).TotalHours;
            if (workedHours < 4)
                record.Status = AttendanceStatus.HalfDay;
        }

        await _db.SaveChangesAsync();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> Update(Guid id, UpdateAttendanceRequest request)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        if (request.CheckIn.HasValue) record.CheckIn = request.CheckIn;
        if (request.CheckOut.HasValue) record.CheckOut = request.CheckOut;
        if (request.Status != null)
        {
            if (Enum.TryParse<AttendanceStatus>(request.Status, true, out var s))
                record.Status = s;
        }
        if (request.Note != null)
            record.Note = request.Note;

        record.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        return MapToDto(record, emp);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        _db.AttendanceRecords.Remove(record);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<AttendanceSummaryDto>> GetSummary(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var query = _db.AttendanceRecords.AsQueryable();

        var from = fromDate ?? DateTime.UtcNow.AddDays(-30).Date;
        var to = toDate ?? DateTime.UtcNow.Date;

        query = query.Where(a => a.Date >= from && a.Date <= to);
        var records = await query.ToListAsync();

        return new AttendanceSummaryDto
        {
            TotalRecords = records.Count,
            Present = records.Count(r => r.Status == AttendanceStatus.Present),
            Late = records.Count(r => r.Status == AttendanceStatus.Late),
            Absent = records.Count(r => r.Status == AttendanceStatus.Absent),
            HalfDay = records.Count(r => r.Status == AttendanceStatus.HalfDay),
            AverageWorkedHours = records.Where(r => r.CheckIn.HasValue && r.CheckOut.HasValue)
                .Select(r => (r.CheckOut!.Value - r.CheckIn!.Value).TotalHours)
                .DefaultIfEmpty(0).Average()
        };
    }

    [HttpGet("summary/by-employee")]
    public async Task<ActionResult<List<EmployeeAttendanceSummaryDto>>> GetSummaryByEmployee(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var from = fromDate ?? DateTime.UtcNow.AddMonths(-1).Date;
        var to = toDate ?? DateTime.UtcNow.Date;

        var records = await _db.AttendanceRecords
            .Where(a => a.Date >= from && a.Date <= to)
            .ToListAsync();

        var empMap = await _hr.GetEmployeeMapAsync();
        var empIds = records.Select(r => r.EmployeeId).Distinct();

        return empIds.Select(id =>
        {
            var emp = empMap.GetValueOrDefault(id);
            var empRecords = records.Where(r => r.EmployeeId == id).ToList();
            return new EmployeeAttendanceSummaryDto
            {
                EmployeeId = id,
                EmployeeCode = emp?.EmployeeCode,
                EmployeeName = emp?.FullName,
                DepartmentName = emp?.DepartmentName,
                TotalDays = empRecords.Count,
                Present = empRecords.Count(r => r.Status == AttendanceStatus.Present),
                Late = empRecords.Count(r => r.Status == AttendanceStatus.Late),
                Absent = empRecords.Count(r => r.Status == AttendanceStatus.Absent),
                HalfDay = empRecords.Count(r => r.Status == AttendanceStatus.HalfDay),
                TotalWorkedHours = empRecords.Where(r => r.CheckIn.HasValue && r.CheckOut.HasValue)
                    .Sum(r => (r.CheckOut!.Value - r.CheckIn!.Value).TotalHours)
            };
        }).OrderByDescending(s => s.TotalDays).ToList();
    }

    private static AttendanceRecordDto MapToDto(AttendanceRecord r, EmployeeInfo? emp) => new()
    {
        Id = r.Id,
        EmployeeId = r.EmployeeId,
        EmployeeCode = emp?.EmployeeCode,
        EmployeeName = emp?.FullName,
        DepartmentName = emp?.DepartmentName,
        Date = r.Date,
        CheckIn = r.CheckIn,
        CheckOut = r.CheckOut,
        Status = r.Status.ToString(),
        Note = r.Note,
        WorkedHours = r.CheckIn.HasValue && r.CheckOut.HasValue
            ? Math.Round((r.CheckOut.Value - r.CheckIn.Value).TotalHours, 2)
            : null,
        CreatedAt = r.CreatedAt
    };
}
