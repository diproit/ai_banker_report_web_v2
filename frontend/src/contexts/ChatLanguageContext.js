import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ChatLanguageContext = createContext();

// Map i18n language codes to backend language names (display_name in database)
const languageMapping = {
  en: "English",
  si: "සිංහල", // Sinhala in Sinhala script
  ta: "தமிழ்", // Tamil in Tamil script
  tl: "Tagalog",
  th: "ไทย", // Thai in Thai script
};

export const ChatLanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [chatLanguage, setChatLanguage] = useState("English");

  // Sync chat language with i18n language changes
  useEffect(() => {
    const currentLang = i18n.language || "en";
    const mappedLanguage = languageMapping[currentLang] || "English";
    setChatLanguage(mappedLanguage);
  }, [i18n.language]);

  return (
    <ChatLanguageContext.Provider value={{ chatLanguage, setChatLanguage }}>
      {children}
    </ChatLanguageContext.Provider>
  );
};

export const useChatLanguage = () => {
  const context = useContext(ChatLanguageContext);
  if (!context) {
    throw new Error(
      "useChatLanguage must be used within a ChatLanguageProvider"
    );
  }
  return context;
};
