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
import { isPlatform } from "@/lib/platform";

function RealtimeRoot() {
  useRealtimeNotifications();
  return null;
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPlatform('capacitor')) return;

    let cleanup: (() => void) | null = null;

    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appUrlOpen', (event) => {
        console.log('[DeepLink] appUrlOpen:', event.url);
        try {
          const url = new URL(event.url);
          const path = url.pathname;
          const search = url.search;
          const hash = url.hash;

          if (path.startsWith('/auth/reset') || path.startsWith('/reset-password')) {
            navigate(`/auth/reset${search}${hash}`, { replace: true });
          } else if (path.startsWith('/auth/callback')) {
            navigate(`/auth/callback${search}${hash}`, { replace: true });
          }
        } catch (err) {
          console.error('[DeepLink] Failed to parse URL:', err);
        }
      });
      listener.then(handle => { cleanup = () => handle.remove(); });
    }).catch(() => {});

    return () => { cleanup?.(); };
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
            </AppProvider>
          </CelebrationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
