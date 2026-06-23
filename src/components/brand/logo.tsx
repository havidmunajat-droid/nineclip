import { cn } from "@/lib/utils";

/** The nineClip play-mark — a lime play glyph with motion lines, echoing the logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-9 w-9", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ncMark" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(76 98% 55%)" />
          <stop offset="1" stopColor="hsl(74 80% 42%)" />
        </linearGradient>
      </defs>
      {/* motion lines */}
      <rect x="2" y="20" width="11" height="3" rx="1.5" fill="url(#ncMark)" opacity="0.5" />
      <rect x="4" y="26" width="8" height="3" rx="1.5" fill="url(#ncMark)" opacity="0.35" />
      {/* play glyph in a squircle */}
      <rect x="14" y="6" width="32" height="36" rx="11" fill="url(#ncMark)" />
      <path d="M27 17.5L37 24L27 30.5V17.5Z" fill="hsl(80 60% 6%)" />
    </svg>
  );
}

export function Logo({
  className,
  showTagline = false,
  size = "md",
}: {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={markSize} />
      <div className="flex flex-col leading-none">
        <span className={cn("font-display font-bold tracking-tight", textSize)}>
          <span className="text-foreground">nine</span>
          <span className="text-lime">Clip</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            Web Clip Video
          </span>
        )}
      </div>
    </div>
  );
}
