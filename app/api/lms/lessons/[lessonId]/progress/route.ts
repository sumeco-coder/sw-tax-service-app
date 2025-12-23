// app/api/lms/lessons/[lessonId]/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/client-core";
import { lessonProgress, lessons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

const ProgressSchema = z.object({
  enrollmentId: z.string().uuid(), // which enrollment is marking progress
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  const user = await getLmsUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId } = await context.params;

  // 1️⃣ Ensure lesson exists
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return new NextResponse("Lesson not found", { status: 404 });
  }

  // 2️⃣ Parse body for enrollmentId
  const body = await request.json();
  const parsed = ProgressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { enrollmentId } = parsed.data;

  // 3️⃣ Insert or ignore if already exists (idempotent)
  await db
    .insert(lessonProgress)
    .values({
      enrollmentId,
      lessonId,
      status: "COMPLETED", // or "IN_PROGRESS" depending on your UI
      lastViewedAt: new Date(),
      completedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
    });

  return NextResponse.json({ success: true });
}
