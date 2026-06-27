"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/app/admin-only";
import {
  adminApproveManual,
  adminGetManualQueue,
  adminRejectManual,
  ApiError,
} from "@/lib/api";
import type { AdminManualVerification } from "@/lib/types";

interface ApproveForm {
  viewCount: string;
  likeCount: string;
  commentCount: string;
  shareCount: string;
  isOriginal: boolean;
}

const EMPTY_FORM: ApproveForm = {
  viewCount: "",
  likeCount: "",
  commentCount: "",
  shareCount: "",
  isOriginal: true,
};

function VerificationsInner() {
  const [items, setItems] = useState<AdminManualVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, ApproveForm>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminGetManualQueue();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function form(id: string): ApproveForm {
    return forms[id] ?? EMPTY_FORM;
  }

  function setField<K extends keyof ApproveForm>(id: string, key: K, value: ApproveForm[K]) {
    setForms((prev) => ({ ...prev, [id]: { ...form(id), [key]: value } }));
  }

  async function handleApprove(item: AdminManualVerification) {
    const f = form(item.id);
    const viewCount = parseInt(f.viewCount, 10);
    const likeCount = parseInt(f.likeCount || "0", 10);
    const commentCount = parseInt(f.commentCount || "0", 10);
    const shareCount = parseInt(f.shareCount || "0", 10);
    if (Number.isNaN(viewCount) || viewCount < 0) {
      setError("View count harus angka ≥ 0.");
      return;
    }
    setBusy(item.id);
    setError(null);
    try {
      await adminApproveManual(item.id, { viewCount, likeCount, commentCount, shareCount, isOriginal: f.isOriginal });
      setDone((prev) => new Set([...prev, item.id]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Approval gagal.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(item: AdminManualVerification) {
    if (!confirm(`Tolak submission dari ${item.clipper.name}?`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await adminRejectManual(item.id);
      setDone((prev) => new Set([...prev, item.id]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reject gagal.");
    } finally {
      setBusy(null);
    }
  }

  const pending = items.filter((i) => !done.has(i.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Admin · Manual Review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submission yang butuh input stats manual (Instagram, TikTok fallback).
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {pending.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Tidak ada submission yang menunggu review manual. 🎉
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {pending.map((item) => {
            const f = form(item.id);
            const isBusy = busy === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold">{item.clipper.name}</span>
                      <Badge variant="muted">{item.clipper.email}</Badge>
                      {item.platform && (
                        <Badge variant="muted" className="capitalize">{item.platform}</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Campaign: <span className="text-foreground">{item.campaign.name}</span>
                      {" · "}{item.campaign.packageType}
                      {item.submittedAt && ` · submit ${new Date(item.submittedAt).toLocaleString("id-ID")}`}
                    </div>
                    {item.submittedUrl && (
                      <a
                        href={item.submittedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-lime hover:underline"
                      >
                        Lihat submission <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Views *</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={f.viewCount}
                      onChange={(e) => setField(item.id, "viewCount", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Likes</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={f.likeCount}
                      onChange={(e) => setField(item.id, "likeCount", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Comments</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={f.commentCount}
                      onChange={(e) => setField(item.id, "commentCount", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Shares</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={f.shareCount}
                      onChange={(e) => setField(item.id, "shareCount", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    id={`orig-${item.id}`}
                    type="checkbox"
                    checked={f.isOriginal}
                    onChange={(e) => setField(item.id, "isOriginal", e.target.checked)}
                    className="size-4 accent-lime"
                  />
                  <label htmlFor={`orig-${item.id}`} className="text-sm">
                    Konten original (bukan reupload)
                  </label>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(item)}
                    disabled={isBusy || !f.viewCount}
                    className="flex-1"
                  >
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Approve</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(item)}
                    disabled={isBusy}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-right">
        <button type="button" onClick={load} className="text-xs text-muted-foreground hover:text-foreground">
          Refresh ↺
        </button>
      </div>
    </div>
  );
}

export default function AdminVerificationsPage() {
  return (
    <AdminOnly>
      <VerificationsInner />
    </AdminOnly>
  );
}
