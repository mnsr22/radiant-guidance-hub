import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Moon, Star, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/islamic")({ component: IslamicPage });

const reminderItems = [
  "Morning Qur'an verse",
  "Evening Hadith",
  "Friday Surah Al-Kahf reminder",
  "Ramadan special reminders",
];

const prayerItems = [
  { label: "Show prayer times in profile", on: true },
  { label: "Pause notifications during Salah", on: true },
  { label: "Match boost after Fajr", on: false },
  { label: "Tasbih streak badges", on: true },
];

const filterItems = [
  "Prayer level visibility",
  "Madhab filter",
  "Hijab preference filter (sisters)",
  "Beard preference filter (brothers)",
  "Modesty image review (AI)",
  "Wali approval required for matches",
  "Restrict private photos",
  "No first-name display until match",
];

function useToggleMap(initial: Record<string, boolean>) {
  const [state, setState] = useState(initial);
  return {
    state,
    toggle: (key: string, on: boolean) => {
      setState((s) => ({ ...s, [key]: on }));
      toast.success(`${key} ${on ? "enabled" : "disabled"}`);
    },
  };
}

function IslamicPage() {
  const reminders = useToggleMap(Object.fromEntries(reminderItems.map((r) => [r, true])));
  const prayer = useToggleMap(Object.fromEntries(prayerItems.map((p) => [p.label, p.on])));
  const filters = useToggleMap(Object.fromEntries(filterItems.map((f) => [f, true])));

  return (
    <AdminLayout>
      <PageHeader title="Islamic Feature Controls" description="Manage faith-based features and modesty filters." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Daily reminders</h3>
              <p className="text-xs text-muted-foreground">Send Qur'an verses & Hadith to users</p>
            </div>
          </div>
          <div className="space-y-3">
            {reminderItems.map((r) => (
              <div key={r} className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-sm">{r}</Label>
                <Switch checked={reminders.state[r]} onCheckedChange={(v) => reminders.toggle(r, v)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Prayer-related features</h3>
              <p className="text-xs text-muted-foreground">Salah times and prayer integrations</p>
            </div>
          </div>
          <div className="space-y-3">
            {prayerItems.map((p) => (
              <div key={p.label} className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-sm">{p.label}</Label>
                <Switch checked={prayer.state[p.label]} onCheckedChange={(v) => prayer.toggle(p.label, v)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Filters & modesty</h3>
              <p className="text-xs text-muted-foreground">Control what filters users can apply</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {filterItems.map((r) => (
              <div key={r} className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-sm flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  {r}
                </Label>
                <Switch checked={filters.state[r]} onCheckedChange={(v) => filters.toggle(r, v)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
