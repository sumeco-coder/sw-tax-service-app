// app/api/lms/lessons/[lessonId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/client";
import { lessons, courses } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

type RouteContext = {
  params: {
    lessonId: string;
  };
};

const UpdateLessonSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  type: z.enum(["VIDEO", "ARTICLE", "QUIZ", "CHECKLIST"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await getLmsUser();
  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId } = params;

  const [row] = await db
    .select({
      lesson: lessons,
      course: courses,
    })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(and(eq(lessons.id, lessonId), eq(courses.firmId, user.firmId)))
    .limit(1);

  if (!row) {
    return new NextResponse("Lesson not found", { status: 404 });
  }

  return NextResponse.json({
    lesson: row.lesson,
    course: {
      id: row.course.id,
      title: row.course.title,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getLmsUser();
  if (!user || !user.firmId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId } = params;

  // 1️⃣ Make sure this lesson belongs to a course in user's firm
  const [row] = await db
    .select({
      lessonId: lessons.id,
      courseId: courses.id,
      firmId: courses.firmId,
    })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(and(eq(lessons.id, lessonId), eq(courses.firmId, user.firmId)))
    .limit(1);

  if (!row) {
    return new NextResponse("Lesson not found", { status: 404 });
  }

  // 2️⃣ Parse body
  const body = await req.json();
  const parsed = UpdateLessonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const data = parsed.data;

  // Build update object only with provided fields
  const update: Record<string, any> = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.content !== undefined) update.content = data.content;
  if (data.videoUrl !== undefined) update.videoUrl = data.videoUrl;
  if (data.estimatedMinutes !== undefined)
    update.estimatedMinutes = data.estimatedMinutes;
  if (data.type !== undefined) update.type = data.type;
  if (data.status !== undefined) {
    update.status = data.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { message: "Nothing to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(lessons)
    .set({
      ...update,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId))
    .returning();

  return NextResponse.json(updated);
}
