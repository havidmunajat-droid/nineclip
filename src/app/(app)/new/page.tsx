"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Captions,
  Crop,
  Hash,
  Loader2,
  Sparkles,
  Upload,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CLIP_LENGTH_LABELS, type ClipLengthPreset } from "@/lib/types";
import { createProject, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const lengthOptions: ClipLengthPreset[] = ["auto", "lt30", "30to60", "60to90"];
const languages = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "auto", label: "Deteksi otomatis" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"youtube" | "upload">("youtube");
  const [url, setUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [clipLength, setClipLength] = useState<ClipLengthPreset>("auto");
  const [language, setLanguage] = useState("id");
  const [autoCaption, setAutoCaption] = useState(true);
  const [autoReframe, setAutoReframe] = useState(true);
  const [hashtags, setHashtags] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = tab === "youtube" ? url.trim().length > 0 : uploadFile !== null;

  async function handleGenerate() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject(
        {
          sourceType: tab,
          sourceUrl: tab === "youtube" ? url.trim() : undefined,
          clipLength,
          language,
          autoCaptions: autoCaption,
          autoReframe,
          viralityAnalysis: hashtags,
        },
        tab === "upload" && uploadFile ? uploadFile : undefined,
      );
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat project. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Project baru</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tempel link atau upload video panjang, atur preferensi, lalu biarkan AI bekerja.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* left: form */}
        <div className="space-y-6">
          {/* source */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">1 · Sumber video</h2>
            <div className="mt-4 inline-flex rounded-lg border border-border bg-secondary/50 p-1">
              <button
                onClick={() => setTab("youtube")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === "youtube" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Youtube className="size-4" /> Link YouTube
              </button>
              <button
                onClick={() => setTab("upload")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Upload className="size-4" /> Upload file
              </button>
            </div>

            {tab === "youtube" ? (
              <div className="mt-4">
                <Label htmlFor="yt">URL video</Label>
                <Input
                  id="yt"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Mendukung video, podcast, webinar, dan interview hingga 2 jam.
                </p>
              </div>
            ) : (
              <label
                className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center transition-colors hover:border-lime/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) setUploadFile(f);
                }}
              >
                <div className="flex size-11 items-center justify-center rounded-full bg-lime/15 text-lime">
                  <Upload className="size-5" />
                </div>
                <div className="text-sm font-medium">
                  {uploadFile ? uploadFile.name : "Tarik file ke sini atau klik untuk pilih"}
                </div>
                <div className="text-xs text-muted-foreground">MP4, MOV, MKV · maks 2 GB</div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                />
              </label>
            )}
          </section>

          {/* settings */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">2 · Preferensi klip</h2>

            {/* clip length */}
            <div className="mt-4">
              <Label>Durasi tiap klip</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {lengthOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setClipLength(opt)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      clipLength === opt
                        ? "border-lime/60 bg-lime/10 text-lime"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-white/20"
                    )}
                  >
                    {opt === "auto" ? "Auto" : CLIP_LENGTH_LABELS[opt].replace(" detik", "s")}
                  </button>
                ))}
              </div>
            </div>

            {/* aspect ratio */}
            <div className="mt-5">
              <Label>Rasio output</Label>
              <div className="mt-2 flex gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-lime/60 bg-lime/10 px-3 py-2.5 text-sm font-medium text-lime">
                  <Crop className="size-4" /> 9:16 Vertikal
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-muted-foreground">
                  1:1 <Badge variant="muted" className="text-[10px]">segera</Badge>
                </div>
                <div className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-muted-foreground sm:flex">
                  16:9 <Badge variant="muted" className="text-[10px]">segera</Badge>
                </div>
              </div>
            </div>

            {/* language */}
            <div className="mt-5">
              <Label htmlFor="lang">Bahasa video</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      language === l.code
                        ? "border-lime/60 bg-lime/10 text-lime"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-white/20"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* toggles */}
            <div className="mt-5 space-y-1 rounded-lg border border-border bg-secondary/30 p-1">
              <ToggleRow
                icon={Captions}
                title="Auto-caption"
                desc="Subtitle highlight kata otomatis"
                checked={autoCaption}
                onCheckedChange={setAutoCaption}
              />
              <ToggleRow
                icon={Crop}
                title="Auto-reframe wajah"
                desc="Track subjek agar selalu di tengah"
                checked={autoReframe}
                onCheckedChange={setAutoReframe}
              />
              <ToggleRow
                icon={Hash}
                title="Judul & hashtag otomatis"
                desc="AI tulis caption posting siap pakai"
                checked={hashtags}
                onCheckedChange={setHashtags}
              />
            </div>
          </section>
        </div>

        {/* right: summary */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Ringkasan</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Sumber" value={tab === "youtube" ? "YouTube" : "Upload"} />
              <Row
                label="Durasi klip"
                value={clipLength === "auto" ? "Auto (AI)" : CLIP_LENGTH_LABELS[clipLength]}
              />
              <Row label="Rasio" value="9:16 Vertikal" />
              <Row label="Caption" value={autoCaption ? "Aktif" : "Nonaktif"} />
              <Row label="Reframe" value={autoReframe ? "Aktif" : "Nonaktif"} />
            </dl>
            <div className="mt-4 rounded-lg bg-lime/10 p-3 text-xs text-lime">
              <Sparkles className="mb-1 size-4" />
              Estimasi: ~12 klip dari video 1 jam. Memakai kuota sesuai durasi sumber.
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!ready || submitting}
              onClick={handleGenerate}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menyiapkan...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate klip
                </>
              )}
            </Button>
            {!ready && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Masukkan link atau pilih file dulu.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-lime/15 text-lime">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
