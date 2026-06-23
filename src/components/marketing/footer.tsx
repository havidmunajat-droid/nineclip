import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const cols: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Produk",
    items: [
      { label: "Fitur", href: "#fitur" },
      { label: "Harga", href: "#harga" },
      { label: "Cara kerja", href: "#cara-kerja" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Perusahaan",
    items: [
      { label: "Tentang", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Karier", href: "#" },
      { label: "Kontak", href: "#" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Syarat Layanan", href: "#" },
      { label: "Kebijakan Privasi", href: "#" },
      { label: "Refund", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo showTagline />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Ubah video panjang jadi klip pendek viral dengan AI. Cepat, otomatis,
              siap posting.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((i) => (
                  <li key={i.label}>
                    <Link
                      href={i.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-lime"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} nineClip. Semua hak dilindungi.</p>
          <p>Dibuat di Indonesia 🇮🇩</p>
        </div>
      </div>
    </footer>
  );
}
