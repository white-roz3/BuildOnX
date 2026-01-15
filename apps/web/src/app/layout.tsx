import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyClaude - Build apps with a tweet",
  description: "Tweet to deploy. Just @ us.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

