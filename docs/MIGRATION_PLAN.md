# NextCRM — Migration Plan

**Project:** openCRM → NextCRM  
**Based on:** `NEXTCRM_SPECIFICATION.md`, `ARCHITECTURE_AUDIT.md`, `docs/P0_AUDIT.md`, `docs/NEXTCRM_AUDIT.md`, `docs/FEATURE_MATRIX.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/UI_AUTH_I18N_AUDIT.md`  
**Date:** 2026-09-22  
**Version:** 1.0  

---

## 1. Executive Summary

openCRM is a multi-tenant, metadata-driven CRM built on the Next.js App Router (React 19, TypeScript), PostgreSQL + Prisma ORM, and Better-Auth for authentication. Its defining architectural choice is a **Universal Object Engine** — an EAV (Entity-Attribute-Value) pattern where every tenant-scoped business record lives in a universal `Record` table with typed cells in `FieldData`, governed entirely by runtime metadata (`ObjectDefinition`, `FieldDefinition`, `ValidationRule`, etc.).

The platform already has a solid foundation: a two-layer authorization system (RBAC permission sets + record-level ownership/sharing filters), three-layer tenant isolation, secure bcrypt-hashed password authentication with JWT sessions, rate-limited auth endpoints, CSRF defense on mutating requests, transactional Server Actions for all writes, async CSV import via pg-boss, dashboards with configurable widgets, list views with kanban support, global search, chatter/comments, and field/owner audit history. Login is fixed (button label corrected, bcrypt cost aligned at 12).

This migration plan transforms openCRM into **NextCRM** — a complete, production-grade multi-tenant CRM platform incorporating CRM core (Accounts, Contacts, Leads, Opportunities, Activities), Projects & Tasks, Invoicing, Documents & Storage with S3/MinIO backend, a built-in IMAP email client, AI-powered enrichment and semantic search, an MCP server for AI-agent data access, audit logging, automation workflows, and an integration hub with webhooks and API tokens.

The transformation is executed across **16 sequential phases**, each delivering observable product value and leaving the system functional. The architecture splits into two strata: an **Engine** (the universal object engine, auth, permissions, tenant isolation, storage, email, search, AI, MCP, audit logging, background jobs, and observability) that underpins all data operations, and an **Experience** (CRM core modules, projects, invoicing, documents UI, email client, command palette, communication hub, reporting, automation, and admin tooling) that delivers end-user product surface.

**Total estimated effort:** 80–107 person-days across 3 feature teams, scheduled over 8–9 sprints.

---

## 2. Current State Assessment

### 2.1 What openCRM Has

Verified against `ARCHITECTURE_AUDIT.md` (1267-line schema, 3256-line `record-actions.ts`), `OPENCRM_AUDIT.md`, and `docs/P0_AUDIT.md`:

**Authentication & Identity**
- Better-Auth 1.7.x with bcrypt cost 12 (`src/lib/crypto.ts:5`), JWT sessions, username plugin, Prisma adapter
- Login is fixed: button label corrected to "Sign In" in `src/i18n/messages/en.ts:982`; bcrypt cost aligned at 12 in both `src/auth.ts:69` and `src/actions/auth.ts:72`
- Legacy credential fallback via `src/lib/auth-proxy-fix.ts`
- Session proxy via `jose` JWT verification (`src/lib/auth/proxy.ts`)

**Authorization (two-layer)**
- Layer 1: Permission sets/groups with CRUD flags (`src/lib/permissions.ts`, 304 lines) — `getUserPermissionSetIds`, `buildObjectAccessMap`, `checkPermission`, `getAvailableApps` (admin bypass removed at line 243)
- Layer 2: Record-level access via owner + queue + shares (`src/lib/record-access.ts`, 104 lines) — `buildRecordAccessFilter` (Prisma) + `buildRecordAccessSql` (raw SQL, org-scoped EXISTS subquery)
- User object write protection: `sanitizeUserObjectPermissions` strips write flags for the `user` object (`src/actions/admin/permission-actions.ts:9`)
- Queue ownership grants read-only access; edit/delete excluded from queue scope

**Tenant Isolation (3 layers — verified sound)**
1. Session-derived context: `getUserContext()` has `.length === 0`; `organizationId` from JWT only
2. Org-scoped queries: every Prisma query includes `organizationId` in WHERE
3. Record-level filter: `buildRecordAccessFilter` + `buildRecordAccessSql` with org-scoped `EXISTS` on `RecordShare`

**Universal Object Engine (EAV)**
- 14 field types: Text, TextArea, Number, Currency, Date, DateTime, Checkbox, Phone, Email, Url, Lookup, Picklist, File, AutoNumber
- Seeded objects: User, Company, Contact, Opportunity, Case, Lead, Task
- Soft-delete schema: `Record.isDeleted` + migration `20260918_add_soft_delete_to_record` (4 total migrations in `prisma/migrations/`)

**Data Operations**
- Transactional mutations via `db.$transaction` (`src/actions/standard/record-actions.ts`, 3256 lines)
- List view pipeline with raw SQL fallback for EAV field sorting (`buildFieldSortExpression`)
- Async CSV import via pg-boss (`import-processing.ts`, `sharing-rule-worker.ts`)
- Dashboards, list views (table + kanban), global search, notifications, chatter/comments
- File attachments: local disk, magic-byte MIME detection, path traversal guard (`resolveStoragePath`)

**Infrastructure**
- Docker: multi-stage `Dockerfile`, `docker-compose.yml` (db + web + worker), `open-next.config.ts`
- Worker: pg-boss 11.1.2 (`src/jobs/sharing-rule-worker.ts`)
- Rate limiting: in-memory sliding window (`src/lib/rate-limit.ts`), 20 req/60s per IP on auth endpoints, 429 + Retry-After
- CSRF: origin/referer validation in `src/middleware.ts`
- 104 unit tests in 18 files (Vitest, all server-side, mock-based)

### 2.2 What's Working Now

- **Login is fixed**: Button label corrected ("Get Started" → "Sign In" in `src/i18n/messages/en.ts:982` and `"Se connecter"` in `fr.ts:982`)
- **Bcrypt cost aligned**: Both auth paths use `BCRYPT_COST = 12` from `src/lib/crypto.ts`
- **Core CRM operations function**: record CRUD, list views, kanban drag-and-drop, dashboards, imports, global search, notifications, comments/mentions, file attachments
- **Tenant isolation is sound**: all three layers verified; `org-isolation.test.ts` (8 tests) confirms cross-org isolation
- **Background worker runs**: pg-boss handles sharing-rule recompute and import processing
- **Docker deployment works**: multi-stage Dockerfile, compose with db + web + worker

### 2.3 Key Gaps

| # | Gap | Impact | Phase to Fix |
|---|-----|--------|--------------|
| G-01 | Soft-delete schema exists but `deleteRecord` hard-deletes; reads never filter `isDeleted` | Deleted records remain visible; no restore | 1 |
| G-02 | Single org per user; no `OrganizationMember` model or switcher | Orgs are siloed; no cross-org membership | 2 |
| G-03 | No formal migration workflow; `prisma db push` only; stray `schema.pprisma` typo | Non-portable; confusion | 3 |
| G-04 | Missing CRM objects: Product, Note, Call, Meeting, Document, Activity, Contract, Target, TargetList | Incomplete CRM object coverage | 4 |
| G-05 | Only `task` object; no Projects & Tasks module (boards, task priorities, deadlines, watchers) | Missing project management | 5 |
| G-06 | No Invoicing module (no invoices, payments, tax, PDF, multi-currency) | Missing revenue management | 6 |
| G-07 | Local file storage only; no S3/MinIO backend; no content extraction or versioning | Not production-grade | 7 |
| G-08 | No outbound/inbound email; no SMTP/SES, no IMAP client, no email templates | No email communication | 8 |
| G-09 | No AI features: no embeddings, semantic search, summarization, enrichment, or MCP server | Missing modern CRM intelligence | 9 |
| G-10 | Server-side LIKE search only; no full-text index or provider abstraction | Search won't scale | 10 |
| G-11 | No MCP server (127 tools across 15 modules) | No AI-agent data access | 11 |
| G-12 | No centralized audit logging; `FieldHistory` is per-record only, no admin audit log page | Poor auditability | 12 |
| G-13 | No automation: no funnel timers, stage transitions, auto-tasks, approval gates, campaigns | No workflow automation | 13 |
| G-14 | No integration hub: no webhooks, no API tokens, no REST connectors | No extensibility | 14 |
| G-15 | No client/E2E tests; dead TanStack Query provider; no error/loading/not-found pages; no CI/CD | Poor UI quality; no automated gate | 15 |
| G-16 | In-memory rate limiter only; no Redis; security headers not configured; dependency scan absent | Not production-grade security | 16 |

---

## 3. Target State

NextCRM (per `NEXTCRM_AUDIT.md`) provides the complete target product surface:

### Engine Layer
- **Authentication**: Better-Auth with email OTP (6-digit, 5-min expiry via Resend), Google OAuth, admin plugin with access control — aligned to openCRM's existing better-auth foundation
- **Authorization**: RBAC with 3 roles (admin/manager/user) via Better-Auth `ac` statements + object-level scoping helpers from `lib/authz/scopes/crm.ts`; openCRM's permission set model preserved for fine-grained control
- **Universal Object Engine**: openCRM's EAV core preserved as the metadata spine for custom objects; standard CRM entities adopt typed Prisma tables
- **Tenant Isolation**: Enhanced three-layer model (session-derived context → org-scoped queries → org-scoped record access filter) — hardened for multi-org membership
- **Document Storage**: S3/MinIO-backed `StorageProvider` abstraction with local filesystem fallback; presigned PUT URLs; per-org isolation
- **Email**: Bidirectional email with IMAP sync (incremental via `inboxLastUid`/`sentLastUid`), SMTP/SES provider abstraction, Resend for transactional, React Email templates, AES-256-GCM encryption of account credentials
- **Search**: PostgreSQL `tsvector` with GIN index + `SearchProvider` abstraction; combined with pgvector semantic search via OpenAI embeddings; ranking via `ts_rank_cd` + exact-match boost
- **AI**: OpenAI/Anthropic provider abstraction; vector embeddings (1536-dim, HNSW); record summarization; "Find Similar"; E2B enrichment agents with confidence scoring; 3-tier API key resolution
- **MCP Server**: 127 tools across 15 modules via `mcp-handler`; Bearer token auth (`nxtc__` prefix, SHA-256 hashed); streamable HTTP + SSE transport; scope adapters delegate to `lib/authz` helpers
- **Audit Logging**: Centralized `AuditLog` table with diff engine; per-entity History tab with restore; admin global audit log page
- **Automation**: Funnel timers, stage transitions, auto-tasks, approval gates, campaign sequences via Inngest + pg-boss
- **Reporting**: Reports builder with filters, groupings, chart selection; async generation; scheduled delivery
- **Integration Hub**: Outbound webhooks with HMAC-SHA256 + retry; API tokens with granular scopes; REST connector framework
- **Observability**: Redis-backed rate limiting + query cache; slow-query logging (>500ms); health check endpoint; OpenTelemetry-style spans

### Experience Layer
- **CRM Core**: Accounts (watchers, account products), Contacts (social links, tags, enrichment), Leads (full lifecycle, state machine, complete conversion), Opportunities (approval gate, stage history, probability, forecast, line items, FX), Contracts (renewal reminders), Products (catalog), Activities (polymorphic linking)
- **Projects**: Kanban boards (`@dnd-kit`), tasks with priority/due dates/comments, watchers, board sharing
- **Invoicing**: Full module with lifecycle, series numbering, tax engine, multi-currency + FX, payments, PDF export, email delivery
- **Documents**: Storage with versioning, content extraction, enrichment, thumbnail generation, 6 junction links
- **Email Client**: IMAP inbox, SMTP/SES sending, email-to-CRM linking, semantic embeddings, incremental sync
- **Command Palette**: Cmd+K searchable palette returning nav + records + objects
- **Communication Hub**: Daily/weekly digests, unified communication view, AI-powered smart grouping (Phase 9/11 integration)

---

## 4. Migration Strategy

### 4.1 Engine vs Experience Architecture

**Engine (infrastructure, data, and platform layers)** — Phases 1, 2, 3, 7, 8, 9, 10, 11, 14, 15, 16

The Engine is the underlying platform that all user-facing features depend on:

- **Server Actions as the mutation boundary** — All CRUD operations go through `"use server"` Server Actions with Zod validation. No direct DB access from components.
- **Zero-arg context extraction** — `getUserContext()` has `.length === 0`; `organizationId` is derived solely from the session JWT, never accepted from client input.
- **Transactional mutations** — `db.$transaction` wraps all multi-table writes to ensure atomicity.
- **Two-layer authorization** — `checkPermission` (object-level) then `buildRecordAccessFilter` / `buildRecordAccessSql` (record-level), both org-scoped.
- **Provider abstraction pattern** — `StorageProvider` (Phase 7), `EmailProvider` (Phase 8), `SearchProvider` (Phase 10), `AiProvider` (Phase 9) interfaces with env-driven factory selection. Default deployments run with no external dependencies (local storage, console email, native PostgreSQL search).
- **Background processing** — pg-boss for reliability-critical queues (import, sharing recompute, webhooks, reports); Inngest for AI enrichment and complex orchestration.
- **Security invariants preserved** — tenant isolation at query + record level; existence leak prevention (`getRecord` returns `NOT_FOUND`); CSV formula injection mitigation; path traversal guard; soft-delete preservation; bcrypt cost 12.

**Experience (user-facing product modules)** — Phases 4, 5, 6, 12, 13

The Experience is the product surface delivered on top of the Engine:

- **CRM Core modules** (Phase 4) — Accounts, Contacts, Leads, Opportunities, Activities seeded as EAV objects with full field sets and permission set assignments
- **Projects module** (Phase 5) — typed Prisma models (Boards, Sections, Tasks, tasksComments, BoardWatchers) with Kanban UI
- **Invoicing module** (Phase 6) — typed Prisma models (Invoices, LineItems, TaxRates, Series, Payments, Activity) with full lifecycle
- **Communication hub** (Phase 12) — enhanced notifications, email digests, unified communication view
- **Automation** (Phase 13) — funnel timers, stage transitions, auto-tasks, approval gates, campaign sequences

### 4.2 Phased Integration Approach

Each phase introduces one cohesive capability. The Engine is built first (auth model → schema → storage → email → AI → search → MCP → audit), then the Experience modules are layered on (CRM core → projects → invoicing), then automation and integrations, and finally testing and security hardening.

Key integration decision points:
- **Soft-delete wiring (Phase 1)** must complete before search (Phase 10) and MCP (Phase 11) can safely operate — deleted records must be invisible to all read paths
- **Multi-org membership (Phase 2)** must complete before any module relying on session re-issuance or org-scoped tokens
- **Database schema & tenant isolation (Phase 3)** formalizes the migration workflow (Prisma Migrate) and hardens isolation — required before all typed table modules
- **Storage backend (Phase 7)** must exist before email client (Phase 8) can store attachments and before invoicing (Phase 6) can generate PDFs
- **AI features (Phase 9)** provide embeddings/semantic search that Phase 10 (Search) combines with keyword search
- **Search infrastructure (Phase 10)** enables command palette, AI NL search, and MCP tool search
- **All feature phases** must complete before Phase 15 (Testing) and Phase 16 (Security Hardening)

### 4.3 Data Migration Strategy

- New schemas use **Prisma Migrate** with committed migrations under `prisma/migrations/` (formalized in Phase 3)
- openCRM currently uses `prisma db push` for the core schema — Phase 3 introduces a formal migration workflow for all new models
- Soft-delete `isDeleted` is already in the schema + migration; Phase 1 wires it at the application layer
- Data migration for multi-org: existing users with `User.organizationId` get an `OrganizationMember` row (Phase 2 one-time script)
- Soft-delete preservation: inbound lookup payloads are nulled during hard purge to prevent dangling references

---

## 5. Phase-by-Phase Plan

### Phase 1 — Audit & Documentation (DONE)

**Description**
All audit findings have been documented. This phase is complete: `ARCHITECTURE_AUDIT.md`, `docs/P0_AUDIT.md`, `docs/NEXTCRM_AUDIT.md`, `docs/NEXTCRM_SPECIFICATION.md`, `docs/FEATURE_MATRIX.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `docs/UI_AUTH_I18N_AUDIT.md` have been created. The login button bug has been fixed (button label corrected in `src/i18n/messages/en.ts:982` and `fr.ts:982`), and bcrypt cost has been aligned at 12.

**Key deliverables**
- `ARCHITECTURE_AUDIT.md` — architecture + security assessment (1267-line schema, 3256-line record-actions)
- `docs/P0_AUDIT.md` — working-copy correctness audit with gaps identified
- `docs/NEXTCRM_AUDIT.md` — comprehensive feature inventory of the NextCRM reference implementation
- `docs/NEXTCRM_SPECIFICATION.md` — cahier des charges (target state + 16-phase migration)
- `docs/FEATURE_MATRIX.md` — side-by-side comparison with migration decisions (KEEP/ADAPT/MERGE/REBUILD/REPLACE/REMOVE/ADD)
- `docs/IMPLEMENTATION_ROADMAP.md` — phase-by-phase file targets + sprint schedule
- `docs/UI_AUTH_I18N_AUDIT.md` — login bug fix, auth architecture, i18n system review
- Login button bug fixed: `auth.signIn.submitButton` resolves to "Sign In" (was "Get Started")
- Bcrypt cost aligned: `BCRYPT_COST = 12` in `src/lib/crypto.ts` used by both `src/auth.ts:69` and `src/actions/auth.ts:72`

**Files affected**
- Create: `ARCHITECTURE_AUDIT.md`, `docs/P0_AUDIT.md`, `docs/NEXTCRM_AUDIT.md`, `docs/NEXTCRM_SPECIFICATION.md`, `docs/FEATURE_MATRIX.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/UI_AUTH_I18N_AUDIT.md`, `docs/MIGRATION_PLAN.md`
- Modify: `src/i18n/messages/en.ts:982` (`"Get Started"` → `"Sign In"`), `src/i18n/messages/fr.ts:982` (`"Commencer"` → `"Se connecter"`)

**Risk level:** None — documentation only; login fix is a single-string change verified against the component at `src/components/auth/clean-minimal-sign-in.tsx:90-96`.

**Estimated effort:** Done (completed during audit)

**Dependencies**
None.

---

### Phase 2 — Authentication Foundation (NextCRM auth model integrated)

**Description**
Integrate the NextCRM authentication model into openCRM's existing Better-Auth foundation. Add multi-org membership via the `OrganizationMember` model, enable session re-issuance for org switching, integrate the Better-Auth admin plugin with access control statements (replacing the `UserType` enum-only model), and add OAuth provider hooks. Login is already fixed (button label + cost alignment at 12).

**Key deliverables**
- `OrganizationMember` Prisma model with `role` and `isDefault` fields — users belong to multiple orgs
- `switchOrganization(orgId)` Server Action — re-issues session JWT with new `organizationId` via Better-Auth `updateSession()`
- Org-switcher UI component in app header
- `getUserContext()` updated to resolve active org from session
- Better-Auth admin plugin with access control statements: admin (all permissions), manager (user→read, crm→CRUD, project→CRUD, report→read/export, settings→read), user (user→read, crm→read, project→read, report→read, settings→read)
- OAuth provider hooks (Google OAuth via BetterAuth `socialProviders.google`) — scaffolding for Phase 8 email client calendar sync
- `assertScopeOrNotFound` helper — converts `AuthorizationError` → `NOT_FOUND` to prevent existence oracle
- One-time data migration: existing `User.organizationId` rows get an `OrganizationMember` record

**Files affected**
- Modify: `prisma/schema.prisma` (add `OrganizationMember`, update `User`/`Organization` relations), `src/auth.ts` (admin plugin, JWT config, access control), `src/lib/auth/context.ts` (active org resolution), `src/middleware.ts` (org-switch session handling)
- Modify: `src/actions/auth.ts` (already uses `BCRYPT_COST`; align with admin plugin), `src/actions/admin/user-actions.ts` (add `switchOrganization`, `getOrganizationMemberships`)
- Create: `src/actions/standard/org-actions.ts` (`getUserOrganizations`, `switchOrganization`), `src/components/shared/org-switcher.tsx`, `src/lib/auth/permissions.ts` (RBAC statements)
- Schema: `OrganizationMember` model (new migration `20260922_add_organization_member`)

**Risk level:** High — multi-org breaks single-org assumptions across the entire codebase; every query must be verified for org scoping. Session re-issuance must not create stale-token vulnerabilities.

**Estimated effort:** 4–6 days
- `OrganizationMember` model + relations + migration: 1 day
- `switchOrganization` Server Action + session re-issuance: 1 day
- `getUserContext()` update + auth-proxy alignment: 0.5 day
- Better-Auth admin plugin + access control statements: 1 day
- Org switcher UI component: 0.5 day
- One-time data migration script: 0.5 day
- Tests (multi-org isolation, session re-issuance, role mapping): 1 day

**Dependencies**
Phase 1 — audit is complete; nothing blocks auth foundation beyond having the audit findings documented.

---

### Phase 3 — Database Schema & Tenant Isolation

**Description**
Formalize the database migration workflow (replacing `prisma db push` with Prisma Migrate) and harden tenant isolation across all new and existing models. This phase establishes the schema foundation that every subsequent phase depends on.

**Key deliverables**
- Replace `prisma db push` with formal `prisma migrate dev` / `prisma migrate deploy` workflow
- Commit existing `Record.isDeleted` in a proper migration (already exists as `20260918_add_soft_delete_to_record` — verify it's committed and formal)
- New migration: `20260922_add_deleted_at_to_record` (adds `deletedAt` timestamp alongside `isDeleted`)
- New migration: `20260922_add_organization_member` (if not already in Phase 2)
- Fix stray `schema.pprisma` typo (delete the duplicate)
- Tenant isolation hardening:
  - `getUserQueueIds` (`src/lib/record-access.ts:4-11`) queries `QueueMember` by `userId` with **no `organizationId` filter** — latent bug under multi-org. Add `organizationId` filter.
  - `buildRecordAccessFilter` and `buildRecordAccessSql` must include `isDeleted: false` by default (so search Phase 10 works correctly)
- Delete stray files: `yarn.lock` (stale, 279 bytes vs real `pnpm-lock.yaml`), `start.bat` (empty), `schema.pprisma` (typo)
- Update `docker-entrypoint.sh` to use `prisma migrate deploy` (not `db push`)
- Update `.env.example` with S3/DB vars guidance
- Portabilize `scripts/deploy-railway.sh` (remove hardcoded path)
- Fix README §Local Setup: auth uses better-auth (not NextAuth); migrations exist (4 migrations, not zero)

**Files affected**
- Modify: `prisma/config.ts` (migration config), `src/lib/record-access.ts` (add `isDeleted: false` to filters, add `organizationId` to `getUserQueueIds`), `src/middleware.ts` (if auth changes)
- Modify: `docker-entrypoint.sh` (from `db push` to `migrate deploy`), `.env.example` (add storage/S3 vars, DB port notes), `README.md` (fix auth + migrations facts)
- Delete: `prisma/schema.pprisma`, `yarn.lock`, `start.bat`, `scripts/deploy-railway.sh` (replace with portable version)
- Schema: `Record.deletedAt: DateTime?`, `OrganizationMember` model, GIN index on `searchVector` (prepared for Phase 10)

**Risk level:** Medium — deleting stray files and changing migration workflow could affect existing deployments. Tenant isolation fix is critical (latent cross-org bug in queue queries).

**Estimated effort:** 3–4 days
- Formal migration workflow + migrations: 1 day
- Tenant isolation hardening (`getUserQueueIds` org filter, `isDeleted` in record-access): 0.5 day
- Stray file cleanup + Dockerfile/docker-compose update: 0.5 day
- `.env.example` + README fixes: 0.5 day
- Portabilize deployment scripts: 0.5 day
- Tests (cross-org queue isolation, migration verification): 1 day

**Dependencies**
Phase 2 — `OrganizationMember` model and multi-org membership are established in Phase 2; Phase 3 formalizes the migration workflow around it.

---

### Phase 4 — CRM Core (Accounts, Contacts, Leads, Opportunities, Activities)

**Description**
Complete the CRM core module set by seeding Product, Note, Call, Meeting, and Document as first-class EAV objects, and ensuring the existing Company (Account), Contact, Lead, Opportunity, Case, Task objects have their full field sets per NextCRM's model. This phase is seeding-only — no UI changes.

**Key deliverables**
- New EAV object definitions seeded in `create-org-template.ts`: Product, Note, Call, Meeting, Document
- Product fields: name (required), sku, price (Currency), description, company (lookup)
- Note fields: title (required), body (TextArea), related_to (lookup, polymorphic)
- Call fields: subject (required), status (picklist), direction (picklist), duration (Number), related_to (lookup)
- Meeting fields: subject (required), start (DateTime), end (DateTime), status (picklist), related_to (lookup)
- Document fields: title (required), file (File), version (Text), related_to (lookup)
- Activity unified object: `activity_type` picklist (CALL, MEETING, TASK, EMAIL, NOTE), `related_to` (polymorphic lookup), `status`, `subject`, `description`, `direction`, `duration`, `start_time`, `end_time`
- Contract object: title, value (Currency), startDate, endDate, renewalReminderDate, account (lookup), status (picklist), currency
- Target + TargetList objects: first_name, last_name, email, phones, company, social links, do_not_email, tags, notes, converted_account/contact
- Dependency index entries (`MetadataDependency`) for all new objects
- New objects added to default app nav items and permission set object permissions in `create-default-app.ts`

**Files affected**
- Modify: `src/lib/seeding/create-org-template.ts` (add `createProductObject`, `createNoteObject`, `createCallObject`, `createMeetingObject`, `createDocumentObject`, `createActivityObject`, `createContractObject`, `createTargetObject`, `createTargetListObject`), `src/lib/seeding/create-default-app.ts` (add objects to `objectDefs[]`, update permission matrices)
- Create: none (seeding-only)
- Schema: none (all use existing EAV engine)

**Risk level:** Low — purely additive seeding; no existing data is affected. New orgs get the objects; existing orgs run the seeding migration script.

**Estimated effort:** 3–4 days
- Object definitions + fields (9 objects): 1.5 days
- Picklists (Call/Meeting status, Contract status, Activity type, Target lead source): 0.5 day
- Permission set updates for new objects: 0.5 day
- Dependency index entries: 0.5 day
- Tests (assert objects + fields are created, permission sets include new objects): 1 day

**Dependencies**
Phase 3 — formal migration workflow ensures seeding changes are properly tracked and applied.

---

### Phase 5 — Projects & Tasks

**Description**
Build the Projects module: Kanban-style boards with sections, drag-and-drop tasks via `@dnd-kit`, task comments, watchers, and board sharing. Uses typed Prisma models (Boards, Sections, Tasks, tasksComments, BoardWatchers) alongside the EAV engine for CRM entities.

**Key deliverables**
- `Boards` model: description, favourite, icon, position, title, visibility (public/private), sharedWith[], createdBy, watchers (BoardWatchers junction)
- `Sections` model: board FK, title, position
- `Tasks` model: content, title, position, priority, section FK, tags (JSON), user (assignee), taskStatus (ACTIVE/PENDING/COMPLETE), comments[]
- `tasksComments` model: comment, task FK, user, assigned_crm_account_task FK (links to CRM tasks)
- `BoardWatchers` junction: board_id + user_id for watch/unwatch pattern
- Kanban boards with `@dnd-kit/core` + `@dnd-kit/sortable` drag-and-drop
- Tasks with comments (both `Tasks.comments` and `crm_Accounts_Tasks` comments)
- Tasks with priority, due dates, status
- Projects dashboard with widget grid
- Document-to-task linking via `DocumentsToTasks` and `DocumentsToCrmAccountsTasks` junctions (Phase 7 dependency)

**Files affected**
- Create: `app/[locale]/(routes)/projects/boards/[boardId]/page.tsx`, `app/[locale]/(routes)/projects/tasks/[taskId]/page.tsx`, `app/[locale]/(routes)/projects/dashboard/`
- Create: `src/lib/projects/board-actions.ts` (createBoard, updateBoard, deleteBoard, getBoards, watchBoard, shareBoard), `src/lib/projects/task-actions.ts` (createTask, updateTask, deleteTask, getTasks, addComment, watchTask)
- Create: `src/components/projects/board.tsx`, `src/components/projects/task-list.tsx`, `src/components/projects/task-card.tsx`, `src/components/projects/dashboard.tsx`
- Schema: `Boards`, `Sections`, `Tasks`, `tasksComments`, `BoardWatchers`, `TodoList` (new models with `organizationId`)

**Risk level:** Medium — typed table models introduce a parallel persistence path alongside EAV; must maintain tenant isolation (`organizationId`) and record-level access consistency. Board sharing uses `sharedWith[]` array (NextCRM pattern) vs openCRM's `Group`/`RecordShare` model — merge decision required.

**Estimated effort:** 6–8 days
- Schema models (Boards, Sections, Tasks, tasksComments, BoardWatchers) + migration: 1.5 days
- Board CRUD + Kanban drag-drop Server Actions: 2 days
- Task CRUD + comments + watchers Server Actions: 1.5 days
- Board/task UI components: 1.5 days
- Tests (board CRUD, task drag-drop, share scoping, org isolation): 1 day

**Dependencies**
Phase 4 — CRM objects exist for `crm_Accounts_Tasks` linking; Activity timeline for task-to-CRM-entity display.

---

### Phase 6 — Invoicing

**Description**
Add a complete invoicing module with typed Prisma models: invoice lifecycle, series-based numbering, tax engine with VAT buckets, multi-currency with FX (ECB-sourced), payments, PDF export, email delivery, and admin settings.

**Key deliverables**
- Invoice types: INVOICE, CREDIT_NOTE, PROFORMA, RECEIPT (status lifecycle: DRAFT → ISSUED → PAID/PARTIALLY_PAID/CANCELLED/OVERDUE/DISPUTED/REFUNDED/WRITTEN_OFF) with permission guards (only drafts editable)
- `Invoice_Series` model: prefix/suffix templates (e.g. `INV-2026-0001`), `resetPolicy` (YEARLY), per-series counters
- `Invoice_TaxRates` model: per-line VAT rates, VAT summary buckets
- `Invoice_LineItems` model: quantity, unit_price, discount (PERCENTAGE/FIXED), tax rate, line_subtotal/vat/total
- Multi-currency: `Currency`, `ExchangeRate` (ECB-sourced), `fxRateToBase`, `baseCurrency`
- `Invoice_Payments` model: partial/full payments, auto-computed `balanceDue`
- PDF generation via `@react-pdf/renderer` with i18n-aware templates at `/api/invoices/[id]/pdf`
- Email delivery via Resend + React Email templates (Phase 8 dependency)
- `Invoice_Activity` model: audit trail per invoice
- Admin settings: `/admin/invoices/` (tax rates, series, currencies, company details)

**Files affected**
- Create: `app/[locale]/(routes)/invoices/`, `lib/invoices/fx.ts`, `lib/invoices/numbering.ts`, `lib/invoices/permissions.ts`, `lib/invoices/search.ts`, `lib/invoices/pdf/` (render.tsx, templates/), `actions/invoices/` (create, update, delete, send, pay, void)
- Create: `src/components/invoices/`, `src/emails/` (React Email templates), `app/api/invoices/[id]/pdf/route.ts`
- Schema: `Invoices`, `Invoice_LineItems`, `Invoice_Payments`, `Invoice_Attachments`, `Invoice_Activity`, `Invoice_TaxRates`, `Invoice_Series`, `Invoice_Settings`, `Currency`, `ExchangeRate` (new models)

**Risk level:** High — introduces a new typed-table domain alongside EAV; tenant isolation must be enforced independently. FX rate sync requires external connectivity (ECB feed). Decimal serialization must be handled (`serializeDecimals` to avoid React boundary issues).

**Estimated effort:** 6–8 days
- Schema models + migrations: 1.5 days
- Invoice CRUD Server Actions + lifecycle state machine: 2 days
- Tax engine + multi-currency + FX rate sync: 1.5 days
- PDF export + email delivery: 1 day
- Admin settings UI: 1 day
- Tests (lifecycle, totals, FX, PDF generation, decimal serialization): 1 day

**Dependencies**
Phase 7 (storage backend for PDF), Phase 8 (email for delivery), Phase 4 (Document object for attachments), Phase 2 (org membership for multi-tenant scoping).

---

### Phase 7 — Documents & Storage

**Description**
Make file storage pluggable behind a `StorageProvider` interface with local filesystem (default, preserved) and S3/MinIO adapters. Add presigned PUT URLs, content extraction, document versioning, processing status pipeline, and per-org isolation.

**Key deliverables**
- `StorageProvider` interface in `src/lib/file-storage.ts`: `save(file, path) → storageKey`, `read(storageKey) → stream`, `delete(storageKey)`, `getUrl(storageKey) → url`
- `LocalProvider`: extracted from current behavior (path traversal guard retained via `resolveStoragePath`)
- `S3Provider`: `@aws-sdk/client-s3` with `forcePathStyle: true` for MinIO; `STORAGE_PROVIDER=local|s3` env config
- Presigned PUT URLs for direct browser uploads (`app/api/upload/presigned-url/route.ts`)
- Per-org bucket prefix or path isolation
- Content extraction: `mammoth` (docx → `content_text`), `pdf-parse` (PDF text), `sharp` (thumbnail generation)
- Processing status pipeline: PENDING/PROCESSING/READY/FAILED
- Document versioning: `parent_document_id` / `child_versions`
- `FileAttachment.storageProvider` field (backward compatible)

**Files affected**
- Modify: `src/lib/file-storage.ts` (extract interface + LocalProvider + factory), `src/app/api/files/upload/route.ts` (use factory), `src/app/api/files/[id]/route.ts` (use factory)
- Create: `src/lib/storage/types.ts` (`StorageProvider` interface), `src/lib/storage/local-provider.ts`, `src/lib/storage/s3-provider.ts`, `src/lib/storage/factory.ts`
- Modify: `.env.example` (add `STORAGE_PROVIDER`, `S3_*` vars)
- Schema: `FileAttachment.storageProvider: String` (default `"local"`)

**Risk level:** Medium — existing local file access must remain functional; S3 adapter must handle presigned URL expiry; content extraction adds new dependencies (`mammoth`, `pdf-parse`, `sharp`).

**Estimated effort:** 5–6 days
- StorageProvider interface + LocalProvider extraction: 1 day
- S3Provider + factory: 1.5 days
- Presigned PUT URL endpoint: 1 day
- Content extraction + processing status + versioning: 1.5 days
- Tests (factory, path traversal, local vs S3, content extraction): 1 day

**Dependencies**
Phase 4 — Document object seeded so storage can link to Document records; Phase 3 formal migration workflow for schema changes.

---

### Phase 8 — Email Client

**Description**
Abstract email sending behind an `EmailProvider` interface (SMTP + SES), add a template system, integrate a built-in IMAP email client with incremental sync, email-to-CRM linking, and transaction email delivery. Email account credentials are encrypted with AES-256-GCM.

**Key deliverables**
- `EmailProvider` interface + SMTP provider (`nodemailer`) + SES provider (`@aws-sdk/client-ses`) + `ConsoleEmailProvider` (dev fallback) in `src/lib/email/`
- Email template system: `{field}` interpolation, stored in DB (`EmailTemplate` model) for admin editing
- Transactional email types: assignment, mention, password reset, digest (Phase 12), report ready, workflow alert
- IMAP email client: `EmailAccount` model with encrypted passwords (AES-256-GCM via `lib/email-crypto.ts`), incremental sync via `inboxLastUid`/`sentLastUid`
- `imap-safety.ts` guards against unsafe IMAP operations
- Email-to-CRM linking: `EmailsToContacts`, `EmailsToAccounts` junction tables; `link-crm` job matches emails to CRM entities
- Email embedding: `EmailEmbedding` (vector) for semantic email search (Phase 9 dependency)
- Background queue `email.send` via pg-boss for reliable delivery + retry
- Calendar sync: Google Calendar OAuth2 via `CalendarConnection` (encrypted refresh tokens)

**Files affected**
- Modify: `src/jobs/sharing-rule-worker.ts` → extend to `src/jobs/nextcrm-worker.ts` handling `email.send`, `email.sync`, `webhook.deliver`, `ai.process`, `report.generate` queues
- Create: `src/lib/email/types.ts`, `src/lib/email/smtp-provider.ts`, `src/lib/email/ses-provider.ts`, `src/lib/email/templates.ts`, `src/lib/email/service.ts`, `src/lib/email/imap-safety.ts`
- Create: `src/actions/emails/email-actions.ts` (send, sync, link), `src/lib/jobs/email-jobs.ts` (`queueEmail`, `syncEmails`)
- Create: `src/components/emails/` (inbox, compose, thread), `app/[locale]/(routes)/emails/`
- Schema: `EmailTemplate`, `EmailAccount`, `Email`, `EmailsToContacts`, `EmailsToAccounts`, `EmailEmbedding`, `CalendarConnection`, `crm_CalendarEvents` (new models)

**Risk level:** High — email delivery reliability, IMAP sync correctness (UID tracking, duplicate prevention), encryption key management (`EMAIL_ENCRYPTION_KEY`). New dependencies: `nodemailer`, `@aws-sdk/client-ses`, `imap`, `mailparser`, `mammoth`, `sharp`.

**Estimated effort:** 6–8 days
- EmailProvider interface + SMTP/SES/Console adapters: 1.5 days
- Template system + transactional types: 1 day
- pg-boss `email.send` queue + worker extension: 1 day
- IMAP client + incremental sync + safety guards: 1.5 days
- Email-to-CRM linking + embedding: 1 day
- Email client UI (inbox, compose, thread view): 1 day
- Tests (template rendering, provider selection, sync UID tracking, linking): 0.5 day

**Dependencies**
Phase 4 (activity-triggered emails), Phase 7 (storage for attachments).

---

### Phase 9 — AI Features

**Description**
Add AI-powered features: vector embeddings (OpenAI `text-embedding-3-small`, 1536-dim, pgvector HNSW), semantic search, record summarization, "Find Similar", and E2B enrichment agents with confidence scoring. All AI features are opt-in per organization.

**Key deliverables**
- `AiProvider` interface + OpenAI provider + Anthropic provider (Claude Sonnet via E2B) in `src/lib/ai/`
- Vector embeddings: 1536-dim vectors stored as `vector(1536)` with HNSW indexes on CRM entities, documents, emails
- Inngest `embed-*` functions: `embed-account`, `embed-contact`, `embed-lead`, `embed-opportunity`, `embed-backfill`
- Semantic search: pgvector cosine similarity, combined with keyword search (Phase 10)
- "Find Similar" button + similar-records drawer per CRM entity
- Record summarization: stored in `Record.aiSummary` + `aiSummaryUpdatedAt`, regenerated on field change, opt-in per org
- E2B enrichment agents (`lib/enrichment/`): orchestrator + specialized agents (company-profile, discovery, funding, metrics, tech-stack, general); confidence scoring (fields below 0.6 discarded; only empty fields overwritten)
- C-level contact discovery: `crm_Target_Contact` records from company enrichment
- 3-tier API key resolution: `lib/api-keys.ts` chains ENV → system DB → user DB with AES-256-GCM at rest
- AI key management: admin panel `/admin/llm-keys/` + profile `/profile?tab=llms` (encrypted)
- Background `ai.process` queue via Inngest

**Files affected**
- Create: `src/lib/ai/types.ts` (`AiProvider` interface), `src/lib/ai/openai-provider.ts`, `src/lib/ai/anthropic-provider.ts`, `src/lib/ai/service.ts` (`AISuggestionFacade`)
- Create: `src/lib/enrichment/` (e2b agent, strategies, agent-architecture, types, config, utils, services)
- Create: `src/lib/api-keys.ts` (3-tier resolution), `src/lib/email-crypto.ts` (AES-256-GCM), `src/app/api/ai/` (summarize, suggest endpoints)
- Create: `src/components/crm/find-similar-button.tsx`, `src/components/crm/similar-records-drawer.tsx`, `src/components/standard/record/ai-summary.tsx`
- Create: `src/inngest/functions/embed-*.ts`, `src/inngest/functions/enrich-*.ts`
- Schema: `crm_Embeddings_{Accounts,Contacts,Leads,Opportunities,Documents}`, `crm_Document_Chunks`, `EmailEmbedding`, `ApiKeys` (SYSTEM/USER scope), `crm_Target_Contact`, `crm_Contact_Enrichment`, `crm_Target_Enrichment`

**Risk level:** High — AI data boundary: never send raw field values without org consent; opt-in per org. Token costs and rate limits must be managed. E2B sandbox requires external service. Confidence scoring must prevent erroneous data overwrites.

**Estimated effort:** 6–8 days
- AiProvider interface + OpenAI/Anthropic adapters: 1 day
- Vector embeddings + Inngest embed functions + pgvector schema: 1.5 days
- Semantic search + "Find Similar": 1 day
- Record summarization + AI summary panel: 1 day
- E2B enrichment agents + confidence scoring + C-level discovery: 1.5 days
- 3-tier API key resolution + admin/profile UI: 1 day
- Tests (embedding, summarization, enrichment, AI data boundary): 1 day

**Dependencies**
Phase 7 (document storage for document embeddings), Phase 4 (Activity timeline for AI context).

---

### Phase 10 — Search (Keyword + Semantic)

**Description**
Evolve search from server-side LIKE to PostgreSQL full-text (`tsvector` with GIN index) with a `SearchProvider` abstraction, field-scoped search, phrase matching, typo tolerance, and ranking via `ts_rank_cd` + exact-match boost. Combined with Phase 9's pgvector semantic search for unified keyword + semantic results.

**Key deliverables**
- `tsvector` column on `Record` (`searchVector`) with GIN index — populated from concatenated `valueSearch` of all searchable fields
- `SearchProvider` interface: `search(query, options) → SearchHit[]` with native PostgreSQL implementation
- `SearchProviderFactory`: env-driven selection via `SEARCH_PROVIDER=postgresql|elasticsearch|meilisearch`
- Sync trigger: on `createRecord`/`updateRecord`, update parent `Record.searchVector` via raw SQL `UPDATE`
- Field-scoped search, phrase matching (quoted terms), typo tolerance (fuzzy prefix expansion via `pg_trgm`)
- Org + record-access scoping enforced on all search results (`buildRecordAccessFilter`)
- Ranking: PostgreSQL `ts_rank_cd` for relevance + exact-match boost
- Combined keyword + semantic search: `/fulltext-search/` route returns grouped results (keyword matches + vector-similar matches), unified in grouped UI
- `rebuildSearchIndex(orgId)` for recovery — full reindex across all records
- Command palette search (`/api/cmdk`) built on top of the SearchProvider

**Files affected**
- Modify: `src/app/api/search/global/route.ts` (route through `SearchProvider`), `src/lib/field-data.ts` (on field save, update parent `Record.searchVector`), `src/lib/record-access.ts` (ensure `isDeleted: false` in search results)
- Create: `src/lib/search/types.ts` (`SearchProvider`, `SearchHit`, `SearchOptions`), `src/lib/search/postgresql.ts`, `src/lib/search/elasticsearch.ts`, `src/lib/search/factory.ts`, `src/lib/search/index-sync.ts`
- Create: `src/components/fulltext-search/` (grouped keyword + semantic results UI)
- Create: `src/app/api/cmdk/route.ts` (command palette search endpoint)
- Schema: `Record.searchVector` column + GIN index (migration `20260922_add_search_vector_to_record`)

**Risk level:** Medium — full-text index migration strategy (parallel run + cutover); search relevance tuning; raw SQL for `tsvector` updates must be transactional. Integration with pgvector for semantic results adds complexity.

**Estimated effort:** 5–7 days
- `tsvector` column + GIN index migration: 0.5 day
- `SearchProvider` interface + PostgreSQL native full-text implementation: 2 days
- `SearchProviderFactory` + Elasticsearch/Meilisearch adapters: 1 day
- Index sync (on save + rebuild) + field-scoped/phrase/typo search: 1 day
- Ranking + exact-match boost + combined keyword+semantic: 1 day
- Command palette API endpoint: 0.5 day
- Tests (index build, ranking, org scoping, semantic + keyword combined, provider selection): 1 day

**Dependencies**
Phase 1 (search must respect soft-delete — `isDeleted: false` on all results), Phase 9 (AI embeddings for semantic search), Phase 3 (migration workflow for `searchVector` column).

---

### Phase 11 — MCP Server

**Description**
Add a Model Context Protocol (MCP) server with 127 tools across 15 modules, enabling AI agents to read and (with proper scope) write CRM data. Uses `mcp-handler` for streamable HTTP + SSE transport with Bearer token authentication.

**Key deliverables**
- MCP server at `app/api/mcp/[transport]/route.ts` — powered by `mcp-handler@^1.1`
- Bearer token auth (`nxtc__` prefix, 24 random bytes / 48 hex chars, SHA-256 hashed before storage at `ApiToken.tokenHash`)
- Token prefix (8 chars) stored for display; `tokenHash` for lookup; raw token shown only once at generation
- 10 active tokens max per user; `validateApiToken()` checks `revokedAt`/`expiresAt`, updates `lastUsedAt`
- 127 tools across 15 modules: crm-accounts (6), crm-contacts (6), crm-leads (6), crm-opportunities (6), crm-targets (6), crm-products (5), crm-contracts (5), crm-activities (5), crm-documents (8), crm-target-lists (7), crm-enrichment (4), crm-email-accounts (1), crm-users, campaigns (18), projects (18), reports (2)
- Scope adapter: all tools receive `userId`/`mcpUser` and delegate to `lib/authz` scope helpers (`assertCan*`) — ensuring MCP access has identical authorization semantics to server actions
- Dev fallback to session cookie (`NODE_ENV=development` only)
- `assertScopeOrNotFound` converts `AuthorizationError` → `NOT_FOUND` to prevent existence oracle

**Files affected**
- Create: `app/api/mcp/[transport]/route.ts`, `src/lib/mcp/auth.ts`, `src/lib/mcp/helpers.ts`, `src/lib/mcp/tools/` (15 module files)
- Create: `src/actions/admin/api-token-actions.ts` (`createApiToken`, `revokeApiToken`, `listApiTokens`)
- Schema: `ApiToken` model (`id`, `organizationId`, `userId`, `tokenHash`, `tokenPrefix`, `name`, `scopes` (JSON), `expiresAt`, `revokedAt`, `lastUsedAt`, `createdAt`)

**Risk level:** Medium — auth parity between MCP tools and server actions is critical; each tool must delegate to the same `assertCan*` scope helpers. Token revocation must be immediate. Dev session fallback must be gated on `NODE_ENV !== "production"`.

**Estimated effort:** 5–6 days
- MCP server transport + Bearer token auth: 1 day
- API token model + CRUD actions: 1 day
- Tool modules (15 files, 127 tools) — batch generation: 3 days
- Scope adapter integration (assertCan* delegation per tool): 1 day
- Tests (scope parity, token lifecycle, cross-org isolation, token hashing): 1 day

**Dependencies**
Phase 2 (multi-org: tokens scoped per org), Phase 10 (search: MCP search tools use SearchProvider), Phase 4 (CRM objects must exist for MCP tools to operate on).

---

### Phase 12 — Audit Logging

**Description**
Implement centralized audit logging with a diff engine, an `AuditLog` table, per-entity history tabs with restore capability, and an admin global audit log page. Builds on openCRM's existing `FieldHistory` model and integrates with soft-delete (Phase 1).

**Key deliverables**
- Centralized `AuditLog` table: `entityType`, `entityId`, `action` (enum: created/updated/deleted/restored/relation_added/relation_removed), `changes` (JSON diff), `userId`, `organizationId`, `createdAt`, `ipAddress`, `userAgent`
- `diffObjects()` helper (`src/lib/audit-log.ts`): computes before/after field diffs, strips internal fields (timestamps, isDeleted)
- `writeAuditLog()` — transaction-scoped, fire-and-forget on failure (audit failures never block mutations)
- Every Server Action mutation writes an audit log entry in the same `db.$transaction` scope
- Per-entity History tab (`AuditTimeline` + `AuditEntry` components): aggregates audit log + `FieldHistory` + `RecordOwnerHistory`, sorted by timestamp
- Admin global audit log page at `/admin/audit-log` with filters (entity, action, user, date range) and restore for soft-deleted records
- Soft-delete preservation: `deleted`/`restored` actions logged; inbound lookups preserved on soft-delete; purge clears references

**Files affected**
- Modify: `src/actions/standard/record-actions.ts`, `src/actions/standard/lead-actions.ts`, `src/actions/admin/admin-actions.ts`, `src/actions/admin/permission-actions.ts` (add `writeAuditLog` in transaction scope)
- Create: `src/lib/audit-log.ts` (`diffObjects`, `writeAuditLog`, `getAuditLogForRecord`, `getAuditLogForOrg`), `src/components/crm/audit-log/` (`audit-timeline.tsx`, `audit-entry.tsx`), `src/app/(admin)/admin/audit-log/page.tsx`
- Schema: `AuditLog` model (new); reuse existing `FieldHistory`, `RecordOwnerHistory`

**Risk level:** Medium — audit log write failures must not block mutations (fire-and-forget pattern); diff engine must handle EAV FieldData normalization correctly; high-volume logging must not impact write latency.

**Estimated effort:** 4–5 days
- `AuditLog` model + migration: 0.5 day
- `diffObjects()` + `writeAuditLog()` + integration into all Server Actions: 2 days
- Per-entity History tab (`AuditTimeline` + `AuditEntry`): 1 day
- Admin global audit log page + filters: 1 day
- Tests (diff computation, log write, access scoping, restore from audit): 1 day

**Dependencies**
Phase 1 (soft-delete: audit must record `deleted`/`restored` actions), Phase 2 (audit entries record `organizationId`).

---

### Phase 13 — Automation

**Description**
Add CRM automation: funnel timers, stage transition triggers, auto-generated tasks, CSO approval gates for opportunities, and campaign sequences via Inngest background jobs. Extends the pg-boss worker to handle automation queues.

**Key deliverables**
- Funnel settings singleton: `kill_after_days` (45), `recycle_after_days` (90), cadence offsets, care intervals
- Funnel timers: business-day and cadence timers via Inngest functions (`care-tasks`, `kill-rule`, `qualified-cadence`, `recycle-targets`, `renewal-reminders`)
- Stage transition triggers: when opportunity stage changes, evaluate `stage_kind` automation (preSale → qualified → purchaseOrder → delivery → care)
- Auto-task generation: on stage transition, auto-generate tasks based on configured cadence
- CSO approval gate: opportunities must be CSO-approved before entering quote stage (`lib/crm/approval-gate.ts`)
- Campaign sequences: multi-step email sequences with scheduling, pause/resume, send-now via Inngest (`send-step`, `send-now`, `schedule-send`, `process-follow-up`)
- `crm_Accounts_Tasks` linking: tasks associated with CRM accounts/opportunities
- Webhook recursion guard (`X-Webhook-Trigger` header) — prevents loops when automation fires webhooks that trigger record changes

**Files affected**
- Modify: `src/lib/seeding/create-org-template.ts` (funnel settings, automation rules), `src/actions/standard/opportunity-actions.ts` (stage transition hooks), `src/jobs/nextcrm-worker.ts` (automation queues)
- Create: `src/lib/crm/funnel-timers.ts`, `src/lib/crm/funnel-settings.ts`, `src/lib/crm/stage-transition.ts`, `src/lib/crm/auto-task.ts`, `src/lib/crm/approval-gate.ts`
- Create: `src/lib/campaigns/` (merge-tags.ts, recipient-filters.ts, render-email.ts), `src/inngest/functions/` (automation + campaigns)
- Create: `app/[locale]/(routes)/automation/` (funnel settings, approval queue)
- Schema: `crm_FunnelSettings` (singleton), `crm_campaigns`, `crm_campaign_templates`, `crm_campaign_steps`, `crm_campaign_sends`, `CampaignToTargetLists`, `TargetsToTargetLists`

**Risk level:** High — recursive automation (stage change → task creation → stage change) must have cycle detection; webhook firing on automation events must have the recursion guard; Inngest job failures must not silently drop automation events.

**Estimated effort:** 6–8 days
- Funnel settings + singleton config: 0.5 day
- Funnel timers + Inngest automation functions (5 job types): 2 days
- Stage transition triggers + approval gate: 1.5 days
- Auto-task generation: 1 day
- Campaign automation (templates, steps, sends, merge tags): 1.5 days
- Tests (stage transitions, auto-task, approval gate, recursion safety, campaign sequencing): 1 day

**Dependencies**
Phase 5 (Projects: `crm_Accounts_Tasks` linking), Phase 6 (Invoicing: automation for renewal reminders), Phase 8 (Email: campaign delivery + notifications), Phase 14 (Integrations: webhooks fire on automation events).

---

### Phase 14 — Integrations

**Description**
Add the integration hub: outbound webhooks with HMAC-SHA256 signature verification and delivery logs + retry, bearer API tokens with granular scopes, a REST connector framework, and event firing on record mutations. The `ApiToken` model is shared with the MCP server (Phase 11).

**Key deliverables**
- `WebhookEndpoint` model: `name`, `url`, `events` (JSON), `isActive`, `secret` (for HMAC signing), `createdAt`
- `WebhookEvent` model: `eventType`, `payload` (JSON), `status` (queued/sent/delivered/bounced/failed), `responseCode`, `errorMessage`, `attempts`, `nextRetryAt`, `deliveredAt`
- `fireWebhook()` — queues webhook delivery via pg-boss `webhook.deliver` job; exponential backoff retry
- `signPayload()` — HMAC-SHA256 signature: `sha256(secret + timestamp + payload)` in `Webhook-Signature` header
- `verifySignature()` — validates incoming webhook signatures on inbound endpoints
- `ApiToken` model: `tokenHash` (SHA-256), `tokenPrefix` (8 chars for display), `scopes` (JSON), `expiresAt`, `revokedAt`, `lastUsedAt` — shared with MCP server
- Bearer-token auth middleware: `/api/v1/*` routes authenticate via `ApiToken`; scopes enforced (`records.read`, `records.write`, `users.read`, etc.)
- REST connector framework: `lib/connectors/` with `Connector` interface for custom object sync (outbound)
- Event firing: after create/update/delete in `record-actions.ts`, call `webhook.trigger("record.changed", ...)` — with recursion guard (`X-Webhook-Trigger` header)
- Per-API-token rate limiting (extends `src/lib/rate-limit-store.ts`)
- Admin UI: `/admin/webhooks/` (manage endpoints, view delivery logs), `/admin/api-tokens/` (manage tokens)

**Files affected**
- Modify: `src/middleware.ts` (add bearer-token auth path for `/api/v1/*`), `src/actions/standard/record-actions.ts` (fire webhook on mutations), `src/lib/rate-limit-store.ts` (per-API-token rate limiting)
- Create: `src/app/api/webhooks/` (CRUD endpoints), `src/app/api/webhooks/[id]/deliveries/`, `src/app/api/integrations/api-tokens/`, `src/app/api/v1/` (versioned API)
- Create: `src/lib/webhooks/types.ts`, `src/lib/webhooks/service.ts` (`fireWebhook`, `signPayload`), `src/lib/webhooks/verifier.ts` (`verifySignature`)
- Create: `src/lib/connectors/types.ts`, `src/lib/connectors/rest-connector.ts`
- Create: `src/actions/admin/webhook-actions.ts` (`createWebhookEndpoint`, `testWebhook`, `getDeliveryLog`), `src/actions/admin/api-token-actions.ts` (`createApiToken`, `revokeApiToken`)
- Schema: `WebhookEndpoint`, `WebhookEvent` (new models; `ApiToken` from Phase 11)

**Risk level:** High — webhooks causing infinite loops (record update → webhook → record update); token scope escalation; HMAC signature verification timing attacks; recursion guard must be airtight.

**Estimated effort:** 6–8 days
- `WebhookEndpoint` + `WebhookEvent` models + migration: 1 day
- `fireWebhook()` + pg-boss `webhook.deliver` queue + retry: 1.5 days
- HMAC signing + verification + recursion guard: 1 day
- API token scoping in middleware + `/api/v1/*` versioned routes: 1.5 days
- REST connector framework: 1 day
- Admin UI (webhooks + API tokens): 1 day
- Tests (payload signing, signature verification, scope enforcement, cross-org isolation): 1 day

**Dependencies**
Phase 11 (MCP server: shares `ApiToken` model + Bearer token auth), Phase 1 (soft-delete: webhooks fire on delete events), Phase 2 (org membership: webhooks + tokens scoped per org).

---

### Phase 15 — Testing

**Description**
Expand test coverage across all layers: client component tests (jsdom), E2E tests (Playwright), API route tests, admin action tests, worker/job tests, and security tests for all new authz paths. Set up the full CI/CD pipeline.

**Key deliverables**
- Vitest jsdom project for client component tests (`src/tests/client/`)
- Playwright E2E test project (`src/tests/e2e/`) with auth fixture (dev OTP endpoint for non-prod login)
- API route tests (`src/tests/api/`): search, notifications, files, cmdk, invoices, webhooks, mcp
- Admin action tests (`src/tests/admin/`): admin-actions, permission-actions, report-actions, webhook-actions, api-token-actions
- Worker/job tests (`src/tests/jobs/`): import-processing, sharing-rule-worker, email-jobs, automation-jobs, ai-jobs, report-jobs, webhook-jobs
- Security tests for all new authz paths (org isolation, record access, token scoping, MCP scope parity)
- CI/CD: `.github/workflows/ci.yml` (lint + typecheck + test + build), `.github/workflows/release-please.yml` (versioning + changelog)
- `typecheck` script added to `package.json`
- Packaging cleanup: remove `yarn.lock`, `schema.pprisma`, `start.bat` (if not done in Phase 3)

**Files affected**
- Modify: `vitest.config.ts` (add `client` jsdom project), `package.json` (add `test:e2e`, `typecheck` scripts), `src/lib/rate-limit-redis.ts` (verify wired)
- Create: `.github/workflows/ci.yml`, `.github/workflows/release-please.yml`, `playwright.config.ts`
- Create: `src/tests/client/` (record-form, dashboard-widget, command-palette, timeline, ai-summary)
- Create: `src/tests/e2e/` (auth.spec, record-crud.spec, admin-config.spec, cmdk.spec, invoice.spec, mcp.spec)
- Create: `src/tests/api/` (search.test, notifications.test, files.test, cmdk.test, invoices.test, webhooks.test)
- Create: `src/tests/admin/` (admin-actions.test, permission-actions.test, report-actions.test, webhook-actions.test, api-token-actions.test)
- Create: `src/tests/jobs/` (import-processing.test, sharing-rule-worker.test, email-jobs.test, automation-jobs.test, ai-jobs.test, webhook-jobs.test)

**Risk level:** Low — testing and CI/CD are additive; no production behavior changes. Main risk is test coverage gaps in new security-critical paths.

**Estimated effort:** 5–7 days
- jsdom Vitest project + client component tests: 1.5 days
- Playwright E2E project + specs + auth fixture: 2 days
- API route + admin action + worker tests: 1 day
- Security tests for new authz paths (MCP scope parity, token scoping): 0.5 day
- CI/CD workflow + `release-please` config: 1 day
- Tests (test infrastructure verification, coverage threshold): 0.5 day

**Dependencies**
All prior phases — comprehensive test coverage requires all features to be implemented and stable.

---

### Phase 16 — Security Hardening

**Description**
Consolidate and harden security across the entire platform: Redis-backed rate limiting for distributed deployments, security headers (HSTS, CSP, X-Frame-Options, etc.), audit trail integrity verification, secret management hardening, dependency vulnerability scanning, and penetration testing of all new authz paths.

**Key deliverables**
- Replace in-memory `RateLimiter` with Redis-backed `RedisRateLimiter` (Upstash `@upstash/ratelimit`) for multi-instance deployments; in-memory fallback when `REDIS_URL` unset (dev mode only)
- Wire existing `src/lib/rate-limit-redis.ts` (currently unused) — verify it's the Upstash adapter
- Security headers on all responses: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- Audit trail integrity: `AuditLog` entries are append-only; `writeAuditLog` uses fire-and-forget; verify audit entries cannot be deleted by non-admins; verify `deleted`/`restored` actions always logged
- Secret management hardening: all secrets via env vars or admin-panel DB storage with AES-256-GCM; verify no secrets in code or git history; add `scripts/scan-secrets.sh` to CI
- API token scoping enforcement in middleware: `records.read`, `records.write`, `users.read` — enforced on all `/api/v1/*` routes
- Webhook HMAC-SHA256 signature verification on all incoming webhook endpoints
- Cross-org isolation verification for all new models (`OrganizationMember`, `ApiToken`, `AuditLog`, `Invoices`, `Webhooks`, `Emails`, `Boards`, `Tasks`)
- CSRF defense extended to all Server Actions (not just API routes)
- Dependency vulnerability scanning in CI (GitHub Advisory Database)
- Cookie hardening: `SameSite=Lax` + `Secure` (when HTTPS) + `__Host-` prefix explicitly set in better-auth config

**Files affected**
- Modify: `src/lib/rate-limit-store.ts` (Redis-backed + in-memory fallback), `src/middleware.ts` (security headers, API token auth, CSRF on Server Actions), `src/lib/audit-log.ts` (append-only enforcement + IP/userAgent capture), `src/auth.ts` (cookie hardening: SameSite/Secure/__Host)
- Modify: `.github/workflows/ci.yml` (dependency scan step + secret scan)
- Create: `src/lib/security-headers.ts` (header middleware/helper), `scripts/scan-secrets.sh` (CI secret detection)

**Risk level:** Medium — rate limiter change can affect auth flow latency; security headers can break embedded content (CSP); audit trail changes must not lose entries; cookie hardening may affect existing sessions (requires re-login — acceptable migration).

**Estimated effort:** 4–5 days
- Redis-backed rate limiter + factory (wire existing `rate-limit-redis.ts`): 1 day
- Security headers middleware: 0.5 day
- Audit trail integrity verification + enforcement: 0.5 day
- Secret management hardening + secret scan script: 0.5 day
- API token scoping + webhook HMAC verification + CSRF on Server Actions: 1 day
- Cookie hardening (SameSite/Secure/__Host): 0.5 day
- Tests (rate limit distributed mode, headers present, token scoping, isolation for new models): 1 day

**Dependencies**
All feature phases — security hardening applies across the entire stack. Specifically requires Phase 2 (auth/admin plugin + cookie hardening), Phase 8 (email rate limiting), Phase 10 (search rate limiting), Phase 11 (MCP auth), Phase 12 (audit logging), Phase 14 (webhooks + API tokens), Phase 15 (testing infrastructure to verify new authz paths).

---

## 6. Dependency Graph

### 6.1 Linear Chain

```
Phase 1 (Audit & Docs) → Phase 2 (Auth Foundation) → Phase 3 (Schema & Isolation)
                                                         ↓
Phase 4 (CRM Core) ← Phase 3                       Phase 5 (Projects)
    ↓                                               (uses CRM objects)
Phase 6 (Invoicing)                              Phase 7 (Documents & Storage)
    (needs storage)                                   ↓
Phase 8 (Email Client)                           Phase 9 (AI Features)
    (needs activities + storage)                  (needs storage + timeline)
                                              ↓
Phase 10 (Search) ← Phase 9 (semantics) + Phase 1 (soft-delete)
    ↓
Phase 11 (MCP Server) ← Phase 2 (org) + Phase 10 (search)
    ↓
Phase 12 (Audit Logging) ← Phase 1 (soft-delete) + Phase 2 (org)
    ↓
Phase 13 (Automation) ← Phase 8 (email) + Phase 5 (projects) + Phase 6 (invoicing)
    ↓
Phase 14 (Integrations) ← Phase 11 (API tokens) + Phase 1 (soft-delete)
    ↓
Phase 15 (Testing) ← All
    ↓
Phase 16 (Security) ← Phase 2, 8, 11, 12, 14
```

### 6.2 Full Dependency Matrix

| Phase | Phase Name | Depends On | Risk |
|-------|-----------|------------|------|
| 1 | Audit & Documentation | — | None |
| 2 | Authentication Foundation | 1 | High |
| 3 | Database Schema & Tenant Isolation | 2 | Medium |
| 4 | CRM Core | 3 | Low |
| 5 | Projects & Tasks | 4 | Medium |
| 6 | Invoicing | 7, 8, 2, 4 | High |
| 7 | Documents & Storage | 4, 3 | Medium |
| 8 | Email Client | 4, 7 | High |
| 9 | AI Features | 7, 4 | High |
| 10 | Search | 1, 9, 3 | Medium |
| 11 | MCP Server | 2, 10, 4 | Medium |
| 12 | Audit Logging | 1, 2 | Medium |
| 13 | Automation | 8, 5, 6, 14 | High |
| 14 | Integrations | 11, 1, 2 | High |
| 15 | Testing | All | Low |
| 16 | Security Hardening | 2, 8, 11, 12, 14, 15 | Medium |

### 6.3 Sprint Schedule (16 phases in ~8 sprints)

| Sprint | Phases | Focus | Team |
|--------|--------|-------|------|
| Sprint 1 | 1, 2, 3 | Audit complete; auth foundation + schema hardening + migration workflow | Core (Team A) |
| Sprint 2 | 4, 7 | CRM objects seeded; storage backend + S3 adapter | Core + Infra |
| Sprint 3 | 5, 8 | Projects & Tasks; Email client (IMAP + SMTP/SES) | Product + Infra |
| Sprint 4 | 6, 9 | Invoicing; AI features (embeddings + enrichment) | Product + Infra |
| Sprint 5 | 10, 11 | Search (keyword + semantic); MCP server | Infra (Team B) |
| Sprint 6 | 12, 13 | Audit logging; Automation (funnel + campaigns) | Product + Core |
| Sprint 7 | 14, 15 | Integrations (webhooks + API tokens); Testing expansion + CI/CD | Cross-team |
| Sprint 8 | 16 | Security hardening (Redis rate limit, headers, scanning) | Cross-team (stabilization) |

**Parallelization opportunities:**
- Phase 5 (Projects) and Phase 7 (Storage) can run in parallel after Phase 4
- Phase 6 (Invoicing) needs Phase 7 (storage) and Phase 8 (email) — starts in Sprint 3, completes Sprint 4
- Phase 9 (AI) needs Phase 7 (storage) — starts Sprint 3, completes Sprint 4
- Phase 13 (Automation) can start once Phase 8 is done, even if Phase 10/11 are pending
- Phase 15 (Testing) and Phase 16 (Security) are cross-cutting stabilization sprints

**Recommended team structure:**
- **Team A (Core CRM)**: Phases 1–4, 12 (data model, auth, CRM objects, activities, audit)
- **Team B (Infra)**: Phases 7, 8, 9, 10, 11, 16 (storage, email, AI, search, MCP, security)
- **Team C (Product)**: Phases 5, 6, 13, 14 (projects, invoicing, automation, integrations)
- **QA / Delivery**: Phases 15 (all teams contribute tests)

---

## 7. Risk Register

| # | Risk | Impact | Likelihood | Phase(s) | Mitigation |
|---|------|--------|------------|----------|------------|
| R-01 | Soft-delete not wired comprehensively — a missed read-path filter leaks deleted records | High | Medium | 1 | Centralize `isDeleted` filtering in `buildRecordAccessFilter`/`buildRecordAccessSql`; add `filterDeletedInAllReads.test.ts` integration test; require all new read paths to include the filter in code review checklist |
| R-02 | Multi-org membership breaks single-org assumptions across the codebase | High | Medium | 2 | Comprehensive isolation tests; audit every `getUserContext()` call site; one-time data migration script with rollback plan; backward-compatible `User.organizationId` retained during transition |
| R-03 | `getUserQueueIds` queries `QueueMember` by `userId` with no `organizationId` filter — latent bug under multi-org | High | Medium | 3 | Add `organizationId` filter to `getUserQueueIds`; cross-org isolation test for queues |
| R-04 | `buildRecordAccessFilter` (Prisma) and `buildRecordAccessSql` (raw SQL) may drift → auth bypass | High | Low | 10 | Add equivalence test asserting both produce identical results; Phase 10 search uses both paths, validating consistency |
| R-05 | EAV query performance degrades as Activity/Timeline data grows | High | Medium | 4 | Timeline uses denormalized cache; limit to 50 most-recent entries with pagination; Phase 15 adds indexing + query profiling |
| R-06 | Search full-text migration causes inconsistent results during cutover | Medium | Medium | 10 | Run PostgreSQL LIKE + tsvector in parallel during cutover; validation script compares results before switching; rollback to LIKE if results degrade |
| R-07 | AI provider rate limits / token costs exceed budget | Medium | High | 9 | Request-level opt-in per org; cache summaries; use `gpt-4o-mini` for cost efficiency; confidence scoring discards fields below 0.6; per-org budget caps via admin settings |
| R-08 | AI data boundary: raw field values sent out without org consent | High | Low | 9 | Never send raw field values without explicit org opt-in (`AI_PROVIDER != "none"`); AI features disabled by default until configured |
| R-09 | MCP tools have different authorization semantics than server actions → auth bypass | High | Medium | 11 | Scope adapter delegates every tool to `lib/authz` scope helpers (`assertCan*`); parallel scope tests assert MCP tools and server actions produce identical access decisions; `assertScopeOrNotFound` masks existence |
| R-10 | Webhooks cause infinite loops (record update → webhook → record update) | High | Low | 13 | Recursion guard (`X-Webhook-Trigger` header) + event-type filtering; webhook-originated mutations skip event firing |
| R-11 | API token scope escalation (token with broader scope than intended) | High | Low | 14 | Granular scopes (`records.read`, `records.write`, `users.read`); scope enforced in middleware before any handler; tokens scoped to `organizationId`; 10 active tokens max per user; SHA-256 hashed at rest |
| R-12 | Decimal serialization failures across React Server Action boundary (invoicing) | Medium | High | 6 | `serializeDecimals()`/`serializeDecimalsList()` mandated on every Server Action return crossing into client components; test asserts no `Decimal` objects reach client |
| R-13 | Email account credential encryption key compromise | High | Low | 8 | AES-256-GCM via `lib/email-crypto.ts`; `EMAIL_ENCRYPTION_KEY` is 64-char hex (32 bytes); rotate key support via admin panel; encrypted at rest, never logged |
| R-14 | Storage path traversal on S3 provider | High | Low | 7 | `resolveStoragePath` validates resolved paths; all providers enforce same path validation; per-org bucket/path isolation; magic-byte MIME detection retained |
| R-15 | Inngest background job failures (email sync, AI enrichment, campaigns) | Medium | Medium | 8, 9, 13 | pg-boss for reliability-critical queues with native retry + exponential backoff; Inngest for AI/campaign jobs with dead-letter queue; job status monitoring in admin; manual re-run capability |
| R-16 | Campaign send loops / spam complaints | High | Low | 13 | Unsubscribe token (unique UUID) per recipient; Resend webhook processing for bounces/complaints; rate limiting on sends; campaign audit log |
| R-17 | No CI/CD → deployments with untested code | High | High | 15 | GitHub Actions CI: lint + typecheck + test + build on every PR; `release-please` for versioning; pre-commit hooks recommended |
| R-18 | Missing i18n strings in new UI components | Medium | High | 4, 5, 6, 13 | i18n checklist in verification; dev-mode warning when `t()` returns the key unchanged; all new strings use `t()` (client) or `getT()` (server) |
| R-19 | In-memory rate limiter only — not scalable for multi-instance | Medium | Medium | 16 | Replace with Redis-backed `RedisRateLimiter` (Upstash); in-memory fallback only in dev (no `REDIS_URL`) |
| R-20 | Cookie hardening (Secure/SameSite/__Host) breaks existing sessions | Low | Medium | 16 | Acceptable migration: users re-authenticate once after deployment; `__Host-` prefix requires HTTPS (documented) |
| R-21 | Stray files (`yarn.lock`, `schema.pprisma`, `start.bat`) cause confusion and potential build issues | Low | High | 3, 15 | Deleted in Phase 3 + 15 cleanup; `schema.pprisma` typo could be picked up by Prisma if `schema.prisma` is missing |
| R-22 | `soft-delete` already in schema but unwired — partial implementation creates false sense of data safety | High | High | 1 | Phase 1 wires reads + `deleteRecord` + `restoreRecord`; comprehensive tests assert deleted records are invisible |

---

## 8. Success Criteria

The migration is complete when all of the following are true:

### 8.1 Functional Completeness
- [ ] Login works end-to-end (fixed: button label correct, bcrypt cost 12)
- [ ] Multi-org membership: users switch orgs; session re-issues correctly
- [ ] Formal migration workflow: `prisma migrate dev/deploy` replaces `db push`; stray files removed
- [ ] All 15 standard CRM objects seeded: Company(Account), Contact, Lead, Opportunity, Case, Task, Product, Note, Call, Meeting, Document, Activity, Contract, Target, TargetList
- [ ] Projects module: boards, tasks, comments, watchers, drag-drop
- [ ] Invoicing: lifecycle, series numbering, tax, multi-currency + FX, payments, PDF export, email delivery
- [ ] Storage backend: S3/MinIO + presigned uploads + content extraction + versioning
- [ ] Email client: IMAP sync, SMTP/SES sending, email-to-CRM linking
- [ ] AI: embeddings, semantic search, summarization, enrichment agents, MCP tools (127 across 15 modules)
- [ ] Search: full-text `tsvector` + pgvector semantic, unified keyword+semantic UI, command palette
- [ ] MCP server: 127 tools authenticated + scoped; auth parity with server actions
- [ ] Audit logging: centralized `AuditLog` table, diff engine, per-entity History tab, admin page
- [ ] Automation: funnel timers, stage transitions, auto-tasks, approval gates, campaigns
- [ ] Integration hub: webhooks with HMAC + retry, API tokens with scopes, REST connectors

### 8.2 Security
- [ ] Tenant isolation preserved: zero cross-tenant data access (org isolation tests for all new models)
- [ ] No existence leak: `getRecord` returns `NOT_FOUND` for inaccessible/deleted/non-existent
- [ ] API token scoping: bearer tokens enforce granular scopes; cross-org access blocked
- [ ] Webhook signatures: HMAC-SHA256 verified on all incoming webhook endpoints
- [ ] No secrets in code or git history (secret scan in CI)
- [ ] CSRF defense: origin/referer validation on all mutating API requests + Server Actions
- [ ] Path traversal: all storage providers validate resolved paths
- [ ] Rate limiting: auth endpoints throttled; Redis-backed for distributed deployments
- [ ] Dependency scan: CI runs GitHub Advisory Database check; no known vulnerabilities
- [ ] Cookie hardening: `SameSite=Lax` + `Secure` (HTTPS) + `__Host-` prefix

### 8.3 Quality
- [ ] All 104 existing tests still pass (`npm run test:unit`)
- [ ] New tests cover all Server Actions, API routes, admin actions, workers, MCP tools, and client components
- [ ] E2E tests pass (Playwright): auth flow, record CRUD, admin config, cmdk, invoices
- [ ] Lint + typecheck + build pass (`npm run lint && tsc --noEmit && npm run build`)
- [ ] No new hardcoded English strings in UI components
- [ ] `.env.example` documents all 30+ environment variables
- [ ] `Technical Documentation/` updated with new metadata artifacts

### 8.4 Performance
- [ ] List view page (25 rows, EAV): < 500ms p95
- [ ] Global search (100K records): < 300ms p95
- [ ] Record create (transaction): < 200ms p95
- [ ] Dashboard widget render: < 300ms p95
- [ ] Background import (1000 rows): < 10s total

---

## 9. Resource Estimate

### 9.1 Effort by Phase

| Phase | Phase Name | Effort (person-days) |
|-------|-----------|---------------------|
| 1 | Audit & Documentation | Done |
| 2 | Authentication Foundation | 4–6 |
| 3 | Database Schema & Tenant Isolation | 3–4 |
| 4 | CRM Core | 3–4 |
| 5 | Projects & Tasks | 6–8 |
| 6 | Invoicing | 6–8 |
| 7 | Documents & Storage | 5–6 |
| 8 | Email Client | 6–8 |
| 9 | AI Features | 6–8 |
| 10 | Search (Keyword + Semantic) | 5–7 |
| 11 | MCP Server | 5–6 |
| 12 | Audit Logging | 4–5 |
| 13 | Automation | 6–8 |
| 14 | Integrations | 6–8 |
| 15 | Testing | 5–7 |
| 16 | Security Hardening | 4–5 |
| | **Total** | **80–109** (excluding Phase 1 done) |

### 9.2 Team Allocation

| Team | Focus | Phases | Est. Person-Days |
|------|-------|--------|-----------------|
| Core CRM (Team A) | Data model, auth, CRM objects, audit, automation | 1, 2, 3, 4, 12, 13 | 26–35 |
| Infra (Team B) | Storage, email, AI, search, MCP, security | 7, 8, 9, 10, 11, 16 | 31–41 |
| Product (Team C) | Projects, invoicing, automation, integrations | 5, 6, 13, 14 | 23–29 |
| QA / Delivery | Testing, CI/CD, cleanup | 15 | 5–7 |

### 9.3 External Dependencies

| Service | Required By | Notes |
|---------|------------|-------|
| PostgreSQL 17+ (with pgvector) | All | Upgrade from current; pgvector needed for Phase 9 (AI embeddings) |
| S3-compatible storage (MinIO) | Phase 7 | Optional for dev; required for production |
| Redis | Phase 16 | Optional for dev (in-memory fallback); required for distributed rate limiting |
| Inngest | Phase 8, 9, 13 | Background job runner for email sync, AI, automation, campaigns |
| OpenAI / Anthropic API keys | Phase 9 | For AI embeddings, summarization, enrichment (opt-in) |
| ECB exchange rate feed | Phase 6 | For currency FX rate sync (external HTTP call) |
| Email provider (Resend/SES/SMTP) | Phase 8 | For transactional email + IMAP client |
| Google OAuth | Phase 2, 8 | For auth + Google Calendar sync |
| E2B sandbox | Phase 9 | For enrichment agents (cloud sandbox) |

### 9.4 New Dependencies (Permissive Licenses)

| Dependency | License | Used In |
|-----------|---------|---------|
| `mcp-handler@^1.1` | MIT | Phase 11 (MCP server) |
| `@aws-sdk/client-s3` | Apache 2.0 | Phase 7 (storage), Phase 8 (SES) |
| `@aws-sdk/client-ses` | Apache 2.0 | Phase 8 (email) |
| `nodemailer` | MIT | Phase 8 (SMTP) |
| `imap` | MIT | Phase 8 (IMAP client) |
| `mailparser` | MIT | Phase 8 (email parsing) |
| `mammoth` | MIT | Phase 7 (content extraction), Phase 8 |
| `pdf-parse` | MIT | Phase 8 (PDF text extraction) |
| `sharp` | Apache 2.0 | Phase 7 (thumbnails) |
| `@react-pdf/renderer` | MIT | Phase 6 (PDF generation) |
| `@anthropic-ai/sdk` | Apache 2.0 | Phase 9 (enrichment) |
| `e2b` | MIT | Phase 9 (enrichment sandbox) |
| `@upstash/redis` | Apache 2.0 | Phase 16 (rate limiting) |
| `@upstash/ratelimit` | Apache 2.0 | Phase 16 (rate limiting) |
| `playwright` | Apache 2.0 | Phase 15 (E2E) |

All new dependencies are permissive-license (MIT/Apache 2.0) — no license conflicts with openCRM's MIT license.

---

## 10. Verification Checklist

### 10.1 Per-Phase Verification Items

| Phase | Verification Item | Test Location |
|-------|------------------|---------------|
| **Phase 1** | Audit documents complete and accurate | Review all 7 docs against codebase |
| **Phase 1** | Login button label correct | `src/tests/integration/auth-flow.test.ts` |
| **Phase 1** | bcrypt cost aligned at 12 | `src/tests/security/auth-cost.test.ts` |
| **Phase 2** | Users can switch organizations | `src/tests/actions/org-switching.test.ts` |
| **Phase 2** | Session re-issues correctly after org switch | `src/tests/security/multi-org-isolation.test.ts` |
| **Phase 2** | Admin plugin enforces RBAC statements | `src/tests/security/rbac-scopes.test.ts` |
| **Phase 2** | OAuth provider hooks scaffolded | `src/tests/security/oauth-hooks.test.ts` |
| **Phase 3** | Formal migration workflow (`prisma migrate deploy`) | CI runs `migrate deploy` |
| **Phase 3** | `getUserQueueIds` filters by `organizationId` | `src/tests/lib/record-access.test.ts` (extend) |
| **Phase 3** | Stray files removed (`yarn.lock`, `schema.pprisma`, `start.bat`) | `scripts/cleanup.sh` verification |
| **Phase 3** | `deploy-railway.sh` portabilized | `scripts/deploy-railway.sh` reviewed |
| **Phase 4** | All 15 CRM objects seeded (Company, Contact, Lead, Opportunity, Case, Task, Product, Note, Call, Meeting, Document, Activity, Contract, Target, TargetList) | `src/tests/seeding/create-org-template.test.ts` (extend) |
| **Phase 4** | Dependency index entries created for new objects | `src/tests/lib/metadata-dependencies.test.ts` (extend) |
| **Phase 5** | Boards CRUD + Kanban drag-drop | `src/tests/actions/projects/board-actions.test.ts` |
| **Phase 5** | Tasks CRUD + comments + watchers + priority | `src/tests/actions/projects/task-actions.test.ts` |
| **Phase 5** | Board sharing respects visibility + sharedWith[] | `src/tests/security/board-sharing.test.ts` |
| **Phase 6** | Invoice lifecycle enforces state transitions + permission guards | `src/tests/invoices/lifecycle.test.ts` |
| **Phase 6** | Tax engine computes VAT buckets correctly | `src/tests/lib/invoices/tax-engine.test.ts` |
| **Phase 6** | Multi-currency + FX rate sync from ECB | `src/tests/inngest/ecb-sync.test.ts` |
| **Phase 6** | PDF generation produces valid output | `src/tests/api/invoices/pdf.test.ts` |
| **Phase 6** | Decimal serialization prevents React boundary issues | `src/tests/invoices/decimal-serialization.test.ts` |
| **Phase 7** | Storage provider factory selects correct backend (local vs S3) | `src/tests/lib/file-storage.test.ts` |
| **Phase 7** | Path traversal guard works for all providers | `src/tests/lib/file-storage.test.ts` |
| **Phase 7** | Presigned URL upload works (local + S3) | `src/tests/api/files.test.ts` |
| **Phase 7** | Content extraction (mammoth, pdf-parse) works | `src/tests/lib/document-extraction.test.ts` |
| **Phase 7** | Document versioning creates child versions | `src/tests/actions/documents/versioning.test.ts` |
| **Phase 8** | Email template rendering with interpolation | `src/tests/lib/email/service.test.ts` |
| **Phase 8** | SMTP + SES providers send correctly | `src/tests/lib/email/providers.test.ts` |
| **Phase 8** | IMAP incremental sync tracks UID correctly | `src/tests/lib/email/imap-sync.test.ts` |
| **Phase 8** | Email-to-CRM linking matches contacts/accounts | `src/tests/actions/emails/link-crm.test.ts` |
| **Phase 8** | IMAP safety guards prevent unsafe operations | `src/tests/lib/email/imap-safety.test.ts` |
| **Phase 9** | Vector embeddings created + stored in pgvector | `src/tests/inngest/embed-functions.test.ts` |
| **Phase 9** | Semantic search returns similar records | `src/tests/lib/ai/semantic-search.test.ts` |
| **Phase 9** | Record summarization generates + caches summaries | `src/tests/lib/ai/summarize.test.ts` |
| **Phase 9** | E2B enrichment agents discover + confidence score | `src/tests/lib/enrichment/e2b.test.ts` |
| **Phase 9** | 3-tier API key resolution (ENV → system → user) | `src/tests/lib/api-keys.test.ts` |
| **Phase 10** | Full-text index built on `Record.searchVector` | `src/tests/lib/search/postgresql.test.ts` |
| **Phase 10** | Search results respect org + record access scoping | `src/tests/lib/search/scoping.test.ts` |
| **Phase 10** | Ranking uses `ts_rank_cd` + exact-match boost | `src/tests/lib/search/ranking.test.ts` |
| **Phase 10** | Combined keyword + semantic search returns grouped results | `src/tests/lib/search/unified.test.ts` |
| **Phase 10** | Command palette returns nav + records + objects | `src/tests/api/cmk.test.ts` |
| **Phase 10** | `buildRecordAccessFilter` + `buildRecordAccessSql` equivalence | `src/tests/security/record-access-equivalence.test.ts` |
| **Phase 11** | MCP server accepts streamable HTTP + SSE | `src/tests/mcp/transport.test.ts` |
| **Phase 11** | API tokens are SHA-256 hashed at rest | `src/tests/lib/api-tokens.test.ts` |
| **Phase 11** | Bearer auth enforced on all MCP endpoints | `src/tests/mcp/auth.test.ts` |
| **Phase 11** | MCP tools delegate to `assertCan*` scope helpers | `src/tests/mcp/scope-parity.test.ts` |
| **Phase 11** | Dev session fallback gated on `NODE_ENV !== production` | `src/tests/mcp/dev-fallback.test.ts` |
| **Phase 12** | `diffObjects` computes correct before/after | `src/tests/lib/audit-log.test.ts` |
| **Phase 12** | `writeAuditLog` is fire-and-forget (no mutation blocking) | `src/tests/lib/audit-log.test.ts` |
| **Phase 12** | Per-entity History tab shows audit + comments + history | `src/tests/client/history-tab.test.ts` |
| **Phase 12** | Admin audit log page filters + restores | `src/tests/admin/audit-log.test.ts` |
| **Phase 13** | Funnel timers fire Inngest jobs correctly | `src/tests/inngest/crm-automation.test.ts` |
| **Phase 13** | Stage transition triggers activate automation | `src/tests/lib/crm/stage-transition.test.ts` |
| **Phase 13** | Auto-task generation on stage change | `src/tests/lib/crm/auto-task.test.ts` |
| **Phase 13** | Approval gate blocks unapproved opportunities | `src/tests/lib/crm/approval-gate.test.ts` |
| **Phase 13** | Campaign sequences send with correct cadence | `src/tests/inngest/campaigns.test.ts` |
| **Phase 13** | Webhook recursion guard prevents loops | `src/tests/lib/webhooks/recursion.test.ts` |
| **Phase 14** | Webhook payload signing (HMAC-SHA256) | `src/tests/lib/webhooks/service.test.ts` |
| **Phase 14** | Webhook signature verification | `src/tests/lib/webhooks/verifier.test.ts` |
| **Phase 14** | API token scope enforcement in middleware | `src/tests/security/api-token-scoping.test.ts` |
| **Phase 14** | Cross-org token isolation | `src/tests/security/api-token-scoping.test.ts` |
| **Phase 14** | REST connector framework works | `src/tests/lib/connectors/rest.test.ts` |
| **Phase 14** | Webhooks fire on record mutations + retry | `src/tests/actions/record-webhook-firing.test.ts` |
| **Phase 15** | Existing 104 tests still pass (`npm run test:unit`) | CI |
| **Phase 15** | Client component tests pass (jsdom) | `src/tests/client/**/*.test.tsx` |
| **Phase 15** | E2E tests pass (Playwright) | `npm run test:e2e` |
| **Phase 15** | API route tests cover all endpoints | `src/tests/api/**/*.test.ts` |
| **Phase 15** | Admin action tests cover all actions | `src/tests/admin/**/*.test.ts` |
| **Phase 15** | Worker/job tests cover all queues | `src/tests/jobs/**/*.test.ts` |
| **Phase 15** | CI/CD pipeline runs on every PR | `.github/workflows/ci.yml` |
| **Phase 16** | Redis-backed rate limiter works in distributed mode | `src/tests/lib/rate-limit-redis.test.ts` |
| **Phase 16** | Security headers present on all responses | `src/tests/security/headers.test.ts` |
| **Phase 16** | No secrets in code or git history | `scripts/scan-secrets.sh` in CI |
| **Phase 16** | Cookie hardening (SameSite/Secure/__Host) | `src/tests/security/cookie-hardening.test.ts` |
| **Phase 16** | Dependency scan passes (no known vulns) | `.github/workflows/ci.yml` |
| **Phase 16** | Cross-org isolation for all new models | Extend `org-isolation.test.ts` for each new model |

### 10.2 Final Verification (Pre-Production)

- [ ] `npm run lint` — zero errors
- [ ] `tsc --noEmit` — zero type errors (or `npm run typecheck`)
- [ ] `npm run test:unit` — 104 existing + all new tests pass
- [ ] `npm run test:e2e` — Playwright E2E passes (auth, CRUD, admin, cmdk, invoices, MCP)
- [ ] `npm run build` — production build succeeds
- [ ] Docker compose starts cleanly: `docker-compose up -d` (app + postgres + minio + inngest)
- [ ] Multi-org isolation: user in Org A cannot access Org B records (all new models tested)
- [ ] MCP: 127 tools authenticated + scoped; no auth bypass
- [ ] Audit log: all mutations logged; append-only; admin page functional
- [ ] Email: IMAP sync + SMTP send working with real credentials (test env)
- [ ] Storage: S3/MinIO upload + download working; local fallback preserved
- [ ] Search: full-text + semantic returning correct, scoped results
- [ ] Invoicing: full lifecycle + PDF + email + multi-currency working
- [ ] Automation: funnel timers + campaign sequences firing correctly
- [ ] `.env.example` documents all 30+ environment variables

---

## 11. Appendices

### 11.1 Audit Document Cross-Reference

| Document | Path | Purpose |
|----------|------|---------|
| Architecture & Security Audit | `ARCHITECTURE_AUDIT.md` | Architecture overview + security assessment (60+ models, 3256-line record-actions) |
| P0 Audit | `docs/P0_AUDIT.md` | Working-copy correctness audit; identifies gaps (login fixed, soft-delete unwired, etc.) |
| OpenCRM Feature Inventory | `docs/OPENCRM_AUDIT.md` | Comprehensive feature catalog of the existing openCRM codebase |
| NextCRM Feature Inventory | `docs/NEXTCRM_AUDIT.md` | Feature inventory of the NextCRM reference implementation |
| NextCRM Specification | `docs/NEXTCRM_SPECIFICATION.md` | Cahier des charges — target state + architecture + security model |
| Feature Matrix | `docs/FEATURE_MATRIX.md` | Side-by-side comparison: NextCRM vs openCRM with migration decisions |
| Implementation Roadmap | `docs/IMPLEMENTATION_ROADMAP.md` | Phase-by-phase file targets + sprint schedule + consolidated env vars |
| UI/Auth/i18n Audit | `docs/UI_AUTH_I18N_AUDIT.md` | Login bug fix, auth architecture, i18n system, hardcoded strings |
| This Document | `docs/MIGRATION_PLAN.md` | Phased migration plan with 16 phases, risk register, resource estimates |

### 11.2 Key File Locations (openCRM)

| Concern | Key File(s) |
|---------|-------------|
| Schema | `prisma/schema.prisma` (~1267 lines, 47 models, 4 migrations) |
| Migration dir | `prisma/migrations/` (4 migrations: init, email_verified, betterauth_columns, soft_delete) |
| Auth config | `src/auth.ts` (Better-Auth, bcrypt cost 12, JWT, username plugin, admin plugin) |
| Auth actions | `src/actions/auth.ts` (register, legacySignInAction — cost 12 aligned) |
| Session context | `src/lib/auth/context.ts` (zero-arg `getUserContext()`) |
| JWT proxy | `src/lib/auth/proxy.ts` (jose-based session verification) |
| Legacy sign-in | `src/lib/auth-proxy-fix.ts` (bcryptjs.compare fallback) |
| Permissions | `src/lib/permissions.ts` (304 lines — RBAC + record access) |
| Record access | `src/lib/record-access.ts` (104 lines — OR-clause + raw SQL) |
| Record CRUD | `src/actions/standard/record-actions.ts` (3256 lines) |
| Lead actions | `src/actions/standard/lead-actions.ts` (convertLead) |
| Admin actions | `src/actions/admin/admin-actions.ts` (object/field/rule CRUD) |
| Permission actions | `src/actions/admin/permission-actions.ts` (sanitizeUserObjectPermissions) |
| User actions | `src/actions/admin/user-actions.ts` (getUsers, createUser, deactivateUser) |
| Middleware | `src/middleware.ts` (rate limit + CSRF + auth gate) |
| Rate limit (in-mem) | `src/lib/rate-limit.ts` (sliding window RateLimiter class) |
| Rate limit (Redis) | `src/lib/rate-limit-redis.ts` (exists, unused — wire in Phase 16) |
| Rate limit store | `src/lib/rate-limit-store.ts` (singleton, 20 req/60s) |
| Field data (EAV) | `src/lib/field-data.ts` (192 lines — 14 field type normalization) |
| File storage | `src/lib/file-storage.ts` (path traversal guard) |
| Import processing | `src/lib/import-processing.ts` (687 lines) |
| Sharing recompute | `src/lib/sharing-rule-recompute.ts` |
| Metadata deps | `src/lib/metadata-dependencies.ts` |
| Seeding | `src/lib/seeding/create-org-template.ts` (342 lines), `create-default-app.ts` (156 lines) |
| Crypto | `src/lib/crypto.ts` (BCRYPT_COST = 12) |
| Dashboard | `src/actions/standard/dashboard-actions.ts` (getMetricData, getListWidgetData, getChartData) |
| Command actions | `src/actions/standard/command-actions.ts` (exists, extends in Phase 10) |
| Worker | `src/jobs/sharing-rule-worker.ts` (pg-boss, 2 queues) |
| Tests | `src/tests/` (18 files, 104 cases — all server-side, mock-based, Vitest) |

### 11.3 Environment Variables (Consolidated)

All environment variables — existing and new — introduced across the migration:

```dotenv
# --- Existing (preserved) ---
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
JWT_SECRET=... (fallback to BETTER_AUTH_SECRET)
NEXT_LOCALE=en
NODE_ENV=development|production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Phase 2 — Auth Foundation ---
# bcrypt cost already in src/lib/crypto.ts (BCRYPT_COST = 12)
# OAuth (optional — for Phase 8 calendar sync)
GOOGLE_ID=...
GOOGLE_SECRET=...

# --- Phase 7 — Document Store ---
STORAGE_PROVIDER=local|s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com  (or MinIO endpoint)
NEXT_PUBLIC_STORAGE_ENDPOINT=...

# --- Phase 8 — Email ---
EMAIL_PROVIDER=console|smtp|ses
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=...
SES_SECRET_ACCESS_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
RESEND_WEBHOOK_SECRET=...
MAILTRAP_API_KEY=...
EMAIL_ENCRYPTION_KEY=... (64 hex chars for AES-256-GCM)
IMAP_HOST=...
IMAP_PORT=...
IMAP_USER=...
IMAP_PASSWORD=...
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...

# --- Phase 9 — AI Features ---
AI_PROVIDER=none|openai|anthropic
AI_API_KEY=...
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
E2B_API_KEY=...
FIRECRAWL_API_KEY=...

# --- Phase 10 — Search ---
SEARCH_PROVIDER=postgresql|elasticsearch|meilisearch
ELASTICSEARCH_URL=http://localhost:9200
ENABLE_SEMANTIC_SEARCH=true|false

# --- Phase 6 — Invoicing ---
INVOICE_NUMBERING_PREFIX=INV-
INVOICE_DEFAULT_DUE_DAYS=30
ECN_SYNC_CRON=0 2 * * *  (daily ECB exchange rate sync)
ECB_SYNC_ENABLED=true|false

# --- Phase 16 — Observability ---
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=...
```

---

## 12. Acceptance Criteria (Per Phase)

Each phase is accepted when all of the following are true:

1. **Functional:** All new features work in the standard app and admin area without breaking existing functionality
2. **Security:** Tenant isolation is preserved; no new privilege-escalation vectors; soft-delete respected in all new read paths
3. **Tests:** Unit tests cover new Server Actions; security tests cover new authz paths; existing tests still pass
4. **Docs:** `Technical Documentation/` updated with new metadata artifacts; `ARCHITECTURE_AUDIT.md` updated if architecture changes
5. **Build:** `npm run lint && tsc --noEmit && npm run build` pass cleanly
6. **No regressions:** All 104 existing tests pass (`npm run test:unit`)
7. **i18n:** All new UI strings use `t()` (client) or `getT()` (server); no hardcoded English in new components
8. **Env:** `.env.example` updated with any new environment variables; documented with purpose + required/optional

---

*MIGRATION_EOF
echo "File written"