import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native-friendly password reset page at /auth/reset.
 * Handles Supabase recovery deep links (with code or token_hash params).
 * MUST always show the "set new password" form — never auto-navigate away.
 */
export default function NativeResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

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

        console.log("[ResetNative] Params:", { code: !!code, tokenHash: !!tokenHash, type });

        if (code) {
          // Exchange PKCE code for session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[ResetNative] Code exchange error:", error);
            if (!cancelled) setSessionError(error.message);
            return;
          }
        } else if (tokenHash && type === "recovery") {
          // Verify OTP for implicit flow
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) {
            console.error("[ResetNative] OTP verify error:", error);
            if (!cancelled) setSessionError(error.message);
            return;
          }
        } else {
          // Check if we already have a session (e.g. from onAuthStateChange processing hash)
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (!cancelled) setSessionError("No recovery parameters found. Please request a new reset link.");
            return;
          }
        }

        // Session established
        if (!cancelled) {
          console.log("[ResetNative] ✓ Recovery session established");
          setSessionReady(true);
        }
      } catch (err: any) {
        console.error("[ResetNative] Unexpected error:", err);
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

      toast({ title: "Password updated", description: "You're now signed in with your new password." });

      // Clean URL and go home
      try { window.history.replaceState({}, "", "/"); } catch {}
      navigate("/", { replace: true });
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
          <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
