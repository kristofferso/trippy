import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { getMemberSession } from "@/lib/session";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) notFound();

  const session = await getMemberSession(group.id);
  const member = session?.memberId
    ? await db.query.groupMembers.findFirst({
        where: eq(groupMembers.id, session.memberId),
      })
    : null;
  const isAdmin = !!member?.isAdmin;

  return (
    <>
      <SiteHeader
        groupName={group.name}
        groupSlug={group.slug}
        isAdmin={isAdmin}
        groupId={group.id}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {children}
      </main>
    </>
  );
}
