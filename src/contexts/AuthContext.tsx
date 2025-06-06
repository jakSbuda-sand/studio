
"use client";

import type { User } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// For mock purposes, include password here. NEVER do this in a real app.
interface MockUserInternal extends User {
  password?: string;
}

const mockUsers: MockUserInternal[] = [
  { id: "admin01", name: "Admin User", email: "admin@salonverse.com", password: "password", role: "admin", avatarUrl: "https://placehold.co/128x128.png?text=AU" },
  { id: "hairdresser01", name: "Alice Smith", email: "alice@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h1", avatarUrl: "https://placehold.co/128x128.png?text=AS" },
  { id: "hairdresser02", name: "Bob Johnson", email: "bob@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h2", avatarUrl: "https://placehold.co/128x128.png?text=BJ" },
  { id: "hairdresser03", name: "Carol White", email: "carol@salonverse.com", password: "password", role: "hairdresser", hairdresserProfileId: "h3", avatarUrl: "https://placehold.co/128x128.png?text=CW" },
];

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored user on initial load (e.g., from localStorage)
    const storedUser = localStorage.getItem('salonVerseUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password_param: string): Promise<boolean> => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const foundUser = mockUsers.find(u => u.email === email && u.password === password_param);
    
    if (foundUser) {
      // Omit password before setting user state and storing
      const { password, ...userToStore } = foundUser;
      setUser(userToStore);
      localStorage.setItem('salonVerseUser', JSON.stringify(userToStore));
      setLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
