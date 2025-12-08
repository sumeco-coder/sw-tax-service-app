// app/api/lms/modules/[moduleId]/lessons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/client";
import { modules, lessons, courses } from "@/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

const LessonSchema = z.object({
  title: z.string().min(3),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
});

// POST /api/lms/modules/[moduleId]/lessons
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  const user = await getLmsUser();

  // must have a logged-in LMS user with firmId
  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { moduleId } = await context.params;

  // 1️⃣ Verify the module exists and belongs to this user's firm
  const [mod] = await db
    .select({
      moduleId: modules.id,
      courseId: modules.courseId,
      firmId: courses.firmId,
    })
    .from(modules)
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(and(eq(modules.id, moduleId), eq(courses.firmId, user.firmId)))
    .limit(1);

  if (!mod) {
    return new NextResponse("Module not found", { status: 404 });
  }

  // 2️⃣ Validate body
  const body = await request.json();
  const parsed = LessonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  // 3️⃣ Find last sortOrder within this module so we can append
  const [last] = await db
    .select({
      sortOrder: lessons.sortOrder,
    })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(desc(lessons.sortOrder))
    .limit(1);

  const sortOrder = last?.sortOrder ? last.sortOrder + 1 : 1;

  // 4️⃣ Insert new lesson
  const [created] = await db
    .insert(lessons)
    .values({
      courseId: mod.courseId, // required by schema
      moduleId: mod.moduleId,
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      videoUrl: parsed.data.videoUrl ?? null,
      sortOrder,
      // type, status, etc. will use their default values
    })
    .returning();

  return NextResponse.json(created);
}
