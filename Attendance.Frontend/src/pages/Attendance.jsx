import { useState, useEffect } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

function statusBadge(s) {
  const map = { Present: 'badge-green', Late: 'badge-yellow', Absent: 'badge-red', HalfDay: 'badge-blue' };
  const vn = { Present: 'Đi làm', Late: 'Đi muộn', Absent: 'Vắng', HalfDay: 'Nửa ngày' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{vn[s] || s}</span>;
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export default function Attendance() {
  const [tab, setTab] = useState('checkin');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => { loadEmps(); }, []);

  const loadEmps = async () => {
    try { const d = await api('GET', '/api/HRCore/employees'); setEmployees(Array.isArray(d) ? d : []); }
    catch { setEmployees([]); }
  };

  const showResult = (type, data) => setResult({ type, data });
  const clearResult = () => setResult(null);

  // ─── Check In/Out ───
  const [ciEmp, setCiEmp] = useState('');
  const doCheckIn = async () => {
    if (!ciEmp) return;
    setLoading(true);
    try { showResult('success', await api('POST', '/api/AttendanceRecords/check-in', { employeeId: ciEmp, checkIn: new Date().toISOString() })); }
    catch (e) { showResult('error', e.data || e.message); }
    finally { setLoading(false); }
  };
  const doCheckOut = async () => {
    if (!ciEmp) return;
    setLoading(true);
    try {
      const today = await api('GET', `/api/AttendanceRecords/employee/${ciEmp}/today`);
      showResult('success', await api('PATCH', `/api/AttendanceRecords/${today.id}/check-out`, { checkOut: new Date().toISOString() }));
    } catch (e) { showResult('error', e.data || e.message); }
    finally { setLoading(false); }
  };

  // ─── History ───
  const [hFrom, hSetFrom] = useState('');
  const [hTo, hSetTo] = useState('');
  const [hStatus, hSetStatus] = useState('');
  const [hPage, hSetPage] = useState(1);
  const [hData, hSetData] = useState(null);
  const [hTotal, hSetTotal] = useState(0);

  const doSearch = async (p) => {
    setLoading(true);
    const params = [];
    if (hFrom) params.push(`fromDate=${new Date(hFrom).toISOString()}`);
    if (hTo) params.push(`toDate=${new Date(hTo).toISOString()}`);
    if (hStatus) params.push(`status=${hStatus}`);
    params.push(`page=${p || hPage}`, `pageSize=${PAGE_SIZE}`);
    try {
      const data = await api('GET', '/api/AttendanceRecords?' + params.join('&'));
      hSetData(data.items || data);
      hSetTotal(data.totalCount || 0);
      hSetPage(data.page || 1);
      clearResult();
    } catch (e) { showResult('error', e.data || e.message); }
    finally { setLoading(false); }
  };

  const onHistoryPage = (p) => { hSetPage(p); doSearch(p); };

  // ─── Edit Modal ───
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      checkIn: item.checkIn ? fmtDate(item.checkIn) + 'T' + new Date(item.checkIn).toTimeString().slice(0, 5) : '',
      checkOut: item.checkOut ? fmtDate(item.checkOut) + 'T' + new Date(item.checkOut).toTimeString().slice(0, 5) : '',
      status: item.status,
      note: item.note || '',
    });
  };
  const doEdit = async () => {
    setLoading(true);
    try {
      await api('PUT', `/api/AttendanceRecords/${editItem.id}`, {
        checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
        checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
        status: editForm.status,
        note: editForm.note || null,
      });
      setEditItem(null);
      doSearch(hPage);
      showResult('success', 'Cập nhật thành công');
    } catch (e) { showResult('error', e.data || e.message); }
    finally { setLoading(false); }
  };
  const doDelete = async (id) => {
    if (!confirm('Xóa bản ghi chấm công này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/AttendanceRecords/${id}`);
      doSearch(hPage);
      showResult('success', 'Đã xóa bản ghi');
    } catch (e) { showResult('error', e.data || e.message); }
    finally { setLoading(false); }
  };

  const renderRes = () => {
    if (!result) return null;
    return (
      <div className="output">
        <span className={result.type === 'success' ? 'success' : 'error'}>
          {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}
        </span>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Chấm công</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmps}>Làm mới nhân viên</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Check In / Out" active={tab === 'checkin'} onClick={() => setTab('checkin')} />
          <TabBtn label="Lịch sử" active={tab === 'history'} onClick={() => { setTab('history'); if (!hData) doSearch(1); }} />
          <TabBtn label="Theo nhân viên" active={tab === 'byemp'} onClick={() => setTab('byemp')} />
        </div>

        {tab === 'checkin' && (
          <div className="card-body">
            <div className="field">
              <label>Nhân viên</label>
              <select value={ciEmp} onChange={e => setCiEmp(e.target.value)}>
                <option value="">Chọn nhân viên...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>[{e.employeeCode}] {e.fullName}{e.departmentName ? ` - ${e.departmentName}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <button className="btn btn-success flex-1" onClick={doCheckIn} disabled={loading || !ciEmp}>
                {loading ? <span className="spinner" /> : null} Check In
              </button>
              <button className="btn btn-warning flex-1" onClick={doCheckOut} disabled={loading || !ciEmp}>
                {loading ? <span className="spinner" /> : null} Check Out
              </button>
            </div>
            {renderRes()}
          </div>
        )}

        {tab === 'history' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field"><label>Từ ngày</label><input type="date" value={hFrom} onChange={e => { hSetFrom(e.target.value); hSetPage(1); }} /></div>
              <div className="field"><label>Đến ngày</label><input type="date" value={hTo} onChange={e => { hSetTo(e.target.value); hSetPage(1); }} /></div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Trạng thái</label>
                <select value={hStatus} onChange={e => { hSetStatus(e.target.value); hSetPage(1); }}>
                  <option value="">Tất cả</option>
                  <option>Present</option><option>Late</option><option>Absent</option><option>HalfDay</option>
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn btn-primary w-full" onClick={() => doSearch(1)} disabled={loading}>
                  {loading ? <span className="spinner" /> : null} Tìm kiếm
                </button>
              </div>
            </div>

            {hData && Array.isArray(hData) && hData.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>NV</th><th>Ngày</th><th>Check In</th><th>Check Out</th><th>Trạng thái</th><th>Giờ làm</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {hData.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.employeeCode}</strong><br /><small>{item.employeeName}</small></td>
                          <td>{fmtDate(item.date)}</td>
                          <td>{item.checkIn ? fmt(item.checkIn) : '—'}</td>
                          <td>{item.checkOut ? fmt(item.checkOut) : '—'}</td>
                          <td>{statusBadge(item.status)}</td>
                          <td>{item.workedHours ? item.workedHours.toFixed(1) + 'h' : '—'}</td>
                          <td>
                            <div className="actions">
                              <button className="btn-icon edit" title="Sửa" onClick={() => openEdit(item)}>✏️</button>
                              <button className="btn-icon delete" title="Xóa" onClick={() => doDelete(item.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={hPage} pageSize={PAGE_SIZE} totalCount={hTotal} onPageChange={onHistoryPage} />
              </>
            ) : hData ? (
              <div className="empty-state">Không có dữ liệu</div>
            ) : null}

            {renderRes()}
          </div>
        )}

        {tab === 'byemp' && (
          <div className="card-body">
            <div className="field">
              <label>Nhân viên</label>
              <select id="att-emp" value={ciEmp} onChange={e => setCiEmp(e.target.value)}>
                <option value="">Chọn nhân viên...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>[{e.employeeCode}] {e.fullName}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading || !ciEmp} onClick={async () => {
              if (!ciEmp) return;
              setLoading(true);
              try { showResult('success', await api('GET', `/api/AttendanceRecords/employee/${ciEmp}/history`)); }
              catch (e) { showResult('error', e.data || e.message); }
              finally { setLoading(false); }
            }}>
              {loading ? <span className="spinner" /> : null} Xem lịch sử
            </button>
            {renderRes()}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sửa bản ghi chấm công</h3>
            <p style={{ fontSize: 13, marginBottom: 16, color: 'var(--muted-fg)' }}>
              {editItem.employeeName} - {fmtDate(editItem.date)}
            </p>
            <div className="field"><label>Check In</label><input type="datetime-local" value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
            <div className="field"><label>Check Out</label><input type="datetime-local" value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            <div className="field">
              <label>Trạng thái</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option>Present</option><option>Late</option><option>Absent</option><option>HalfDay</option>
              </select>
            </div>
            <div className="field"><label>Ghi chú</label><input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="Ghi chú..." /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditItem(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={doEdit} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
