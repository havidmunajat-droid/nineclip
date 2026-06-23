import Link from "next/link";
import { Flame, Sparkles, Wand2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* brand side */}
      <div className="relative hidden overflow-hidden border-l border-white/10 bg-card lg:block">
        <div className="absolute inset-0 bg-radial-lime opacity-80" />
        <div className="absolute inset-0 bg-grid-faint [background-size:48px_48px] opacity-30" />
        <div className="relative flex h-full flex-col justify-center p-14">
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
            Dari satu video panjang,
            <br />
            <span className="text-gradient-lime">belasan klip viral.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            nineClip menganalisis seluruh video, menemukan momen paling engaging, dan
            memotongnya jadi konten pendek siap posting.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Wand2, t: "AI auto-clipping dari link YouTube" },
              { icon: Flame, t: "Skor viralitas tiap klip" },
              { icon: Sparkles, t: "Caption & hashtag otomatis" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-lime/15 text-lime">
                  <f.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{f.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
