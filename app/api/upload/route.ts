import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session?.memberId) {
          throw new Error("Not signed in");
        }

        const member = await db.query.groupMembers.findFirst({
          where: eq(groupMembers.id, session.memberId),
        });

        if (!member || !member.isAdmin) {
          throw new Error("Admins only");
        }

        return {
          allowedContentTypes: ["video/mp4", "video/quicktime", "video/webm"],
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
