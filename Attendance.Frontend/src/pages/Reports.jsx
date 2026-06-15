import { useState } from 'react';
import { api } from '../api';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const doGenerate = async () => {
    setLoading(true);
    const p = [];
    if (from) p.push(`fromDate=${new Date(from).toISOString()}`);
    if (to) p.push(`toDate=${new Date(to).toISOString()}`);
    try {
      const data = await api('GET', '/api/AttendanceRecords/summary/by-employee' + (p.length ? '?' + p.join('&') : ''));
      setResult({ type: 'success', data });
    } catch (e) { setResult({ type: 'error', data: e.data || e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Báo cáo</h2>
      </div>

      <div className="section-label">
        <span className="dot" />
        <span>Báo cáo chấm công</span>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Báo cáo tổng hợp theo nhân viên</h3>
        </div>
        <div className="card-body">
          <div className="form-row-3">
            <div className="field"><label>Từ ngày</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="field"><label>Đến ngày</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="btn btn-primary w-full" onClick={doGenerate} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Tạo báo cáo
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="output">
            {result ? (
              <span className={result.type === 'success' ? 'success' : 'error'}>
                {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}
              </span>
            ) : (
              <span className="muted">Chọn khoảng thời gian và tạo báo cáo...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
