import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext"; // 👈 Zkontroluj, jestli sedí tečky podle tvých složek! (Případně dej "../../context/AppContext" nebo "@/context/AppContext")

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Junk to Fit",
  description: "Proměň neřest ve zdravý recept.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        {/* 🚀 TADY SE NASTARTOVÁVÁ MOZEK PRO CELOU APLIKACI */}
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}