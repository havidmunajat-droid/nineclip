"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/app/admin-only";
import { adminActWithdrawal, adminGetWithdrawals, ApiError } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { AdminWithdrawal } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["pending", "processed", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "muted"> = {
  pending: "warning",
  approved: "success",
  processed: "success",
  rejected: "danger",
};

function method(w: AdminWithdrawal) {
  if (w.ewalletType) return `${w.ewalletType.toUpperCase()} · ${w.ewalletNumber}`;
  if (w.bankName) return `${w.bankName} · ${w.accountNumber} (${w.accountName})`;
  return "—";
}

function WithdrawalsInner() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminGetWithdrawals(filter === "all" ? undefined : filter));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      await adminActWithdrawal(id, action, notes[id]?.trim() || undefined);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aksi gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Admin · Penarikan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tinjau dan proses permintaan penarikan poin clipper.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-border bg-secondary/50 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {f === "all" ? "Semua" : f}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-lime" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Tidak ada penarikan {filter !== "all" ? `berstatus ${filter}` : ""}.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((w) => (
            <div key={w.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.user.name}</span>
                    <Badge variant={STATUS_VARIANT[w.status] ?? "muted"}>{w.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{w.user.email}</div>
                  <div className="mt-2 text-sm">
                    <span className="font-display text-lg font-bold text-lime">{formatIdr(w.amount)}</span>
                    <span className="ml-2 text-muted-foreground">{method(w)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(w.createdAt).toLocaleString("id-ID")}
                  </div>
                  {w.adminNote && (
                    <div className="mt-2 text-xs text-muted-foreground">Catatan: {w.adminNote}</div>
                  )}
                </div>

                {w.status === "pending" && (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <Input
                      placeholder="Catatan admin (opsional)"
                      value={notes[w.id] ?? ""}
                      onChange={(e) => setNotes((p) => ({ ...p, [w.id]: e.target.value }))}
                      className="sm:w-64"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => act(w.id, "approve")} disabled={busy !== null}>
                        {busy === w.id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Approve</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(w.id, "reject")} disabled={busy !== null}>
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  return (
    <AdminOnly>
      <WithdrawalsInner />
    </AdminOnly>
  );
}
