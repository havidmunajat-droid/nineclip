"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
        Halaman gagal dimuat
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Koneksi ke server terputus atau terjadi error. Periksa koneksimu lalu coba lagi.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground opacity-50">
          {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>
          <RefreshCw className="size-4" /> Coba lagi
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
