import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/halal-connect-logo.png";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  adminLogin,
  ApiError,
  resendAdminLoginOtp,
  verifyAdminLoginOtp,
} from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeNotice, setCodeNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (challengeId) {
        const user = await verifyAdminLoginOtp(challengeId, code.trim());
        toast.success(`Welcome, ${user.name}`);
        navigate({ to: "/" });
      } else {
        const result = await adminLogin(email.trim(), password);
        if (result.requiresAdminOtp === true) {
          setChallengeId(result.challengeId);
          setCode(result.otpCode ?? "");
          setCodeNotice(
            result.otpCode
              ? "Development code returned by the local server."
              : `A one-time code was sent to ${email.trim()}.`,
          );
          return;
        }
        toast.success(`Welcome, ${result.user.name}`);
        navigate({ to: "/" });
      }
    } catch (err) {
      // ApiError now also covers timeouts and unreachable-host failures, so the
      // toast says what actually went wrong instead of a blanket "Login failed".
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : "Login failed";
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!challengeId || loading) return;
    setLoading(true);
    try {
      const next = await resendAdminLoginOtp(challengeId);
      setChallengeId(next.challengeId);
      setCode(next.otpCode ?? "");
      setCodeNotice(
        next.otpCode
          ? "Development code returned by the local server."
          : `A new one-time code was sent to ${email.trim()}.`,
      );
      toast.success("A new sign-in code was sent.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not resend the sign-in code.",
        { duration: 8000 },
      );
    } finally {
      setLoading(false);
    }
  }

  function cancelOtp() {
    setChallengeId(null);
    setCode("");
    setCodeNotice("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="Halal Connect" className="mb-4 h-24 w-auto max-w-20 object-contain" />
          <h1 className="text-xl font-bold tracking-tight">Halal Connect Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {challengeId ? "Verify your admin sign-in" : "Sign in to the dashboard"}
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {!challengeId ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-otp">One-time code</Label>
              <Input
                id="admin-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <p className="text-xs text-muted-foreground">{codeNotice}</p>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-primary hover:underline" onClick={resendCode} disabled={loading}>
                  Resend code
                </button>
                <button type="button" className="text-muted-foreground hover:underline" onClick={cancelOtp} disabled={loading}>
                  Back to sign in
                </button>
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || (!!challengeId && code.length !== 6)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {challengeId ? "Verify and sign in" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin access only. Configure ADMIN_EMAILS on the backend.
        </p>
      </Card>
    </div>
  );
}
