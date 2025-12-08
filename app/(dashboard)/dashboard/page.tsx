import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { getUserSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { CreateGroupDialog } from "@/components/create-group-dialog";

export default async function DashboardPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const myGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      role: groupMembers.isAdmin,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, session.userId));

  return (
    <>
      <SiteHeader />
      <main className="container mx-auto max-w-4xl py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Trips</h1>
          <CreateGroupDialog />
        </div>
        
        {myGroups.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-slate-50">
            <h3 className="text-lg font-medium">No trips yet</h3>
            <p className="text-slate-500 mb-4">Start your first adventure!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             {myGroups.map(g => (
                <Link key={g.id} href={`/g/${g.slug}`} className="block group">
                  <div className="border rounded-lg p-4 hover:border-slate-400 transition-colors h-full bg-white shadow-sm">
                    <h3 className="font-semibold text-lg group-hover:underline">{g.name}</h3>
                    <p className="text-sm text-slate-500">/g/{g.slug}</p>
                    {g.role && <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full mt-2">Admin</span>}
                  </div>
                </Link>
             ))}
          </div>
        )}
      </main>
    </>
  );
}

