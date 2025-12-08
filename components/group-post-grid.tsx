import { count, desc, eq, inArray } from "drizzle-orm";
import { Video, MessageCircle, MoreVertical, Trash2, Edit } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePost } from "@/app/actions";
import { db } from "@/db";
import { comments, posts, reactions } from "@/db/schema";

export async function GroupPostGrid({
  groupId,
  groupSlug,
  isAdmin,
}: {
  groupId: string;
  groupSlug: string;
  isAdmin: boolean;
}) {
  const postList = await db.query.posts.findMany({
    where: eq(posts.groupId, groupId),
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
    if (post.videoUrl) {
      return { type: "video", url: post.videoUrl, thumbnail: null };
    }
    if (post.imageUrls && post.imageUrls.length > 0) {
      return { type: "image", url: post.imageUrls[0] };
    }
    return { type: "text" };
  };

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {postList.map((post) => {
          const preview = getPreview(post);

          return (
            <article key={post.id} className="group relative">
              <Link
                href={`/g/${groupSlug}/post/${post.id}`}
                className="block h-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/5 transition-transform hover:scale-[1.02]"
              >
                <div className="aspect-square relative w-full overflow-hidden bg-slate-100">
                  {preview.type === "video" ? (
                    <>
                      {preview.thumbnail ? (
                        <img
                          src={preview.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <Video className="h-12 w-12 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                        <div className="rounded-full bg-white/90 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                          <Video
                            className="h-5 w-5 text-slate-900"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </>
                  ) : preview.type === "image" ? (
                    <>
                      <img
                        src={preview.url}
                        alt={post.title || ""}
                        className="h-full w-full object-cover"
                      />
                      {(post.imageUrls?.length || 0) > 1 && (
                        <div className="absolute top-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          +{(post.imageUrls?.length || 0) - 1}
                        </div>
                      )}
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

                  {/* Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-100" />

                  {/* Stats Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white opacity-100">
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
                </div>
              </Link>

              {isAdmin && (
                <div className="absolute top-2 right-2 opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/g/${groupSlug}/post/${post.id}/edit`}
                          className="flex w-full cursor-pointer items-center"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Post
                        </Link>
                      </DropdownMenuItem>
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
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

