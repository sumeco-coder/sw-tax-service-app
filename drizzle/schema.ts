// drizzle/schema.ts
import { sql } from "drizzle-orm";
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

export const profileVisibility = pgEnum("profile_visibility", [
  "public",
  "private",
]);

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
    invitedBy?: string; // admin, system, etc.
  }>(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date()
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
    () => new Date()
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
]);

export const emailRecipientStatus = pgEnum("email_recipient_status", [
  "queued",
  "sent",
  "failed",
  "unsubscribed",
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
  ["upcoming", "today", "past", "cancelled", "all"]
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
      t.email
    ),
  })
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
      t.email
    ),
  })
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
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cognitoSub: text("cognito_sub").notNull().unique(), // map to Cognito sub
    email: text("email").notNull(),

    // ✅ NEW: split name
    firstName: text("first_name"),
    lastName: text("last_name"),

    // keep the existing full name for display
    name: text("name"),
    phone: text("phone"),
    dob: date("dob"), // <— date, not text
    ssnEncrypted: text("ssn_encrypted"), // store server-side only, encrypted
    address1: text("address1"),
    address2: text("address2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    filingStatus: text("filing_status"), // could make enum later if you want
    avatarUrl: text("avatar_url"),
    bio: text("bio"),

    // 🔥 NEW: track where they are in onboarding
    onboardingStep: onboardingStepEnum("onboarding_step")
      .default("PROFILE")
      .notNull(),

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
  })
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

// --- Dependents ---
export const dependents = pgTable(
  "dependents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    dob: date("dob").notNull(),
    ssnLast4: varchar("ssn_last4", { length: 4 }),
    ssnEncrypted: text("ssn_encrypted"),
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
  }) // placeholder to allow inline check below if you use SQL
);

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
      t.taxYear
    ),
    userIdx: index("tax_returns_user_idx").on(t.userId),
    yearIdx: index("tax_returns_year_idx").on(t.taxYear),
  })
);

// ===================================================
// DOCUMENTS, INVOICES, TASKS, MESSAGES, USER SETTINGS
// ===================================================
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
  },
  (t) => ({
    userIdx: index("documents_user_idx").on(t.userId),
    returnIdx: index("documents_return_idx").on(t.taxReturnId),
    keyUniq: unique("documents_key_uniq").on(t.key),
  })
);

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
  })
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
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sender: text("sender").notNull(), // "client" | "staff"
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("messages_user_idx").on(t.userId),
    createdIdx: index("messages_created_idx").on(t.createdAt),
  })
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
  })
);

/* ======================================================================
   LMS SECTION
   Firms, Courses, Modules, Lessons, Enrollments, Progress, SOP Files
   ====================================================================== */
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
  })
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
  })
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
  })
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
  })
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
      t.userId
    ),
  })
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
      t.lessonId
    ),
  })
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
  })
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
  })
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
      t.scheduledAt
    ),
    providerIdx: index("social_posts_provider_idx").on(t.provider),
    triggerIdx: index("social_posts_trigger_idx").on(t.triggerKey),
  })
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
