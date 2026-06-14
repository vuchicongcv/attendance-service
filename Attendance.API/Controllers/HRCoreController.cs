using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Attendance.API.Services;

namespace Attendance.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HRCoreController : ControllerBase
{
    private readonly HRCoreService _hr;

    public HRCoreController(HRCoreService hr) => _hr = hr;

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        try
        {
            var synced = await _hr.SyncEmployeesAsync();
            return Ok(new { message = $"Synced {synced.Count} employees", count = synced.Count });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Sync failed", error = ex.Message });
        }
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees()
    {
        var employees = await _hr.GetAllEmployeesAsync();
        return Ok(employees);
    }
}
