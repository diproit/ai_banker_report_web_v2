const API_BASE_URL = "http://localhost:8000/api/v1";

export interface LoginCredentials {
  user_name: string;
  password: string;
}

export interface User {
  id: number;
  user_name: string;
  name: string | null;
  user_role: string;
  active_branch_id: number | null;
  user_group_id: number | null;
  status: number | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User | null;
  access_token: string | null;
  token_type: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user: User | null;
  message: string | null;
}

class AuthService {
  private tokenKey = "access_token";
  private userKey = "user_data";

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Include cookies
      });

      const data: LoginResponse = await response.json();

      if (response.ok && data.success && data.access_token) {
        // Store token and user data in localStorage
        this.setToken(data.access_token);
        if (data.user) {
          this.setUser(data.user);
        }
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Login failed. Please try again.");
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();

      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage regardless of API call result
      this.clearAuth();
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<VerifyTokenResponse | null> {
    try {
      const token = this.getToken();

      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.clearAuth();
        return null;
      }

      const data: VerifyTokenResponse = await response.json();

      if (data.valid && data.user) {
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Token verification error:", error);
      this.clearAuth();
      return null;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();

      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.clearAuth();
        return null;
      }

      const user: User = await response.json();
      this.setUser(user);
      return user;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  /**
   * Store token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Store user data in localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Get user data from localStorage
   */
  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export default new AuthService();
