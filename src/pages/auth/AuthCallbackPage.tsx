import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * OAuth callback handler.
 * After Google (or other provider) sign-in, Supabase redirects here.
 * We exchange the URL params for a session and redirect into the app.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] URL:', window.location.href);

      // Supabase PKCE: exchange code for session
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errorParam = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (errorParam) {
        console.error('[AuthCallback] OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[AuthCallback] Code exchange failed:', exchangeError);
          setError(exchangeError.message);
          return;
        }
      }

      // Also handle hash-based tokens (implicit flow)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) {
            console.error('[AuthCallback] setSession failed:', sessionError);
            setError(sessionError.message);
            return;
          }
        }
      }

      // Verify we have a session now
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[AuthCallback] ✓ Session established, navigating to /');
        navigate('/', { replace: true });
      } else {
        console.warn('[AuthCallback] No session after callback');
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl font-bold text-destructive">Sign-in Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/auth', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}
