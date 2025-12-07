'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { postComment } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { setNameDialogOpen } from '@/lib/store';

type Props = {
  postId: string;
};

export function CommentForm({ postId }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await postComment(postId, text.trim());
      if (result?.needsProfile) {
        setNameDialogOpen(true, { type: 'comment', postId, text });
        return;
      }
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setText('');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts"
        className="min-h-[100px]"
      />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? 'Posting...' : 'Post comment'}
        </Button>
      </div>
    </form>
  );
}
