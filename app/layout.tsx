import type { Metadata, Viewport } from "next";
import { Oswald, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
// Condensed outdoor/sport display face for headings (fits the fishing-gear theme).
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-custom", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
        "Tienda especializada de pesca con fichas detalladas y un asesor experto por modalidad.",
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
    <html lang="es" className={`${grotesk.variable} ${oswald.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
