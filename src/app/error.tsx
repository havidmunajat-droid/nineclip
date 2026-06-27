"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
        Terjadi kesalahan
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Sesuatu yang tidak terduga terjadi. Coba lagi atau kembali ke beranda.
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
          <Link href="/">Ke beranda</Link>
        </Button>
      </div>
    </div>
  );
}
