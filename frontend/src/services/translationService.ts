// API service for translations
const API_BASE_URL = "http://localhost:8000/api/v1";

export interface TranslationsResponse {
  translations: {
    [languageCode: string]: {
      [englishTitle: string]: string;
    };
  };
}

export const translationApi = {
  async getNavTranslations(): Promise<TranslationsResponse> {
    const response = await fetch(`${API_BASE_URL}/translations/nav-items`);

    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.statusText}`);
    }

    return response.json();
  },
};
