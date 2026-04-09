import type { Metadata } from "next";
import { Nunito, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Decoder Academy",
  description: "A safe AI-powered learning playground for curious minds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
        <body className="font-body bg-slate-50 text-slate-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
