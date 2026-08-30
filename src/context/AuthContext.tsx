'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { MOCK_USERS } from '@/data/mockUsers';

interface AuthContextType {
  currentUser: User;
  role: UserRole;
  setRole: (role: UserRole) => void;
  loginAs: (roleKey: 'citizen' | 'officer' | 'admin') => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('CITIZEN');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS.citizen);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  useEffect(() => {
    const savedRole = localStorage.getItem('spv_user_role') as UserRole;
    if (savedRole && ['CITIZEN', 'OFFICER', 'ADMIN'].includes(savedRole)) {
      setRoleState(savedRole);
      if (savedRole === 'OFFICER') setCurrentUser(MOCK_USERS.officer);
      else if (savedRole === 'ADMIN') setCurrentUser(MOCK_USERS.admin);
      else setCurrentUser(MOCK_USERS.citizen);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('spv_user_role', newRole);
    if (newRole === 'OFFICER') {
      setCurrentUser(MOCK_USERS.officer);
    } else if (newRole === 'ADMIN') {
      setCurrentUser(MOCK_USERS.admin);
    } else {
      setCurrentUser(MOCK_USERS.citizen);
    }
  };

  const loginAs = (roleKey: 'citizen' | 'officer' | 'admin') => {
    setIsAuthenticated(true);
    const targetUser = MOCK_USERS[roleKey];
    setCurrentUser(targetUser);
    setRoleState(targetUser.role);
    localStorage.setItem('spv_user_role', targetUser.role);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        setRole,
        loginAs,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
