import Link from "next/link";
import { ArrowRight, Megaphone, Scissors } from "lucide-react";

/**
 * Dua jalur masuk terpisah (intent-based onboarding) + link Tool Mode lama.
 * Mengarah ke /register?intent=brand | clipper | tool.
 */
export function RoleChooser() {
  return (
    <section id="mulai" className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Mulai dari mana?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Satu akun, dua peran. Pilih jalurmu — bisa tambah peran lain nanti
          lewat Pengaturan.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
        {/* BRAND */}
        <Link
          href="/register?intent=brand"
          className="group relative flex flex-col rounded-2xl border border-border bg-card p-7 card-hover"
        >
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-lime/15 text-lime">
            <Megaphone className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold">
            Saya ingin video saya disebarkan ke ratusan creator
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Buat campaign, AI memilihkan clipper yang cocok, dan videomu
            didistribusikan ke TikTok, Reels, dan Shorts.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
            Untuk Brand
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        {/* CLIPPER */}
        <Link
          href="/register?intent=clipper"
          className="group relative flex flex-col rounded-2xl border border-border bg-card p-7 card-hover"
        >
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-lime/15 text-lime">
            <Scissors className="size-6" />
          </div>
          <h3 className="font-display text-xl font-bold">
            Saya ingin bergabung sebagai Creator & dapat penghasilan
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Isi profil DNA-mu, terima undangan campaign yang sesuai niche, lalu
            raih reward dari setiap klip yang perform.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
            Untuk Clipper
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Atau{" "}
        <Link
          href="/register?intent=tool"
          className="font-medium text-lime hover:underline"
        >
          potong video saya sendiri
        </Link>{" "}
        — Tool Mode lama, tetap ada.
      </div>
    </section>
  );
}
