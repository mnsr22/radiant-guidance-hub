import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

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
  const [features, setFeatures] = useState(initialFeatures);
  const [weights, setWeights] = useState(initialWeights);
  const [guidelines, setGuidelines] = useState(initialGuidelines);
  const [saving, setSaving] = useState(false);

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
    setTimeout(() => {
      toast.success("Settings saved");
      setSaving(false);
    }, 500);
  }

  return (
    <AdminLayout>
      <PageHeader title="App Settings" description="Configure platform-wide features and matching behavior." />

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
