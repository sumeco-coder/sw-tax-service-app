// app/api/identification/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { identification } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN",
  "MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
] as const;

const ID_TYPES_UI = ["Driver’s License", "State ID", "Passport", "Military ID", "Other"] as const;

// your DB enum (based on your TS error)
const ID_TYPES_DB = ["DRIVERS_LICENSE", "STATE_ID", "PASSPORT", "OTHER"] as const;

type DbIdType = (typeof ID_TYPES_DB)[number];
type UiIdType = (typeof ID_TYPES_UI)[number];

function uiToDbType(v: UiIdType): DbIdType {
  switch (v) {
    case "Driver’s License":
      return "DRIVERS_LICENSE";
    case "State ID":
      return "STATE_ID";
    case "Passport":
      return "PASSPORT";
    // your DB enum list didn’t include MILITARY_ID, so map it to OTHER
    case "Military ID":
    case "Other":
    default:
      return "OTHER";
  }
}

function dbToUiType(v: string): UiIdType {
  switch (v) {
    case "DRIVERS_LICENSE":
      return "Driver’s License";
    case "STATE_ID":
      return "State ID";
    case "PASSPORT":
      return "Passport";
    default:
      return "Other";
  }
}

const PersonSchema = z.object({
  hasNoId: z.boolean().default(false),
  doesNotWantToProvide: z.boolean().default(false),

  type: z.enum(ID_TYPES_UI).default("Driver’s License"),
  number: z.string().trim().default(""),
  state: z.enum(STATES).default("CA"),

  issueDate: z.string().trim().default(""),       // YYYY-MM-DD or ""
  expirationDate: z.string().trim().default(""),  // YYYY-MM-DD or ""

  // optional if your table has these (your TS error mentioned backKey)
  frontKey: z.string().trim().optional().default(""),
  backKey: z.string().trim().optional().default(""),
});

const IdentificationSchema = z
  .object({
    taxpayer: PersonSchema,
    spouse: PersonSchema.extend({
      enabled: z.boolean().default(false),
    }),
  })
  .superRefine((data, ctx) => {
    const isDate = (s: string) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s);

    const validate = (path: "taxpayer" | "spouse", enabled: boolean, p: any) => {
      if (!enabled) return;
      if (p.hasNoId || p.doesNotWantToProvide) return;

      if (!p.number.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [path, "number"],
          message: "ID number is required (or select one of the options below).",
        });
      }
      if (!isDate(p.issueDate)) {
        ctx.addIssue({ code: "custom", path: [path, "issueDate"], message: "Use YYYY-MM-DD" });
      }
      if (!isDate(p.expirationDate)) {
        ctx.addIssue({ code: "custom", path: [path, "expirationDate"], message: "Use YYYY-MM-DD" });
      }
    };

    validate("taxpayer", true, data.taxpayer);
    validate("spouse", data.spouse.enabled, data.spouse);
  });

function scrubIfOptedOut(p: any) {
  if (!p?.hasNoId && !p?.doesNotWantToProvide) return p;
  return { ...p, number: "", issueDate: "", expirationDate: "", frontKey: "", backKey: "" };
}

// Change this if your column is named something else (who/role/etc)
const PERSON_COL = identification.person; // <-- MUST exist in your schema

async function upsertOne(args: {
  userId: string;
  person: "TAXPAYER" | "SPOUSE";
  p: any;
}) {
  const { userId, person, p } = args;

  const cleaned = scrubIfOptedOut(p);

  const payload = {
    userId,
    person,
    hasNoId: Boolean(cleaned.hasNoId),
    doesNotWantToProvide: Boolean(cleaned.doesNotWantToProvide),

    type: uiToDbType(cleaned.type),
    number: cleaned.number || "",

    state: cleaned.state || "CA",
    issueDate: cleaned.issueDate || "",
    expirationDate: cleaned.expirationDate || "",

    frontKey: cleaned.frontKey || "",
    backKey: cleaned.backKey || "",

    updatedAt: new Date(),
  };

  // If (userId, person) is unique you can do onConflict.
  // If not sure, do safe select-then-update/insert:
  const [existing] = await db
    .select({ id: identification.id })
    .from(identification)
    .where(and(eq(identification.userId, userId), eq(PERSON_COL, person)))
    .limit(1);

  if (existing) {
    await db.update(identification).set(payload).where(eq(identification.id, existing.id));
    return;
  }

  await db.insert(identification).values({
    ...payload,
    createdAt: new Date(),
  });
}

export async function GET() {
  const { user } = await requireClientUser();

  const rows = await db
    .select()
    .from(identification)
    .where(eq(identification.userId, user.id));

  const taxpayerRow = rows.find((r: any) => r.person === "TAXPAYER");
  const spouseRow = rows.find((r: any) => r.person === "SPOUSE");

  const toClient = (r: any) => ({
    hasNoId: Boolean(r?.hasNoId),
    doesNotWantToProvide: Boolean(r?.doesNotWantToProvide),
    type: dbToUiType(String(r?.type ?? "OTHER")),
    number: String(r?.number ?? ""),
    state: String(r?.state ?? "CA"),
    issueDate: String(r?.issueDate ?? ""),
    expirationDate: String(r?.expirationDate ?? ""),
    frontKey: String(r?.frontKey ?? ""),
    backKey: String(r?.backKey ?? ""),
  });

  return NextResponse.json({
    ok: true,
    data: {
      taxpayer: taxpayerRow ? toClient(taxpayerRow) : null,
      spouse: spouseRow ? { enabled: true, ...toClient(spouseRow) } : { enabled: false },
    },
  });
}

export async function POST(req: NextRequest) {
  const { user } = await requireClientUser();

  const body = await req.json().catch(() => null);
  const parsed = IdentificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await upsertOne({ userId: user.id, person: "TAXPAYER", p: parsed.data.taxpayer });

  if (parsed.data.spouse.enabled) {
    await upsertOne({ userId: user.id, person: "SPOUSE", p: parsed.data.spouse });
  } else {
    // remove spouse row if disabled
    await db
      .delete(identification)
      .where(and(eq(identification.userId, user.id), eq(PERSON_COL, "SPOUSE")));
  }

  return NextResponse.json({ ok: true });
}
