import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

function TabBtn({ label, active, onClick }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

export default function Shifts() {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState(null);

  // ─── Create ───
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [late, setLate] = useState('30');

  const doCreate = async () => {
    if (!code) return toast('Nhập mã ca', 'error');
    if (!name) return toast('Nhập tên ca', 'error');
    setLoading(true);
    try {
      await api('POST', '/api/Shifts', {
        shiftCode: code, shiftName: name,
        startTime: start + ':00', endTime: end + ':00',
        allowedLateMinutes: parseInt(late) || 30,
      });
      toast('Đã thêm ca làm việc', 'success');
      setCode(''); setName(''); setStart(''); setEnd(''); setLate('30');
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── List ───
  const doList = async () => {
    setLoading(true);
    try {
      const d = await api('GET', '/api/Shifts');
      setList(Array.isArray(d) ? d : []);
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  const doSeed = async () => {
    setLoading(true);
    try {
      await api('POST', '/api/Shifts/seed');
      toast('Đã tạo ca mặc định', 'success');
      doList();
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  // ─── Delete ───
  const doDelete = async (id) => {
    if (!confirm('Xóa ca làm việc này?')) return;
    setLoading(true);
    try {
      await api('DELETE', `/api/Shifts/${id}`);
      toast('Đã xóa ca làm việc', 'success');
      doList();
    } catch (e) { toast(e.data?.message || e.message || 'Lỗi', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Ca làm việc</h2>
      </div>

      <div className="card">
        <div className="tabs">
          <TabBtn label="Tạo ca" active={tab === 'create'} onClick={() => setTab('create')} />
          <TabBtn label="Danh sách" active={tab === 'list'} onClick={() => { setTab('list'); if (!list) doList(); }} />
        </div>

        {tab === 'create' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field"><label>Mã ca</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="VD: MORN" /></div>
              <div className="field"><label>Tên ca</label><input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Ca sáng" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Giờ bắt đầu</label><input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="field"><label>Giờ kết thúc</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <div className="field"><label>Số phút cho phép đi muộn</label><input type="number" value={late} onChange={e => setLate(e.target.value)} /></div>
            <button className="btn btn-success" onClick={doCreate} disabled={loading || !code || !name}>
              {loading ? <span className="spinner" /> : null} Thêm ca
            </button>
          </div>
        )}

        {tab === 'list' && (
          <div className="card-body">
            <div className="form-row">
              <button className="btn btn-primary" onClick={doList} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Xem tất cả
              </button>
              <button className="btn btn-outline" onClick={doSeed} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Tạo ca mặc định
              </button>
            </div>

            {list && list.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã</th><th>Tên ca</th><th>Bắt đầu</th><th>Kết thúc</th><th>Phép đi muộn</th><th>Hoạt động</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.shiftCode}</strong></td>
                        <td>{item.shiftName}</td>
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>
                        <td>{item.allowedLateMinutes} phút</td>
                        <td>{item.isActive ? '✅' : '❌'}</td>
                        <td><button className="btn-icon delete" onClick={() => doDelete(item.id)}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : list ? <div className="empty-state">Chưa có ca làm việc nào</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
