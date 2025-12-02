import type { NavItem, SubMenuItem } from "../config/navigation";
import type { ApiNavRight } from "../services/navigationService";

// Icon mapping based on menu titles
const iconMap: Record<string, string> = {
  // Main menu icons
  dashboard: "⌂",
  "ai analytics": "◈",
  transactions: "⇄",
  "financial reports": "▦",
  "sub ledger accounts": "☰",
  "regulatory reports": "◫",
  settings: "⚙",

  // Sub-menu icons
  "personal savings": "○",
  "personal loans": "●",
  "daily reports": "▭",
  "monthly reports": "▦",
  "annual reports": "▧",
  shares: "◇",
  savings: "◈",
  loans: "◆",
  pastdue: "◷",
  investments: "◊",
  "audit templates": "▣",
  details: "▪",
  summary: "≡",
  "for the date": "◷",

  // Default icon
  default: "▫",
};

function getIcon(title: string): string {
  const key = title.toLowerCase().trim();
  return iconMap[key] || iconMap["default"];
}

export function transformApiNavToNavItems(
  apiNavRights: ApiNavRight[]
): NavItem[] {
  // Sort by sort_order
  const sorted = [...apiNavRights].sort(
    (a, b) => a.nav_menu.sort_order - b.nav_menu.sort_order
  );

  // Group by parent_id
  const menuMap = new Map<number | null, ApiNavRight[]>();

  sorted.forEach((navRight) => {
    const parentId = navRight.nav_menu.parent_id;
    if (!menuMap.has(parentId)) {
      menuMap.set(parentId, []);
    }
    menuMap.get(parentId)!.push(navRight);
  });

  // Build hierarchy
  function buildSubMenu(parentId: number): SubMenuItem[] {
    const children = menuMap.get(parentId) || [];

    return children.map((child) => {
      const subItem: SubMenuItem = {
        label: child.nav_menu.title,
        path: child.nav_menu.url,
        icon: getIcon(child.nav_menu.title),
        quickAccess: child.quick_access,
        keyBinding: child.nav_menu.key_binding || undefined,
      };

      // If this child has children (level 2 items), we need to handle them
      // For now, we'll support up to 2 levels as per the current structure

      return subItem;
    });
  }

  // Get top-level items (parent_id = null)
  const topLevel = menuMap.get(null) || [];

  return topLevel.map((navRight) => {
    const menu = navRight.nav_menu;
    const navItem: NavItem = {
      label: menu.title,
      path: menu.url,
      icon: getIcon(menu.title),
      quickAccess: navRight.quick_access,
      keyBinding: menu.key_binding || undefined,
    };

    // Add submenu if has_children is true
    if (menu.has_children) {
      const subMenu = buildSubMenu(menu.id);
      if (subMenu.length > 0) {
        navItem.subMenu = subMenu;
      }
    }

    return navItem;
  });
}
