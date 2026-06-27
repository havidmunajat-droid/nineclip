"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Film,
  Flame,
  Inbox,
  Loader2,
  Megaphone,
  Plus,
  Scissors,
  Wallet,
} from "lucide-react";
import { ProjectCard } from "@/components/app/project-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  getCampaigns,
  getClipperCampaigns,
  getEarnings,
  getClips,
  getProjects,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { Campaign, ClipperCampaign, ClipperEarnings, Project } from "@/lib/types";

// ── Brand summary block ──────────────────────────────────────────────────────

function BrandSummary() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const active = campaigns.filter((c) =>
    ["processing", "ready_review", "active", "kpi_missed"].includes(c.status),
  );
  const totalPool = active.reduce((n, c) => n + c.rewardPool, 0);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Campaign Brand</h2>
        <Link
          href="/campaign"
          className="inline-flex items-center gap-1 text-xs text-lime hover:underline"
        >
          Lihat semua <ArrowRight className="size-3" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-lime" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <Megaphone className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada campaign. Buat sekarang dan distribusikan video ke creator.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/campaign/new">
              <Plus className="size-4" /> Buat campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total campaign</div>
            <div className="mt-1.5 font-display text-2xl font-bold">{campaigns.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Aktif sekarang</div>
            <div className="mt-1.5 font-display text-2xl font-bold text-lime">{active.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Total reward pool</div>
            <div className="mt-1.5 font-display text-2xl font-bold">{formatIdr(totalPool)}</div>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <Button asChild variant="secondary" size="sm" className="mt-3">
          <Link href="/campaign/new">
            <Plus className="size-4" /> Campaign baru
          </Link>
        </Button>
      )}
    </div>
  );
}

// ── Clipper summary block ────────────────────────────────────────────────────

function ClipperSummary() {
  const [items, setItems] = useState<ClipperCampaign[]>([]);
  const [earnings, setEarnings] = useState<ClipperEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getClipperCampaigns().catch(() => [] as ClipperCampaign[]),
      getEarnings().catch(() => null),
    ])
      .then(([c, e]) => {
        setItems(c);
        setEarnings(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const invites = items.filter((i) => i.status === "invited");
  const active = items.filter((i) =>
    ["accepted", "submitted", "pending_manual_review"].includes(i.status),
  );
  const points = earnings?.pointBalance ?? 0;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Aktivitas Clipper</h2>
        <Link
          href="/clipper/campaigns"
          className="inline-flex items-center gap-1 text-xs text-lime hover:underline"
        >
          Lihat semua <ArrowRight className="size-3" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 flex h-28 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-lime" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Link
            href="/clipper/campaigns"
            className="rounded-xl border bg-card p-4 transition-colors hover:border-lime/40"
            style={{ borderColor: invites.length > 0 ? "rgb(163 230 53 / 0.4)" : undefined }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Undangan baru</div>
              <Inbox className="size-4 text-lime" />
            </div>
            <div className="mt-1.5 font-display text-2xl font-bold text-lime">
              {invites.length}
            </div>
            {invites.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Segera terima sebelum hangus
              </div>
            )}
          </Link>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Campaign aktif</div>
            <div className="mt-1.5 font-display text-2xl font-bold">{active.length}</div>
            {active.some((i) => i.status === "submitted") && (
              <Badge variant="warning" className="mt-1.5 text-[10px]">
                Ada yang menunggu verifikasi
              </Badge>
            )}
          </div>

          <Link
            href="/clipper/earnings"
            className="rounded-xl border border-lime/30 bg-gradient-to-br from-lime/10 to-transparent p-4 transition-colors hover:border-lime/50"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Saldo poin</div>
              <Wallet className="size-4 text-lime" />
            </div>
            <div className="mt-1.5 font-display text-2xl font-bold text-lime">
              {points.toLocaleString("id-ID")}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {formatIdr(points)} · Tarik kapan saja
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getProjects();
        if (!active) return;
        setProjects(list);

        const ready = list.filter((p) => p.status === "ready");
        const clipBatches = await Promise.all(
          ready.map((p) => getClips(p.id).catch(() => [])),
        );
        if (!active) return;
        const allClips = clipBatches.flat();
        setAvgScore(
          allClips.length
            ? Math.round(
                allClips.reduce((n, c) => n + c.viralityScore, 0) / allClips.length,
              )
            : 0,
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalClips = projects.reduce((n, p) => n + p.clipsCount, 0);

  const stats = [
    { label: "Total project", value: projects.length, icon: Film },
    { label: "Klip dihasilkan", value: totalClips, icon: Scissors },
    {
      label: "Menit terpakai",
      value: `${user?.minutesUsed ?? 0}/${user?.minutesQuota ?? 0}`,
      icon: Clock,
    },
    { label: "Rata-rata skor viral", value: avgScore, icon: Flame },
  ];

  const isTool = !user?.isBrand && !user?.isClipper;

  return (
    <div className="mx-auto max-w-6xl">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Halo, {user?.name.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.isBrand && user?.isClipper
              ? "Pantau campaign brand dan aktivitas clipper-mu di sini."
              : user?.isBrand
                ? "Pantau campaign-mu dan distribusi video ke creator."
                : user?.isClipper
                  ? "Lihat undangan, kampanye aktif, dan earnings-mu."
                  : "Ubah video panjangmu jadi klip pendek yang siap viral."}
          </p>
        </div>
        {isTool && (
          <Button asChild>
            <Link href="/new">
              <Plus className="size-4" /> Project baru
            </Link>
          </Button>
        )}
      </div>

      {/* Tool stats — hanya relevan kalau user adalah kreator */}
      {isTool && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="size-4 text-lime" />
                </div>
                <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Project terbaru</h2>
          </div>

          {loading ? (
            <div className="mt-10 flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-lime" />
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
              <Link
                href="/new"
                className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-lime/50 hover:bg-card"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime">
                  <Plus className="size-6" />
                </div>
                <div>
                  <div className="font-medium">Buat project baru</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Tempel link YouTube atau upload video
                  </div>
                </div>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Role-specific sections */}
      {user?.isBrand && <BrandSummary />}
      {user?.isClipper && <ClipperSummary />}
    </div>
  );
}
