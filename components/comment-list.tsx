'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { deleteComment } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';

export type CommentWithAuthor = {
  id: string;
  text: string;
  createdAt: Date | string;
  member: {
    id: string;
    displayName: string;
  };
};

type Props = {
  comments: CommentWithAuthor[];
  isAdmin: boolean;
};

export function CommentList({ comments, isAdmin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border bg-white/70 p-3 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{comment.member.displayName}</p>
              <p className="text-sm text-muted-foreground">{formatDate(comment.createdAt)}</p>
            </div>
            {isAdmin ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={pending}>
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone and will remove the comment for everyone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogAction onClick={() => handleDelete(comment.id)} disabled={pending}>
                      Confirm delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{comment.text}</p>
        </div>
      ))}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
      ) : null}
    </div>
  );
}
