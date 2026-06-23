"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Flame,
  Loader2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { getCampaign, getCampaignClippers } from "@/lib/api";
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

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [clippers, setClippers] = useState<CampaignClipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      {campaign.status === "processing" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="size-4 animate-spin" />
          Pipeline sedang memproses video & memilih clipper. Halaman ini update otomatis.
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
    </div>
  );
}
