import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

const sVn = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Cancelled: 'Đã hủy' };
const sBadge = (s) => {
  const m = { Pending: 'badge-yellow', Approved: 'badge-green', Rejected: 'badge-red', Cancelled: 'badge-gray' };
  return <span className={`badge ${m[s] || 'badge-gray'}`}>{sVn[s] || s}</span>;
};
const fd = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fdt = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

export default function Overtime() {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadEmps(); }, []);

  const loadEmps = async () => {
    try { const d = await api('GET', '/api/HRCore/employees'); setEmployees(Array.isArray(d) ? d : []); }
    catch { setEmployees([]); }
  };

  // ─── Create ───
  const [emp, setEmp] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const doCreate = async () => {
    if (!emp) return toast('Chọn nhân viên', 'error');
    if (!date) return toast('Chọn ngày tăng ca', 'error');
    setLoading(true);
    try {
      await api('POST', '/api/OvertimeRecords', {
        employeeId: emp, date: new Date(date).toISOString(),
        startTime: start ? new Date(start).toISOString() : new Date().toISOString(),
        endTime: end ? new Date(end).toISOString() : new Date(Date.now() + 7200000).toISOString(),
        reason: reason || null,
      });
      toast('Đã ghi nhận tăng ca', 'success');
      setEmp(''); setDate(''); setStart(''); setEnd(''); setReason('');
      setTab('list');
      doList(1);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── List ───
  const [fEmp, setFEmp] = useState('');
  const [list, setList] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const doList = async (p) => {
    setLoading(true);
    const params = [`page=${p || page}`, `pageSize=${PAGE_SIZE}`];
    if (fEmp) params.unshift(`employeeId=${fEmp}`);
    try {
      const d = await api('GET', '/api/OvertimeRecords?' + params.join('&'));
      const items = (d.items || d).sort((a, b) => new Date(b.date) - new Date(a.date));
      setList(items);
      setTotal(d.totalCount || 0);
      setPage(d.page || 1);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Approve inline ───
  const doApprove = async (id, status) => {
    setLoading(true);
    try {
      await api('PATCH', `/api/OvertimeRecords/${id}/approve`, { status, rejectionReason: null });
      toast(status === 'Approved' ? 'Đã duyệt tăng ca' : 'Đã từ chối tăng ca', 'success');
      doList(page);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Edit ───
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      date: item.date ? item.date.slice(0, 10) : '',
      startTime: item.startTime ? item.startTime.slice(0, 16) : '',
      endTime: item.endTime ? item.endTime.slice(0, 16) : '',
      reason: item.reason || '',
    });
  };
  const doEdit = async () => {
    setLoading(true);
    try {
      await api('PUT', `/api/OvertimeRecords/${editItem.id}`, {
        startTime: editForm.startTime ? new Date(editForm.startTime).toISOString() : null,
        endTime: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
        reason: editForm.reason || null,
      });
      setEditItem(null);
      toast('Cập nhật thành công', 'success');
      doList(page);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };
  const doDelete = async (id) => {
    if (!confirm('Xóa bản ghi tăng ca này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/OvertimeRecords/${id}`);
      toast('Đã xóa', 'success');
      doList(page);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tăng ca</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmps}>Làm mới</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Tạo mới" active={tab === 'create'} onClick={() => setTab('create')} />
          <TabBtn label="Danh sách" active={tab === 'list'} onClick={() => { setTab('list'); if (!list) doList(1); }} />
        </div>

        {tab === 'create' && (
          <div className="card-body">
            <div className="field">
              <label>Nhân viên</label>
              <select value={emp} onChange={e => setEmp(e.target.value)}>
                <option value="">Chọn nhân viên...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>[{e.employeeCode}] {e.fullName}{e.departmentName ? ` - ${e.departmentName}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Ngày</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="form-row">
              <div className="field"><label>Bắt đầu</label><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="field"><label>Kết thúc</label><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <div className="field"><label>Lý do</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do tăng ca" /></div>
            <button className="btn btn-success" onClick={doCreate} disabled={loading || !emp || !date}>
              {loading ? <span className="spinner" /> : null} Ghi nhận
            </button>
          </div>
        )}

        {tab === 'list' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label>Nhân viên</label>
                <select value={fEmp} onChange={e => { setFEmp(e.target.value); setPage(1); }}>
                  <option value="">Tất cả</option>
                  {employees.map(e => <option key={e.id} value={e.id}>[{e.employeeCode}] {e.fullName}</option>)}
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button className="btn btn-primary w-full" onClick={() => doList(1)} disabled={loading}>
                  {loading ? <span className="spinner" /> : null} Tìm kiếm
                </button>
              </div>
            </div>

            {list && list.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>NV</th><th>Ngày</th><th>Bắt đầu</th><th>Kết thúc</th><th>Giờ</th><th>Trạng thái</th><th>Lý do</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.employeeCode}</strong><br /><small>{item.employeeName}</small></td>
                          <td>{fd(item.date)}</td>
                          <td>{fdt(item.startTime)}</td>
                          <td>{fdt(item.endTime)}</td>
                          <td>{item.hours ? item.hours.toFixed(1) + 'h' : '—'}</td>
                          <td>{sBadge(item.status)}</td>
                          <td><small>{item.reason || '—'}</small></td>
                          <td>
                            <div className="actions" style={{ flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {item.status === 'Pending' && <>
                                  <button className="btn-icon" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }} onClick={() => doApprove(item.id, 'Approved')} title="Duyệt">✓</button>
                                  <button className="btn-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }} onClick={() => doApprove(item.id, 'Rejected')} title="Từ chối">✗</button>
                                </>}
                                <button className="btn-icon edit" onClick={() => openEdit(item)}>✏️</button>
                                <button className="btn-icon delete" onClick={() => doDelete(item.id)}>🗑️</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={p => { setPage(p); doList(p); }} />
              </>
            ) : list ? <div className="empty-state">Không có dữ liệu</div> : null}
          </div>
        )}
      </div>

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sửa tăng ca</h3>
            <p style={{ fontSize: 13, marginBottom: 16, color: 'var(--muted-fg)' }}>{editItem.employeeName} - {fd(editItem.date)}</p>
            <div className="field"><label>Ngày</label><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="form-row">
              <div className="field"><label>Bắt đầu</label><input type="datetime-local" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="field"><label>Kết thúc</label><input type="datetime-local" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="field"><label>Lý do</label><input value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))} /></div>
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
