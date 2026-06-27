"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Loader2,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCampaign, getCampaignClippers, applyCompensation } from "@/lib/api";
import type { CompensationResult } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { Campaign, CampaignClipper } from "@/lib/types";

const CLIPPER_STATUS_LABEL: Record<string, string> = {
  invited: "Diundang",
  accepted: "Diterima",
  declined: "Ditolak",
  submitted: "Submit",
  verified: "Terverifikasi",
  rewarded: "Reward",
};

function useCountdown(deadline: string | null | undefined) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const tick = () => setSecs(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (secs === null) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}j ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}d`;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [clippers, setClippers] = useState<CampaignClipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [compApplying, setCompApplying] = useState(false);
  const [compResult, setCompResult] = useState<CompensationResult | null>(null);
  const [showPaidBanner, setShowPaidBanner] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deteksi redirect post-payment dan auto-clear param dari URL
  useEffect(() => {
    if (searchParams.get("paid") === "1") {
      setShowPaidBanner(true);
      router.replace(`/campaign/${id}`);
      const t = setTimeout(() => setShowPaidBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router, id]);

  const compCountdown = useCountdown(campaign?.compensationDeadline);

  async function handleCompensation(choice: "extension" | "voucher") {
    if (!campaign) return;
    setCompApplying(true);
    try {
      const result = await applyCompensation(campaign.id, choice);
      setCompResult(result);
      const updated = await getCampaign(campaign.id).catch(() => null);
      if (updated) setCampaign(updated);
    } finally {
      setCompApplying(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const c = await getCampaign(id);
      setCampaign(c);
      const cl = await getCampaignClippers(id).catch(() => []);
      setClippers(cl);
      return c;
    } catch {
      setNotFound(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Polling tiap 3 detik selama campaign masih diproses (Section 7 step 3).
  useEffect(() => {
    let active = true;
    (async () => {
      const c = await load();
      if (active && c && c.status === "processing") {
        timer.current = setTimeout(function tick() {
          load().then((next) => {
            if (active && next?.status === "processing") {
              timer.current = setTimeout(tick, 3000);
            }
          });
        }, 3000);
      }
    })();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="font-display text-xl font-bold">Campaign tidak ditemukan</h1>
        <Link href="/campaign" className="mt-4 inline-block text-sm text-lime hover:underline">
          ← Kembali ke daftar campaign
        </Link>
      </div>
    );
  }

  const invited = clippers.length;
  const accepted = clippers.filter((c) => c.status === "accepted").length;
  const submitted = clippers.filter((c) => c.status === "submitted").length;
  const verified = clippers.filter((c) => ["verified", "rewarded"].includes(c.status)).length;
  const totalViews = clippers.reduce((n, c) => n + (c.viewCount ?? 0), 0);
  const rewardUsed = clippers.reduce((n, c) => n + c.totalReward, 0);
  const rewardPct = campaign.rewardPool ? Math.min((rewardUsed / campaign.rewardPool) * 100, 100) : 0;

  const metrics = [
    { label: "Diundang", value: invited, icon: Users },
    { label: "Aktif", value: accepted, icon: Users },
    { label: "Submit", value: submitted, icon: Users },
    { label: "Verified", value: verified, icon: Users },
    { label: "Est. views", value: totalViews.toLocaleString("id-ID"), icon: Eye },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/campaign" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Semua campaign
      </Link>

      {/* header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-lime">
              <Flame className="size-4" /> {campaign.viralScore ?? "—"}/100
            </span>
            {campaign.detectedNiches.map((n) => (
              <Badge key={n} variant="muted" className="capitalize">{n}</Badge>
            ))}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-muted-foreground">Paket</div>
          <div className="font-display font-bold capitalize">{campaign.packageType}</div>
        </div>
      </div>

      {showPaidBanner && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-lime animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            Pembayaran berhasil — pipeline berjalan, clipper akan segera dicocokkan.
          </span>
        </div>
      )}

      {campaign.status === "processing" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="size-4 animate-spin" />
          Pipeline sedang memproses video & memilih clipper. Halaman ini update otomatis.
        </div>
      )}

      {campaign.status === "kpi_missed" && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <div className="flex-1">
              <h3 className="font-display font-semibold text-red-300">KPI Tidak Tercapai</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Campaign ini belum mencapai target views. Pilih kompensasi yang diinginkan.
              </p>
              {compCountdown && !compResult && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-400">
                  <Clock className="size-3.5" />
                  Sisa waktu: <span className="font-mono font-semibold">{compCountdown}</span>
                </div>
              )}
            </div>
          </div>

          {compResult ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-lime/30 bg-lime/5 px-4 py-3">
              <CheckCircle2 className="size-5 text-lime" />
              {compResult.applied === "extension" ? (
                <span className="text-sm">
                  Campaign diperpanjang <span className="font-semibold text-lime">{compResult.days} hari</span>. Clipper akan kembali aktif segera.
                </span>
              ) : (
                <span className="text-sm">
                  Voucher diskon 20% berhasil dibuat:{" "}
                  <span className="font-mono font-semibold text-lime">{compResult.code}</span>. Berlaku 90 hari untuk campaign berikutnya.
                </span>
              )}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => handleCompensation("extension")}
                disabled={compApplying}
                className="gap-2"
              >
                {compApplying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Perpanjang Campaign
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleCompensation("voucher")}
                disabled={compApplying}
                className="gap-2"
              >
                <Ticket className="size-4" />
                Terima Voucher 20%
              </Button>
            </div>
          )}
        </div>
      )}

      {/* metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <m.icon className="size-4 text-lime" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{m.value}</div>
          </div>
        ))}
      </div>

      {/* reward pool */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Reward pool terpakai</span>
          <span className="text-muted-foreground">
            {formatIdr(rewardUsed)} / {formatIdr(campaign.rewardPool)}
          </span>
        </div>
        <Progress value={rewardPct} className="mt-3" />
      </div>

      {/* clipper table */}
      <h2 className="mt-8 font-display text-lg font-semibold">Clipper</h2>
      {clippers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {campaign.status === "processing"
            ? "Menunggu pipeline selesai untuk mulai matching clipper…"
            : "Belum ada clipper yang cocok dengan niche campaign ini."}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submission</th>
                <th className="px-4 py-3 text-right font-medium">Views</th>
                <th className="px-4 py-3 text-right font-medium">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clippers.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.clipperName}</div>
                    {c.clipperScore !== null && (
                      <div className="text-xs text-muted-foreground">Skor {c.clipperScore}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{CLIPPER_STATUS_LABEL[c.status] ?? c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.submittedUrl ? (
                      <a
                        href={c.submittedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-lime hover:underline"
                      >
                        Lihat <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.viewCount !== null ? c.viewCount.toLocaleString("id-ID") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {c.totalReward > 0 ? formatIdr(c.totalReward) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics */}
      {clippers.length > 0 && (
        <CampaignAnalytics
          invited={invited}
          accepted={accepted}
          submitted={submitted}
          verified={verified}
          clippers={clippers}
        />
      )}
    </div>
  );
}

// ── Analytics section ──────────────────────────────────────────────────────

function CampaignAnalytics({
  invited,
  accepted,
  submitted,
  verified,
  clippers,
}: {
  invited: number;
  accepted: number;
  submitted: number;
  verified: number;
  clippers: CampaignClipper[];
}) {
  const funnelSteps = [
    { label: "Diundang", value: invited, color: "bg-white/20" },
    { label: "Diterima", value: accepted, color: "bg-lime/30" },
    { label: "Submit", value: submitted, color: "bg-lime/50" },
    { label: "Verified", value: verified, color: "bg-lime" },
  ];

  const viewData = clippers
    .filter((c) => (c.viewCount ?? 0) > 0)
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 10)
    .map((c) => ({
      name: c.clipperName.split(" ")[0],
      views: c.viewCount ?? 0,
      reward: c.totalReward,
    }));

  const convRate = invited > 0 ? Math.round((verified / invited) * 100) : 0;
  const avgViews =
    viewData.length > 0
      ? Math.round(viewData.reduce((n, d) => n + d.views, 0) / viewData.length)
      : 0;
  const topViews = viewData[0]?.views ?? 0;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-semibold">Analytics</h2>

      {/* Funnel */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Funnel konversi
        </p>
        <div className="mt-4 space-y-2">
          {funnelSteps.map((s) => {
            const pct = invited > 0 ? Math.round((s.value / invited) * 100) : 0;
            return (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold">
                    {s.value}{" "}
                    <span className="text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${s.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Conversion rate </span>
            <span className="font-semibold text-lime">{convRate}%</span>
          </div>
          {avgViews > 0 && (
            <div>
              <span className="text-muted-foreground">Avg views </span>
              <span className="font-semibold">{avgViews.toLocaleString("id-ID")}</span>
            </div>
          )}
          {topViews > 0 && (
            <div>
              <span className="text-muted-foreground">Top views </span>
              <span className="font-semibold text-lime">{topViews.toLocaleString("id-ID")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Views bar chart */}
      {viewData.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Views per clipper
          </p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={viewData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="hsl(0 0% 40%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(0 0% 40%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "hsl(0 0% 100% / 0.04)" }}
                  contentStyle={{
                    background: "hsl(0 0% 7%)",
                    border: "1px solid hsl(0 0% 16%)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    name === "views"
                      ? v.toLocaleString("id-ID")
                      : formatIdr(v),
                    name === "views" ? "Views" : "Reward",
                  ]}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {viewData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "hsl(74 96% 50%)" : "hsl(74 96% 50% / 0.4)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
