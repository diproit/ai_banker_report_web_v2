import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown } from "react-icons/fi";

const languages = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
  { code: "tl", label: "Tagalog" },
  { code: "th", label: "ไทย" },
];

export default function LanguageSwitcher({ className }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current =
    languages.find((l) => l.code === i18n.language) || languages[0];

  const toggle = () => setOpen((v) => !v);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  // close when clicking outside
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <button
        className="lang-btn"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        type="button"
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {current.label}
          <FiChevronDown />
        </span>
      </button>

      {open && (
        <div className="lang-menu" role="menu">
          {languages.map((l) => (
            <button
              key={l.code}
              id={`lang-${l.code}`}
              role="menuitemradio"
              onClick={() => changeLanguage(l.code)}
              className={l.code === current.code ? "active" : ""}
              aria-checked={l.code === current.code}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
