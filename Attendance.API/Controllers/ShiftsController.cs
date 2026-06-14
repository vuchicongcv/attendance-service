using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Attendance.API.Models.DTOs;
using Attendance.API.Models.Requests;

namespace Attendance.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShiftsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ShiftsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ShiftDto>>> GetAll([FromQuery] bool? isActive)
    {
        var query = _db.Shifts.AsQueryable();
        if (isActive.HasValue) query = query.Where(s => s.IsActive == isActive.Value);
        var shifts = await query.OrderBy(s => s.StartTime).ToListAsync();
        return shifts.Select(MapToDto).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ShiftDto>> GetById(Guid id)
    {
        var shift = await _db.Shifts.FindAsync(id);
        if (shift == null) return NotFound();
        return MapToDto(shift);
    }

    [HttpPost]
    public async Task<ActionResult<ShiftDto>> Create(CreateShiftRequest request)
    {
        if (!TimeSpan.TryParse(request.StartTime, out var startTime))
            return BadRequest(new { message = "Invalid StartTime format. Use HH:mm" });
        if (!TimeSpan.TryParse(request.EndTime, out var endTime))
            return BadRequest(new { message = "Invalid EndTime format. Use HH:mm" });

        if (startTime >= endTime)
            return BadRequest(new { message = "EndTime must be after StartTime" });

        var existing = await _db.Shifts.AnyAsync(s => s.ShiftCode == request.ShiftCode);
        if (existing)
            return Conflict(new { message = $"Shift code '{request.ShiftCode}' already exists" });

        var shift = new Shift
        {
            ShiftCode = request.ShiftCode,
            ShiftName = request.ShiftName,
            StartTime = startTime,
            EndTime = endTime,
            AllowedLateMinutes = request.AllowedLateMinutes,
            Description = request.Description
        };

        _db.Shifts.Add(shift);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = shift.Id }, MapToDto(shift));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ShiftDto>> Update(Guid id, UpdateShiftRequest request)
    {
        var shift = await _db.Shifts.FindAsync(id);
        if (shift == null) return NotFound();

        if (request.ShiftName != null) shift.ShiftName = request.ShiftName;
        if (request.StartTime != null && TimeSpan.TryParse(request.StartTime, out var startTime))
            shift.StartTime = startTime;
        if (request.EndTime != null && TimeSpan.TryParse(request.EndTime, out var endTime))
            shift.EndTime = endTime;
        if (request.AllowedLateMinutes.HasValue)
            shift.AllowedLateMinutes = request.AllowedLateMinutes.Value;
        if (request.Description != null) shift.Description = request.Description;
        if (request.IsActive.HasValue) shift.IsActive = request.IsActive.Value;

        shift.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapToDto(shift);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var shift = await _db.Shifts.FindAsync(id);
        if (shift == null) return NotFound();
        _db.Shifts.Remove(shift);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        if (await _db.Shifts.AnyAsync())
            return BadRequest(new { message = "Shifts already seeded" });

        var shifts = new[]
        {
            new Shift { ShiftCode = "MORNING",   ShiftName = "Ca sáng",   StartTime = new TimeSpan(6, 0, 0),  EndTime = new TimeSpan(14, 0, 0),  AllowedLateMinutes = 30, Description = "06:00 - 14:00" },
            new Shift { ShiftCode = "AFTERNOON", ShiftName = "Ca chiều",  StartTime = new TimeSpan(14, 0, 0), EndTime = new TimeSpan(22, 0, 0), AllowedLateMinutes = 30, Description = "14:00 - 22:00" },
            new Shift { ShiftCode = "NIGHT",     ShiftName = "Ca đêm",    StartTime = new TimeSpan(22, 0, 0), EndTime = new TimeSpan(6, 0, 0),  AllowedLateMinutes = 30, Description = "22:00 - 06:00" },
            new Shift { ShiftCode = "HALF_MORN", ShiftName = "Nửa sáng",  StartTime = new TimeSpan(6, 0, 0),  EndTime = new TimeSpan(12, 0, 0), AllowedLateMinutes = 15, Description = "06:00 - 12:00" },
            new Shift { ShiftCode = "HALF_AFT",  ShiftName = "Nửa chiều", StartTime = new TimeSpan(12, 0, 0), EndTime = new TimeSpan(18, 0, 0), AllowedLateMinutes = 15, Description = "12:00 - 18:00" },
        };

        _db.Shifts.AddRange(shifts);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Seeded 5 shifts", shifts = shifts.Select(s => new { s.ShiftCode, s.ShiftName }).ToList() });
    }

    private static ShiftDto MapToDto(Shift s) => new()
    {
        Id = s.Id,
        ShiftCode = s.ShiftCode,
        ShiftName = s.ShiftName,
        StartTime = s.StartTime.ToString(@"hh\:mm"),
        EndTime = s.EndTime.ToString(@"hh\:mm"),
        AllowedLateMinutes = s.AllowedLateMinutes,
        Description = s.Description,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt
    };
}
