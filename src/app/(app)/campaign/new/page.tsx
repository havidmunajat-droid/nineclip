"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Flame,
  Loader2,
  Sparkles,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  computeViralScore,
  createCampaign,
  devConfirmPayCampaign,
  getPublicPackages,
  ApiError,
} from "@/lib/api";
import { PACKAGES, formatIdr } from "@/lib/campaign-packages";
import type { PackageConfigItem, PackageType, ViralScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "shorts", label: "YouTube Shorts" },
  { id: "reels", label: "Instagram Reels" },
];

const STEPS = ["Upload Video", "Detail", "Pilih Paket", "Review & Bayar"];

export default function CampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [videoUrl, setVideoUrl] = useState("");
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<ViralScoreResult | null>(null);

  // Step 2
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [deadline, setDeadline] = useState("");

  // Step 3 — packages dari API (fallback ke hardcoded)
  const [packages, setPackages] = useState<PackageConfigItem[]>([]);
  const [pkg, setPkg] = useState<PackageType>("growth");

  // Step 4
  const [submitting, setSubmitting] = useState(false);

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Fetch live packages dari API, fallback ke PACKAGES hardcoded jika gagal
  useEffect(() => {
    getPublicPackages()
      .then(setPackages)
      .catch(() => setPackages(PACKAGES.map((p) => ({
        id: p.id,
        packageType: p.id,
        name: p.name,
        priceIdr: p.priceIdr,
        credits: p.credits,
        maxClippers: p.maxClippers,
        kpiViews: p.kpiViews,
        campaignDays: p.campaignDays,
        tagline: p.tagline,
        highlighted: p.highlighted ?? false,
        feePct: 20,
        platformFee: p.platformFee,
        clipperPool: p.rewardPool,
        baseFund: p.baseFund,
        bonusPool: p.bonusPool,
        rewardPerVideo: p.rewardPerVideo,
      }))));
  }, []);

  async function runViralScore() {
    if (!videoUrl.trim() || scoring) return;
    setScoring(true);
    setError(null);
    try {
      const result = await computeViralScore(videoUrl.trim());
      setScore(result);
      if (!name && result.title) setName(result.title.slice(0, 80));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menganalisis video.");
    } finally {
      setScoring(false);
    }
  }

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  const step2Valid = name.trim().length >= 3 && platforms.length > 0 && !!deadline;

  async function handlePay() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        videoUrl: videoUrl.trim(),
        targetPlatforms: platforms,
        deadline: new Date(deadline).toISOString(),
        packageType: pkg,
      });
      // MODE SIMULASI (sandbox) — Midtrans Snap popup nyata menyusul (M5).
      // Memicu pembayaran sukses → backend buat project & jalankan pipeline.
      await devConfirmPayCampaign(campaign.id);
      router.push(`/campaign/${campaign.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses pembayaran.");
      setSubmitting(false);
    }
  }

  const selected = packages.find((p) => p.packageType === pkg) ?? packages[0];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Buat Campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sebarkan videomu ke ratusan creator dalam 4 langkah.
      </p>

      {/* stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < step
                  ? "bg-lime text-primary-foreground"
                  : i === step
                    ? "bg-lime/20 text-lime ring-2 ring-lime"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {/* STEP 1 — Upload Video */}
        {step === 0 && (
          <div>
            <h2 className="font-display font-semibold">1 · Upload video</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tempel link YouTube. AI menghitung skor viral & mendeteksi niche.
            </p>
            <div className="mt-4">
              <Label htmlFor="yt">URL YouTube</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="yt"
                  placeholder="https://youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <Button onClick={runViralScore} disabled={!videoUrl.trim() || scoring}>
                  {scoring ? <Loader2 className="size-4 animate-spin" /> : <><Youtube className="size-4" /> Analisis</>}
                </Button>
              </div>
            </div>

            {score && (
              <div className="mt-5 rounded-xl border border-lime/30 bg-lime/5 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 font-display text-4xl font-extrabold text-lime">
                      <Flame className="size-6" /> {score.score}
                    </div>
                    <span className="text-xs text-muted-foreground">/ 100 viral score</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {score.title && (
                      <p className="truncate text-sm font-medium">{score.title}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {score.niches.map((n) => (
                        <Badge key={n} variant="muted" className="capitalize">{n}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Detail */}
        {step === 1 && (
          <div>
            <h2 className="font-display font-semibold">2 · Detail campaign</h2>
            <div className="mt-4 space-y-5">
              <div>
                <Label htmlFor="name">Nama campaign</Label>
                <Input
                  id="name"
                  placeholder="mis. Campaign Skincare Juni"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                  maxLength={255}
                />
              </div>
              <div>
                <Label>Target platform</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        platforms.includes(p.id)
                          ? "border-lime/60 bg-lime/10 text-lime"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-white/20",
                      )}
                    >
                      {platforms.includes(p.id) && <Check className="mr-1 inline size-3.5" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <div className="relative mt-2">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="deadline"
                    type="date"
                    min={minDate}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Pilih Paket */}
        {step === 2 && (
          <div>
            <h2 className="font-display font-semibold">3 · Pilih paket</h2>
            {packages.length === 0 ? (
              <div className="mt-4 flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-lime" />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((p) => {
                  const active = pkg === p.packageType;
                  return (
                    <button
                      key={p.packageType}
                      type="button"
                      onClick={() => setPkg(p.packageType as PackageType)}
                      className={cn(
                        "relative flex flex-col rounded-xl border p-4 text-left transition-colors",
                        active
                          ? "border-lime/60 bg-lime/5 ring-1 ring-lime/40"
                          : "border-border bg-secondary/30 hover:border-white/20",
                      )}
                    >
                      {p.highlighted && (
                        <Badge className="absolute -top-2 right-3 text-[10px]">Populer</Badge>
                      )}
                      <span className="font-display text-sm font-bold">{p.name}</span>
                      <span className="mt-1 font-display text-xl font-extrabold text-lime">
                        {formatIdr(p.priceIdr)}
                      </span>
                      <span className="mt-2 text-xs text-muted-foreground">
                        {p.credits} slot · {p.maxClippers} clipper
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ~{formatIdr(p.rewardPerVideo)} / video
                      </span>
                      <span className="mt-2 text-[11px] text-muted-foreground">{p.tagline}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Review & Bayar */}
        {step === 3 && (
          <div>
            <h2 className="font-display font-semibold">4 · Review & bayar</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Nama" value={name} />
              <Row label="Viral score" value={score ? `${score.score}/100` : "—"} />
              <Row label="Niche" value={score?.niches.join(", ") ?? "—"} />
              <Row label="Platform" value={platforms.join(", ")} />
              <Row label="Deadline" value={deadline || "—"} />
              <Row label="Paket" value={selected?.name ?? "—"} />
              <Row label="Slot video" value={String(selected?.credits ?? "—")} />
              <Row label="Maks clipper" value={String(selected?.maxClippers ?? "—")} />
              <Row label="Reward pool" value={selected ? formatIdr(selected.clipperPool) : "—"} />
              <Row label="Reward / video" value={selected ? formatIdr(selected.rewardPerVideo) : "—"} />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <dt className="font-medium">Total bayar</dt>
                <dd className="font-display text-xl font-extrabold text-lime">
                  {selected ? formatIdr(selected.priceIdr) : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Mode simulasi sandbox: klik bayar akan langsung mengaktifkan campaign &
              menjalankan pipeline asli (Midtrans Snap nyata menyusul di M5).
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
            <ArrowLeft className="size-4" /> Kembali
          </Button>

          {step === 0 && (
            <Button onClick={next} disabled={!score}>
              Lanjut <ArrowRight className="size-4" />
            </Button>
          )}
          {step === 1 && (
            <Button onClick={next} disabled={!step2Valid}>
              Lanjut <ArrowRight className="size-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={next}>
              Lanjut <ArrowRight className="size-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handlePay} disabled={submitting || !selected} size="lg">
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> Memproses...</>
              ) : (
                <><Sparkles className="size-4" /> Bayar {selected ? formatIdr(selected.priceIdr) : "—"}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}
