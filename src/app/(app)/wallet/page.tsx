"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, Loader2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getWallet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatIdr } from "@/lib/campaign-packages";
import type { WalletData, WalletTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  credit_purchase: "Pembelian kredit",
  campaign_debit: "Pembayaran campaign",
  reward_earn: "Reward campaign",
  bonus_earn: "Bonus performa",
  point_withdraw_request: "Permintaan penarikan",
  point_withdraw_done: "Penarikan selesai",
};

const AMOUNT_CLASS: Record<string, string> = {
  credit_purchase: "text-lime",
  campaign_debit: "text-red-400",
  reward_earn: "text-lime",
  bonus_earn: "text-lime",
  point_withdraw_request: "text-red-400",
  point_withdraw_done: "text-red-400",
};

type Tab = "all" | "credit" | "point";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TxRow({ t }: { t: WalletTransaction }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {TYPE_LABELS[t.type] ?? t.type}
        </div>
        {t.description && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.description}
          </div>
        )}
        <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(t.createdAt)}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "font-semibold",
            AMOUNT_CLASS[t.type] ?? (t.amount >= 0 ? "text-lime" : "text-red-400"),
          )}
        >
          {t.amount >= 0 ? "+" : ""}
          {t.amount.toLocaleString("id-ID")}
        </span>
        <Badge variant="muted" className="text-[10px]">
          {t.balanceType === "credit" ? "kredit" : "poin"}
        </Badge>
      </div>
    </li>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    getWallet()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  const creditBalance = data?.creditBalance ?? 0;
  const pointBalance = data?.pointBalance ?? 0;
  const showPoints = user?.isClipper || pointBalance > 0;

  const filtered: WalletTransaction[] =
    tab === "all"
      ? (data?.transactions ?? [])
      : (data?.transactions ?? []).filter((t) => t.balanceType === tab);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Saldo kredit & riwayat transaksi kamu.
      </p>

      {/* Saldo cards */}
      <div className={cn("mt-6 grid gap-4", showPoints ? "sm:grid-cols-2" : "")}>
        {/* Credit (brand) */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4 text-lime" />
            Kredit campaign
          </div>
          <div className="mt-3 font-display text-4xl font-extrabold text-foreground">
            {creditBalance.toLocaleString("id-ID")}
            <span className="ml-2 text-xl font-medium text-muted-foreground">kredit</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Digunakan untuk membeli paket campaign.
          </p>
          {user?.isBrand && (
            <Link
              href="/campaign/new"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-lime hover:underline"
            >
              Buat campaign <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Point (clipper) */}
        {showPoints && (
          <div className="rounded-2xl border border-lime/30 bg-gradient-to-br from-lime/10 to-transparent p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4 text-lime" />
              Poin clipper
            </div>
            <div className="mt-3 font-display text-4xl font-extrabold text-lime">
              {pointBalance.toLocaleString("id-ID")}
              <span className="ml-2 text-xl font-medium text-lime/60">poin</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Setara {formatIdr(pointBalance)} · 1 poin = Rp1
            </p>
            <Link
              href="/clipper/earnings"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-lime hover:underline"
            >
              Tarik poin <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Riwayat transaksi</h2>

        {/* Filter tabs */}
        <div className="mt-3 inline-flex rounded-lg border border-border bg-secondary/50 p-1">
          {(["all", "credit", "point"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "Semua" : t === "credit" ? "Kredit" : "Poin"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            {tab === "all"
              ? "Belum ada transaksi."
              : tab === "credit"
                ? "Belum ada transaksi kredit."
                : "Belum ada transaksi poin."}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card px-5">
            <ul className="divide-y divide-border">
              {filtered.map((t) => (
                <TxRow key={t.id} t={t} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
