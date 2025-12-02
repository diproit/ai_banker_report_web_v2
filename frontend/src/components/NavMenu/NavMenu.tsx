import React, { useEffect, useRef, useState } from "react";
import "./NavMenu.css";

export type MenuItem = {
  key: string;
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  items: MenuItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onSelect?: (key: string) => void;
  renderItem?: (item: MenuItem, isActive: boolean) => React.ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
  ariaLabel?: string;
};

const NavMenu: React.FC<Props> = ({
  items,
  activeKey: controlledActiveKey,
  defaultActiveKey,
  onSelect,
  renderItem,
  orientation = "horizontal",
  className,
  ariaLabel = "Main navigation",
}: Props) => {
  const [activeKey, setActiveKey] = useState<string | undefined>(
    controlledActiveKey ?? defaultActiveKey ?? (items[0] && items[0].key)
  );

  useEffect(() => {
    if (controlledActiveKey !== undefined) setActiveKey(controlledActiveKey);
  }, [controlledActiveKey]);

  const listRef = useRef<HTMLUListElement | null>(null);

  const handleSelect = (key: string, disabled?: boolean) => {
    if (disabled) return;
    if (controlledActiveKey === undefined) setActiveKey(key);
    onSelect?.(key);
  };

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !listRef.current) return;
    const focusable = Array.from(
      listRef.current.querySelectorAll<HTMLButtonElement>(
        ".nav-item-button:not([disabled])"
      )
    ) as HTMLButtonElement[];
    const idx = focusable.indexOf(el as HTMLButtonElement);
    if (idx === -1) return;

    if (orientation === "horizontal") {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        focusable[(idx + 1) % focusable.length]?.focus();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusable[(idx - 1 + focusable.length) % focusable.length]?.focus();
      }
    } else {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusable[(idx + 1) % focusable.length]?.focus();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        focusable[(idx - 1 + focusable.length) % focusable.length]?.focus();
      }
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const btn = focusable[idx] as HTMLButtonElement | undefined;
      btn?.click();
    }
  };

  return (
    <nav
      className={["nav-menu", orientation, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <ul
        className="nav-list"
        ref={listRef}
        role="menubar"
        {...(orientation === "vertical"
          ? { "aria-orientation": "vertical" as const }
          : {})}
        onKeyDown={onKeyDown}
      >
        {items.map((item: MenuItem) => {
          const isActive = activeKey === item.key;
          return (
            <li
              key={item.key}
              className={`nav-item ${isActive ? "active" : ""}`}
              role="none"
            >
              {renderItem ? (
                <button
                  type="button"
                  role="menuitem"
                  className="nav-item-button"
                  aria-current={isActive ? "page" : undefined}
                  disabled={item.disabled}
                  onClick={() => handleSelect(item.key, item.disabled)}
                >
                  {renderItem(item, isActive)}
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  role="menuitem"
                  className="nav-link"
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    handleSelect(item.key, item.disabled);
                    // preserve normal navigation if desired: window.location.href = item.href
                  }}
                >
                  <span className="nav-item-content">
                    {item.icon && (
                      <span className="nav-item-icon">{item.icon}</span>
                    )}
                    <span className="nav-item-label">{item.label}</span>
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="nav-item-button"
                  disabled={item.disabled}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleSelect(item.key, item.disabled)}
                >
                  <span className="nav-item-content">
                    {item.icon && (
                      <span className="nav-item-icon">{item.icon}</span>
                    )}
                    <span className="nav-item-label">{item.label}</span>
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NavMenu;
