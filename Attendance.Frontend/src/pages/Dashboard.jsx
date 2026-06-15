import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [connStatus, setConnStatus] = useState('checking');
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setConnStatus('checking');
    try {
      await api('GET', '/api/AttendanceRecords?fromDate=2024-01-01&toDate=2024-01-02&pageSize=1');
      setConnStatus('connected');
    } catch {
      setConnStatus('disconnected');
    }
    try {
      const data = await api('GET', '/api/AttendanceRecords/summary');
      setStats(data);
    } catch {
      setStats({ totalRecords: 0, present: 0, late: 0, absent: 0, halfDay: 0, averageWorkedHours: 0 });
    }
  };

  const cards = [
    { label: 'Tổng số bản ghi', value: stats?.totalRecords ?? '—', color: 'purple' },
    { label: 'Đi làm', value: stats?.present ?? '—', color: 'green' },
    { label: 'Đi muộn', value: stats?.late ?? '—', color: 'yellow' },
    { label: 'Vắng mặt', value: stats?.absent ?? '—', color: 'red' },
  ];

  const quickLinks = [
    { path: '/attendance', icon: '📋', title: 'Chấm công', desc: 'Check-in / Check-out hàng ngày' },
    { path: '/leaves', icon: '📝', title: 'Nghỉ phép', desc: 'Đăng ký đơn nghỉ phép' },
    { path: '/overtime', icon: '⏰', title: 'Tăng ca', desc: 'Đăng ký làm thêm giờ' },
    { path: '/reports', icon: '📈', title: 'Báo cáo', desc: 'Xem báo cáo chấm công' },
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

      <div className="section-label">
        <span className="dot" />
        <span>Thống kê</span>
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
    </div>
  );
}
