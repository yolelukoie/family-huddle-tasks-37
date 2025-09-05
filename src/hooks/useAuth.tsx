import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@/lib/types';
import { generateId, calculateAge } from '@/lib/utils';

const SESSION_KEY = 'app_session_id';
const USER_KEY = 'app_current_user';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  createUser: (userData: Omit<User, 'id' | 'age' | 'profileComplete'>) => User;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Single source of truth for session management
  const initializeSession = useCallback(() => {
    try {
      let currentSessionId = localStorage.getItem(SESSION_KEY);
      
      if (!currentSessionId) {
        // Create new session
        currentSessionId = generateId();
        localStorage.setItem(SESSION_KEY, currentSessionId);
      }
      
      setSessionId(currentSessionId);
      
      // Load user for this session
      const userKey = `${USER_KEY}_${currentSessionId}`;
      const storedUser = localStorage.getItem(userKey);
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Session initialization error:', error);
      // Clear corrupted session
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (e.newValue !== sessionId) {
          // Session changed in another tab
          const shouldUpdate = window.confirm(
            'Your session has changed in another tab. Do you want to update to the new session?'
          );
          
          if (shouldUpdate) {
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionId]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const createUser = useCallback((userData: Omit<User, 'id' | 'age' | 'profileComplete'>): User => {
    if (!sessionId) throw new Error('No session available');
    
    const newUser: User = {
      ...userData,
      id: generateId(),
      age: calculateAge(userData.dateOfBirth),
      profileComplete: true,
    };
    
    const userKey = `${USER_KEY}_${sessionId}`;
    localStorage.setItem(userKey, JSON.stringify(newUser));
    setUser(newUser);
    
    return newUser;
  }, [sessionId]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user || !sessionId) return;
    
    const updatedUser = { ...user, ...updates };
    const userKey = `${USER_KEY}_${sessionId}`;
    localStorage.setItem(userKey, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, [user, sessionId]);

  const logout = useCallback(() => {
    if (!sessionId) return;
    
    const userKey = `${USER_KEY}_${sessionId}`;
    localStorage.removeItem(userKey);
    setUser(null);
  }, [sessionId]);

  const clearAuth = useCallback(() => {
    // Clear all auth/session storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(USER_KEY) || key === SESSION_KEY) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    setSessionId(null);
    
    // Create new session
    const newSessionId = generateId();
    localStorage.setItem(SESSION_KEY, newSessionId);
    setSessionId(newSessionId);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      sessionId,
      isAuthenticated: !!user,
      isLoading,
      createUser,
      updateUser,
      logout,
      clearAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}