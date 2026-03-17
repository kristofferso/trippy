import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { groupMembers, groups, posts, postViews } from "@/db/schema";
import { resendSendEmail } from "@/lib/resend";
import { renderNewPostsEmail } from "@/lib/email/new-posts-email";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  // Vercel Cron Jobs include this header.
  // NOTE: This is not a secret, but it's the officially documented way to ensure
  // the request came from Vercel's scheduler in production.
  if (req.headers.get("x-vercel-cron") === "1") return true;

  const secret = process.env.CRON_SECRET;
  // If you don't set a secret, we only allow running in development.
  // In production, always set CRON_SECRET to prevent anyone triggering email sends.
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Intentionally removed: accepting secret via query parameter (?key=...) is insecure
  // because URLs are logged in server logs, referrer headers, and browser history.
  // Use the Authorization header instead: `Authorization: Bearer <secret>`

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set" },
      { status: 500 }
    );
  }
  if (!process.env.RESEND_FROM) {
    return NextResponse.json(
      { error: "RESEND_FROM is not set" },
      { status: 500 }
    );
  }
  if (!process.env.EMAIL_LINK_SECRET) {
    return NextResponse.json(
      { error: "EMAIL_LINK_SECRET is not set" },
      { status: 500 }
    );
  }

  const now = new Date();
  const since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const url = new URL(req.url);
  const requestedTestTo = url.searchParams.get("testTo");
  const testTo =
    (process.env.NODE_ENV !== "production" &&
      (process.env.EMAIL_TEST_TO || requestedTestTo)) ||
    null;

  // Extra safety: never allow testTo in production (even if provided).
  if (process.env.NODE_ENV === "production" && requestedTestTo) {
    return NextResponse.json(
      { error: "testTo is not allowed in production" },
      { status: 400 }
    );
  }

  const newPosts = await db.query.posts.findMany({
    where: gte(posts.createdAt, since),
    with: {
      author: { columns: { displayName: true } },
      group: { columns: { id: true, name: true, slug: true } },
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Group posts by groupId
  const postsByGroup = new Map<
    string,
    {
      group: { id: string; name: string; slug: string };
      posts: typeof newPosts;
    }
  >();

  for (const p of newPosts) {
    const g = p.group;
    if (!g) continue;
    const existing = postsByGroup.get(g.id);
    if (existing) existing.posts.push(p);
    else postsByGroup.set(g.id, { group: g, posts: [p] });
  }

  let groupsWithPosts = 0;
  let totalRecipients = 0;
  let totalEmailsSent = 0;
  const perGroup: Record<
    string,
    { posts: number; recipients: number; sent: number }
  > = {};

  for (const [groupId, bundle] of postsByGroup.entries()) {
    groupsWithPosts++;

    const group = bundle.group;

    // Safety: In test mode, DO NOT even query real recipients.
    const finalRecipients = testTo
      ? [{ id: "dev-test", displayName: "Dev Test", email: testTo }]
      : await db
          .select({
            id: groupMembers.id,
            displayName: groupMembers.displayName,
            email: groupMembers.email,
          })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, groupId),
              isNotNull(groupMembers.email),
              eq(groupMembers.emailNotificationsEnabled, true),
              isNull(groupMembers.emailUnsubscribedAt)
            )
          );

    totalRecipients += finalRecipients.length;

    const postIds = bundle.posts.map((p) => p.id);
    const recipientIds = finalRecipients.map((r) => r.id);

    // Get all views for these posts and these recipients in one query
    const views =
      recipientIds.length > 0 && postIds.length > 0
        ? await db
            .select()
            .from(postViews)
            .where(
              and(
                inArray(postViews.memberId, recipientIds),
                inArray(postViews.postId, postIds)
              )
            )
        : [];

    const viewsByMember = new Map<string, Set<string>>();
    for (const v of views) {
      if (!viewsByMember.has(v.memberId)) {
        viewsByMember.set(v.memberId, new Set());
      }
      viewsByMember.get(v.memberId)!.add(v.postId);
    }

    let sent = 0;
    for (const r of finalRecipients) {
      // Filter the posts to only show unseen ones for this specific recipient.
      const seenPostIds = viewsByMember.get(r.id) || new Set();
      const unseenPosts = bundle.posts.filter((p) => !seenPostIds.has(p.id));

      if (unseenPosts.length === 0) continue;

      try {
        const { subject, react } = renderNewPostsEmail({
          group,
          recipient: { id: r.id, displayName: r.displayName },
          posts: unseenPosts,
        });

        await resendSendEmail({
          to: r.email!,
          subject,
          react,
        });
        sent++;
        totalEmailsSent++;

        // Add a small delay to avoid hitting Resend's rate limits (especially on free tier)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send email to ${r.email}:`, error);
      }
    }

    perGroup[groupId] = {
      posts: bundle.posts.length,
      recipients: finalRecipients.length,
      sent,
    };
  }

  return NextResponse.json({
    ok: true,
    since: since.toISOString(),
    postsFound: newPosts.length,
    groupsWithPosts,
    testTo,
    totalRecipients,
    totalEmailsSent,
    perGroup,
  });
}
