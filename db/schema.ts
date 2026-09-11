import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    authUserId: text("auth_user_id"),
    email: text("email").notNull(),
    username: text("username").notNull().default(""),
    passwordHash: text("password_hash").notNull().default(""),
    passwordSalt: text("password_salt").notNull().default(""),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("leader"),
    reportScope: text("report_scope").notNull().default("high_council"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_members_email").on(table.email),
    uniqueIndex("idx_members_username").on(table.username),
    uniqueIndex("idx_members_auth_user_id").on(table.authUserId),
  ],
);

export const wards = sqliteTable(
  "wards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_wards_name").on(table.name)],
);

export const memberWards = sqliteTable(
  "member_wards",
  {
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    wardId: integer("ward_id")
      .notNull()
      .references(() => wards.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.wardId] }),
    index("idx_member_wards_ward_id").on(table.wardId),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wardId: integer("ward_id")
      .notNull()
      .references(() => wards.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(),
    status: text("status").notNull().default("draft"),
    sacramentalObservation: text("sacramental_observation").notNull().default(""),
    punctualityState: text("punctuality_state").notNull().default(""),
    punctualityNote: text("punctuality_note").notNull().default(""),
    wardCouncilObservation: text("ward_council_observation").notNull().default(""),
    followupState: text("followup_state").notNull().default(""),
    followupNote: text("followup_note").notNull().default(""),
    missionaryObservation: text("missionary_observation").notNull().default(""),
    otherObservation: text("other_observation").notNull().default(""),
    scheduleState: text("schedule_state").notNull().default(""),
    scheduleNote: text("schedule_note").notNull().default(""),
    reporterMemberId: integer("reporter_member_id").references(() => members.id),
    reporterName: text("reporter_name").notNull().default(""),
    submittedAt: text("submitted_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_reports_ward_week").on(table.wardId, table.weekStart),
    index("idx_reports_week_status").on(table.weekStart, table.status),
    index("idx_reports_reporter").on(table.reporterMemberId),
  ],
);

export const organizationReports = sqliteTable(
  "organization_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
    monthStart: text("month_start").notNull(),
    organization: text("organization").notNull(),
    observation: text("observation").notNull().default(""),
    approvalStatus: text("approval_status").notNull().default("pending"),
    approvedAt: text("approved_at"),
    approvedByMemberId: integer("approved_by_member_id").references(() => members.id),
    reporterMemberId: integer("reporter_member_id").references(() => members.id),
    reporterName: text("reporter_name").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_org_reports_ward_month_org").on(table.wardId, table.monthStart, table.organization),
    index("idx_org_reports_month").on(table.monthStart),
    index("idx_org_reports_approval").on(table.approvalStatus, table.wardId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_member_id").on(table.memberId),
  ],
);
