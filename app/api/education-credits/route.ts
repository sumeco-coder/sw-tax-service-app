import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { educationCredits, dependents } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accept BOTH:
// A) { dependentId, values, draft }  ✅ recommended
// B) raw object passthrough          ✅ legacy (use ?dependentId=... in URL)
const SaveSchema = z.union([
  z.object({
    dependentId: z.string().min(1, "dependentId required"),
    draft: z.boolean().optional(),
    values: z.object({}).passthrough(),
  }),
  z.object({}).passthrough(),
]);

async function getUserOr401() {
  try {
    return await requireClientUser();
  } catch {
    return null;
  }
}

function getDependentIdFromUrl(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.get("dependentId")?.trim() || null;
}

// ✅ strip sensitive fields from stored JSON payload
function sanitizeValues(values: any) {
  const v = { ...(values ?? {}) };
  delete v.studentSsn;
  delete v.ssn;
  delete v.ssnEncrypted;
  return v;
}

export async function GET(req: Request) {
  const auth = await getUserOr401();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;

  const dependentId = getDependentIdFromUrl(req);
  if (!dependentId) {
    return NextResponse.json(
      { error: "dependentId is required" },
      { status: 400 }
    );
  }

  // ✅ ensure dependent belongs to user
  const [dep] = await db
    .select()
    .from(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, user.id)))
    .limit(1);

  if (!dep) {
    return NextResponse.json({ error: "Dependent not found" }, { status: 404 });
  }

  const [row] = await db
    .select({
      payload: educationCredits.payload,
      updatedAt: educationCredits.updatedAt,
    })
    .from(educationCredits)
    .where(eq(educationCredits.userId, user.id))
    .limit(1);

  const payload = (row?.payload ?? {}) as any;
  const values = payload?.dependents?.[dependentId] ?? null;

  // Optional meta; safe even if column names differ
  const d: any = dep;
  const ssnOnFile = !!(
    d?.ssnEncrypted ||
    d?.ssn_encrypted ||
    d?.ssnCiphertext ||
    d?.ssnLast4 ||
    d?.ssnOnFile
  );

  return NextResponse.json({
    ok: true,
    values,
    meta: { ssnOnFile },
    updatedAt: row?.updatedAt ?? null,
  });
}

export async function POST(req: Request) {
  const auth = await getUserOr401();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const urlDependentId = getDependentIdFromUrl(req);

  const body: any = parsed.data;
  const dependentId: string | null =
    typeof body?.dependentId === "string" && body.dependentId.trim()
      ? body.dependentId.trim()
      : urlDependentId;

  if (!dependentId) {
    return NextResponse.json(
      { error: "dependentId is required (body.dependentId or ?dependentId=...)" },
      { status: 400 }
    );
  }

  const values = body?.values ? body.values : body; // raw object fallback
  const safeValues = sanitizeValues(values);

  // ✅ ensure dependent belongs to user
  const [dep] = await db
    .select()
    .from(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, user.id)))
    .limit(1);

  if (!dep) {
    return NextResponse.json({ error: "Dependent not found" }, { status: 404 });
  }

  // ✅ load existing payload so we can merge dependents map
  const [existing] = await db
    .select({ payload: educationCredits.payload })
    .from(educationCredits)
    .where(eq(educationCredits.userId, user.id))
    .limit(1);

  const prevPayload = (existing?.payload ?? {}) as any;

  const nextPayload = {
    ...prevPayload,
    dependents: {
      ...(prevPayload.dependents ?? {}),
      [dependentId]: safeValues,
    },
  };

  await db
    .insert(educationCredits)
    .values({
      userId: user.id,
      payload: nextPayload,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [educationCredits.userId],
      set: { payload: nextPayload, updatedAt: new Date() },
    });

  const d: any = dep;
  const ssnOnFile = !!(
    d?.ssnEncrypted ||
    d?.ssn_encrypted ||
    d?.ssnCiphertext ||
    d?.ssnLast4 ||
    d?.ssnOnFile
  );

  return NextResponse.json({ ok: true, meta: { ssnOnFile } });
}
