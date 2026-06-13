using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Attendance.API.Models.DTOs;
using Attendance.API.Models.Requests;

namespace Attendance.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _db;

    public HolidaysController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<HolidayDto>>> GetAll([FromQuery] int? year)
    {
        var query = _db.Holidays.AsQueryable();

        if (year.HasValue)
            query = query.Where(h => h.Date.Year == year.Value || h.IsRecurring);

        var holidays = await query.OrderBy(h => h.Date).ToListAsync();
        return holidays.Select(MapToDto).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HolidayDto>> GetById(Guid id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null) return NotFound();
        return MapToDto(holiday);
    }

    [HttpPost]
    public async Task<ActionResult<HolidayDto>> Create(CreateHolidayRequest request)
    {
        var holiday = new Holiday
        {
            HolidayName = request.HolidayName,
            Date = request.Date,
            IsRecurring = request.IsRecurring,
            Description = request.Description
        };

        _db.Holidays.Add(holiday);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = holiday.Id }, MapToDto(holiday));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<HolidayDto>> Update(Guid id, UpdateHolidayRequest request)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null) return NotFound();

        if (request.HolidayName != null)
            holiday.HolidayName = request.HolidayName;
        if (request.Date.HasValue)
            holiday.Date = request.Date.Value;
        if (request.IsRecurring.HasValue)
            holiday.IsRecurring = request.IsRecurring.Value;
        if (request.Description != null)
            holiday.Description = request.Description;

        holiday.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapToDto(holiday);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var holiday = await _db.Holidays.FindAsync(id);
        if (holiday == null) return NotFound();

        _db.Holidays.Remove(holiday);
        await _db.SaveChangesAsync();
        return Ok();
    }

    private static HolidayDto MapToDto(Holiday h) => new()
    {
        Id = h.Id,
        HolidayName = h.HolidayName,
        Date = h.Date,
        IsRecurring = h.IsRecurring,
        Description = h.Description
    };
}
