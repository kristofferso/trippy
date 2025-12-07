'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { addReaction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { applyOptimisticReaction, setNameDialogOpen, useUIState } from '@/lib/store';

const EMOJIS = ['❤️', '😂', '😮', '👏', '😢'];

type Props = {
  postId: string;
  counts: Record<string, number>;
};

export function ReactionBar({ postId, counts }: Props) {
  const router = useRouter();
  const optimistic = useUIState((state) => state.optimisticReactions[postId] ?? {});
  const mergedCounts = useMemo(() => {
    const merged: Record<string, number> = { ...counts };
    for (const [emoji, value] of Object.entries(optimistic)) {
      merged[emoji] = (merged[emoji] ?? 0) + value;
    }
    return merged;
  }, [counts, optimistic]);

  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleReact = (emoji: string) => {
    setMessage(null);
    applyOptimisticReaction(postId, emoji);
    startTransition(async () => {
      const result = await addReaction(postId, emoji);
      if (result?.needsProfile) {
        setNameDialogOpen(true, { type: 'reaction', postId, emoji });
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
    <div className="rounded-md border bg-white/70 p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-wrap items-center gap-3">
        {EMOJIS.map((emoji) => (
          <Button
            key={emoji}
            type="button"
            size="sm"
            variant="outline"
            className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:scale-105"
            onClick={() => handleReact(emoji)}
            disabled={pending}
          >
            <span className="text-lg">{emoji}</span>
            <span className="ml-2 text-xs text-muted-foreground">{mergedCounts[emoji] ?? 0}</span>
            <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-2xl opacity-0 transition duration-300 group-hover:opacity-100">
              {emoji}
            </span>
          </Button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground">
          Tap an emoji to react
        </div>
      </div>
      {message ? <p className="pt-2 text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
