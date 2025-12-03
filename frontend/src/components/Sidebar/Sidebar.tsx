import React, { useState } from "react";
import "./Sidebar.css";

interface SidebarProps {
  onItemClick?: (path: string, title?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const [activeItem, setActiveItem] = useState<string>("");

  const handleItemClick = () => {
    setActiveItem("/customer-list");
    onItemClick?.("/customer-list", "Customer List");
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          <li className="sidebar-menu-item">
            <div
              className={`sidebar-item ${
                activeItem === "/customer-list" ? "active" : ""
              }`}
              onClick={handleItemClick}
            >
              <div className="sidebar-item-content">
                <span className="sidebar-label">Customer List</span>
              </div>
            </div>
          </li>
          <li className="sidebar-menu-item">
            <div
              className={`sidebar-item ${
                activeItem === "/loan-pastdue-reports" ? "active" : ""
              }`}
              onClick={() => {
                setActiveItem("/loan-pastdue-reports");
                onItemClick?.("/loan-pastdue-reports", "Loan Past Due Reports");
              }}
            >
              <div className="sidebar-item-content">
                <span className="sidebar-label">Loan Past Due Reports</span>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
