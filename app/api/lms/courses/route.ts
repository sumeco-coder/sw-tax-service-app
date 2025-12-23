// app/api/lms/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/client-core";
import { courses } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

const CreateCourseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET(_req: NextRequest) {
  const user = await getLmsUser();
  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.firmId, user.firmId))
    .orderBy(desc(courses.createdAt));

  // If TS does not like `courses.firmId.eq`, change this part to:
  //   import { eq } from "drizzle-orm";
  //   .where(eq(courses.firmId, user.firmId))

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getLmsUser();
  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateCourseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const data = parsed.data;

  const [created] = await db
    .insert(courses)
    .values({
      firmId: user.firmId,
      // ownerUserId: null, // we can wire this later when you map Cognito -> users table
      title: data.title,
      description: data.description ?? null,
      level: data.level ?? "BEGINNER",
      status: data.status ?? "DRAFT",
    })
    .returning();

  return NextResponse.json(created);
}
