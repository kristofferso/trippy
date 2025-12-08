import { notFound } from "next/navigation";
import { count, desc, eq, inArray } from "drizzle-orm";
import { Video, MessageCircle, MoreVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PasswordGate } from "@/components/password-gate";
import { NameDialog } from "@/components/name-dialog";
import { deletePost } from "@/app/actions";
import { db } from "@/db";
import { comments, groups, posts, reactions } from "@/db/schema";
import { getCurrentMember, getMemberSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function GroupFeedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) notFound();

  const member = await getCurrentMember(group.id);
  // We still check for a guest session cookie to handle the "password entered but no name set" state
  const session = await getMemberSession(group.id);

  if (group.passwordHash && !member && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const isAdmin = !!member?.isAdmin;

  const postList = await db.query.posts.findMany({
    where: eq(posts.groupId, group.id),
    orderBy: desc(posts.createdAt),
  });
  const postIds = postList.map((p) => p.id);

  const reactionRows = postIds.length
    ? await db
        .select({
          postId: reactions.postId,
          emoji: reactions.emoji,
          value: count(),
        })
        .from(reactions)
        .where(inArray(reactions.postId, postIds))
        .groupBy(reactions.postId, reactions.emoji)
    : [];
  const reactionCounts: Record<string, Record<string, number>> = {};
  for (const row of reactionRows) {
    reactionCounts[row.postId] = reactionCounts[row.postId] ?? {};
    reactionCounts[row.postId][row.emoji] = Number(row.value);
  }

  const commentRows = postIds.length
    ? await db
        .select({ postId: comments.postId, value: count() })
        .from(comments)
        .where(inArray(comments.postId, postIds))
        .groupBy(comments.postId)
    : [];
  const commentCounts: Record<string, number> = {};
  for (const row of commentRows) {
    commentCounts[row.postId] = Number(row.value);
  }

  async function handleDeletePost(postId: string) {
    "use server";
    await deletePost(postId);
  }

  return (
    <div className="min-h-screen bg-white">
      <NameDialog groupId={group.id} />

      <div className="space-y-12">
        {postList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Video className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No posts yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Be the first to share something with the group.
            </p>
          </div>
        ) : null}

        {postList.map((post) => (
          <article key={post.id} className="group relative">
            <a
              href={`/g/${group.slug}/post/${post.id}`}
              className="block space-y-4"
            >
              {/* Content Preview */}
              {post.videoUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/5 transition-transform group-hover:scale-[1.01]">
                  <video
                    src={post.videoUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/0">
                    <div className="rounded-full bg-white/90 p-3 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                      <Video
                        className="h-6 w-6 text-slate-900"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                </div>
              ) : post.imageUrls && post.imageUrls.length > 0 ? (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/5 transition-transform group-hover:scale-[1.01]">
                  <img
                    src={post.imageUrls[0]}
                    alt={post.title || "Post image"}
                    className="h-full w-full object-cover"
                  />
                  {post.imageUrls.length > 1 && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      +{post.imageUrls.length - 1}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-slate-50 p-6 ring-1 ring-slate-900/5 transition-transform group-hover:scale-[1.01]">
                  <div className="flex h-full flex-col justify-center">
                    <h2 className="line-clamp-2 text-2xl font-bold text-slate-900">
                      {post.title || "Untitled Post"}
                    </h2>
                    {post.body && (
                      <p className="mt-2 line-clamp-2 text-slate-600">
                        {post.body}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata & Stats */}
              <div className="flex items-start justify-between gap-4 px-1">
                <div className="space-y-1">
                  {(post.videoUrl ||
                    (post.imageUrls && post.imageUrls.length > 0)) && (
                    <h2 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {post.title || "Untitled Post"}
                    </h2>
                  )}
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <time dateTime={new Date(post.createdAt).toISOString()}>
                      {formatDate(post.createdAt)}
                    </time>
                    <span>•</span>
                    <div className="flex items-center gap-3">
                      {commentCounts[post.id] ? (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{commentCounts[post.id]}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-1">
                        {Object.entries(reactionCounts[post.id] ?? {})
                          .slice(0, 3)
                          .map(([emoji]) => (
                            <span
                              key={emoji}
                              className="text-base leading-none"
                            >
                              {emoji}
                            </span>
                          ))}
                        {Object.values(reactionCounts[post.id] ?? {}).reduce(
                          (a, b) => a + b,
                          0
                        ) > 0 && (
                          <span className="ml-1">
                            {Object.values(
                              reactionCounts[post.id] ?? {}
                            ).reduce((a, b) => a + b, 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-2 h-8 w-8 text-slate-400 hover:text-slate-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <form action={handleDeletePost.bind(null, post.id)}>
                        <DropdownMenuItem asChild>
                          <button
                            type="submit"
                            className="flex w-full cursor-pointer items-center text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Post
                          </button>
                        </DropdownMenuItem>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
