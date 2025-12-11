import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import BASE_URL from "../../config/api";
import { get, post } from "../../clients/apiClient";
import "../css/UserRights.css";
import { FiChevronDown, FiChevronRight, FiSave } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const UserRights = () => {
  const { i18n, t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userRights, setUserRights] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedItems, setExpandedItems] = useState({});

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUserLoading(true);
        setError("");
        console.log("Fetching users...");

        const data = await get("/user-management/users");
        console.log("Users API response:", data);

        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          console.log("Users loaded to dropdown:", data.users.length);
        } else {
          setError("Unexpected users API response format");
          console.error("Unexpected users API format:", data);
        }
      } catch (error) {
        setError("Error fetching users: " + error.message);
        console.error("Error fetching users:", error);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Build tree structure from flat array
  const buildMenuTree = (flatItems) => {
    // Create a map for quick lookup
    const itemMap = {};
    const rootItems = [];

    // First pass: create map and add children arrays
    flatItems.forEach((item) => {
      itemMap[item.id] = { ...item, children: [] };
    });

    // Second pass: build the tree structure
    flatItems.forEach((item) => {
      if (item.parent_id && itemMap[item.parent_id]) {
        // This is a child item - add to parent's children
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        // This is a root item
        rootItems.push(itemMap[item.id]);
      }
    });

    // Sort items by sort_order
    const sortItems = (items) => {
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children);
        }
      });
    };

    sortItems(rootItems);
    return rootItems;
  };

  // Fetch all menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        setError("");
        console.log("Fetching menu items with language:", i18n.language);

        const data = await get(`/nav/menu/all?lang=${i18n.language}`);
        console.log("Menu API response:", data);

        // Handle the API response format
        if (data.success && Array.isArray(data.data)) {
          console.log(
            "Raw flat menu data from API:",
            data.data.length,
            "items"
          );

          // Build tree structure from flat data
          const treeStructure = buildMenuTree(data.data);
          setMenuItems(treeStructure);
          console.log(
            "Menu tree built with",
            treeStructure.length,
            "root items"
          );

          // Debug: Log the tree structure
          treeStructure.forEach((item, index) => {
            console.log(`Root item ${index}:`, {
              id: item.id,
              title: item.title,
              level: item.level,
              children: item.children ? item.children.length : 0,
            });
            if (item.children && item.children.length > 0) {
              item.children.forEach((child, childIndex) => {
                console.log(`  Level 1 child ${childIndex}:`, {
                  id: child.id,
                  title: child.title,
                  level: child.level,
                  children: child.children ? child.children.length : 0,
                });
                if (child.children && child.children.length > 0) {
                  child.children.forEach((grandchild, grandchildIndex) => {
                    console.log(`    Level 2 child ${grandchildIndex}:`, {
                      id: grandchild.id,
                      title: grandchild.title,
                      level: grandchild.level,
                    });
                  });
                }
              });
            }
          });
        } else {
          setError("Unexpected menu API response format");
          console.error("Unexpected menu API format:", data);
        }
      } catch (error) {
        setError("Error fetching menu items: " + error.message);
        console.error("Error fetching menu items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [i18n.language]);

  // Fetch user rights when a user is selected
  useEffect(() => {
    const fetchUserRights = async () => {
      if (!selectedUser) return;

      try {
        setLoading(true);
        setError("");
        setPendingChanges({});
        console.log(`Fetching rights for user ID: ${selectedUser}`);

        const data = await get(`/user-rights/users/${selectedUser}/nav-rights`);
        console.log("User rights API response:", data);

        if (data.success && Array.isArray(data.rights)) {
          setUserRights(data.rights);
          console.log("User rights loaded:", data.rights.length);
        } else {
          setError("Unexpected user rights API response format");
          console.error("Unexpected user rights API format:", data);
        }
      } catch (error) {
        setError("Error fetching user rights: " + error.message);
        console.error("Error fetching user rights:", error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedUser) {
      fetchUserRights();
    }
  }, [selectedUser]);

  const toggleExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Find all children of a menu item recursively
  const findAllChildrenIds = (items, parentId) => {
    let childrenIds = [];

    // Flatten all menu items first to make searching easier
    const flatItems = [];
    const flatten = (itemList) => {
      for (const item of itemList) {
        flatItems.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };
    flatten(items);

    console.log(
      `Flattened items for search:`,
      flatItems.map((item) => ({
        id: item.id,
        title: item.title,
        parent_id: item.parent_id,
      }))
    );

    const findChildren = (targetId) => {
      for (const item of flatItems) {
        if (item.parent_id === targetId) {
          childrenIds.push(item.id);
          findChildren(item.id); // Recursively find children of children
        }
      }
    };

    findChildren(parentId);
    console.log(`findAllChildrenIds for parent ${parentId}:`, childrenIds);
    return childrenIds;
  };

  // Find all parent IDs of a menu item recursively
  const findAllParentIds = (items, childId) => {
    const parentIds = [];

    // Flatten all menu items first to make searching easier
    const flatItems = [];
    const flatten = (itemList) => {
      for (const item of itemList) {
        flatItems.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };
    flatten(items);

    const findParents = (targetId) => {
      for (const item of flatItems) {
        if (item.id === targetId && item.parent_id) {
          parentIds.push(item.parent_id);
          findParents(item.parent_id); // Recursively find parents of parents
        }
      }
    };

    findParents(childId);
    console.log(`findAllParentIds for child ${childId}:`, parentIds);
    return parentIds;
  };

  // Check if all children of a parent have access
  const allChildrenHaveAccess = (parentId, currentChanges) => {
    const childrenIds = findAllChildrenIds(menuItems, parentId);
    if (childrenIds.length === 0) return true; // No children means parent can be standalone

    const result = childrenIds.every((childId) => {
      if (currentChanges.hasOwnProperty(childId)) {
        return currentChanges[childId];
      }
      return userRights.some((right) => right.menu_item_id === childId);
    });

    console.log(`allChildrenHaveAccess for parent ${parentId}: ${result}`);
    return result;
  };

  const handleRightChange = (menuItemId, hasAccess, isParent = false) => {
    if (!selectedUser) return;

    console.log(
      `handleRightChange called: menuItemId=${menuItemId}, hasAccess=${hasAccess}, isParent=${isParent}`
    );

    setPendingChanges((prev) => {
      const newChanges = { ...prev };

      if (isParent) {
        // For parent items, always update the parent and all children
        const childrenIds = findAllChildrenIds(menuItems, menuItemId);
        console.log(`Parent ${menuItemId} children:`, childrenIds);

        // Update the parent
        newChanges[menuItemId] = hasAccess;

        // Update all children with the same value
        childrenIds.forEach((childId) => {
          console.log(`Setting child ${childId} to ${hasAccess}`);
          newChanges[childId] = hasAccess;
        });
      } else {
        // For child items
        newChanges[menuItemId] = hasAccess;

        // Check parent behavior
        const parentIds = findAllParentIds(menuItems, menuItemId);
        console.log(`Child ${menuItemId} parents:`, parentIds);

        parentIds.forEach((parentId) => {
          if (hasAccess) {
            // When selecting a child, check if ALL children are now selected
            // If so, auto-select the parent
            if (allChildrenHaveAccess(parentId, newChanges)) {
              newChanges[parentId] = true;
            }
          } else {
            // When deselecting a child, always deselect the parent
            // This allows independent child selection
            newChanges[parentId] = false;
          }
        });
      }

      console.log("Pending changes updated:", newChanges);
      return newChanges;
    });
  };

  const hasAccess = (menuItemId) => {
    // Check pending changes first, then saved rights
    if (pendingChanges.hasOwnProperty(menuItemId)) {
      return pendingChanges[menuItemId];
    }
    return userRights.some((right) => right.menu_item_id === menuItemId);
  };

  // Check if a parent item should be in an intermediate state (some children selected)
  const isParentIndeterminate = (menuItemId) => {
    const childrenIds = findAllChildrenIds(menuItems, menuItemId);
    if (childrenIds.length === 0) return false;

    const currentChanges = pendingChanges;
    const childrenWithAccess = childrenIds.filter((childId) => {
      if (currentChanges.hasOwnProperty(childId)) {
        return currentChanges[childId];
      }
      return userRights.some((right) => right.menu_item_id === childId);
    });

    // Indeterminate if some (but not all) children have access
    return (
      childrenWithAccess.length > 0 &&
      childrenWithAccess.length < childrenIds.length
    );
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      console.log("Saving changes:", pendingChanges);

      const data = await post(
        `/user-rights/users/${selectedUser}/nav-rights/bulk`,
        {
          changes: pendingChanges,
        }
      );
      console.log("Save API response:", data);

      if (data.success) {
        setSuccess(t("user_rights_page.update_success"));
        setPendingChanges({});
        console.log("Changes saved successfully");

        // Refresh user rights
        const rightsData = await get(
          `/user-rights/users/${selectedUser}/nav-rights`
        );
        if (rightsData.success && Array.isArray(rightsData.rights)) {
          setUserRights(rightsData.rights);
          console.log("User rights refreshed");
        }
      } else {
        setError(t("user_rights_page.update_failed"));
        console.error("Failed to update user rights:", data);
      }
    } catch (error) {
      setError(t("user_rights_page.update_failed") + ": " + error.message);
      console.error("Error updating user rights:", error);
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const handleMenuItemClick = (item, e) => {
    // If it has children, toggle expand/collapse
    if (item.children && item.children.length > 0) {
      toggleExpand(item.id, e);
    }
  };

  const renderMenuItems = (items, level = 0) => {
    if (!items || items.length === 0) {
      return (
        <p className="no-items-message">
          {t("user_rights_page.no_menu_items")}
        </p>
      );
    }

    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems[item.id];
      const itemHasAccess = hasAccess(item.id);
      const isParent = hasChildren;
      const isIndeterminate = isParent && isParentIndeterminate(item.id);

      return (
        <div key={item.id} className="menu-item-container">
          <div
            className={`menu-item level-${level} ${
              hasChildren ? "has-children" : ""
            }`}
            onClick={(e) => handleMenuItemClick(item, e)}
          >
            <div className="menu-item-content">
              <div className="menu-title-container">
                {hasChildren && (
                  <span className="chevron-icon">
                    {isExpanded ? (
                      <FiChevronDown size={14} />
                    ) : (
                      <FiChevronRight size={14} />
                    )}
                  </span>
                )}
                <span className="menu-title">{item.title}</span>
              </div>
              {selectedUser && (
                <div className="access-section">
                  <span className="access-label">
                    {t("user_rights_page.access_label")}
                  </span>
                  <label className="access-checkbox">
                    <input
                      type="checkbox"
                      checked={itemHasAccess}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = isIndeterminate;
                        }
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRightChange(item.id, e.target.checked, isParent);
                      }}
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>
              )}
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div className="submenu-items">
              {renderMenuItems(item.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="user-rights-container">
      <div className="header-section">
        <h1>{t("user_rights_page.title")}</h1>
        {selectedUser && hasPendingChanges && (
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="saving-text">
                {t("user_rights_page.saving")}
              </span>
            ) : (
              <>
                <FiSave size={16} />
                <span>{t("user_rights_page.save_changes")}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="user-selection">
        <label htmlFor="user-select">
          {t("user_rights_page.select_user_label")}
        </label>
        <select
          id="user-select"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          disabled={userLoading}
        >
          <option value="">
            {t("user_rights_page.select_user_placeholder")}
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
        {userLoading && (
          <span className="loading-indicator">
            {t("user_rights_page.loading_users")}
          </span>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {selectedUser && (
        <div className="menu-section">
          <h2>
            {t("user_rights_page.menu_access_for", {
              username:
                users.find((u) => u.id.toString() === selectedUser)?.username ||
                "User",
            })}
          </h2>

          {hasPendingChanges && (
            <div className="changes-notice">
              {t("user_rights_page.unsaved_changes")}
            </div>
          )}

          <div className="menu-list">
            {menuItems.length > 0 ? (
              renderMenuItems(menuItems)
            ) : (
              <p className="no-items-message">
                {t("user_rights_page.no_menu_items")}
              </p>
            )}
          </div>
        </div>
      )}

      {!selectedUser && (
        <div className="no-user-selected-message">
          <p>{t("user_rights_page.no_user_selected")}</p>
        </div>
      )}
    </div>
  );
};

export default UserRights;
