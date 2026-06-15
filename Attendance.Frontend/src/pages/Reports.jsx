import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const badge = (s) => {
  if (s === undefined || s === null) return '—';
  return <span className="badge badge-blue">{s}</span>;
};

export default function Reports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const doGenerate = async () => {
    setLoading(true);
    const p = [];
    if (from) p.push(`fromDate=${new Date(from).toISOString()}`);
    if (to) p.push(`toDate=${new Date(to).toISOString()}`);
    try {
      const d = await api('GET', '/api/AttendanceRecords/summary/by-employee' + (p.length ? '?' + p.join('&') : ''));
      setData(Array.isArray(d) ? d : []);
      if (!Array.isArray(d) || d.length === 0) toast('Không có dữ liệu cho khoảng thời gian này', 'info');
      else toast(`Tìm thấy ${d.length} nhân viên`, 'success');
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
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

        {data && data.length > 0 && (
          <div className="card-body">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>Phòng ban</th>
                    <th>Tổng ngày</th>
                    <th>Đi làm</th>
                    <th>Đi muộn</th>
                    <th>Vắng</th>
                    <th>Nửa ngày</th>
                    <th>Tổng giờ làm</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, i) => (
                    <tr key={item.employeeId || i}>
                      <td><strong>{item.employeeCode || '—'}</strong></td>
                      <td>{item.employeeName || '—'}</td>
                      <td><small>{item.departmentName || '—'}</small></td>
                      <td>{badge(item.totalDays)}</td>
                      <td><span className="badge badge-green">{item.present ?? 0}</span></td>
                      <td><span className="badge badge-yellow">{item.late ?? 0}</span></td>
                      <td><span className="badge badge-red">{item.absent ?? 0}</span></td>
                      <td><span className="badge badge-blue">{item.halfDay ?? 0}</span></td>
                      <td><strong>{(item.totalWorkedHours ?? 0).toFixed(1)}h</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="summary-grid">
              {data.map((item, i) => (
                <div key={item.employeeId || i} className="summary-card">
                  <div className="emp-name">{item.employeeName || '—'}</div>
                  <div className="emp-code">{item.employeeCode || ''} {item.departmentName ? `· ${item.departmentName}` : ''}</div>
                  <div className="stat-row"><span>Tổng ngày</span><span className="val">{item.totalDays ?? 0}</span></div>
                  <div className="stat-row"><span>Đi làm</span><span className="val" style={{ color: '#059669' }}>{item.present ?? 0}</span></div>
                  <div className="stat-row"><span>Đi muộn</span><span className="val" style={{ color: '#d97706' }}>{item.late ?? 0}</span></div>
                  <div className="stat-row"><span>Vắng</span><span className="val" style={{ color: '#dc2626' }}>{item.absent ?? 0}</span></div>
                  <div className="stat-row"><span>Nửa ngày</span><span className="val" style={{ color: 'var(--accent)' }}>{item.halfDay ?? 0}</span></div>
                  <div className="stat-row"><span>Tổng giờ làm</span><span className="val">{(item.totalWorkedHours ?? 0).toFixed(1)}h</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="card-body">
            <div className="empty-state">Không có dữ liệu cho khoảng thời gian này</div>
          </div>
        )}

        {!data && (
          <div className="card-body">
            <div className="empty-state">Chọn khoảng thời gian và nhấn "Tạo báo cáo"</div>
          </div>
        )}
      </div>
    </div>
  );
}
