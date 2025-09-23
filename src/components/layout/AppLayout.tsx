import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { ROUTES } from '@/lib/constants';
import MainPage from '@/pages/main/MainPage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';
import TasksPage from '@/pages/tasks/TasksPage';
import GoalsPage from '@/pages/goals/GoalsPage';
import ChatPage from '@/pages/chat/ChatPage';
import FamilyPage from '@/pages/family/FamilyPage';
import NotFound from '@/pages/NotFound';
import { DevStatus } from '@/components/dev/DevStatus';
import { DevTestButton } from '@/components/dev/DevTestButton';

export function AppLayout() {
  // Mount notifications hook globally for all authenticated users
  useTaskNotifications();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || isLoading) return;

    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DevStatus />
      {process.env.NODE_ENV === 'development' && <DevTestButton />}
    </div>
  );
}