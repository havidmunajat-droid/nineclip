"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { getClipperProfile, getSocialStatus, updateClipperProfile, ApiError } from "@/lib/api";
import type { SocialVerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const NICHES = [
  "bisnis", "edukasi", "gaming", "kuliner", "motivasi",
  "teknologi", "hiburan", "kesehatan", "travel", "lifestyle",
];

export default function ClipperSetupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [niches, setNiches] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("id");
  const [bio, setBio] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [instagram, setInstagram] = useState("");
  const [socialStatus, setSocialStatus] = useState<SocialVerificationStatus | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getClipperProfile(), getSocialStatus().catch(() => null)])
      .then(([p, ss]) => {
        if (!active) return;
        if (p) {
          setNiches(p.niches ?? []);
          setRegion(p.region ?? "");
          setLanguage(p.language ?? "id");
          setBio(p.bio ?? "");
          setTiktok(p.socialTiktok ?? "");
          setYoutube(p.socialYoutube ?? "");
          setInstagram(p.socialInstagram ?? "");
        }
        if (ss) setSocialStatus(ss);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function toggleNiche(n: string) {
    setNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function handleSave() {
    if (niches.length === 0) {
      setError("Pilih minimal satu niche.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateClipperProfile({
        niches,
        region: region.trim() || undefined,
        language,
        bio: bio.trim() || undefined,
        socialTiktok: tiktok.trim() || undefined,
        socialYoutube: youtube.trim() || undefined,
        socialInstagram: instagram.trim() || undefined,
      });
      await refreshUser();
      router.push("/clipper/campaigns");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan profil.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">DNA Profile Creator</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Isi profilmu agar AI bisa mencocokkanmu dengan campaign yang relevan.
      </p>

      <div className="mt-6 space-y-4">
        {/* niches */}
        <section className="rounded-xl border border-border bg-card p-6">
          <Label>Niche kamu</Label>
          <p className="mt-1 text-xs text-muted-foreground">Pilih semua yang sesuai.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => toggleNiche(n)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  niches.includes(n)
                    ? "border-lime/60 bg-lime/10 text-lime"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-white/20",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* basics */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="region">Region</Label>
              <Input id="region" placeholder="mis. Jakarta" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="lang">Bahasa</Label>
              <div className="mt-1.5 flex gap-2">
                {["id", "en"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm uppercase transition-colors",
                      language === l
                        ? "border-lime/60 bg-lime/10 text-lime"
                        : "border-border bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="bio">Bio singkat</Label>
            <Input id="bio" placeholder="Ceritakan gaya kontenmu" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1.5" />
          </div>
        </section>

        {/* socials */}
        <section className="rounded-xl border border-border bg-card p-6">
          <Label>Akun sosial media</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifikasi akun agar submission kamu diterima otomatis.
          </p>
          <div className="mt-3 space-y-3">
            {(
              [
                { key: "tiktok", label: "TikTok", value: tiktok, set: setTiktok, placeholder: "@username" },
                { key: "youtube", label: "YouTube", value: youtube, set: setYoutube, placeholder: "Channel URL atau @handle" },
                { key: "instagram", label: "Instagram", value: instagram, set: setInstagram, placeholder: "@username" },
              ] as const
            ).map(({ key, label, value, set, placeholder }) => {
              const verified = socialStatus?.[key]?.verified ?? false;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`${label} — ${placeholder}`}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      disabled={verified}
                    />
                  </div>
                  {verified ? (
                    <Badge className="shrink-0 gap-1 bg-lime/10 text-lime border-lime/40">
                      <BadgeCheck className="size-3.5" /> Terverifikasi
                    </Badge>
                  ) : (
                    <Button asChild size="sm" variant="secondary" className="shrink-0">
                      <Link href={`/clipper/verify/${key}`}>Verifikasi</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {!socialStatus?.anyVerified && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Minimal satu akun harus terverifikasi sebelum kamu bisa submit ke campaign.
            </p>
          )}
        </section>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="size-4 animate-spin" /> Menyimpan...</> : <><Sparkles className="size-4" /> Simpan & mulai</>}
        </Button>
      </div>
    </div>
  );
}
