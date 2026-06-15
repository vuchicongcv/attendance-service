import { useState, useEffect } from 'react';
import { api } from '../api';

function TabButton({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Overtime() {
  const [activeTab, setActiveTab] = useState('create');
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

  // Tab: Create
  const [otEmp, setOtEmp] = useState('');
  const [otDate, setOtDate] = useState('');
  const [otStart, setOtStart] = useState('');
  const [otEnd, setOtEnd] = useState('');
  const [otReason, setOtReason] = useState('');

  const handleCreate = async () => {
    if (!otEmp || !otDate) return;
    setLoading(true);
    try {
      const data = await api('POST', '/api/OvertimeRecords', {
        employeeId: otEmp,
        date: new Date(otDate).toISOString(),
        startTime: otStart ? new Date(otStart).toISOString() : new Date().toISOString(),
        endTime: otEnd ? new Date(otEnd).toISOString() : new Date(Date.now() + 7200000).toISOString(),
        reason: otReason || null,
      });
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: List
  const [otFilter, setOtFilter] = useState('');

  const handleList = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/api/OvertimeRecords' + (otFilter ? `?employeeId=${otFilter}` : ''));
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: Approve
  const [approveId, setApproveId] = useState('');
  const [approveStatus, setApproveStatus] = useState('Approved');
  const [approveReason, setApproveReason] = useState('');

  const handleApprove = async () => {
    if (!approveId) return;
    setLoading(true);
    try {
      const data = await api('PATCH', `/api/OvertimeRecords/${approveId}/approve`, {
        status: approveStatus,
        rejectionReason: approveReason || null,
      });
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Overtime</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmployees}>Refresh Employees</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabButton label="Create" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <TabButton label="List" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
          <TabButton label="Approve" active={activeTab === 'approve'} onClick={() => setActiveTab('approve')} />
        </div>

        {activeTab === 'create' && (
          <div className="card-body">
            <div className="field">
              <label>Employee</label>
              <select value={otEmp} onChange={e => setOtEmp(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.employeeCode}] {emp.fullName}{emp.departmentName ? ` - ${emp.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field"><label>Date</label><input type="date" value={otDate} onChange={e => setOtDate(e.target.value)} /></div>
            <div className="form-row">
              <div className="field"><label>Start</label><input type="datetime-local" value={otStart} onChange={e => setOtStart(e.target.value)} /></div>
              <div className="field"><label>End</label><input type="datetime-local" value={otEnd} onChange={e => setOtEnd(e.target.value)} /></div>
            </div>
            <div className="field"><label>Reason</label><input value={otReason} onChange={e => setOtReason(e.target.value)} placeholder="Reason" /></div>
            <button className="btn btn-success" onClick={handleCreate} disabled={loading || !otEmp}>
              {loading ? <span className="spinner" /> : null} Record Overtime
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="card-body">
            <div className="field">
              <label>Employee</label>
              <select value={otFilter} onChange={e => setOtFilter(e.target.value)}>
                <option value="">All</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.employeeCode}] {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleList} disabled={loading}>
              {loading ? <span className="spinner" /> : null} Search
            </button>
          </div>
        )}

        {activeTab === 'approve' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label>Record ID</label>
                <input value={approveId} onChange={e => setApproveId(e.target.value)} placeholder="Overtime UUID" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={approveStatus} onChange={e => setApproveStatus(e.target.value)}>
                  <option>Approved</option><option>Rejected</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Rejection Reason</label>
              <input value={approveReason} onChange={e => setApproveReason(e.target.value)} placeholder="If rejected..." />
            </div>
            <button className="btn btn-warning" onClick={handleApprove} disabled={loading || !approveId}>
              {loading ? <span className="spinner" /> : null} Submit Review
            </button>
          </div>
        )}

        <div className="card-body">
          <div className="output">
            {output ? (
              <span className={output.type === 'success' ? 'success' : 'error'}>
                {typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data)}
              </span>
            ) : (
              <span className="muted">Fill form and execute...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
