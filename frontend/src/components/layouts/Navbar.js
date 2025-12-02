import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import { FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import LanguageSwitcher from "../LanguageSwitcher";
import { useTranslation } from "react-i18next";

const Navbar = ({ user, toggleSidebar }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getUserInitials = (user) => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user) => {
    return user?.name || user?.email || "User";
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          <FaBars size={20} />
        </button>
        <h1>
          <span
            role="button"
            tabIndex={0}
            onClick={() => navigate("/")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/");
            }}
            style={{ cursor: "pointer" }}
          >
            {t("app.title", "AIB-REPORTS")}
          </span>
        </h1>
      </div>
      <div className="navbar-right">
        <LanguageSwitcher className="navbar-langs" />
        <div
          className="user-profile"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="avatar">{getUserInitials(user)}</div>
          <span className="username">{getUserDisplayName(user)}</span>
          <button
            className="mobile-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileMenu(!showMobileMenu);
            }}
          >
            <FiMoreVertical size={20} />
          </button>
          {/* Logout moved to Sidebar (bottom center). No logout action in navbar per design. */}
        </div>
        {showMobileMenu && (
          <div className="mobile-menu">
            {/* Mobile menu kept for other actions; logout intentionally omitted here */}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
