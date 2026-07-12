import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Users, Route, 
  Wrench, Droplet, PieChart, Settings, 
  Sun, Moon, Search, Menu 
} from 'lucide-react';
import '../styles/layout.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();

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

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2.2} /> },
    { path: '/vehicles', label: 'Fleet', icon: <Truck size={18} strokeWidth={2.2} /> },
    { path: '/drivers', label: 'Drivers', icon: <Users size={18} strokeWidth={2.2} /> },
    { path: '/trips', label: 'Trips', icon: <Route size={18} strokeWidth={2.2} /> },
    { path: '/maintenance', label: 'Maintenance', icon: <Wrench size={18} strokeWidth={2.2} /> },
    { path: '/fuel-logs', label: 'Fuel & Expenses', icon: <Droplet size={18} strokeWidth={2.2} /> },
    { path: '/reports', label: 'Analytics', icon: <PieChart size={18} strokeWidth={2.2} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} strokeWidth={2.2} /> }
  ];

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
              <Menu size={24} />
            </button>
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search..." 
              />
            </div>
          </div>
          
          <div className="topbar-right">
            <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">Raven K.</span>
                <span className="user-badge">Dispatcher <span style={{marginLeft: '4px', fontSize: '10px'}}>▼</span></span>
              </div>
              <div className="avatar">RK</div>
            </div>
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
