import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Analitica from "@/components/Analitica";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CapacitorBridge from "@/components/CapacitorBridge";
import "./globals.css";
import { safeJsonLd } from '@/lib/json-ld'
import { MARCA } from '@/lib/marca'

/*
 * Tres familias, servidas desde el propio dominio (next/font, sin peticiones a
 * Google):
 *  - Bricolage Grotesque, solo para titulares (.font-display), con el eje de
 *    anchura para estrecharla un poco: recuerda a la rotulación náutica.
 *  - Instrument Sans para el texto.
 *  - IBM Plex Mono para cifras y etiquetas: profundidades, horas, precios.
 * `display: swap` y la fuente de reserva ajustada que calcula next/font: el
 * texto se ve desde el primer momento y el cambio de fuente no mueve nada.
 */
const titular = Bricolage_Grotesque({ subsets: ["latin"], axes: ["wdth"], variable: "--font-titular", display: "swap" });
const texto = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const datos = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-datos", display: "swap" });

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
  themeColor: MARCA.fondo,
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
    <html lang="es" className={`${titular.variable} ${texto.variable} ${datos.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
        {children}
        <ServiceWorkerRegister />
        <CapacitorBridge />
        {/*
          * Suspense obligatorio: Analitica lee `useSearchParams`, y sin un límite
          * de suspense eso obliga a Next a renderizar en el servidor CADA página
          * bajo demanda — se perderían todas las páginas estáticas del sitio.
          */}
        <Suspense fallback={null}>
          <Analitica />
        </Suspense>
      </body>
    </html>
  );
}
