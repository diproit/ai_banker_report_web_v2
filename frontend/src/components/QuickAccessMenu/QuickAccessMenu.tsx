import React from "react";
import type { NavItem } from "../../config/navigation";
import { formatKeyBinding } from "../../utils/keyboardUtils";
import { useTranslation } from "../../contexts/TranslationContext";
import "./QuickAccessMenu.css";

interface QuickAccessMenuProps {
  items: NavItem[];
  onItemClick?: (path: string, title?: string) => void;
}

interface QuickAccessItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  keyBinding?: string;
}

const QuickAccessMenu: React.FC<QuickAccessMenuProps> = ({
  items,
  onItemClick,
}) => {
  const { translate } = useTranslation();

  // Collect all items with quickAccess flag (both parent and sub-menu items)
  const quickAccessItems: QuickAccessItem[] = [];

  items.forEach((item) => {
    // Add parent item if it has quickAccess
    if (item.quickAccess) {
      quickAccessItems.push({
        label: item.label,
        path: item.path,
        icon: item.icon,
        keyBinding: item.keyBinding,
      });
    }

    // Add sub-menu items if they have quickAccess
    if (item.subMenu) {
      item.subMenu.forEach((subItem) => {
        if (subItem.quickAccess) {
          quickAccessItems.push({
            label: subItem.label,
            path: subItem.path,
            icon: subItem.icon,
            keyBinding: subItem.keyBinding,
          });
        }
      });
    }
  });

  if (quickAccessItems.length === 0) {
    return null;
  }

  const handleClick = (path: string, label: string) => {
    onItemClick?.(path, label);
  };

  return (
    <div className="quick-access-menu">
      <span className="quick-access-title">Quick Access:</span>
      <div className="quick-access-items">
        {quickAccessItems.map((item) => (
          <div
            key={item.path}
            className="quick-access-item"
            onClick={() => handleClick(item.path, item.label)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick(item.path, item.label);
              }
            }}
          >
            {item.icon && (
              <span className="quick-access-icon">{item.icon}</span>
            )}
            <span className="quick-access-label">{translate(item.label)}</span>
            {item.keyBinding && (
              <span className="keybinding-badge">
                {formatKeyBinding(item.keyBinding)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessMenu;
