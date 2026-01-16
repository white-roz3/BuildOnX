import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyClaude - Build apps with a tweet",
  description: "Tweet to deploy. Just @ us with your app idea and we'll build it.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "HeyClaude",
    description: "Build apps with a tweet. Just @ us.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HeyClaude",
    description: "Build apps with a tweet. Just @ us.",
    creator: "@buildheyclaude",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
