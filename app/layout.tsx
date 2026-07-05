import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PescaPlus · Tienda de Afiliados de Pesca con IA",
    template: "%s · PescaPlus",
  },
  description:
    "Descubre cañas, carretes y aparejos de pesca seleccionados de AliExpress, con fichas optimizadas por IA y un asistente experto para cada modalidad.",
  keywords: ["pesca", "aparejos", "spinning", "carpfishing", "surfcasting", "señuelos", "carretes", "cañas de pescar"],
  openGraph: {
    type: "website",
    siteName: "PescaPlus",
    locale: "es_ES",
    title: "PescaPlus · Tienda de Afiliados de Pesca con IA",
    description: "Aparejos de pesca seleccionados con IA y asistente experto por modalidad.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
