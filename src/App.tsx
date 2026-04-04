import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/hooks/useApp";
import { TasksProvider } from "@/contexts/TasksContext";
import { CelebrationsProvider } from "@/contexts/CelebrationsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/auth/AuthPage";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";
import NativeResetPasswordPage from "@/pages/auth/NativeResetPasswordPage";
import { ROUTES } from "@/lib/constants";
import MainPage from "./pages/main/MainPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import TasksPage from "./pages/tasks/TasksPage";
import GoalsPage from "./pages/goals/GoalsPage";
import ChatPage from "./pages/chat/ChatPage";
import FamilyPage from "./pages/family/FamilyPage";
import NotFound from "./pages/NotFound";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { AssignmentModalProvider } from "@/contexts/AssignmentModalContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { isPlatform } from "@/lib/platform";

function RealtimeRoot() {
  useRealtimeNotifications();
  return null;
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPlatform('capacitor')) return;

    let isActive = true;
    let cleanup: (() => void) | null = null;

    const routeDeepLink = (incomingUrl?: string | null) => {
      if (!incomingUrl) return;

      console.log('[DeepLink] routing URL:', incomingUrl);

      try {
        const url = new URL(incomingUrl);
        const path = url.pathname;
        const search = url.search;
        const hash = url.hash;

        if (path.startsWith('/auth/reset') || path.startsWith('/reset-password')) {
          navigate(`/auth/reset${search}${hash}`, { replace: true });
          return;
        }

        if (path.startsWith('/auth/callback')) {
          navigate(`/auth/callback${search}${hash}`, { replace: true });
        }
      } catch (err) {
        console.error('[DeepLink] Failed to parse URL:', err);
      }
    };

    import('@capacitor/app').then(async ({ App }) => {
      const launchUrl = await App.getLaunchUrl().catch(() => null);
      if (isActive && launchUrl?.url) {
        console.log('[DeepLink] launchUrl:', launchUrl.url);
        routeDeepLink(launchUrl.url);
      }

      const handle = await App.addListener('appUrlOpen', (event) => {
        console.log('[DeepLink] appUrlOpen:', event.url);
        routeDeepLink(event.url);
      });

      if (!isActive) {
        await handle.remove();
        return;
      }

      cleanup = () => {
        void handle.remove();
      };
    }).catch(() => {});

    return () => {
      isActive = false;
      cleanup?.();
    };
  }, [navigate]);

  return null;
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CelebrationsProvider>
            <AppProvider>
              <SubscriptionProvider>
              <TasksProvider>
                <AssignmentModalProvider>
                  <DeepLinkHandler />
                  <RealtimeRoot />
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    <Route path="/auth/reset" element={<NativeResetPasswordPage />} />
                    <Route path="/reset-password" element={<NativeResetPasswordPage />} />
                    <Route path="/*" element={<AppLayout />} />
                  </Routes>
                </AssignmentModalProvider>
              </TasksProvider>
              </SubscriptionProvider>
            </AppProvider>
          </CelebrationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
