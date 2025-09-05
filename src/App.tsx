import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/hooks/useApp";
import { AppLayout } from "@/components/layout/AppLayout";
import { DevStatus } from "@/components/dev/DevStatus";
import { ROUTES } from "@/lib/constants";
import MainPage from "./pages/main/MainPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import TasksPage from "./pages/tasks/TasksPage";
import GoalsPage from "./pages/goals/GoalsPage";
import ChatPage from "./pages/chat/ChatPage";
import FamilyPage from "./pages/family/FamilyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route path={ROUTES.main} element={<MainPage />} />
                <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
                <Route path={ROUTES.tasks} element={<TasksPage />} />
                <Route path={ROUTES.goals} element={<GoalsPage />} />
                <Route path={ROUTES.chat} element={<ChatPage />} />
                <Route path={ROUTES.family} element={<FamilyPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <DevStatus />
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
