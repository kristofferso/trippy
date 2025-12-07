"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { addReaction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { applyOptimisticReaction, setNameDialogOpen, useUIState } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EmojiRain } from "@/components/emoji-rain";

const ALL_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "👏", "🎉", "🔥", "💯", "👀",
  "🤝", "🙏", "💪", "🧠", "🚀", "🤔", "🤷", "🤡", "💩", "👻", "💀", "👽",
];

type Props = {
  postId: string;
  counts: Record<string, number>;
};

export function ReactionBar({ postId, counts }: Props) {
  const router = useRouter();
  const optimistic = useUIState(
    (state) => state.optimisticReactions[postId] ?? {}
  );
  
  const mergedCounts = useMemo(() => {
    const merged: Record<string, number> = { ...counts };
    for (const [emoji, value] of Object.entries(optimistic)) {
      merged[emoji] = (merged[emoji] ?? 0) + value;
    }
    return merged;
  }, [counts, optimistic]);

  const activeReactions = useMemo(() => {
    return Object.entries(mergedCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [mergedCounts]);

  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    setMessage(null);
    setPopoverOpen(false);

    setActiveEmoji(null);
    setTimeout(() => setActiveEmoji(emoji), 10);

    applyOptimisticReaction(postId, emoji);
    startTransition(async () => {
      const result = await addReaction(postId, emoji);
      if (result?.needsProfile) {
        setNameDialogOpen(true, { type: "reaction", postId, emoji });
        return;
      }
      if (result?.error) {
        setMessage(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="relative">
      <EmojiRain emoji={activeEmoji} />
      
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {activeReactions.map(([emoji, count]) => (
            <Button
              key={emoji}
              type="button"
              size="sm"
              variant="secondary"
              className={cn(
                "group relative h-8 gap-1.5 rounded-full px-3 text-sm font-normal ring-1 ring-slate-200 transition-all hover:ring-slate-300",
                "bg-white hover:bg-slate-50",
                pending && "opacity-70"
              )}
              onClick={() => handleReact(emoji)}
              disabled={pending}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-xs text-slate-600 font-medium">
                {count}
              </span>
            </Button>
          ))}

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-full p-0 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 border-0"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add reaction</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-2 sm:w-[340px]" align="start">
              <div className="grid grid-cols-8 gap-1">
                {ALL_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 text-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onClick={() => handleReact(emoji)}
                    disabled={pending}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {message ? (
          <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
