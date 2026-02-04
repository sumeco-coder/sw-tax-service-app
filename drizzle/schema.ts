// drizzle/schema.ts
import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  pgEnum,
  index,
  unique,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Enums ---
export const returnStatus = pgEnum("return_status", [
  "PENDING",
  "DRAFT",
  "IN_REVIEW",
  "FILED",
  "ACCEPTED",
  "REJECTED",
  "AMENDED",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "UNPAID",
  "PAID",
  "VOID",
  "PAYMENT_SUBMITTED",
  "REFUNDED",
  "PARTIAL",
]);

export const taskStatus = pgEnum("task_status", [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
  "CANCELLED",
]);

export const agreementKindEnum = pgEnum("agreement_kind", [
  "ENGAGEMENT",
  "CONSENT_7216_USE",
  "CONSENT_PAYMENT",
]);

export const agreementDecisionEnum = pgEnum("agreement_decision", [
  "SIGNED",
  "GRANTED",
  "DECLINED",
  "SKIPPED",
]);

export const profileVisibility = pgEnum("profile_visibility", [
  "public",
  "private",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

export const themeEnum = pgEnum("theme_pref", ["light", "dark", "system"]);

// =========================
// INVITES ENUMS
// =========================
export const inviteTypeEnum = pgEnum("invite_type", [
  "taxpayer",
  "lms-preparer",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

// =========================
// INVITE TABLE
// =========================
export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull(),

  // 🔥 safer than free-text
  type: inviteTypeEnum("type").notNull(),

  // if this invite belongs to a specific agency (LMS flow)
  agencyId: uuid("agency_id"),

  // long random secure token
  token: text("token").notNull().unique(),

  // 🔥 enum status
  status: inviteStatusEnum("status").notNull().default("pending"),

  // invite expires automatically (for taxpayer onboarding links)
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  // extra flexible data — plan, waitlistId, referral info, etc.
  meta: jsonb("meta").$type<{
    waitlistId?: string;
    plan?: string;
    invitedBy?: string;
    inviteNext?: string;
  }>(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

// =========================
// WAITLIST ENUMS
// =========================
export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "pending",
  "approved",
  "rejected",
  "archived",
]);

// 2️⃣ RoleType enum (optional but recommended)
export const waitlistRoleEnum = pgEnum("waitlist_role", [
  "taxpayer",
  "business",
  "other",
]);

// =========================
// WAITLIST TABLE
// =========================
export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),

  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),

  // use your enum here:
  roleType: waitlistRoleEnum("role_type").notNull().default("taxpayer"),

  notes: text("notes"), // extra info: goals, situation, etc.

  // If they selected a plan (optional)
  plan: text("plan"),

  // For multi-agency (optional)
  agencyId: uuid("agency_id"),

  // 🔥 enum status
  status: waitlistStatusEnum("status").notNull().default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  gclid: text("gclid"),
  fbclid: text("fbclid"),
  landingPath: text("landing_path"),
  referrer: text("referrer"),
});

// =========================
// ONBOARDING STEP ENUM
// =========================
export const onboardingStepEnum = pgEnum("onboarding_step", [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "AGREEMENTS",
  "SUMMARY",
  "SUBMITTED",
  "DONE",
]);

// =========================
// EMAIL ENUMS
// =========================
export const emailCampaignStatus = pgEnum("email_campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
]);

export const emailRecipientStatus = pgEnum("email_recipient_status", [
  "queued",
  "sent",
  "sending",
  "failed",
  "unsubscribed",
  "scheduled",
]);

export const emailCampaignSegment = pgEnum("email_campaign_segment", [
  "waitlist_pending",
  "waitlist_approved",
  "waitlist_all",
  "manual",
  "email_list",
  "appointments",
]);

export const appointmentAudienceSegment = pgEnum(
  "appointment_audience_segment",
  ["upcoming", "today", "past", "cancelled", "all"],
);

// =========================
// EMAIL CAMPAIGNS
// =========================
export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  segment: emailCampaignSegment("segment")
    .default("waitlist_pending")
    .notNull(),
  listId: uuid("list_id").references(() => emailLists.id, {
    onDelete: "set null",
  }),
  apptSegment: appointmentAudienceSegment("appt_segment"),
  manualRecipientsRaw: text("manual_recipients_raw"),

  // delivery lifecycle
  status: emailCampaignStatus("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  schedulerName: text("scheduler_name"),
  sentAt: timestamp("sent_at", { withTimezone: true }),

  // content
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailRecipients = pgTable(
  "email_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    unsubToken: text("unsub_token").notNull(),
    status: emailRecipientStatus("status").default("queued").notNull(),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    renderedSubject: text("rendered_subject"),
    renderedHtml: text("rendered_html"),
    renderedText: text("rendered_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    emailIdx: index("email_recipients_email_idx").on(t.email),
    tokenUq: uniqueIndex("email_recipients_unsub_token_uq").on(t.unsubToken),
    campaignIdx: index("email_recipients_campaign_idx").on(t.campaignId),

    // ✅ prevents duplicates per campaign
    campaignEmailUq: uniqueIndex("email_recipients_campaign_email_uq").on(
      t.campaignId,
      t.email,
    ),
  }),
);

export const emailLists = pgTable("email_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailListMembers = pgTable(
  "email_list_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => emailLists.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    listIdx: index("email_list_members_list_idx").on(t.listId),
    emailIdx: index("email_list_members_email_idx").on(t.email),
    listEmailUq: uniqueIndex("email_list_members_list_email_uq").on(
      t.listId,
      t.email,
    ),
  }),
);

export const emailUnsubscribes = pgTable("email_unsubscribes", {
  email: text("email").primaryKey(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  source: text("source"), // "page" | "one-click" | etc
});

// 3️⃣ App settings table
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =========================
// LMS ENUMS
// =========================
export const courseLevelEnum = pgEnum("course_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const lessonTypeEnum = pgEnum("lesson_type", [
  "VIDEO",
  "ARTICLE",
  "QUIZ",
  "CHECKLIST",
]);

export const lessonStatusEnum = pgEnum("lesson_status", ["DRAFT", "PUBLISHED"]);

export const enrollmentRoleEnum = pgEnum("enrollment_role", [
  "LEARNER",
  "INSTRUCTOR",
  "ADMIN",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

// =========================
// USERS
// =========================
export const userRoleEnum = pgEnum("user_role", [
  "TAXPAYER",
  "AGENCY",
  "ADMIN",
  "SUPERADMIN",
  "LMS_PREPARER",
  "LMS_ADMIN",
  "TAX_PREPARER",
  "SUPPORT_AGENT",
  "SYSTEM",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cognitoSub: text("cognito_sub").notNull().unique(),
    email: text("email").notNull(),

    firstName: text("first_name"),
    middleName: text("middle_name"),
    lastName: text("last_name"),

    name: text("name"),
    phone: text("phone"),
    dob: date("dob"),
    ssnEncrypted: text("ssn_encrypted"),
    ssnLast4: varchar("ssn_last4", { length: 4 }),
    ssnSetAt: timestamp("ssn_set_at", { withTimezone: true }),
    address1: text("address1"),
    address2: text("address2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    filingStatus: text("filing_status"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    status: userStatusEnum("status").notNull().default("active"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledReason: text("disabled_reason"),
    adminNotes: text("admin_notes"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    hasPaidForPlan: boolean("has_paid_for_plan").notNull().default(false),

    role: userRoleEnum("role").notNull().default("TAXPAYER"),
    agencyId: uuid("agency_id"),
    filingClient: boolean("filing_client").notNull().default(false),

    onboardingStep: onboardingStepEnum("onboarding_step")
      .default("PROFILE")
      .notNull(),

    questionnaireComplete: boolean("questionnaire_complete")
      .notNull()
      .default(false),
    questionnaireCompletedAt: timestamp("questionnaire_completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

// =========================
// TAXPAYER INTAKE TABLE
// =========================
export const taxpayerIntake = pgTable(
  "taxpayer_intake",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // everything from onboarding/questions goes here
    answers: jsonb("answers").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userUnique: uniqueIndex("taxpayer_intake_user_unique").on(t.userId),
  }),
);

// =========================
// QUESTIONNAIRE
// =========================
export const headOfHouseholdDocs = pgTable(
  "head_of_household_docs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    payload: jsonb("payload").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userUniq: uniqueIndex("hoh_docs_user_uniq").on(t.userId),
  }),
);

export const educationCredits = pgTable(
  "education_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    payload: jsonb("payload").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userUniq: uniqueIndex("education_credits_user_uniq").on(t.userId),
  }),
);

export const identificationType = pgEnum("identification_type", [
  "DRIVERS_LICENSE",
  "STATE_ID",
  "PASSPORT",
  "OTHER",
]);

export const identificationPersonEnum = pgEnum("identification_person", [
  "TAXPAYER",
  "SPOUSE",
]);

export const identification = pgTable(
  "identifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    type: identificationType("type").notNull(),
    issuingState: text("issuing_state"),
    issueDate: date("issue_date"),
    expiresOn: date("expires_on"),
    idLast4: text("id_last4"),
    idNumberEncrypted: text("id_number_encrypted"),
    hasNoId: boolean("has_no_id").notNull().default(false),
    doesNotWantToProvide: boolean("does_not_want_to_provide")
      .notNull()
      .default(false),
    frontKey: text("front_key"),
    backKey: text("back_key"),
    person: identificationPersonEnum("person").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userPersonUnique: uniqueIndex("identifications_user_person_unique").on(
      t.userId,
      t.person,
    ),
    userIdx: index("identifications_user_idx").on(t.userId),
  }),
);

export const estimatedStateTaxPayments = pgTable(
  "estimated_state_tax_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // stores your Zod form values
    data: jsonb("data").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("est_state_tax_payments_user_unique").on(t.userId),
  }),
);

export const estimatedTaxPayments = pgTable(
  "estimated_tax_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    data: jsonb("data").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("estimated_tax_payments_user_unique").on(t.userId),
  }),
);

export const incomeDocumentation = pgTable(
  "income_documentations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // stores your component payload as JSON
    data: jsonb("data").$type<Record<string, any>>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userUnique: uniqueIndex("income_documentations_user_unique").on(t.userId),
    userIdx: index("income_documentations_user_idx").on(t.userId),
  }),
);

export const qualifyingChildren = pgTable(
  "qualifying_children",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, any>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("qualifying_children_user_unique").on(t.userId),
    userIdx: index("qualifying_children_user_idx").on(t.userId),
  }),
);

export const foreignAccountsDigitalAssets = pgTable(
  "foreign_accounts_digital_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // stores your component payload as JSON
    data: jsonb("data").$type<Record<string, any>>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userUnique: uniqueIndex("foreign_accounts_digital_assets_user_unique").on(
      t.userId,
    ),
    userIdx: index("foreign_accounts_digital_assets_user_idx").on(t.userId),
  }),
);

// =========================
// APPOINTMENTS ENUM & TABLES
// =========================
export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // When the call is scheduled for
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),

  // 30 mins by default
  durationMinutes: integer("duration_minutes").notNull().default(30),

  status: appointmentStatus("status").notNull().default("scheduled"),

  notes: text("notes"),
  cancelledReason: text("cancelled_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const appointmentRequests = pgTable("appointment_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),

  status: text("status").default("requested").notNull(), // requested/confirmed/cancelled
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  gclid: text("gclid"),
  fbclid: text("fbclid"),
  landingPath: text("landing_path"),
  referrer: text("referrer"),
});

export const appointmentSlotStatus = pgEnum("appointment_slot_status", [
  "open",
  "blocked",
]);

export const appointmentSlots = pgTable(
  "appointment_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),

    status: appointmentSlotStatus("status").notNull().default("open"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    startsIdx: index("appointment_slots_starts_idx").on(t.startsAt),
  }),
);

// --- Dependents ---
export const dependents = pgTable(
  "dependents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    middleName: varchar("middle_name", { length: 80 }).notNull().default(""),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    dob: date("dob").notNull(),
    ssnEncrypted: text("ssn_encrypted"),
    ssnLast4: varchar("ssn_last4", { length: 4 }),
    ssnSetAt: timestamp("ssn_set_at", { withTimezone: true }),

    appliedButNotReceived: boolean("applied_but_not_received")
      .default(false)
      .notNull(),
    relationship: text("relationship").notNull(),
    monthsInHome: integer("months_in_home").notNull().default(12),
    isStudent: boolean("is_student").default(false).notNull(),
    isDisabled: boolean("is_disabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },

  (t) => ({
    userIdx: index("dependents_user_idx").on(t.userId),
    livedCheck: index("dependents_months_check").on(t.monthsInHome),
  }), // placeholder to allow inline check below if you use SQL
);

export const dependentQuestionnaires = pgTable(
  "dependent_questionnaires",
  {
    dependentId: uuid("dependent_id")
      .notNull()
      .references(() => dependents.id, { onDelete: "cascade" })
      .primaryKey(), // ✅ best

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    payload: jsonb("payload").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("dependent_questionnaires_user_idx").on(t.userId),
  }),
);

export const clientAgreements = pgTable("client_agreements", {
  id: uuid("id").defaultRandom().primaryKey(),

  taxReturnId: uuid("tax_return_id").references(() => taxReturns.id, {
    onDelete: "cascade",
  }),

  userId: text("user_id").notNull(),
  taxYear: text("tax_year").notNull(),

  version: text("version").notNull(),
  contentHash: text("content_hash").notNull(),

  kind: agreementKindEnum("kind").notNull(),
  decision: agreementDecisionEnum("decision").notNull().default("SIGNED"), // SIGNED | GRANTED | DECLINED | SKIPPED

  taxpayerName: text("taxpayer_name").notNull(),
  taxpayerSignedAt: timestamp("taxpayer_signed_at", {
    withTimezone: true,
  }).notNull(),

  spouseRequired: boolean("spouse_required").notNull().default(false),
  spouseName: text("spouse_name"),
  spouseSignedAt: timestamp("spouse_signed_at", { withTimezone: true }),

  ip: text("ip"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =========================
// TAX RETURN TABLES
// =========================
export const taxReturns = pgTable(
  "tax_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxYear: integer("tax_year").notNull(), // <— integer year
    status: returnStatus("status").default("DRAFT").notNull(),
    refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }),
    refundEta: date("refund_eta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uniqPerUserYear: unique("tax_returns_user_year_uniq").on(
      t.userId,
      t.taxYear,
    ),
    userIdx: index("tax_returns_user_idx").on(t.userId),
    yearIdx: index("tax_returns_year_idx").on(t.taxYear),
  }),
);

// ===================================================
// DOCUMENTS, INVOICES, TASKS, MESSAGES, USER SETTINGS
// ===================================================
export const documentRequestStatusEnum = pgEnum("document_request_status", [
  "open",
  "completed",
  "cancelled",
]);

export const documentRequestItemStatusEnum = pgEnum(
  "document_request_item_status",
  ["requested", "uploaded", "waived"],
);

export const documentRequests = pgTable(
  "document_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    status: documentRequestStatusEnum("status").notNull().default("open"),

    dueDate: timestamp("due_date", { withTimezone: true }),
    note: text("note"),

    reminderCount: integer("reminder_count").notNull().default(0),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("doc_requests_user_idx").on(t.userId),
    statusIdx: index("doc_requests_status_idx").on(t.status),
  }),
);

export const documentRequestItems = pgTable(
  "document_request_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => documentRequests.id, { onDelete: "cascade" }),

    label: text("label").notNull(),
    docTypeKey: text("doc_type_key"),

    sortOrder: integer("sort_order").notNull().default(0),
    required: boolean("required").notNull().default(true),

    status: documentRequestItemStatusEnum("status")
      .notNull()
      .default("requested"),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),

    // ✅ break circular FK: store doc id without FK
    uploadedDocumentId: uuid("uploaded_document_id"),

    waivedAt: timestamp("waived_at", { withTimezone: true }),
    staffNote: text("staff_note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    reqIdx: index("doc_request_items_req_idx").on(t.requestId),
    statusIdx: index("doc_request_items_status_idx").on(t.status),
  }),
);

export const documentStatusEnum = pgEnum("document_status", [
  "new",
  "reviewed",
  "needs_attention",
]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxReturnId: uuid("tax_return_id").references(() => taxReturns.id, {
      onDelete: "cascade",
    }),

    requestId: uuid("request_id").references(() => documentRequests.id, {
      onDelete: "set null",
    }),
    requestItemId: uuid("request_item_id").references(
      () => documentRequestItems.id,
      {
        onDelete: "set null",
      },
    ),

    taxYear: integer("tax_year"),
    key: text("key").notNull(), // storage key (S3)
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    size: integer("size"),
    url: text("url"), // presigned or CDN URL
    docType: text("doc_type"), // e.g., W2, 1099, ID, etc.
    displayName: text("display_name"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    status: documentStatusEnum("status").notNull().default("new"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    attentionNote: text("attention_note"),
  },
  (t) => ({
    userIdx: index("documents_user_idx").on(t.userId),
    returnIdx: index("documents_return_idx").on(t.taxReturnId),
    keyUniq: unique("documents_key_uniq").on(t.key),
    statusIdx: index("documents_status_idx").on(t.status),
  }),
);

export const paymentStatusEnum = pgEnum("invoice_payment_status", [
  "submitted",
  "approved",
  "rejected",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxReturnId: uuid("tax_return_id").references(() => taxReturns.id, {
      onDelete: "set null",
    }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: invoiceStatus("status").default("UNPAID").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("invoices_user_idx").on(t.userId),
    returnIdx: index("invoices_return_idx").on(t.taxReturnId),
  }),
);

export const invoicePayments = pgTable(
  "invoice_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    method: text("method").notNull(),

    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    paidOn: date("paid_on").notNull(),

    reference: text("reference"),
    receiptKey: text("receipt_key"),
    notes: text("notes"),

    // ✅ lowercase enum + lowercase default
    status: paymentStatusEnum("status").notNull().default("submitted"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    invoiceIdx: index("invoice_payments_invoice_idx").on(t.invoiceId),
    userIdx: index("invoice_payments_user_idx").on(t.userId),
    statusIdx: index("invoice_payments_status_idx").on(t.status),
  }),
);

export const invoicesRelations = relations(invoices, ({ many }) => ({
  payments: many(invoicePayments),
}));

export const invoicePaymentsRelations = relations(
  invoicePayments,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoicePayments.invoiceId],
      references: [invoices.id],
    }),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxReturnId: uuid("tax_return_id").references(() => taxReturns.id, {
      onDelete: "cascade",
    }),
    taxYear: integer("tax_year")
      .notNull()
      .default(sql`(EXTRACT(YEAR FROM now()))::int`),
    title: text("title").notNull(),
    detail: text("detail"),
    status: taskStatus("status").default("OPEN").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("tasks_user_idx").on(t.userId),
    returnIdx: index("tasks_return_idx").on(t.taxReturnId),
    userYearIdx: index("tasks_user_year_idx").on(t.userId, t.taxYear),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    senderUserId: uuid("sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    senderRole: userRoleEnum("sender_role").notNull(),
    body: text("body"),
    encryptedBody: text("encrypted_body").notNull(),
    attachmentUrl: text("attachment_url"),
    encryptedAttachmentMeta: text("encrypted_attachment_meta"),
    keyVersion: text("key_version").default("v2").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
    senderIdx: index("messages_sender_idx").on(t.senderUserId),
    createdIdx: index("messages_created_idx").on(t.createdAt),
  }),
);

export const messageAudit = pgTable("message_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull(),
  action: text("action").notNull(), // sent | read | deleted
  actorUserId: uuid("actor_user_id"),
  actorRole: userRoleEnum("actor_role"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* =====================
   CONVERSATIONS TABLE
   =====================*/
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    subject: text("subject"),
    lastMessageAt: timestamp("last_message_at", {
      withTimezone: true,
    }).defaultNow(),
    lastSenderRole: userRoleEnum("last_sender_role"),
    lastSenderUserId: uuid("last_sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    clientUnread: integer("client_unread").default(0).notNull(),
    adminUnread: integer("admin_unread").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    clientIdx: index("conversations_client_idx").on(t.clientId),
    lastMessageIdx: index("conversations_last_message_idx").on(t.lastMessageAt),
  }),
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(), // one row per user
    theme: themeEnum("theme").default("system").notNull(),
    locale: text("locale").default("en-US").notNull(),
    timezone: text("timezone").default("America/Los_Angeles").notNull(),
    emailMarketing: boolean("email_marketing").default(false).notNull(),
    emailProduct: boolean("email_product").default(true).notNull(),
    smsAlerts: boolean("sms_alerts").default(false).notNull(),
    profileVisibility: profileVisibility("profile_visibility")
      .default("private")
      .notNull(),
    showEmail: boolean("show_email").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("user_settings_user_idx").on(t.userId),
  }),
);

/* ======================================================================
   LMS SECTION
   Firms, Courses, Modules, Lessons, Enrollments, Progress, SOP Files
   ====================================================================== */
export const firmRoleEnum = pgEnum("firm_role", [
  "OWNER",
  "ADMIN",
  "INSTRUCTOR",
  "TAX_PREPARER",
  "STAFF",
]);

export const firms = pgTable(
  "firms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    subdomain: text("subdomain"), // e.g. "sw-tax", "yourfirm"
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    subdomainIdx: index("firms_subdomain_idx").on(t.subdomain),
  }),
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    // who created/owns the course inside the firm
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    level: courseLevelEnum("level").default("BEGINNER").notNull(),
    status: courseStatusEnum("status").default("DRAFT").notNull(),
    estimatedMinutes: integer("estimated_minutes"),
    slug: text("slug"), // optional, if you want nice URLs later
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    firmIdx: index("courses_firm_idx").on(t.firmId),
    ownerIdx: index("courses_owner_idx").on(t.ownerUserId),
  }),
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    courseIdx: index("modules_course_idx").on(t.courseId),
    sortIdx: index("modules_sort_idx").on(t.courseId, t.sortOrder),
  }),
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    type: lessonTypeEnum("type").default("VIDEO").notNull(),
    status: lessonStatusEnum("status").default("DRAFT").notNull(),
    // e.g. "15" for 15 minutes, used in the UI estimate
    estimatedMinutes: integer("estimated_minutes"),
    sortOrder: integer("sort_order").notNull().default(0),
    videoUrl: text("video_url"), // optional
    content: text("content"), // long-form text, markdown, script, etc
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    courseIdx: index("lessons_course_idx").on(t.courseId),
    moduleIdx: index("lessons_module_idx").on(t.moduleId),
    sortIdx: index("lessons_sort_idx").on(t.courseId, t.sortOrder),
  }),
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: enrollmentRoleEnum("role").default("LEARNER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  },
  (t) => ({
    courseIdx: index("enrollments_course_idx").on(t.courseId),
    userIdx: index("enrollments_user_idx").on(t.userId),
    uniqCourseUser: unique("enrollments_course_user_uniq").on(
      t.courseId,
      t.userId,
    ),
  }),
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: progressStatusEnum("status").default("NOT_STARTED").notNull(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    enrollmentIdx: index("lesson_progress_enrollment_idx").on(t.enrollmentId),
    lessonIdx: index("lesson_progress_lesson_idx").on(t.lessonId),
    uniqEnrollmentLesson: unique("lesson_progress_enrollment_lesson_uniq").on(
      t.enrollmentId,
      t.lessonId,
    ),
  }),
);

export const sopFiles = pgTable(
  "sop_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"), // e.g. "Onboarding", "Due Diligence"
    storageKey: text("storage_key").notNull(), // S3 key / Amplify Storage key
    url: text("url"), // presigned or public URL if you store it
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    firmIdx: index("sop_files_firm_idx").on(t.firmId),
    storageKeyUniq: unique("sop_files_storage_key_uniq").on(t.storageKey),
  }),
);

// ============================
// SOCIAL MEDIA ENUMS & TABLES
// ============================
export const socialProvider = pgEnum("social_provider", [
  "facebook",
  "instagram",
  "x",
]);

export const socialPostStatus = pgEnum("social_post_status", [
  "queued",
  "sending",
  "sent",
  "failed",
  "cancelled",
]);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    provider: socialProvider("provider").notNull(),

    // display name you show in admin UI
    label: text("label").notNull(), // ex: "SW Tax Service FB Page"

    // For Facebook Page posting
    pageId: text("page_id"),

    // For Instagram Content Publishing
    igUserId: text("ig_user_id"),

    // Tokens (store encrypted later if you want)
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),

    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

    isEnabled: boolean("is_enabled").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    providerIdx: index("social_accounts_provider_idx").on(t.provider),
    enabledIdx: index("social_accounts_enabled_idx").on(t.isEnabled),
  }),
);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    provider: socialProvider("provider").notNull(),

    // optional: link to a specific connected account
    accountId: uuid("account_id").references(() => socialAccounts.id, {
      onDelete: "set null",
      onUpdate: "no action",
    }),

    // Trigger key lets you auto-post from anywhere:
    // examples: "waitlist.opened", "campaign.sent", "blog.published"
    triggerKey: text("trigger_key"),

    status: socialPostStatus("status").default("queued").notNull(),

    attempts: integer("attempts").default(0).notNull(),

    // If null => “post now”
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    // Content
    textBody: text("text_body").notNull(),

    // Optional media list (IG needs media; X/FB can use links/media)
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]).notNull(),

    // Store provider response
    result: jsonb("result").$type<Record<string, any> | null>(),
    error: text("error"),

    sentAt: timestamp("sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    statusScheduleIdx: index("social_posts_status_scheduled_idx").on(
      t.status,
      t.scheduledAt,
    ),
    providerIdx: index("social_posts_provider_idx").on(t.provider),
    triggerIdx: index("social_posts_trigger_idx").on(t.triggerKey),
  }),
);

// Status enum
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "subscribed",
  "unsubscribed",
]);

export const emailSubscribers = pgTable("email_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),
  fullName: text("full_name"),

  // keep simple: comma-separated tags like: "waitlist,prospect,2026"
  tags: text("tags"),

  status: subscriberStatusEnum("status").notNull().default("subscribed"),

  source: text("source").notNull().default("manual"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const directDeposit = pgTable(
  "direct_deposit",
  {
    userId: text("user_id").notNull(),

    useDirectDeposit: boolean("use_direct_deposit").notNull().default(false),

    accountHolderName: text("account_holder_name").notNull().default(""),
    bankName: text("bank_name").notNull().default(""),

    // "checking" | "savings"
    accountType: text("account_type").notNull().default("checking"),

    routingLast4: text("routing_last4").notNull().default(""),
    accountLast4: text("account_last4").notNull().default(""),

    // encrypted strings (base64)
    routingEncrypted: text("routing_encrypted").notNull().default(""),
    accountEncrypted: text("account_encrypted").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("direct_deposit_user_id_uq").on(t.userId),
  }),
);

export const taxCalculatorLeads = pgTable(
  "tax_calculator_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Store the raw email + a normalized lower version for case-insensitive uniqueness
    email: text("email").notNull(),
    emailLower: text("email_lower").notNull(),

    // Optional: if a logged-in user later exists, link it
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Where it came from (tax-calculator, ig-bio, etc)
    source: text("source").notNull().default("tax-calculator"),

    // UTM params / tracking (optional)
    utm: jsonb("utm").$type<
      Partial<{
        utm_source: string;
        utm_medium: string;
        utm_campaign: string;
        utm_term: string;
        utm_content: string;
      }>
    >(),

    // Snapshot of quick inputs (safe + no SSNs)
    snapshot: jsonb("snapshot").$type<{
      filingStatus?: string;
      w2Income?: number;
      selfEmployedIncome?: number;
      withholding?: number;
      dependentsCount?: number;
      otherDependentsCount?: number;
      useMultiW2?: boolean;
      w2sCount?: number;
      estimate?: {
        type?: "refund" | "owe";
        amount?: number;
        totalTax?: number;
        selfEmploymentTax?: number;
        quarterlyPayment?: number;
      };
    }>(),

    // Optional metadata (helps with fraud/spam + analytics)
    ip: text("ip"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    // If you want an opt-in checkbox later
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    taxPlanUnlocked: boolean("tax_plan_unlocked").notNull().default(false),
    taxPlanUnlockedAt: timestamp("tax_plan_unlocked_at", {
      withTimezone: true,
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailLowerUnique: uniqueIndex("tax_calc_leads_email_lower_unique").on(
      t.emailLower,
    ),
    createdAtIdx: index("tax_calc_leads_created_at_idx").on(t.createdAt),
    paidAtIdx: index("tax_calc_leads_paid_at_idx").on(t.paidAt),
    stripeSessionIdx: index("tax_calc_leads_stripe_session_idx").on(
      t.stripeCheckoutSessionId,
    ),
    stripeCustomerIdx: index("tax_calc_leads_stripe_customer_idx").on(
      t.stripeCustomerId,
    ),
  }),
);

// =========================
// 2.2 BUSINESS INFO
// =========================
export const entityTypeEnum = pgEnum("entity_type", [
  "SOLE_PROP",
  "LLC",
  "S_CORP",
  "C_CORP",
  "PARTNERSHIP",
  "NONPROFIT",
  "OTHER",
]);

export const clientBusinesses = pgTable(
  "client_businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ✅ NEW (recommended)
    taxYear: integer("tax_year"), // 2024, 2025, etc.
    isActive: boolean("is_active").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),

    businessName: varchar("business_name", { length: 140 }).notNull(),
    ein: varchar("ein", { length: 15 }),
    entityType: entityTypeEnum("entity_type").notNull().default("SOLE_PROP"),

    industry: varchar("industry", { length: 120 }),
    naicsCode: varchar("naics_code", { length: 10 }),
    businessStartDate: date("business_start_date"),
    businessAddress: text("business_address"),

    has1099Income: boolean("has_1099_income").notNull().default(false),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("client_businesses_user_idx").on(t.userId),

    // ✅ NEW index (recommended)
    yearIdx: index("client_businesses_year_idx").on(t.taxYear),

    // optional helpful index
    activeIdx: index("client_businesses_active_idx").on(t.isActive),
  }),
);

// =========================
// 2.3 NOTICES TRACKER
// =========================
export const noticeAgencyEnum = pgEnum("notice_agency", [
  "IRS",
  "STATE",
  "FTB",
  "OTHER",
]);

export const noticeStatusEnum = pgEnum("notice_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESPONDED",
  "RESOLVED",
]);

export const clientNotices = pgTable(
  "client_notices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    agency: noticeAgencyEnum("agency").notNull().default("IRS"),
    noticeNumber: varchar("notice_number", { length: 30 }), // CP2000, LT11, etc.
    taxYear: integer("tax_year"),
    receivedDate: date("received_date"),
    dueDate: date("due_date"),

    status: noticeStatusEnum("status").notNull().default("OPEN"),
    summary: text("summary"),
    resolutionNotes: text("resolution_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("client_notices_user_idx").on(t.userId),
    dueIdx: index("client_notices_due_idx").on(t.dueDate),
  }),
);

// =========================
// 2.4 NEXT STEPS
// =========================
export const nextStepStatusEnum = pgEnum("next_step_status", ["OPEN", "DONE"]);
export const nextStepPriorityEnum = pgEnum("next_step_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
]);

export const clientNextSteps = pgTable(
  "client_next_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 140 }).notNull(),
    details: text("details"),
    dueDate: date("due_date"),

    status: nextStepStatusEnum("status").notNull().default("OPEN"),
    priority: nextStepPriorityEnum("priority").notNull().default("NORMAL"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    userIdx: index("client_next_steps_user_idx").on(t.userId),
    dueIdx: index("client_next_steps_due_idx").on(t.dueDate),
  }),
);

// =========================
// 2.2 EMAIL LEADS
// =========================
export const emailLeads = pgTable(
  "email_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // raw + normalized for uniqueness
    email: text("email").notNull(),
    emailLower: text("email_lower").notNull(),

    // last source we saw (newsletter, waitlist, contact, tax-calculator, lead-magnet-xyz)
    source: text("source").notNull().default("unknown"),

    // only true when user explicitly opts in
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),

    // tracking / analytics (optional)
    utm: jsonb("utm").$type<
      Partial<{
        utm_source: string;
        utm_medium: string;
        utm_campaign: string;
        utm_term: string;
        utm_content: string;
      }>
    >(),

    ip: text("ip"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    // lifecycle
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submitCount: integer("submit_count").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailLowerUnique: uniqueIndex("email_leads_email_lower_unique").on(
      t.emailLower,
    ),
    lastSeenIdx: index("email_leads_last_seen_idx").on(t.lastSeenAt),
    sourceIdx: index("email_leads_source_idx").on(t.source),
    optinIdx: index("email_leads_optin_idx").on(t.marketingOptIn),
  }),
);
