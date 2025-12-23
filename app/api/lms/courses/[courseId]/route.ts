import { NextResponse } from "next/server";
import { db } from "@/drizzle/client-core";
import { courses } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getLmsUser } from "@/lib/lms/getUser";

export async function GET(req: Request, { params }: any) {
  const user = await getLmsUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { courseId } = params;

  if (!user.firmId) return new NextResponse("Forbidden", { status: 403 });

  const [course] = await db.select().from(courses).where(
    and(eq(courses.id, courseId), eq(courses.firmId, user.firmId))
  );

  if (!course) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(course);
}

export async function DELETE(req: Request, { params }: any) {
  const user = await getLmsUser();
  if (!user || user.role !== "owner")
    return new NextResponse("Forbidden", { status: 403 });

  await db.delete(courses).where(eq(courses.id, params.courseId));
  return NextResponse.json({ success: true });
}
