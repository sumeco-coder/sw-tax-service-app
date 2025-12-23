import { NextResponse } from "next/server";
import { db } from "@/drizzle/client-core";
import { courses, modules } from "@/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getLmsUser } from "@/lib/lms/getUser";

const ModuleSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

export async function POST(req: Request, { params }: any) {
  const user = await getLmsUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { courseId } = params;

  const [exists] = await db.select().from(courses).where(
    and(eq(courses.id, courseId), eq(courses.firmId, user.firmId!))
  );

  if (!exists) return new NextResponse("Course not found", { status: 404 });

  const body = await req.json();
  const parsed = ModuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.format(), { status: 400 });

  const [last] = await db.select().from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.sortOrder))
    .limit(1);

  const sortOrder = last ? last.sortOrder + 1 : 1;

  const [created] = await db.insert(modules).values({
    title: parsed.data.title,
    description: parsed.data.description,
    courseId,
    sortOrder,
  }).returning();

  return NextResponse.json(created);
}
