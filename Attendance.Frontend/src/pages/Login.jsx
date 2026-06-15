import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenDisplay, setTokenDisplay] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Đang lấy token...');
    try {
      const res = await api('POST', '/api/Auth/login', { username, password });
      setTokenDisplay(res.token);
      login(res.token);
      setStatus('Đăng nhập thành công!');
    } catch (err) {
      setStatus('Lỗi: ' + (err.message || err.data?.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            attendance <span className="gradient">service</span>
          </div>
          <form onSubmit={handleLogin}>
            <div className="login-section">
              <h2 className="login-section-title">I. Ủy quyền</h2>
              <div className="field">
                <label>Tài khoản</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Token</label>
                <textarea
                  rows={3}
                  value={tokenDisplay || 'Đang chờ mã thông báo...'}
                  readOnly
                  placeholder="Token will appear here"
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Nhận Token'}
              </button>
              {status && (
                <p className={`token-status ${status.includes('Lỗi') ? 'error' : ''}`}>
                  {status}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
