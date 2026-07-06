import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicShell } from "@/components/public-shell";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Support & Help — Halal Connect" },
      {
        name: "description",
        content:
          "Get help with Halal Connect: account, matches, subscriptions, safety and privacy. Contact our support team.",
      },
      { property: "og:title", content: "Support & Help — Halal Connect" },
      {
        property: "og:description",
        content: "FAQs and contact form for Halal Connect support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: HelpPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  category: z.enum(["account", "matches", "billing", "safety", "bug", "other"]),
  subject: z.string().trim().min(3, "Subject is too short").max(150),
  message: z.string().trim().min(10, "Please describe the issue").max(2000),
});

const FAQ = [
  {
    q: "How do I reset my password?",
    a: "Open the app, tap 'Forgot password' on the login screen and follow the emailed link. Links expire after 60 minutes.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Subscriptions are billed through the App Store or Google Play. Manage or cancel from your device's Subscriptions settings. Deleting your account does not cancel the subscription automatically.",
  },
  {
    q: "How do I report a user?",
    a: "Open the user's profile or chat, tap the ⋯ menu and choose 'Report'. Pick a reason and add optional detail. Our moderation team reviews reports within 24 hours.",
  },
  {
    q: "How do I hide my profile temporarily?",
    a: "Go to Settings → Privacy → Pause profile. Your profile is removed from discovery and matches can't message you until you resume it.",
  },
  {
    q: "How does the tasbih streak work?",
    a: "Complete your daily dhikr goal to keep your streak alive. You have a small number of monthly grace days for missed days. Streaks sync automatically when your device is online.",
  },
  {
    q: "How do I permanently delete my account?",
    a: "Use Settings → Account → Delete account inside the app, or submit the public form at /delete-account.",
  },
];

function HelpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, category, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      await api("/support/ticket", {
        method: "POST",
        auth: false,
        body: parsed.data,
      });
      setSent(true);
      toast.success("Ticket submitted — we'll reply by email.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Support &amp; Help</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Browse common questions or send us a message. We typically reply within 24 hours.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 shadow-elegant lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`i-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-6 text-xs text-muted-foreground">
            Also see our{" "}
            <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> and{" "}
            <Link to="/delete-account" className="text-primary underline">Delete account</Link> page.
          </p>
        </Card>

        <Card className="p-6 shadow-elegant lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Contact support</h2>
          {sent ? (
            <div className="py-4 text-center text-sm">
              <p className="font-medium">Thanks — we got your message.</p>
              <p className="text-muted-foreground mt-2">
                A reply will arrive at {email} within 24 hours.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="h-name">Your name</Label>
                <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-email">Email</Label>
                <Input id="h-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Account &amp; login</SelectItem>
                    <SelectItem value="matches">Matches &amp; chat</SelectItem>
                    <SelectItem value="billing">Billing &amp; subscription</SelectItem>
                    <SelectItem value="safety">Safety &amp; report</SelectItem>
                    <SelectItem value="bug">Bug report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-subject">Subject</Label>
                <Input id="h-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={150} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-message">Message</Label>
                <Textarea
                  id="h-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={2000}
                  className="min-h-28"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
              >
                {busy ? "Sending…" : "Send message"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                By submitting you agree to our{" "}
                <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}