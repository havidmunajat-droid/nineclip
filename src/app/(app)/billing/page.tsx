"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Download, Loader2, Sparkles } from "lucide-react";
import { Pricing } from "@/components/marketing/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { planConfigToLegacy, formatIDR } from "@/lib/mock";
import { getInvoices, getPublicPlans } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Invoice, Plan } from "@/lib/types";

const statusVariant = {
  paid: "success",
  pending: "warning",
  failed: "danger",
} as const;

export default function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInvoices().catch(() => [] as Invoice[]),
      getPublicPlans().catch(() => []),
    ]).then(([inv, raw]) => {
      setInvoices(inv);
      setPlans(raw.map(planConfigToLegacy));
    }).finally(() => setLoading(false));
  }, []);

  const plan = plans.find((p) => p.id === (user?.planId ?? "free")) ?? plans[0];
  const minutesUsed = user?.minutesUsed ?? 0;
  const minutesQuota = user?.minutesQuota ?? 30;
  const usedPct = Math.round((minutesUsed / minutesQuota) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Langganan & Tagihan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola paket, pantau kuota, dan lihat riwayat pembayaran.
      </p>

      {/* current plan + usage */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-lime/30 bg-card p-5 shadow-glow-sm">
          <div className="flex items-center justify-between">
            <Badge className="gap-1">
              <Sparkles className="size-3" /> Paket aktif
            </Badge>
            <span className="text-xs text-muted-foreground">Perpanjang 1 Jul 2026</span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-2xl font-bold">{plan?.name ?? "—"}</span>
            <span className="mb-0.5 text-sm text-muted-foreground">
              {plan ? formatIDR(plan.priceMonthly) : "—"}/bln
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm">Ubah paket</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Batalkan
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kuota menit bulan ini</span>
            <span className="font-semibold">
              {minutesUsed} / {minutesQuota} menit
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-deep via-lime to-lime-bright"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sisa {minutesQuota - minutesUsed} menit. Kuota direset setiap awal bulan.
          </p>
        </div>
      </div>

      {/* payment methods (Midtrans) */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-lime" />
          <h2 className="font-display font-semibold">Metode pembayaran</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pembayaran diproses aman lewat Midtrans.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["QRIS", "BCA VA", "Mandiri VA", "GoPay", "OVO", "Dana", "Kartu Kredit"].map((m) => (
            <span
              key={m}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground/80"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* upgrade */}
      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Upgrade paket</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Butuh lebih banyak menit dan fitur? Naik paket kapan saja.
        </p>
        <div className="mt-6">
          <Pricing plans={plans} />
        </div>
      </div>

      {/* invoices */}
      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Riwayat pembayaran</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-lime" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada riwayat pembayaran.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Paket</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Metode</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{inv.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {inv.plan}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {inv.method}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatIDR(inv.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[inv.status]} className="gap-1">
                        <CheckCircle2 className="size-3" />
                        {inv.status === "paid" ? "Lunas" : inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Download className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
