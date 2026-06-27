import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Crop,
  Download,
  Flame,
  Hash,
  Link2,
  Scissors,
  Sparkles,
  Wand2,
  Youtube,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Pricing } from "@/components/marketing/pricing";
import { RoleChooser } from "@/components/marketing/role-chooser";
import { PhoneClip } from "@/components/shared/phone-clip";
import { ViralityChart } from "@/components/shared/virality-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { engagementCurve, projects } from "@/lib/mock";
import { fetchPublicPlans } from "@/lib/server-api";

const steps = [
  {
    icon: Link2,
    title: "Tempel link",
    desc: "Masukkan link YouTube atau upload video panjangmu. Podcast, webinar, interview — apa saja.",
  },
  {
    icon: Wand2,
    title: "AI menganalisis",
    desc: "AI mentranskrip, membaca kurva engagement, dan menemukan momen dengan potensi viral tertinggi.",
  },
  {
    icon: Download,
    title: "Unduh & posting",
    desc: "Dapatkan klip 9:16 dengan caption otomatis, siap upload ke TikTok, Reels, dan Shorts.",
  },
];

const features = [
  {
    icon: Flame,
    title: "Skor viralitas",
    desc: "Setiap klip diberi skor 0–100 lengkap dengan alasan kenapa momen itu berpotensi viral.",
  },
  {
    icon: Scissors,
    title: "Auto-clipping cerdas",
    desc: "AI memotong tepat di momen paling engaging, bukan asal potong per durasi.",
  },
  {
    icon: Crop,
    title: "Auto-reframe 9:16",
    desc: "Deteksi & track wajah otomatis agar subjek selalu di tengah frame vertikal.",
  },
  {
    icon: Captions,
    title: "Caption otomatis",
    desc: "Subtitle gaya highlight kata yang terbukti menaikkan retensi tontonan.",
  },
  {
    icon: Hash,
    title: "Judul & hashtag",
    desc: "AI menuliskan judul nge-hook dan hashtag relevan, siap salin-tempel.",
  },
  {
    icon: Zap,
    title: "Proses kilat",
    desc: "Video satu jam jadi belasan klip dalam hitungan menit, bukan jam.",
  },
];

const faqs = [
  {
    q: "Dari mana sumber videonya?",
    a: "Cukup tempel link YouTube, atau upload file video langsung. nineClip mendukung video panjang seperti podcast, webinar, dan interview.",
  },
  {
    q: "Apa itu skor viralitas?",
    a: "AI membaca transkrip dan pola engagement untuk menilai seberapa besar potensi sebuah momen menarik perhatian. Skor 0–100 membantumu memilih klip terbaik lebih dulu.",
  },
  {
    q: "Apakah hasilnya bisa diedit?",
    a: "Bisa. Kamu bisa mengubah caption, menyesuaikan framing, dan memilih klip mana yang ingin diunduh sebelum diposting.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "Kami mendukung pembayaran lokal Indonesia lewat Midtrans: QRIS, Virtual Account bank, kartu, dan e-wallet seperti GoPay, OVO, dan Dana.",
  },
  {
    q: "Apakah ada paket gratis?",
    a: "Ada. Paket Free memberi 30 menit upload per bulan supaya kamu bisa mencoba sebelum berlangganan.",
  },
];

export default async function LandingPage() {
  const [curve, plans] = await Promise.all([
    Promise.resolve(engagementCurve(projects[0]!, 48)),
    fetchPublicPlans(),
  ]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-radial-lime" />
        <div className="absolute inset-0 bg-grid-faint [background-size:56px_56px] opacity-40 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      </div>

      {/* HERO */}
      <section className="container grid items-center gap-12 pt-32 pb-20 lg:grid-cols-2 lg:pt-40">
        <div>
          <Badge className="mb-5 gap-1.5 border border-lime/30 bg-lime/10 px-3 py-1.5">
            <Sparkles className="size-3.5" /> AI video clipping untuk kreator
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Ubah video panjang jadi{" "}
            <span className="text-gradient-lime">klip viral</span> dalam menit.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Tempel link YouTube, biarkan AI menemukan momen paling engaging, lalu
            dapatkan klip pendek 9:16 dengan caption otomatis — siap posting ke
            TikTok, Reels, dan Shorts.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="#mulai">
                Mulai gratis <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#cara-kerja">Lihat cara kerja</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Youtube className="size-4 text-lime" />
            Tanpa kartu kredit · 30 menit gratis · Pembayaran lokal via Midtrans
          </div>
        </div>

        {/* hero visual */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-lime/10 blur-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <PhoneClip
              hue={84}
              score={94}
              caption="rahasia closing yang"
              highlight="JARANG"
              className="translate-y-6"
            />
            <PhoneClip
              hue={150}
              score={88}
              caption="ini alasan startup"
              highlight="GAGAL"
              label="0:00 / 0:38"
            />
          </div>
          <div className="absolute -bottom-8 left-1/2 w-[88%] -translate-x-1/2 rounded-xl border border-white/10 bg-card/90 p-3 shadow-panel backdrop-blur">
            <div className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
              <Flame className="size-3.5 text-lime" /> Kurva viralitas terdeteksi
            </div>
            <ViralityChart data={curve} height={70} showAxes={false} />
          </div>
        </div>
      </section>

      {/* ROLE CHOOSER — intent-based onboarding */}
      <RoleChooser />

      {/* TRUST BAR */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="container grid grid-cols-2 gap-6 py-8 text-center md:grid-cols-4">
          {[
            ["10x", "lebih cepat dari edit manual"],
            ["9:16", "rasio siap untuk semua platform"],
            ["< 5 mnt", "video 1 jam jadi belasan klip"],
            ["100%", "otomatis dari link ke klip"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-extrabold text-lime">{n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="container py-24">
        <SectionHead
          eyebrow="Cara kerja"
          title="Dari link ke klip viral, tiga langkah."
          desc="Tidak perlu skill editing. nineClip menangani bagian yang membosankan."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-7 card-hover">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-lime/15 text-lime">
                <s.icon className="size-6" />
              </div>
              <div className="absolute right-6 top-6 font-display text-5xl font-black text-white/5">
                {i + 1}
              </div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="container py-24">
        <SectionHead
          eyebrow="Fitur"
          title="Semua yang kamu butuh untuk konten pendek."
          desc="Dibangun untuk kreator, agensi, dan tim konten yang ingin produksi cepat tanpa kompromi kualitas."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-lime/15 text-lime">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VIRALITY SHOWCASE */}
      <section className="container py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 rounded-2xl border border-border bg-card p-6 shadow-panel lg:order-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Flame className="size-4 text-lime" /> Timeline engagement
              </div>
              <Badge variant="muted">Podcast Bisnis #42</Badge>
            </div>
            <ViralityChart data={engagementCurve(projects[0]!, 60)} height={240} />
            <p className="mt-4 text-sm text-muted-foreground">
              Setiap puncak adalah kandidat klip. AI memilih momen tertinggi dan
              memotongnya otomatis.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHead
              align="left"
              eyebrow="Skor viralitas"
              title="Tahu klip mana yang akan perform — sebelum diposting."
              desc="nineClip membaca seluruh video dan memetakan momen paling engaging dalam sebuah kurva. Tidak lagi menebak; kamu langsung tahu bagian mana yang layak jadi konten."
            />
            <ul className="mt-6 space-y-3">
              {[
                "Analisis transkrip penuh + pola retensi",
                "Skor 0–100 dengan alasan yang bisa dibaca",
                "Klip terbaik diurutkan otomatis ke paling atas",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <span className="flex size-5 items-center justify-center rounded-full bg-lime/20 text-lime">
                    <Flame className="size-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="harga" className="container py-24">
        <SectionHead
          eyebrow="Harga"
          title="Mulai gratis, upgrade saat butuh lebih."
          desc="Bayar mudah dengan QRIS, Virtual Account, dan e-wallet lewat Midtrans."
        />
        <div className="mt-12">
          <Pricing plans={plans} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-24">
        <SectionHead eyebrow="FAQ" title="Pertanyaan yang sering ditanya." />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-white/10 rounded-2xl border border-border bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                {f.q}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-lime/30 bg-gradient-to-br from-lime/[0.12] to-transparent p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-radial-lime opacity-60" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Video panjangmu sudah penuh momen viral. Saatnya dipotong.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Coba nineClip gratis hari ini — 30 menit upload, tanpa kartu kredit.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/register">
                Mulai sekarang <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-lime">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {desc && <p className="mt-4 text-muted-foreground">{desc}</p>}
    </div>
  );
}
