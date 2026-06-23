import { Download, Flame, Sparkles } from "lucide-react";
import type { Clip, EngagementPoint, Project } from "@/lib/types";
import { ClipCard } from "@/components/app/clip-card";
import { ViralityChart } from "@/components/shared/virality-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** The "ready" result for a project: engagement timeline + ranked clips grid. */
export function ClipsResult({
  project,
  clips,
  curve,
}: {
  project: Project;
  clips: Clip[];
  curve: EngagementPoint[];
}) {
  const top = clips[0];
  return (
    <div className="mt-6 space-y-6">
      {/* engagement timeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4 text-lime" /> Timeline engagement
          </div>
          {top && (
            <Badge variant="default" className="gap-1">
              <Sparkles className="size-3" /> Klip terbaik: skor {top.viralityScore}
            </Badge>
          )}
        </div>
        <ViralityChart data={curve} height={220} />
        <p className="mt-3 text-xs text-muted-foreground">
          Setiap puncak adalah kandidat klip. AI memilih {clips.length} momen terbaik dan
          mengurutkannya berdasarkan potensi viral.
        </p>
      </div>

      {/* clips */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          {clips.length} klip ditemukan
        </h2>
        <Button variant="secondary" size="sm">
          <Download className="size-4" /> Unduh semua
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {clips.map((clip, i) => (
          <ClipCard key={clip.id} clip={clip} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
