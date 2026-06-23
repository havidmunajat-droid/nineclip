"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Flame,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acceptInvite, declineInvite, getClipperCampaigns, ApiError } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { ClipperCampaign } from "@/lib/types";

const MEMBER_LABEL: Record<string, string> = {
  accepted: "Diterima",
  submitted: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rewarded: "Reward dibayar",
  declined: "Ditolak",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ClipperInboxPage() {
  const [items, setItems] = useState<ClipperCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getClipperCampaigns());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, kind: "accept" | "decline") {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      if (kind === "accept") await acceptInvite(id);
      else await declineInvite(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aksi gagal. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  const invites = items.filter((i) => i.status === "invited");
  const active = items.filter((i) => ["accepted", "submitted", "verified", "rewarded"].includes(i.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Kampanye Saya</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Undangan campaign yang cocok dengan niche-mu.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* invites */}
      <h2 className="mt-6 font-display text-lg font-semibold">Undangan baru</h2>
      {invites.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada undangan. Campaign yang cocok dengan niche-mu akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {invites.map((c) => (
            <div key={c.campaignId} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{c.name}</h3>
                    <Badge variant="muted">{c.brand}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-lime">
                      <Flame className="size-3.5" /> {c.viralScore ?? "—"}
                    </span>
                    {c.niches.map((n) => (
                      <Badge key={n} variant="muted" className="capitalize">{n}</Badge>
                    ))}
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3.5" /> {fmtDate(c.deadline)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    Reward dasar{" "}
                    <span className="font-semibold text-lime">{formatIdr(c.estimatedBaseReward)}</span>
                    {" "}+ bonus views
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(c.campaignId, "accept")} disabled={busy !== null}>
                    {busy === c.campaignId ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Terima</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(c.campaignId, "decline")} disabled={busy !== null}>
                    <X className="size-4" /> Tolak
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* active */}
      {active.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold">Campaign aktif</h2>
          <div className="mt-3 space-y-3">
            {active.map((c) => (
              <Link
                key={c.campaignId}
                href={`/clipper/campaigns/${c.campaignId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-lime/40"
              >
                <div className="min-w-0">
                  <h3 className="font-display font-semibold">{c.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={c.status === "verified" || c.status === "rewarded" ? "success" : "muted"}>
                      {MEMBER_LABEL[c.status] ?? c.status}
                    </Badge>
                    {c.totalReward > 0 && (
                      <span className="text-lime">{formatIdr(c.totalReward)}</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
