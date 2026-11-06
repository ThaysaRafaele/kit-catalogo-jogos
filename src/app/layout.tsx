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

export const metadata: Metadata = {
  title: { default: "Catálogo dos Jogos", template: "%s • Catálogo dos Jogos" },
  description:
    "Catálogo anual dos jogos criados pelos estudantes de Programação de Jogos Digitais do CEEP Hércules Maymone, em Campo Grande, MS.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${pressStart.variable} ${pixelify.variable} ${nunito.variable}`}>
      <body className="bg-ceu">{children}</body>
    </html>
  );
}
