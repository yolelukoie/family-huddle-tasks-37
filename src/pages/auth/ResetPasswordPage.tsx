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

  // Prepare session from email link (supports PKCE ?code=... and hash #access_token=...&refresh_token=...)
  useEffect(() => {
    let cancelled = false;

    const processLink = async () => {
      try {
        // Parse both hash and query
        const hash = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = searchParams.get("access_token") || hashParams.get("access_token") || undefined;
        const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token") || undefined;
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) setIsSessionReady(true);
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
          if (!cancelled) setIsSessionReady(true);
        } else {
          // Already have a session?
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            if (!cancelled) setIsSessionReady(true);
          } else {
            throw new Error("Missing reset credentials");
          }
        }

        // Clean URL (remove query and hash so refresh won’t break)
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Reset link processing failed:", err);
        toast({
          title: "Invalid reset link",
          description: "This password reset link is invalid or has expired.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    };

    processLink();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, toast]);

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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("[reset-password] updateUser error:", error);
        toast({
          title: "Could not update password",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Password updated", description: "You are now signed in with your new password." });
      // Make the next login clean (no leftover hash/query)
      window.history.replaceState({}, "", "/");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("[reset-password] unexpected error:", err);
      toast({
        title: "Unexpected error",
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
