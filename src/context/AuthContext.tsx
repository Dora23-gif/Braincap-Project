import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, RoleType } from '../types';
import { DEMO_USERS } from '../data/initialMockData';
import { api, adaptUserSessionFromBackend } from '../lib/api';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoUser: (demoUserId: string) => void;
  logout: () => void;
  switchActiveRole: (role: RoleType) => void;
  refreshSession: () => Promise<void>;
  isBackendConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('eis_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Verify and hydrate live session on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/accounts/me/')
      .then(data => {
        if (!isMounted) return;
        setIsBackendConnected(true);
        if (data && (data.id || data.username)) {
          const sessionUser = adaptUserSessionFromBackend(data);
          setUser(sessionUser);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (err?.status === 401 || err?.status === 403) {
          setIsBackendConnected(true);
          setUser(null);
          localStorage.removeItem('eis_auth_user');
        } else {
          setIsBackendConnected(false);
          const saved = localStorage.getItem('eis_auth_user');
          if (!saved) {
            setUser(null);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('eis_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('eis_auth_user');
    }
  }, [user]);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.post('/accounts/login/', {
        identifier: identifier.trim(),
        password: pass,
      });

      if (res && res.user) {
        const sessionUser = adaptUserSessionFromBackend(res.user);
        setUser(sessionUser);
        setIsBackendConnected(true);
        return { success: true };
      }

      return {
        success: false,
        error: 'Login failed: no user record returned from server.'
      };
    } catch (err: any) {
      console.warn('Backend login attempt failed:', err);
      let backendError = '';
      if (typeof err?.message === 'string' && err.message) {
        backendError = err.message;
      } else if (typeof err?.detail === 'string' && err.detail) {
        backendError = err.detail;
      } else if (err?.detail && typeof err.detail.detail === 'string') {
        backendError = err.detail.detail;
      } else {
        backendError = 'Invalid credentials. Please verify your identifier and password.';
      }

      return {
        success: false,
        error: backendError
      };
    }
  };

  const loginAsDemoUser = async (demoUserId: string) => {
    const found = DEMO_USERS.find(u => u.id === demoUserId);
    if (!found) return;
    const identifier = found.email || found.identifier;
    try {
      const res = await api.post('/accounts/login/', {
        identifier,
        password: 'Password123!',
      });
      if (res && res.user) {
        const sessionUser = adaptUserSessionFromBackend(res.user);
        setUser(sessionUser);
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Demo user live session sync failed (credentials may have changed):', err);
    }
  };

  const logout = () => {
    api.post('/accounts/logout/').catch(() => {});
    setUser(null);
  };

  const switchActiveRole = (newRole: RoleType) => {
    if (!user || !user.assignedRoles.includes(newRole)) return;
    api.patch('/accounts/me/', { active_role: newRole }).catch(() => {});
    setUser(prev => (prev ? { ...prev, activeRole: newRole } : null));
  };

  const refreshSession = async () => {
    try {
      const data = await api.get('/accounts/me/');
      if (data && (data.id || data.username)) {
        const sessionUser = adaptUserSessionFromBackend(data);
        setUser(sessionUser);
      }
    } catch (e) {
      console.warn('Session refresh error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginAsDemoUser,
        logout,
        switchActiveRole,
        refreshSession,
        isBackendConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
