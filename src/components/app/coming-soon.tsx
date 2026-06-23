import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder sementara untuk halaman yang dibangun di sesi berikutnya
 * (Campaign Wizard / Clipper). Menjaga alur onboarding tidak 404.
 */
export function ComingSoon({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-lime/15 text-lime">
        <Construction className="size-7" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {note && (
        <p className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
          {note}
        </p>
      )}
      <Button asChild variant="outline" className="mt-8">
        <Link href="/dashboard">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
