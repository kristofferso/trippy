"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Reply } from "lucide-react";

import { deleteComment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/comment-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";

export type CommentWithAuthor = {
  id: string;
  text: string;
  createdAt: Date | string;
  parentId: string | null;
  member: {
    id: string;
    displayName: string;
  };
};

type Props = {
  comments: CommentWithAuthor[];
  isAdmin: boolean;
  postId: string;
};

export function CommentList({ comments, isAdmin, postId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-6">
      {rootComments.map((comment) => (
        <div key={comment.id} className="group flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-slate-900">
              {comment.member.displayName}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-fit max-w-[calc(100%-88px)] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2 text-slate-900">
              <p className="text-sm leading-relaxed">{comment.text}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() =>
                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                }
              >
                <Reply className="h-4 w-4" />
                <span className="sr-only">Reply</span>
              </Button>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      disabled={pending}
                    >
                      <span className="sr-only">Delete</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 001.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogAction
                        onClick={() => handleDelete(comment.id)}
                        disabled={pending}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {replyingTo === comment.id && (
            <div className="ml-4 mt-2 border-l-2 border-slate-100 pl-4">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                onSuccess={() => setReplyingTo(null)}
                autoFocus
              />
            </div>
          )}

          {/* Replies */}
          {getReplies(comment.id).length > 0 && (
            <div className="ml-8 space-y-3 border-l-2 border-slate-100 pl-4 pt-1">
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="group flex flex-col gap-1">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-sm font-medium text-slate-900">
                      {reply.member.displayName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-fit max-w-[calc(100%-48px)] rounded-2xl rounded-tl-sm bg-slate-50 px-3 py-2 text-slate-800">
                      <p className="text-sm leading-relaxed">{reply.text}</p>
                    </div>

                    {isAdmin && (
                      <div className="flex shrink-0 items-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                              disabled={pending}
                            >
                              <span className="sr-only">Delete</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 001.5.06l.3-7.5z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this reply?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogAction
                                onClick={() => handleDelete(reply.id)}
                                disabled={pending}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
