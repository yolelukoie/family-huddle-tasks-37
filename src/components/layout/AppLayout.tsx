import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { CelebrationsProvider } from '@/contexts/CelebrationsContext';
import { ROUTES } from '@/lib/constants';

export function AppLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || isLoading) return;

    const hasStoredUser = !!localStorage.getItem('app_current_user');

    // If not authenticated
    if (!user) {
      // If there's a stored user, wait for auth hydration
      if (hasStoredUser) {
        return;
      }
      // Otherwise, navigate to onboarding
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // Authenticated users go to main
    if (location.pathname === ROUTES.onboarding) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, isLoading, navigate, location.pathname]);

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
    <CelebrationsProvider>
      <Outlet />
    </CelebrationsProvider>
  );
}