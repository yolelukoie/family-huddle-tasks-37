import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
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
  const { user: clerkUser, isLoaded } = useUser();
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
      
      // Load user based on Clerk user ID if authenticated
      if (clerkUser) {
        const userKey = `${USER_KEY}_${clerkUser.id}`;
        const storedUser = localStorage.getItem(userKey);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Try to migrate from global user key
          const globalUser = localStorage.getItem(USER_KEY);
          if (globalUser) {
            const parsedUser = JSON.parse(globalUser);
            // Save to Clerk-specific key
            localStorage.setItem(userKey, globalUser);
            setUser(parsedUser);
            // Clean up global key
            localStorage.removeItem(USER_KEY);
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session initialization error:', error);
      // Clear corrupted session
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser]);

  // Initialize when Clerk is loaded
  useEffect(() => {
    if (isLoaded) {
      initializeSession();
    }
  }, [isLoaded, initializeSession]);

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

  const createUser = useCallback((userData: Omit<User, 'id' | 'age' | 'profileComplete'>): User => {
    if (!clerkUser) throw new Error('Must be signed in with Clerk to create user');
    
    const newUser: User = {
      ...userData,
      id: clerkUser.id, // Use Clerk user ID
      age: calculateAge(userData.dateOfBirth),
      profileComplete: true,
    };
    
    const userKey = `${USER_KEY}_${clerkUser.id}`;
    localStorage.setItem(userKey, JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, [clerkUser]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user || !clerkUser) return;
    
    const updatedUser = { ...user, ...updates };
    const userKey = `${USER_KEY}_${clerkUser.id}`;
    localStorage.setItem(userKey, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, [user, clerkUser]);

  const logout = useCallback(() => {
    if (clerkUser) {
      const userKey = `${USER_KEY}_${clerkUser.id}`;
      localStorage.removeItem(userKey);
    }
    localStorage.removeItem(USER_KEY); // Clean up any legacy keys
    setUser(null);
  }, [clerkUser]);

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
      isAuthenticated: !!user && !!clerkUser,
      isLoading: !isLoaded || isLoading,
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