import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/hooks/useApp";
import { TasksProvider } from "@/contexts/TasksContext";
import { CelebrationsProvider } from "@/contexts/CelebrationsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/auth/AuthPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
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

function RealtimeRoot() {
  useRealtimeNotifications();
  return null;
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/*"
              element={
                <CelebrationsProvider>
                  <AppProvider>
                    <TasksProvider>
                      <AssignmentModalProvider>
                        <RealtimeRoot />
                        <AppLayout />
                      </AssignmentModalProvider>
                    </TasksProvider>
                  </AppProvider>
                </CelebrationsProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
