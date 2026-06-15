import { useState } from 'react';
import { api } from '../api';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    const p = [];
    if (from) p.push(`fromDate=${new Date(from).toISOString()}`);
    if (to) p.push(`toDate=${new Date(to).toISOString()}`);
    try {
      const data = await api('GET', '/api/AttendanceRecords/summary/by-employee' + (p.length ? '?' + p.join('&') : ''));
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Reports</h2>
      </div>

      <div className="section-label">
        <span className="dot" />
        <span>Attendance Summary</span>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Attendance Summary Report</h3>
        </div>
        <div className="card-body">
          <div className="form-row-3">
            <div className="field"><label>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="field"><label>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="btn btn-primary w-full" onClick={handleGenerate} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Generate Report
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="output">
            {output ? (
              <span className={output.type === 'success' ? 'success' : 'error'}>
                {typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data)}
              </span>
            ) : (
              <span className="muted">Select date range and generate report...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
