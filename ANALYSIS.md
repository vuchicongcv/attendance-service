# Phân Tích Hệ Thống Attendance Service

## Tổng Quan Kiến Trúc

Hệ thống gồm 2 thành phần chính:

```
attendance-service/
├── Attendance.API/          # Backend API (ASP.NET Core 10.0, C#)
│   ├── Controllers/         # 7 controllers xử lý request
│   ├── Services/            # 2 services xử lý business logic
│   ├── Models/              # Entities, DTOs, Request models
│   ├── Data/                # DbContext + Migrations
│   └── Program.cs           # Cấu hình middleware pipeline
│
├── Attendance.Frontend/     # Frontend SPA (HTML + JS thuần)
│   ├── index.html           # Single page application
│   └── vercel.json          # Deploy config
│
└── test.js / test.csx       # File test thủ công
```

**Công nghệ:**
- **Backend:** .NET 10.0, PostgreSQL (Npgsql), EF Core, JWT Bearer Auth, Swagger
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Auth:** JWT token (simple login, không verify password thật)
- **Deploy:** Railway (backend), Vercel (frontend)

---

## I. BACKEND API (`Attendance.API`)

### 1. Cấu Trúc Database

Hệ thống quản lý **6 bảng** trong PostgreSQL:

| Bảng | Mục đích |
|---|---|
| `AttendanceRecords` | Ghi nhận check-in/check-out hàng ngày |
| `LeaveRequests` | Đơn xin nghỉ phép |
| `OvertimeRecords` | Đăng ký tăng ca |
| `Shifts` | Ca làm việc (MORNING, AFTERNOON, NIGHT...) |
| `Holidays` | Ngày lễ (có thể lặp lại hàng năm) |
| `EmployeeInfo` | Thông tin nhân viên (đồng bộ từ HRCore) |

### 2. Danh Sách API Endpoints

#### AuthController (`/api/Auth`)

| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập, trả về JWT token (không verify password thật) |

- Request: `{ username, password, employeeId?, role? }`
- Response: `{ token, expiresAt }`
- Role mặc định: "Admin" nếu username = "admin", ngược lại "Employee"
- Token hết hạn sau 60 phút (configurable)

#### AttendanceRecordsController (`/api/AttendanceRecords`)
Yêu cầu `[Authorize]` - cần JWT token hợp lệ.

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/attendancerecords` | Danh sách chấm công (phân trang). Filter: employeeId, fromDate, toDate, status, page, pageSize |
| GET | `/api/attendancerecords/{id}` | Chi tiết 1 bản ghi chấm công |
| GET | `/api/attendancerecords/employee/{employeeId}/today` | Bản ghi hôm nay của nhân viên |
| GET | `/api/attendancerecords/employee/{employeeId}/history` | Lịch sử chấm công của nhân viên |
| POST | `/api/attendancerecords/check-in` | Check-in: xác định trạng thái Present/Late dựa vào giờ và shift |
| PATCH | `/api/attendancerecords/{id}/check-out` | Check-out: tự động tính HalfDay nếu làm < 4 tiếng |
| PUT | `/api/attendancerecords/{id}` | Cập nhật bản ghi chấm công |
| DELETE | `/api/attendancerecords/{id}` | Xóa bản ghi chấm công |
| GET | `/api/attendancerecords/summary` | Thống kê tổng quan (present, late, absent, halfday) |
| GET | `/api/attendancerecords/summary/by-employee` | Thống kê theo từng nhân viên |
| POST | `/api/attendancerecords/monthly-close/{year}/{month}` | Chốt công tháng (chỉ chốt 1 lần) |

**Logic check-in:**
- Dùng múi giờ Việt Nam (SE Asia Standard Time)
- Nếu check-in trước 08:31 (hoặc theo shift's AllowedLateMinutes) → Present
- Ngược lại → Late
- Nếu đã check-in rồi → trả về bản ghi cũ (idempotent)

**Logic check-out:**
- Nếu `(checkout - checkin) < 4 tiếng` → set status = HalfDay

#### LeaveRequestsController (`/api/LeaveRequests`)

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/leaverequests` | Danh sách đơn nghỉ phép (phân trang) |
| GET | `/api/leaverequests/{id}` | Chi tiết đơn nghỉ phép |
| GET | `/api/leaverequests/employee/{employeeId}` | Đơn nghỉ phép của nhân viên |
| POST | `/api/leaverequests` | Tạo đơn nghỉ phép. Validate: employee tồn tại, start ≤ end, max 30 ngày |
| PUT | `/api/leaverequests/{id}` | Cập nhật đơn nghỉ phép |
| PATCH | `/api/leaverequests/{id}/approve` | Duyệt/từ chối đơn. Set status + rejection reason |
| DELETE | `/api/leaverequests/{id}` | Xóa đơn nghỉ phép |

**Leave Types (enum):** Annual, Sick, Personal, Unpaid, Maternity, Bereavement
**Leave Status (enum):** Pending, Approved, Rejected, Cancelled

#### OvertimeRecordsController (`/api/OvertimeRecords`)

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/overtimerecords` | Danh sách tăng ca (phân trang) |
| GET | `/api/overtimerecords/{id}` | Chi tiết 1 bản ghi tăng ca |
| GET | `/api/overtimerecords/employee/{employeeId}` | Tăng ca của nhân viên |
| POST | `/api/overtimerecords` | Tạo đăng ký tăng ca. Validate: giờ > 0, không trùng thời gian |
| PUT | `/api/overtimerecords/{id}` | Cập nhật tăng ca |
| PATCH | `/api/overtimerecords/{id}/approve` | Duyệt/từ chối tăng ca |
| DELETE | `/api/overtimerecords/{id}` | Xóa tăng ca |

#### ShiftsController (`/api/Shifts`)

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/shifts` | Danh sách ca làm việc (filter: isActive) |
| GET | `/api/shifts/{id}` | Chi tiết ca làm việc |
| POST | `/api/shifts` | Tạo ca làm việc mới. Validate: code unique, start ≠ end, late ≥ 0 |
| PUT | `/api/shifts/{id}` | Cập nhật ca làm việc |
| DELETE | `/api/shifts/{id}` | Xóa ca làm việc |
| POST | `/api/shifts/seed` | Tạo 5 ca mặc định (chỉ chạy nếu chưa có ca nào) |

**5 ca mặc định:** MORNING (06-14), AFTERNOON (14-22), NIGHT (22-06), HALF_MORN (06-12), HALF_AFT (12-18)

#### HolidaysController (`/api/Holidays`)

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/holidays` | Danh sách ngày lễ (filter: year) |
| GET | `/api/holidays/{id}` | Chi tiết ngày lễ |
| POST | `/api/holidays` | Tạo ngày lễ. Validate: name ≥ 2 ký tự, không trùng date/name |
| PUT | `/api/holidays/{id}` | Cập nhật ngày lễ |
| DELETE | `/api/holidays/{id}` | Xóa ngày lễ |

#### HRCoreController (`/api/HRCore`)

| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/hrcore/sync` | Đồng bộ nhân viên từ HRCore (external API) → trả về số lượng |
| GET | `/api/hrcore/employees` | Danh sách nhân viên đang active (từ local DB) |

---

### 3. Services (Business Logic)

#### HRCoreService
- **Typed HttpClient** gọi sang hệ thống HRCore external
- `SyncEmployeesAsync()`: Fetch từ HRCore → Upsert vào local DB → Xử lý ID change → Deactivate nhân viên cũ
- `GetAllEmployeesAsync()`: Lấy danh sách nhân viên active (có cache)
- Token gọi HRCore được cache theo `HRCore:TokenTTLMinutes` (mặc định 55 phút)

#### AttendanceEventService
- **Singleton** dùng event pattern (pub/sub)
- `PublishMonthlyClosedAsync(year, month)`: Phát sự kiện khi chốt công tháng
- External code có thể subscribe vào `OnMonthlyClosed` event

---

### 4. Entities (Models)

#### AttendanceRecord
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| EmployeeId | Guid | Indexed, unique với Date |
| Date | DateTime | Indexed, unique với EmployeeId |
| ShiftId | Guid? | FK → Shifts |
| CheckIn | DateTime? | |
| CheckOut | DateTime? | |
| Status | enum | Present=0, Late=1, Absent=2, HalfDay=3 |
| Note | string? | |
| IsClosed | bool | Dùng cho chốt công tháng |
| CreatedAt / UpdatedAt | DateTime | Audit fields |

#### EmployeeInfo
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| EmployeeCode | string | Unique index |
| FullName | string | |
| Email | string? | |
| DepartmentId / DepartmentName | Guid?, string? | |
| PositionId / PositionName | Guid?, string? | |
| IsActive | bool | Default true |
| CreatedAt / UpdatedAt | DateTime | Audit fields |

#### LeaveRequest
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| EmployeeId | Guid | Indexed |
| LeaveType | enum | Annual, Sick, Personal, Unpaid, Maternity, Bereavement |
| StartDate / EndDate | DateTime | |
| Reason | string? | |
| Status | enum | Pending, Approved, Rejected, Cancelled |
| ApprovedBy / ApprovedDate | Guid?, DateTime? | |
| RejectionReason | string? | |

#### OvertimeRecord
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| EmployeeId | Guid | Indexed |
| Date | DateTime | |
| StartTime / EndTime | DateTime | |
| Hours | double | Tính tự động |
| Status | enum | Pending, Approved, Rejected, Cancelled |

#### Shift
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| ShiftCode | string | Unique (MORN, AFTR, NIGHT...) |
| ShiftName | string | |
| StartTime / EndTime | TimeSpan | PostgreSQL INTERVAL |
| AllowedLateMinutes | double | Default 30 |

#### Holiday
| Field | Type | Ghi chú |
|---|---|---|
| Id | Guid | PK |
| HolidayName | string | |
| Date | DateTime | |
| IsRecurring | bool | Lặp lại hàng năm |

---

### 5. Middleware Pipeline (Program.cs)

Thứ tự xử lý request:

```
1. ExceptionHandler (global error handling)
2. StatusCodePages
3. RateLimiter (100 request/phút/IP)
4. CORS
5. Security Headers (X-Content-Type-Options, X-Frame-Options, CSP...)
6. Swagger
7. Authentication (JWT Bearer)
8. Authorization
9. Controllers
```

**Khởi tạo database:** `EnsureCreated()` + raw SQL tạo bảng Shifts, thêm cột ShiftId và IsClosed (nếu chưa có).

---

## II. FRONTEND (`Attendance.Frontend`)

### 1. Kiến Trúc

**Single Page Application** thuần:
- **index.html**: Toàn bộ UI + CSS + JS trong 1 file (~1530 dòng)
- Không dùng framework (React, Vue...), không bundler
- Deploy trên Vercel

### 2. Luồng Hoạt Động

```
1. User mở trang → Login Overlay hiện
2. Nhập username/password → POST /api/auth/login
3. Nhận JWT token → Lưu sessionStorage → Ẩn Login Overlay
4. Gọi testConnection() → Load dashboard + employees
5. User tương tác với các tab:
   - Check In/Out
   - Leave Requests
   - Overtime
   - Shifts
   - Holidays
   - Reports
```

### 3. Các Chức Năng Chính

#### Authentication (`/api/Auth/login`)
- Login form với username + password
- Toggle "Người mang JWT" (bật/tắt gửi token trong request)
- Lưu token vào sessionStorage
- Tự động ẩn form login sau 500ms khi thành công

#### Dashboard (Stats)
- 4 thẻ hiển thị: Total Records, Present, Late, Absent
- Gọi `GET /api/AttendanceRecords/summary`

#### Attendance - Check In/Out
- Chọn employee từ dropdown
- Nút "Check In" → `POST /api/AttendanceRecords/check-in`
- Nút "Check Out" → `GET .../today` + `PATCH .../check-out`
- Hiển thị kết quả trong output box

#### Attendance - History
- Filter: From date, To date, Status dropdown
- `GET /api/AttendanceRecords?fromDate=...&toDate=...&status=...`

#### Attendance - By Employee
- Chọn employee → `GET /api/AttendanceRecords/employee/{id}/history`

#### Leave Requests - Create
- Chọn employee, type, reason, start date, end date
- `POST /api/LeaveRequests`

#### Leave Requests - List
- Filter: Employee, Status
- `GET /api/LeaveRequests?employeeId=...&status=...`

#### Leave Requests - Approve
- Nhập Request ID, chọn Status (Approved/Rejected/Cancelled), nhập rejection reason
- `PATCH /api/LeaveRequests/{id}/approve`

#### Overtime - Create / List / Approve
- Tương tự Leave Requests

#### Shifts - Create / List
- Tạo shift mới với code, name, start/end time, allowed late minutes
- List tất cả shifts

#### Holidays - Create / List
- Tạo holiday với name, date, recurring option
- List tất cả holidays

#### Reports
- Attendance Summary by Employee trong khoảng thời gian
- `GET /api/AttendanceRecords/summary/by-employee`

### 4. Các Hàm JavaScript Quan Trọng

| Hàm | Mô tả |
|---|---|
| `api(method, url, body)` | Hàm fetch wrapper - tự động thêm JWT, xử lý 401 → logout |
| `getBase()` | Lấy base URL từ input |
| `generateToken()` | Login: gọi POST /api/auth/login → lưu token → init app |
| `testConnection()` | Kiểm tra kết nối API, load dashboard + employees |
| `loadEmployees()` | Load danh sách nhân viên vào tất cả dropdown `<select>` |
| `loadDashboard()` | Load thống kê vào 4 thẻ dashboard |
| `checkIn()` / `checkOut()` | Check-in/out với validation |
| `createLeave()` / `listLeaves()` / `approveLeave()` | CRUD leave requests |
| `createOvertime()` / `listOvertime()` / `approveOvertime()` | CRUD overtime |
| `createShift()` / `listShifts()` | CRUD shifts |
| `createHoliday()` / `listHolidays()` | CRUD holidays |
| `switchTab(el, tabId)` | Chuyển tab trong card |
| `showOutput(id, data)` | Hiển thị kết quả API trong output box |
| `toast(msg, type)` | Hiển thị thông báo toast |

### 5. Các Bug Đã Fix

1. **`loadEmployees()` không chạy khi connection thất bại** - do chỉ gọi trong try block. Fix: chuyển vào `finally` block.
2. **`switchTab()` ẩn luôn input bên trong tab** - do dùng `querySelectorAll('[id]')` ẩn mọi element có ID. Fix: dùng `:scope > [id]` chỉ ẩn direct child (tab pane).

---

## III. LUỒNG DỮ LIỆU CHI TIẾT

### Check-in Flow
```
User click "Check In"
  → JS đọc employeeId từ dropdown
  → POST /api/AttendanceRecords/check-in
    → Controller validate employee tồn tại
    → Kiểm tra đã check-in hôm nay chưa (nếu rồi trả về bản ghi cũ)
    → Xác định shift (dựa vào giờ hiện tại + shifts trong DB)
    → Xác định status: giờ check-in ≤ (shift start + allowed late) → Present, else Late
    → Tạo AttendanceRecord mới
    → Trả về 201 Created + DTO
  → JS hiển thị kết quả + reload dashboard
```

### Leave Request Flow
```
User click "Submit Leave Request"
  → JS validate: employee, start date, end date
  → POST /api/LeaveRequests
    → Controller validate:
      - Employee tồn tại
      - LeaveType hợp lệ
      - StartDate ≤ EndDate
      - Duration ≤ 30 ngày
    → Tạo LeaveRequest với status = Pending
    → Trả về DTO
  → JS hiển thị kết quả
```

### Employee Sync Flow
```
User click "Sync HRCore"
  → POST /api/HRCore/sync
    → HRCoreService.GetTokenAsync() - login vào HRCore API
    → HRCoreService.SyncEmployeesAsync() - fetch employees
    → Upsert từng employee vào EmployeeInfo
    → Xử lý ID change: cập nhật FK trong AttendanceRecords, LeaveRequests, OvertimeRecords
    → Deactivate employees không còn trong HRCore
    → Trả về số lượng đã sync
  → JS reload employees dropdown + hiển thị kết quả
```

---

## IV. BẢO MẬT

1. **JWT Authentication**: Tất cả endpoint (trừ login) đều yêu cầu Bearer token
2. **Role-based**: Admin có thể check-in cho người khác, Employee chỉ check-in cho bản thân
3. **Rate Limiting**: 100 requests/phút/IP
4. **CORS**: Giới hạn origin (Vercel + localhost)
5. **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP...
6. **Global Exception Handler**: Trả về lỗi chuẩn RFC 7807 ProblemDetails

---

## V. DEPLOY

| Component | Platform | URL |
|---|---|---|
| Backend API | Railway | `https://attendanceapi-production-0e83.up.railway.app` |
| Frontend | Vercel | `https://attendance-service-lime.vercel.app` |
| HRCore (external) | Railway | `https://hrcore-production.up.railway.app` |

- **Dockerfile**: Multi-stage build, .NET 10.0, expose port 8080
- **railway.json**: 1 replica, restart on failure, no sleep
- **vercel.json**: Static SPA deployment
