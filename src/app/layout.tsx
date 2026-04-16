import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScrumCollab | Ultra-Fast Agile Tools for Elite Squads",
  description: "Eliminate friction in your Sprint Planning and Retrospectives. No signups, no seat limits. Just pure collaborative engineering for agile teams.",
  keywords: ["scrum", "agile", "planning poker", "retrospective", "team collaboration", "free agile tools"],
  openGraph: {
    title: "ScrumCollab | Ultra-Fast Agile Tools",
    description: "Real-time Planning Poker and Retrospectives for agile teams.",
    type: "website",
    url: "https://scrumcollab.io", // Placeholder
    siteName: "ScrumCollab",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScrumCollab | Ultra-Fast Agile Tools",
    description: "Eliminate friction in your Sprint Planning and Retrospectives.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>

    </html>
  );
}
