"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Share, SquarePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "trippi-ios-a2hs-dismissedx";

export function IosPwaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isStandalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as any).standalone;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";

    if (isIOS && isSafari && !isStandalone && !dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-md flex-col gap-3 rounded-2xl bg-white/95 p-4 text-slate-900 shadow-2xl ring-1 ring-slate-200 backdrop-blur",
          "border border-white/60"
        )}
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 12px)` }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">
              Add this trip to your home screen to Home Screen
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-11 w-11 rounded-full active:scale-95"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        <ol className="list-decimal list-inside space-y-1 pl-0 text-xs text-slate-700">
          <li className="flex items-start gap-2">
            <MoreHorizontal
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-700"
              aria-hidden="true"
            />
            <span>Tap the menu (ellipsis) in Safari.</span>
          </li>
          <li className="flex items-start gap-2">
            <Share
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-700"
              aria-hidden="true"
            />
            <span>Tap Share.</span>
          </li>
          <li className="flex items-start gap-2">
            <SquarePlus
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-700"
              aria-hidden="true"
            />
            <span>Select “Add to Home Screen”, then confirm.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
