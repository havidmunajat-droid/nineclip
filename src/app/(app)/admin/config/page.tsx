"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminOnly } from "@/components/app/admin-only";
import {
  adminGetConfig,
  adminUpdatePackage,
  adminUpdatePlan,
  adminUpdatePlatform,
  ApiError,
} from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import { formatIDR } from "@/lib/mock";
import type { AppConfig, PackageConfigItem, PlanConfigItem } from "@/lib/types";

interface PkgForm {
  name: string; priceIdr: string; credits: string; maxClippers: string;
  kpiViews: string; campaignDays: string; tagline: string; highlighted: boolean;
}
function toPkgForm(p: PackageConfigItem): PkgForm {
  return { name: p.name, priceIdr: String(p.priceIdr), credits: String(p.credits),
    maxClippers: String(p.maxClippers), kpiViews: String(p.kpiViews),
    campaignDays: String(p.campaignDays), tagline: p.tagline, highlighted: p.highlighted };
}

interface PlanForm {
  name: string; tagline: string; priceMonthly: string; priceYearly: string;
  minutesPerMonth: string; features: string; highlighted: boolean;
}
function toPlanForm(p: PlanConfigItem): PlanForm {
  return { name: p.name, tagline: p.tagline, priceMonthly: String(p.priceMonthly),
    priceYearly: String(p.priceYearly), minutesPerMonth: String(p.minutesPerMonth),
    features: p.features.join("\n"), highlighted: p.highlighted };
}

function ConfigInner() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pkgForms, setPkgForms] = useState<Record<string, PkgForm>>({});
  const [planForms, setPlanForms] = useState<Record<string, PlanForm>>({});
  const [feePct, setFeePct] = useState("20");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await adminGetConfig();
      setConfig(cfg);
      setFeePct(String(cfg.platform.feePct));
      const pForms: Record<string, PkgForm> = {};
      cfg.packages.forEach((p) => { pForms[p.packageType] = toPkgForm(p); });
      setPkgForms(pForms);
      const lForms: Record<string, PlanForm> = {};
      cfg.plans.forEach((p) => { lForms[p.planId] = toPlanForm(p); });
      setPlanForms(lForms);
    } catch {
      setError("Gagal memuat konfigurasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField<K extends keyof PkgForm>(type: string, key: K, val: PkgForm[K]) {
    setPkgForms((prev) => ({ ...prev, [type]: { ...prev[type]!, [key]: val } }));
  }
  function setPlanField<K extends keyof PlanForm>(planId: string, key: K, val: PlanForm[K]) {
    setPlanForms((prev) => ({ ...prev, [planId]: { ...prev[planId]!, [key]: val } }));
  }

  async function savePackage(packageType: string) {
    const f = pkgForms[packageType];
    if (!f) return;
    setSaving(packageType);
    setError(null);
    try {
      const updated = await adminUpdatePackage(packageType, {
        name: f.name,
        priceIdr: parseInt(f.priceIdr, 10),
        credits: parseInt(f.credits, 10),
        maxClippers: parseInt(f.maxClippers, 10),
        kpiViews: parseInt(f.kpiViews, 10),
        campaignDays: parseInt(f.campaignDays, 10),
        tagline: f.tagline,
        highlighted: f.highlighted,
      });
      setConfig((prev) => prev ? { ...prev, packages: updated } : prev);
      setSaved(packageType);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
    }
  }

  async function savePlan(planId: string) {
    const f = planForms[planId];
    if (!f) return;
    setSaving(`plan-${planId}`);
    setError(null);
    try {
      const updated = await adminUpdatePlan(planId, {
        name: f.name,
        tagline: f.tagline,
        priceMonthly: parseInt(f.priceMonthly, 10),
        priceYearly: parseInt(f.priceYearly, 10),
        minutesPerMonth: parseInt(f.minutesPerMonth, 10),
        features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
        highlighted: f.highlighted,
      });
      setConfig((prev) => prev ? { ...prev, plans: updated } : prev);
      setSaved(`plan-${planId}`);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
    }
  }

  async function savePlatform() {
    const pct = parseInt(feePct, 10);
    if (Number.isNaN(pct) || pct < 1 || pct > 50) {
      setError("Fee harus antara 1–50%.");
      return;
    }
    setSaving("platform");
    setError(null);
    try {
      const updated = await adminUpdatePlatform(pct);
      setConfig((prev) => prev ? { ...prev, packages: updated, platform: { ...prev.platform, feePct: pct } } : prev);
      setSaved("platform");
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
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
      <div className="flex items-center gap-2">
        <Settings2 className="size-5 text-lime" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Admin · Konfigurasi</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Ubah harga paket dan fee platform. Berlaku langsung untuk campaign baru.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Platform fee */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold">Fee Platform</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Persentase yang dipotong dari harga paket sebagai pendapatan platform. Sisanya masuk clipper pool.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Fee % (1–50)</label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <Button onClick={savePlatform} disabled={saving !== null} size="sm">
            {saving === "platform" ? <Loader2 className="size-4 animate-spin" /> :
             saved === "platform" ? "✓ Tersimpan" : <><Save className="size-4" /> Simpan</>}
          </Button>
        </div>
        {config && (
          <p className="mt-2 text-xs text-muted-foreground">
            Saat ini: <span className="font-medium text-foreground">{config.platform.feePct}%</span>
          </p>
        )}
      </section>

      {/* Package cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {config?.packages.map((p) => {
          const f = pkgForms[p.packageType];
          if (!f) return null;
          const isSaving = saving === p.packageType;
          const isSaved = saved === p.packageType;

          return (
            <section key={p.packageType} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-semibold">{p.name}</h2>
                  <Badge variant="muted" className="capitalize">{p.packageType}</Badge>
                </div>
                {p.highlighted && <Badge>Populer</Badge>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nama paket</label>
                  <Input value={f.name} onChange={(e) => setField(p.packageType, "name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Harga (Rp)</label>
                  <Input type="number" min="1" value={f.priceIdr} onChange={(e) => setField(p.packageType, "priceIdr", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Slot video</label>
                  <Input type="number" min="1" value={f.credits} onChange={(e) => setField(p.packageType, "credits", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Maks clipper</label>
                  <Input type="number" min="1" value={f.maxClippers} onChange={(e) => setField(p.packageType, "maxClippers", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">KPI Views target</label>
                  <Input type="number" min="1" value={f.kpiViews} onChange={(e) => setField(p.packageType, "kpiViews", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Durasi campaign (hari)</label>
                  <Input type="number" min="1" value={f.campaignDays} onChange={(e) => setField(p.packageType, "campaignDays", e.target.value)} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Tagline</label>
                  <Input value={f.tagline} onChange={(e) => setField(p.packageType, "tagline", e.target.value)} className="mt-1" maxLength={120} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    id={`hl-${p.packageType}`}
                    type="checkbox"
                    checked={f.highlighted}
                    onChange={(e) => setField(p.packageType, "highlighted", e.target.checked)}
                    className="size-4 accent-lime"
                  />
                  <label htmlFor={`hl-${p.packageType}`} className="text-sm">Tandai sebagai paket populer</label>
                </div>
              </div>

              {/* Computed preview */}
              <div className="mt-4 rounded-lg border border-lime/20 bg-lime/5 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Preview kalkulasi (berdasarkan input):</p>
                {(() => {
                  const price = parseInt(f.priceIdr, 10) || 0;
                  const credits = parseInt(f.credits, 10) || 1;
                  const feeP = parseInt(feePct, 10) || config.platform.feePct;
                  const fee = Math.round(price * feeP / 100);
                  const pool = price - fee;
                  const base = Math.round(pool * 0.6);
                  const bonus = pool - base;
                  const rpv = credits > 0 ? Math.floor(base / credits) : 0;
                  return (
                    <>
                      <p>Platform fee ({feeP}%): <span className="text-foreground">{formatIdr(fee)}</span></p>
                      <p>Clipper pool (80%): <span className="text-foreground">{formatIdr(pool)}</span></p>
                      <p>Base fund (60%): <span className="text-foreground">{formatIdr(base)}</span></p>
                      <p>Bonus pool (40%): <span className="text-foreground">{formatIdr(bonus)}</span></p>
                      <p>Reward / video: <span className="font-semibold text-lime">{formatIdr(rpv)}</span></p>
                    </>
                  );
                })()}
              </div>

              <Button
                className="mt-4 w-full"
                size="sm"
                onClick={() => savePackage(p.packageType)}
                disabled={saving !== null}
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> :
                 isSaved ? "✓ Tersimpan" : <><Save className="size-4" /> Simpan perubahan</>}
              </Button>
            </section>
          );
        })}
      </div>
      {/* Subscription Plans */}
      <h2 className="mt-10 font-display text-lg font-semibold">Subscription Plan (Menit)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Atur kuota menit, harga bulanan/tahunan, dan fitur per plan.
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {config?.plans.map((p) => {
          const f = planForms[p.planId];
          if (!f) return null;
          const isSaving = saving === `plan-${p.planId}`;
          const isSaved = saved === `plan-${p.planId}`;
          return (
            <section key={p.planId} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold">{p.name}</h3>
                <Badge variant="muted" className="capitalize">{p.planId}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nama plan</label>
                  <Input value={f.name} onChange={(e) => setPlanField(p.planId, "name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tagline</label>
                  <Input value={f.tagline} onChange={(e) => setPlanField(p.planId, "tagline", e.target.value)} className="mt-1" maxLength={120} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Harga/bulan (Rp)</label>
                    <Input type="number" min="0" value={f.priceMonthly} onChange={(e) => setPlanField(p.planId, "priceMonthly", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Harga/tahun (Rp)</label>
                    <Input type="number" min="0" value={f.priceYearly} onChange={(e) => setPlanField(p.planId, "priceYearly", e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Kuota menit / bulan</label>
                  <Input type="number" min="1" value={f.minutesPerMonth} onChange={(e) => setPlanField(p.planId, "minutesPerMonth", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fitur (satu per baris)</label>
                  <textarea
                    value={f.features}
                    onChange={(e) => setPlanField(p.planId, "features", e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-lime"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`hl-plan-${p.planId}`}
                    type="checkbox"
                    checked={f.highlighted}
                    onChange={(e) => setPlanField(p.planId, "highlighted", e.target.checked)}
                    className="size-4 accent-lime"
                  />
                  <label htmlFor={`hl-plan-${p.planId}`} className="text-sm">Tandai sebagai paling populer</label>
                </div>
                <div className="rounded-lg border border-lime/20 bg-lime/5 p-2 text-xs text-muted-foreground">
                  Preview: <span className="text-foreground font-medium">{parseInt(f.minutesPerMonth, 10) || 0} menit/bln</span>
                  {" · "}{parseInt(f.priceMonthly, 10) === 0 ? "Gratis" : formatIDR(parseInt(f.priceMonthly, 10) || 0)}/bln
                  {" · "}{formatIDR(parseInt(f.priceYearly, 10) || 0)}/thn
                </div>
              </div>
              <Button className="mt-4 w-full" size="sm" onClick={() => savePlan(p.planId)} disabled={saving !== null}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> :
                 isSaved ? "✓ Tersimpan" : <><Save className="size-4" /> Simpan</>}
              </Button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <AdminOnly>
      <ConfigInner />
    </AdminOnly>
  );
}
