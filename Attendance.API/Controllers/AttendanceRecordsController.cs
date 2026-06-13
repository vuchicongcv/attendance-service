using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Attendance.API.Models.DTOs;
using Attendance.API.Models.Requests;

namespace Attendance.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttendanceRecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AttendanceRecordsController(AppDbContext db) => _db = db;

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

        var records = await query.OrderByDescending(a => a.Date).ToListAsync();
        return records.Select(MapToDto).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> GetById(Guid id)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();
        return MapToDto(record);
    }

    [HttpGet("employee/{employeeId}/today")]
    public async Task<ActionResult<AttendanceRecordDto>> GetToday(Guid employeeId)
    {
        var today = DateTime.UtcNow.Date;
        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == today);
        if (record == null) return NotFound();
        return MapToDto(record);
    }

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckIn(CheckInRequest request)
    {
        var today = request.CheckIn.Date;
        var existing = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today);

        if (existing != null)
            return Conflict(new { message = "Already checked in today" });

        var status = request.CheckIn.TimeOfDay > new TimeSpan(8, 30, 0)
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

        return CreatedAtAction(nameof(GetById), new { id = record.Id }, MapToDto(record));
    }

    [HttpPatch("{id}/check-out")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckOut(Guid id, CheckOutRequest request)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        record.CheckOut = request.CheckOut;
        record.UpdatedAt = DateTime.UtcNow;

        if (request.Note != null)
            record.Note = request.Note;

        var workedHours = (record.CheckOut.Value - record.CheckIn!.Value).TotalHours;
        if (workedHours < 4)
            record.Status = AttendanceStatus.HalfDay;

        await _db.SaveChangesAsync();
        return MapToDto(record);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> Update(Guid id, CheckOutRequest request)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        if (request.Note != null)
            record.Note = request.Note;
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(record);
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

    private static AttendanceRecordDto MapToDto(AttendanceRecord r) => new()
    {
        Id = r.Id,
        EmployeeId = r.EmployeeId,
        Date = r.Date,
        CheckIn = r.CheckIn,
        CheckOut = r.CheckOut,
        Status = r.Status.ToString(),
        Note = r.Note,
        CreatedAt = r.CreatedAt
    };
}
