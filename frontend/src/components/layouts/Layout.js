import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Auto-close sidebar on design-report route
  useEffect(() => {
    if (location.pathname.startsWith('/design-report')) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="layout-container">
      <Navbar user={user} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;