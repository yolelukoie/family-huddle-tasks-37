import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isPlatform } from "@/lib/platform";

/**
 * Canonical password reset page at /auth/reset.
 * Works on both web (desktop/mobile browser) and native (deep link).
 * 
 * Flow:
 * 1. Supabase recovery email links here with ?code=... or hash tokens
 * 2. We exchange the code/token for a session
 * 3. Show "Set new password" form
 * 4. On success, redirect to home
 * 
 * NEVER auto-redirects away before showing the form.
 */
export default function NativeResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showAppLink, setShowAppLink] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Log URL for debugging
  useEffect(() => {
    console.log('[reset] URL:', window.location.href);
    console.log('[reset] search params:', Object.fromEntries(searchParams.entries()));
    console.log('[reset] hash:', window.location.hash);
  }, [searchParams]);

  // On mount: exchange the recovery code/token for a session
  useEffect(() => {
    let cancelled = false;

    const establishSession = async () => {
      try {
        // Supabase PKCE flow sends ?code=...
        const code = searchParams.get("code");
        // Legacy / implicit flow sends token_hash + type
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        
        // Hash-based tokens (older Supabase flows)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const hashType = hashParams.get("type");
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        console.log('[reset] Recovery params:', { 
          code: !!code, 
          tokenHash: !!tokenHash, 
          type,
          hashType,
          hasHashTokens: !!(hashAccessToken && hashRefreshToken)
        });

        if (code) {
          // Exchange PKCE code for session
          console.log('[reset] Exchanging PKCE code...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[reset] Code exchange error:", error);
            if (!cancelled) setSessionError(error.message);
            return;
          }
        } else if (tokenHash && type === "recovery") {
          // Verify OTP for implicit flow
          console.log('[reset] Verifying OTP token_hash...');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) {
            console.error("[reset] OTP verify error:", error);
            if (!cancelled) setSessionError(error.message);
            return;
          }
        } else if (hashAccessToken && hashRefreshToken && hashType === "recovery") {
          // Hash-based recovery (Supabase implicit flow puts tokens in URL hash)
          console.log('[reset] Setting session from hash tokens...');
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (error) {
            console.error("[reset] setSession from hash error:", error);
            if (!cancelled) setSessionError(error.message);
            return;
          }
          // Clean hash from URL
          try { window.history.replaceState({}, "", window.location.pathname + window.location.search); } catch {}
        } else {
          // No recovery params — check if we already have a session 
          // (e.g., onAuthStateChange already processed the tokens)
          console.log('[reset] No explicit recovery params, checking existing session...');
          
          // Wait briefly for onAuthStateChange to process
          await new Promise(r => setTimeout(r, 500));
          
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.warn('[reset] No session found after waiting');
            if (!cancelled) setSessionError("No recovery parameters found. Please request a new password reset email.");
            return;
          }
          console.log('[reset] Found existing session (likely from onAuthStateChange)');
        }

        // Session established
        if (!cancelled) {
          console.log("[reset] ✓ Recovery session established");
          setSessionReady(true);
          
          // On mobile web, offer app link option
          if (!isPlatform('capacitor') && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
            setShowAppLink(true);
          }
        }
      } catch (err: any) {
        console.error("[reset] Unexpected error:", err);
        if (!cancelled) setSessionError(err?.message || "Failed to process reset link");
      }
    };

    establishSession();
    return () => { cancelled = true; };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "At least 8 characters.", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Could not update password", description: error.message, variant: "destructive" });
        return;
      }

      // Best-effort refresh
      void supabase.auth.refreshSession().catch(() => {});

      toast({ title: "Password updated!", description: "You can now sign in with your new password." });

      // Clean URL and go home
      try { window.history.replaceState({}, "", "/"); } catch {}
      navigate("/", { replace: true });

      // Fallback hard redirect
      setTimeout(() => {
        if (location.pathname.includes("/auth/reset")) {
          window.location.replace("/");
        }
      }, 800);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Error state
  if (sessionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>{sessionError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Validating reset link…</CardTitle>
            <CardDescription>Please wait</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Ready: show form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isUpdating}>
              {isUpdating ? "Updating…" : "Update Password"}
            </Button>
          </form>

          {/* Mobile web: offer to open in app */}
          {showAppLink && (
            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Or reset your password in the app:
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Try deep link to app
                  window.location.href = `familyhuddle://auth/reset${window.location.search}`;
                }}
              >
                Open in App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
