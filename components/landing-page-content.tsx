"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Map, Globe2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import hero from "@/public/hero.png";

export function LandingPageContent({
  user,
}: {
  user: { email: string } | null;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) {
      router.push(`/g/${slug.trim()}`);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-4 sm:p-8">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-8 text-center">
        <div className="relative">
          <div className="absolute -inset-1 animate-pulse rounded-full " />
          <Image
            src={hero}
            alt="Trippi Logo"
            className="relative size-60 -scale-x-100"
            priority
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Trippi
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">
            The simplest way to log your travels and share it with your inner
            circle.
          </p>
        </div>

        <div className="w-full space-y-4">
          <form onSubmit={handleJoin} className="group relative">
            <div className="relative flex items-center">
              <Input
                placeholder="Enter a group code..."
                className="h-12 rounded-full border-slate-200 bg-white px-6 pr-12 shadow-sm transition-all focus-visible:border-slate-400 focus-visible:ring-0 group-hover:shadow-md"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                autoFocus
              />
              <Button
                size="icon"
                type="submit"
                disabled={!slug.trim()}
                className="absolute right-1 top-1 h-10 w-10 rounded-full transition-transform active:scale-95"
              >
                <ArrowRight className="h-5 w-5" />
                <span className="sr-only">Go</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              e.g.{" "}
              <span className="font-medium text-slate-600">iceland-2025</span>{" "}
              or{" "}
              <span className="font-medium text-slate-600">trippiest-trip</span>
            </p>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="mx-4 flex-shrink-0 text-xs text-slate-400">
              OR
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {user ? (
            <div className="grid gap-2">
              <Button
                asChild
                variant="outline"
                className="w-full h-12 rounded-full border-slate-200 bg-white/50 text-base font-medium text-slate-700 hover:bg-white hover:text-slate-900"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <div className="flex justify-center">
                <CreateGroupDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Start a new trip
                    </Button>
                  }
                />
              </div>
            </div>
          ) : (
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-full border-slate-200 bg-white/50 text-base font-medium text-slate-700 hover:bg-white hover:text-slate-900"
            >
              <Link href="/register">
                <Plus className="mr-2 h-4 w-4" />
                Start a new trip
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-8 pt-8 text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <span className="text-xs font-medium">Private</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Map className="h-6 w-6" />
            <span className="text-xs font-medium">Simple</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe2 className="h-6 w-6" />
            <span className="text-xs font-medium">Shared</span>
          </div>
        </div>
      </div>
    </main>
  );
}
