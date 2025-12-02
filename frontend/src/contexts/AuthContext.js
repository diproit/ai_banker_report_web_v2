import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as authLogin, logout as authLogout, verify as authVerify } from '../clients/authClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to clear authentication data and redirect to login
  const clearAuthAndRedirect = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);

    // Only redirect if not already on login page
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }, []);

  // Verify authentication status on mount and set up auth event listener
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const data = await authVerify();
        if (data.valid) {
          setIsAuthenticated(true);
          // Use full user object from verify endpoint
          setUser(data.user);
        } else {
          clearAuthAndRedirect();
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        clearAuthAndRedirect();
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();

    // Listen for unauthorized events from apiClient
    const handleUnauthorized = () => {
      console.log('Received unauthorized event, clearing auth...');
      clearAuthAndRedirect();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [clearAuthAndRedirect]);

  const login = async (userName, password) => {
    try {
      // Use centralized auth client - server sets HTTP-only cookie
      const data = await authLogin(userName, password);

      if (data && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Invalid response from server'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = useCallback(async () => {
    // Clear local state FIRST for immediate UI update
    setUser(null);
    setIsAuthenticated(false);

    try {
      // Then call backend to clear HTTP-only cookie
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Navigate to login page (state is already cleared, so ProtectedRoute will redirect)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    clearAuthAndRedirect
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};