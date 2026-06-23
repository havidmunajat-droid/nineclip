"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Loader2, Megaphone, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { getCampaigns } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { Campaign } from "@/lib/types";

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCampaigns()
      .then((list) => active && setCampaigns(list))
      .catch(() => active && setCampaigns([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Campaign Brand</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sebarkan videomu ke ratusan creator dan pantau performanya.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaign/new">
            <Plus className="size-4" /> Campaign baru
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-lime" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime">
            <Megaphone className="size-6" />
          </div>
          <h2 className="mt-4 font-display font-semibold">Belum ada campaign</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Buat campaign pertamamu: input video, AI memilihkan clipper, lalu pantau distribusinya.
          </p>
          <Button asChild className="mt-6">
            <Link href="/campaign/new">
              <Plus className="size-4" /> Buat campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaign/${c.id}`}
              className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-lime/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold leading-tight">{c.name}</h3>
                <CampaignStatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-lime">
                  <Flame className="size-3.5" /> {c.viralScore ?? "—"}
                </span>
                {c.detectedNiches.slice(0, 2).map((n) => (
                  <Badge key={n} variant="muted" className="capitalize">{n}</Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {c.clippersCount}/{c.maxClippers}
                </span>
                <span className="capitalize">{c.packageType}</span>
                <span>{formatIdr(c.rewardPool)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
