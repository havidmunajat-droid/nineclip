"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateSocialCode, verifySocialCode, ApiError } from "@/lib/api";

const PLATFORM_META: Record<string, { label: string; placeholder: string; bioHint: string }> = {
  tiktok: {
    label: "TikTok",
    placeholder: "@username_kamu",
    bioHint: "Tempel kode di bio TikTok kamu, lalu klik Verifikasi.",
  },
  youtube: {
    label: "YouTube",
    placeholder: "@handle atau URL channel",
    bioHint: "Tempel kode di deskripsi About channel YouTube kamu, lalu klik Verifikasi.",
  },
  instagram: {
    label: "Instagram",
    placeholder: "@username_kamu",
    bioHint: "Tempel kode di bio Instagram kamu, lalu klik Verifikasi.",
  },
};

type Step = "input" | "code" | "success" | "failed";

export default function SocialVerifyPage() {
  const { platform } = useParams<{ platform: string }>();
  const router = useRouter();
  const meta = PLATFORM_META[platform];

  const [step, setStep] = useState<Step>("input");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meta) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-sm text-muted-foreground">Platform tidak dikenal: {platform}</p>
        <Link href="/clipper/setup" className="mt-4 inline-block text-sm text-lime hover:underline">
          ← Kembali ke setup
        </Link>
      </div>
    );
  }

  async function handleGenerate() {
    if (!username.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await generateSocialCode(platform, username.trim());
      setCode(res.code);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat kode. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!username.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifySocialCode(platform, username.trim());
      setStep("success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Verifikasi gagal.";
      if (msg === "CODE_NOT_FOUND_IN_BIO") {
        setError("Kode belum terdeteksi di bio. Pastikan sudah tersimpan, lalu coba lagi.");
      } else if (msg === "CODE_EXPIRED") {
        setError("Kode sudah kadaluarsa. Buat kode baru.");
        setStep("input");
      } else {
        setError(msg);
        setStep("failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/clipper/setup" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Setup profil
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
        Verifikasi {meta.label}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Buktikan kepemilikan akunmu agar submission diterima otomatis.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {/* STEP 1 — Input username */}
        {(step === "input" || step === "failed") && (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-lime/20 text-xs font-bold text-lime">1</div>
              <Label>Username {meta.label}</Label>
            </div>
            <Input
              placeholder={meta.placeholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
            <Button className="mt-4 w-full" onClick={handleGenerate} disabled={busy || !username.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Buat kode verifikasi"}
            </Button>
          </div>
        )}

        {/* STEP 2 — Tampilkan kode */}
        {step === "code" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-lime text-xs font-bold text-primary-foreground">✓</div>
                <span className="text-sm font-medium">Username: <span className="text-lime">{username}</span></span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-lime/20 text-xs font-bold text-lime">2</div>
                <span className="text-sm font-medium">Tempel kode ini di bio {meta.label} kamu</span>
              </div>
              <p className="mt-1.5 pl-8 text-xs text-muted-foreground">{meta.bioHint}</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-lime/30 bg-lime/5 p-3">
                <code className="flex-1 font-mono text-lg font-bold tracking-widest text-lime">
                  {code}
                </code>
                <Button size="sm" variant="secondary" onClick={copyCode}>
                  {copied ? <><CheckCircle2 className="size-4" /> Disalin</> : <><ClipboardCopy className="size-4" /> Salin</>}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Kode berlaku <strong className="text-foreground">15 menit</strong>. Setelah verifikasi berhasil bisa dihapus dari bio.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-lime/20 text-xs font-bold text-lime">3</div>
                <span className="text-sm font-medium">Konfirmasi</span>
              </div>
              {error && <p className="mt-2 pl-8 text-xs text-red-400">{error}</p>}
              <Button className="mt-3 w-full" onClick={handleVerify} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <><BadgeCheck className="size-4" /> Verifikasi sekarang</>}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("input"); setError(null); }}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Ganti username / buat kode baru
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-lime" />
            <h2 className="mt-3 font-display text-xl font-bold">Terverifikasi!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Akun <span className="font-medium text-foreground">{meta.label}</span> @{username} kamu sudah terhubung ke nineClip.
            </p>
            <div className="mt-5 flex gap-3">
              <Button asChild className="flex-1" onClick={() => router.push("/clipper/setup")}>
                <Link href="/clipper/setup">Kembali ke setup</Link>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/clipper/campaigns">Lihat campaign</Link>
              </Button>
            </div>
          </div>
        )}

        {/* FAILED (unrecoverable) */}
        {step === "failed" && error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
