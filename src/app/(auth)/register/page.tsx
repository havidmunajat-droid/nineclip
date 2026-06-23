"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Megaphone, Scissors, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { onboardingPathFor, type OnboardingIntent } from "@/lib/roles";

const INTENT_COPY: Record<
  OnboardingIntent,
  { badge: string; icon: typeof Sparkles; title: string; subtitle: string }
> = {
  brand: {
    badge: "Untuk Brand",
    icon: Megaphone,
    title: "Daftar sebagai Brand",
    subtitle: "Sebarkan videomu ke ratusan creator. Buat campaign pertamamu.",
  },
  clipper: {
    badge: "Untuk Clipper",
    icon: Scissors,
    title: "Gabung sebagai Creator",
    subtitle: "Distribusikan klip, raih views, dan dapat penghasilan.",
  },
  tool: {
    badge: "Tool Mode",
    icon: Sparkles,
    title: "Buat akun gratis",
    subtitle: "30 menit upload gratis. Tanpa kartu kredit.",
  },
};

function parseIntent(raw: string | null): OnboardingIntent {
  return raw === "brand" || raw === "clipper" ? raw : "tool";
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = parseIntent(searchParams.get("intent"));
  const copy = INTENT_COPY[intent];
  const Icon = copy.icon;

  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await register(
        String(form.get("name") ?? ""),
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
        intent,
      );
      router.push(onboardingPathFor(intent));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal membuat akun. Coba lagi.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime">
        <Icon className="size-3.5" /> {copy.badge}
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>

      <div className="mt-7">
        <GoogleButton>Daftar dengan Google</GoogleButton>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> atau <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nama</Label>
          <Input id="name" name="name" placeholder="Nama lengkap" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="kamu@email.com" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="Minimal 8 karakter" required minLength={8} className="mt-1.5" />
        </div>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Daftar gratis"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Dengan mendaftar, kamu menyetujui Syarat Layanan & Kebijakan Privasi.
      </p>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-lime hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-lime" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
