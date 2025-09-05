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
      
      // Load global user (one user - one account)
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Backward compatibility: migrate any session-scoped user to global key
        const legacyKey = `${USER_KEY}_${currentSessionId}`;
        const legacyUser = localStorage.getItem(legacyKey);
        if (legacyUser) {
          localStorage.setItem(USER_KEY, legacyUser);
          setUser(JSON.parse(legacyUser));
        } else {
          // Fallback: pick the first key that matches old pattern app_current_user_*
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${USER_KEY}_`)) {
              const val = localStorage.getItem(key);
              if (val) {
                localStorage.setItem(USER_KEY, val);
                setUser(JSON.parse(val));
                break;
              }
            }
          }
        }
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
    const newUser: User = {
      ...userData,
      id: generateId(),
      age: calculateAge(userData.dateOfBirth),
      profileComplete: true,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

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