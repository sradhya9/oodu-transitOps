import { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Users, Route, 
  Wrench, Droplet, PieChart, Settings, 
  Sun, Moon, Search, Menu, LogOut
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/layout.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Define all links with required roles
  const allNavLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { path: '/vehicles', label: 'Fleet', icon: <Truck size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { path: '/drivers', label: 'Drivers', icon: <Users size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Safety Officer', 'Dispatcher'] },
    { path: '/trips', label: 'Trips', icon: <Route size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { path: '/maintenance', label: 'Maintenance', icon: <Wrench size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Financial Analyst'] },
    { path: '/fuel-logs', label: 'Expenses', icon: <Droplet size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Financial Analyst', 'Dispatcher'] },
    { path: '/reports', label: 'Reports', icon: <PieChart size={18} strokeWidth={1.5} />, roles: ['Fleet Manager', 'Safety Officer', 'Financial Analyst'] },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} strokeWidth={1.5} />, roles: ['Fleet Manager'] }
  ];

  // Filter links based on current user role
  const navLinks = allNavLinks.filter(link => user && link.roles.includes(user.role));

  return (
    <div className="layout-container">
      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">TransitOps</Link>
        </div>
        <nav className="nav-menu">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="search-container">
            <button className="menu-toggle" onClick={toggleSidebar}>
              <Menu size={24} strokeWidth={1.5} />
            </button>
            <div className="search-wrapper">
              <Search size={16} strokeWidth={1.5} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search..." 
              />
            </div>
          </div>
          
          <div className="topbar-right">
            <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
              {theme === 'light' ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
            </button>
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.name || 'Loading...'}</span>
                <span className="user-badge">{user?.role || 'User'}</span>
              </div>
              <div className="avatar">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="theme-toggle-btn" 
              aria-label="Logout" 
              style={{ marginLeft: '8px' }}
            >
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
