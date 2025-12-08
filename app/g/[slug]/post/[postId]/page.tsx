import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PasswordGate } from "@/components/password-gate";
import { NameDialog } from "@/components/name-dialog";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getCurrentMember, getMemberSession } from "@/lib/session";
import { PostDetailContent } from "@/components/post-detail-content";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) notFound();

  const member = await getCurrentMember(group.id);
  const session = await getMemberSession(group.id);

  if (group.passwordHash && !member && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const isAdmin = !!member?.isAdmin;

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent pt-6">
        <Link
          href={`/g/${slug}`}
          className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-8 w-8 drop-shadow-md" />
          <span className="sr-only">Back to Feed</span>
        </Link>
        <div className="font-semibold text-white drop-shadow-md">
          {group.name}
        </div>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        }
      >
        <PostDetailContent
          postId={postId}
          groupId={group.id}
          isAdmin={isAdmin}
        />
      </Suspense>

      <NameDialog groupId={group.id} />
    </div>
  );
}
