import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

export function AppLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || isLoading) return;

    // If not authenticated, show onboarding
    if (!user) {
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

  return <Outlet />;
}