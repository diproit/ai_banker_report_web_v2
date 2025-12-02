# Navigation System Documentation

## Overview

A modular navigation system with sidebar, navbar, and quick access menu components.

## Component Structure

```
src/
├── config/
│   └── navigation.ts          # Navigation configuration and data types
├── components/
│   ├── Navbar/               # Top navigation bar
│   │   ├── Navbar.tsx
│   │   ├── Navbar.css
│   │   └── index.ts
│   ├── Sidebar/              # Left sidebar with menu items
│   │   ├── Sidebar.tsx
│   │   ├── Sidebar.css
│   │   └── index.ts
│   ├── QuickAccessMenu/      # Horizontal quick access menu
│   │   ├── QuickAccessMenu.tsx
│   │   ├── QuickAccessMenu.css
│   │   └── index.ts
│   └── Layout/               # Main layout wrapper
│       ├── Layout.tsx
│       ├── Layout.css
│       └── index.ts
```

## Components

### 1. Navbar

**Location**: `src/components/Navbar/`

**Features**:

- Logo on the left
- User name and profile picture on the right
- Clickable logo and user avatar
- Responsive design

**Props**:

```typescript
interface NavbarProps {
  userName?: string; // Default: 'User'
  userAvatar?: string; // Optional image URL
  logoText?: string; // Default: 'Logo'
  onLogoClick?: () => void;
  onUserClick?: () => void;
}
```

### 2. Sidebar

**Location**: `src/components/Sidebar/`

**Features**:

- Vertical navigation menu
- Support for sub-menu items (one level deep)
- Expandable/collapsible sub-menus
- Active state highlighting
- Icons support

**Props**:

```typescript
interface SidebarProps {
  items: NavItem[];
  onItemClick?: (path: string) => void;
}
```

### 3. QuickAccessMenu

**Location**: `src/components/QuickAccessMenu/`

**Features**:

- Horizontal menu for frequently accessed items
- Automatically filters items marked with `quickAccess: true`
- Colorful gradient buttons
- Keyboard navigation support

**Props**:

```typescript
interface QuickAccessMenuProps {
  items: NavItem[];
  onItemClick?: (path: string) => void;
}
```

### 4. Layout

**Location**: `src/components/Layout/`

**Features**:

- Combines Navbar, Sidebar, and QuickAccessMenu
- Provides content area for children
- Responsive layout

**Props**:

```typescript
interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  userAvatar?: string;
  logoText?: string;
  onNavigate?: (path: string) => void;
  onLogoClick?: () => void;
  onUserClick?: () => void;
}
```

## Navigation Configuration

### NavItem Interface

```typescript
export interface SubMenuItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  quickAccess?: boolean; // Mark as quick access item
  subMenu?: SubMenuItem[]; // Optional sub-menu items
}
```

### Example Configuration

```typescript
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Transactions",
    path: "/transactions",
    icon: "💸",
    quickAccess: true, // Will appear in quick access menu
    subMenu: [
      { label: "All Transactions", path: "/transactions/all", icon: "📋" },
      { label: "Pending", path: "/transactions/pending", icon: "⏳" },
    ],
  },
  // ... more items
];
```

## Usage

### Basic Implementation

```tsx
import Layout from "./components/Layout";

function App() {
  const handleNavigation = (path: string) => {
    console.log("Navigating to:", path);
    // Integrate with your router
  };

  return (
    <Layout userName="John Doe" logoText="MyApp" onNavigate={handleNavigation}>
      {/* Your page content */}
    </Layout>
  );
}
```

## Features

### Quick Access

Items marked with `quickAccess: true` will automatically appear in both:

1. The sidebar
2. The horizontal quick access menu

### Sub-menus

- Click on a parent item to expand/collapse sub-menu
- Sub-menu items are indented and styled differently
- Only one level of nesting is supported

### Responsive Design

- Desktop: Full sidebar visible
- Tablet/Mobile: Responsive adjustments (can be extended with hamburger menu)

## Customization

### Colors

Quick access items use gradient colors that cycle through:

1. Purple gradient (667eea → 764ba2)
2. Pink gradient (f093fb → f5576c)
3. Blue gradient (4facfe → 00f2fe)

### Styling

Each component has its own CSS file for easy customization:

- `Navbar.css` - Top bar styling
- `Sidebar.css` - Sidebar and menu styling
- `QuickAccessMenu.css` - Quick access button styling
- `Layout.css` - Overall layout structure

## Best Practices

1. **Configuration**: Keep navigation data in `src/config/navigation.ts`
2. **Type Safety**: Use TypeScript interfaces for type checking
3. **Modularity**: Each component is self-contained and reusable
4. **Accessibility**: Components include ARIA attributes and keyboard navigation
5. **Performance**: Use React.memo for optimization if needed

## Future Enhancements

- Add hamburger menu for mobile
- Support for multiple sub-menu levels
- User dropdown menu
- Search functionality in sidebar
- Breadcrumb navigation
- Route integration with React Router
