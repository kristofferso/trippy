"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import { postComment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setNameDialogOpen } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor } from "@/components/comment-list";

type Props = {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
  onOptimisticAdd?: (comment: CommentWithAuthor) => void;
};

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  autoFocus,
  onOptimisticAdd,
}: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;

    setMessage(null);

    // Optimistic update
    if (onOptimisticAdd) {
      onOptimisticAdd({
        id: crypto.randomUUID(),
        text: text.trim(),
        createdAt: new Date().toISOString(),
        parentId: parentId || null,
        member: {
          id: "optimistic",
          displayName: "You", // We might want the actual user name here if possible, but "You" or fetching it is safer for now
        },
      });
    }

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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      onSuccess?.();
      router.refresh();
    });
  };

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
    setText(target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={adjustHeight}
          placeholder={parentId ? "Reply..." : "Add a comment..."}
          className="min-h-[44px] max-h-[88px] resize-none border-0 bg-slate-100 py-3 pl-4 pr-12 placeholder:text-slate-400 focus-visible:ring-0 rounded-2xl overflow-hidden"
          autoFocus={autoFocus}
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          variant={text.trim() ? "default" : "outline"}
          disabled={pending || !text.trim()}
          className="absolute right-1 top-1 size-10 rounded-xl"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Post</span>
        </Button>
      </div>
      {message ? (
        <p className="mt-2 text-sm text-destructive">{message}</p>
      ) : null}
    </form>
  );
}
