import { useState, useEffect } from 'react';
import { api } from '../api';

function TabButton({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Leaves() {
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
  const [leaveEmp, setLeaveEmp] = useState('');
  const [leaveType, setLeaveType] = useState('Annual');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');

  const handleCreate = async () => {
    if (!leaveEmp || !leaveStart || !leaveEnd) return;
    setLoading(true);
    try {
      const data = await api('POST', '/api/LeaveRequests', {
        employeeId: leaveEmp,
        leaveType,
        startDate: new Date(leaveStart).toISOString(),
        endDate: new Date(leaveEnd).toISOString(),
        reason: leaveReason || null,
      });
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: List
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleList = async () => {
    setLoading(true);
    const p = [];
    if (filterEmp) p.push(`employeeId=${filterEmp}`);
    if (filterStatus) p.push(`status=${filterStatus}`);
    try {
      const data = await api('GET', '/api/LeaveRequests' + (p.length ? '?' + p.join('&') : ''));
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
      const data = await api('PATCH', `/api/LeaveRequests/${approveId}/approve`, {
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
        <h2>Leave Requests</h2>
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
              <select value={leaveEmp} onChange={e => setLeaveEmp(e.target.value)}>
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.employeeCode}] {emp.fullName}{emp.departmentName ? ` - ${emp.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Type</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  <option>Annual</option><option>Sick</option><option>Personal</option>
                  <option>Unpaid</option><option>Maternity</option><option>Bereavement</option>
                </select>
              </div>
              <div className="field">
                <label>Reason</label>
                <input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Optional reason" />
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Start</label><input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} /></div>
              <div className="field"><label>End</label><input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} /></div>
            </div>
            <button className="btn btn-success" onClick={handleCreate} disabled={loading || !leaveEmp || !leaveStart || !leaveEnd}>
              {loading ? <span className="spinner" /> : null} Submit Leave Request
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label>Employee</label>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                  <option value="">All</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.employeeCode}] {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All</option>
                  <option>Pending</option><option>Approved</option><option>Rejected</option><option>Cancelled</option>
                </select>
              </div>
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
                <label>Request ID</label>
                <input value={approveId} onChange={e => setApproveId(e.target.value)} placeholder="Leave Request UUID" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={approveStatus} onChange={e => setApproveStatus(e.target.value)}>
                  <option>Approved</option><option>Rejected</option><option>Cancelled</option>
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
