import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Pricing } from "@/components/marketing/pricing";
import { fetchPublicPlans } from "@/lib/server-api";

export const metadata = { title: "Harga" };

export default async function PricingPage() {
  const plans = await fetchPublicPlans();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-radial-lime" />
      </div>
      <section className="container pt-36 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-lime">
            Harga
          </span>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Pilih paket yang pas untukmu.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Mulai gratis, upgrade kapan saja. Bayar mudah dengan QRIS, Virtual Account,
            dan e-wallet lewat Midtrans.
          </p>
        </div>
        <div className="mt-14">
          <Pricing plans={plans} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
