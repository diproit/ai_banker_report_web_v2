import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./TypeAheadDropdown.css"; // We will create this CSS file next

// ensures a top-level overlay container exists for portal content
function getOverlayContainer() {
  let el = document.getElementById("app-overlays");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-overlays";
    Object.assign(el.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    document.body.appendChild(el);
  }
  return el;
}

export const TypeAheadDropdown = ({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  onFocus,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    // Normalize options to array and de-duplicate if needed
    const uniqueOptions = Array.isArray(options) ? [...new Set(options)] : [];

    // Coerce inputValue to string to avoid calling .trim() on non-strings
    const inputStr = inputValue == null ? "" : String(inputValue);

    if (!inputStr.trim()) {
      // show all unique options when input is empty
      setFilteredOptions(uniqueOptions);
    } else {
      // show only exact matches (case-insensitive)
      const lower = inputStr.toLowerCase();
      setFilteredOptions(
        uniqueOptions.filter((option) => String(option).toLowerCase() === lower)
      );
    }
  }, [inputValue, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // if click is inside the input container, keep open
      if (dropdownRef.current && dropdownRef.current.contains(event.target))
        return;
      // if click is inside the overlay (portal dropdown), keep open
      const overlay = document.getElementById("app-overlays");
      if (overlay && overlay.contains(event.target)) return;
      // otherwise it's an outside click
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // compute viewport coordinates for the dropdown when opened
  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    const update = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onValueChange(id, newValue);
    setIsOpen(true);
  };

  const handleOptionClick = (option) => {
    setInputValue(option);
    onValueChange(id, option);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (typeof onFocus === "function") {
      try {
        onFocus();
      } catch (e) {
        // no-op: avoid breaking focus due to upstream errors
      }
    }
  };

  return (
    <div className="typeahead-dropdown-container" ref={dropdownRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="typeahead-input"
      />
      {isOpen &&
        filteredOptions.length > 0 &&
        (() => {
          try {
            // render dropdown into body to avoid clipping by parent stacking contexts
            const container = getOverlayContainer();
            return createPortal(
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none",
                }}
              >
                <ul
                  className="typeahead-dropdown-list"
                  style={{
                    position: "absolute",
                    top: coords ? `${coords.top}px` : undefined,
                    left: coords ? `${coords.left}px` : undefined,
                    width: coords ? `${coords.width}px` : undefined,
                    pointerEvents: "auto",
                  }}
                >
                  {filteredOptions.map((option, index) => (
                    <li
                      key={index}
                      onMouseDown={(e) => {
                        // ensure selection occurs before document-level handlers close the list
                        e.preventDefault();
                        handleOptionClick(option);
                      }}
                      onClick={() => handleOptionClick(option)}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </div>,
              container
            );
          } catch (e) {
            // fallback to inline list
            return (
              <ul className="typeahead-dropdown-list">
                {filteredOptions.map((option, index) => (
                  <li
                    key={index}
                    onMouseDown={(e) => {
                      // use mousedown so selection happens before document-level mousedown handlers
                      e.preventDefault();
                      handleOptionClick(option);
                    }}
                    onClick={() => handleOptionClick(option)}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            );
          }
        })()}
    </div>
  );
};
