import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/hooks/useApp";
import { TasksProvider } from "@/contexts/TasksContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/auth/AuthPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { DevStatus } from "@/components/dev/DevStatus";
import { ROUTES } from "@/lib/constants";
import MainPage from "./pages/main/MainPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import TasksPage from "./pages/tasks/TasksPage";
import GoalsPage from "./pages/goals/GoalsPage";
import ChatPage from "./pages/chat/ChatPage";
import FamilyPage from "./pages/family/FamilyPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={
            <AppProvider>
              <TasksProvider>
                <AppLayout />
                <DevStatus />
              </TasksProvider>
            </AppProvider>
          }>
            <Route index element={<MainPage />} />
            <Route path={ROUTES.onboarding.slice(1)} element={<OnboardingPage />} />
            <Route path={ROUTES.tasks.slice(1)} element={<TasksPage />} />
            <Route path={ROUTES.goals.slice(1)} element={<GoalsPage />} />
            <Route path={ROUTES.chat.slice(1)} element={<ChatPage />} />
            <Route path={ROUTES.family.slice(1)} element={<FamilyPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;