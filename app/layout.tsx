import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
// Editorial serif for display headings (replaces the brutalist Anton poster face).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-custom", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PescaPlus · Tienda de Afiliados de Pesca con IA",
    template: "%s · PescaPlus",
  },
  description:
    "Descubre cañas, carretes y aparejos de pesca seleccionados de AliExpress, con fichas optimizadas por IA y un asistente experto para cada modalidad.",
  applicationName: "PescaPlus",
  keywords: ["pesca", "aparejos", "spinning", "carpfishing", "surfcasting", "señuelos", "carretes", "cañas de pescar"],
  authors: [{ name: "PescaPlus" }],
  openGraph: {
    type: "website",
    siteName: "PescaPlus",
    locale: "es_ES",
    url: siteUrl,
    title: "PescaPlus · Tienda de Afiliados de Pesca con IA",
    description: "Aparejos de pesca seleccionados con IA y asistente experto por modalidad.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PescaPlus · Tienda de Afiliados de Pesca con IA",
    description: "Aparejos de pesca seleccionados con IA y asistente experto por modalidad.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#111111",
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
        "Tienda de afiliados de pesca con fichas optimizadas por IA y asistente experto por modalidad.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "PescaPlus",
      inLanguage: "es-ES",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${grotesk.variable} ${fraunces.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
