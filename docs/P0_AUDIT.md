# P0 Audit — AuraCRM / openCRM

> ⚡ Verification date: **2026-09-22** — re-verified against the working copy. Several
> claims from the prior 2026-09-18 audit were **STALE** and have been corrected below.
> The "already present" items (soft-delete wiring, rate limiting, CSRF, bcrypt-cost
> consistency, `.env.example` storage vars) are now **PRESENT/WIRED** — see the Status
> column in §3. A new schema-only scaffold dated 2026-09-22 (NextCRM typed tables) was
> discovered and is flagged as **scaffolded, not implemented**. `.github/workflows/ci.yml`
> now exists; `prisma/schema.pprisma` does **not** exist (stale claim removed);
> `scripts/deploy-railway.sh` is **not** hardcoded (uses portable `SCRIPT_DIR`/`PROJECT_ROOT`);
> `start.bat` contains `start` (4 bytes), not empty.
>
> Audit date: 2026-09-18 (initial). Re-verified: 2026-09-22. Scope: static inspection of
> the working copy at `/home/cathenon/Desktop/openCRM` (3258-line `src/actions/standard/record-actions.ts`,
> 2448-line `prisma/schema.prisma`, `src/auth.ts`, `src/middleware.ts`,
> `src/lib/{permissions,record-access,file-storage,csv,auth-proxy-fix,auth/proxy,rate-limit-store}.ts`,
> `src/app/api/{search,notifications,files,fields}/*`, the 10 admin action files, the 7
> standard action files, all `src/app` routes, components, `src/tests` (21 files),
> `scripts/`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.env`,
> `prisma/migrations` (5 migrations), `.github/workflows/ci.yml`, `next.config.ts`).

## 1. Current Architecture

**Tech stack**
- Next.js 16 App Router (Turbopack dev), React 19.2.0 + React DOM 19.2.0, TypeScript 6. Prisma ORM 7.10 (`@prisma/adapter-pg` + `pg` ^8.23.0). Tailwind CSS v4, PostCSS, Radix UI + shadcn/ui, Lucide, Framer Motion.
- Authentication: **better-auth** 1.7.5 (`@better-auth/prisma-adapter`) with custom bcryptjs (**12 rounds** — consistent, see §4), the `username` plugin, and **JWT session strategy** (`cookieCache.strategy: "jwt"`). `jose` ^6.2.12 verifies the JWT in `src/lib/auth-proxy-fix.ts` (legacy credential compare) and `src/lib/auth/proxy.ts`. The session/user payloads are extended with `organizationId` (number) and `userType` (string) (`src/auth.ts`).
- Background jobs: pg-boss 11.1.2 (`src/lib/jobs/pgboss.ts`, `sharing-rule-worker.ts`). One worker entry handles two queues: sharing-rule recompute + import processing. Two-process runtime: web (`next dev`/`start`) + worker (`jobs:worker`).
- State: TanStack Query configured in `providers.tsx` but **unused** (dead provider). Zustand.
- Deployment assets present: `Dockerfile` (multi-stage node:20-alpine), `docker-compose.yml` (db + web + worker), `open-next.config.ts` + `wrangler.jsonc` (Cloudflare edge build config), `next.config.ts`.

**Multi-tenancy model**
- Multi-tenant EAV. `Organization` is the tenant root; every tenant-scoped model carries `organizationId Int` + an `@@index([organizationId,…])`.
- EAV core: `Record` (the row) → `FieldData[]` (cells) keyed by `fieldDefId` → `FieldDefinition` → `PicklistOption`. `FieldData` stores one cell per typed column (`valueText`, `valueSearch`, `valueNumber`, `valueDate`, `valueBoolean`, `valueLookup`, `valuePicklistId`+`valuePicklist`).
- `User.organizationId` is single-org (one tenant per user). The session carries that single `organizationId`.
- Routes grouped: `(auth)`, `(admin)`, `(standard)`; public shell at `/`, `/login`, `/register`.

## 2. Existing Features

**Auth & identity** — login/register email+password (bcrypt, 12 rounds), username plugin, legacy credential fallback (`src/lib/auth-proxy-fix.ts`).

**Access control (RBAC + record sharing)** — Permission Sets / Permission-Set Groups / Object Permissions / App Permissions; `Group`, `Queue`, `QueueMember`, `RecordShare` (READ/EDIT/DELETE) (`src/lib/permissions.ts`, `src/lib/record-access.ts`). Roles seeded as permission sets: Owner, Admin, Manager, Sales, Viewer (`src/lib/seeding/create-default-app.ts`). Record access = owner + queue + group + shares, evaluated two ways: `buildRecordAccessFilter` (Prisma where) and `buildRecordAccessSql` (raw SQL).

**Objects & metadata** — seeded system objects: `user`, `company`, `contact`, `opportunity`, `lead`, `case`, `task`. Object/field/picklist definitions, record-page layouts & assignments, list views (table + kanban via `kanban-board.tsx` + `@dnd-kit`), dashboard widgets, app nav items. Automation rules: assignment rules, sharing rules, duplicate rules, validation rules (with custom-logic expressions). Field-history tracking (`FieldHistory`), record-owner history (`RecordOwnerHistory`). Auto-number, external ID, lookups, picklists.

**Soft-delete (Record)** — ✅ **WIRED.** `Record.isDeleted Boolean @default(false)` at `schema.prisma:729`; index `Record_organizationId_objectDefId_isDeleted_idx` at `:748`; migration `20260918_add_soft_delete_to_record/migration.sql`. `deleteRecord` (`record-actions.ts:2965`) sets `isDeleted: true` via `tx.record.update` (NOT `tx.record.delete`); `purgeRecord` (`record-actions.ts:3073`) performs the hard `tx.record.delete` after clearing inbound lookup payloads; `restoreRecord` (`record-actions.ts:3020`) sets `isDeleted: false`. Reads filter `isDeleted: false` widely (44 matches incl. `getRecords` at `:1164`/`:1240`, `getRecord` at `:1492`, lookup resolutions). `includeDeleted` opt-in requires `canViewAll` (`record-actions.ts:1102,1487`). UI: `data-table.tsx:347` "View trash" toggle; `[objectApiName]/page.tsx:97` and `:143` pass `includeDeleted: isTrash`; `[recordId]/page.tsx:142` opens detail with `{ includeDeleted: isTrash }`. Tests: `src/tests/actions/soft-delete.test.ts` (7 cases asserting `tx.record.update` with `isDeleted: true` and that `tx.record.delete` is NOT called by `deleteRecord`; `purgeRecord` calls `tx.record.delete`). **The prior audit's claim that soft-delete was "NOT wired" was STALE.**

**Rate limiting** — ✅ **PRESENT.** `src/middleware.ts:67` `authRateLimiter.consume(ip)` → 429 + `Retry-After` header (`:84-99`). `authRateLimiter` from `src/lib/rate-limit-store.ts` (20 req/60s, in-memory `RateLimiter` with Redis `RedisRateLimiter` fallback at lines 10–17). Files: `rate-limit.ts`, `rate-limit-store.ts`, `rate-limit-redis.ts`. Tests: `src/tests/lib/rate-limit.test.ts` (9 cases). `.env.example` lines 43–45 (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_TOKEN`). **The prior audit's "Rate limiting … MISSING" claim was STALE.**

**CSRF defense** — ✅ **PRESENT.** `src/middleware.ts:84-99` rejects mutating non-auth API calls whose `Origin`/`Referer` doesn't match expected origin (`getExpectedOrigin`/`originMatches` with Referer fallback). SameSite default + explicit origin check in middleware. **The prior audit's "CSRF … MISSING" claim was STALE.** Minor hardening note: cookie `secure`/`sameSite` not EXPLICITLY set in better-auth session config (`src/auth.ts:80-91`), but middleware compensates.

**Rate limiting & CSRF also verified:** `src/lib/rate-limit.ts`, `src/lib/rate-limit-redis.ts` provide the `RateLimiter`/`RedisRateLimiter` implementations consumed by `rate-limit-store.ts`.

**Import** — async CSV: column mapping, preview, staged `ImportJob`/`ImportRow`, error logging, pg-boss worker (`import-processing.ts`).

**Global search** — server-side across readable objects, scoped by `organizationId` + record access (`src/app/api/search/global/route.ts`).

**Notifications** — `Notification` model + API (`src/app/api/notifications/route.ts`); unread count, mark-read, mark-all-read. Fires for queue/user assignment and `@mention`. `NotificationType` = QUEUE_ASSIGNMENT, USER_ASSIGNMENT, COMMENT_MENTION.

**Documents / attachments** — `FileAttachment` model, `/api/files/upload` + `/api/files/[id]` routes. Magic-byte MIME detection (PNG/JPEG/GIF/WebP/PDF/SVG), size + allow-list validation, path-traversal-safe **local disk** storage under `uploads/<org>/<record>/…`. `.env.example` lines 51–59 declare `S3_*` vars but **no S3/MinIO implementation** exists in `src/` (env ≠ implementation; see §3 P0-9).

**Chatter** — `RecordComment` + `RecordCommentMention`, soft-deleted comments, inline in record detail.

**Lead conversion** — `convertLead` Server Action: permission-checks lead `edit` + contact `create`, loads lead with access scoping, checks `is_converted` (Checkbox), creates a `contact` from first/last name/email/phone/title/company, then flags the lead converted and links the contact (`src/actions/standard/lead-actions.ts`). UI: `convert-lead-button.tsx`. Tested (`src/tests/actions/convertLead.test.ts`, 7 cases).

**Dashboard** — `DashboardPage` renders metric/list/chart widgets from server actions (`dashboard-actions.ts`) that query real DB data scoped by `organizationId` + permissions.

**Export** — CSV export (`export-actions.ts` → `getRecords` + `buildCsvFromRecords`) behind `/api/.../export/route.ts`, permission-scoped via `getRecords`.

**CI/CD** — ✅ `.github/workflows/ci.yml` exists: lint, `tsc --noEmit`, `test:unit`, security audit + Semgrep static analysis.

**i18n** — `src/i18n`; ~165 files use `t()`.

## 3. Missing / Incomplete P0 Features

| P0 | Area | Status | Finding | Evidence |
| --- | --- | --- | --- | --- |
| P0-1 | Org switching | **MISSING** | Single org per user; no membership model, no switcher UI. `User.organizationId` is the only org link. | `schema.prisma:204` (single `organizationId`); grep `OrganizationMember\|switchOrganization\|switchOrgId` → **0 matches**. |
| P0-1 | RBAC role model | PARTIAL | Roles are **permission sets** (Owner/Admin/Manager/Sales/Viewer), not a role enum. `User.userType` is only `admin`/`standard`. "Sales" ≈ Member. Capability exists; literal role names differ from spec. | `create-default-app.ts` ROLES; `UserType` enum = admin/standard. |
| P0-2 | Soft-delete (Record) | ✅ **WIRED** (was STALE) | Soft-delete is fully wired end-to-end: schema + migration exist and reads delete are soft. `deleteRecord` performs soft-delete; `restoreRecord` + trash view exist. | `schema.prisma:729` (`isDeleted Boolean @default(false)`), `:748` (index); migration `20260918_add_soft_delete_to_record`; `record-actions.ts:2965` (`isDeleted: true` via `tx.record.update`); `:3020` (restore); `:3073` (`purgeRecord` hard-deletes); `:1164/:1492` read filters; `:1102/:1487` `includeDeleted` requires `canViewAll`; `data-table.tsx:347`; `page.tsx:97,143`; `[recordId]/page.tsx:142`; tests `soft-delete.test.ts` (7 cases). |
| P0-2 | CRM object coverage | **PARTIAL** | Seeded EAV objects now include Product, Note, Call, Meeting, Document. | `src/lib/seeding/create-org-template.ts` now creates 12 EAV objects (`seededObjects` 12 entries: user, company, contact, opportunity, case, lead, task, product, note, call, meeting, document) with tests in `src/tests/seeding/create-org-template.test.ts`; `grep apiName:"product\|note\|call\|meeting\|document"` now matches in seeding. Caveat: schema typed-table scaffolding (`20260922_add_nextcrm_typed_tables`) still unwired (0 src references). |
| P0-3 | Contact 360 | PARTIAL | Record detail has related lists, field history, and comments. No unified **timeline** aggregating activities/tasks/notes; no Documents tab. Activities exist only as `task`. | `record-detail.tsx` (RelatedList, Field History, RecordCommentPanel). |
| P0-4 | Lead lifecycle | INCOMPLETE | Only a `status` picklist `[New, Working, Converted, Rejected]` + `is_converted` checkbox. No enforced state machine; does not match spec lifecycle (CONTACTED/QUALIFIED/UNQUALIFIED). `convertLead` creates a Contact but **not** a Company or Opportunity (partial). No lead `score`/`source` fields. The created `contact` is **not** populated back onto the lead's `contact` lookup (likely bug — `updateRecord` at `:92` sets `contact: contactId` but the lookup resolves only if the field exists). | `create-org-template.ts` lead fields (`:286` picklist = `["New","Working","Converted","Rejected"]`); `lead-actions.ts:81` (`createRecord("contact", …)` only); `:92` (`updateRecord` link). |
| P0-5 | Pipeline stages | **PARTIAL** | `probability`, `expected_revenue`, and `forecast_category` (Picklist, required, options `Pipeline/Best Case/Commit/Closed Won`) are now seeded on the opportunity EAV object. `OpportunityStage` enum (in `20260918_add_soft_delete_to_record`/`20260922_…` migrations) is still NOT wired to the EAV stage picklist; no stage-history/forecasting logic. | `create-org-template.ts:175-176` (probability/expected_revenue), `:185` (forecast_category field), `:195-199` (picklist seed); test `create-org-template.test.ts:187-195`. |
| P0-6 | Activities | **MISSING** | Only `task` object. No Call/Meeting/Note/Email as first-class activity types. Tasks lack due-date/priority fields in seed. (Schema has `crm_Activity_Type`/`crm_Activities`/`crm_ActivityLinks` — UNWIRED; see SCHEMA-ONLY SCAFFOLDING below.) | `create-org-template.ts` task fields (`:311-315` picklist = `["Not Started","In Progress","Completed","Deferred"]`); grep `activity\|call\|meeting\|note.*Activity` in actions → **0**. |
| P0-9 | Document store backend | **MISSING** | Attachments stored on **local disk** only. No S3/MinIO/object-store backend. `.env.example` declares S3 vars (lines 51–59) but **no implementation** in `src/` (`file-storage.ts` is local-disk only). | `src/lib/file-storage.ts:4` (`process.cwd()/uploads`); no `src/lib/storage/` provider; no S3 code in `src/`. |
| P0-14 | Command palette | **MISSING** | Missing. shadcn `Command` component exists but unused as a palette; no `/api/cmdk` route. Only i18n scaffolding. | `components/ui/command.tsx` exists; grep `cmdk\|CommandPalette` in app code → none wired; `en.ts:1488` `commandPalette` i18n key (stub). |
| P0-15 | Rate limiting | ✅ **PRESENT** (was STALE) | Auth-rate limiter wired in middleware. 20 req/60s per IP, Redis-backed fallback, 429 + `Retry-After`. | `src/middleware.ts:67` (consume), `:84-99` (429 response); `src/lib/rate-limit-store.ts:8-17`; `rate-limit.ts`, `rate-limit-redis.ts`; `src/tests/lib/rate-limit.test.ts` (9 cases); `.env.example:43-45`. |
| P0-15 | CSRF | ✅ **PRESENT** (was STALE) | Explicit origin/Referer check on mutating non-auth API requests in middleware. SameSite=Lax default from better-auth + explicit check. | `src/middleware.ts:84-99` (`getExpectedOrigin`, `originMatches`); `auth.ts:80-91`. |
| P0-15 | Cookie hardening | ⚠️ MINOR | Session cookie `secure`/`sameSite` not EXPLICITLY set in better-auth config (`auth.ts:80-91`); relies on SameSite=Lax default. Middleware CSRF check compensates. | `src/auth.ts:80-91`; `src/middleware.ts:84-99`. |
| P0-16 | Client/E2E/API/admin-action tests | **MISSING** | Only a `unit` (node) vitest project; excludes `src/app/**`, `src/components/ui/**`, `src/jobs/**`. 21 test files, all server-side/mock-based (mock `@/lib/db`, `@/auth`, `@/lib/permissions`). **No** client (jsdom/react) project, no E2E, no API route tests, no admin-action tests, no job tests. | `vitest.config.ts` (1 project: `unit`/`node`, `:33-39` coverage excludes); 21 `*.test.ts` files under `src/tests/` (all in `actions/`, `lib/`, `security/`, `seeding/`); `middleware.test.ts` exists but excludes app routes. |
| P0-18 | CI/CD | ✅ **PRESENT** (was STALE) | `.github/workflows/ci.yml` exists, runs on push/PR to main: lint, typecheck, unit tests, security audit + Semgrep. | `.github/workflows/ci.yml`. |
| misc | Stray file | **RESOLVED** (was STALE) | `prisma/schema.pprisma` does **not** exist — no typo duplicate at root or under `prisma/`. The stale claim is removed. | `find -name "*.pprisma"` → no results. |
| misc | Stub file | **RESOLVED** (was STALE) | `start.bat` is not empty; it contains `start` (4 bytes, no newline). Minor: Windows dev convenience stub, not a real entry point. | `xxd start.bat` → `start`. |
| misc | Stale lockfile | **KEEP** | `yarn.lock` (279 bytes, `# yarn lockfile v1` header) committed alongside real `pnpm-lock.yaml`. | `ls`/`xxd yarn.lock`. |
| misc | Hardcoded path | **RESOLVED** (was STALE) | `scripts/deploy-railway.sh` is **portable** — uses `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` + `PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"` (lines 42–44). No hardcoded path. | `scripts/deploy-railway.sh:42-44`. |

**SCHEMA-ONLY SCAFFOLDING (2026-09-22, NEW)**
A migration `20260922_add_nextcrm_typed_tables/migration.sql` and corresponding `schema.prisma` models add ~25 NextCRM typed tables (`crm_Activities`, `crm_AuditLog`, `Documents`, `crm_Document_Chunks`, `crm_Embeddings_Documents`, `Invoices`, `Invoice_LineItems`, `Invoice_Payments`, `Invoice_TaxRates`, `Invoice_Series`, `Invoice_Settings`, `Currency`, `ExchangeRate`, `EmailAccount`, `Email`, `EmailEmbedding`, `EmailsToContacts`/`EmailsToAccounts`, `CalendarConnection`, `crm_CalendarEvents`, `ApiToken`, `ApiKeys`, `Boards`, `Sections`, `Tasks`, `tasksComments`, `BoardWatchers`, `TodoList`, `Employees`, `ImageUpload`, `systemServices`) plus ~15 enums (`taskStatus`, `DocumentSystemType`, `DocumentProcessingStatus`, `Invoice_Status`/`Type`, `ExchangeRateSource`, `EmailFolder`, `crm_Activity_Type`/`Status`, `crm_Contracts_Status`, `crm_AuditLog_Action`, `crm_Product_Type`/`Status`, `crm_Billing_Period`, `crm_AccountProduct_Status`, `crm_Discount_Type`, `CalendarProvider`, `ApiKeyScope`, `ApiKeyProvider`). **CRITICAL: grep `src/**` for `crm_Activities\|crm_AuditLog\|ApiToken\|EmailAccount\|Invoice_\|from "@/lib/authz"` → 0 references.** NONE are wired into application code (no Server Actions, routes, or lib modules use them). These are **schema-only scaffolds for a future phase** — flag as "scaffolded, not implemented."

## 4. Security Problems

- **Soft-delete gap** — ✅ **RESOLVED.** Soft-delete is fully wired (see §2/§3). Reads filter `isDeleted:false`, `deleteRecord` soft-deletes, `purgeRecord` hard-deletes with cleanup. No isolation/correctness gap remains.
- **No rate limiting** — ✅ **RESOLVED.** Auth-rate limiter present and wired in `src/middleware.ts:67`, backed by `rate-limit-store.ts` (20 req/60s, Redis fallback). The prior "MISSING" claim was STALE.
- **CSRF** — ✅ **RESOLVED.** `src/middleware.ts:84-99` performs explicit Origin/Referer validation on mutating non-auth API requests. SameSite=Lax default + origin check = defense-in-depth. The prior "MISSING" claim was STALE.
- **Cookie hardening (minor).** Session cookie `secure`/`sameSite` not explicitly set in `src/auth.ts:80-91`. SameSite=Lax is the better-auth default; middleware CSRF check compensates. Recommend explicit `secure: true` + `sameSite: "lax"` for production hardening.
- **Admin enforcement is by-convention, not defense-in-depth at the route.** Middleware (`src/middleware.ts`) redirects `/admin` for non-admins; the real guard is duplicated `getUserContext()`/`checkPermission` calls inside each admin action (7 copies). Missing one on a future route = bypass. No shared abstraction.
- **Local file uploads.** No S3/MinIO, no virus scanning, no per-org quota. Path-traversal guard exists (`resolveStoragePath`, `file-storage.ts:32-41`). MIME is magic-byte detected (good) but extension is client-controlled (minor). `.env.example` has S3 vars (lines 51–59) but no implementation.
- **`scripts/deploy-railway.sh`** — ✅ **CORRECTED.** Not hardcoded; uses portable `SCRIPT_DIR`/`PROJECT_ROOT` (lines 42–44). The stale "hardcoded path" claim is removed. Still runs `railway ssh "npx prisma migrate deploy"` — acceptable for Railway. No code-level path leak.
- **Weak default secrets in docker-compose.** `docker-compose.yml` uses `JWT_SECRET: ${JWT_SECRET:-dev-secret-change-me}` (and same for `BETTER_AUTH_SECRET`/`NEXTAUTH_SECRET`). The committed `.env` at repo root **does** have real secrets (verified `JWT_SECRET`/`BETTER_AUTH_SECRET` are 43-char base64 values, **not** `dev-secret-change-me`), but the docker-compose fallback is a footgun for local/docker dev. Recommend removing the fallback default or failing loudly when unset. Also `NEXTAUTH_SECRET` appears in `.env` — obsolete (app uses better-auth, not NextAuth).
- **No `.env.example` for storage/S3** — ✅ **CORRECTED.** STALE claim. `.env.example` lines 51–59 now declare `STORAGE_PROVIDER`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`. (Env vars present but no S3 implementation — tracked separately under P0-9.)
- **`.env*`** is gitignored (correct) but README §Local Setup misstates auth (says NextAuth; code uses better-auth) and misstates migrations ("no checked-in migrations" — there are 5).
- **Stale `yarn.lock`** — 279-byte stub (`# yarn lockfile v1` + one entry for `@better-auth/prisma-adapter`) committed alongside real `pnpm-lock.yaml`. Causes confusion. `start.bat` contains only `start` (not empty, but not useful). **No `schema.pprisma` typo file exists** (stale claim removed).

## 5. Multi-Tenant Isolation

**Sound**
- `organizationId` is derived server-side from the better-auth session in every action (`getUserContext()`/`auth()`); never trusted from the client.
- All record reads/writes go through `organizationId`-scoped queries; `getRecords`/`getRecord`/`deleteRecord`/`moveRecord`/`exportRecords` and global search scope by the session org. Soft-delete reads filter `isDeleted:false` consistently.
- `FileAttachment` storage is sandboxed per org; `resolveStoragePath` rejects escapes.
- `RecordShare` subquery is constrained by `organizationId` (`buildRecordAccessSql`).
- Workers re-derive org from the DB, not from job payloads.

**Gaps**
- `getUserQueueIds` (`src/lib/record-access.ts:4-11`) queries `QueueMember` by `userId` with **no `organizationId` filter** — safe today only because a user belongs to one org; latent bug under multi-org.
- `buildRecordAccessFilter` (Prisma) and `buildRecordAccessSql` (raw SQL) duplicate the same access logic; there is **no equivalence test** asserting they stay in sync (drift → bypass).
- `getUserContext()` is duplicated across admin actions (no shared guard).
- Soft-delete now wired (gap resolved; see §3). `getRecords` Prisma path + raw-SQL path both filter `isDeleted` unless `includeDeleted` is opted in (requires `canViewAll`): `record-actions.ts:1164/1240/1492`.

## 6. Database Problems

- 52 models (47 original + ~5 NextCRM typed tables added in `20260922_add_nextcrm_typed_tables`); EAV core is `FieldData` (`valueText/valueSearch/valueNumber/valueDate/valueBoolean/valueLookup/valuePicklistId`).
- `isDeleted` on `Record` + index `Record_organizationId_objectDefId_isDeleted_idx` — now **enforced** in queries (44 `isDeleted: false` matches across `src/`).
- Missing `onDelete` cascade on join/leaf tables → orphans on principal deletion: `PermissionSetAssignment` (user+permissionSet), `QueueMember` (queue+user), `RecordShare` legs, `PermissionSetGroupAssignment`, `AssignmentRule.targetUser`, etc.
- `@@unique([organizationId, apiName|name])` present on most tenant tables; some business labels rely on app checks.
- Better-auth `Session`/`Account`/`Verification` present and wired via the prisma adapter.
- **No `schema.pprisma` typo file exists** (stale claim removed; `prisma/` contains only `schema.prisma`).
- 5 migrations: `20260914184005_init`, `20260915_add_email_verified_to_user`, `20260916073945_add_betterauth_columns`, `20260918_add_soft_delete_to_record`, `20260922_add_nextcrm_typed_tables`.

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

- 21 test files (corrected from prior "14"), all server-side (`lib/`, `lib/validation/`, `actions/`, `seeding/`, `security/`), all **mock-based** (vi.mock of `@/lib/db`, `@/auth`, `@/lib/permissions`) — no live DB.
- `vitest.config.ts` includes only a `unit` (node) project (`:14-23`); coverage excludes `src/app/**`, `src/components/ui/**`, `src/jobs/**` (`:33-39`). Also matches `src/**/*.test.tsx`.
- **No** tests for: API routes (`src/app/api/**`), admin actions (`src/actions/admin/**`), background jobs (`src/jobs/**`), or any client/UI/E2E layer.
- Security-critical paths are thin: `record-access.test.ts` tests `buildRecordAccessFilter`/`buildRecordAccessSql` independently but **no equivalence assertion**; `org-isolation.test.ts` is strong for tenant reads/writes; `convertLead.test.ts` covers lead conversion; `soft-delete.test.ts` (7 cases) verifies soft-delete wiring. `middleware.test.ts` exists but must be confirmed to exercise the real `src/middleware.ts`.
- ✅ **CI/CD added** (was STALE "missing"). `.github/workflows/ci.yml` runs lint + `tsc --noEmit` + `test:unit` + Semgrep + `pnpm audit`. No GitHub Actions for E2E/client/UI tests yet; the workflow only runs the `unit` vitest project.
- No jsdom/react project for component tests; no Playwright/Cypress E2E config.

## 9. Recommended Implementation Order

1. ✅ **DONE** — Soft-delete wiring (schema + migration + `deleteRecord`/`restoreRecord`/`purgeRecord` + read filters + trash UI + tests). **Removed from active worklist.**
2. ✅ **DONE** — Rate-limiting + CSRF middleware (`src/middleware.ts:67,84-99`). **Moved to "already done."** Remaining: harden better-auth cookie config (`secure`/`sameSite` explicit) — low priority.
3. **Centralize auth/authz** — one shared helper for `getUserContext()`/`checkPermission`; remove the 7 duplicated copies; ensure middleware is first line of defense for `/admin`.
4. **Organization membership** — add `OrganizationMember` table + `switchOrganization` action + session re-issue; unblocks org switching (P0-1). Requires better-auth session re-issuance verification.
5. **Command palette (Cmd+K)** — searchable object/record/nav palette; wire `/api/cmdk` route.
6. **Seed missing CRM objects** — Product, Note, Call, Meeting (Activity), Document — and wire task due-date/priority. Wire existing schema scaffolding (`crm_Activities`, `crm_ActivityLinks`, etc.) or remove.
7. **Document store backend** — S3/MinIO adapter behind `src/lib/file-storage.ts`, env-driven, retain path-traversal guard. `.env.example` vars present; implementation missing.
8. ✅ **PARTIAL** — seeded forecasting fields; OpportunityStage enum + stage-history/forecasting logic still pending.
9. **Lead lifecycle** — align picklist to spec stages, enforce state machine, full conversion (Company+Contact+Opportunity), populate created contact back onto lead's `contact` lookup, add score/source.
10. **Activities** — implement Call/Meeting/Note/Email as first-class objects or wire the `crm_Activities` scaffolding; add polymorphic ActivityLinks UI.
11. **Tests** — add a jsdom/react project for UI, API-route tests, admin-action tests, job tests; add a `filter vs sql` equivalence test for record access; extend `middleware.test.ts` to cover the real `src/middleware.ts`.
12. **CI/CD expansion** — extend `.github/workflows/ci.yml` to run the new test projects + build on Cloudflare/Railway.
13. **Packaging** — remove `start.bat`/`yarn.lock`, fix README auth/migration facts, portabilize `deploy-railway.sh` (already portable), write SECURITY, AUTHORIZATION, MULTI_TENANCY, DATABASE, API, DEPLOYMENT, P0_IMPLEMENTATION docs.

(End of file)
