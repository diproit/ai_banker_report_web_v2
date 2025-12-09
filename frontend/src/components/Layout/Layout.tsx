import React from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
  logoText?: string;
  onNavigate?: (path: string, title?: string) => void;
  onLogoClick?: () => void;
  onUserClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  userName = "John Doe",
  userAvatar,
  logoText = "MyApp",
  onNavigate,
  onLogoClick,
  onUserClick,
}) => {
  const handleNavigation = (path: string, title?: string) => {
    console.log("Navigating to:", path, title);
    onNavigate?.(path, title);
  };

  return (
    <div className="layout">
      <Navbar
        userName={userName}
        userAvatar={userAvatar}
        logoText={logoText}
        onLogoClick={onLogoClick}
        onUserClick={onUserClick}
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
