import type { Metadata } from "next";
import { Nunito, Pixelify_Sans, Press_Start_2P } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
});

const DESCRICAO =
  "Catálogo anual dos jogos criados pelos estudantes de Programação de Jogos Digitais do CEEP Hércules Maymone, em Campo Grande, MS.";

// Na Vercel, o endereço do site entra sozinho como base das imagens de compartilhamento.
export const metadata: Metadata = {
  title: { default: "Catálogo dos Jogos", template: "%s • Catálogo dos Jogos" },
  description: DESCRICAO,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Catálogo dos Jogos • CEEP Hércules Maymone",
    description: DESCRICAO,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${pressStart.variable} ${pixelify.variable} ${nunito.variable}`}>
      <body className="bg-ceu">{children}</body>
    </html>
  );
}
