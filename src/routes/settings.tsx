import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings, useSettingsMutation, useMe, useUpdateMe } from "@/lib/admin-hooks";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

type TermsDocument = {
  title: string;
  intro: string;
  version: string;
  sections: { title: string; body: string }[];
};

const initialFeatures = [
  { id: "wali", label: "Wali / Guardian involvement", desc: "Allow users to invite a guardian to oversee conversations.", on: true },
  { id: "halal", label: "Halal chat mode", desc: "Restrict messaging to vetted templates and time windows.", on: true },
  { id: "video", label: "Video calls", desc: "Enable supervised video calling between matches.", on: false },
  { id: "voice", label: "Voice notes", desc: "Allow short voice messages in conversations.", on: true },
  { id: "premium", label: "Premium subscriptions", desc: "Unlock advanced filters and visibility boosts.", on: true },
];

const initialWeights = [
  { id: "practice", label: "Religious practice level", value: 90 },
  { id: "madhab", label: "Madhab compatibility", value: 60 },
  { id: "age", label: "Age proximity", value: 70 },
  { id: "location", label: "Location distance", value: 45 },
  { id: "interests", label: "Shared interests", value: 75 },
  { id: "education", label: "Education & career", value: 55 },
];

const initialGuidelines =
  "Treat every member with respect, honor Islamic values in your conversations, and never share contact details outside the app until trust is established with a guardian's awareness.";

function SettingsPage() {
  const { data: stored } = useSettings();
  const settingsMut = useSettingsMutation();
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const [features, setFeatures] = useState(initialFeatures);
  const [weights, setWeights] = useState(initialWeights);
  const [guidelines, setGuidelines] = useState(initialGuidelines);
  const [saving, setSaving] = useState(false);

  // Account/profile form for the logged-in admin.
  const [profile, setProfile] = useState({ name: "", email: "", password: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [terms, setTerms] = useState<TermsDocument | null>(null);
  const [savingTerms, setSavingTerms] = useState(false);
  const [termsLoadError, setTermsLoadError] = useState("");
  useEffect(() => {
    if (me) setProfile({ name: me.name ?? "", email: me.email ?? "", password: "" });
  }, [me]);
  useEffect(() => {
    api<TermsDocument>("/legal/terms")
      .then((document) => {
        setTerms(document);
        setTermsLoadError("");
      })
      .catch((error) => {
        setTermsLoadError(error instanceof Error ? error.message : "Terms could not be loaded");
      });
  }, []);

  function saveProfile() {
    if (!profile.name.trim()) return toast.error("Name can't be empty");
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) return toast.error("Enter a valid email");
    if (profile.password && profile.password.length < 6)
      return toast.error("Password must be at least 6 characters");
    setSavingProfile(true);
    updateMe.mutate(
      {
        name: profile.name.trim(),
        email: profile.email.trim(),
        ...(profile.password ? { password: profile.password } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          setProfile((p) => ({ ...p, password: "" }));
          setSavingProfile(false);
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Failed to update profile");
          setSavingProfile(false);
        },
      },
    );
  }

  // Hydrate from the stored AppSettings once they load.
  useEffect(() => {
    if (!stored) return;
    if (Array.isArray(stored.features)) {
      setFeatures(initialFeatures.map((f) => {
        const s = (stored.features as any[]).find((x) => x.id === f.id);
        return s ? { ...f, on: !!s.on } : f;
      }));
    }
    if (Array.isArray(stored.matchingWeights)) {
      setWeights(initialWeights.map((w) => {
        const s = (stored.matchingWeights as any[]).find((x) => x.id === w.id);
        return s ? { ...w, value: Number(s.value) } : w;
      }));
    }
    if (typeof stored.guidelines === "string") setGuidelines(stored.guidelines);
  }, [stored]);

  function toggleFeature(id: string, on: boolean) {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, on } : f)));
    const label = features.find((f) => f.id === id)?.label ?? id;
    toast.success(`${label} ${on ? "enabled" : "disabled"}`);
  }

  function setWeight(id: string, value: number) {
    setWeights((prev) => prev.map((w) => (w.id === id ? { ...w, value } : w)));
  }

  function handleSave() {
    setSaving(true);
    settingsMut.mutate(
      {
        features: features.map((f) => ({ id: f.id, on: f.on })),
        matchingWeights: weights.map((w) => ({ id: w.id, value: w.value })),
        guidelines,
      },
      {
        onSuccess: () => {
          toast.success("Settings saved");
          setSaving(false);
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Failed to save");
          setSaving(false);
        },
      },
    );
  }

  function saveTerms() {
    if (!terms) return;
    if (!terms.title.trim() || !terms.intro.trim() || terms.sections.length === 0 ||
      terms.sections.some((section) => !section.title.trim() || !section.body.trim())) {
      toast.error("Complete the title, introduction, and every terms section before saving.");
      return;
    }
    setSavingTerms(true);
    api<TermsDocument>("/legal/terms", {
      method: "PATCH",
      body: { title: terms.title, intro: terms.intro, sections: terms.sections },
    }).then((saved) => {
      setTerms(saved);
      toast.success("Terms & Conditions updated");
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Terms could not be saved");
    }).finally(() => setSavingTerms(false));
  }

  return (
    <AdminLayout>
      <PageHeader title="Profile & Settings" description="Manage your admin account and configure platform-wide behavior." />

      <Card className="p-5 shadow-elegant mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">My account</h3>
          <Badge variant="secondary" className="capitalize">{me?.role ?? "admin"}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="acct-name">Full name</Label>
            <Input id="acct-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acct-email">Email</Label>
            <Input id="acct-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acct-pass">New password</Label>
            <Input id="acct-pass" type="password" placeholder="Leave blank to keep current" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            disabled={savingProfile || !me}
            onClick={saveProfile}
            className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
          >
            {savingProfile ? "Saving…" : "Update profile"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 shadow-elegant mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold">Terms & Conditions</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Signup uses this published version. Saving creates a new version and new members must accept it.
            </p>
          </div>
          {terms && <Badge variant="secondary">Version {terms.version}</Badge>}
        </div>
        {termsLoadError ? (
          <p role="alert" className="text-sm text-destructive">{termsLoadError}</p>
        ) : !terms ? (
          <p className="text-sm text-muted-foreground">Loading the current terms…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="terms-title">Document title</Label>
              <Input id="terms-title" value={terms.title}
                onChange={(e) => setTerms({ ...terms, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms-intro">Introduction</Label>
              <Textarea id="terms-intro" value={terms.intro}
                onChange={(e) => setTerms({ ...terms, intro: e.target.value })} />
            </div>
            {terms.sections.map((section, index) => (
              <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`terms-section-title-${index}`}>Section title</Label>
                    <Input id={`terms-section-title-${index}`} value={section.title}
                      onChange={(e) => setTerms({
                        ...terms,
                        sections: terms.sections.map((item, i) =>
                          i === index ? { ...item, title: e.target.value } : item),
                      })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`terms-section-body-${index}`}>Section text</Label>
                    <Textarea id={`terms-section-body-${index}`} className="min-h-24" value={section.body}
                      onChange={(e) => setTerms({
                        ...terms,
                        sections: terms.sections.map((item, i) =>
                          i === index ? { ...item, body: e.target.value } : item),
                      })} />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove section ${index + 1}`}
                  disabled={terms.sections.length <= 1}
                  onClick={() => setTerms({
                    ...terms,
                    sections: terms.sections.filter((_, i) => i !== index),
                  })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setTerms({
                ...terms,
                sections: [...terms.sections, { title: "", body: "" }],
              })}>
                <Plus className="h-4 w-4 mr-2" /> Add section
              </Button>
              <Button disabled={savingTerms} onClick={saveTerms}
                className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant">
                {savingTerms ? "Saving…" : "Publish terms"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Feature toggles</h3>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <Label className="text-sm font-medium">{f.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                <Switch checked={f.on} onCheckedChange={(on) => toggleFeature(f.id, on)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Matching algorithm weights</h3>
          <div className="space-y-6">
            {weights.map((w) => (
              <div key={w.id}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <Label>{w.label}</Label>
                  <span className="text-muted-foreground tabular-nums">{w.value}%</span>
                </div>
                <Slider
                  value={[w.value]}
                  onValueChange={([v]) => setWeight(w.id, v)}
                  max={100}
                  step={5}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant lg:col-span-2">
          <h3 className="font-semibold mb-4">Community guidelines</h3>
          <Textarea
            className="min-h-32"
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <Button
              disabled={saving}
              onClick={handleSave}
              className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
