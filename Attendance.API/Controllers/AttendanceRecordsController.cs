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
public class AttendanceRecordsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly HRCoreService _hr;
    private readonly AttendanceEventService _events;

    public AttendanceRecordsController(AppDbContext db, HRCoreService hr, AttendanceEventService events)
    {
        _db = db;
        _hr = hr;
        _events = events;
    }

    private static readonly TimeZoneInfo VnTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh");

    private DateTime GetVnTime(DateTime date) => TimeZoneInfo.ConvertTimeFromUtc(date.Kind == DateTimeKind.Utc ? date : date.ToUniversalTime(), VnTimeZone);

    private Guid? GetJwtEmployeeId()
    {
        var claim = User.FindFirst("EmployeeId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AttendanceRecordDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AttendanceRecords.AsQueryable();

        if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);
        if (fromDate.HasValue) query = query.Where(a => a.Date >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(a => a.Date <= toDate.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<AttendanceStatus>(status, true, out var statusEnum))
            query = query.Where(a => a.Status == statusEnum);

        var totalCount = await query.CountAsync();
        var records = await query.OrderByDescending(a => a.Date).ThenByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var empMap = await _hr.GetEmployeeMapAsync();
        var shifts = await _db.Shifts.ToDictionaryAsync(s => s.Id);

        return new PagedResult<AttendanceRecordDto>
        {
            Items = records.Select(r => MapToDto(r, empMap.GetValueOrDefault(r.EmployeeId), shifts.GetValueOrDefault(r.ShiftId ?? Guid.Empty))),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> GetById(Guid id)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        var shift = record.ShiftId.HasValue ? await _db.Shifts.FindAsync(record.ShiftId.Value) : null;
        return MapToDto(record, emp, shift);
    }

    [HttpGet("employee/{employeeId}/today")]
    public async Task<ActionResult<AttendanceRecordDto>> GetToday(Guid employeeId)
    {
        var today = GetVnTime(DateTime.UtcNow).Date;
        var record = await _db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == today);
        if (record == null) return NotFound();

        var emp = await _hr.GetEmployeeAsync(employeeId);
        var shift = record.ShiftId.HasValue ? await _db.Shifts.FindAsync(record.ShiftId.Value) : null;
        return MapToDto(record, emp, shift);
    }

    [HttpGet("employee/{employeeId}/history")]
    public async Task<ActionResult<PagedResult<AttendanceRecordDto>>> GetHistory(
        Guid employeeId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AttendanceRecords.Where(a => a.EmployeeId == employeeId);
        if (fromDate.HasValue) query = query.Where(a => a.Date >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(a => a.Date <= toDate.Value);

        var totalCount = await query.CountAsync();
        var records = await query.OrderByDescending(a => a.Date)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var emp = await _hr.GetEmployeeAsync(employeeId);
        var shifts = await _db.Shifts.ToDictionaryAsync(s => s.Id);

        return new PagedResult<AttendanceRecordDto>
        {
            Items = records.Select(r => MapToDto(r, emp, shifts.GetValueOrDefault(r.ShiftId ?? Guid.Empty))),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    [HttpPost("check-in")]
    public async Task<ActionResult<AttendanceRecordDto>> CheckIn(CheckInRequest request)
    {
        try
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var jwtEmpId = GetJwtEmployeeId();
            if (userRole == "Employee" && jwtEmpId.HasValue && request.EmployeeId != jwtEmpId)
                return StatusCode(403, new { message = "Employees can only check in for themselves." });

            var emp = await _hr.GetEmployeeAsync(request.EmployeeId);
            if (emp == null)
                return BadRequest(new { message = "Employee not found. Sync employees from HRCore first." });

            var today = GetVnTime(request.CheckIn).Date;
            var existing = await _db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today);

            Shift? shift = null;
            if (request.ShiftId.HasValue)
                shift = await _db.Shifts.FindAsync(request.ShiftId.Value);

            if (existing != null)
                return Ok(MapToDto(existing, emp, shift));

            var lateThreshold = shift != null
                ? shift.StartTime.Add(TimeSpan.FromMinutes(shift.AllowedLateMinutes))
                : new TimeSpan(8, 31, 0);

            var checkInTime = request.CheckIn.TimeOfDay;
            var status = checkInTime > lateThreshold
                ? AttendanceStatus.Late
                : AttendanceStatus.Present;

            var record = new AttendanceRecord
            {
                EmployeeId = request.EmployeeId,
                Date = today,
                ShiftId = request.ShiftId,
                CheckIn = request.CheckIn,
                Status = status,
                Note = request.Note
            };

            try
            {
                _db.AttendanceRecords.Add(record);
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = $"Already checked in for {today:yyyy-MM-dd}" });
            }

            return CreatedAtAction(nameof(GetById), new { id = record.Id }, MapToDto(record, emp, shift));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "CheckIn crashed", error = ex.ToString() });
        }
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
        if (request.Note != null) record.Note = request.Note;

        if (record.CheckIn.HasValue)
        {
            var workedHours = (record.CheckOut.Value - record.CheckIn.Value).TotalHours;
            if (workedHours < 4)
                record.Status = AttendanceStatus.HalfDay;
        }

        await _db.SaveChangesAsync();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        var shift = record.ShiftId.HasValue ? await _db.Shifts.FindAsync(record.ShiftId.Value) : null;
        return MapToDto(record, emp, shift);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AttendanceRecordDto>> Update(Guid id, UpdateAttendanceRequest request)
    {
        var record = await _db.AttendanceRecords.FindAsync(id);
        if (record == null) return NotFound();

        if (request.ShiftId.HasValue) record.ShiftId = request.ShiftId;
        if (request.CheckIn.HasValue) record.CheckIn = request.CheckIn;
        if (request.CheckOut.HasValue) record.CheckOut = request.CheckOut;
        if (request.Status != null && Enum.TryParse<AttendanceStatus>(request.Status, true, out var s))
            record.Status = s;
        if (request.Note != null) record.Note = request.Note;
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var emp = await _hr.GetEmployeeAsync(record.EmployeeId);
        var shift = record.ShiftId.HasValue ? await _db.Shifts.FindAsync(record.ShiftId.Value) : null;
        return MapToDto(record, emp, shift);
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

    [HttpPost("monthly-close/{year}/{month}")]
    public async Task<IActionResult> MonthlyClose(int year, int month)
    {
        var start = new DateTime(year, month, 1);
        var end = start.AddMonths(1).AddDays(-1);

        var existingClose = await _db.AttendanceRecords.AnyAsync(a => a.Date >= start && a.Date <= end && a.IsClosed);
        if (existingClose)
            return Conflict(new { message = $"Tháng {month}/{year} đã được đóng bảng chấm công từ trước." });

        var records = await _db.AttendanceRecords
            .Where(a => a.Date >= start && a.Date <= end)
            .ToListAsync();

        records.ForEach(r => r.IsClosed = true);
        await _db.SaveChangesAsync();

        await _events.PublishMonthlyClosedAsync(year, month);

        return Ok(new
        {
            message = $"Monthly close event published for {year}-{month:D2}",
            eventName = "attendance.monthly.closed",
            totalRecords = records.Count
        });
    }

    private static AttendanceRecordDto MapToDto(AttendanceRecord r, EmployeeInfo? emp, Shift? shift) => new()
    {
        Id = r.Id,
        EmployeeId = r.EmployeeId,
        EmployeeCode = emp?.EmployeeCode,
        EmployeeName = emp?.FullName,
        DepartmentName = emp?.DepartmentName,
        Date = r.Date,
        ShiftId = r.ShiftId,
        ShiftName = shift?.ShiftName,
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
