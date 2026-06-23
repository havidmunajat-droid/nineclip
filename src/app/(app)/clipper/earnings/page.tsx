"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getEarnings, requestWithdraw, ApiError } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { ClipperEarnings } from "@/lib/types";
import { cn } from "@/lib/utils";

const MIN_WITHDRAW = 50_000;

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const WD_STATUS: Record<string, { label: string; variant: "muted" | "success" | "warning" | "danger" }> = {
  pending: { label: "Menunggu", variant: "warning" },
  approved: { label: "Disetujui", variant: "success" },
  processed: { label: "Selesai", variant: "success" },
  rejected: { label: "Ditolak", variant: "danger" },
};

export default function EarningsPage() {
  const [data, setData] = useState<ClipperEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState<"bank" | "ewallet">("ewallet");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [ewalletType, setEwalletType] = useState("gopay");
  const [ewalletNumber, setEwalletNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getEarnings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const points = data?.pointBalance ?? 0;
  const amountNum = parseInt(amount || "0", 10);
  const canSubmit =
    amountNum >= MIN_WITHDRAW &&
    amountNum <= points &&
    (method === "bank"
      ? bankName && accountNumber && accountName
      : ewalletType && ewalletNumber);

  async function handleWithdraw() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setDone(false);
    try {
      await requestWithdraw({
        amount: amountNum,
        method,
        ...(method === "bank"
          ? { bankName, accountNumber, accountName }
          : { ewalletType, ewalletNumber }),
      });
      setDone(true);
      setAmount("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengajukan penarikan.");
    } finally {
      setSubmitting(false);
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
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Earnings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Poin kamu, riwayat, dan penarikan.</p>

      {/* balance */}
      <div className="mt-6 rounded-2xl border border-lime/30 bg-gradient-to-br from-lime/10 to-transparent p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="size-4 text-lime" /> Saldo poin
        </div>
        <div className="mt-2 font-display text-4xl font-extrabold text-lime">
          {points.toLocaleString("id-ID")}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Setara {formatIdr(points)} · 1 poin = Rp1
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* history */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold">Riwayat transaksi</h2>
          {!data || data.transactions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Belum ada transaksi poin.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {data.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{t.description ?? t.type}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</div>
                  </div>
                  <span className={cn("font-semibold", t.amount >= 0 ? "text-lime" : "text-red-400")}>
                    {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data && data.withdrawals.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-medium">Penarikan</h3>
              <ul className="mt-2 divide-y divide-border">
                {data.withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <div>{formatIdr(w.amount)}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(w.createdAt)}</div>
                    </div>
                    <Badge variant={WD_STATUS[w.status]?.variant ?? "muted"}>
                      {WD_STATUS[w.status]?.label ?? w.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* withdraw form */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold">Tarik poin</h2>
          <p className="mt-1 text-xs text-muted-foreground">Minimum {formatIdr(MIN_WITHDRAW)}.</p>

          <div className="mt-4 inline-flex rounded-lg border border-border bg-secondary/50 p-1">
            {(["ewallet", "bank"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {m === "ewallet" ? "E-Wallet" : "Bank"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="amount">Jumlah poin</Label>
              <Input id="amount" type="number" min={MIN_WITHDRAW} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" className="mt-1.5" />
            </div>

            {method === "bank" ? (
              <>
                <Input placeholder="Nama bank (mis. BCA)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                <Input placeholder="Nomor rekening" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                <Input placeholder="Nama pemilik rekening" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {["gopay", "ovo", "dana", "shopee"].map((w) => (
                    <button
                      key={w}
                      onClick={() => setEwalletType(w)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm uppercase transition-colors",
                        ewalletType === w
                          ? "border-lime/60 bg-lime/10 text-lime"
                          : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <Input placeholder="Nomor e-wallet" value={ewalletNumber} onChange={(e) => setEwalletNumber(e.target.value)} />
              </>
            )}

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {done && (
              <p className="flex items-center gap-1.5 rounded-lg bg-lime/10 px-3 py-2 text-xs text-lime">
                <CheckCircle2 className="size-4" /> Permintaan penarikan terkirim, menunggu admin.
              </p>
            )}

            <Button className="w-full" onClick={handleWithdraw} disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Ajukan penarikan"}
            </Button>
            {amountNum > 0 && amountNum > points && (
              <p className="text-center text-xs text-red-400">Saldo tidak cukup.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
