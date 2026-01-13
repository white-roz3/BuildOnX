import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Typography for COSMO aesthetic
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://BuildOnX.app"),
  title: "BuildOnX - Tweet to Deploy",
  description: "Describe what you want in a tweet. Get a deployed app in seconds.",
  openGraph: {
    title: "BuildOnX - Tweet to Deploy",
    description: "Describe what you want in a tweet. Get a deployed app in seconds.",
    url: "https://BuildOnX.app",
    siteName: "BuildOnX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@BuildAppsOnX",
    title: "BuildOnX - Tweet to Deploy",
    description: "Describe what you want in a tweet. Get a deployed app in seconds.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-mars-950 text-mars-100 antialiased">
        {/* Warm grid background */}
        <div className="fixed inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-100 pointer-events-none" />
        
        {/* Warm radial gradient at top */}
        <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />
        
        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
