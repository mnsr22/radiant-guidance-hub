import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, PlugZap, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Configure Pesapal payments for subscriptions and gifts without updating the Halal Connect app.",
      },
      { property: "og:title", content: "Payment Gateway — Halal Connect Admin" },
      {
        property: "og:description",
        content:
          "Configure Pesapal payments for subscriptions and gifts without updating the Halal Connect app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

type Config = {
  provider: "pesapal";
  environment: "sandbox" | "live";
  enabled: boolean;
  currency: string;
  apiBaseUrl: string;
  ipnId: string;
  callbackUrl: string;
  hasCredentials: boolean;
};

const DEFAULTS: Config = {
  provider: "pesapal",
  environment: "sandbox",
  enabled: false,
  currency: "UGX",
  apiBaseUrl: "https://cybqa.pesapal.com/pesapalv3",
  ipnId: "",
  callbackUrl: "https://halalconnect.space/payment-return",
  hasCredentials: false,
};

const BASE_URLS = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  live: "https://pay.pesapal.com/v3",
};

function PaymentsPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    api<Partial<Config>>("/admin/payments/config")
      .then((d) => {
        setCfg((current) => ({ ...current, ...d }));
        setConfigError(null);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Could not load saved payment settings";
        setConfigError(message);
        toast.error(message);
      });
  }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));

  async function save() {
    if (Boolean(key) !== Boolean(secret)) {
      toast.error(
        "Enter both the Pesapal consumer key and secret, or leave both blank to keep the saved credentials.",
      );
      return;
    }
    setSaving(true);
    try {
      const { provider, environment, enabled, currency, ipnId, callbackUrl } = cfg;
      const body: Record<string, unknown> = {
        provider,
        environment,
        enabled,
        currency,
        ipnId,
        callbackUrl,
      };
      // Keys are sent once and stored encrypted on the server; they are never read back.
      if (key && secret) Object.assign(body, { consumerKey: key, consumerSecret: secret });
      const saved = await api<Partial<Config>>("/admin/payments/config", {
        method: "PATCH",
        body,
      });
      setCfg((current) => ({ ...current, ...saved }));
      setConfigError(null);
      setKey("");
      setSecret("");
      toast.success(
        "Saved — the app uses these settings on the next payment, no app update needed",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (Boolean(key) !== Boolean(secret)) {
      toast.error("Enter both Pesapal credentials before testing them.");
      return;
    }
    if (!cfg.hasCredentials && !key && !secret) {
      toast.error("Save or enter Pesapal credentials before testing the connection.");
      return;
    }
    setTesting(true);
    try {
      const r = await api<{ ok: boolean; message?: string }>("/admin/payments/test-connection", {
        method: "POST",
        body: {
          ...(key && secret ? { consumerKey: key, consumerSecret: secret } : {}),
          environment: cfg.environment,
        },
      });
      if (r.ok) {
        toast.success("Connected to Pesapal");
      } else {
        toast.error(r.message ?? "Pesapal rejected the keys");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Payment Gateway"
        description="Pesapal settings used for subscriptions and gift purchases. Changes apply instantly in the app."
        actions={
          <Badge
            className={
              cfg.enabled ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
            }
          >
            {cfg.enabled
              ? `Live payments ${cfg.environment === "live" ? "ON" : "(test mode)"}`
              : "Payments off"}
          </Badge>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {configError && (
          <p
            role="alert"
            className="lg:col-span-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
          >
            Saved payment settings could not be loaded: {configError}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="h-5 w-5" /> Gateway
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Accept payments</Label>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex gap-2">
                {(["sandbox", "live"] as const).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={cfg.environment === m ? "default" : "outline"}
                    onClick={() => set("environment", m)}
                  >
                    {m === "sandbox" ? "Test" : "Live"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pesapal API address</Label>
              <Input value={BASE_URLS[cfg.environment]} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={cfg.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label>IPN ID (from Pesapal)</Label>
              <Input
                value={cfg.ipnId}
                onChange={(e) => set("ipnId", e.target.value)}
                placeholder="Registered notification ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Return page after payment</Label>
              <Input value={cfg.callbackUrl} onChange={(e) => set("callbackUrl", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Pesapal keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cfg.hasCredentials && (
              <p className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Keys saved. Enter new ones only to replace
                them.
              </p>
            )}
            <div className="space-y-2">
              <Label>Consumer key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumer secret</Label>
              <Input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Keys go straight to your server, are stored encrypted, and are never shown again or
              sent to the phone app. Notification address to register in Pesapal:{" "}
              <code>https://admin.halalconnect.space/api/public/payments/pesapal/ipn</code>
            </p>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save settings"}
              </Button>
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing ? "Testing…" : "Test connection"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
