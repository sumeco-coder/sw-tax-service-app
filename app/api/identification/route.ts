// app/api/identification/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/drizzle/db";
import { identification } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- constants ---------------- */

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN",
  "MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
] as const;

// UI display values (keep your curly apostrophe)
const ID_TYPES_UI = ["Driver’s License", "State ID", "Passport", "Military ID", "Other"] as const;
const ID_TYPES_DB = ["DRIVERS_LICENSE", "STATE_ID", "PASSPORT", "OTHER"] as const;

type UiIdType = (typeof ID_TYPES_UI)[number];
type DbIdType = (typeof ID_TYPES_DB)[number];

// Normalize input so POST accepts multiple variants safely
function normalizeUiIdType(input: unknown): unknown {
  if (typeof input !== "string") return input;
  const s = input.trim();

  // Convert curly apostrophe to straight for comparisons
  const ascii = s.replace(/[’]/g, "'");

  // Accept common variants
  if (ascii === "Driver's License" || ascii === "Drivers License" || ascii === "DRIVERS_LICENSE") {
    return "Driver’s License";
  }
  if (ascii === "STATE_ID") return "State ID";
  if (ascii === "PASSPORT") return "Passport";

  return s; // keep original if already matches enum
}

function uiToDbType(v: UiIdType): DbIdType {
  switch (v) {
    case "Driver’s License":
      return "DRIVERS_LICENSE";
    case "State ID":
      return "STATE_ID";
    case "Passport":
      return "PASSPORT";
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

function isIsoDate(s: string) {
  return s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/* ---------------- encryption ---------------- */

/**
 * AES-256-GCM key reader:
 * - accepts HEX (>=64 hex chars) OR base64/base64url
 * - must decode to 32 bytes
 */
function readAes256KeyFromEnv(): Buffer {
  const raw0 =
    (process.env.IDENTIFICATION_ENCRYPTION_KEY ?? "").trim() ||
    (process.env.SSN_ENCRYPTION_KEY ?? "").trim();

  // ✅ important: strip accidental wrapping quotes
  const raw = raw0.replace(/^"|"$/g, "").trim();

  if (!raw) {
    throw new Error("Missing IDENTIFICATION_ENCRYPTION_KEY (or SSN_ENCRYPTION_KEY) env var.");
  }

  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64;

  const key = isHex
    ? Buffer.from(raw, "hex")
    : Buffer.from(
        raw,
        raw.includes("-") || raw.includes("_") ? ("base64url" as any) : "base64"
      );

  if (key.length !== 32) {
    throw new Error("Encryption key must decode to 32 bytes (AES-256).");
  }
  return key;
}

/**
 * Versioned encrypted string:
 * v1.<iv_b64url>.<tag_b64url>.<ciphertext_b64url>
 */
function encryptIdNumberV1(plain: string) {
  const key = readAes256KeyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

/* ---------------- validation ---------------- */

const PersonSchema = z.object({
  hasNoId: z.boolean().default(false),
  doesNotWantToProvide: z.boolean().default(false),

  // ✅ accept curly/straight apostrophe + db enum strings
  type: z.preprocess(normalizeUiIdType, z.enum(ID_TYPES_UI)).default("Driver’s License"),

  // UI calls it number/state/issueDate/expirationDate
  number: z.string().trim().default(""),
  state: z.enum(STATES).default("CA"),
  issueDate: z.string().trim().default(""),
  expirationDate: z.string().trim().default(""),

  frontKey: z.string().trim().optional().default(""),
  backKey: z.string().trim().optional().default(""),
});

const SpouseSchema = PersonSchema.extend({
  enabled: z.boolean().default(false),
});

const IdentificationSchema = z
  .preprocess((v) => {
    // ✅ allow spouse missing from body
    if (!v || typeof v !== "object") return v;
    const obj = v as any;
    return {
      ...obj,
      spouse: obj.spouse ?? { enabled: false },
    };
  }, z.object({
    taxpayer: PersonSchema,
    spouse: SpouseSchema,
  }))
  .superRefine((data, ctx) => {
    const validate = (path: "taxpayer" | "spouse", enabled: boolean, p: any) => {
      if (!enabled) return;

      // if opted out -> skip required fields
      if (p.hasNoId || p.doesNotWantToProvide) return;

      if (!p.number.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [path, "number"],
          message: "ID number is required (or select one of the options below).",
        });
      }

      if (!isIsoDate(p.issueDate)) {
        ctx.addIssue({ code: "custom", path: [path, "issueDate"], message: "Use YYYY-MM-DD" });
      }
      if (!isIsoDate(p.expirationDate)) {
        ctx.addIssue({ code: "custom", path: [path, "expirationDate"], message: "Use YYYY-MM-DD" });
      }
    };

    validate("taxpayer", true, (data as any).taxpayer);
    validate("spouse", Boolean((data as any).spouse?.enabled), (data as any).spouse);
  });

function last4OfIdNumber(v: string) {
  const cleaned = String(v ?? "").replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "";
  return cleaned.slice(-4);
}

function scrubIfOptedOut(p: any) {
  if (!p?.hasNoId && !p?.doesNotWantToProvide) return p;
  return {
    ...p,
    number: "",
    state: "CA",
    issueDate: "",
    expirationDate: "",
    frontKey: "",
    backKey: "",
  };
}

/* ---------------- db helpers ---------------- */

async function upsertPerson(args: {
  userId: string;
  person: "TAXPAYER" | "SPOUSE";
  p: any;
}) {
  const { userId, person } = args;

  const cleaned = scrubIfOptedOut(args.p);
  const optedOut = Boolean(cleaned.hasNoId || cleaned.doesNotWantToProvide);

  const idNumber = String(cleaned.number ?? "").trim();
  const hasNumber = !!idNumber;

  const idLast4 = optedOut || !hasNumber ? "" : last4OfIdNumber(idNumber);
  const idNumberEncrypted = optedOut || !hasNumber ? null : encryptIdNumberV1(idNumber);

  const issuingState = optedOut ? null : (cleaned.state || "CA");
  const issueDate = optedOut ? null : (cleaned.issueDate || null);
  const expiresOn = optedOut ? null : (cleaned.expirationDate || null);

  const payload = {
    userId,
    person,
    type: uiToDbType(cleaned.type),

    issuingState,
    issueDate,
    expiresOn,

    idLast4: idLast4 || null,
    idNumberEncrypted,

    hasNoId: Boolean(cleaned.hasNoId),
    doesNotWantToProvide: Boolean(cleaned.doesNotWantToProvide),

    frontKey: optedOut ? null : (cleaned.frontKey || null),
    backKey: optedOut ? null : (cleaned.backKey || null),

    updatedAt: new Date(),
  };

  await db
    .insert(identification)
    .values({
      ...payload,
      createdAt: new Date(),
    } as any)
    .onConflictDoUpdate({
      target: [identification.userId, identification.person],
      set: payload as any,
    });
}

/* ---------------- handlers ---------------- */

export async function GET() {
  try {
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

      // IMPORTANT: don't return full ID number; show last4 + hasNumber
      number: "",
      last4: String(r?.idLast4 ?? ""),
      hasNumber: Boolean(r?.idNumberEncrypted),

      state: String(r?.issuingState ?? "CA"),
      issueDate: r?.issueDate ? String(r.issueDate).slice(0, 10) : "",
      expirationDate: r?.expiresOn ? String(r.expiresOn).slice(0, 10) : "",

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
  } catch (err) {
    console.error("GET /api/identification failed:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireClientUser();

    const body = await req.json().catch(() => null);
    const parsed = IdentificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // taxpayer always saved
    await upsertPerson({ userId: user.id, person: "TAXPAYER", p: parsed.data.taxpayer });

    if (parsed.data.spouse.enabled) {
      await upsertPerson({ userId: user.id, person: "SPOUSE", p: parsed.data.spouse });
    } else {
      // spouse disabled -> delete spouse row if exists
      await db
        .delete(identification)
        .where(and(eq(identification.userId, user.id), eq(identification.person, "SPOUSE")));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/identification failed:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
