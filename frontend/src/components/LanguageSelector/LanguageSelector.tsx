import React, { useState, useEffect, useRef } from "react";
import { languageApi, type Language } from "../../services/languageService";
import { useTranslation } from "../../contexts/TranslationContext";
import "./LanguageSelector.css";

interface LanguageSelectorProps {
  onLanguageChange?: (language: string) => void;
  defaultLanguage?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageChange,
  defaultLanguage = "english",
}) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setLanguage } = useTranslation();

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoading(true);
        const response = await languageApi.getLanguages();
        setLanguages(response.languages);
      } catch (error) {
        console.error("Failed to fetch languages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (language: string, displayName: string) => {
    console.log(`Language selected: ${language} (${displayName})`);
    setSelectedLanguage(language);
    setLanguage(language); // Update translation context
    setIsOpen(false);
    onLanguageChange?.(language);
  };

  const currentLanguage = languages.find(
    (lang) => lang.language === selectedLanguage
  );
  const displayText =
    currentLanguage?.display_name || selectedLanguage.toUpperCase();

  if (isLoading) {
    return <div className="language-selector-loading">...</div>;
  }

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="language-icon">🌐</span>
        <span className="language-text">{displayText}</span>
        <span className={`language-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.id}
              className={`language-option ${
                lang.language === selectedLanguage ? "selected" : ""
              }`}
              onClick={() =>
                handleLanguageSelect(lang.language, lang.display_name)
              }
            >
              <span className="language-option-name">{lang.display_name}</span>
              {lang.language === selectedLanguage && (
                <span className="language-checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
