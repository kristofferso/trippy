import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trippy",
  description:
    "Trippy is a platform for sharing your travel experiences with your friends and family.",
  icons: {
    icon: "/trippi.png",
    apple: "/trippi.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <div className="safe-area-wrapper">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
