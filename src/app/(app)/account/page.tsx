"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Megaphone, Scissors } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { updateProfile, enableBrand, enableClipper, ApiError } from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"ok" | string | null>(null);
  const [roleBusy, setRoleBusy] = useState<"brand" | "clipper" | null>(null);

  async function activateBrand() {
    if (roleBusy) return;
    setRoleBusy("brand");
    try {
      await enableBrand();
      await refreshUser();
      router.push("/campaign/new");
    } finally {
      setRoleBusy(null);
    }
  }

  async function activateClipper() {
    if (roleBusy) return;
    setRoleBusy("clipper");
    try {
      await enableClipper();
      await refreshUser();
      router.push("/clipper/setup");
    } finally {
      setRoleBusy(null);
    }
  }

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await updateProfile(name.trim());
      await refreshUser();
      setSaveResult("ok");
    } catch (err) {
      setSaveResult(err instanceof ApiError ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Pengaturan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola profil, preferensi, dan akun kamu.
      </p>

      {/* profile */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold">Profil</h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{user?.initials ?? "—"}</AvatarFallback>
          </Avatar>
          <Button variant="secondary" size="sm">Ganti foto</Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaveResult(null); }}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="mt-1.5 cursor-default opacity-60"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="size-4 animate-spin" /> Menyimpan...</> : "Simpan perubahan"}
          </Button>
          {saveResult === "ok" && (
            <span className="flex items-center gap-1.5 text-sm text-lime">
              <CheckCircle2 className="size-4" /> Tersimpan
            </span>
          )}
          {saveResult && saveResult !== "ok" && (
            <span className="text-sm text-red-400">{saveResult}</span>
          )}
        </div>
      </section>

      {/* roles */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold">Mode & Peran</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Satu akun bisa punya beberapa peran. Aktifkan peran lain di sini.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={user?.isBrand ? "default" : "muted"}>
            Brand {user?.isBrand ? "✓" : "—"}
          </Badge>
          <Badge variant={user?.isClipper ? "default" : "muted"}>
            Clipper {user?.isClipper ? "✓" : "—"}
          </Badge>
          <Badge variant="muted">Tool Mode ✓</Badge>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          {!user?.isBrand && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Megaphone className="size-4 text-lime" /> Aktifkan mode Brand
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Buat campaign & sebarkan video ke ratusan creator.
                </div>
              </div>
              <Button size="sm" onClick={activateBrand} disabled={roleBusy !== null}>
                {roleBusy === "brand" ? <Loader2 className="size-4 animate-spin" /> : "Aktifkan"}
              </Button>
            </div>
          )}

          {!user?.isClipper && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Scissors className="size-4 text-lime" /> Daftar sebagai Creator
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Isi DNA profile, terima campaign, dan dapat penghasilan.
                </div>
              </div>
              <Button size="sm" onClick={activateClipper} disabled={roleBusy !== null}>
                {roleBusy === "clipper" ? <Loader2 className="size-4 animate-spin" /> : "Mulai"}
              </Button>
            </div>
          )}

          {user?.isBrand && user?.isClipper && (
            <p className="text-sm text-muted-foreground">
              Kamu sudah mengaktifkan semua peran. 🎉
            </p>
          )}
        </div>
      </section>

      {/* preferences */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold">Preferensi</h2>
        <div className="mt-4 space-y-1">
          {[
            { t: "Email saat klip siap", d: "Beri tahu saya ketika pemrosesan selesai", on: true },
            { t: "Email promosi", d: "Tips, fitur baru, dan penawaran", on: false },
            { t: "Default auto-caption", d: "Aktifkan caption untuk project baru", on: true },
          ].map((p) => (
            <div key={p.t} className="flex items-center justify-between rounded-lg px-1 py-3">
              <div>
                <div className="text-sm font-medium">{p.t}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </div>
              <Switch defaultChecked={p.on} />
            </div>
          ))}
        </div>
      </section>

      {/* danger */}
      <section className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="font-display font-semibold text-red-400">Zona berbahaya</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Menghapus akun bersifat permanen dan tidak bisa dibatalkan.
        </p>
        <Separator className="my-4 bg-destructive/20" />
        <Button variant="destructive" size="sm">Hapus akun</Button>
      </section>
    </div>
  );
}
