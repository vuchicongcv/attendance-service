import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

function badge(s) {
  const m = { Present: 'badge-green', Late: 'badge-yellow', Absent: 'badge-red', HalfDay: 'badge-blue' };
  const v = { Present: 'Đi làm', Late: 'Đi muộn', Absent: 'Vắng', HalfDay: 'Nửa ngày' };
  return <span className={`badge ${m[s] || 'badge-gray'}`}>{v[s] || s}</span>;
}

function fd(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
function fdt(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }
function ft(d) { return d ? new Date(d).toLocaleTimeString('vi-VN') : '—'; }

const vnNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T').slice(0, 16);
const vnDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

export default function Attendance() {
  const { toast } = useToast();
  const [tab, setTab] = useState('checkin');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState(new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));

  useEffect(() => { loadEmps(); }, []);
  useEffect(() => { const i = setInterval(() => setClock(new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })), 1000); return () => clearInterval(i); }, []);

  const loadEmps = async () => {
    try { const d = await api('GET', '/api/HRCore/employees'); setEmployees(Array.isArray(d) ? d : []); }
    catch { setEmployees([]); }
  };

  // ─── Check In/Out ───
  const [ciEmp, setCiEmp] = useState('');
  const doCheckIn = async () => {
    if (!ciEmp) return toast('Chọn nhân viên', 'error');
    setLoading(true);
    try {
      const d = await api('POST', '/api/AttendanceRecords/check-in', { employeeId: ciEmp, checkIn: new Date().toISOString() });
      toast(`Check-in thành công: ${d.employeeName || ''} - ${d.status || ''}`, 'success');
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi check-in', 'error'); }
    finally { setLoading(false); }
  };
  const doCheckOut = async () => {
    if (!ciEmp) return toast('Chọn nhân viên', 'error');
    setLoading(true);
    try {
      const today = await api('GET', `/api/AttendanceRecords/employee/${ciEmp}/today`);
      const d = await api('PATCH', `/api/AttendanceRecords/${today.id}/check-out`, { checkOut: new Date().toISOString() });
      toast(`Check-out thành công: ${d.employeeName} - ${d.workedHours?.toFixed(1) || ''}h`, 'success');
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi check-out', 'error'); }
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
      const d = await api('GET', '/api/AttendanceRecords?' + params.join('&'));
      const items = (d.items || d).sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
      hSetData(items);
      hSetTotal(d.totalCount || 0);
      hSetPage(d.page || 1);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi tìm kiếm', 'error'); }
    finally { setLoading(false); }
  };

  // ─── By Employee ───
  const [beEmp, setBeEmp] = useState('');
  const [beData, setBeData] = useState(null);
  const [beTotal, setBeTotal] = useState(0);
  const [bePage, setBePage] = useState(1);

  const doViewEmp = async (p) => {
    if (!beEmp) return toast('Chọn nhân viên', 'error');
    setLoading(true);
    try {
      const d = await api('GET', `/api/AttendanceRecords/employee/${beEmp}/history?page=${p || bePage}&pageSize=${PAGE_SIZE}`);
      const items = (d.items || d).sort((a, b) => new Date(b.date) - new Date(a.date));
      setBeData(items);
      setBeTotal(d.totalCount || 0);
      setBePage(d.page || 1);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Edit ───
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const openEdit = (item) => {
    setEditItem(item);
    const capture = vnNow();
    setEditForm({
      checkIn: item.checkIn || capture,
      checkOut: item.checkOut || capture,
      status: item.status,
      note: item.note || '',
    });
  };
  const doEdit = async () => {
    setLoading(true);
    try {
      await api('PUT', `/api/AttendanceRecords/${editItem.id}`, {
        checkIn: new Date(editForm.checkIn).toISOString(),
        checkOut: new Date(editForm.checkOut).toISOString(),
        status: editForm.status,
        note: editForm.note || null,
      });
      setEditItem(null);
      toast('Cập nhật thành công', 'success');
      if (tab === 'history') doSearch(hPage);
      else doViewEmp(bePage);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi cập nhật', 'error'); }
    finally { setLoading(false); }
  };
  const doDelete = async (id) => {
    if (!confirm('Xóa bản ghi chấm công này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/AttendanceRecords/${id}`);
      toast('Đã xóa bản ghi', 'success');
      if (tab === 'history') doSearch(hPage);
      else doViewEmp(bePage);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi xóa', 'error'); }
    finally { setLoading(false); }
  };

  const renderTable = (data, pg, total, onPage) => (
    <>
      {data && data.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th><th>Ngày</th><th>Check In</th><th>Check Out</th><th>Trạng thái</th><th>Giờ làm</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.employeeCode}</strong><br /><small>{item.employeeName}</small></td>
                    <td>{fd(item.date)}</td>
                    <td>{item.checkIn ? fdt(item.checkIn) : '—'}</td>
                    <td>{item.checkOut ? fdt(item.checkOut) : '—'}</td>
                    <td>{badge(item.status)}</td>
                    <td>{item.workedHours ? item.workedHours.toFixed(1) + 'h' : '—'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-icon edit" onClick={() => openEdit(item)}>✏️</button>
                        <button className="btn-icon delete" onClick={() => doDelete(item.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pg} pageSize={PAGE_SIZE} totalCount={total} onPageChange={onPage} />
        </>
      ) : data ? <div className="empty-state">Không có dữ liệu</div> : null}
    </>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Chấm công</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmps}>Làm mới</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Check In / Out" active={tab === 'checkin'} onClick={() => setTab('checkin')} />
          <TabBtn label="Lịch sử" active={tab === 'history'} onClick={() => { setTab('history'); if (!hData) doSearch(1); }} />
          <TabBtn label="Theo nhân viên" active={tab === 'byemp'} onClick={() => setTab('byemp')} />
        </div>

        {tab === 'checkin' && (
          <div className="card-body">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--mono)' }}>{clock}</div>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
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
            {renderTable(hData, hPage, hTotal, p => { hSetPage(p); doSearch(p); })}
          </div>
        )}

        {tab === 'byemp' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label>Nhân viên</label>
                <select value={beEmp} onChange={e => { setBeEmp(e.target.value); setBeData(null); }}>
                  <option value="">Chọn nhân viên...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>[{e.employeeCode}] {e.fullName}{e.departmentName ? ` - ${e.departmentName}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn btn-primary w-full" onClick={() => doViewEmp(1)} disabled={loading || !beEmp}>
                  {loading ? <span className="spinner" /> : null} Xem lịch sử
                </button>
              </div>
            </div>
            {renderTable(beData, bePage, beTotal, p => { setBePage(p); doViewEmp(p); })}
          </div>
        )}
      </div>

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sửa chấm công</h3>
            <div className="modal-info">
              <div><strong>{editItem.employeeName}</strong> <small style={{ color: 'var(--muted-fg)' }}>({editItem.employeeCode})</small></div>
              <div style={{ marginTop: 4, color: 'var(--muted-fg)', fontSize: 12 }}>{fd(editItem.date)}</div>
            </div>
            <div className="field"><label>Check In</label><div className="time-display">{ft(editForm.checkIn)}</div></div>
            <div className="field"><label>Check Out</label><div className="time-display">{ft(editForm.checkOut)}</div></div>
            <div className="field">
              <label>Trạng thái</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option>Present</option><option>Late</option><option>Absent</option><option>HalfDay</option>
              </select>
            </div>
            <div className="field"><label>Ghi chú</label><input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="Ghi chú..." /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditItem(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={doEdit} disabled={loading}>{loading ? <span className="spinner" /> : null} Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
