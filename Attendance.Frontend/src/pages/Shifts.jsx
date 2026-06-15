import { useState } from 'react';
import { api } from '../api';

function TabButton({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Shifts() {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);

  // Tab: Create
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [late, setLate] = useState('30');

  const handleCreate = async () => {
    if (!code || !name) return;
    setLoading(true);
    try {
      const data = await api('POST', '/api/Shifts', {
        shiftCode: code, shiftName: name,
        startTime: start + ':00', endTime: end + ':00',
        allowedLateMinutes: parseInt(late) || 30,
      });
      setOutput({ type: 'success', data });
      setCode(''); setName(''); setStart(''); setEnd(''); setLate('30');
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: List
  const handleList = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/api/Shifts');
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const data = await api('POST', '/api/Shifts/seed');
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Shifts</h2>
      </div>

      <div className="card">
        <div className="tabs">
          <TabButton label="Create" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <TabButton label="List" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
        </div>

        {activeTab === 'create' && (
          <div className="card-body">
            <div className="form-row">
              <div className="field"><label>Shift Code</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="MORN" /></div>
              <div className="field"><label>Shift Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Shift" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Start Time</label><input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="field"><label>End Time</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <div className="field"><label>Allowed Late (mins)</label><input type="number" value={late} onChange={e => setLate(e.target.value)} /></div>
            <button className="btn btn-success" onClick={handleCreate} disabled={loading || !code || !name}>
              {loading ? <span className="spinner" /> : null} Add Shift
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="card-body">
            <div className="form-row">
              <button className="btn btn-primary" onClick={handleList} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Get All Shifts
              </button>
              <button className="btn btn-outline" onClick={handleSeed} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Seed Default Shifts
              </button>
            </div>
          </div>
        )}

        <div className="card-body">
          <div className="output">
            {output ? (
              <span className={output.type === 'success' ? 'success' : 'error'}>
                {typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data)}
              </span>
            ) : (
              <span className="muted">Create or list shifts...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
