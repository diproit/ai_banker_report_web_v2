import React from "react";

export interface SubMenuItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  quickAccess?: boolean;
  keyBinding?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  quickAccess?: boolean;
  keyBinding?: string;
  subMenu?: SubMenuItem[];
}

// Sample navigation data with minimal B&W icons
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: "⇄",
    quickAccess: true,
    subMenu: [
      {
        label: "All Transactions",
        path: "/transactions/all",
        icon: "☰",
        quickAccess: true,
      },
      { label: "Pending", path: "/transactions/pending", icon: "◷" },
      { label: "Completed", path: "/transactions/completed", icon: "✓" },
    ],
  },
  {
    label: "Member List",
    path: "/members",
    icon: "⚊",
    quickAccess: false,
    subMenu: [
      {
        label: "Active Members",
        path: "/members/active",
        icon: "○",
        quickAccess: true,
      },
      { label: "Inactive Members", path: "/members/inactive", icon: "●" },
    ],
  },
  {
    label: "Daily Reports",
    path: "/reports",
    icon: "▦",
    quickAccess: true,
    subMenu: [
      { label: "Sales Report", path: "/reports/sales", icon: "◈" },
      {
        label: "Activity Report",
        path: "/reports/activity",
        icon: "▭",
        quickAccess: true,
      },
      { label: "Summary", path: "/reports/summary", icon: "≡" },
    ],
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
  },
];
