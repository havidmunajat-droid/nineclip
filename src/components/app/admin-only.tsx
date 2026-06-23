"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Lindungi halaman admin di klien: hanya is_admin yang boleh lihat.
 * Backend tetap menjadi penjaga utama (AdminGuard).
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-red-400">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya untuk admin.
        </p>
        <Link href="/dashboard" className="mt-6 text-sm text-lime hover:underline">
          ← Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
