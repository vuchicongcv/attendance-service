import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const fd = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const today = () => new Date().toISOString().slice(0, 10);
const iso = (d) => new Date(d).toISOString();

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingOt, setPendingOt] = useState(0);
  const [todayRecords, setTodayRecords] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayLate, setTodayLate] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);
  const [connStatus, setConnStatus] = useState('checking');
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setConnStatus('checking');
    try {
      await api('GET', '/api/AttendanceRecords?pageSize=1');
      setConnStatus('connected');
    } catch {
      setConnStatus('disconnected');
    }
    try {
      const s = await api('GET', '/api/AttendanceRecords/summary');
      setStats(s);
    } catch {
      setStats({ totalRecords: 0, present: 0, late: 0, absent: 0, halfDay: 0, averageWorkedHours: 0 });
    }
    try {
      const d = await api('GET', '/api/AttendanceRecords?fromDate=' + iso(today()) + '&toDate=' + iso(today()));
      const items = d.items || d || [];
      setTodayRecords(Array.isArray(items) ? items : []);
      setTodayCount(Array.isArray(items) ? items.length : 0);
      setTodayLate(Array.isArray(items) ? items.filter(i => i.status === 'Late').length : 0);
      setTodayAbsent(Array.isArray(items) ? items.filter(i => i.status === 'Absent').length : 0);
    } catch {}
    try {
      const l = await api('GET', '/api/LeaveRequests?status=Pending&pageSize=1');
      setPendingLeaves(l.totalCount || 0);
    } catch {}
    try {
      const o = await api('GET', '/api/OvertimeRecords?status=Pending&pageSize=1');
      setPendingOt(o.totalCount || 0);
    } catch {}
  };

  const cards = [
    { label: 'Hôm nay', value: todayCount + ' bản ghi', color: 'blue' },
    { label: 'Đi muộn hôm nay', value: todayLate, color: 'yellow' },
    { label: 'Chờ duyệt nghỉ phép', value: pendingLeaves, color: 'purple' },
    { label: 'Chờ duyệt tăng ca', value: pendingOt, color: 'orange' },
    { label: 'Tổng bản ghi', value: (stats?.totalRecords ?? '—'), color: 'green' },
    { label: 'Đi làm', value: (stats?.present ?? '—'), color: 'green' },
    { label: 'Đi muộn', value: (stats?.late ?? '—'), color: 'yellow' },
    { label: 'Vắng', value: (stats?.absent ?? '—'), color: 'red' },
  ];

  const quickLinks = [
    { path: '/attendance', icon: '📋', title: 'Chấm công', desc: 'Check-in / Check-out hàng ngày' },
    { path: '/leaves', icon: '📝', title: 'Nghỉ phép', desc: 'Đăng ký & duyệt đơn nghỉ phép' },
    { path: '/overtime', icon: '⏰', title: 'Tăng ca', desc: 'Đăng ký & duyệt làm thêm giờ' },
    { path: '/reports', icon: '📈', title: 'Báo cáo', desc: 'Xem báo cáo chấm công' },
    { path: '/shifts', icon: '🕐', title: 'Ca làm việc', desc: 'Quản lý ca làm việc' },
    { path: '/holidays', icon: '🎉', title: 'Ngày lễ', desc: 'Danh sách ngày nghỉ lễ' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tổng quan</h2>
        <div className="header-actions">
          <span className={`status-badge ${connStatus}`}>
            <span className="dot" />
            {connStatus === 'checking' ? 'đang kết nối...' : connStatus === 'connected' ? 'đã kết nối' : 'mất kết nối'}
          </span>
          <button className="btn btn-outline btn-sm" onClick={load}>Làm mới</button>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="accent-bar" />
            <div className="label">{c.label}</div>
            <div className={`value ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="section-label">
        <span className="dot" />
        <span>Chức năng nhanh</span>
      </div>

      <div className="quick-actions">
        {quickLinks.map(q => (
          <div key={q.path} className="quick-card" onClick={() => navigate(q.path)} style={{ cursor: 'pointer' }}>
            <span className="quick-icon">{q.icon}</span>
            <span className="quick-title">{q.title}</span>
            <span className="quick-desc">{q.desc}</span>
          </div>
        ))}
      </div>

      {todayRecords.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>
            <span className="dot" />
            <span>Chấm công hôm nay ({fd(today())})</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: '8px 22px 22px' }}>
              {todayRecords.length > 0 ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>NV</th><th>Check In</th><th>Check Out</th><th>Trạng thái</th><th>Giờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRecords.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.employeeCode}</strong><br /><small>{r.employeeName}</small></td>
                          <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN') : '—'}</td>
                          <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN') : '—'}</td>
                          <td><span className={`badge badge-${r.status === 'Present' ? 'green' : r.status === 'Late' ? 'yellow' : r.status === 'Absent' ? 'red' : r.status === 'HalfDay' ? 'blue' : 'gray'}`}>{r.status === 'Present' ? 'Đi làm' : r.status === 'Late' ? 'Đi muộn' : r.status === 'Absent' ? 'Vắng' : r.status === 'HalfDay' ? 'Nửa ngày' : r.status}</span></td>
                          <td>{r.workedHours ? r.workedHours.toFixed(1) + 'h' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state">Chưa có dữ liệu hôm nay</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
