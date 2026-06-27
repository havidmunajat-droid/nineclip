"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Loader2,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  acceptInvite,
  acceptTnc,
  downloadClipperClip,
  getClipperCampaign,
  submitClip,
  ApiError,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { ClipperCampaignDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [expiresAt]);

  if (remaining === null) return null;
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  return remaining <= 0
    ? "Waktu habis"
    : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── TnC Modal ─────────────────────────────────────────────────────────────────
function TncModal({ onConfirm, onClose, busy }: { onConfirm: () => void; onClose: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-lime" />
          <h2 className="font-display font-bold">Syarat & Ketentuan Clipper</h2>
        </div>
        <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p><strong className="text-foreground">1. Keaslian konten.</strong> Kamu wajib memposting konten yang belum pernah diupload sebelumnya. Reupload atau plagiat akan didiskualifikasi.</p>
          <p><strong className="text-foreground">2. Batas waktu submit.</strong> Setelah mengambil slot campaign, kamu punya <strong className="text-foreground">24 jam</strong> untuk mengirimkan link postingan. Lewat waktu → slot dilepas dan kamu kena penalti <strong className="text-foreground">48 jam</strong>.</p>
          <p><strong className="text-foreground">3. Kepemilikan akun.</strong> Kamu wajib memverifikasi akun sosialmu di nineClip. URL yang disubmit harus berasal dari akun yang telah terverifikasi.</p>
          <p><strong className="text-foreground">4. Reward.</strong> Reward dasar dibayar setelah admin memverifikasi views ≥ 200 dan konten original. Bonus dibagikan ke top performer saat campaign selesai.</p>
          <p><strong className="text-foreground">5. Maks slot.</strong> Setiap clipper boleh mengambil maks <strong className="text-foreground">2 slot</strong> per campaign.</p>
          <p><strong className="text-foreground">6. Platform.</strong> nineClip berhak menolak submission yang melanggar ketentuan ini tanpa ganti rugi.</p>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy} className="flex-1">Batal</Button>
          <Button onClick={onConfirm} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <><ShieldCheck className="size-4" /> Setuju & Lanjut</>}
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [showTnc, setShowTnc] = useState(false);
  const [tncBusy, setTncBusy] = useState(false);

  const countdown = useCountdown(data?.bookingExpiresAt ?? null);

  const load = useCallback(async () => {
    try {
      setData(await getClipperCampaign(id));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.message === "TNC_NOT_ACCEPTED") {
        setShowTnc(true);
      } else if (err instanceof ApiError && err.message === "PENALTY_ACTIVE") {
        setError("Kamu sedang dalam masa penalti 48 jam karena slot sebelumnya tidak disubmit tepat waktu.");
      } else {
        setError(err instanceof ApiError ? err.message : "Gagal menerima undangan.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTncConfirm() {
    setTncBusy(true);
    try {
      await acceptTnc();
      setShowTnc(false);
      await handleAccept();
    } catch {
      setError("Gagal menyetujui T&C. Coba lagi.");
    } finally {
      setTncBusy(false);
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
    <>
      {showTnc && (
        <TncModal
          onConfirm={handleTncConfirm}
          onClose={() => setShowTnc(false)}
          busy={tncBusy}
        />
      )}

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
            <p className="mt-1 text-xs text-muted-foreground">
              Setelah diterima, kamu punya <strong className="text-foreground">24 jam</strong> untuk mengirimkan link postingan.
            </p>
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

        {/* EXPIRED (booking window habis) */}
        {data.status === "expired" && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <XCircle className="mx-auto size-8 text-red-400" />
            <h2 className="mt-3 font-display font-semibold">Slot Expired</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Waktu submit 24 jam habis. Slot dilepas dan kamu kena penalti 48 jam.
            </p>
          </div>
        )}

        {/* REJECTED */}
        {data.status === "rejected" && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <XCircle className="mx-auto size-8 text-red-400" />
            <h2 className="mt-3 font-display font-semibold">Submission Ditolak</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.platform
                ? `Submission ${data.platform} tidak lolos verifikasi (kepemilikan akun atau URL tidak valid).`
                : "Submission tidak lolos verifikasi."}
            </p>
          </div>
        )}

        {/* ACCEPTED — instruksi + countdown + download + submit */}
        {data.status === "accepted" && (
          <div className="mt-6 space-y-4">
            {/* countdown */}
            {data.bookingExpiresAt && (
              <div className={cn(
                "flex items-center justify-between rounded-xl border p-4",
                countdown === "Waktu habis" || countdown === null
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-amber-500/40 bg-amber-500/10",
              )}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="size-4 text-amber-300" />
                  <span className="text-amber-200">Sisa waktu submit</span>
                </div>
                <span className={cn(
                  "font-display text-xl font-bold tabular-nums",
                  countdown === "Waktu habis" ? "text-red-400" : "text-amber-200",
                )}>
                  {countdown ?? "—"}
                </span>
              </div>
            )}

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
              <p className="mt-1 text-xs text-muted-foreground">
                Tempel link postinganmu. URL harus dari akun yang sudah <Link href="/clipper/setup" className="text-lime hover:underline">terverifikasi</Link>.
              </p>
              <div className="mt-3 flex gap-2">
                <Input placeholder="https://tiktok.com/@kamu/video/..." value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} />
                <Button onClick={handleSubmit} disabled={busy || !submitUrl.trim()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Submit</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SUBMITTED — menunggu verifikasi stats */}
        {data.status === "submitted" && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <Clock className="mx-auto size-8 text-amber-300" />
            <h2 className="mt-3 font-display font-semibold">Menunggu verifikasi stats</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.platform === "youtube"
                ? "Stats YouTube sudah terambil otomatis. Admin akan memverifikasi segera."
                : "Submission kamu sedang ditinjau admin. Reward dibayar setelah terverifikasi."}
            </p>
            {data.submittedUrl && (
              <a href={data.submittedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-lime hover:underline">
                Lihat submission →
              </a>
            )}
          </div>
        )}

        {/* PENDING MANUAL REVIEW */}
        {data.status === "pending_manual_review" && (
          <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto size-8 text-blue-300" />
            <h2 className="mt-3 font-display font-semibold">Review Manual</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.platform === "instagram"
                ? "Instagram tidak mendukung fetch otomatis."
                : data.platform === "tiktok"
                ? "TikTok auto-scrape tidak tersedia saat ini."
                : "Platform ini memerlukan review manual."}
              {" "}Admin akan memasukkan stats secara manual. Biasanya selesai dalam 1×24 jam.
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
            {data.performanceScore > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Performance Score: <span className="font-semibold text-lime">{data.performanceScore}</span>/100
              </p>
            )}
            <Link href="/clipper/earnings" className="mt-4 inline-block text-sm text-lime hover:underline">
              Lihat earnings →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
