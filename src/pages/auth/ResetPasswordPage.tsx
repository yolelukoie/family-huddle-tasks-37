// src/pages/auth/ResetPasswordPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ResetPasswordPage() {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Consume the email link (?code=… or #access_token/&refresh_token=…)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const hash = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
        const hp = new URLSearchParams(hash);
        const accessToken = searchParams.get("access_token") || hp.get("access_token") || undefined;
        const refreshToken = searchParams.get("refresh_token") || hp.get("refresh_token") || undefined;
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Missing credentials in reset link.");
        }

        if (!cancelled) setIsSessionReady(true);
        // Clean URL so refresh doesn’t re-run link handling
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("[reset-password] link handling failed:", err);
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, toast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don’t match", description: "Please re-enter them.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // 422: “New password should be different from the old password.”
        toast({ title: "Couldn’t update password", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Password updated", description: "You’re now signed in with the new password." });
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("[reset-password] unexpected error:", err);
      toast({ title: "Unexpected error", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Validating reset link</CardTitle>
            <CardDescription>Please wait…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter a new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="pw2">Confirm new password</Label>
              <Input
                id="pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Export default too, so both `import ResetPasswordPage` and `import { ResetPasswordPage }` work.
export default ResetPasswordPage;
