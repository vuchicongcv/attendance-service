import { useState } from 'react';
import { api } from '../api';

function TabButton({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function Holidays() {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);

  // Tab: Create
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('');
  const [holRecurring, setHolRecurring] = useState(false);

  const handleCreate = async () => {
    if (!holName || !holDate) return;
    setLoading(true);
    try {
      const data = await api('POST', '/api/Holidays', {
        holidayName: holName,
        date: new Date(holDate).toISOString(),
        isRecurring: holRecurring,
      });
      setOutput({ type: 'success', data });
      setHolName(''); setHolDate(''); setHolRecurring(false);
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  // Tab: List
  const handleList = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/api/Holidays');
      setOutput({ type: 'success', data });
    } catch (e) {
      setOutput({ type: 'error', data: e.data || e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Holidays</h2>
      </div>

      <div className="card">
        <div className="tabs">
          <TabButton label="Create" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <TabButton label="List" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
        </div>

        {activeTab === 'create' && (
          <div className="card-body">
            <div className="field"><label>Holiday Name</label><input value={holName} onChange={e => setHolName(e.target.value)} placeholder="e.g. Tet Holiday" /></div>
            <div className="form-row">
              <div className="field"><label>Date</label><input type="date" value={holDate} onChange={e => setHolDate(e.target.value)} /></div>
              <div className="field">
                <label className="checkbox-label">
                  <input type="checkbox" checked={holRecurring} onChange={e => setHolRecurring(e.target.checked)} />
                  Recurring yearly
                </label>
              </div>
            </div>
            <button className="btn btn-success" onClick={handleCreate} disabled={loading || !holName || !holDate}>
              {loading ? <span className="spinner" /> : null} Add Holiday
            </button>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="card-body">
            <button className="btn btn-primary" onClick={handleList} disabled={loading}>
              {loading ? <span className="spinner" /> : null} Get All Holidays
            </button>
          </div>
        )}

        <div className="card-body">
          <div className="output">
            {output ? (
              <span className={output.type === 'success' ? 'success' : 'error'}>
                {typeof output.data === 'object' ? JSON.stringify(output.data, null, 2) : String(output.data)}
              </span>
            ) : (
              <span className="muted">Create or list holidays...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
