import './globals.css';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const font = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Circles Feed',
  description: 'Tiny private groups for sharing posts, comments, and emoji reactions.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-foreground', font.className)}>
        <div className="border-b bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                ✨
              </div>
              <div>
                <p className="text-lg font-semibold">Circle Feed</p>
                <p className="text-xs text-muted-foreground">Private posts with friends & family</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer">
                shadcn/ui
              </a>
            </Button>
          </div>
        </div>
        <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
          {children}
        </main>
      </body>
    </html>
  );
}
