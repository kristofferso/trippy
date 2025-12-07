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
import { NewPostDialog } from "@/components/new-post-dialog";
import { deletePost, deleteMember } from "@/app/actions";
import { db } from "@/db";
import { comments, groupMembers, groups, posts, reactions } from "@/db/schema";
import { createSession, getSession, Session } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

  let session = (await getSession(group.id)) as Session | null;
  if (!session && !group.passwordHash) {
    session = await createSession(group.id, null);
  }

  if (group.passwordHash && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const member = session?.memberId
    ? await db.query.groupMembers.findFirst({
        where: eq(groupMembers.id, session.memberId),
      })
    : null;
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

  const members = await db
    .select({
      id: groupMembers.id,
      displayName: groupMembers.displayName,
      isAdmin: groupMembers.isAdmin,
    })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id))
    .orderBy(desc(groupMembers.createdAt));

  async function handleDeletePost(postId: string) {
    "use server";
    await deletePost(postId);
  }

  async function removeMember(memberId: string) {
    "use server";
    await deleteMember(memberId);
  }

  return (
    <div className="min-h-screen bg-white">
      <NameDialog />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {group.name}
            </h1>
            <span className="text-sm text-slate-400">/{group.slug}</span>
          </div>
          {isAdmin && <NewPostDialog />}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-12">
          {postList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Video className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">
                No posts yet
              </h3>
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
                    {post.videoUrl && (
                      <h2 className="font-semibold text-slate-900 group-hover:text-blue-600">
                        {post.title || "Untitled Video"}
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

        {/* Members Section (Simplified) */}
        <div className="mt-20 border-t pt-10">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Members ({members.length})
            </h3>
            {isAdmin && (
              <span className="text-xs text-slate-500">
                Admins can remove members
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="group relative flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                  {member.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {member.displayName}
                  </p>
                  {member.isAdmin && (
                    <p className="text-[10px] uppercase tracking-wider text-blue-600">
                      Admin
                    </p>
                  )}
                </div>

                {isAdmin && member.id !== session?.memberId && (
                  <form
                    action={removeMember.bind(null, member.id)}
                    className="absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Button
                      type="submit"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
