"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Megaphone,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminOnly } from "@/components/app/admin-only";
import {
  adminGetCampaigns,
  adminGetManualQueue,
  adminGetWithdrawals,
  adminGetUsers,
  adminActWithdrawal,
  ApiError,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { AdminCampaign, AdminManualVerification, AdminWithdrawal } from "@/lib/types";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminDashboardInner() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [queue, setQueue] = useState<AdminManualVerification[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, q, w, u] = await Promise.all([
        adminGetCampaigns().catch(() => [] as AdminCampaign[]),
        adminGetManualQueue().catch(() => [] as AdminManualVerification[]),
        adminGetWithdrawals("pending").catch(() => [] as AdminWithdrawal[]),
        adminGetUsers().catch(() => []),
      ]);
      setCampaigns(c);
      setQueue(q);
      setWithdrawals(w);
      setUserCount(u.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function approveWithdrawal(id: string) {
    setBusy(id);
    try {
      await adminActWithdrawal(id, "approve");
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // silent — user still sees item
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  const processing = campaigns.filter((c) => c.status === "processing");
  const active = campaigns.filter((c) => c.status === "active");
  const kpiMissed = campaigns.filter((c) => c.status === "kpi_missed");
  const totalRewardPool = active.reduce((n, c) => n + c.rewardPool, 0);

  const metricCards = [
    {
      label: "Penarikan pending",
      value: withdrawals.length,
      icon: Wallet,
      href: "/admin/withdrawals",
      urgent: withdrawals.length > 0,
    },
    {
      label: "Antrian verifikasi manual",
      value: queue.length,
      icon: CheckCircle2,
      href: "/admin/verifications",
      urgent: queue.length > 0,
    },
    {
      label: "Campaign aktif",
      value: active.length,
      icon: Megaphone,
      href: "/admin/campaigns",
      urgent: false,
    },
    {
      label: "Total pengguna",
      value: userCount,
      icon: Users,
      href: "/admin/users",
      urgent: false,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan operasional nineClip — penarikan, verifikasi, dan kampanye.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/config">
            <Settings className="size-4" /> Konfigurasi
          </Link>
        </Button>
      </div>

      {/* metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricCards.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className={`flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-lime/40 ${
              m.urgent ? "border-amber-500/40" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <m.icon className={`size-4 ${m.urgent ? "text-amber-400" : "text-lime"}`} />
            </div>
            <div
              className={`mt-2 font-display text-3xl font-extrabold ${
                m.urgent && m.value > 0 ? "text-amber-300" : "text-foreground"
              }`}
            >
              {m.value}
            </div>
            {m.urgent && m.value > 0 && (
              <span className="mt-1.5 text-xs text-amber-400">Perlu tindakan</span>
            )}
          </Link>
        ))}
      </div>

      {/* campaign status breakdown */}
      {campaigns.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Status Campaign</h2>
            <Link
              href="/admin/campaigns"
              className="inline-flex items-center gap-1 text-xs text-lime hover:underline"
            >
              Kelola <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Pill label="Total" value={campaigns.length} />
            <Pill label="Processing" value={processing.length} color="amber" />
            <Pill label="Aktif" value={active.length} color="lime" />
            <Pill label="KPI Missed" value={kpiMissed.length} color="red" />
            <Pill label="Total reward pool aktif" value={formatIdr(totalRewardPool)} />
          </div>

          {kpiMissed.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-300">
                <AlertTriangle className="size-4" />
                {kpiMissed.length} campaign KPI tidak tercapai — menunggu keputusan brand
              </div>
              <div className="mt-2 space-y-1">
                {kpiMissed.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{c.name}</span>
                    <Link
                      href={`/admin/campaigns`}
                      className="ml-2 shrink-0 text-lime hover:underline"
                    >
                      Detail
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* pending withdrawals — top 5 */}
      {withdrawals.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Penarikan Pending</h2>
            <Link
              href="/admin/withdrawals"
              className="inline-flex items-center gap-1 text-xs text-lime hover:underline"
            >
              Lihat semua <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {withdrawals.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{w.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.ewalletType
                      ? `${w.ewalletType.toUpperCase()} · ${w.ewalletNumber}`
                      : `${w.bankName} · ${w.accountNumber}`}
                    {" · "}{fmtDate(w.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-lime">{formatIdr(w.amount)}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === w.id}
                    onClick={() => approveWithdrawal(w.id)}
                  >
                    {busy === w.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Setujui"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* pending manual verifications — top 5 */}
      {queue.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Verifikasi Manual Pending</h2>
            <Link
              href="/admin/verifications"
              className="inline-flex items-center gap-1 text-xs text-lime hover:underline"
            >
              Lihat semua <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {queue.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{v.clipper.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.campaign.name} · {v.platform ?? "—"}
                    {v.submittedAt ? ` · ${fmtDate(v.submittedAt)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.submittedUrl && (
                    <a
                      href={v.submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-lime hover:underline"
                    >
                      Lihat
                    </a>
                  )}
                  <Badge variant="warning">Pending</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* quick nav */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/campaigns", label: "Campaign", icon: Megaphone, desc: "Kelola & verifikasi submission" },
          { href: "/admin/verifications", label: "Verifikasi Manual", icon: CheckCircle2, desc: "Review submission tanpa auto-detect" },
          { href: "/admin/withdrawals", label: "Penarikan", icon: Wallet, desc: "Proses request withdrawal clipper" },
          { href: "/admin/users", label: "Pengguna", icon: Users, desc: "Kelola akun & role" },
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-lime/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime/10 text-lime">
              <n.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">{n.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{n.desc}</div>
            </div>
            <ArrowRight className="ml-auto size-4 shrink-0 self-center text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminOnly>
      <AdminDashboardInner />
    </AdminOnly>
  );
}

function Pill({ label, value, color }: { label: string; value: string | number; color?: "lime" | "amber" | "red" }) {
  const colorClass =
    color === "lime"
      ? "border-lime/30 bg-lime/10 text-lime"
      : color === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : color === "red"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-border bg-secondary/50 text-foreground";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${colorClass}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
