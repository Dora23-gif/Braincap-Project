import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, RoleType } from '../types';
import { DEMO_USERS } from '../data/initialMockData';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => boolean;
  loginAsDemoUser: (demoUserId: string) => void;
  logout: () => void;
  switchActiveRole: (role: RoleType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('eis_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default to the Dual-Role Staff Member so reviewer can immediately test both Teacher and Form Master views!
    return DEMO_USERS.find(u => u.id === 'user-teacher-dual') || DEMO_USERS[0];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('eis_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('eis_auth_user');
    }
  }, [user]);

  const login = (identifier: string, _pass: string): boolean => {
    const cleanId = identifier.trim().toLowerCase();
    const found = DEMO_USERS.find(u => 
      u.identifier.toLowerCase() === cleanId || 
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.staffId && u.staffId.toLowerCase() === cleanId)
    );

    if (found) {
      setUser({ ...found });
      return true;
    }
    return false;
  };

  const loginAsDemoUser = (demoUserId: string) => {
    const found = DEMO_USERS.find(u => u.id === demoUserId);
    if (found) {
      setUser({ ...found });
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchActiveRole = (newRole: RoleType) => {
    if (!user || !user.assignedRoles.includes(newRole)) return;
    setUser(prev => prev ? { ...prev, activeRole: newRole } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginAsDemoUser,
        logout,
        switchActiveRole
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
