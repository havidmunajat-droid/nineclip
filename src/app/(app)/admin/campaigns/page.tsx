"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { AdminOnly } from "@/components/app/admin-only";
import {
  adminGetCampaignClippers,
  adminGetCampaigns,
  adminVerify,
  ApiError,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { AdminCampaign, AdminCampaignClipper } from "@/lib/types";

function CampaignsInner() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [clippers, setClippers] = useState<Record<string, AdminCampaignClipper[]>>({});
  const [loadingClippers, setLoadingClippers] = useState(false);
  const [views, setViews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      if (open === id) {
        setOpen(null);
        return;
      }
      setOpen(id);
      if (!clippers[id]) {
        setLoadingClippers(true);
        try {
          const list = await adminGetCampaignClippers(id);
          setClippers((p) => ({ ...p, [id]: list }));
        } catch {
          setClippers((p) => ({ ...p, [id]: [] }));
        } finally {
          setLoadingClippers(false);
        }
      }
    },
    [open, clippers],
  );

  async function verify(campaignId: string, cc: AdminCampaignClipper) {
    const v = parseInt(views[cc.id] || "0", 10);
    if (Number.isNaN(v) || v < 0 || busy) return;
    setBusy(cc.id);
    setError(null);
    try {
      await adminVerify(campaignId, cc.id, v);
      const list = await adminGetCampaignClippers(campaignId);
      setClippers((p) => ({ ...p, [campaignId]: list }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verifikasi gagal.");
    } finally {
      setBusy(null);
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
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Admin · Campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Semua campaign. Buka untuk verifikasi submission clipper.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Belum ada campaign.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card">
              <button
                onClick={() => toggle(c.id)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {open === c.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="font-display font-semibold">{c.name}</span>
                    <CampaignStatusBadge status={c.status} />
                  </div>
                  <div className="mt-1 pl-6 text-xs text-muted-foreground">
                    {c.brand.name} · {c.brand.email} · {c._count.clippers} clipper · {formatIdr(c.rewardPool)} pool
                  </div>
                </div>
                <Badge variant="muted" className="capitalize">{c.packageType}</Badge>
              </button>

              {open === c.id && (() => {
                const list = clippers[c.id];
                return (
                <div className="border-t border-border p-5">
                  {loadingClippers && !list ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-lime" />
                    </div>
                  ) : !list || list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada clipper di campaign ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {list.map((cc) => (
                        <div key={cc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{cc.clipper.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="muted">{cc.status}</Badge>
                              {cc.submittedUrl && (
                                <a href={cc.submittedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-lime hover:underline">
                                  submission <ExternalLink className="size-3" />
                                </a>
                              )}
                              {cc.totalReward > 0 && <span className="text-lime">{formatIdr(cc.totalReward)}</span>}
                            </div>
                          </div>

                          {cc.status === "submitted" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="views"
                                value={views[cc.id] ?? ""}
                                onChange={(e) => setViews((p) => ({ ...p, [cc.id]: e.target.value }))}
                                className="w-28"
                              />
                              <Button size="sm" onClick={() => verify(c.id, cc)} disabled={busy !== null}>
                                {busy === cc.id ? <Loader2 className="size-4 animate-spin" /> : "Verifikasi"}
                              </Button>
                            </div>
                          ) : (
                            cc.viewCount !== null && (
                              <span className="text-xs text-muted-foreground">{cc.viewCount.toLocaleString("id-ID")} views</span>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCampaignsPage() {
  return (
    <AdminOnly>
      <CampaignsInner />
    </AdminOnly>
  );
}
