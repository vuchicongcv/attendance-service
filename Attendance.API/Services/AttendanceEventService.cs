namespace Attendance.API.Services;

public class AttendanceEventService
{
    private readonly ILogger<AttendanceEventService> _logger;

    public AttendanceEventService(ILogger<AttendanceEventService> logger)
    {
        _logger = logger;
    }

    public event Action<MonthlyCloseEventArgs>? OnMonthlyClosed;

    public async Task PublishMonthlyClosedAsync(int year, int month)
    {
        var args = new MonthlyCloseEventArgs
        {
            Year = year,
            Month = month,
            ClosedAt = DateTime.UtcNow,
            EventName = "attendance.monthly.closed"
        };

        _logger.LogInformation(
            "Publishing event: {EventName} for {Year}-{Month:D2} at {Time}",
            args.EventName, year, month, args.ClosedAt);

        OnMonthlyClosed?.Invoke(args);

        await Task.CompletedTask;
    }
}

public class MonthlyCloseEventArgs
{
    public string EventName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public DateTime ClosedAt { get; set; }
    public int TotalRecords { get; set; }
    public int TotalHours { get; set; }
}
