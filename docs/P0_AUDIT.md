# P0 Audit — AuraCRM / openCRM

> Note: This audit **corrects the prior stale version**, which incorrectly claimed `src/proxy.ts` was dead code, that there was no `Dockerfile`, no `.env.example`, and no checked-in migrations. The current working copy has all of these (a real `Dockerfile` + `docker-compose.yml`, a committed `.env.example`, and a `prisma/migrations` folder containing 4 migrations). It also misstated soft-delete as absent: soft-delete was **added to the schema + a migration** (`20260918_add_soft_delete_to_record`) but is **not yet wired** into record reads or `deleteRecord` (still hard-deleting). This replacement reflects the actual working-copy state below.
>
> Audit date: 2026-09-18. Scope: static inspection of the working copy at `/home/cathenon/Desktop/openCRM` (3132-line `src/actions/standard/record-actions.ts`, 1254-line `prisma/schema.prisma`/`schema.pprisma` duplicate, `src/auth.ts`, `src/middleware.ts`, `src/lib/{permissions,record-access,file-storage,csv,auth-proxy-fix,auth/context}.ts`, `src/app/api/{search,notifications,files,fields}/*`, the 10 admin action files, the 7 standard action files, all `src/app` routes, components, `src/tests` (14 files), `scripts/`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `prisma/migrations` (4 migrations), `next.config.ts`).

## 1. Current Architecture

**Tech stack**
- Next.js 16 App Router (Turbopack dev), React 19.2.0 + React DOM 19.2.0, TypeScript 6. Prisma ORM 7.10 (`@prisma/adapter-pg` + `pg` ^8.23.0). Tailwind CSS v4, PostCSS, Radix UI + shadcn/ui, Lucide, Framer Motion.
- Authentication: **better-auth** 1.7.5 (`@better-auth/prisma-adapter`) with custom bcryptjs (12 rounds), the `username` plugin, and **JWT session strategy** (`cookieCache.strategy: "jwt"`). `jose` ^6.2.12 verifies the JWT in `src/lib/auth-proxy-fix.ts` (legacy credential compare) and `src/lib/auth/proxy.ts`. The session/user payloads are extended with `organizationId` (number) and `userType` (string) (`src/auth.ts`).
- Background jobs: pg-boss 11.1.2 (`src/lib/jobs/pgboss.ts`, `sharing-rule-worker.ts`). One worker entry handles two queues: sharing-rule recompute + import processing. Two-process runtime: web (`next dev`/`start`) + worker (`jobs:worker`).
- State: TanStack Query configured in `providers.tsx` but **unused** (dead provider). Zustand.
- Deployment assets present: `Dockerfile` (multi-stage node:20-alpine), `docker-compose.yml` (db + web + worker), `open-next.config.ts` + `wrangler.jsonc` (Cloudflare edge build config), `next.config.ts`.

**Multi-tenancy model**
- Multi-tenant EAV. `Organization` is the tenant root; every tenant-scoped model carries `organizationId Int` + an `@@index([organizationId,…])`.
- EAV core: `Record` (the row) → `FieldData[]` (cells) keyed by `fieldDefId` → `FieldDefinition` → `PicklistOption`. `FieldData` stores one cell per typed column (`valueText`, `valueSearch`, `valueNumber`, `valueDate`, `valueBoolean`, `valueLookup`, `valuePicklistId`+`valuePicklist`).
- `User.organizationId` is single-org (one tenant per user). The session carries that single `organizationId`.
- Routes grouped: `(auth)`, `(admin)`, `(standard)`; public shell at `/`, `/login`, `/register`.

## 2. Existing Features

**Auth & identity** — login/register email+password (bcrypt), username plugin, legacy credential fallback (`src/lib/auth-proxy-fix.ts`).

**Access control (RBAC + record sharing)** — Permission Sets / Permission-Set Groups / Object Permissions / App Permissions; `Group`, `Queue`, `QueueMember`, `RecordShare` (READ/EDIT/DELETE) (`src/lib/permissions.ts`, `src/lib/record-access.ts`). Roles seeded as permission sets: Owner, Admin, Manager, Sales, Viewer (`src/lib/seeding/create-default-app.ts`). Record access = owner + queue + group + shares, evaluated two ways: `buildRecordAccessFilter` (Prisma where) and `buildRecordAccessSql` (raw SQL).

**Objects & metadata** — seeded system objects: `user`, `company`, `contact`, `opportunity`, `lead`, `case`, `task`. Object/field/picklist definitions, record-page layouts & assignments, list views (table + kanban via `kanban-board.tsx` + `@dnd-kit`), dashboard widgets, app nav items. Automation rules: assignment rules, sharing rules, duplicate rules, validation rules (with custom-logic expressions). Field-history tracking (`FieldHistory`), record-owner history (`RecordOwnerHistory`). Auto-number, external ID, lookups, picklists.

**Import** — async CSV: column mapping, preview, staged `ImportJob`/`ImportRow`, error logging, pg-boss worker (`import-processing.ts`).

**Global search** — server-side across readable objects, scoped by `organizationId` + record access (`src/app/api/search/global/route.ts`).

**Notifications** — `Notification` model + API (`src/app/api/notifications/route.ts`); unread count, mark-read, mark-all-read. Fires for queue/user assignment and `@mention`. `NotificationType` = QUEUE_ASSIGNMENT, USER_ASSIGNMENT, COMMENT_MENTION.

**Documents / attachments** — `FileAttachment` model, `/api/files/upload` + `/api/files/[id]` routes. Magic-byte MIME detection (PNG/JPEG/GIF/WebP/PDF/SVG), size + allow-list validation, path-traversal-safe **local disk** storage under `uploads/<org>/<record>/…`.

**Chatter** — `RecordComment` + `RecordCommentMention`, soft-deleted comments, inline in record detail.

**Lead conversion** — `convertLead` Server Action: permission-checks lead `edit` + contact `create`, loads lead with access scoping, checks `is_converted` (Checkbox), creates a `contact` from first/last name/email/phone/title/company, then flags the lead converted and links the contact (`src/actions/standard/lead-actions.ts`). UI: `convert-lead-button.tsx`. Tested (`src/tests/actions/convertLead.test.ts`, 7 cases).

**Dashboard** — `DashboardPage` renders metric/list/chart widgets from server actions (`dashboard-actions.ts`) that query real DB data scoped by `organizationId` + permissions.

**Export** — CSV export (`export-actions.ts` → `getRecords` + `buildCsvFromRecords`) behind `/api/.../export/route.ts`, permission-scoped via `getRecords`.

**i18n** — `src/i18n`; ~165 files use `t()`.

## 3. Missing / Incomplete P0 Features

| P0 | Area | Finding | Evidence |
| --- | --- | --- | --- |
| P0-1 | Org switching | Single org per user; no membership model, no switcher UI. `User.organizationId` is the only org link. | `schema.prisma` User model; no `OrganizationMember`; no switcher component. |
| P0-1 | RBAC role model | Roles are **permission sets** (Owner/Admin/Manager/Sales/Viewer), not a role enum. `User.userType` is only `admin`/`standard`. "Sales" ≈ Member. Capability exists; literal role names differ from spec. | `create-default-app.ts` ROLES; `UserType` enum = admin/standard. |
| P0-2 | Soft-delete (Record) | **Schema + migration done, NOT wired.** `Record.isDeleted` exists and `20260918_add_soft_delete_to_record` migration exists, but reads never filter `isDeleted:false`, and `deleteRecord` does a **hard** delete (`tx.record.delete`). Deleted records are fully visible until fixed. | `schema.prisma:659,678`; `record-actions.ts:2949-3038` (hard delete, no `isDeleted` refs). |
| P0-2 | CRM object coverage | Seeded objects: user, company, contact, opportunity, lead, case, task. **Missing:** Product, Note (standalone), Call, Meeting, Document. P0-2/P0-6/P0-9 require these as objects. | `create-org-template.ts`; grep for `apiName: "product|call|meeting|note|document"` → only `case`. |
| P0-3 | Contact 360 | Record detail has related lists, field history, and comments. No unified **timeline** aggregating activities/tasks/notes; no Documents tab. Activities exist only as `task`. | `record-detail.tsx` (RelatedList, Field History, RecordCommentPanel). |
| P0-4 | Lead lifecycle | Only a `status` picklist `[New, Working, Converted, Rejected]` + `is_converted` checkbox. No enforced state machine; does not match spec lifecycle (CONTACTED/QUALIFIED/UNQUALIFIED). `convertLead` creates a Contact but **not** a Company or Opportunity (partial). No lead `score`/`source` fields. | `create-org-template.ts` lead fields; `lead-actions.ts`. |
| P0-5 | Pipeline stages | Opportunity `stage` is a picklist; Kanban drag persists changes via generic `moveRecord` (works). No dedicated stage-history table (field-history covers picklist changes). No `probability`/`expected close` fields beyond `close_date`/`amount`. | `kanban-board.tsx` → `moveRecord`; `create-org-template.ts` opportunity fields. |
| P0-6 | Activities | Only `task` object. No Calls/Meetings/Notes as first-class activity types; tasks lack due-date/priority fields in seed. | `create-org-template.ts` task fields. |
| P0-9 | Document store | Attachments stored on **local disk** only. No S3/MinIO/object-store backend. No committed `.env.example` entry for storage. | `src/lib/file-storage.ts` (`process.cwd()/uploads`); `file-upload/route.ts`. |
| P0-14 | Command palette | Missing. shadcn `Command` component exists but unused as a palette; no Cmd+K. | `components/ui/command.tsx` only; grep `cmdk|CommandPalette` → none wired. |
| P0-15 | Rate limiting | Missing — brute-force on auth endpoints unthrottled. | grep `rate.limit|express-rate-limit|lru-cache` → none; no dep in package.json. |
| P0-15 | CSRF | better-auth JWT cookie only; no CSRF tokens on server actions. Relies on better-auth default SameSite (not explicitly configured). | `auth.ts` session config; no `sameSite` in repo. |
| P0-15 | Cookie hardening | Session cookie `secure`/`sameSite` not explicitly set in better-auth config. | `src/auth.ts`. |
| P0-16 | Client/E2E tests | No client test project, no E2E. vitest has only a `unit` (node) project; excludes `src/app/**`, `components/ui/**`, `jobs/**`. | `vitest.config.ts`. |
| P0-18 | CI/CD | No `.github/workflows`. | repo root listing. |
| misc | Stray file | `prisma/schema.pprisma` (typo duplicate of `schema.prisma`). | repo root. |
| misc | Empty file | `start.bat` = `start` only. | repo root. |
| misc | Stale lockfile | `yarn.lock` (279 bytes) committed alongside real `pnpm-lock.yaml`. | repo root. |
| misc | Hardcoded path | `scripts/deploy-railway.sh` hardcodes `/home/cathenon/Desktop/openCRM`. | `scripts/`. |

## 4. Security Problems

- **Soft-delete gap (correctness).** `Record.isDeleted` exists but is ignored by reads and `deleteRecord` hard-deletes — inconsistent state that will leak deleted records and lose data on "delete". Must be wired end-to-end (P0-2).
- **No rate limiting.** `/api/auth/*` (sign-in/up) and password endpoints are unthrottled → brute-force risk.
- **CSRF.** State-changing Server Actions rely on the better-auth session cookie; `sameSite`/`secure` not explicitly configured. SameSite=Lax (better-auth default) mitigates cross-site POST but no explicit CSRF defense.
- **Admin enforcement is by-convention, not defense-in-depth at the route.** Middleware (`src/middleware.ts`) only redirects `/admin` for non-admins; the real guard is duplicated `getUserContext()` calls inside each admin action (7 copies). Missing one on a future route = bypass. No shared abstraction.
- **Local file uploads.** No S3/MinIO, no virus scanning, no per-org quota. Path-traversal guard exists (`resolveStoragePath`). MIME is magic-byte detected (good) but extension is client-controlled (minor).
- **`scripts/deploy-railway.sh`** hardcodes the author's local path and runs `npx prisma db push` against the local machine → non-portable / leaks a path.
- **Weak default secrets** in `.env` / docker-compose defaults (`JWT_SECRET=dev-secret-change-me`).
- **No `.env.example` for storage/S3** and `.env.example` lacks guidance (no S3 vars, no DB port notes).
- **`.env*`** is gitignored (correct) but README §Local Setup misstates auth (says NextAuth; code uses better-auth) and misstates migrations ("no checked-in migrations" — there are 4).
- **Stale `yarn.lock`** and **`schema.pprisma`** typo add confusion; **`start.bat`** empty.

## 5. Multi-Tenant Isolation

**Sound**
- `organizationId` is derived server-side from the better-auth session in every action (`getUserContext()`/`auth()`); never trusted from the client.
- All record reads/writes go through `organizationId`-scoped queries; `getRecords`/`getRecord`/`deleteRecord`/`moveRecord`/`exportRecords` and global search scope by the session org.
- `FileAttachment` storage is sandboxed per org; `resolveStoragePath` rejects escapes.
- `RecordShare` subquery is constrained by `organizationId` (`buildRecordAccessSql`).
- Workers re-derive org from the DB, not from job payloads.

**Gaps**
- `getUserQueueIds` (`src/lib/record-access.ts:4-11`) queries `QueueMember` by `userId` with **no `organizationId` filter** — safe today only because a user belongs to one org; latent bug under multi-org.
- `buildRecordAccessFilter` (Prisma) and `buildRecordAccessSql` (raw SQL) duplicate the same access logic; there is **no equivalence test** asserting they stay in sync (drift → bypass).
- `getUserContext()` is duplicated across admin actions (no shared guard).
- Soft-delete not wired (above) means a `isDeleted:true` record is still readable — an isolation/correctness gap.
- `getMetricData`/`getListWidgetData`/`getChartData` scope by org but the raw-SQL `getRecords` path and `getRecord` lookup resolution currently do **not** filter `isDeleted`.

## 6. Database Problems

- 47 models; EAV core is `FieldData` (`valueText/valueSearch/valueNumber/valueDate/valueBoolean/valueLookup/valuePicklistId`).
- `isDeleted` added to `Record` + index `Record_organizationId_objectDefId_isDeleted_idx`, but **not enforced** in queries.
- Missing `onDelete` cascade on join/leaf tables → orphans on principal deletion: `PermissionSetAssignment` (user+permissionSet), `QueueMember` (queue+user), `RecordShare` legs, `PermissionSetGroupAssignment`, `AssignmentRule.targetUser`, etc.
- `@@unique([organizationId, apiName|name])` present on most tenant tables; some business labels rely on app checks.
- Better-auth `Session`/`Account`/`Verification` present and wired via the prisma adapter.
- `schema.pprisma` is a stale duplicate of `schema.prisma`.

## 7. UX Problems

- No `error.tsx`, `loading.tsx`, or `not-found.tsx` anywhere under `src/app/`; async surfaces fall back to the default error/404 shell or per-route try/catch blocks.
- TanStack Query provider is mounted but has **no consumers** (dead config).
- `Skeleton` is used only by `src/components/ui/sidebar.tsx`; other async surfaces have no placeholder.
- App switcher (`app-header.tsx:47`) uses `window.location.href` → full page reload; should use `next/navigation`.
- No command palette (Cmd+K).
- i18n is partial (~165 files use `t()`; some admin strings/hardcoded errors remain English).
- Dashboard widgets fetch with no shared suspense/loading treatment; a throwing widget can crash the shell.
- `src/app/(auth)/layout.tsx` renders decorative stat pills with **hard-coded numbers** ("Open Deals: 24", "Queue Items: 8", "Mentions: 5", "Import Jobs: 2") on the public landing page — cosmetic, but these are not real data.

## 8. Test Coverage Gaps

- 14 test files, all server-side (`lib/`, `lib/validation/`, `actions/`, `seeding/`), all **mock-based** (vi.mock of `@/lib/db`, `@/auth`, `@/lib/permissions`) — no live DB.
- `vitest.config.ts` excludes `src/app/**`, `src/components/ui/**`, `src/jobs/**` from coverage; only a `unit` (node) project exists.
- No tests for: API routes (`src/app/api/**`), admin actions (`src/actions/admin/**`), background jobs (`src/jobs/**`), or any client/UI/E2E layer.
- Security-critical paths are thin: `record-access.test.ts` tests `buildRecordAccessFilter`/`buildRecordAccessSql` independently but **no equivalence assertion**; `org-isolation.test.ts` is strong for tenant reads/writes; `convertLead.test.ts` covers lead conversion.
- No auth/middleware test harness (middleware is registered now; the test for it (`src/tests/security/middleware.test.ts`) exists but must be confirmed to exercise the real `src/middleware.ts`).

## 9. Recommended Implementation Order

1. **Wire soft-delete** (schema/migration already done). Filter `isDeleted:false` on every record read (`getRecords` Prisma + raw-SQL, `getRecord`, lookup resolutions, related lists, global search, dashboard metrics/list/chart, `moveRecord`); make `deleteRecord` set `isDeleted:true` (soft) with a separate admin hard-purge path; add `restoreRecord` + a trash filter in the list page + Restore UI. Add tests asserting deleted records are invisible and restore re-enables.
2. **Rate-limit auth routes** + harden the better-auth session cookie (`sameSite`, `secure` when HTTPS) + verify/extend CSRF posture. Add a pure, testable limiter + a middleware test.
3. **Centralize auth/authz** into one shared helper; remove the 7 duplicated `getUserContext()` copies; keep middleware as the first line of defense.
4. **Command palette (Cmd+K)** — searchable object/record/nav palette.
5. **Organization membership** — add `OrganizationMember` table + `switchOrganization` action + session re-issue; unblocks org switching (P0-1). Requires better-auth session re-issuance verification.
6. **Seed missing CRM objects** — Product, Note, Call, Meeting (Activity), Document — and wire task due-date/priority.
7. **Document store backend** — S3/MinIO adapter behind `src/lib/file-storage.ts`, env-driven, with the existing path-traversal guard retained.
8. **Lead lifecycle** — align picklist to spec stages, enforce transitions, full conversion (Company+Contact+Opportunity), add score/source.
9. **Dashboard** — ensure every widget key is DB-backed (already is); add the spec'd metrics where missing.
10. **Tests** — add a jsdom/react project for UI, API-route tests, admin-action tests, job tests; add a `filter vs sql` equivalence test for record access.
11. **CI/CD** — GitHub Actions (lint + test + build).
12. **Packaging** — commit `.env.example` (with S3/DB vars), remove `start.bat`/`yarn.lock`/`schema.pprisma`, portabilize `deploy-railway.sh`.
13. **Docs** — fix README auth/migration facts; write SECURITY, AUTHORIZATION, MULTI_TENANCY, DATABASE, API, DEPLOYMENT, P0_IMPLEMENTATION.
