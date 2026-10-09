/**
 * AuthContext — provides authentication state and actions to the whole app.
 * - Reads stored JWT on mount and validates it with /api/auth/me
 * - Exposes: user, isAuthenticated, isLoading, login(), logout(), signup()
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'auditpulse_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we validate the stored token

  // On mount: restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Validate token by fetching /api/auth/me
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        // Token is invalid or expired — clear it
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * login(email, password) → calls /api/auth/signin
   * Returns { success: true } or throws an error with .userMessage
   */
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/signin', { email, password });
    const { access_token, user: profile } = res.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    setUser(profile);
    return { success: true };
  }, []);

  /**
   * signup(data) → calls /api/auth/signup
   * Returns { success: true, message } or throws an error with .userMessage
   */
  const signup = useCallback(async (data) => {
    const res = await api.post('/auth/signup', data);
    return { success: true, message: res.data.message };
  }, []);

  /**
   * logout() → calls /api/auth/logout, clears local token and user state
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore server errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
