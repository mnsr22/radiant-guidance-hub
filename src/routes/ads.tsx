import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Upload, Trash2, Eye, Plus, Pencil, X } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAds, useAdMutations } from "@/lib/admin-hooks";
import { SOCKET_URL } from "@/lib/api";

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

// Backend uses UPPER_CASE placement/audience enums + body/ctaText/targetUrl/isActive.
const placementToApi = (p: Ad["placement"]) => p.toUpperCase();
const placementFromApi = (p: string) => p.toLowerCase() as Ad["placement"];
const audienceToApi = (a: Ad["audience"]) => (a === "new" ? "ALL" : a.toUpperCase());
const audienceFromApi = (a: string) =>
  (["all", "free", "premium"].includes(a.toLowerCase()) ? a.toLowerCase() : "all") as Ad["audience"];

function mapApiAd(x: any): Ad {
  return {
    id: x.id,
    title: x.title ?? "",
    description: x.body ?? "",
    ctaLabel: x.ctaText ?? "Learn more",
    ctaUrl: x.targetUrl ?? "",
    placement: placementFromApi(x.placement ?? "HOME_BANNER"),
    audience: audienceFromApi(x.audience ?? "ALL"),
    imageUrl: x.imageUrl ?? "",
    active: !!x.isActive,
    createdAt: x.createdAt ? new Date(x.createdAt).toLocaleDateString() : "—",
  };
}

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

// Stored images come back as `/uploads/...` paths served by the backend origin.
// SOCKET_URL is the API base minus the `/api` prefix — i.e. the server origin —
// so it always matches whatever backend the app is actually talking to.
// data: previews and absolute URLs pass through unchanged.
const resolveImg = (u: string) =>
  !u || u.startsWith("http") || u.startsWith("data:") ? u : `${SOCKET_URL}${u}`;

function AdsPage() {
  const { data: rawAds } = useAds();
  const ads = (rawAds ?? []).map(mapApiAd);
  const adMut = useAdMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Ad | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [placement, setPlacement] = useState<Ad["placement"]>("home_banner");
  const [audience, setAudience] = useState<Ad["audience"]>("all");
  // One ad per image: creating supports many, editing keeps a single image.
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle(""); setDescription(""); setCtaLabel("Learn more");
    setCtaUrl(""); setPlacement("home_banner"); setAudience("all"); setImages([]);
    setEditing(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openCreate() {
    reset();
    setOpen(true);
  }

  function openEdit(ad: Ad) {
    setEditing(ad);
    setTitle(ad.title);
    setDescription(ad.description);
    setCtaLabel(ad.ctaLabel || "Learn more");
    setCtaUrl(ad.ctaUrl);
    setPlacement(ad.placement);
    setAudience(ad.audience);
    setImages(ad.imageUrl ? [ad.imageUrl] : []);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(true);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      toast.error("Each image must be under 5MB");
    }
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
    Promise.all(
      valid.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      // Editing replaces the single image; creating appends to the batch.
      setImages((prev) => (editing ? dataUrls.slice(0, 1) : [...prev, ...dataUrls]));
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function publish() {
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (images.length === 0) {
      toast.error("Add at least one image");
      return;
    }
    const base = {
      title: title.trim(),
      body: description.trim() || undefined,
      ctaText: ctaLabel.trim() || "Learn more",
      targetUrl: ctaUrl.trim() || undefined,
      placement: placementToApi(placement),
      audience: audienceToApi(audience),
    };
    setBusy(true);
    try {
      if (editing) {
        await adMut.update.mutateAsync({
          id: editing.id,
          body: { ...base, imageUrl: images[0] },
        });
        toast.success("Ad updated");
      } else {
        const multiple = images.length > 1;
        await Promise.all(
          images.map((imageUrl, i) =>
            adMut.create.mutateAsync({
              ...base,
              title: multiple ? `${base.title} ${i + 1}` : base.title,
              imageUrl,
              isActive: true,
            }),
          ),
        );
        toast.success(
          multiple ? `${images.length} ads published to mobile app` : "Ad published to mobile app",
        );
      }
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function toggle(ad: Ad) {
    adMut.update.mutate({ id: ad.id, body: { isActive: !ad.active } });
  }
  function remove(id: string) {
    adMut.remove.mutate(id, { onSuccess: () => toast.success("Ad removed") });
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Ads & Promotions"
        description="Upload and manage ads shown across the mobile app."
        actions={
          <Button className="bg-gradient-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Ad
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit ad" : "Upload new ads"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>{editing ? "Banner image" : "Banner images"}</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button" variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> {editing ? "Replace image" : "Choose images"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      PNG/JPG, up to 5MB{editing ? "" : " each — one ad per image"}
                    </span>
                    <input
                      ref={fileRef} type="file" accept="image/*"
                      multiple={!editing}
                      className="hidden" onChange={onFile}
                    />
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-lg border">
                          <img src={resolveImg(img)} alt={`preview ${i + 1}`} className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive opacity-0 shadow transition group-hover:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
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
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={publish} className="bg-gradient-primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : images.length > 1 ? `Publish ${images.length} ads` : "Publish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
              <img src={resolveImg(ad.imageUrl)} alt={ad.title} className="h-40 w-full object-cover" />
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
                  <Switch checked={ad.active} onCheckedChange={() => toggle(ad)} />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setPreview(ad)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(ad)}>
                    <Pencil className="h-4 w-4" />
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
                <img src={resolveImg(preview.imageUrl)} alt={preview.title} className="h-44 w-full object-cover" />
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
