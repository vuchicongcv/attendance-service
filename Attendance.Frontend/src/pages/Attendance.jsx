import { useState, useEffect } from 'react';
import { api } from '../api';

function TabButton({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('checkin');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    try {
      const data = await api('GET', '/api/HRCore/employees');
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); }
  };

  // Tab: Check In/Out
  const [checkinEmp, setCheckinEmp] = useState('');

  const handleCheckIn = async () => {
    if (!checkinEmp) return;
    setLoading(true);
    try {
      const data = await api('POST', '/api/AttendanceRecords/check-in', {
        employeeId: checkinEmp,
        checkIn: new Date().toISOString(),
      });
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!checkinEmp) return;
    setLoading(true);
    try {
      const today = await api('GET', `/api/AttendanceRecords/employee/${checkinEmp}/today`);
      const data = await api('PATCH', `/api/AttendanceRecords/${today.id}/check-out`, {
        checkOut: new Date().toISOString(),
      });
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: History
  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');
  const [attStatus, setAttStatus] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    const p = [];
    if (attFrom) p.push(`fromDate=${new Date(attFrom).toISOString()}`);
    if (attTo) p.push(`toDate=${new Date(attTo).toISOString()}`);
    if (attStatus) p.push(`status=${attStatus}`);
    try {
      const data = await api('GET', '/api/AttendanceRecords' + (p.length ? '?' + p.join('&') : ''));
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: By Employee
  const [attEmp, setAttEmp] = useState('');

  const handleViewHistory = async () => {
    if (!attEmp) return;
    setLoading(true);
    try {
      const data = await api('GET', `/api/AttendanceRecords/employee/${attEmp}/history`);
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  const renderOutput = () => {
    if (!output) return <div className="output"><span className="muted">Select options and execute...</span></div>;
    return (
      <div className="output">
        <span className={output.type === 'success' ? 'success' : 'error'}>
          {typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data)}
        </span>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Attendance</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmployees}>Refresh Employees</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabButton label="Check In/Out" active={activeTab === 'checkin'} onClick={() => setActiveTab('checkin')} />
          <TabButton label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabButton label="By Employee" active={activeTab === 'byemployee'} onClick={() => setActiveTab('byemployee')} />
        </div>

        {activeTab === 'checkin' && (
          <div className="card-body">
            <div className="field">
              <label>Employee</label>
              <select value={checkinEmp} onChange={e => setCheckinEmp(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.employeeCode}] {emp.fullName}{emp.departmentName ? ` - ${emp.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <button className="btn btn-success flex-1" onClick={handleCheckIn} disabled={loading || !checkinEmp}>
                {loading ? <span className="spinner" /> : null} Check In
              </button>
              <button className="btn btn-warning flex-1" onClick={handleCheckOut} disabled={loading || !checkinEmp}>
                {loading ? <span className="spinner" /> : null} Check Out
              </button>
            </div>
            {renderOutput()}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label>From</label>
                <input type="date" value={attFrom} onChange={e => setAttFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="date" value={attTo} onChange={e => setAttTo(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Status</label>
                <select value={attStatus} onChange={e => setAttStatus(e.target.value)}>
                  <option value="">All</option>
                  <option>Present</option>
                  <option>Late</option>
                  <option>Absent</option>
                  <option>HalfDay</option>
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn btn-primary w-full" onClick={handleSearch} disabled={loading}>
                  {loading ? <span className="spinner" /> : null} Search
                </button>
              </div>
            </div>
            {renderOutput()}
          </div>
        )}

        {activeTab === 'byemployee' && (
          <div className="card-body">
            <div className="field">
              <label>Employee</label>
              <select value={attEmp} onChange={e => setAttEmp(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.employeeCode}] {emp.fullName}{emp.departmentName ? ` - ${emp.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleViewHistory} disabled={loading || !attEmp}>
              {loading ? <span className="spinner" /> : null} View History
            </button>
            {renderOutput()}
          </div>
        )}
      </div>
    </div>
  );
}
