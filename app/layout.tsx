import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";
import { safeJsonLd } from '@/lib/json-ld'

// One text face for body AND headings: the condensed display face (Oswald) was
// what made every page read like a sports poster, so it's gone — one less font
// to download, too.
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-custom", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pescaplus.es";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PescaPlus · Tienda especializada de pesca",
    template: "%s · PescaPlus",
  },
  description:
    "Cañas, carretes, señuelos y aparejos de pesca seleccionados por expertos, con fichas detalladas y un asesor para cada modalidad. Calidad al mejor precio.",
  applicationName: "PescaPlus",
  keywords: ["pesca", "aparejos", "spinning", "carpfishing", "surfcasting", "señuelos", "carretes", "cañas de pescar"],
  authors: [{ name: "PescaPlus" }],
  openGraph: {
    type: "website",
    siteName: "PescaPlus",
    locale: "es_ES",
    url: siteUrl,
    title: "PescaPlus · Tienda especializada de pesca",
    description: "Aparejos de pesca seleccionados por expertos, con asesor por modalidad.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PescaPlus · Tienda especializada de pesca",
    description: "Aparejos de pesca seleccionados por expertos, con asesor por modalidad.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f1417",
  colorScheme: "light",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "PescaPlus",
      url: siteUrl,
      description:
        "Tienda especializada de pesca con fichas detalladas y un asesor experto por modalidad.",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon`,
      },
      image: `${siteUrl}/opengraph-image`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "PescaPlus",
      inLanguage: "es-ES",
      publisher: { "@id": `${siteUrl}/#organization` },
      // Enables Google's sitelinks search box.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${grotesk.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
