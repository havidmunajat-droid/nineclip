import { Download, Flame, Pencil } from "lucide-react";
import type { Clip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 85) return "text-lime";
  if (score >= 70) return "text-emerald-400";
  return "text-amber-400";
}

export function ClipCard({ clip, rank }: { clip: Clip; rank?: number }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-lime/40">
      {/* 9:16 preview */}
      <div
        className="relative aspect-[9/16] w-full"
        style={{
          background: `radial-gradient(120% 80% at 50% 20%, hsl(${clip.hue} 65% 28%) 0%, hsl(${clip.hue} 55% 12%) 50%, #0a0a0a 100%)`,
        }}
      >
        {typeof rank === "number" && (
          <div className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white backdrop-blur">
            {rank}
          </div>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-xs font-bold backdrop-blur">
          <Flame className={cn("size-3.5", scoreTone(clip.viralityScore))} />
          <span className={scoreTone(clip.viralityScore)}>{clip.viralityScore}</span>
        </div>

        {/* caption preview */}
        <div className="absolute inset-x-0 bottom-10 px-3 text-center">
          <p className="font-display text-sm font-extrabold leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {clip.title.replace(/[“”"]/g, "")}
          </p>
        </div>
        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur">
          {formatDuration(clip.end - clip.start)} · {clip.aspectRatio}
        </div>

        {/* hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" className="gap-1.5">
            <Download className="size-4" /> Unduh
          </Button>
        </div>
      </div>

      {/* meta */}
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-xs text-muted-foreground">{clip.viralityReason}</p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {clip.hashtags.slice(0, 3).map((h) => (
            <span
              key={h}
              className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1 gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button size="sm" className="flex-1 gap-1.5">
            <Download className="size-3.5" /> Unduh
          </Button>
        </div>
      </div>
    </div>
  );
}
