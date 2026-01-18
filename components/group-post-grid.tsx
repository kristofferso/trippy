import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Edit, MessageCircle, MoreVertical, Trash2, User, Video } from "lucide-react";
import Link from "next/link";

import { deletePost } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from "@/db";
import { comments, postViews, posts, reactions } from "@/db/schema";
import { cn, formatTimeAgo } from "@/lib/utils";
import Image from "next/image";


export async function GroupPostGrid({
  groupId,
  groupSlug,
  isAdmin,
  memberId,
}: {
  groupId: string;
  groupSlug: string;
  isAdmin: boolean;
  memberId?: string;
}) {
  const postList = await db.query.posts.findMany({
    where: eq(posts.groupId, groupId),
    orderBy: desc(posts.createdAt),
    with: {
      author: {
        with: {
          user: true,
        },
      },
    },
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

  const seenPostIds = new Set<string>();
  if (memberId && postIds.length) {
    const seenRows = await db
      .select({ postId: postViews.postId })
      .from(postViews)
      .where(and(eq(postViews.memberId, memberId), inArray(postViews.postId, postIds)));
    seenRows.forEach((row) => seenPostIds.add(row.postId));
  }

  const getPreview = (post: (typeof postList)[number]) => {
    if (post.media && post.media.length > 0) {
      const first = post.media[0];
      if (first.type === "video") {
        return {
          type: "video",
          url: first.url,
          thumbnail: first.thumbnailUrl,
        };
      }
      return { type: "image", url: first.url };
    }
    return { type: "text", url: "" };
  };

  return (
    <div className="space-y-6 max-md:-mx-4 max-md:-mt-8">
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

      <div className="grid grid-cols-2 gap-px md:grid-cols-3 lg:grid-cols-4">
        {postList.map((post) => {
          const preview = getPreview(post);
          const timeAgo = formatTimeAgo(post.createdAt);
          const isSeen = memberId ? seenPostIds.has(post.id) : true;
          const isUnseen = !isSeen;
          const authorAvatar = post.author?.user?.avatarUrl;
          const authorName = post.author?.displayName;

          return (
            <article
              key={post.id}
              className="group relative"
            >
              <div
                className={cn(
                  "relative h-full overflow-hidden transition-transform",
                  isUnseen ? "bg-white shadow-xl" : "bg-slate-100 opacity-95"
                )}
              >
                <Link
                  href={`/g/${groupSlug}/post/${post.id}`}
                  className="absolute inset-0 z-10"
                >
                  <span className="sr-only">View post</span>
                </Link>

                <div className="aspect-square relative w-full h-full bg-slate-100 pointer-events-none">
                  {preview.type === "video" ? (
                    <>
                      {preview.thumbnail ? (
                        <img
                          src={preview.thumbnail}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-slate-100">
                          <Video className="size-12 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                        <div className="rounded-full bg-white/90 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                          <Video
                            className="size-5 text-slate-900"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </>
                  ) : preview.type === "image" ? (
                    <>
                      <Image
                        src={preview.url}
                        alt={post.title || ""}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover"
                      />

                    </>
                  ) : (
                    <div className="flex h-full flex-col justify-center p-6 bg-white text-center">
                      <h2 className="line-clamp-3 text-lg font-bold text-slate-900">
                        {post.title || "Untitled"}
                      </h2>
                      {post.body && (
                        <p className="mt-2 line-clamp-3 text-xs text-slate-500">
                          {post.body}
                        </p>
                      )}
                    </div>
                  )}

                  {(post.media?.length || 0) > 1 && (
                    <div className="absolute top-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      +{(post.media?.length || 0) - 1}
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-100" />

                  {/* Stats Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white opacity-100 z-20 pointer-events-none">
                    <div className="flex flex-col gap-2">
                      {/* Author Avatar */}
                      <div className="flex items-center gap-1.5 opacity-90">
                        <div className="h-5 w-5 rounded-full bg-white/20 overflow-hidden ring-1 ring-white/30">
                          {authorAvatar ? (
                            <img src={authorAvatar} alt={authorName} className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center bg-slate-400">
                              <User className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium truncate max-w-[80px] text-white/90 shadow-black drop-shadow-sm">
                          {authorName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-medium">
                        {commentCounts[post.id] ? (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{commentCounts[post.id]}</span>
                          </div>
                        ) : null}

                        {Object.values(reactionCounts[post.id] ?? {}).reduce(
                          (a, b) => a + b,
                          0
                        ) > 0 && (
                            <div className="flex items-center gap-1">
                              <span>
                                {Object.keys(reactionCounts[post.id] ?? {}).join(
                                  ""
                                )}
                              </span>
                              <span>
                                {Object.values(
                                  reactionCounts[post.id] ?? {}
                                ).reduce((a, b) => a + b, 0)}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pointer-events-auto shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                            >
                              <MoreVertical className="size-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/g/${groupSlug}/post/${post.id}/edit`}
                                className="flex w-full cursor-pointer items-center"
                              >
                                <Edit className="mr-2 size-4" />
                                Edit Post
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <button

                                onClick={() => deletePost(post.id)}
                                className="flex w-full cursor-pointer items-center text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete Post
                              </button>
                            </DropdownMenuItem>

                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start gap-2 z-20 pointer-events-none flex-wrap">
                  <div className="flex items-center gap-2 pointer-events-none">
                    <div
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium backdrop-blur-sm",
                        isUnseen
                          ? "bg-blue-600/90 text-white shadow"
                          : "bg-black/50 text-white"
                      )}
                    >
                      {timeAgo}
                    </div>

                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-center text-muted-foreground text-xs">The beginning</p>
    </div>
  );
}
