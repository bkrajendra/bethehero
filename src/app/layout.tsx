import type { Metadata } from "next";
import { Bebas_Neue, Cormorant_Garamond, Syne, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/Providers";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const cormorant = Cormorant_Garamond({
  weight: ["300", "400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const syne = Syne({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Blood Donation Drive — 17 June 2026 | Confluxsys & Janakalyan Rakta Pedhi",
  description:
    "Join us on 17 June 2026 for a blood donation drive organised by Confluxsys Pvt Ltd and Janakalyan Rakta Pedhi, Pune. Register today and save lives.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "overflow-hidden", bebasNeue.variable, cormorant.variable, syne.variable, "font-sans", geist.variable)}
    >
      <body className="h-full overflow-hidden"><Providers>{children}</Providers></body>
    </html>
  );
}
