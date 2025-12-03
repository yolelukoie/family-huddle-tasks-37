import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/hooks/useAuth";
import { requestAndSaveFcmToken, listenForegroundMessages } from "@/lib/fcm";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import MainPage from "@/pages/main/MainPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import TasksPage from "@/pages/tasks/TasksPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import ChatPage from "@/pages/chat/ChatPage";
import FamilyPage from "@/pages/family/FamilyPage";
import PersonalPage from "@/pages/personal/PersonalPage";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/legal/TermsOfServicePage";
import NotFound from "@/pages/NotFound";
import { DevTestButton } from "@/components/dev/DevTestButton";

export function AppLayout() {
  // Mount notifications hook globally for all authenticated users
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeFamilyId } = useApp();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  /** 1) Register the FCM service worker once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        // Ensure the SW at the site root is registered (file must be in /public/)
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
        if (!cancelled) {
          // Wait until it's active so getToken can attach to it
          await navigator.serviceWorker.ready;
          // optional log
          console.log("[FCM] SW registered:", reg.scope);
        }
      } catch (e) {
        console.error("[FCM] SW register failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 2) Listen for foreground messages (token registration now triggered by user gesture) */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Check if already granted and silently register token
    if ('Notification' in window && Notification.permission === 'granted') {
      requestAndSaveFcmToken(user.id);
    }

    // Optional: show a toast when a push arrives while the tab is open
    listenForegroundMessages((p) => {
      const title = p?.notification?.title || p?.data?.title || "Family Huddle";
      const body = p?.notification?.body || p?.data?.body || "";
      toast({ title, description: body });
    });
  }, [isAuthenticated, user?.id, toast]);

  useEffect(() => {
    if (isAuthenticated && location.pathname.includes("reset-password")) {
      try {
        window.history.replaceState({}, "", "/");
      } catch {}
      // Hard redirect avoids odd cases with ad-blockers/SW/router races
      window.location.replace("/");
      // If you prefer SPA navigation, you could do:
      // navigate("/", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (authLoading || isLoading) return;

    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }

    // If authenticated but no user profile, redirect to onboarding
    if (isAuthenticated && !user) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If user exists but hasn't completed profile setup, redirect to onboarding
    if (user && !user.profileComplete) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If user has completed profile but no active family, and not on onboarding, redirect to onboarding
    if (user && user.profileComplete && !user.activeFamilyId) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If fully set up user is on onboarding page, redirect to main
    if (user?.profileComplete && user.activeFamilyId && location.pathname === ROUTES.onboarding) {
      navigate(ROUTES.main, { replace: true });
    }
  }, [user, isAuthenticated, authLoading, isLoading, navigate, location.pathname]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        <Route index element={<MainPage />} />
        <Route path={ROUTES.onboarding.slice(1)} element={<OnboardingPage />} />
        <Route path={ROUTES.tasks.slice(1)} element={<TasksPage />} />
        <Route path={ROUTES.goals.slice(1)} element={<GoalsPage />} />
        <Route path={ROUTES.chat.slice(1)} element={<ChatPage />} />
        <Route path={ROUTES.family.slice(1)} element={<FamilyPage />} />
        <Route path={ROUTES.personal.slice(1)} element={<PersonalPage />} />
        <Route path={ROUTES.privacy.slice(1)} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.terms.slice(1)} element={<TermsOfServicePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
