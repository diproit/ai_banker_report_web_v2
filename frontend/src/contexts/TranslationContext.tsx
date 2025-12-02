import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { translationApi } from "../services/translationService";
import type { TranslationsResponse } from "../services/translationService";

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  translate: (text: string) => string;
  translations: TranslationsResponse["translations"];
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
  defaultLanguage = "english",
}) => {
  const [currentLanguage, setCurrentLanguage] =
    useState<string>(defaultLanguage);
  const [translations, setTranslations] = useState<
    TranslationsResponse["translations"]
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        setIsLoading(true);
        const response = await translationApi.getNavTranslations();
        setTranslations(response.translations);
        console.log("Translations loaded:", response.translations);
      } catch (error) {
        console.error("Failed to fetch translations:", error);
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, []);

  const translate = (text: string): string => {
    if (!translations[currentLanguage]) {
      return text; // Fallback to original text
    }

    return translations[currentLanguage][text] || text;
  };

  const setLanguage = (language: string) => {
    console.log("Language changed to:", language);
    setCurrentLanguage(language);
  };

  return (
    <TranslationContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        translate,
        translations,
        isLoading,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};
