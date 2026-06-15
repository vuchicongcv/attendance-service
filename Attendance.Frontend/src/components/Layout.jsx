import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Tổng quan', icon: '📊' },
  { to: '/attendance', label: 'Chấm công', icon: '📋' },
  { to: '/leaves', label: 'Nghỉ phép', icon: '📝' },
  { to: '/overtime', label: 'Tăng ca', icon: '⏰' },
  { to: '/shifts', label: 'Ca làm việc', icon: '🔄' },
  { to: '/holidays', label: 'Ngày lễ', icon: '🎉' },
  { to: '/reports', label: 'Báo cáo', icon: '📈' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Attendance</h1>
          <span className="sidebar-sub">Hệ thống chấm công</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline w-full" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
