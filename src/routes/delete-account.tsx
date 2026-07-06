import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicShell } from "@/components/public-shell";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Halal Connect" },
      {
        name: "description",
        content:
          "Request permanent deletion of your Halal Connect account and all associated personal data.",
      },
      { property: "og:title", content: "Delete your account — Halal Connect" },
      {
        property: "og:description",
        content: "Permanently delete your Halal Connect account and personal data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DeleteAccountPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  confirm: z.literal(true, { errorMap: () => ({ message: "You must confirm" }) }),
});

function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, phone, reason, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      await api("/account/delete-request", {
        method: "POST",
        auth: false,
        body: { email, phone: phone || undefined, reason: reason || undefined },
      });
      setSent(true);
    } catch (err) {
      // Do not leak whether email exists — treat as success for privacy.
      if (err instanceof ApiError && err.status >= 500) {
        toast.error("Something went wrong. Please email privacy@halalconnect.space");
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Delete your account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Permanently remove your Halal Connect account and personal data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 shadow-elegant lg:col-span-3">
          {sent ? (
            <div className="py-6 text-center">
              <h2 className="text-lg font-semibold">Request received</h2>
              <p className="text-sm text-muted-foreground mt-2">
                If an account exists for that address, we've emailed a confirmation link.
                Follow it to complete deletion. This may take up to 30 days.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="del-email">Account email</Label>
                <Input
                  id="del-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="del-phone">Phone number (optional)</Label>
                <Input
                  id="del-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                />
                <p className="text-[11px] text-muted-foreground">
                  Helps us locate accounts registered by phone.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="del-reason">Reason (optional)</Label>
                <Textarea
                  id="del-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  placeholder="Anything you'd like us to know…"
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={confirm}
                  onCheckedChange={(v) => setConfirm(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I understand this will permanently delete my profile, matches, chats,
                  photos, tasbih streaks and subscription. This cannot be undone.
                </span>
              </label>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {busy ? "Sending…" : "Request account deletion"}
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-6 shadow-elegant lg:col-span-2 text-sm space-y-4">
          <div>
            <h3 className="font-semibold mb-1">What gets deleted</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Profile, photos, and questionnaire answers</li>
              <li>Matches, likes, and passes</li>
              <li>All chat messages you sent</li>
              <li>Tasbih sessions, streaks, and badges</li>
              <li>Push tokens and device sessions</li>
              <li>Support tickets and reports you filed</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1">What we keep briefly</h3>
            <p className="text-muted-foreground">
              Payment records required by law (up to 7 years, anonymised where possible)
              and abuse-prevention logs for accounts closed due to a policy violation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Timing</h3>
            <p className="text-muted-foreground">
              Deletion is completed within <strong>30 days</strong> of confirmation.
              Cancel your App Store or Google Play subscription separately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Prefer email?</h3>
            <p className="text-muted-foreground">
              Write to{" "}
              <a className="text-primary underline" href="mailto:privacy@halalconnect.space">
                privacy@halalconnect.space
              </a>{" "}
              from your registered address.
            </p>
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}