// API service for navigation
const API_BASE_URL = "http://localhost:8000/api/v1";

export interface ApiNavMenu {
  id: number;
  title: string;
  title_si: string | null;
  title_ta: string | null;
  title_tl: string | null;
  title_th: string | null;
  url: string;
  parent_id: number | null;
  level: number;
  path: string;
  group_name: string | null;
  sort_order: number;
  is_active: boolean;
  has_children: boolean;
  key_binding: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiNavRight {
  id: number;
  user_id: number;
  nav_menu_id: number;
  can_view: boolean;
  quick_access: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  nav_menu: ApiNavMenu;
}

export interface ApiNavResponse {
  user_id: number;
  nav_rights: ApiNavRight[];
  total_count: number;
}

export const navigationApi = {
  async getUserNavigation(userId: number): Promise<ApiNavResponse> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/nav-menu`);

    if (!response.ok) {
      throw new Error(`Failed to fetch navigation: ${response.statusText}`);
    }

    return response.json();
  },
};
