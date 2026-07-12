import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import '../styles/layout.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/vehicles', label: 'Fleet' },
    { path: '/drivers', label: 'Drivers' },
    { path: '/trips', label: 'Trips' },
    { path: '/maintenance', label: 'Maintenance' },
    { path: '/fuel-logs', label: 'Fuel & Expenses' },
    { path: '/reports', label: 'Analytics' },
    { path: '/settings', label: 'Settings' }
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
              ☰
            </button>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
            />
          </div>

          <div className="topbar-right">
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">Raven K.</span>
                <span className="user-badge">Dispatcher <span style={{ marginLeft: '4px', fontSize: '10px' }}>▼</span></span>
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
