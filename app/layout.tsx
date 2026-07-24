import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./theme.css";

/* Arc Trips "Full system" typography: Inter carries all headings + body.
   Satoshi (loaded via Fontshare in globals.css) is used ONLY for the
   ARCTRIPS wordmark, matching the Figma spec. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arc Trips: Find your perfect stay",
  description:
    "Browse verified stays and destinations across Canada with Arc Trips. Better trips, no guesswork.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
