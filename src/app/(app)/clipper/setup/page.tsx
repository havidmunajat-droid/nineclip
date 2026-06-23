"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { getClipperProfile, updateClipperProfile, ApiError } from "@/lib/api";
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

  useEffect(() => {
    let active = true;
    getClipperProfile()
      .then((p) => {
        if (!active || !p) return;
        setNiches(p.niches ?? []);
        setRegion(p.region ?? "");
        setLanguage(p.language ?? "id");
        setBio(p.bio ?? "");
        setTiktok(p.socialTiktok ?? "");
        setYoutube(p.socialYoutube ?? "");
        setInstagram(p.socialInstagram ?? "");
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
          <div className="mt-3 space-y-3">
            <Input placeholder="TikTok — @username atau URL" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            <Input placeholder="YouTube — channel/URL" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
            <Input placeholder="Instagram — @username atau URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
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
