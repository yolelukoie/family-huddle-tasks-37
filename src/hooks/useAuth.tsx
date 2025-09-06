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
  createUser: (userData: Omit<User, 'id' | 'age' | 'profileComplete'>) => Promise<User>;
  updateUser: (updates: Partial<User>) => Promise<void>;
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

  // Load user data from Supabase profiles table
  const loadUserData = useCallback(async (supabaseUser: SupabaseUser | null) => {
    if (supabaseUser) {
      try {
        // First try to get profile from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          // Fall back to localStorage if Supabase fails
          await migrateFromLocalStorage(supabaseUser.id);
          return;
        }

        if (profile) {
          // Convert Supabase profile to User type
          const user: User = {
            id: profile.id,
            displayName: profile.display_name,
            dateOfBirth: profile.date_of_birth,
            gender: profile.gender as 'male' | 'female' | 'other',
            age: profile.age,
            profileComplete: profile.profile_complete,
            activeFamilyId: profile.active_family_id,
          };
          setUser(user);
        } else {
          // No profile in Supabase, try to migrate from localStorage
          await migrateFromLocalStorage(supabaseUser.id);
        }
      } catch (error) {
        console.error('Error in loadUserData:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  // Migrate user data from localStorage to Supabase
  const migrateFromLocalStorage = useCallback(async (userId: string) => {
    try {
      const userKey = `${USER_KEY}_${userId}`;
      const storedUser = localStorage.getItem(userKey);
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        
        // Create profile in Supabase
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: parsedUser.id,
            display_name: parsedUser.displayName,
            date_of_birth: parsedUser.dateOfBirth,
            gender: parsedUser.gender,
            age: parsedUser.age,
            profile_complete: parsedUser.profileComplete,
            active_family_id: parsedUser.activeFamilyId,
          }]);

        if (!error) {
          setUser(parsedUser);
          // Keep localStorage as backup for now
          console.log('Migrated user profile to Supabase');
        } else {
          console.error('Failed to migrate profile:', error);
          setUser(parsedUser); // Still use localStorage data
        }
      } else {
        // Try to migrate from global user key
        const globalUser = localStorage.getItem(USER_KEY);
        if (globalUser) {
          const parsedUser = JSON.parse(globalUser) as User;
          parsedUser.id = userId; // Update ID to match Supabase user
          
          const { error } = await supabase
            .from('profiles')
            .insert([{
              id: parsedUser.id,
              display_name: parsedUser.displayName,
              date_of_birth: parsedUser.dateOfBirth,
              gender: parsedUser.gender,
              age: parsedUser.age,
              profile_complete: parsedUser.profileComplete,
              active_family_id: parsedUser.activeFamilyId,
            }]);

          if (!error) {
            setUser(parsedUser);
            localStorage.setItem(userKey, JSON.stringify(parsedUser));
            localStorage.removeItem(USER_KEY);
            console.log('Migrated global user profile to Supabase');
          } else {
            console.error('Failed to migrate global profile:', error);
            setUser(parsedUser);
          }
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
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
        setTimeout(async () => {
          await loadUserData(session?.user ?? null);
          setIsLoading(false);
        }, 0);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await loadUserData(session?.user ?? null);
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
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, []);

  const createUser = useCallback(async (userData: Omit<User, 'id' | 'age' | 'profileComplete'>): Promise<User> => {
    if (!session?.user) throw new Error('Must be signed in to create user');
    
    const newUser: User = {
      ...userData,
      id: session.user.id,
      age: calculateAge(userData.dateOfBirth),
      profileComplete: true,
    };
    
    try {
      // Save to Supabase first
      const { error } = await supabase
        .from('profiles')
        .upsert([{
          id: newUser.id,
          display_name: newUser.displayName,
          date_of_birth: newUser.dateOfBirth,
          gender: newUser.gender,
          age: newUser.age,
          profile_complete: newUser.profileComplete,
          active_family_id: newUser.activeFamilyId,
        }]);

      if (error) {
        console.error('Failed to save profile to Supabase:', error);
        throw error;
      }

      // Also save to localStorage as backup
      const userKey = `${USER_KEY}_${session.user.id}`;
      localStorage.setItem(userKey, JSON.stringify(newUser));
      setUser(newUser);
      return newUser;
    } catch (error) {
      // If Supabase fails, still save to localStorage
      const userKey = `${USER_KEY}_${session.user.id}`;
      localStorage.setItem(userKey, JSON.stringify(newUser));
      setUser(newUser);
      throw error;
    }
  }, [session]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user || !session?.user) return;
    
    const updatedUser = { ...user, ...updates };
    
    try {
      // Update in Supabase first
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: updatedUser.displayName,
          date_of_birth: updatedUser.dateOfBirth,
          gender: updatedUser.gender,
          age: updatedUser.age,
          profile_complete: updatedUser.profileComplete,
          active_family_id: updatedUser.activeFamilyId,
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('Failed to update profile in Supabase:', error);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }

    // Always update localStorage and state
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
      isAuthenticated: !!session,
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