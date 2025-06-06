
"use client";

import type { User } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// For mock purposes, include password here. NEVER do this in a real app.
interface MockUserInternal extends User {
  password?: string;
  needsPasswordChange?: boolean; // Explicitly add here as well
}

const mockUsers: MockUserInternal[] = [
  { id: "admin01", name: "Admin User", email: "admin@salonverse.com", password: "password", role: "admin", avatarUrl: "https://placehold.co/128x128.png?text=AU", needsPasswordChange: false },
  { id: "hairdresser01", name: "Alice Smith", email: "alice@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h1", avatarUrl: "https://placehold.co/128x128.png?text=AS", needsPasswordChange: false },
  { id: "hairdresser02", name: "Bob Johnson", email: "bob@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h2", avatarUrl: "https://placehold.co/128x128.png?text=BJ", needsPasswordChange: false },
  { id: "hairdresser03", name: "Carol White", email: "carol@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h3", avatarUrl: "https://placehold.co/128x128.png?text=CW", needsPasswordChange: false },
];

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean | 'needsPasswordChange'>;
  logout: () => void;
  loading: boolean;
  updatePasswordForUser: (userId: string, newPassword: string) => Promise<boolean>; // Mock password update
  addMockUser: (user: MockUserInternal) => void; // To add users from hairdresser form
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [internalMockUsers, setInternalMockUsers] = useState<MockUserInternal[]>(mockUsers);


  useEffect(() => {
    const storedUserJson = localStorage.getItem('salonVerseUser');
    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson) as User;
      // Check if this user exists in our current mockUsers list to get full details including needsPasswordChange
      const liveUser = internalMockUsers.find(u => u.id === storedUser.id);
      if (liveUser) {
        setUser(liveUser);
      } else {
        // Stored user not in current mock list, maybe outdated. Clear it.
        localStorage.removeItem('salonVerseUser');
      }
    }
    setLoading(false);
  }, [internalMockUsers]);

  const addMockUser = (newUser: MockUserInternal) => {
    setInternalMockUsers(prevUsers => [...prevUsers, newUser]);
  };

  const login = async (email: string, password_param: string): Promise<boolean | 'needsPasswordChange'> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const foundUser = internalMockUsers.find(u => u.email === email && u.password === password_param);
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser;
      setUser(userToStore);
      localStorage.setItem('salonVerseUser', JSON.stringify(userToStore));
      setLoading(false);
      if (userToStore.role === 'hairdresser' && userToStore.needsPasswordChange) {
        return 'needsPasswordChange';
      }
      return true;
    }
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('salonVerseUser');
    router.push('/login');
  };

  const updatePasswordForUser = async (userId: string, newPassword: string): Promise<boolean> => {
    // Mock password update
    await new Promise(resolve => setTimeout(resolve, 300));
    setInternalMockUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId 
        ? { ...u, password: newPassword, needsPasswordChange: false } 
        : u
      )
    );
    // If the currently logged-in user is the one changing password, update their state
    if (user && user.id === userId) {
      const updatedUser = { ...user, needsPasswordChange: false };
      setUser(updatedUser);
      localStorage.setItem('salonVerseUser', JSON.stringify(updatedUser));
    }
    return true;
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updatePasswordForUser, addMockUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
