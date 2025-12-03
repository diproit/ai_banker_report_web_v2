// API service for languages
const API_BASE_URL = "http://localhost:8000/api/v1";

export interface Language {
  id: number;
  language: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LanguageListResponse {
  languages: Language[];
  total_count: number;
}

export const languageApi = {
  async getLanguages(): Promise<LanguageListResponse> {
    const response = await fetch(`${API_BASE_URL}/languages`);

    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.statusText}`);
    }

    return response.json();
  },
};
