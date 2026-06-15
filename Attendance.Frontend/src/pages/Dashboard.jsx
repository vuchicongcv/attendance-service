import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setConnectionStatus('checking');
    try {
      await api('GET', '/api/AttendanceRecords?fromDate=2024-01-01&toDate=2024-01-02&pageSize=1');
      setConnectionStatus('connected');
    } catch {
      setConnectionStatus('disconnected');
    }
    try {
      const data = await api('GET', '/api/AttendanceRecords/summary');
      setStats(data);
    } catch {
      setStats({ totalRecords: 0, present: 0, late: 0, absent: 0, halfDay: 0, averageWorkedHours: 0 });
    }
  };

  const statCards = [
    { label: 'Total Records', value: stats?.totalRecords ?? '—', color: 'purple' },
    { label: 'Present', value: stats?.present ?? '—', color: 'green' },
    { label: 'Late', value: stats?.late ?? '—', color: 'yellow' },
    { label: 'Absent', value: stats?.absent ?? '—', color: 'red' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="header-actions">
          <span className={`status-badge ${connectionStatus}`}>
            <span className="dot" />
            {connectionStatus === 'checking' ? 'connecting...' : connectionStatus}
          </span>
          <button className="btn btn-outline btn-sm" onClick={loadDashboard}>
            Refresh
          </button>
        </div>
      </div>

      <div className="section-label">
        <span className="dot" />
        <span>Overview</span>
      </div>

      <div className="stats-grid">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="accent-bar" />
            <div className="label">{card.label}</div>
            <div className={`value ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="section-label">
        <span className="dot" />
        <span>Quick Actions</span>
      </div>

      <div className="quick-actions">
        <a href="/attendance" className="quick-card" onClick={e => { e.preventDefault(); window.location.href = '/attendance'; }}>
          <span className="quick-icon">📋</span>
          <span className="quick-title">Check In / Out</span>
          <span className="quick-desc">Record daily attendance</span>
        </a>
        <a href="/leaves" className="quick-card" onClick={e => { e.preventDefault(); window.location.href = '/leaves'; }}>
          <span className="quick-icon">📝</span>
          <span className="quick-title">Leave Request</span>
          <span className="quick-desc">Submit leave application</span>
        </a>
        <a href="/overtime" className="quick-card" onClick={e => { e.preventDefault(); window.location.href = '/overtime'; }}>
          <span className="quick-icon">⏰</span>
          <span className="quick-title">Overtime</span>
          <span className="quick-desc">Register overtime hours</span>
        </a>
        <a href="/reports" className="quick-card" onClick={e => { e.preventDefault(); window.location.href = '/reports'; }}>
          <span className="quick-icon">📈</span>
          <span className="quick-title">Reports</span>
          <span className="quick-desc">View attendance reports</span>
        </a>
      </div>
    </div>
  );
}
