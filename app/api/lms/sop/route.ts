// app/api/lms/sop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/client-core";
import { sopFiles } from "@/drizzle/schema";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

const SopSchema = z.object({
  title: z.string().min(1, "Title is required"),
  s3Key: z.string().min(1, "S3 key is required"), // Cognito-signed upload returns this
  // you can add description/category later:
  // description: z.string().optional(),
  // category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getLmsUser();

  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const parsed = SopSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const [created] = await db
    .insert(sopFiles)
    .values({
      firmId: user.firmId,                 // uuid of the firm
      title: parsed.data.title,
      storageKey: parsed.data.s3Key,       // 👈 maps to storageKey column
      // description: parsed.data.description ?? null,
      // category: parsed.data.category ?? null,
      // url: null, // you can later store a public/presigned URL here if desired
    })
    .returning();

  return NextResponse.json(created);
}
