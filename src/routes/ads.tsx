import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Upload, Trash2, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/ads")({ component: AdsPage });

type Ad = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: "home_banner" | "between_matches" | "chat_top" | "profile_sidebar";
  audience: "all" | "free" | "premium" | "new";
  imageUrl: string;
  active: boolean;
  createdAt: string;
};

const placementLabel: Record<Ad["placement"], string> = {
  home_banner: "Home Banner",
  between_matches: "Between Matches",
  chat_top: "Chat Top",
  profile_sidebar: "Profile Sidebar",
};

const audienceLabel: Record<Ad["audience"], string> = {
  all: "All users",
  free: "Free users",
  premium: "Premium",
  new: "New signups",
};

const seed: Ad[] = [
  {
    id: "ad_001",
    title: "Find your halal match",
    description: "Upgrade to Premium for unlimited matches.",
    ctaLabel: "Upgrade",
    ctaUrl: "https://example.com/premium",
    placement: "home_banner",
    audience: "free",
    imageUrl:
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&h=300&fit=crop",
    active: true,
    createdAt: "2 days ago",
  },
];

function AdsPage() {
  const [ads, setAds] = useState<Ad[]>(seed);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Ad | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [placement, setPlacement] = useState<Ad["placement"]>("home_banner");
  const [audience, setAudience] = useState<Ad["audience"]>("all");
  const [imageUrl, setImageUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle(""); setDescription(""); setCtaLabel("Learn more");
    setCtaUrl(""); setPlacement("home_banner"); setAudience("all"); setImageUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function publish() {
    if (!title.trim() || !imageUrl) {
      toast.error("Add a title and image");
      return;
    }
    const ad: Ad = {
      id: `ad_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      ctaLabel: ctaLabel.trim() || "Learn more",
      ctaUrl: ctaUrl.trim(),
      placement, audience, imageUrl,
      active: true,
      createdAt: "just now",
    };
    setAds((prev) => [ad, ...prev]);
    toast.success("Ad published to mobile app");
    setOpen(false);
    reset();
  }

  function toggle(id: string) {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }
  function remove(id: string) {
    setAds((prev) => prev.filter((a) => a.id !== id));
    toast.success("Ad removed");
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Ads & Promotions"
        description="Upload and manage ads shown across the mobile app."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> New Ad</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload new ad</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>Banner image</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button" variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> Choose image
                    </Button>
                    <span className="text-xs text-muted-foreground">PNG/JPG, up to 5MB</span>
                    <input
                      ref={fileRef} type="file" accept="image/*"
                      className="hidden" onChange={onFile}
                    />
                  </div>
                  {imageUrl && (
                    <div className="overflow-hidden rounded-lg border">
                      <img src={imageUrl} alt="preview" className="h-40 w-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label>CTA label</Label>
                  <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={24} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>CTA URL</Label>
                  <Input placeholder="https://..." value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Placement</Label>
                  <Select value={placement} onValueChange={(v) => setPlacement(v as Ad["placement"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(placementLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v as Ad["audience"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(audienceLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={publish} className="bg-gradient-primary">Publish</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ads.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Megaphone className="h-8 w-8" />
              <p>No ads yet. Click "New Ad" to upload one.</p>
            </CardContent>
          </Card>
        )}
        {ads.map((ad) => (
          <Card key={ad.id} className="overflow-hidden">
            <div className="relative">
              <img src={ad.imageUrl} alt={ad.title} className="h-40 w-full object-cover" />
              <Badge
                className="absolute right-2 top-2"
                variant={ad.active ? "default" : "secondary"}
              >
                {ad.active ? "Live" : "Paused"}
              </Badge>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ad.title}</CardTitle>
              <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{placementLabel[ad.placement]}</Badge>
                <Badge variant="outline">{audienceLabel[ad.audience]}</Badge>
                <Badge variant="outline">{ad.createdAt}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={ad.active} onCheckedChange={() => toggle(ad.id)} />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setPreview(ad)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(ad.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mobile preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="rounded-2xl border bg-background p-3 shadow-elegant">
              <div className="overflow-hidden rounded-xl">
                <img src={preview.imageUrl} alt={preview.title} className="h-44 w-full object-cover" />
              </div>
              <div className="space-y-1 p-2">
                <p className="font-semibold">{preview.title}</p>
                <p className="text-sm text-muted-foreground">{preview.description}</p>
                {preview.ctaUrl && (
                  <Button asChild size="sm" className="mt-2 bg-gradient-primary">
                    <a href={preview.ctaUrl} target="_blank" rel="noreferrer">
                      {preview.ctaLabel}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
