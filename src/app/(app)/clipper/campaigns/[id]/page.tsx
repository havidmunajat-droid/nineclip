"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  acceptInvite,
  downloadClipperClip,
  getClipperCampaign,
  submitClip,
  ApiError,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { ClipperCampaignDetail } from "@/lib/types";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ClipperCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClipperCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getClipperCampaign(id));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menerima undangan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!submitUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitClip(id, submitUrl.trim());
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal submit. Pastikan URL valid.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(clipId: string) {
    setDownloading(clipId);
    setError(null);
    try {
      await downloadClipperClip(clipId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunduh klip.");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="font-display text-xl font-bold">Campaign tidak ditemukan</h1>
        <Link href="/clipper/campaigns" className="mt-4 inline-block text-sm text-lime hover:underline">
          ← Kembali ke kampanye saya
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clipper/campaigns" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kampanye saya
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{data.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="muted">{data.brand}</Badge>
            <span className="inline-flex items-center gap-1 text-lime">
              <Flame className="size-4" /> {data.viralScore ?? "—"}
            </span>
            {data.niches.map((n) => (
              <Badge key={n} variant="muted" className="capitalize">{n}</Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Deadline {fmtDate(data.deadline)} · Platform: {data.targetPlatforms.join(", ")}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* INVITED */}
      {data.status === "invited" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Kamu diundang ke campaign ini.</p>
          <Button className="mt-4" onClick={handleAccept} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Terima undangan"}
          </Button>
        </div>
      )}

      {/* DECLINED */}
      {data.status === "declined" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Kamu menolak undangan ini.
        </div>
      )}

      {/* ACCEPTED — instruksi + download + submit */}
      {data.status === "accepted" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-lime/30 bg-lime/5 p-5">
            <h2 className="font-display font-semibold">Instruksi</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Unduh aset klip di bawah ini.</li>
              <li>Posting ke platform target ({data.targetPlatforms.join(", ")}).</li>
              <li>Submit link postinganmu untuk diverifikasi & dapat reward.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Aset klip ({data.clips.length})</h2>
            {data.clips.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Klip belum tersedia. Pipeline mungkin masih memproses video.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.clips.map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{clip.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(clip.duration)}s · {clip.aspectRatio} · skor {clip.viralityScore}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleDownload(clip.id)} disabled={downloading !== null}>
                      {downloading === clip.id ? <Loader2 className="size-4 animate-spin" /> : <><Download className="size-4" /> Unduh</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Submit hasil</h2>
            <p className="mt-1 text-xs text-muted-foreground">Tempel link postingan social media kamu.</p>
            <div className="mt-3 flex gap-2">
              <Input placeholder="https://tiktok.com/@kamu/video/..." value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} />
              <Button onClick={handleSubmit} disabled={busy || !submitUrl.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Submit</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED — menunggu verifikasi */}
      {data.status === "submitted" && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <Clock className="mx-auto size-8 text-amber-300" />
          <h2 className="mt-3 font-display font-semibold">Menunggu verifikasi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submission kamu sedang ditinjau admin. Reward dibayar setelah terverifikasi.
          </p>
          {data.submittedUrl && (
            <a href={data.submittedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-lime hover:underline">
              Lihat submission →
            </a>
          )}
        </div>
      )}

      {/* VERIFIED / REWARDED */}
      {(data.status === "verified" || data.status === "rewarded") && (
        <div className="mt-6 rounded-xl border border-lime/30 bg-lime/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-8 text-lime" />
          <h2 className="mt-3 font-display font-semibold">Terverifikasi! 🎉</h2>
          <div className="mt-3 font-display text-3xl font-extrabold text-lime">
            {formatIdr(data.totalReward)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Reward dasar {formatIdr(data.baseReward)} + bonus {formatIdr(data.performanceBonus)}
            {data.viewCount !== null && ` · ${data.viewCount.toLocaleString("id-ID")} views`}
          </p>
          <Link href="/clipper/earnings" className="mt-4 inline-block text-sm text-lime hover:underline">
            Lihat earnings →
          </Link>
        </div>
      )}
    </div>
  );
}
