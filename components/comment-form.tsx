"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { postComment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setNameDialogOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
};

export function CommentForm({ postId, parentId, onSuccess, autoFocus }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await postComment(postId, text.trim(), parentId);
      if (result?.needsProfile) {
        setNameDialogOpen(true, { type: "comment", postId, text });
        return;
      }
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setText("");
      onSuccess?.();
      router.refresh();
    });
  };

  const hasContent = text.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn("transition-all", hasContent ? "pb-0" : "")}>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={parentId ? "Write a reply..." : "Add a comment..."}
          className="min-h-[80px] resize-none border-0 bg-slate-50 p-3 placeholder:text-slate-400 focus-visible:ring-0"
          autoFocus={autoFocus}
        />
        {hasContent && (
          <div className="flex items-center justify-between bg-white px-2 py-2 animate-in fade-in slide-in-from-top-1">
            <div className="text-xs text-slate-400">
              {/* Optional: Add markdown hint or emoji picker trigger later */}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !text.trim()}
              className="h-8 px-4"
            >
              {pending
                ? parentId
                  ? "Replying..."
                  : "Posting..."
                : parentId
                ? "Reply"
                : "Post"}
            </Button>
          </div>
        )}
      </div>
      {message ? (
        <p className="mt-2 text-sm text-destructive">{message}</p>
      ) : null}
    </form>
  );
}
