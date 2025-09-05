import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/lib/types';
import { generateId, calculateAge } from '@/lib/utils';

const SESSION_KEY = 'app_session_id';
const USER_KEY = 'app_current_user';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  createUser: (userData: Omit<User, 'id' | 'age' | 'profileComplete'>) => User;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session management
  const initializeSession = useCallback(() => {
    try {
      let currentSessionId = localStorage.getItem(SESSION_KEY);
      
      if (!currentSessionId) {
        currentSessionId = generateId();
        localStorage.setItem(SESSION_KEY, currentSessionId);
      }
      
      setSessionId(currentSessionId);
    } catch (error) {
      console.error('Session initialization error:', error);
      clearAuth();
    }
  }, []);

  // Load user data from localStorage based on Supabase user ID
  const loadUserData = useCallback((supabaseUser: SupabaseUser | null) => {
    if (supabaseUser) {
      const userKey = `${USER_KEY}_${supabaseUser.id}`;
      const storedUser = localStorage.getItem(userKey);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Try to migrate from global user key
        const globalUser = localStorage.getItem(USER_KEY);
        if (globalUser) {
          const parsedUser = JSON.parse(globalUser);
          localStorage.setItem(userKey, globalUser);
          setUser(parsedUser);
          localStorage.removeItem(USER_KEY);
        }
      }
    } else {
      setUser(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    initializeSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        // Defer user data loading to prevent deadlock
        setTimeout(() => {
          loadUserData(session?.user ?? null);
          setIsLoading(false);
        }, 0);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadUserData(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initializeSession, loadUserData]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (e.newValue !== sessionId) {
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

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, []);

  const createUser = useCallback((userData: Omit<User, 'id' | 'age' | 'profileComplete'>): User => {
    if (!session?.user) throw new Error('Must be signed in to create user');
    
    const newUser: User = {
      ...userData,
      id: session.user.id,
      age: calculateAge(userData.dateOfBirth),
      profileComplete: true,
    };
    
    const userKey = `${USER_KEY}_${session.user.id}`;
    localStorage.setItem(userKey, JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, [session]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user || !session?.user) return;
    
    const updatedUser = { ...user, ...updates };
    const userKey = `${USER_KEY}_${session.user.id}`;
    localStorage.setItem(userKey, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, [user, session]);

  const logout = useCallback(() => {
    if (session?.user) {
      const userKey = `${USER_KEY}_${session.user.id}`;
      localStorage.removeItem(userKey);
    }
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, [session]);

  const clearAuth = useCallback(() => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(USER_KEY) || key === SESSION_KEY) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    setSession(null);
    setSessionId(null);
    
    const newSessionId = generateId();
    localStorage.setItem(SESSION_KEY, newSessionId);
    setSessionId(newSessionId);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      sessionId,
      isAuthenticated: !!user && !!session,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
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