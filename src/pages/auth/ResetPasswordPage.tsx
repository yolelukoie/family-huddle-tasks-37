// src/pages/auth/ResetPasswordPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Wait for auth context to establish session from URL tokens (handled by useAuth)
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return;

    // Mark that we've checked the session
    setHasCheckedSession(true);

    if (isAuthenticated) {
      // Session is ready - useAuth already processed the tokens
      setIsSessionReady(true);
    } else {
      // No session after auth loading completed = invalid/expired link
      toast({
        title: "Invalid or expired link",
        description: "Please request a new password reset email.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  // 2) Submit handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don’t match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("[reset-password] updateUser error:", error);
        toast({
          title: "Could not update password",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Best-effort refresh; don’t block the redirect on it.
      void supabase.auth.refreshSession().catch(() => {});

      toast({
        title: "Password updated",
        description: "You’re now signed in with your new password.",
      });

      // Clean URL again (paranoia) and navigate.
      try {
        window.history.replaceState({}, "", "/");
      } catch {}
      navigate("/", { replace: true });

      // Fallback hard redirect if SPA navigation gets stuck (service worker, cache, etc.)
      setTimeout(() => {
        // If we’re still on the reset route, force a hard navigation.
        if (location.pathname.includes("reset-password")) {
          window.location.replace("/");
        }
      }, 800);
    } catch (err: any) {
      console.error("[reset-password] unexpected error:", err);
      toast({
        title: "Unexpected error",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading guard while we establish a valid session from the link.
  if (!isSessionReady) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
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

// Export both ways to satisfy any import style
export default ResetPasswordPage;
