import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "nineClip — Ubah video panjang jadi klip viral dengan AI",
    template: "%s · nineClip",
  },
  description:
    "Tempel link YouTube, biarkan AI menemukan momen paling engaging, dan dapatkan klip pendek 9:16 siap posting ke TikTok, Reels, dan Shorts.",
  keywords: ["AI video clipping", "klip viral", "shorts", "reels", "tiktok", "repurpose video"],
  metadataBase: new URL("https://nineclip.id"),
};

export const viewport: Viewport = {
  themeColor: "#070707",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
