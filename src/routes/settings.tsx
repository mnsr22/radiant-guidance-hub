import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const features = [
  { id: "wali", label: "Wali / Guardian involvement", desc: "Allow users to invite a guardian to oversee conversations.", on: true },
  { id: "halal", label: "Halal chat mode", desc: "Restrict messaging to vetted templates and time windows.", on: true },
  { id: "video", label: "Video calls", desc: "Enable supervised video calling between matches.", on: false },
  { id: "voice", label: "Voice notes", desc: "Allow short voice messages in conversations.", on: true },
  { id: "premium", label: "Premium subscriptions", desc: "Unlock advanced filters and visibility boosts.", on: true },
];

function SettingsPage() {
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
                <Switch defaultChecked={f.on} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Matching algorithm weights</h3>
          <div className="space-y-6">
            {[
              { label: "Religious practice level", value: 90 },
              { label: "Madhab compatibility", value: 60 },
              { label: "Age proximity", value: 70 },
              { label: "Location distance", value: 45 },
              { label: "Shared interests", value: 75 },
              { label: "Education & career", value: 55 },
            ].map((w) => (
              <div key={w.label}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <Label>{w.label}</Label>
                  <span className="text-muted-foreground tabular-nums">{w.value}%</span>
                </div>
                <Slider defaultValue={[w.value]} max={100} step={5} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant lg:col-span-2">
          <h3 className="font-semibold mb-4">Community guidelines</h3>
          <Textarea
            className="min-h-32"
            defaultValue="Treat every member with respect, honor Islamic values in your conversations, and never share contact details outside the app until trust is established with a guardian's awareness."
          />
          <div className="flex justify-end mt-3">
            <Button className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant">Save changes</Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
