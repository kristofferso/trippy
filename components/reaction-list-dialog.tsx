"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState, useMemo } from "react";
import { getReactionDetails } from "@/app/actions";
import { Loader2 } from "lucide-react";

type Reactor = {
  id: string;
  displayName: string;
  createdAt: Date;
  emoji: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  emoji: string | null;
};

export function ReactionListDialog({ open, onOpenChange, postId, emoji }: Props) {
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && postId) {
      setLoading(true);
      // Fetch ALL reactions for the post
      getReactionDetails(postId, null)
        .then((data) => {
            const parsed = data.map(r => ({
                ...r,
                createdAt: new Date(r.createdAt)
            }));
            setReactors(parsed);
        })
        .finally(() => setLoading(false));
    }
  }, [open, postId]);

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    const groups: Record<string, Reactor[]> = {};
    reactors.forEach(r => {
        if (!groups[r.emoji]) groups[r.emoji] = [];
        groups[r.emoji].push(r);
    });
    return groups;
  }, [reactors]);

  // Get unique emojis for display order
  const emojis = useMemo(() => {
      return Object.keys(groupedReactions).sort();
  }, [groupedReactions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col h-[60vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Reactions</DialogTitle>
        </DialogHeader>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : reactors.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">
              No reactions yet.
            </p>
          ) : (
            <div className="space-y-6 py-2">
              {emojis.map((emojiChar) => (
                <div key={emojiChar} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg shrink-0">
                    {emojiChar}
                  </div>
                  <div className="pt-1 flex-1">
                    <p className="text-sm text-slate-900 leading-relaxed">
                        {groupedReactions[emojiChar].map(r => r.displayName).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
