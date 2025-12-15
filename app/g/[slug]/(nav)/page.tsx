import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";

import { PasswordGate } from "@/components/password-gate";
import { NameDialog } from "@/components/name-dialog";
import { db } from "@/db";
import { groups, posts } from "@/db/schema";
import { getCurrentMember, getMemberSession } from "@/lib/session";
import { GroupPostGrid } from "@/components/group-post-grid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) return { title: "Group Not Found" };

  const imageUrl = "/trippi.png";

  return {
    title: group.name,
    description: `Join ${group.name} on Trippi`,
    openGraph: {
      title: group.name,
      description: `Join ${group.name} on Trippi`,
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: group.name,
      description: `Join ${group.name} on Trippi`,
      images: [imageUrl],
    },
  };
}

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

  return (
    <div className="min-h-screen bg-white">
      <NameDialog groupId={group.id} />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <GroupPostGrid
          groupId={group.id}
          groupSlug={group.slug}
          isAdmin={isAdmin}
          memberId={member?.id}
        />
      </Suspense>
    </div>
  );
}
