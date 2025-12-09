import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import "./Navbar.css";

interface NavbarProps {
  userName?: string;
  userAvatar?: string;
  logoText?: string;
  onLogoClick?: () => void;
  onUserClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  userName = "User",
  userAvatar,
  logoText = "AIB Reports",
  onLogoClick,
  onUserClick,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick();
    } else {
      toggleDropdown();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={onLogoClick}>
        {logoText}
      </div>

      <div className="navbar-right">
        <span className="navbar-user-name">{userName}</span>
        <div className="navbar-user-menu" ref={dropdownRef}>
          <div className="navbar-avatar" onClick={handleUserClick}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {showDropdown && (
            <div className="user-dropdown">
              <div className="dropdown-item user-info">
                <div className="user-info-name">{userName}</div>
                {user?.user_role && (
                  <div className="user-info-role">{user.user_role}</div>
                )}
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={handleLogout}>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
