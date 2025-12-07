import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { cn } from "@/lib/utils";
import trippy from "./../public/trippy.png";
import Image from "next/image";

const font = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trippy",
  description:
    "Trippy is a platform for sharing your travel experiences with your friends and family.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-slate-50", font.className)}>
        <div className="border-b bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <Image src={trippy} alt="" className="size-10" />
              <p className="text-lg font-semibold">Trippy</p>
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-5xl space-y-8">{children}</main>
      </body>
    </html>
  );
}
