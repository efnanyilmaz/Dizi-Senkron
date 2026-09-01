import type { Metadata } from "next";
import { Bebas_Neue, Manrope, IBM_Plex_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
});

const description =
  "Arkadaş gruplarıyla bir diziyi birlikte takip et, ilerlemeni paylaş, spoiler almadan sohbet et.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dizi Senkron",
    template: "%s · Dizi Senkron",
  },
  description,
  keywords: [
    "dizi izleme grubu",
    "spoilersız sohbet",
    "birlikte dizi izleme",
    "bölüm takibi",
    "Türk dizileri",
  ],
  openGraph: {
    title: "Dizi Senkron",
    description,
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dizi Senkron",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${bebasNeue.variable} ${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
