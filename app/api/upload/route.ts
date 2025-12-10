import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { getCurrentMember, getMemberSession, getUserSession } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        const url = new URL(request.url);
        const groupId = url.searchParams.get("groupId");
        const type = url.searchParams.get("type");

        if (type === "avatar") {
          const session = await getUserSession();
          if (!session) throw new Error("Not signed in");
          return {
            allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            tokenPayload: JSON.stringify({ userId: session.userId }),
          };
        }

        // Group upload logic
        let member = null;

        if (groupId) {
          member = await getCurrentMember(groupId);
        } else {
          // Fallback to old behavior: check cookie based session (only works for guest sessions usually)
          const session = await getMemberSession();
          if (session?.memberId) {
            member = await db.query.groupMembers.findFirst({
              where: eq(groupMembers.id, session.memberId),
            });
          }
        }

        if (!member) {
          throw new Error("Not signed in");
        }

        if (!member.isAdmin) {
          throw new Error("Admins only");
        }

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            memberId: member.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("blob upload completed", blob, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 } // handleUpload client expects error message
    );
  }
}
