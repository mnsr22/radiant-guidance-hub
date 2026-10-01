import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/halal-connect-logo.png";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminLogin, ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const user = await adminLogin(email.trim(), password);
      toast.success(`Welcome, ${user.name}`);
      navigate({ to: "/" });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="Halal Connect" className="mb-4 h-24 w-auto max-w-20 object-contain" />
          <h1 className="text-xl font-bold tracking-tight">Halal Connect Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the dashboard</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin access only. Configure ADMIN_EMAILS on the backend.
        </p>
      </Card>
    </div>
  );
}
