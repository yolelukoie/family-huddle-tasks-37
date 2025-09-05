import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

export function AppLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const { userFamilies, isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Single source of truth for routing decisions
    const userHasFamilies = user && userFamilies.some(uf => uf.userId === user.id);
    
    // If on onboarding path, always allow it
    if (location.pathname === ROUTES.onboarding) {
      return;
    }

    // Route based on family status
    if (!userHasFamilies) {
      navigate(ROUTES.onboarding, { replace: true });
    } else if (location.pathname === ROUTES.onboarding) {
      navigate(ROUTES.main, { replace: true });
    }
  }, [user, userFamilies, isLoading, navigate, location.pathname]);

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