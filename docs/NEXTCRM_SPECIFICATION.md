# NextCRM — Cahier des Charges (Technical Specification)

**Project:** openCRM → NextCRM modernization  
**Status:** Approved baseline for implementation  
**Date:** 2026-09-22  
**Version:** 1.0  

---

## 1. Context and Objectives

### 1.1 Background

openCRM is a multi-tenant, metadata-driven CRM built on the Next.js App Router (React 19, TypeScript), PostgreSQL, Prisma ORM, and Better-Auth. Its core is a Universal Object Engine — an EAV pattern where all business records live in a single `Record` table with typed values in `FieldData`, governed entirely by runtime metadata (`ObjectDefinition`, `FieldDefinition`, `ValidationRule`, etc.).

The current working copy (see `ARCHITECTURE_AUDIT.md`, `P0_AUDIT.md`, and `docs/UI_AUTH_I18N_AUDIT.md`) implements a solid baseline: RBAC via permission sets/groups, three-layer tenant isolation, secure auth (bcrypt cost 12, JWT sessions), assignment/sharing/duplicate/validation rule engines, async import, dashboards, list views, kanban, global search, chatter/comments, and soft-delete in the schema (unwired).

### 1.2 Objective

NextCRM defines the target product and technical architecture for the next evolution of openCRM. It specifies the feature surface, data-model extensions, integration points, and the 16-phase migration that transforms the current codebase into a complete, production-grade multi-tenant CRM platform.

### 1.3 Goals

| # | Goal | Rationale |
|---|------|-----------|
| G-01 | Wire soft-delete end-to-end | Schema migration exists; reads and `deleteRecord` still hard-delete |
| G-02 | Enable multi-org membership | Single org per user blocks org switching (P0-1) |
| G-03 | Expand CRM object coverage | Seed Product, Note, Call, Meeting, Document (P0-2/P0-6/P0-9) |
| G-04 | Implement activities & timeline | No Contact 360 timeline; only a `task` object (P0-3/P0-6) |
| G-05 | Complete lead lifecycle | State machine + full conversion (Company + Contact + Opportunity) (P0-4) |
| G-06 | Enrich opportunity pipeline | Stage history, probability, expected revenue (P0-5) |
| G-07 | Object storage backend | Replace local-disk-only with S3/MinIO adapter (P0-9) |
| G-08 | Email provider abstraction | No outbound email capability exists |
| G-09 | Evolve search infrastructure | Server-side LIKE search; evolve for scale + AI |
| G-10 | Add command palette | Cmd+K palette is missing (P0-14) |
| G-11 | Introduce AI assistant | AI-powered summarization, assistance, smart search |
| G-12 | Build communication hub | Enhanced notifications, email digests, in-app messaging |
| G-13 | Add reporting & forecasting | Reports builder + opportunity forecasting |
| G-14 | Create integration hub | Webhooks, API tokens, connector framework |
| G-15 | Harden performance & observability | Caching, query profiling, metrics collection |
| G-16 | Establish delivery & quality | Client tests, E2E, CI/CD, packaging cleanup |

### 1.4 Out of Scope

- Mobile app native development
- Desktop application packaging
- Third-party marketplace plugin ecosystem (Phase 14 provides the *framework*; marketplace is Phase N+1)
- White-label reskinning (beyond theming)

---

## 2. Scope

### 2.1 In Scope

1. All existing openCRM features (preserved, wired, and hardened)
2. The 16 migration phases defined in Section 6
3. New CRM objects: Product, Note, Call, Meeting, Document
4. Activities engine and unified timeline
5. Lead lifecycle state machine and full conversion
6. Opportunity pipeline stage history and forecasting
7. Object storage backend (S3/MinIO)
8. Email provider abstraction (SMTP/SES)
9. Command palette
10. AI assistant subsystem
11. Communication hub (enhanced notifications + email digests)
12. Reports and forecasting
13. Integration hub (webhooks, API tokens, connectors)
14. Performance optimization and observability
15. Test coverage expansion (client, E2E, API routes)
16. CI/CD pipeline and packaging cleanup

### 2.2 Out of Scope

| Item | Reason |
|------|--------|
| Native mobile app | Requires separate React Native or Flutter effort |
| Real-time collaboration editing | WebSocket operational transform is beyond scope |
| Full ERP accounting | CRM scope; financial modules are future work |
| Voice-over-IP telephony | Integration hook provided; actual telephony is partner integration |

---

## 3. Terminology

| Term | Definition |
|------|------------|
| **Organization** | Tenant root. Every tenant-scoped record carries `organizationId`. (`schema.prisma:105`) |
| **Object / ObjectDefinition** | Metadata describing a business entity (apiName, label, fields, flags). (`schema.prisma:531`) |
| **Record** | A row in the universal `Record` table, belonging to one `ObjectDefinition`. (`schema.prisma:633`) |
| **FieldData** | Typed EAV cell for one field on one record. (`schema.prisma:769`) |
| **Field types** | 14 types: Text, TextArea, Number, Currency, Date, DateTime, Checkbox, Phone, Email, Url, Lookup, Picklist, File, AutoNumber. (`create-org-template.ts`) |
| **Permission Set** | Named collection of object permissions + app access + system flags. |
| **Permission Set Group** | Bundle of permission sets; expanded into direct assignments at assignment time. |
| **Queue** | Shared work bucket; membership grants read-only access. |
| **Group** | Named user collection for sharing (not ownership). |
| **RecordShare** | Materialized per-record share row (USER/GROUP, READ/EDIT/DELETE). |
| **Assignment Rule** | Criteria → user/queue routing evaluated on create. (`schema.prisma:476`) |
| **Sharing Rule** | Criteria → group access materialized into `RecordShare` rows. (`schema.prisma:503`) |
| **Validation Rule** | Pre-save conditions with custom logic expressions. (`schema.prisma:1030`) |
| **Duplicate Rule** | Multi-field match logic; WARN or BLOCK on create/edit/import. (`schema.prisma:1084`) |
| **External ID** | One text field per object used for import matching and lookup resolution. |
| **Soft Delete** | `Record.isDeleted` flag (schema + migration done, wiring in progress). (`schema.prisma:659`) |
| **User Companion** | One Prisma `User` ↔ one companion `Record` for the `user` object. (`schema.prisma:652`) |

---

## 4. Target Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         NextCRM Platform                          │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │   /app/(auth)   │  │ /app/(standard)  │  │  /app/(admin)  │  │
│  │   login/register │  │  CRM UI, lists,  │  │  Admin console │  │
│  │   org switch     │  │  detail, timeline│  │  object builder │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │            │
│  ┌────────┴────────────────────┴─────────────────────┴─────────┐  │
│  │                    Middleware (Edge)                          │  │
│  │  src/middleware.ts                                            │  │
│  │  • Auth rate limiting (20 req/60s per IP on /api/auth)       │  │
│  │  • CSRF origin/referer defense on mutating API requests       │  │
│  │  • JWT session proxy (getProxySession via jose)               │  │
│  │  • Route-level auth: redirect / 401 / admin gate              │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    API Gateway / Routes                        │  │
│  │  /api/search/global        — enhanced search endpoint          │  │
│  │  /api/notifications        — notification CRUD                │  │
│  │  /api/files/...            — multipart upload/download        │  │
│  │  /api/fields/...           — field metadata                   │  │
│  │  /api/webhooks/...         — [NEW] webhook delivery log         │  │
│  │  /api/integrations/...     — [NEW] API tokens, connectors       │  │
│  │  /api/cmdk/...             — [NEW] command palette search        │  │
│  │  /api/ai/...               — [NEW] AI assistance endpoints      │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                  Server Actions (mutations)                 │  │
│  │  src/actions/                                                 │  │
│  │  ├── standard/                                              │  │
│  │  │   ├── record-actions.ts  (CRUD + list + soft-delete)       │  │
│  │  │   ├── lead-actions.ts    (+full conversion)               │  │
│  │  │   ├── opportunity-actions.ts  [NEW]                       │  │
│  │  │   ├── activity-actions.ts  [NEW]                         │  │
│  │  │   ├── comment-actions.ts                                   │  │
│  │  │   ├── list-view-actions.ts                                 │  │
│  │  │   ├── import-actions.ts                                  │  │
│  │  │   ├── dashboard-actions.ts                                 │  │
│  │  │   ├── lookup-actions.ts                                    │  │
│  │  │   ├── command-actions.ts  [NEW]                            │  │
│  │  │   └── ai-actions.ts  [NEW]                                  │  │
│  │  └── admin/                                                   │  │
│  │      ├── admin-actions.ts  (object/field/rule CRUD)          │  │
│  │      ├── permission-actions.ts                                │  │
│  │      ├── user-actions.ts                                      │  │
│  │      ├── product-actions.ts  [NEW]                            │  │
│  │      ├── report-actions.ts  [NEW]                             │  │
│  │      ├── webhook-actions.ts  [NEW]                            │  │
│  │      ...                                                      │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    Business Logic Layer                        │  │
│  │  src/lib/                                                     │  │
│  │  ├── permissions.ts  (RBAC + org-aware)                       │  │
│  │  ├── record-access.ts  (row-level OR-clause)                  │  │
│  │  ├── field-data.ts  (EAV normalization)                       │  │
│  │  ├── validation/ (rule-logic + record-validation)             │  │
│  │  ├── duplicates/duplicate-rules.ts                            │  │
│  │  ├── import-processing.ts                                     │  │
│  │  ├── metadata-dependencies.ts                                 │  │
│  │  ├── file-storage.ts  (+ storage adapter)                     │  │
│  │  ├── email/  [NEW] (provider abstraction)                     │  │
│  │  ├── search/  [NEW] (query builder + provider)                │  │
│  │  ├── ai/  [NEW] (assistant, summarization)                   │  │
│  │  ├── cmdk/  [NEW] (command resolver)                         │  │
│  │  ├── rate-limit* (sliding window)                             │  │
│  │  ├── auto-number.ts / csv.ts / temporal.ts / unique.ts        │  │
│  │  ├── auth/{context.ts, proxy.ts}                              │  │
│  │  ├── sharing-rule-recompute.ts                                │  │
│  │  ├── user-companion.ts                                        │  │
│  │  └── seeding/ (create-org-template, create-default-app)       │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    Prisma ORM + Migrations                   │  │
│  │  prisma/schema.prisma (~60 models → ~75 models)              │  │
│  │  • Organization-scoped every query                           │  │
│  │  • Raw SQL ($queryRaw) for EAV field sorting + full-text      │  │
│  │  • Transactions (db.$transaction) for atomicity               │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    PostgreSQL (primary)                        │  │
│  │  + pg-boss queue tables (sharing, import, email, AI, webhook)  │  │
│  │  + Redis (cache layer)[Phase 15]                              │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    External Services                           │  │
│  │  S3 / MinIO (object storage)[Phase 07]                         │  │
│  │  SMTP / SES (email provider)[Phase 08]                         │  │
│  │  Elasticsearch / MeiliSearch (search)[Phase 09]                │  │
│  │  AI provider (LLM API)[Phase 11]                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Background Worker (pg-boss)                    │  │
│  │  src/jobs/nextcrm-worker.ts                                    │  │
│  │  • sharing-rule.recompute                                      │  │
│  │  • import.process                                                │  │
│  │  • email.send  [NEW][Phase 08]                                 │  │
│  │  • webhook.deliver  [NEW][Phase 14]                            │  │
│  │  • ai.process  [NEW][Phase 11]                                 │  │
│  │  • report.generate  [NEW][Phase 13]                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Request flow (target):** A Server Action or Route Handler call → `getUserContext()` (zero args, session-derived org) → permission check (`checkPermission`) → record-level access filter (`buildRecordAccessFilter` / `buildRecordAccessSql`) → Prisma query, raw SQL, or external API → transaction commit → `revalidatePath`.

---

## 5. Product Domains and Feature Inventory

### 5.1 Identity & Access

| Feature | Status | Implementation |
|---------|--------|----------------|
| Authentication (email + username) | Existing | `src/auth.ts`, `src/actions/auth.ts` |
| Bcrypt password hashing (cost 12) | Existing | `src/auth.ts:69` (Better-Auth), `src/lib/crypto.ts:5` |
| JWT session strategy | Existing | `src/auth.ts:76-87` |
| Rate limiting (auth endpoints) | Existing | `src/middleware.ts:61-80`, `src/lib/rate-limit-store.ts` |
| CSRF defense (origin/referer) | Existing | `src/middleware.ts:82-99` |
| Organization switching | **NEW (Phase 2)** | `OrganizationMember` model, org-switcher UI |
| SSO / OAuth providers | **NEW (Phase 8)** | Email provider phase adds OAuth strategy hooks |
| API token authentication | **NEW (Phase 14)** | `api_tokens` table, bearer-token middleware |

### 5.2 Tenant Isolation

Three layers are preserved and hardened in NextCRM:

| Layer | Mechanism | Source |
|-------|-----------|--------|
| 1. Session-derived context | `getUserContext()` zero-arg; `organizationId` from JWT | `src/lib/auth/context.ts:3` |
| 2. Org-scoped queries | Every Prisma query includes `organizationId` | All Server Actions |
| 3. Record-level access filter | `buildRecordAccessFilter` + org-scoped `EXISTS` subquery | `src/lib/record-access.ts` |

### 5.3 Metadata Platform

The metadata-driven Universal Object Engine is the architectural spine and is **preserved** in NextCRM. New features integrate into the dependency index (`MetadataDependency`) for safe deletion.

| Artifact | Status |
|----------|--------|
| ObjectDefinition / FieldDefinition / PicklistOption | Existing |
| ValidationRule + ValidationCondition | Existing |
| DuplicateRule + DuplicateRuleCondition | Existing |
| AssignmentRule | Existing |
| SharingRule | Existing |
| RecordPageLayout + RecordPageAssignment | Existing |
| ListView / ListViewColumn / ListViewShare / ListViewPin | Existing |
| AppDefinition / AppNavItem / DashboardWidget | Existing |
| MetadataDependency | Existing |
| **ReportDefinition** | **NEW (Phase 13)** |

### 5.4 CRM Core Modules

| Module | Fields (existing) | Status | Gap |
|--------|-------------------|--------|-----|
| Company | name, website, industry | Existing | None |
| Contact | name, first_name, last_name, email, phone, title, company | Existing | No timeline |
| Opportunity | name, amount, stage, close_date, company | Existing | No stage history, probability, forecast |
| Case | case_number (AutoNumber), subject, description, status, priority, company | Existing | None |
| Lead | name, first_name, last_name, email, phone, title, company_name, company, contact, status, is_converted | Existing | No lifecycle, partial conversion, no score/source |
| Task | name, description, status, lead, contact | Existing | No due date / priority |
| User | companion record | Existing | Special (companion) |
| **Product** | — | **NEW (Phase 3)** | Needs object, fields |
| **Note** | — | **NEW (Phase 3)** | Needs object + relationship |
| **Call** | — | **NEW (Phase 3/4)** | Activity type |
| **Meeting** | — | **NEW (Phase 3/4)** | Activity type |
| **Document** | — | **NEW (Phase 3)** | Need file-backed object |
| **Activity** (unified) | — | **NEW (Phase 4)** | Timeline backbone |

### 5.5 Record Lifecycle

| Operation | Status |
|-----------|--------|
| Create | Existing — `createRecord` (`record-actions.ts`) |
| Read | Existing — `getRecord` / `getRecords` |
| Update | Existing — `updateRecord` |
| Soft-delete | **NEW (Phase 1)** — `deleteRecord` currently hard-deletes |
| Restore | **NEW (Phase 1)** — new `restoreRecord` action |
| Purge (hard delete) | Existing — `purgeRecord`, admin-gated |
| Ownership change | Existing — `moveRecord`, `claimRecord` |
| Owner history | Existing — `RecordOwnerHistory` |

### 5.6 Business Rules

| Rule Engine | Status |
|-------------|--------|
| Assignment rules (create-time routing) | Existing |
| Sharing rules (materialized RecordShare) | Existing |
| Validation rules (custom logic) | Existing |
| Duplicate rules (warn/block) | Existing |
| Auto-number | Existing |
| **Process / workflow rules** | **NEW (future)** — not in 16-phase scope |

### 5.7 Collaboration

| Feature | Status |
|---------|--------|
| Chatter (comments + @mentions) | Existing |
| Field history | Existing — `FieldHistory` |
| Owner history | Existing — `RecordOwnerHistory` |
| Notifications (assignment, queue, mention) | Existing |
| **Communication hub** (digests, channels) | **NEW (Phase 12)** |
| **Unified activity timeline** | **NEW (Phase 4)** |

### 5.8 Search

| Capability | Status |
|------------|--------|
| Global search (server-side LIKE, org-scoped) | Existing — `src/app/api/search/global/route.ts` |
| Record-scoped search | Existing |
| **Full-text index (PostgreSQL tsvector)** | **NEW (Phase 9)** |
| **Search provider abstraction** | **NEW (Phase 9)** |
| **Fuzzy + AI re-ranking** | **NEW (Phase 11)** |

### 5.9 Dashboards & Analytics

| Feature | Status |
|---------|--------|
| Metric / list / chart widgets | Existing |
| **Reports builder** | **NEW (Phase 13)** |
| **Opportunity forecasting** | **NEW (Phase 6 + 13)** |
| **AI insights** | **NEW (Phase 11)** |

### 5.10 Data Management

| Feature | Status |
|---------|--------|
| Async bulk import (CSV, pg-boss) | Existing |
| External ID matching | Existing |
| CSV formula injection mitigation | Existing |
| **File attachment import** | **Future** |
| Local disk file storage | Existing (gap — no S3) |
| **S3 / MinIO object storage** | **NEW (Phase 7)** |

### 5.11 Integration & Automation

| Feature | Status |
|---------|--------|
| Webhooks (outbound) | **NEW (Phase 14)** |
| **Webhook delivery log + retry** | **NEW (Phase 14)** |
| API tokens (bearer) | **NEW (Phase 14)** |
| REST connector framework | **NEW (Phase 14)** |
| **Inbound webhooks** | **Future** |

### 5.12 Command Palette

| Feature | Status |
|---------|--------|
| Cmd+K searchable palette | **NEW (Phase 10)** |
| Object / record / nav search | **NEW (Phase 10)** |

### 5.13 AI Assistant

| Feature | Status |
|---------|--------|
| Record summarization | **NEW (Phase 11)** |
| Smart field suggestions | **NEW (Phase 11)** |
| Natural-language search | **NEW (Phase 11)** |
| Conversation assistant | **NEW (Phase 11)** |

### 5.14 Email

| Feature | Status |
|---------|--------|
| **SMTP / SES provider abstraction** | **NEW (Phase 8)** |
| Email templates | **NEW (Phase 8)** |
| Assignment / workflow email | **NEW (Phase 12)** |

### 5.15 Developer Experience

| Feature | Status |
|---------|--------|
| TypeScript + ESLint | Existing |
| Vitest unit tests | Existing (104 tests, 18 files) |
| **Client component tests (jsdom)** | **NEW (Phase 16)** |
| **E2E tests (Playwright)** | **NEW (Phase 16)** |
| CI/CD (GitHub Actions) | **NEW (Phase 16)** |
| i18n (custom t-function, en + fr) | Existing |

---

## 6. Migration Phases (16 Phases)

The NextCRM transformation is executed across **16 phases**. Each phase is self-contained, adds observable product value, and depends only on prior phases (unless noted).

### Phase 1 — Soft-Delete Wiring

**Goal:** Wire the existing `Record.isDeleted` schema field across all record reads, soft-delete in `deleteRecord`, add `restoreRecord`, and add trash UI.

**Key deliverables:**
- All read paths (`getRecords`, `getRecord`, lookup resolution, related lists, global search, dashboard widgets, `moveRecord`) filter `isDeleted: false` by default
- `deleteRecord` sets `isDeleted = true` (soft) instead of hard-deleting
- New `restoreRecord` Server Action
- Admin trash view with restore + permanent purge
- `includeDeleted` opt-in restricted to `viewAll`/`modifyAll`

**Source files:** `src/actions/standard/record-actions.ts`, `src/lib/record-access.ts`, `src/app/api/search/global/route.ts`, `src/actions/admin/*.ts`

### Phase 2 — Multi-Org Membership

**Goal:** Enable users to belong to multiple organizations with a runtime org switcher.

**Key deliverables:**
- New `OrganizationMember` Prisma model with `role` and `isDefault`
- `switchOrganization(orgId)` Server Action — re-issues session with new `organizationId`
- Org-switcher UI component in app header
- `getUserContext()` updated to resolve active org from session
- Cross-org isolation tests for the new membership model

**Source files:** `prisma/schema.prisma`, `src/auth.ts`, `src/lib/auth/context.ts`, `src/actions/admin/user-actions.ts`

### Phase 3 — CRM Object Expansion

**Goal:** Seed Product, Note, Call, Meeting, and Document as first-class objects.

**Key deliverables:**
- New `ObjectDefinition` + `FieldDefinition` seeds in `create-org-template.ts`
- Product: name, SKU, price, description, company lookup
- Note: title, body, related-to lookup
- Call: subject, status, direction, duration, related-to
- Meeting: subject, start, end, attendees, related-to
- Document: title, file (File field), version, related-to
- Dependency index entries for new objects

**Source files:** `src/lib/seeding/create-org-template.ts`, `src/lib/seeding/create-default-app.ts`

### Phase 4 — Activities & Timeline

**Goal:** Introduce a unified Activity record type and a Contact 360 timeline.

**Key deliverables:**
- `Activity` object with `activityType` (CALL, MEETING, TASK, EMAIL, NOTE) and `relatedTo` lookup
- Timeline component aggregating activities, comments, field history on the record page
- Activity creation from timeline + quick-create bar
- Dependency entries for Activity

**Source files:** `src/lib/seeding/create-org-template.ts`, `src/components/standard/record/record-detail.tsx`, `src/actions/standard/activity-actions.ts` (new)

### Phase 5 — Lead Lifecycle

**Goal:** Implement the full lead lifecycle: state machine, status stages, and complete conversion.

**Key deliverables:**
- Lead status picklist: New → Contacted → Qualified → Unqualified → Converted → Rejected
- Enforced state transitions on status change
- `convertLead` creates Company (if new) + Contact + Opportunity and marks `is_converted`
- Lead score and source fields
- Assignment rules apply to leads

**Source files:** `src/actions/standard/lead-actions.ts`, `src/lib/seeding/create-org-template.ts`

### Phase 6 — Opportunity Pipeline & Forecasting

**Goal:** Stage history, probability, expected revenue, and forecast categories.

**Key deliverables:**
- `OpportunityStage` history table (or `FieldHistory`-based stage tracking)
- Probability field (derived from stage + editable)
- Expected close value (amount × probability)
- Forecast category (Best Case, Commit, Pipeline)

**Source files:** `prisma/schema.prisma`, `src/actions/standard/opportunity-actions.ts` (new)

### Phase 7 — Document Store Backend

**Goal:** Pluggable object storage with local + S3/MinIO backends.

**Key deliverables:**
- `StorageProvider` interface in `src/lib/file-storage.ts`
- Local filesystem adapter (existing behavior)
- S3 / MinIO adapter (AWS SDK)
- `STORAGE_PROVIDER` env config + `S3_*` env vars
- Migration of new uploads to selected backend
- Path-traversal guard retained

**Source files:** `src/lib/file-storage.ts`, `src/app/api/files/upload/route.ts`, `src/app/api/files/[id]/route.ts`, `src/auth.ts` (new `.env.example`)

### Phase 8 — Email Provider

**Goal:** Outbound email abstraction with SMTP and SES backends.

**Key deliverables:**
- `EmailProvider` interface + SMTP + SES adapters in `src/lib/email/`
- Email template system (Handlebars-style or simple interpolation)
- Transactional email types: assignment, mention, password reset, digest
- Background queue `email.send` (pg-boss)
- Template management in admin

**Source files:** `src/lib/email/`, `src/lib/jobs/email-jobs.ts` (new), `src/jobs/nextcrm-worker.ts` (new queue)

### Phase 9 — Search Infrastructure

**Goal:** PostgreSQL full-text search with provider abstraction.

**Key deliverables:**
- `tsvector` column on `FieldData` / materialized search vector on `Record`
- Sync trigger or app-level index on field save
- `SearchProvider` interface (PostgreSQL native + optional Elasticsearch/Meili)
- Field-scoped search, phrase matching, typo tolerance
- Org + record-access scoping enforced

**Source files:** `src/lib/search/`, `src/app/api/search/global/route.ts`, `prisma/schema.prisma`

### Phase 10 — Command Palette

**Goal:** Cmd+K searchable command palette.

**Key deliverables:**
- `/api/cmdk` endpoint returning object/nav/record suggestions
- `CommandPalette` React component (`cmdk` package, already installed)
- Keyboard shortcut handler, fuzzy matching
- Recent / starred items

**Source files:** `src/app/api/cmdk/route.ts`, `src/components/standard/layout/command-palette.tsx`

### Phase 11 — AI Assistant

**Goal:** AI-powered record summarization, smart field suggestions, and natural-language search.

**Key deliverables:**
- LLM provider abstraction (`OPENAI_API_KEY` or compatible)
- Record summary generation (stored, re-validated on field change)
- Smart field suggestions from unstructured notes
- Natural-language-to-criteria translation for list views
- Background `ai.process` queue

**Source files:** `src/lib/ai/`, `src/app/api/ai/`, `src/lib/jobs/ai-jobs.ts`

### Phase 12 — Communication Hub

**Goal:** Enhanced notifications, email digests, and a unified communication view.

**Key deliverables:**
- Notification types: email digest, report ready, workflow alert
- Daily/weekly digest aggregation (batch email)
- In-app communication hub page
- Webhook-style notification delivery log

**Source files:** `src/app/api/notifications/route.ts`, `src/lib/email/templates.ts`

### Phase 13 — Reporting & Forecasting

**Goal:** Reports builder and opportunity forecasting.

**Key deliverables:**
- `ReportDefinition` metadata model
- Report builder UI (filters, groupings, chart selection)
- Async `report.generate` queue
- Opportunity forecast pipeline summary
- Scheduled report delivery

**Source files:** `src/actions/admin/report-actions.ts`, `src/components/admin/reports/`, `prisma/schema.prisma`

### Phase 14 — Integration Hub

**Goal:** Webhooks, API tokens, and a connector framework.

**Key deliverables:**
- `WebhookEndpoint` model + `WebhookEvent` log + retry queue
- `ApiToken` model with scope + expiry
- Bearer-token auth middleware
- REST connector framework for custom object sync
- Outbound webhook firing on record events

**Source files:** `prisma/schema.prisma`, `src/middleware.ts`, `src/app/api/webhooks/`, `src/actions/admin/webhook-actions.ts`

### Phase 15 — Performance & Observability

**Goal:** Caching, query profiling, and metrics.

**Key deliverables:**
- Redis-backed rate limiter (replacing in-memory) + query cache
- Slow-query logging for raw SQL paths
- OpenTelemetry-style span hooks on Server Actions
- Health check endpoint (`/api/health`)
- Index audit for EAV query patterns

**Source files:** `src/lib/rate-limit-store.ts`, `src/lib/db.ts`, `src/app/api/health/route.ts`

### Phase 16 — Delivery & Quality

**Goal:** Test coverage expansion, CI/CD, and packaging cleanup.

**Key deliverables:**
- jsdom Vitest project for client component tests
- Playwright E2E test project with auth fixture
- GitHub Actions CI: lint + typecheck + test + build
- API route tests, admin action tests, worker tests
- Packaging cleanup: remove stale `yarn.lock`, `schema.pprisma`, empty `start.bat`

**Source files:** `vitest.config.ts`, `.github/workflows/`, `src/tests/`

### Phase Dependency Graph

```
1 → 2 → 3 → 4 → 5 → 6
        │   │   │
        └→ 7   8 → 12
        │
        └→ 9 → 10 → 11
        │       │
        └→ 14   13
        │   │
        └→ 15 └→ 16
```

Detailed dependencies are in `IMPLEMENTATION_ROADMAP.md`.

---

## 7. Data Model Extensions

The core schema (`prisma/schema.prisma`) is preserved. The following models are added across phases 1–14.

| Model | Phase | Purpose |
|-------|-------|---------|
| `OrganizationMember` | 2 | Tracks multi-org membership; `role` + `isDefault` |
| `Activity` | 4 | Unified activity record (type, relatedTo, status, timestamps) |
| `ActivityParticipant` | 4 | Links activities to users/contacts |
| `Note` | 3/4 | Standalone note record (or `Activity` subtype) |
| `Call` | 3/4 | Activity type for calls |
| `Meeting` | 3/4 | Activity type for meetings |
| `OpportunityStage` | 6 | Stage history + probability mapping |
| `WebhookEndpoint` | 14 | Outbound webhook config + event types |
| `WebhookEvent` | 14 | Delivery log + retry tracking |
| `ApiToken` | 14 | Bearer API tokens with scopes + expiry |
| `ReportDefinition` | 13 | Saved report config (fields, filters, groupings) |
| `EmailTemplate` | 8 | Reusable email templates |

### 7.1 Existing Models Requiring Changes

| Model | Change | Phase |
|-------|--------|-------|
| `Record` | Add `deletedAt: DateTime?` (soft-delete timestamp) | 1 |
| `Record` | Add `tsvector` / `searchVector` for full-text | 9 |
| `ObjectDefinition` | Add `enableActivities: Boolean` flag | 4 |
| `FieldDefinition` | Add `Currency`/`DateTime` precision options | 15 |
| `User` | Add `OrganizationMember` relation | 2 |

### 7.2 Migration Strategy

- New migrations use Prisma Migrate (committed under `prisma/migrations/`)
- No checked-in migrations exist for the core schema today — the repo uses `prisma db push` (see `README.md` §Local Setup). NextCRM introduces a formal migration workflow for the new models only.
- Soft-delete `isDeleted` is already in the schema via migration `20260918_add_soft_delete_to_record`; Phase 1 wires it at the application layer.

---

## 8. Security Model

### 8.1 Preserved Security Guarantees

All existing security properties (see `ARCHITECTURE_AUDIT.md` §4) are preserved and hardened:

| Property | Mechanism |
|----------|-----------|
| Zero-arg context extraction | `getUserContext()` has `.length === 0`; `organizationId` from JWT only |
| Tenant isolation (3 layers) | Session context + org-scoped queries + org-scoped share `EXISTS` |
| User object hardening | `sanitizeUserObjectPermissions` strips write flags for `user` object |
| Existence leak prevention | `getRecord` returns `NOT_FOUND` for both inaccessible and non-existent |
| Soft-delete preservation | Inbound lookups preserved on soft-delete; purge clears references |
| CSV formula injection mitigation | `sanitizeCsvFormula` neutralizes `= + - @` prefixes |
| Path traversal protection | `resolveStoragePath` validates resolved paths |
| Rate limiting | 20 req/60s per IP on `/api/auth/*` |
| CSRF defense | Origin/Referer validation on mutating API requests |

### 8.2 New Security Requirements

| Requirement | Phase | Implementation |
|-------------|-------|----------------|
| API token auth | 14 | Bearer-token middleware with scope enforcement |
| Webhook signature verification | 14 | HMAC-SHA256 signature header validation |
| Storage provider isolation | 7 | Per-org bucket prefix or path isolation |
| AI data boundary | 11 | Never send raw field values out without consent; opt-in per org |
| Search index isolation | 9 | Search results scoped by `organizationId` + record access |

### 8.3 bcrypt Cost Alignment

The existing cost inconsistency (`auth.ts` cost 12 vs. registration cost 10 per `P0_AUDIT.md`) is reconciled in Phase 2: all password hashing uses `BCRYPT_COST` from `src/lib/crypto.ts` (value: 12).

---

## 9. Integration & Extensibility

| Integration | Phase | Adapter |
|-------------|-------|---------|
| Object storage | 7 | `StorageProvider`: local + S3/MinIO |
| Email | 8 | `EmailProvider`: SMTP + SES |
| Search | 9 | `SearchProvider`: PostgreSQL native + Elasticsearch/Meili |
| AI | 11 | `AiProvider`: OpenAI-compatible |
| Webhooks | 14 | Outbound delivery with HMAC signatures |
| Connectors | 14 | REST connector framework |

All providers follow an interface-based pattern so the default deployment runs with no external dependencies (local storage, console email, native search).

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target | Phase |
|--------|--------|-------|
| List view page (25 rows, EAV) | < 500ms p95 | 15 |
| Global search (100K records) | < 300ms p95 | 9 |
| Record create (transaction) | < 200ms p95 | 15 |
| Dashboard widget render | < 300ms p95 | 15 |
| Background import (1000 rows) | < 10s total | 15 |

### 10.2 Scalability

- Horizontal scaling supported for the web tier (stateless)
- Worker tier scales by pg-boss queue consumer count
- Redis cache layer (Phase 15) for rate-limit + session cache
- Read replicas supported via Prisma `$transaction`/`prisma-adapter-pg`

### 10.3 Reliability

- Background jobs retry with exponential backoff (pg-boss native)
- Soft-delete prevents accidental data loss
- Migration rollback strategy defined for each new model

### 10.4 Observability

| Layer | Tooling | Phase |
|-------|---------|-------|
| Request tracing | OpenTelemetry-style spans | 15 |
| Slow query log | `console.warn` + threshold | 15 |
| Health check | `/api/health` endpoint | 15 |
| Worker job metrics | pg-boss stats | 15 |

### 10.5 Internationalization

- Existing custom i18n (`src/i18n/`) with `en` + `fr`
- All new UI strings must use the `t()` function
- Server components: `getT()` from `src/i18n/server`
- Client components: `useTranslations()` from `src/i18n/client`

---

## 11. Acceptance Criteria

Each phase is accepted when:

1. **Functional:** All new features work in the standard app and admin area
2. **Security:** Tenant isolation is preserved; no new privilege-escalation vectors
3. **Tests:** Unit tests cover new Server Actions; security tests cover new paths
4. **Docs:** `Technical Documentation/` updated with new metadata artifacts
5. **Build:** `npm run lint + typecheck + build` pass cleanly
6. **No regressions:** Existing 104 tests still pass

---

## 12. References

| Document | Path |
|----------|------|
| Architecture & Security Audit | `ARCHITECTURE_AUDIT.md` |
| P0 Audit | `docs/P0_AUDIT.md` |
| UI / Auth / i18n Audit | `docs/UI_AUTH_I18N_AUDIT.md` |
| Technical Documentation Index | `Technical Documentation/01-index.md` |
| Codebase Map | `Technical Documentation/30-codebase-map.md` |
| Prisma Schema | `prisma/schema.prisma` |
| Getting Started Workflow | `docs2/14-step-by-step-getting-started.md` |

---

*NextCRM Specification v1.0 — the authoritative target state for the openCRM modernization.*  
