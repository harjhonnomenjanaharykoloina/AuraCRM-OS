# IMPEX Merge Plan — NextCRM Engine × openCRM UI

**Project:** openCRM → NextCRM Engine Integration  
**Date:** 2026-09-22  
**Status:** Planning  
**Version:** 1.0  

---

## 1. Overview & Goal

This document specifies the integration approach for merging NextCRM’s CRM
engine (concrete Prisma models, RBAC, AI/embedding stack) with openCRM’s
metadata-driven UI layer (EAV object engine, admin console, standard app,
multi-tenant permission model).

**Goal:** Produce a single unified application whose data plane is the
NextCRM engine — typed tables for standard CRM entities, pgvector embeddings,
AI enrichment, MCP server — while preserving openCRM’s UI architecture: the
EAV `ObjectDefinition`/`Record`/`FieldData` spine for custom objects, the
admin object builder, the standard app shell, and the full multi-tenant
permission model.

The integration is an *assimilation*, not a replacement: NextCRM’s concrete
CRM models (`crm_Accounts`, `crm_Contacts`, …) are brought into openCRM’s
`Organization`-scoped, permission-checked engine. openCRM’s metadata engine
remains the spine for custom objects.

---

## 2. Multi-Tenancy Gap

### 2.1 The gap

NextCRM is a **single-instance** application. Its `schema.prisma` contains no
`Organization` model and **zero models carry an `organizationId`**. Every
table is flat: `crm_Accounts`, `crm_Contacts`, `crm_Opportunities`, etc.
are globally shared. The NextCRM RBAC layer (`lib/authz/scopes/crm.ts`)
operates per-user, not per-tenant. There is no concept of a "current
organization" in the session.

openCRM, by contrast, is built around a **shared-schema, multi-tenant** model
where every tenant-scoped entity carries `organizationId` and all queries are
org-filtered.

### 2.2 openCRM's Organization / User / PermissionSet / RecordShare pattern

Source: `prisma/schema.prisma` (models §§1–4), `src/lib/permissions.ts`,
`src/lib/record-access.ts`, `src/lib/auth/context.ts`.

```
┌─────────────────────────────────────────────────────────────────┐
│  ORGANIZATION (tenant root)                                     │
│  schema.prisma:105  Organization { id, name, slug, ownerId }    │
│                                                                 │
│    ├── USER (identity + session)                                │
│    │    schema.prisma:148  User { id, username, email,          │
│    │      userType: UserType(admin|standard),                  │
│    │      organizationId → Organization, password (bcrypt) }    │
│    │    auth.ts — Better-Auth config; user.additionalFields    │
│    │      injects organizationId + userType into session JWT    │
│    │    lib/auth/context.ts:3  getUserContext() — zero-arg,     │
│    │      resolves { userId, organizationId, userType }        │
│    │      from session only, never from client input            │
│    │                                                             │
│    ├── PERMISSION SET (fine-grained RBAC)                      │
│    │    schema.prisma:212  PermissionSet {                      │
│    │      name, organizationId,                                 │
│    │      permissions: ObjectPermission[],                       │
│    │      appAccess: AppPermission[],                           │
│    │      allowDataLoading: Boolean }                           │
│    │    schema.prisma:372  ObjectPermission {                   │
│    │      permissionSetId → PermissionSet,                      │
│    │      objectDefId → ObjectDefinition,                       │
│    │      allowRead | allowCreate | allowEdit | allowDelete,    │
│    │      allowViewAll | allowModifyAll | allowModifyListViews }│
│    │    schema.prisma:278  PermissionSetAssignment {            │
│    │      userId → User, permissionSetId → PermissionSet }       │
│    │    schema.prisma:238  PermissionSetGroup {                   │
│    │      name, organizationId } — bundles sets for bulk assign │
│    │    lib/permissions.ts — buildObjectAccessMap() merges      │
│    │      all assigned ObjectPermissions into ObjectAccess      │
│    │      Summary { canReadOwn, canCreate, canEditOwn, ... }    │
│    │                                                             │
│    ├── QUEUE (shared work pool)                                 │
│    │    schema.prisma:406  Queue { id, name, organizationId }   │
│    │    schema.prisma:426  QueueMember { queueId, userId }       │
│    │    Queue ownership → read-only access for members          │
│    │                                                             │
│    ├── GROUP (sharing audience)                                 │
│    │    schema.prisma:439  Group { id, name, organizationId,    │
│    │      users: User[] }                                        │
│    │                                                             │
│    ├── RECORD SHARE (per-record grant)                          │
│    │    schema.prisma:456  RecordShare {                        │
│    │      recordId → Record, organizationId,                   │
│    │      principalType: USER|GROUP, principalId,              │
│    │      accessLevel: READ|EDIT|DELETE }                        │
│    │    lib/record-access.ts:26  buildRecordAccessFilter()      │
│    │      — builds Prisma OR: [ownerId, ownerQueueId, shares]   │
│    │    lib/record-access.ts:65  buildRecordAccessSql() —      │
│    │      raw SQL EXISTS subquery on RecordShare, org-scoped    │
│    │                                                             │
│    └── RECORDS (all tenant-scoped)                             │
│         schema.prisma:633  Record {                             │
│           organizationId → Organization,                         │
│           objectDefId → ObjectDefinition,                        │
│           ownerId / ownerType(USER|QUEUE),                      │
│           ownerQueueId → Queue,                                  │
│           createdById / lastModifiedById → User,                 │
│           isDeleted: Boolean, backingUserId }                   │
│         @@index([organizationId, objectDefId, ...]) on every    │
│         composite access pattern                                │
└─────────────────────────────────────────────────────────────────┘
```

**Three-layer tenant isolation** (documented in
`docs/NEXTCRM_SPECIFICATION.md:247`):

| Layer | Mechanism | Source |
|-------|-----------|--------|
| 1. Session context | `getUserContext()` — `.length === 0`, `organizationId` from JWT only | `src/lib/auth/context.ts:3` |
| 2. Org-scoped queries | Every Prisma query includes `organizationId` in WHERE | All Server Actions |
| 3. Record-level filter | `buildRecordAccessFilter` + org-scoped `EXISTS` subquery | `src/lib/record-access.ts` |

**All models requiring `organizationId` (from schema.prisma):**

| OpenCRM Model | Already org-scoped? |
|---|---|
| `Organization` | N/A (tenant root) |
| `User` | ✅ (line 160) |
| `PermissionSet` | ✅ (line 217) |
| `PermissionSetGroup` | ✅ (line 243) |
| `PermissionSetAssignment` | ✅ (via User) |
| `ObjectPermission` | ✅ (via PermissionSet) |
| `AppPermission` | ✅ (via PermissionSet) |
| `Queue` | ✅ (line 411) |
| `QueueMember` | ✅ (via Queue) |
| `Group` | ✅ (line 444) |
| `RecordShare` | ✅ (line 460) |
| `Record` | ✅ (line 637) |
| `FieldData` | ✅ (via Record) |
| `ObjectDefinition` | ✅ (line 541) |
| `FieldDefinition` | ✅ (via ObjectDefinition) |
| `PicklistOption` | ✅ (line 611) |
| `ListView`, `ListViewColumn`, `ListViewShare`, `ListViewPin` | ✅ |
| `RecordPageLayout`, `RecordPageAssignment` | ✅ |
| `AppDefinition`, `AppNavItem`, `DashboardWidget` | ✅ |
| `AssignmentRule`, `SharingRule`, `DuplicateRule` | ✅ |
| `Notification`, `RecordComment`, `RecordCommentMention` | ✅ |
| `FileAttachment`, `FieldHistory`, `RecordOwnerHistory` | ✅ |
| `ImportJob`, `ImportRow` | ✅ |
| `MetadataDependency` | ✅ |

NextCRM models that **lack** `organizationId` (the integration target):

| NextCRM Model | Needs org_id | Rationale |
|---|---|---|
| `crm_Accounts` | ✅ | Accounts are tenant-scoped |
| `crm_Contacts` | ✅ | Contacts belong to an org |
| `crm_Leads` | ✅ | Leads are org-scoped |
| `crm_Opportunities` | ✅ | Opportunities tied to accounts |
| `crm_Contracts` | ✅ | Contracts tied to accounts |
| `crm_Products` | ✅ | Product catalog per org |
| `crm_Activities` | ✅ | Activities attached to records |
| All lookup/enum tables | ✅ | Per-org configurability |
| `ApiToken` | ✅ | Token belongs to a tenant |
| `ReportDefinition` | ✅ | Reports are org-scoped |

### 2.3 Migration strategy for multi-tenancy

**Every NextCRM model receives an `organizationId` column** via new Prisma
Migrate migrations. The `Organization` model itself is imported from
openCRM's schema unchanged (already `schema.prisma:105`).

1. **Schema phase:** Add `organizationId: Int` + `organization: Organization`
   relation + `@@index([organizationId])` to each NextCRM model. Where a
   typed-table entity maps to an EAV `Record`, the `Record.organizationId`
   already exists — the mapping lives in application code, not schema.
2. **Query phase:** Every NextCRM data-access path routes through
   `getUserContext()` and applies `organizationId` as the first WHERE clause,
   mirroring openCRM's pattern in `lib/record-access.ts` and `lib/permissions.ts`.
3. **Seed phase:** `createOrgTemplate()` (`src/lib/seeding/create-org-template.ts`)
   seeds default data per organization — standard objects, permission sets,
   queues, and apps.
4. **Isolation verification:** Existing `org-isolation.test.ts` tests are
   extended to cover the new typed-table models.

---

## 3. Auth Merge Strategy

### 3.1 Baseline (shared)

Both projects use **Better-Auth** as the auth framework:

| Component | openCRM | NextCRM |
|-----------|---------|---------|
| Better-Auth version | ^1.7.5 | ^1.6 |
| ORM adapter | `@better-auth/prisma-adapter` (PostgreSQL) | same |
| Session strategy | JWT + cookieCache (`src/auth.ts:84-95`) | same |
| Google OAuth | ✅ `socialProviders.google` (`auth.ts:78-83`) | ✅ same |
| Email OTP | ✅ `emailOTP` plugin, 6-digit, 5-min expiry (`auth.ts:112-136`) | ✅ same, Resend |
| Password hashing | bcrypt, cost 12 (`lib/crypto.ts:5`) | — |

### 3.2 openCRM additions to the baseline

| Feature | Location | Notes |
|---------|----------|-------|
| Username/password plugin | `auth.ts:108-111` `username({...})` | openCRM's primary auth is username + bcrypt password |
| Legacy credential bridge | `src/lib/auth-proxy-fix.ts` | `legacySignIn()` — bcrypt compare on existing `Account` records |
| JWT session proxy | `src/lib/auth/proxy.ts` | `getProxySession()` decodes `better-auth.session_data` cookie via `jose` |
| User companion record | `src/lib/user-companion.ts` | Links `User` ↔ EAV `Record` on `user` object |
| Rate limiting | `src/middleware.ts`, `src/lib/rate-limit*.ts` | 20 req/60s on auth endpoints |
| CSRF defense | `src/middleware.ts` | origin/referer validation |

### 3.3 The "NextAuth v5 bridge" — what it is and the decision

The codebase contains **legacy NextAuth references** that are vestigial —
not an active NextAuth v5 integration:

- `.env.example` → `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `src/app/page.tsx:255` → *"User sign-in and session handling are built on NextAuth."*
- `src/app/page.tsx:608` → *"NextAuth for authentication"*

There is **no `next-auth` package** in `package.json` and **no NextAuth route
handler** in the codebase. The actual session bridge is openCRM's own JWT
proxy (`lib/auth/proxy.ts`) using `jose`, not NextAuth.

**Decision: Unify under Better-Auth. Remove the NextAuth bridge.**

Rationale:
- Both projects already standardize on Better-Auth — there is no real
  NextAuth v5 bridge to reconcile. The `next-auth` references are stale
  documentation/config artifacts.
- openCRM's JWT proxy (`lib/auth/proxy.ts`) duplicates what Better-Auth's
  `toNextJsHandler` already provides. It can be removed once all session
  resolution goes through `auth()` (`src/auth.ts:146`).
- openCRM's `legacySignIn` bridge (`auth-proxy-fix.ts`) exists to migrate
  existing bcrypt-hashed credential `Account` records into the Better-Auth
  session flow. Once all users migrate to OTP/OAuth, it becomes dead code.

### 3.4 Target auth architecture (unified)

```
Better-Auth (single source of truth, src/auth.ts)
  ├── username plugin       — username/password auth (preserved from openCRM)
  ├── emailOTP plugin       — 6-digit OTP, 5-min expiry, Resend (baseline)
  ├── Google OAuth          — socialProviders.google (baseline)
  ├── admin plugin + ac     — NextCRM's 3-role RBAC: admin/manager/user
  ├── Prisma adapter        — shared PostgreSQL session tables
  └── Session JWT           — organizationId + userType + user.id embedded

  Session resolution:  auth() → toNextJsHandler → Better-Auth API
  (lib/auth/proxy.ts JWT proxy REMOVED)
  (lib/auth-proxy-fix.ts legacySignIn DEPRECATED, scheduled for removal in Phase 2)
```

**2-layer RBAC (merged):**

| Layer | Mechanism | Source |
|-------|-----------|--------|
| 1. Role-based | Better-Auth `adminPlugin({ ac, roles })` — 3 roles | `src/auth.ts` + `src/lib/auth/permissions.ts` [NEW] |
| 2. Permission-set | `PermissionSet` → `ObjectPermission` → `RecordShare` | Preserved from openCRM |
| 2. Record-level | `buildRecordAccessFilter` + `buildRecordAccessSql` | `src/lib/record-access.ts` (extended) |

openCRM's permission-set model is **more powerful** than NextCRM's 3-role
RBAC. The merge preserves permission sets as the fine-grained layer while
adopting NextCRM's `assertCan*` scope helpers from
`lib/authz/scopes/crm.ts` as the enforcement API.

### 3.5 Implementation priority

1. **Phase 2 (auth):** Align bcrypt cost (already done at 12). Remove
   `NEXTAUTH_*` env vars. Remove JWT proxy. Add admin plugin with 3 roles.
2. **Phase 2+ (post-merge):** Deprecate `legacySignIn`; switch new user
   creation to OTP/OAuth-only.

---

## 4. Model Mapping — EAV vs Concrete

openCRM's engine is **EAV** (Entity-Attribute-Value). NextCRM's CRM core
uses **concrete typed tables**. The merge maps them so both coexist.

### 4.1 EAV spine (preserved)

```
ObjectDefinition  (metadata: apiName, label, fields, permissions)
      │ 1
      │
      │ n
FieldDefinition  (field type, lookup target, picklist options)
      │ 1
      │
      │ n
FieldData  (EAV cell: valueText, valueNumber, valueDate, valueBoolean,
            valueLookup, valuePicklistId)
      │
      │ n → 1
      Record  (universal row: organizationId, objectDefId, ownerId,
               ownerType, isDeleted, backingUserId)
```

Source: `prisma/schema.prisma:531` (`ObjectDefinition`), `:574`
(`FieldDefinition`), `:769` (`FieldData`), `:633` (`Record`).

Field types supported: Text, TextArea, Number, Currency, Date, DateTime,
Checkbox, Phone, Email, Url, Lookup, Picklist, File, AutoNumber
(`docs2/07-object-manager-fields-and-validation.md:21`).

### 4.2 Concrete models imported from NextCRM

Source: `docs/NEXTCRM_AUDIT.md:399` and `docs/FEATURE_MATRIX.md:52`.

| NextCRM Table | openCRM EAV Object | Mapping Strategy |
|---|---|---|
| `crm_Accounts` | `ObjectDefinition(apiName: "company")` | Read/write through EAV engine; `Record` row per account; `FieldData` cells for name/website/industry |
| `crm_Contacts` | `ObjectDefinition(apiName: "contact")` | Existing openCRM Contact object; extend with social profile fields, tags |
| `crm_Leads` | `ObjectDefinition(apiName: "lead")` | Existing openCRM Lead; extend with source/status/type lookup tables |
| `crm_Opportunities` | `ObjectDefinition(apiName: "opportunity")` | Existing; add stage probability, expected revenue, approval gate |
| `crm_Contracts` | NEW EAV object `contract` | Seed via `createOrgTemplate()` |
| `crm_Products` | NEW EAV object `product` | Seed via `createOrgTemplate()` |
| `crm_Activities` + `crm_ActivityLinks` | NEW EAV object `activity` + polymorphic lookup | `activity_type` picklist, `related_to` lookup |
| `crm_ActivityLinks` | — | Separate junction table linking Activity → any Record (polymorphic) |

### 4.3 Typed-table exceptions

NextCRM's **Projects** and **Invoicing** modules retain typed tables
(not EAV) because they are internal application domains, not CRM business
objects:

| Typed Table | Purpose | Org-scoped |
|---|---|---|
| `Boards`, `Sections`, `Tasks`, `tasksComments`, `BoardWatchers` | Project management | ✅ `organizationId` added |
| `Invoices`, `Invoice_LineItems`, `Invoice_Payments`, `Invoice_TaxRates`, `Invoice_Series`, `Invoice_Activity` | Invoicing | ✅ `organizationId` added |
| `Documents`, `DocumentsTo*` | Document store | ✅ `organizationId` added |
| `EmailAccount`, `Email`, `EmailsToContacts`, `EmailsToAccounts` | IMAP/SMTP client | ✅ `organizationId` added |
| `ApiToken` | MCP bearer tokens | ✅ `organizationId` added |
| `ReportDefinition` | Saved reports | ✅ `organizationId` added |

### 4.4 Field-level mapping table

| NextCRM Column | openCRM EAV Equivalent | Field Type |
|---|---|---|
| `crm_Accounts.name` | `Record.name` + FieldData(`name` field) | Text |
| `crm_Accounts.website` | FieldData(`website`) | Url |
| `crm_Accounts.industry` | FieldData(`industry`) + PicklistOption | Picklist |
| `crm_Contacts.first_name` | FieldData(`first_name`) | Text |
| `crm_Contacts.email` | FieldData(`email`) | Email |
| `crm_Contacts.social_links` | FieldData JSON (custom) | Text/Json |
| `crm_Opportunities.amount` | FieldData(`amount`) | Number/Currency |
| `crm_Opportunities.close_date` | FieldData(`close_date`) | Date |
| `crm_Opportunities.stage` | FieldData(`stage`) + PicklistOption | Picklist |
| `crm_Activities.activity_type` | FieldData(`activity_type`) | Picklist |
| `crm_Activities.related_to` | FieldData(`related_to`) | Lookup |

### 4.5 Read/write adapter

A **model adapter** layer (`lib/model-adapter.ts`) translates between:
- NextCRM-shaped DTOs (flat: `{ name, website, industry }`)
- EAV storage (`Record` + `FieldData` rows keyed by `FieldDefinition`)

The adapter is org-scoped: every operation passes `organizationId` from
`getUserContext()`.

---

## 5. Directory Layout Target

```
src/
├── auth.ts                         # Better-Auth instance (unified auth)
├── middleware.ts                  # Edge middleware: rate-limit, CSRF, JWT proxy (being removed)
├── app/
│   ├── (auth)/                    # Auth shell: login, register, pending, inactive
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (standard)/                # Standard app shell (openCRM UI, NextCRM data)
│   │   ├── layout.tsx             # Auth guard via auth(), org-context provider
│   │   ├── no-apps/page.tsx
│   │   └── app/[appApiName]/      # Per-app standard surfaces
│   │       ├── dashboard/page.tsx
│   │       ├── [objectApiName]/   # EAV-driven record list/detail/edit
│   │       │   ├── page.tsx
│   │       │   ├── [recordId]/page.tsx
│   │       │   └── import/[jobId]/page.tsx
│   │       └── search/page.tsx
│   ├── (admin)/                   # Admin object builder, permissions, users
│   │   ├── admin/
│   │   │   ├── objects/[id]/page.tsx
│   │   │   ├── permission-groups/[id]/page.tsx
│   │   │   ├── users/[id]/page.tsx
│   │   │   └── ...
│   ├── api/
│   │   ├── auth/[...all]/route.ts     # Better-Auth handler
│   │   ├── fields/[objectApiName]/route.ts
│   │   ├── files/...                  # Upload/download (S3/MinIO)
│   │   ├── notifications/
│   │   ├── search/global/            # Enhanced search
│   │   ├── mcp/[transport]/route.ts  # MCP server (from NextCRM)
│   │   ├── invoices/[id]/pdf/route.ts # PDF export (from NextCRM)
│   │   ├── cmdk/route.ts             # Command palette
│   │   └── ai/...                    # AI assistance endpoints
│   ├── layout.tsx                   # Root layout: i18n provider, theme, toaster
│   ├── page.tsx                     # Landing page
│   └── globals.css
├── actions/
│   ├── auth.ts                    # Registration & sign-in
│   ├── admin/                     # Admin mutations
│   │   ├── user-actions.ts
│   │   ├── permission-actions.ts
│   │   ├── sharing-rule-actions.ts
│   │   ├── admin-actions.ts
│   │   ├── api-token-actions.ts   # NEW: MCP API tokens
│   │   └── ...
│   └── standard/                  # Standard app mutations
│       ├── record-actions.ts      # CRUD + soft-delete (merged with NextCRM record-actions.ts)
│       ├── lead-actions.ts        # Full conversion (Phase 5)
│       ├── opportunity-actions.ts # NEW: stage history, approval gate
│       ├── activity-actions.ts    # NEW: activities & timeline
│       ├── lookup-actions.ts
│       ├── list-view-actions.ts
│       ├── dashboard-actions.ts
│       ├── import-actions.ts
│       ├── comment-actions.ts
│       └── export-actions.ts
├── components/
│   ├── ui/                        # shadcn/ui primitives (shared)
│   ├── standard/                  # openCRM standard app components
│   │   ├── standard-shell.tsx
│   │   ├── standard-sidebar.tsx
│   │   ├── record-form.tsx        # EAV-driven dynamic form
│   │   ├── record-detail.tsx      # Merged detail + NextCRM timeline
│   │   └── dashboard/
│   ├── auth/                      # Sign-in/register forms
│   ├── shared/                    # Org switcher, command palette
│   └── crm/                       # NextCRM CRM components (watchers, timelines)
├── hooks/
├── i18n/                          # openCRM custom i18n (en + fr)
│   ├── config.ts
│   ├── messages/en.ts
│   ├── messages/fr.ts
│   ├── server.ts                  # getT() for server components
│   ├── client.ts                  # useTranslations() for client
│   └── ...
├── jobs/
│   ├── pgboss.ts
│   ├── sharing-rule-worker.ts
│   └── nextcrm-worker.ts          # NEW: extended queues (email, webhook, AI)
├── lib/
│   ├── db.ts                      # Prisma client singleton (PrismaPg adapter)
│   ├── auth/
│   │   ├── context.ts             # getUserContext() — org from session
│   │   └── proxy.ts               # REMOVE: JWT proxy
│   ├── permissions.ts             # RBAC permission engine
│   ├── record-access.ts           # Record-level OR-clause + SQL filter
│   ├── field-data.ts              # EAV normalization
│   ├── validation/                # Rule logic + record validation
│   ├── duplicates/
│   ├── seeding/
│   │   ├── create-org-template.ts   # Seeds EAV objects + permission sets
│   │   └── create-default-app.ts
│   ├── storage/                   # NEW: StorageProvider (local + S3/MinIO)
│   ├── email/                     # NEW: EmailProvider (SMTP + SES)
│   ├── search/                    # NEW: SearchProvider (tsvector + pgvector)
│   ├── ai/                        # NEW: AiProvider (OpenAI + Anthropic)
│   ├── mcp/                       # NEW: MCP server tools + auth
│   ├── model-adapter.ts           # NEW: EAV ↔ concrete mapping
│   ├── rate-limit*.ts
│   ├── auto-number.ts
│   ├── csv.ts
│   ├── temporal.ts
│   ├── unique.ts
│   ├── api-names.ts
│   ├── crypto.ts
│   ├── ui-themes.ts
│   └── ...
├── types/
└── prisma/
    └── schema.prisma              # Merged schema (~60 → ~85 models)
```

**Key structural decisions:**
- **App Router (standard) shell is preserved.** The `(standard)` and `(admin)`
  route groups from openCRM stay; NextCRM's CRM entities are served through
  them via the EAV adapter.
- **`lib/` shared modules** house the adapter, auth, permissions, and all
  new provider abstractions (storage, email, search, AI).
- **API routes** house NextCRM's new endpoints (MCP, invoices PDF, cmdk, ai)
  alongside openCRM's existing ones (search, files, notifications, fields).
- **Server Actions** in `actions/` merge NextCRM's action files (opportunity,
  activity, report, product) with openCRM's existing ones.

---

## 6. File Write Order

The merge is layered. Each layer must be complete and passing typecheck
before the next begins.

| Step | Layer | Target Files / Action | Dependencies |
|------|-------|----------------------|--------------|
| **1** | **Schema** | Merge NextCRM typed-table models into `prisma/schema.prisma`. Add `organizationId` to all new models. Create migration `20260922_add_nextcrm_models.ts`. | openCRM schema (§5) |
| **2** | **Auth** | Unify `src/auth.ts` — add Better-Auth admin plugin + `ac` roles. Remove `src/lib/auth/proxy.ts` (JWT proxy). Remove `NEXTAUTH_*` from `.env.example`. Add `src/lib/auth/permissions.ts` (RBAC statements). | Better-Auth already in both |
| **3** | **API** | Add `app/api/mcp/[transport]/route.ts`. Add `app/api/invoices/[id]/pdf/route.ts`. Add `app/api/cmdk/route.ts`. Extend `app/api/search/global/`. | Schema step 1 |
| **4** | **Components** | Port NextCRM CRM components (`find-similar-button.tsx`, `similar-records-drawer.tsx`, `ai-summary.tsx`, `record/ai-summary.tsx`) into `src/components/crm/`. Create `src/components/shared/org-switcher.tsx`. | Auth step 2, API step 3 |
| **5** | **Pages** | Map NextCRM CRM routes through openCRM's `(standard)` shell. Add `activity-actions.ts`, `opportunity-actions.ts` to `src/actions/standard/`. Extend `record-actions.ts` with soft-delete wiring + audit log. | Components step 4, Schema step 1 |
| **6** | **i18n** | Extend `src/i18n/messages/en.ts` + `fr.ts` with NextCRM UI strings (activities, contracts, products, opportunity pipeline, campaign terms). Use existing `t()` function from `src/i18n/t.ts`. | Pages step 5 |
| **7** | **Env** | Update `.env.example` — remove `NEXTAUTH_URL`/`NEXTAUTH_SECRET` (stale). Add `OPENAI_API_KEY`, `S3_*` vars, `STORAGE_PROVIDER`, `INNGEST_*`, `RESEND_FROM_EMAIL`. Preserve `DATABASE_URL`, `BETTER_AUTH_*`, `GOOGLE_*`. | Auth step 2 |

**Cross-cutting concerns that touch every step:**
- **Tenant isolation:** Every new query in Steps 3–5 routes through
  `getUserContext()` and applies `organizationId`. No exceptions.
- **Permission model:** Every new Server Action calls `checkPermission()`
  (layer 1) then `buildRecordAccessFilter()` (layer 2) before any DB write.
- **Decimal serialization:** Any `Decimal` returned to client components must
  pass through `serializeDecimals()` before crossing the Server Action
  boundary (documented in `NEXTCRM_AUDIT.md:209`).
- **Soft-delete:** All read paths filter `isDeleted: false` by default
  (Phase 1 wiring from `NEXTCRM_SPECIFICATION.md:409`).

---

*This document is the authoritative merge plan for integrating NextCRM's engine
with openCRM's UI layer. It supersedes all prior planning artifacts.*
