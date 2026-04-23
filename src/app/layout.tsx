import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commission Tracker",
  description: "Track sales commissions, billing cycles, and payouts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
