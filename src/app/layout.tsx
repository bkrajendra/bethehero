import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { OneSignalInit } from "@/lib/onesignal/init";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "BeTheHero — Blood Donation Drive, 17 June 2026",
  description: "Join the Confluxsys Blood Donation Drive on 17 June 2026. Register to donate blood and save lives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-48x48.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/icons/icon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#c8102e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-sans antialiased bg-white text-[#222222]">
        <OneSignalInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
