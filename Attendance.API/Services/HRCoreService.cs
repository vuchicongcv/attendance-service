using System.Net.Http.Headers;
using System.Text.Json;
using Attendance.API.Data;
using Attendance.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Attendance.API.Services;

public class HRCoreService
{
    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private string? _cachedToken;

    public HRCoreService(HttpClient http, AppDbContext db, IConfiguration config)
    {
        _http = http;
        _db = db;
        _config = config;
    }

    private async Task<string> GetTokenAsync()
    {
        if (_cachedToken != null) return _cachedToken;

        var baseUrl = _config["HRCore:BaseUrl"] ?? "https://hrcore-production.up.railway.app";
        try 
        {
            var content = new StringContent("{\"password\":\"123456\"}", System.Text.Encoding.UTF8, "application/json");
            var response = await _http.PostAsync($"{baseUrl}/api/TestAuth/login", content);
            if (!response.IsSuccessStatusCode) return "";

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            _cachedToken = result?.GetValueOrDefault("token").GetString()
                        ?? result?.GetValueOrDefault("accessToken").GetString()
                        ?? "";

            if (!string.IsNullOrEmpty(_cachedToken))
            {
                var ttl = _config.GetValue<int>("HRCore:TokenTTLMinutes", 55);
                _ = Task.Delay(TimeSpan.FromMinutes(ttl)).ContinueWith(_ => _cachedToken = null);
            }
        }
        catch (HttpRequestException) 
        {
            return "";
        }

        return _cachedToken ?? "";
    }

    public async Task<List<EmployeeInfo>> SyncEmployeesAsync()
    {
        var baseUrl = _config["HRCore:BaseUrl"] ?? "https://hrcore-production.up.railway.app";
        var token = await GetTokenAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/Employees");
        if (!string.IsNullOrEmpty(token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var json = "";
        try 
        {
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode) return new List<EmployeeInfo>();
            json = await response.Content.ReadAsStringAsync();
        }
        catch (HttpRequestException) 
        {
            return new List<EmployeeInfo>();
        }

        var employees = JsonSerializer.Deserialize<List<JsonElement>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (employees == null) return new List<EmployeeInfo>();

        var synced = new List<EmployeeInfo>();

        foreach (var emp in employees)
        {
            var id = TryGetGuid(emp, "id");
            if (id == null) continue;

            var info = await _db.EmployeeInfo.FindAsync(id.Value);
            if (info == null)
            {
                info = new EmployeeInfo { Id = id.Value };
                _db.EmployeeInfo.Add(info);
            }

            info.EmployeeCode = GetString(emp, "employeeCode") ?? info.EmployeeCode;
            info.FullName = GetString(emp, "fullName") ?? info.FullName;
            info.Email = GetString(emp, "email") ?? info.Email;
            info.DepartmentId = TryGetGuid(emp, "departmentId");
            info.DepartmentName = GetString(emp, "departmentName");
            info.PositionId = TryGetGuid(emp, "positionId");
            info.PositionName = GetString(emp, "positionName");
            info.UpdatedAt = DateTime.UtcNow;

            synced.Add(info);
        }

        var syncedIds = synced.Select(e => e.Id).ToHashSet();
        var oldActive = await _db.EmployeeInfo.Where(e => e.IsActive && !syncedIds.Contains(e.Id)).ToListAsync();
        foreach (var emp in oldActive)
        {
            emp.IsActive = false;
            emp.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return synced;
    }

    public async Task<List<EmployeeInfo>> GetAllEmployeesAsync()
    {
        return await _db.EmployeeInfo.Where(e => e.IsActive).OrderBy(e => e.EmployeeCode).ToListAsync();
    }

    public async Task<EmployeeInfo?> GetEmployeeAsync(Guid id)
    {
        return await _db.EmployeeInfo.FindAsync(id);
    }

    public async Task<Dictionary<Guid, EmployeeInfo>> GetEmployeeMapAsync()
    {
        return await _db.EmployeeInfo.Where(e => e.IsActive).ToDictionaryAsync(e => e.Id);
    }

    private static Guid? TryGetGuid(JsonElement el, string key)
    {
        if (!el.TryGetProperty(key, out var prop) || prop.ValueKind != JsonValueKind.String)
            return null;
        return Guid.TryParse(prop.GetString(), out var id) ? id : null;
    }

    private static string? GetString(JsonElement el, string key)
    {
        return el.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;
    }
}
