import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper: small wait
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Ensure we *really* have an authenticated session from the email link
  useEffect(() => {
    let cancelled = false;

    const prepareSessionFromLink = async () => {
      try {
        // Accept both hash (#access_token...) and query (?code=...) styles
        const hash = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = searchParams.get("access_token") || hashParams.get("access_token") || undefined;
        const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token") || undefined;
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        }

        // Poll briefly until the session is definitely available (avoids races)
        for (let i = 0; i < 20; i++) {
          // up to ~2s
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            if (!cancelled) setIsSessionReady(true);
            break;
          }
          await sleep(100);
        }

        // If link had no tokens, we might already be signed in (e.g., dev)
        if (!cancelled && !isSessionReady) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) setIsSessionReady(true);
        }

        // Clean URL (remove hash/query)
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Reset link processing failed:", err);
        if (!cancelled) {
          toast({
            title: "Invalid reset link",
            description: "This password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/auth", { replace: true });
        }
      }
    };

    prepareSessionFromLink();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
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

    setIsLoading(true);
    try {
      // Double-check we have a session before calling updateUser
      const { data: s1 } = await supabase.auth.getSession();
      if (!s1.session) {
        // Try a quick refresh once
        await supabase.auth.refreshSession();
        const { data: s2 } = await supabase.auth.getSession();
        if (!s2.session) {
          throw new Error("No active reset session. Please open the latest email link again.");
        }
      }

      // Guard against hanging requests by racing with a timeout
      const updatePromise = supabase.auth.updateUser({ password });
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("Network timeout while updating password.")), 15000),
      );

      const { error } = (await Promise.race([updatePromise, timeout])) as Awaited<
        ReturnType<typeof supabase.auth.updateUser>
      >;
      if (error) {
        console.error("[reset-password] updateUser error:", error);
        toast({
          title: "Could not update password",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // (Optional) Sign out to invalidate old tokens, then send to /auth
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch (_) {
        // ignore
      }

      toast({ title: "Password updated", description: "Please sign in with your new password." });
      window.history.replaceState({}, "", "/auth");
      navigate("/auth", { replace: true });
    } catch (err: any) {
      console.error("[reset-password] unexpected error:", err);
      toast({
        title: "Error updating password",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Validating reset link</CardTitle>
            <CardDescription>Please wait...</CardDescription>
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
