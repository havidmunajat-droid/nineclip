import { cn } from "@/lib/utils";
import { Captions, Flame } from "lucide-react";

/**
 * A 9:16 vertical clip mockup — talking-head gradient, karaoke caption,
 * and a virality badge. Pure presentational, used on the landing page.
 */
export function PhoneClip({
  hue = 84,
  score = 92,
  caption = "ini momen yang bikin",
  highlight = "VIRAL",
  label = "0:00 / 0:42",
  className,
}: {
  hue?: number;
  score?: number;
  caption?: string;
  highlight?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-card shadow-panel",
        className
      )}
    >
      {/* "video" backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 20%, hsl(${hue} 70% 30%) 0%, hsl(${hue} 60% 12%) 45%, #0a0a0a 100%)`,
        }}
      />
      {/* subject silhouette */}
      <div
        className="absolute left-1/2 top-[26%] h-28 w-28 -translate-x-1/2 rounded-full blur-xl"
        style={{ background: `hsl(${hue} 80% 55% / 0.35)` }}
      />
      <div
        className="absolute left-1/2 top-[30%] h-20 w-20 -translate-x-1/2 rounded-full"
        style={{ background: `hsl(${hue} 60% 22%)` }}
      />
      {/* virality badge */}
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-lime/30 bg-black/50 px-2.5 py-1 text-xs font-bold text-lime backdrop-blur">
        <Flame className="size-3.5" />
        {score}
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
        <Captions className="size-3" /> 9:16
      </div>

      {/* karaoke caption */}
      <div className="absolute inset-x-0 bottom-16 px-4 text-center">
        <p className="font-display text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {caption}{" "}
          <span className="rounded-md bg-lime px-1.5 text-[hsl(80_60%_6%)]">
            {highlight}
          </span>
        </p>
      </div>

      {/* scrubber */}
      <div className="absolute inset-x-3 bottom-7">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/3 rounded-full bg-lime" />
        </div>
        <div className="mt-1.5 text-[10px] font-medium text-white/70">{label}</div>
      </div>
    </div>
  );
}
