import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronRight,
  FiX,
  FiSettings,
  FiPlus,
  FiSave,
  FiArrowLeft,
} from "react-icons/fi";
import { Edit, Trash2, Expand, Shrink, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "./Sidebar.css";
import BASE_URL from "../../config/api";
import { get, post, put, del } from "../../clients/apiClient";
import { useTranslation } from "react-i18next";

// Use backend translation endpoint instead of client-side library

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { t, i18n } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [loadedSubtrees, setLoadedSubtrees] = useState({});
  const [showMenuManager, setShowMenuManager] = useState(false);
  const manageBtnRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [availableUrls, setAvailableUrls] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [showUrlDropdown, setShowUrlDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [parentOptions, setParentOptions] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    title_si: "",
    title_ta: "",
    title_tl: "",
    title_th: "",
    url: "",
    parent_id: null,
    group_name: "",
    sort_order: 0,
    is_active: true,
    base_query: "",
    report_name: "",
  });
  // Track the base URL selected from dropdown
  const [baseUrl, setBaseUrl] = useState("");
  const [expandedFields, setExpandedFields] = useState({
    base_query: false,
    multi_language_titles: false,
  });
  // State for translation loading
  const [translating, setTranslating] = useState(false);

  // State to track if form has been modified
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);

  // Check if current user is admin
  const isAdmin = user?.user_role === "ADMIN";

  useEffect(() => {
    if (showMenuManager) {
      fetchAvailableUrls();
      fetchAvailableGroups();
      generateParentOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMenuManager, menuItems]);

  // Compute popup position next to manage button when manager opens
  useEffect(() => {
    if (showMenuManager && manageBtnRef.current) {
      const rect = manageBtnRef.current.getBoundingClientRect();
      // Position popup to the right of the sidebar with no gap
      const top = rect.top + window.scrollY - 8; // slight offset
      const sidebarWidth = isOpen ? (showMenuManager ? 340 : 250) : 0;
      // No additional gap - align directly with sidebar edge
      setPopupStyle({ top: `${top}px`, left: `${sidebarWidth}px` });
    } else {
      setPopupStyle({});
    }
  }, [showMenuManager, isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".url-combobox")) {
        setShowUrlDropdown(false);
      }
      if (!event.target.closest(".group-combobox")) {
        setShowGroupDropdown(false);
      }
    };

    if (showUrlDropdown || showGroupDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUrlDropdown, showGroupDropdown]);

  // Detect form changes when editing
  useEffect(() => {
    if (editingItem && originalFormData) {
      // Compare current formData with originalFormData
      const hasChanges =
        formData.title !== originalFormData.title ||
        formData.title_si !== originalFormData.title_si ||
        formData.title_ta !== originalFormData.title_ta ||
        formData.title_tl !== originalFormData.title_tl ||
        formData.title_th !== originalFormData.title_th ||
        formData.url !== originalFormData.url ||
        formData.parent_id !== originalFormData.parent_id ||
        formData.group_name !== originalFormData.group_name ||
        formData.sort_order !== originalFormData.sort_order ||
        formData.is_active !== originalFormData.is_active ||
        formData.base_query !== originalFormData.base_query ||
        formData.report_name !== originalFormData.report_name;

      setHasFormChanges(hasChanges);
    }
  }, [formData, originalFormData, editingItem]);

  // Generate hierarchical parent options for dropdown
  const generateParentOptions = () => {
    const options = [
      {
        id: null,
        title: t("menu.top_level", "Top Level (No Parent)"),
        level: 0,
      },
    ];

    const flattenItems = (items, level = 1) => {
      items.forEach((item) => {
        options.push({
          id: item.id,
          title: `${"--".repeat(level)} ${item.title}`,
          level: level,
        });
        if (item.children && item.children.length > 0) {
          flattenItems(item.children, level + 1);
        }
      });
    };

    flattenItems(menuItems);
    setParentOptions(options);
  };

  // Auto-translate function
  const autoTranslateTitle = async (englishTitle) => {
    if (!englishTitle.trim()) {
      // Clear all translation fields if English title is empty
      setFormData((prev) => ({
        ...prev,
        title_si: "",
        title_ta: "",
        title_tl: "",
        title_th: "",
      }));
      return;
    }

    setTranslating(true);

    try {
      // Call backend translate endpoint to avoid client-side CORS/key issues
      const targets = ["Sinhala", "Tamil", "Tagalog", "Thai"];
      const result = await post("/chat/translate", {
        text: englishTitle,
        targets,
      });

      if (!result.success || !result.translations) {
        throw new Error(result.error || "Translation failed");
      }

      // Only overwrite fields if currently empty (don't clobber manual edits)
      setFormData((prev) => ({
        ...prev,
        title_si:
          prev.title_si ||
          result.translations.Sinhala?.translation ||
          prev.title_si,
        title_ta:
          prev.title_ta ||
          result.translations.Tamil?.translation ||
          prev.title_ta,
        title_tl:
          prev.title_tl ||
          result.translations.Tagalog?.translation ||
          prev.title_tl,
        title_th:
          prev.title_th ||
          result.translations.Thai?.translation ||
          prev.title_th,
      }));

      // Auto-expand the multi-language titles section when translations are generated
      if (!expandedFields.multi_language_titles) {
        setExpandedFields((prev) => ({
          ...prev,
          multi_language_titles: true,
        }));
      }
    } catch (error) {
      console.error("Error in auto-translation:", error);
      toast.error(
        "Auto-translation failed. Please check your internet connection."
      );
    } finally {
      setTranslating(false);
    }
  };

  // Note: auto-translation will be performed only when the user clicks the
  // "Auto-translate" button. We intentionally no longer auto-translate on
  // typing to avoid surprising overwrites and to match the user's request.

  const fetchRootMenuItems = useCallback(async () => {
    try {
      // Include language parameter from i18n context
      const language = i18n.language || "en";
      const data = await get(`/nav/menu?lang=${language}`);
      console.log(`Root menu items (${language}):`, data);
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching root menu items:", error);
    }
  }, [i18n.language]); // Dependencies for useCallback

  // Effect to fetch menu items when language changes
  useEffect(() => {
    fetchRootMenuItems();
  }, [fetchRootMenuItems]);

  const fetchAvailableUrls = async () => {
    try {
      const data = await get("/nav/menu/urls");
      console.log("Available URLs:", data.data);
      setAvailableUrls(data.data || []);
    } catch (error) {
      console.error("Error fetching available URLs:", error);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      const data = await get("/nav/menu/groups");
      console.log("Available Groups:", data.data);
      setAvailableGroups(data.data || []);
    } catch (error) {
      console.error("Error fetching available groups:", error);
    }
  };

  const fetchSubtree = async (itemId) => {
    try {
      if (loadedSubtrees[itemId]) return;

      // Include language parameter for subtree as well
      const language = i18n.language || "en";
      const data = await get(`/nav/menu/subtree/${itemId}?lang=${language}`);
      // console.log(`Subtree for item ${itemId}:`, data.data);

      setMenuItems((prevItems) => {
        const updateItems = (items) => {
          return items.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                children: data.data[0]?.children || [],
              };
            }
            if (item.children && item.children.length > 0) {
              return {
                ...item,
                children: updateItems(item.children),
              };
            }
            return item;
          });
        };

        return updateItems(prevItems);
      });

      setLoadedSubtrees((prev) => ({
        ...prev,
        [itemId]: true,
      }));
    } catch (error) {
      console.error(`Error fetching subtree for item ${itemId}:`, error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate that translation fields are present (required by the user request)
    if (
      !formData.title_si.trim() ||
      !formData.title_ta.trim() ||
      !formData.title_tl.trim() ||
      !formData.title_th.trim()
    ) {
      toast.error(
        "Please provide translations for all languages (Sinhala, Tamil, Tagalog, Thai) before saving."
      );
      return;
    }
    try {
      setActionLoading({ submit: true });

      // Prepare form data - convert empty group_name to null for database
      const submitData = {
        // core fields
        title: formData.title,
        title_si: formData.title_si,
        title_ta: formData.title_ta,
        title_tl: formData.title_tl,
        title_th: formData.title_th,
        url: formData.url,
        group_name: formData.group_name ? formData.group_name.trim() : null,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: formData.is_active,
        base_query: formData.base_query,
        report_name: formData.report_name,
        parent_id: formData.parent_id,
        it_report_structures_id: formData.it_report_structures_id,
      };

      console.log({ submitData });

      // Store title for toast before clearing editingItem
      const itemTitle = formData.title;
      const isUpdate = !!editingItem;

      const endpoint = editingItem
        ? `/nav/menu/${editingItem.id}`
        : "/nav/menu";

      const apiMethod = editingItem ? put : post;
      await apiMethod(endpoint, submitData);

      setEditingItem(null);
      setFormData({
        title: "",
        title_si: "",
        title_ta: "",
        title_tl: "",
        title_th: "",
        url: "",
        parent_id: null,
        group_name: "",
        sort_order: 0,
        is_active: true,
        base_query: "",
        report_name: "",
      });
      setExpandedFields({
        base_query: false,
        multi_language_titles: false,
      });
      setShowUrlDropdown(false);
      setShowGroupDropdown(false);
      fetchRootMenuItems();

      // Only show success message for updates
      if (isUpdate) {
        toast.success(`Menu item "${itemTitle}" updated successfully!`);
      }
    } catch (error) {
      console.error("Error saving menu item:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Unknown error";
      toast.error(`Failed to save menu item: ${errorMessage}`);
    } finally {
      setActionLoading({});
    }
  };

  const handleEdit = async (item) => {
    setActionLoading({ edit: true });
    setEditingItem(item);

    try {
      // Fetch full menu item data from backend
      const result = await get(`/nav/menu/${item.id}`);
      const data = result.data || {};

      // Extract report_name from jrxml_json if it exists
      let reportName = "";
      if (data.jrxml_json) {
        try {
          const jrxmlData = JSON.parse(data.jrxml_json);
          reportName = jrxmlData.report_name || "";
        } catch (error) {
          console.error("Error parsing jrxml_json:", error);
        }
      }

      // Populate all available fields
      const formDataToSet = {
        title: data.title || "",
        title_si: data.title_si || "",
        title_ta: data.title_ta || "",
        title_tl: data.title_tl || "",
        title_th: data.title_th || "",
        url: data.url || "",
        parent_id: data.parent_id || null,
        group_name: data.group_name || "",
        sort_order: data.sort_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true,
        base_query: data.base_query || "",
        report_name: reportName,
      };
      setFormData(formDataToSet);

      // Store original data for comparison
      setOriginalFormData(formDataToSet);
      setHasFormChanges(false);

      // Auto-expand fields if they contain data
      if (data.base_query) {
        setExpandedFields((prev) => ({ ...prev, base_query: true }));
      }
      // Auto-expand multi-language titles if any are populated
      if (data.title_si || data.title_ta || data.title_tl || data.title_th) {
        setExpandedFields((prev) => ({
          ...prev,
          multi_language_titles: true,
        }));
      }
      // Ensure URLs and groups are loaded for dropdowns
      fetchAvailableUrls();
      fetchAvailableGroups();
    } catch (error) {
      toast.error("Failed to load menu item details");
      console.error("Error loading menu item details:", error);
    } finally {
      setTimeout(() => setActionLoading({}), 600);
    }
  };

  const handleDelete = (item) => {
    toast.info(
      <div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>
          Are you sure you want to delete "{item.title}" and all its children?
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "4px 12px",
              cursor: "pointer",
              fontWeight: 500,
            }}
            onClick={async () => {
              setActionLoading({ delete: true });
              toast.dismiss();
              try {
                await del(`/nav/menu/${item.id}`);
                toast.success(t("menu.deleted_success", { title: item.title }));
                fetchRootMenuItems();
              } catch (error) {
                console.error("Error deleting menu item:", error);
                toast.error(
                  t("menu.delete_failed", "Failed to delete menu item")
                );
              } finally {
                setActionLoading({});
              }
            }}
            disabled={actionLoading.delete}
          >
            {actionLoading.delete
              ? t("common.deleting", "Deleting...")
              : t("common.delete", "Delete")}
          </button>
          <button
            style={{
              background: "#e5e7eb",
              color: "#333",
              border: "none",
              borderRadius: 4,
              padding: "4px 12px",
              cursor: "pointer",
              fontWeight: 500,
            }}
            onClick={() => toast.dismiss()}
            disabled={actionLoading.delete}
          >
            {t("common.cancel", "Cancel")}
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        position: "top-right",
        toastId: `delete-confirm-${item.id}`,
      }
    );
  };

  const toggleExpand = async (itemId, itemUrl, e) => {
    e.stopPropagation();

    // Immediately toggle the expand state for instant UI feedback
    setExpandedItems((prev) => ({
      ...prev,
      [itemUrl]: !prev[itemUrl],
    }));

    // Fetch children in background if not loaded yet
    if (!loadedSubtrees[itemId]) {
      fetchSubtree(itemId);
    }
  };

  const toggleFieldExpand = (field) => {
    setExpandedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const isActiveOrChildActive = (itemUrl) => {
    if (!itemUrl) return false;
    return location.pathname.startsWith(itemUrl);
  };

  const isParentOfActive = (item) => {
    if (!item.url) return false;
    // Check if current path starts with this item's URL but is not exactly this URL
    return (
      location.pathname.startsWith(item.url) && location.pathname !== item.url
    );
  };

  const handleItemClick = async (item, e) => {
    if (showMenuManager) return;

    if (item.user_has_access === false && item.has_children) {
      toggleExpand(item.id, item.url, e);
      return;
    }

    if (item.user_has_access === false) {
      return;
    }

    if (item.has_children) {
      toggleExpand(item.id, item.url, e);
      return;
    }

    // Navigation logic for leaf node - SIMPLIFIED
    // Navigate to the URL directly - DynamicPage will handle component rendering
    if (item.url) {
      console.log("Navigating to:", item.url);
      navigate(item.url, {
        state: {
          item,
          reportId: item.it_report_structures_id,
          baseQuery: item.base_query,
          reportName: item.report_name,
        },
      });
    }

    closeSidebar();
  };

  const closeMenuManager = () => {
    setShowMenuManager(false);
    setEditingItem(null);
    setFormData({
      title: "",
      title_si: "",
      title_ta: "",
      title_tl: "",
      title_th: "",
      url: "",
      parent_id: null,
      group_name: "",
      sort_order: 0,
      is_active: true,
      base_query: "",
      report_name: "",
    });
    setExpandedFields({
      base_query: false,
      multi_language_titles: false,
    });
    setShowUrlDropdown(false);
    setShowGroupDropdown(false);
    setOriginalFormData(null);
    setHasFormChanges(false);
  };

  // Extract group name from URL (last segment, title-cased)
  const extractGroupNameFromUrl = (url) => {
    if (!url) return "";
    const parts = url.split("/").filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "";
  };

  // When user selects a URL, append title and auto-fill group name
  const handleUrlSelect = (url) => {
    setBaseUrl(url); // Save the selected base URL
    let title = formData.title;
    let slug = title ? title.toLowerCase().replace(/\s+/g, "-") : "";
    let fullUrl = url;
    if (slug) {
      fullUrl = url.replace(/\/$/, "") + "/" + slug;
    }
    const group_name = extractGroupNameFromUrl(url);
    setFormData({ ...formData, url: fullUrl, group_name });
    setShowUrlDropdown(false);
  };

  // When user types a URL, append title and auto-fill group name
  const handleUrlInputChange = (e) => {
    const url = e.target.value;
    setBaseUrl(url); // Update baseUrl as user types
    let title = formData.title;
    let slug = title ? title.toLowerCase().replace(/\s+/g, "-") : "";
    let fullUrl = url;
    if (slug) {
      fullUrl = url.replace(/\/$/, "") + "/" + slug;
    }
    const group_name = extractGroupNameFromUrl(url);
    setFormData({ ...formData, url: fullUrl, group_name });
  };

  const filteredUrls = availableUrls.filter((urlObj) =>
    urlObj.url.toLowerCase().includes(formData.url.toLowerCase())
  );

  // When user enters a title, append to selected URL and update group name
  const handleTitleChange = (e) => {
    const title = e.target.value;
    let slug = title ? title.toLowerCase().replace(/\s+/g, "-") : "";
    let fullUrl = baseUrl || "";
    // Always set url to '/<slug>' for root-level (no baseUrl)
    if (slug && !baseUrl) {
      fullUrl = "/" + slug;
    } else if (slug && fullUrl) {
      fullUrl = fullUrl.replace(/\/$/, "") + "/" + slug;
    }
    const group_name = extractGroupNameFromUrl(baseUrl);

    // Update form data using functional update to avoid stale state
    setFormData((prev) => ({ ...prev, title, url: fullUrl, group_name }));
  };

  // Manual translation trigger
  const handleManualTranslate = async () => {
    if (formData.title.trim()) {
      await autoTranslateTitle(formData.title);
    } else {
      toast.info("Please enter an English title first.");
    }
  };

  const renderMenuItems = (items, level = 0) => {
    return items.map((item, index) => {
      const hasChildren =
        item.has_children || (item.children && item.children.length > 0);
      const isExpanded = expandedItems[item.url];
      const isActive = location.pathname === item.url;
      const isParent = isParentOfActive(item);
      const userHasAccess = item.user_has_access !== false;

      return (
        <React.Fragment key={`${level}-${item.id}-${index}`}>
          <li
            className={`nav-item 
              ${isActive ? "active" : ""} 
              ${isParent ? "active-parent" : ""}
              ${hasChildren ? "has-children" : ""}
              ${!userHasAccess ? "no-access" : ""}
              level-${level}`}
            onClick={(e) => handleItemClick(item, e)}
            style={{
              cursor:
                (userHasAccess || hasChildren) && !showMenuManager
                  ? "pointer"
                  : "default",
              opacity: userHasAccess ? 1 : 0.6,
              paddingLeft: `${level * 16 + 16}px`,
            }}
          >
            <div className="menu-item-content">
              {showMenuManager && (
                <div className="menu-item-actions">
                  <button
                    className="action-btn edit-btn"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!actionLoading.edit) handleEdit(item);
                    }}
                    disabled={actionLoading.edit}
                  >
                    {actionLoading.edit ? "..." : "✏️"}
                  </button>
                  <button
                    className="action-btn delete-btn"
                    title={t("common.delete", "Delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!actionLoading.delete) handleDelete(item);
                    }}
                    disabled={actionLoading.delete}
                  >
                    {actionLoading.delete ? "..." : "🗑️"}
                  </button>
                </div>
              )}
              <span className="nav-title">
                {(item.translations &&
                  item.translations[i18n.language] &&
                  item.translations[i18n.language].title) ||
                  (item.i18n_key ? t(item.i18n_key) : item.title)}
              </span>
              {hasChildren && (
                <span
                  className="chevron-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id, item.url, e);
                  }}
                >
                  {isExpanded ? (
                    <FiChevronDown size={12} />
                  ) : (
                    <FiChevronRight size={12} />
                  )}
                </span>
              )}
            </div>
          </li>
          {hasChildren && isExpanded && item.children && (
            <ul className="submenu">
              {renderMenuItems(item.children, level + 1)}
            </ul>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div
        className={`sidebar-overlay ${isOpen ? "active" : ""}`}
        onClick={closeSidebar}
      ></div>
      <nav
        className={`sidebar ${isOpen ? "open" : ""} ${
          showMenuManager ? "management-mode" : ""
        }`}
      >
        <button className="sidebar-close-btn" onClick={closeSidebar}>
          <FiX size={24} />
        </button>

        {/* Only show sidebar-header for admin users */}
        {isAdmin && (
          <div className="sidebar-header">
            {showMenuManager ? (
              <div className="menu-manager-header">
                <button className="back-btn" onClick={closeMenuManager}>
                  <FiArrowLeft size={16} />
                </button>
                <h3>{t("menu.menu_management", "Menu Management")}</h3>
                <button
                  className="add-btn"
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      title: "",
                      title_si: "",
                      title_ta: "",
                      title_tl: "",
                      title_th: "",
                      url: "",
                      parent_id: null,
                      group_name: "",
                      sort_order: 0,
                      is_active: true,
                      base_query: "",
                      report_name: "",
                    });
                    setBaseUrl("");
                    setExpandedFields({
                      base_query: false,
                      multi_language_titles: false,
                    });
                    setOriginalFormData(null);
                    setHasFormChanges(false);
                  }}
                  title={t("menu.add_new", "Add New Item")}
                >
                  <FiPlus size={16} />
                </button>
              </div>
            ) : (
              <div className="sidebar-management">
                <button
                  className="menu-management-btn"
                  ref={manageBtnRef}
                  onClick={() => setShowMenuManager(true)}
                  title={t("menu.manage_menu", "Manage Menu")}
                >
                  <FiSettings size={16} />
                  <span>{t("menu.manage_menu", "Manage Menu")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <ul className="nav-menu">{renderMenuItems(menuItems)}</ul>

        {/* Logout button placed at bottom center of the sidebar for consistent UX */}
        <div className="sidebar-footer">
          <button
            className="btn btn-logout"
            onClick={async () => {
              try {
                // perform logout via auth context then navigate to login
                await logout();
              } catch (err) {
                console.error("Logout error:", err);
              }
              closeSidebar();
              navigate("/login");
            }}
            title={t("app.logout", "Logout")}
          >
            {t("app.logout", "Logout")}
          </button>
        </div>
      </nav>

      {/* Menu Form Popup - Only show when editing or adding new item */}
      {(editingItem || (!editingItem && showMenuManager)) && (
        <div
          className={`menu-form-popup ${
            showMenuManager ? "management-active" : ""
          }`}
          style={popupStyle}
        >
          <div className="menu-form-content">
            <div className="menu-form-header">
              <h4>
                {editingItem
                  ? `${t("common.edit", "Edit")}: ${editingItem.title}`
                  : t("menu.add_new_item", "Add New Menu Item")}
              </h4>
              <button className="close-popup-btn" onClick={closeMenuManager}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t("form.url_label", "URL: *")}</label>
                <div className="url-combobox">
                  <input
                    type="text"
                    value={formData.url}
                    onChange={handleUrlInputChange}
                    onFocus={() => setShowUrlDropdown(true)}
                    required
                    placeholder={t(
                      "form.url_placeholder",
                      "Select base URL and add your path"
                    )}
                    className="url-input"
                  />
                  <button
                    type="button"
                    className="url-dropdown-toggle"
                    onClick={() => setShowUrlDropdown(!showUrlDropdown)}
                  >
                    <FiChevronDown size={16} />
                  </button>
                  {showUrlDropdown && (
                    <div className="url-dropdown">
                      {filteredUrls.length > 0 ? (
                        filteredUrls.map((urlObj) => (
                          <div
                            key={urlObj.url}
                            className="url-option"
                            onClick={() => handleUrlSelect(urlObj.url)}
                          >
                            <strong>{urlObj.url}</strong>
                          </div>
                        ))
                      ) : (
                        <div className="url-option no-results">
                          {t("form.no_matching_urls", "No matching URLs found")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>{t("form.title_label", "Title: *")} (English)</label>
                <div className="title-input-container">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    required
                    placeholder={t(
                      "form.title_placeholder",
                      "Menu title in English"
                    )}
                  />
                  <button
                    type="button"
                    className="translate-btn"
                    onClick={handleManualTranslate}
                    disabled={translating || !formData.title.trim()}
                    title="Auto-translate to all languages"
                  >
                    {translating ? "Translating..." : "🌐 Auto-translate"}
                  </button>
                </div>
                <button
                  type="button"
                  className="expand-toggle-btn small"
                  onClick={() => toggleFieldExpand("multi_language_titles")}
                  style={{ marginLeft: 8, marginTop: "8px" }}
                >
                  {expandedFields.multi_language_titles
                    ? "Hide languages"
                    : "Show translations"}
                </button>
              </div>

              {expandedFields.multi_language_titles && (
                <div className="multi-lang-titles">
                  <div className="form-group">
                    <label>
                      Sinhala{" "}
                      {translating && (
                        <span className="translating-indicator">🔄</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.title_si}
                      onChange={(e) =>
                        setFormData({ ...formData, title_si: e.target.value })
                      }
                      placeholder="සිංහල ශීර්ෂය"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Tamil{" "}
                      {translating && (
                        <span className="translating-indicator">🔄</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.title_ta}
                      onChange={(e) =>
                        setFormData({ ...formData, title_ta: e.target.value })
                      }
                      placeholder="தமிழ் தலைப்பு"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Tagalog{" "}
                      {translating && (
                        <span className="translating-indicator">🔄</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.title_tl}
                      onChange={(e) =>
                        setFormData({ ...formData, title_tl: e.target.value })
                      }
                      placeholder="Tagalog title"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Thai{" "}
                      {translating && (
                        <span className="translating-indicator">🔄</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.title_th}
                      onChange={(e) =>
                        setFormData({ ...formData, title_th: e.target.value })
                      }
                      placeholder="Thai title"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>{t("form.group_label", "Group Name:")}</label>
                <div className="group-combobox">
                  <input
                    type="text"
                    value={formData.group_name}
                    readOnly
                    placeholder={t(
                      "form.group_placeholder",
                      "Auto-filled from URL"
                    )}
                    className="group-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t("form.sort_label", "Sort Order: *")}</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                />
              </div>

              {/* Base Query Field with Expand/Collapse */}
              <div className="form-group">
                <label className="field-header">Report Name (Optional):</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.report_name}
                  onChange={(e) =>
                    setFormData({ ...formData, report_name: e.target.value })
                  }
                  placeholder="Enter report name..."
                />
              </div>
              <div className="form-group">
                <label className="field-header">
                  Report Query (Optional):
                  <button
                    type="button"
                    className="expand-toggle-btn"
                    onClick={() => toggleFieldExpand("base_query")}
                    title={expandedFields.base_query ? "Collapse" : "Expand"}
                  >
                    {expandedFields.base_query ? (
                      <Shrink size={14} />
                    ) : (
                      <Expand size={14} />
                    )}
                  </button>
                </label>
                <div
                  className={`textarea-container ${
                    expandedFields.base_query ? "expanded" : ""
                  }`}
                >
                  <textarea
                    className="sidebar-textarea code-textarea"
                    value={formData.base_query}
                    onChange={(e) =>
                      setFormData({ ...formData, base_query: e.target.value })
                    }
                    placeholder="Enter SQL query for report generation..."
                    rows={expandedFields.base_query ? 12 : 4}
                    spellCheck="false"
                  />
                  {formData.base_query && (
                    <div className="character-count">
                      {formData.base_query.length} characters
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  {t("form.active", "Active")}
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    actionLoading.submit || (editingItem && !hasFormChanges)
                  }
                  style={
                    actionLoading.submit || (editingItem && !hasFormChanges)
                      ? { cursor: "not-allowed", opacity: 0.6 }
                      : {}
                  }
                >
                  {actionLoading.submit ? (
                    <Loader size={16} className="spinning-loader" />
                  ) : (
                    <>
                      <FiSave size={14} />
                      {editingItem
                        ? t("common.update", "Update")
                        : t("common.create", "Create")}
                    </>
                  )}
                </button>
                {editingItem && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeMenuManager}
                    disabled={actionLoading.submit}
                    style={
                      actionLoading.submit
                        ? { cursor: "not-allowed", opacity: 0.6 }
                        : {}
                    }
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
