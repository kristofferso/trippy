import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { getCurrentMember, getUserSession } from "@/lib/session";

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

  const member = await getCurrentMember(group.id);
  const isAdmin = !!member?.isAdmin;

  const userSession = await getUserSession();
  const user = userSession?.user
    ? { email: userSession.user.email, username: userSession.user.username }
    : null;

  return (
    <>
      <SiteHeader
        groupName={group.name}
        groupSlug={group.slug}
        isAdmin={isAdmin}
        groupId={group.id}
        user={user}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {children}
      </main>
    </>
  );
}
