import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import { generateId, calculateAge } from "@/lib/utils";
import { deletePushToken } from "@/lib/pushNotifications";

const SESSION_KEY = "app_session_id";
const USER_KEY = "app_current_user";

// ADD: safe helpers
const getUserId = (s: Session | null) => s?.user?.id ?? null;

// EnsureProfile with this "check-only" version
const ensureProfile = async (uid: string): Promise<boolean> => {
  const { data: existing, error: selErr } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();

  if (selErr) {
    console.error("Profile select error", selErr);
    return false;
  }
  return !!existing;
};

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  createUser: (userData: Omit<User, "id" | "age" | "profileComplete">) => Promise<User>;
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
  const handlingRecovery = useRef(false);

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
      console.error("Session initialization error:", error);
      clearAuth();
    }
  }, []);

  // Load user data from Supabase profiles table
  const loadUserData = useCallback(async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        // Do NOT migrate from localStorage here
        return;
      }

      if (!profile) {
        // ensureProfile() runs in onAuthStateChange; if row isn't there yet, we'll try again on next state change / navigation
        return;
      }

      const mapped: User = {
        id: profile.id,
        displayName: profile.display_name,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender as "male" | "female" | "other",
        age: profile.age,
        profileComplete: profile.profile_complete,
        activeFamilyId: profile.active_family_id,
        avatar_url: profile.avatar_url,
      };
      setUser(mapped);
    } catch (err) {
      console.error("Error in loadUserData:", err);
      setUser(null);
    }
  }, []);

  // Migrate user data from localStorage to Supabase
  const migrateFromLocalStorage = useCallback(async (_userId: string) => {
    // Disabled during testing; Supabase is the source of truth.
    return;
  }, []);

  // Initialize auth state
  useEffect(() => {
    initializeSession();

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      // 1) Hydrate session on cold load
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      const uid = getUserId(session);
      await loadUserData(uid ? (session?.user ?? null) : null);
      if (!isMounted) return;
      setIsLoading(false);

      // 2) Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          // A) When user clicks the email link, Supabase emits PASSWORD_RECOVERY.
          //    Push to /reset-password exactly once to avoid loops.
          if (event === "PASSWORD_RECOVERY") {
            if (!handlingRecovery.current) {
              handlingRecovery.current = true;
              try {
                window.history.replaceState({}, "", "/reset-password");
              } catch {}
              window.location.replace("/reset-password");
            }
            return; // don't run the "normal" flow for this tick
          }

          // B) After updateUser({password}), Supabase emits USER_UPDATED (and often SIGNED_IN).
          //    If we're still on /reset-password, force-leave that page.
          if ((event === "USER_UPDATED" || event === "SIGNED_IN") && location.pathname.includes("reset-password")) {
            try {
              window.history.replaceState({}, "", "/");
            } catch {}
            window.location.replace("/");
            return;
          }

          // C) Your existing flow
          if (!isMounted) return;
          setSession(session);

          const uid2 = getUserId(session);
          await loadUserData(uid2 ? (session?.user ?? null) : null);

          if (!isMounted) return;
          setIsLoading(false);
        } catch (e) {
          console.error("[useAuth] onAuthStateChange handler error:", e);
          if (isMounted) setIsLoading(false);
        }
      });

      // keep a stable cleanup
      unsubscribe = () => subscription.unsubscribe();
    })();

    // cleanup
    return () => {
      isMounted = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [initializeSession, loadUserData]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (e.newValue !== sessionId) {
          const shouldUpdate = window.confirm(
            "Your session has changed in another tab. Do you want to update to the new session?",
          );

          if (shouldUpdate) {
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [sessionId]);

  // Handle Supabase email links like #access_token=...&refresh_token=...&type=recovery
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type"); // 'recovery' | 'magiclink' | etc.
    const errorParam = params.get("error");
    const errorCode = params.get("error_code");

    // Handle error redirects (expired/invalid links)
    if (errorParam || errorCode) {
      console.warn("[Auth] Error in hash:", errorParam, errorCode);
      // Clean URL and let the page handle showing the error
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (access_token && refresh_token) {
      // Prevent double-processing
      if (handlingRecovery.current && type === "recovery") return;
      if (type === "recovery") handlingRecovery.current = true;

      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            console.error("[Auth] setSession failed:", error);
            handlingRecovery.current = false;
            return;
          }
          // Clean URL - keep on reset-password for recovery, otherwise go home
          if (type === "recovery") {
            window.history.replaceState({}, "", "/reset-password");
          } else {
            window.history.replaceState({}, "", "/");
          }
        })
        .catch((e) => {
          console.error("[Auth] setSession from hash failed:", e);
          handlingRecovery.current = false;
        });
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Delete push token before signing out to prevent stale tokens
      if (session?.user?.id) {
        await deletePushToken(session.user.id);
      }
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      setUser(null);
      setSession(null);
      // drop any hash leftovers & go to the auth screen
      if (window.location.hash) window.history.replaceState({}, "", "/auth");
      window.location.assign("/auth");
    }
  }, [session]);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, []);

  const createUser = useCallback(
    async (userData: Omit<User, "id" | "age" | "profileComplete">): Promise<User> => {
      const uid = getUserId(session);
      if (!uid) throw new Error("Must be signed in to create user");

      const newUser: User = {
        ...userData,
        id: uid,
        age: calculateAge(userData.dateOfBirth),
        profileComplete: true,
      };

      try {
        // Save to Supabase first
        const { error } = await supabase.from("profiles").upsert([
          {
            id: newUser.id,
            display_name: newUser.displayName,
            date_of_birth: newUser.dateOfBirth,
            gender: newUser.gender,
            age: newUser.age,
            profile_complete: newUser.profileComplete,
            active_family_id: newUser.activeFamilyId ?? null,
          },
        ]);

        if (error) throw error;

        // Also save to localStorage as backup
        const userKey = `${USER_KEY}_${uid}`;
        localStorage.setItem(userKey, JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
      } catch (error) {
        // If Supabase fails, still save to localStorage (guarded)
        const userKey = `${USER_KEY}_${uid}`;
        localStorage.setItem(userKey, JSON.stringify(newUser));
        setUser(newUser);
        throw error;
      }
    },
    [session],
  );

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      const uid = getUserId(session);
      if (!user || !uid) return;

      const updatedUser = { ...user, ...updates };

      try {
        // Update in Supabase first
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: updatedUser.displayName,
            date_of_birth: updatedUser.dateOfBirth,
            gender: updatedUser.gender,
            age: updatedUser.age,
            profile_complete: updatedUser.profileComplete,
            active_family_id: updatedUser.activeFamilyId ?? null,
            avatar_url: updatedUser.avatar_url ?? null,
          })
          .eq("id", uid);

        if (error) {
          console.error("Failed to update profile in Supabase:", error);
          throw error;
        }

        // Update local state immediately after successful Supabase update
        const userKey = `${USER_KEY}_${uid}`;
        localStorage.setItem(userKey, JSON.stringify(updatedUser));
        setUser(updatedUser);
        console.log("User profile updated successfully:", updatedUser);
      } catch (error) {
        console.error("Error updating profile:", error);
        // Still update local state as fallback
        const userKey = `${USER_KEY}_${uid}`;
        localStorage.setItem(userKey, JSON.stringify(updatedUser));
        setUser(updatedUser);
        throw error;
      }
    },
    [user, session],
  );

  const logout = useCallback(() => {
    // Keep compatibility if any component still calls logout()
    // Just delegate to signOut so prod behaves the same.
    void signOut();
  }, [signOut]);

  const clearAuth = useCallback(() => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(USER_KEY) || key === SESSION_KEY) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    setUser(null);
    setSession(null);
    setSessionId(null);

    const newSessionId = generateId();
    localStorage.setItem(SESSION_KEY, newSessionId);
    setSessionId(newSessionId);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        isAuthenticated: !!session?.user,
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        createUser,
        updateUser,
        logout,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
