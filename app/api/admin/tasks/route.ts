// app/api/admin/tasks/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { tasks, users } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";

const ALLOWED_ADMIN_ROLES = new Set(["admin", "superadmin", "lms-admin"]);

function clean(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

const TASK_STATUSES = new Set(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);

async function requireAdmin() {
  const me = await getServerRole();
  const role = String(me?.role ?? "").toLowerCase();
  if (!me?.sub || !ALLOWED_ADMIN_ROLES.has(role)) return null;
  return me;
}

/**
 * GET /api/admin/tasks?userId=...&year=2026
 * or  /api/admin/tasks?cognitoSub=...&year=2026
 * or  /api/admin/tasks?email=...&year=2026
 */
export async function GET(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());

  const userId = clean(url.searchParams.get("userId"), 80);
  const cognitoSub = clean(url.searchParams.get("cognitoSub"), 80);
  const email = normalizeEmail(url.searchParams.get("email"));

  // Find the target user (users.id) by whichever identifier you pass
  let targetUserId = userId;

  if (!targetUserId) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        cognitoSub
          ? eq(users.cognitoSub, cognitoSub)
          : email
          ? eq(users.email, email)
          : eq(users.id, "00000000-0000-0000-0000-000000000000") // impossible
      )
      .limit(1);

    targetUserId = u?.id ?? "";
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, targetUserId),
        // ✅ requires Option A (tasks.taxYear exists)
        eq((tasks as any).taxYear, year)
      )
    )
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(rows);
}

/**
 * POST /api/admin/tasks
 * body: {
 *   userId?: string;          // users.id (uuid)
 *   cognitoSub?: string;      // users.cognitoSub
 *   email?: string;           // users.email
 *   title: string;
 *   detail?: string;
 *   status?: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
 *   taxYear?: number;         // Option A
 * }
 */
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const title = clean(body?.title, 140);
  const detail = clean(body?.detail, 2000) || null;

  const statusRaw = clean(body?.status, 30).toUpperCase();
  const status = TASK_STATUSES.has(statusRaw) ? statusRaw : "OPEN";

  const taxYear =
    Number.isFinite(Number(body?.taxYear)) && Number(body?.taxYear) > 2000
      ? Number(body?.taxYear)
      : new Date().getFullYear();

  const userId = clean(body?.userId, 80);
  const cognitoSub = clean(body?.cognitoSub, 80);
  const email = normalizeEmail(body?.email);

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  // Resolve target users.id
  let targetUserId = userId;

  if (!targetUserId) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        cognitoSub
          ? eq(users.cognitoSub, cognitoSub)
          : email
          ? eq(users.email, email)
          : eq(users.id, "00000000-0000-0000-0000-000000000000") // impossible
      )
      .limit(1);

    targetUserId = u?.id ?? "";
  }

  if (!targetUserId) {
    return NextResponse.json(
      {
        error:
          "User not found. (Tasks can only be created after the user exists in your users table.)",
      },
      { status: 404 }
    );
  }

  const [created] = await db
    .insert(tasks)
    .values({
      userId: targetUserId,
      title,
      detail,
      status: status as any,

      // ✅ Option A: comment these two lines out if tasks.taxYear doesn't exist yet
      taxYear: taxYear as any,

      updatedAt: new Date(),
    } as any)
    .returning();

  return NextResponse.json({ task: created }, { status: 201 });
}
