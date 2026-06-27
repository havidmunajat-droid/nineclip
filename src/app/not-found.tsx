import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-lime/10 text-lime">
        <FileQuestion className="size-8" />
      </div>
      <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight text-lime">
        404
      </h1>
      <p className="mt-2 font-display text-xl font-bold">Halaman tidak ditemukan</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Halaman yang kamu cari tidak ada atau sudah dipindah.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
