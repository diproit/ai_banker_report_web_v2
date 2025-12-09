import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
  logoText?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  userName = "User",
  userAvatar,
  logoText = "AIB Reports",
}) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string, title?: string) => {
    console.log("Navigating to:", path, title);
    navigate(path);
  };

  const handleLogoClick = () => {
    console.log("Logo clicked");
    navigate("/customer-list");
  };

  const handleUserClick = () => {
    console.log("User profile clicked");
    // You can add user profile navigation here if needed
  };

  return (
    <div className="layout">
      <Navbar
        userName={userName}
        userAvatar={userAvatar}
        logoText={logoText}
        onLogoClick={handleLogoClick}
        onUserClick={handleUserClick}
      />

      <div className="layout-body">
        <Sidebar onItemClick={handleNavigation} />

        <div className="layout-main">
          <main className="layout-content">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
