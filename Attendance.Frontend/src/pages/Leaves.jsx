import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

const tVn = { Annual: 'Năm', Sick: 'Ốm', Personal: 'Cá nhân', Unpaid: 'Không lương', Maternity: 'Thai sản', Bereavement: 'Tang gia' };
const sVn = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Cancelled: 'Đã hủy' };
const sBadge = (s) => {
  const m = { Pending: 'badge-yellow', Approved: 'badge-green', Rejected: 'badge-red', Cancelled: 'badge-gray' };
  return <span className={`badge ${m[s] || 'badge-gray'}`}>{sVn[s] || s}</span>;
};
const fd = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function Leaves() {
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
  const [type, setType] = useState('Annual');
  const [reason, setReason] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const doCreate = async () => {
    if (!emp) return toast('Chọn nhân viên', 'error');
    if (!start || !end) return toast('Chọn ngày bắt đầu và kết thúc', 'error');
    setLoading(true);
    try {
      await api('POST', '/api/LeaveRequests', {
        employeeId: emp, leaveType: type,
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
        reason: reason || null,
      });
      toast('Đã gửi đơn nghỉ phép', 'success');
      setEmp(''); setReason(''); setStart(''); setEnd('');
      setTab('list');
      doList(1);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── List ───
  const [fEmp, setFEmp] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [list, setList] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const doList = async (p) => {
    setLoading(true);
    const params = [];
    if (fEmp) params.push(`employeeId=${fEmp}`);
    if (fStatus) params.push(`status=${fStatus}`);
    params.push(`page=${p || page}`, `pageSize=${PAGE_SIZE}`);
    try {
      const d = await api('GET', '/api/LeaveRequests?' + params.join('&'));
      const items = (d.items || d).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      await api('PATCH', `/api/LeaveRequests/${id}/approve`, { status, rejectionReason: null });
      toast(status === 'Approved' ? 'Đã duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép', 'success');
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
      leaveType: item.leaveType,
      startDate: item.startDate ? item.startDate.slice(0, 10) : '',
      endDate: item.endDate ? item.endDate.slice(0, 10) : '',
      reason: item.reason || '',
    });
  };
  const doEdit = async () => {
    setLoading(true);
    try {
      await api('PUT', `/api/LeaveRequests/${editItem.id}`, {
        leaveType: editForm.leaveType,
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: new Date(editForm.endDate).toISOString(),
        reason: editForm.reason || null,
      });
      setEditItem(null);
      toast('Cập nhật thành công', 'success');
      doList(page);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };
  const doDelete = async (id) => {
    if (!confirm('Xóa đơn nghỉ phép này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/LeaveRequests/${id}`);
      toast('Đã xóa đơn', 'success');
      doList(page);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Nghỉ phép</h2>
        <button className="btn btn-outline btn-sm" onClick={loadEmps}>Làm mới</button>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Tạo đơn" active={tab === 'create'} onClick={() => setTab('create')} />
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
            <div className="form-row">
              <div className="field">
                <label>Loại nghỉ</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  {Object.entries(tVn).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Lý do</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do (không bắt buộc)" />
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Ngày bắt đầu</label><input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="field"><label>Ngày kết thúc</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <button className="btn btn-success" onClick={doCreate} disabled={loading || !emp || !start || !end}>
              {loading ? <span className="spinner" /> : null} Gửi đơn
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
                <label>Trạng thái</label>
                <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }}>
                  <option value="">Tất cả</option>
                  {Object.entries(sVn).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => doList(1)} disabled={loading}>
              {loading ? <span className="spinner" /> : null} Tìm kiếm
            </button>

            {list && list.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>NV</th><th>Loại</th><th>Bắt đầu</th><th>Kết thúc</th><th>Ngày</th><th>Trạng thái</th><th>Lý do</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.employeeCode}</strong><br /><small>{item.employeeName}</small></td>
                          <td>{tVn[item.leaveType] || item.leaveType}</td>
                          <td>{fd(item.startDate)}</td>
                          <td>{fd(item.endDate)}</td>
                          <td>{item.durationDays ?? '—'}</td>
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
            <h3>Sửa đơn nghỉ phép</h3>
            <p style={{ fontSize: 13, marginBottom: 16, color: 'var(--muted-fg)' }}>{editItem.employeeName}</p>
            <div className="field">
              <label>Loại nghỉ</label>
              <select value={editForm.leaveType} onChange={e => setEditForm(f => ({ ...f, leaveType: e.target.value }))}>
                {Object.entries(tVn).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="field"><label>Bắt đầu</label><input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="field"><label>Kết thúc</label><input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} /></div>
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
