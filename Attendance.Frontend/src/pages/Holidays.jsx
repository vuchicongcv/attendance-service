import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

const fd = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function Holidays() {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState(null);

  // ─── Create ───
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [recurring, setRecurring] = useState(false);

  const doCreate = async () => {
    if (!name) return toast('Nhập tên ngày lễ', 'error');
    if (!date) return toast('Chọn ngày', 'error');
    setLoading(true);
    try {
      await api('POST', '/api/Holidays', {
        holidayName: name,
        date: new Date(date).toISOString(),
        isRecurring: recurring,
      });
      toast('Đã thêm ngày lễ', 'success');
      setName(''); setDate(''); setRecurring(false);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── List ───
  const doList = async () => {
    setLoading(true);
    try {
      const d = await api('GET', '/api/Holidays');
      setList(Array.isArray(d) ? d : []);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Edit ───
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      holidayName: item.holidayName,
      date: item.date ? item.date.slice(0, 10) : '',
      isRecurring: item.isRecurring || false,
    });
  };
  const doEdit = async () => {
    setLoading(true);
    try {
      await api('PUT', `/api/Holidays/${editItem.id}`, {
        holidayName: editForm.holidayName,
        date: new Date(editForm.date).toISOString(),
        isRecurring: editForm.isRecurring,
      });
      setEditItem(null);
      toast('Cập nhật thành công', 'success');
      doList();
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Delete ───
  const doDelete = async (id) => {
    if (!confirm('Xóa ngày lễ này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/Holidays/${id}`);
      toast('Đã xóa ngày lễ', 'success');
      doList();
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Ngày lễ</h2>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Thêm ngày lễ" active={tab === 'create'} onClick={() => setTab('create')} />
          <TabBtn label="Danh sách" active={tab === 'list'} onClick={() => { setTab('list'); if (!list) doList(); }} />
        </div>

        {tab === 'create' && (
          <div className="card-body">
            <div className="field"><label>Tên ngày lễ</label><input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Tết Nguyên Đán" /></div>
            <div className="form-row">
              <div className="field"><label>Ngày</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                  Lặp lại hàng năm
                </label>
              </div>
            </div>
            <button className="btn btn-success" onClick={doCreate} disabled={loading || !name || !date}>
              {loading ? <span className="spinner" /> : null} Thêm
            </button>
          </div>
        )}

        {tab === 'list' && (
          <div className="card-body">
            <button className="btn btn-primary" onClick={doList} disabled={loading}>
              {loading ? <span className="spinner" /> : null} Xem tất cả
            </button>

            {list && list.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên ngày lễ</th><th>Ngày</th><th>Lặp lại</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.holidayName}</strong></td>
                        <td>{fd(item.date)}</td>
                        <td>{item.isRecurring ? '✅ Hàng năm' : '—'}</td>
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
            ) : list ? <div className="empty-state">Chưa có ngày lễ nào</div> : null}
          </div>
        )}
      </div>

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sửa ngày lễ</h3>
            <div className="field"><label>Tên ngày lễ</label><input value={editForm.holidayName} onChange={e => setEditForm(f => ({ ...f, holidayName: e.target.value }))} /></div>
            <div className="field"><label>Ngày</label><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="field">
              <label className="checkbox-label">
                <input type="checkbox" checked={editForm.isRecurring} onChange={e => setEditForm(f => ({ ...f, isRecurring: e.target.checked }))} />
                Lặp lại hàng năm
              </label>
            </div>
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
