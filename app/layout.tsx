import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PescaPlus - Tienda de Afiliados de Pesca",
  description: "Encuentra los mejores productos de pesca en AliExpress con consejos de expertos y asistente IA",
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
