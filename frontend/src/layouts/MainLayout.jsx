import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import '../styles/layout.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/vehicles', label: 'Vehicles' },
    { path: '/drivers', label: 'Drivers' },
    { path: '/trips', label: 'Trips' },
    { path: '/maintenance', label: 'Maintenance' },
    { path: '/fuel-logs', label: 'Fuel Logs' },
    { path: '/expenses', label: 'Expenses' },
    { path: '/reports', label: 'Reports' },
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
        {/* Top Navbar */}
        <header className="topbar">
          <button className="menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="topbar-right">
            <div className="user-profile">
              <span className="user-name">Admin</span>
              <div className="avatar">A</div>
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
