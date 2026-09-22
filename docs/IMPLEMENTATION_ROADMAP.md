# NextCRM — Implementation Roadmap

**Project:** openCRM → NextCRM  
**Companion to:** `NEXTCRM_SPECIFICATION.md` (cahier des charges), `MIGRATION_PLAN.md`  
**Date:** 2026-09-22  

This roadmap gives Kilo the phase-by-phase file and module targets to execute the NextCRM transformation. Each phase lists: a short description, the files to create or modify, the key technical decisions, and its dependencies.

---

## Phase Ordering and Conventions

Phases execute in numeric order (1→16). The dependency graph is in `MIGRATION_PLAN.md` §7. The following conventions apply to all phases:

- **Server Actions only** for writes (no direct DB access from components)
- **`getUserContext()`** is called at the top of every action — zero args, session-derived `organizationId`
- **Transactions** wrap multi-table mutations (`db.$transaction`)
- **Permission checks** precede all record operations (`checkPermission` then `buildRecordAccessFilter`)
- **Tenant scoping** is enforced at query level + record-access filter
- **Metadata changes** participate in `MetadataDependency` index
- **i18n** — all new strings use `t()` (client) or `getT()` (server)
- **Tests** — new actions get unit tests under `src/tests/`

---

## Phase 1 — Soft-Delete Wiring

### Description
Wire the existing `Record.isDeleted` schema column across all record reads, convert `deleteRecord` to a soft-delete, and add `restoreRecord` + a trash view.

### Files to Modify

| File | Change |
|------|--------|
| `src/actions/standard/record-actions.ts` | `getRecords`: add `isDeleted: false` to Prisma `where` and to raw SQL; `getRecord`: filter `isDeleted: false`; `deleteRecord`: set `isDeleted = true` + `deletedAt = now()` instead of `tx.record.delete` |
| `src/lib/record-access.ts` | Ensure `buildRecordAccessFilter` and `buildRecordAccessSql` include `isDeleted: false` by default |
| `src/app/api/search/global/route.ts` | Add `isDeleted: false` to global search query |
| `src/actions/standard/dashboard-actions.ts` | Filter `isDeleted: false` in all widget queries |
| `src/actions/standard/list-view-actions.ts` | Filter `isDeleted: false` in list view data queries |
| `src/components/standard/views/data-table.tsx` | Add "Trash" filter option (show deleted records) |
| `src/components/standard/record/record-detail.tsx` | Handle soft-deleted record state |
| `src/actions/admin/admin-actions.ts` | Ensure `deleteObject` / `deleteField` respect soft-deleted records |
| `src/lib/sharing-rule-recompute.ts` | Exclude `isDeleted` records from sharing recompute |
| `src/app/(standard)/app/[appApiName]/[objectApiName]/page.tsx` | Pass `includeDeleted` to view/list APIs for trash context |

### Files to Create

| File | Purpose |
|------|---------|
| `src/actions/standard/trash-actions.ts` | `getTrashedRecords`, `restoreRecord`, `permanentPurgeRecord` Server Actions |
| `src/components/admin/objects/trash-view.tsx` | Admin trash view for an object (list deleted records + restore/purge) |

### Schema Changes

| Model | Field | Type | Default |
|-------|-------|------|---------|
| `Record` | `deletedAt` | `DateTime?` | null |

New migration: `20260922_add_deleted_at_to_record`

### Key Decisions

1. **Soft-delete vs hard-delete:** `deleteRecord` now sets `isDeleted = true`. `purgeRecord` (existing) performs the hard delete after clearing inbound lookup payloads.
2. **`includeDeleted` opt-in:** `getRecords` accepts `includeDeleted: boolean`. When `true`, requires `viewAll` or `modifyAll` object permission.
3. **`getRecord` returns 404:** A soft-deleted record returns "NOT_FOUND" to prevent existence disclosure (existing pattern at `ARCHITECTURE_AUDIT.md:300`).
4. **Raw SQL path:** `buildRecordAccessSql` must also add `r."isDeleted" = false` unless `includeDeleted` is explicitly passed.

### Tests

- `src/tests/actions/soft-delete.test.ts` — extend existing: assert `isDeleted` is set, restore works, deleted records invisible without `includeDeleted`
- `src/tests/security/soft-delete-isolation.test.ts` — cross-org soft-deleted record isolation

### Dependencies

None.

---

## Phase 2 — Multi-Org Membership

### Description
Replace the single-org-per-user model with multi-org membership, enabling an org switcher and session re-issuance. Align bcrypt cost across all auth paths.

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `OrganizationMember` model; add `members` relation to `Organization`; update `User` with `organizationMemberships` |
| `src/auth.ts` | Align `register()` to use `BCRYPT_COST` from `src/lib/crypto.ts` (cost 12) |
| `src/lib/auth/context.ts` | Update `getUserContext()` to read active `organizationId` from session (already extended field); add `switchOrgId` support |
| `src/lib/auth/proxy.ts` | Ensure `organizationId` flows through JWT; add `activeOrgId` to session if needed |
| `src/actions/auth.ts` | `register()`: use `BCRYPT_COST` instead of hardcoded 10 |
| `src/actions/admin/user-actions.ts` | Add `switchOrganization()`, `getOrganizationMemberships()` Server Actions |
| `src/actions/admin/admin-actions.ts` | Add `inviteToOrganization()` or reuse register flow |
| `src/components/shared/user-nav.tsx` | Add org switcher dropdown |
| `src/components/shared/org-switcher.tsx` | Create org switcher component (new) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/actions/standard/org-actions.ts` | `getUserOrganizations()`, `switchOrganization(orgId)` Server Actions |
| `src/components/shared/org-switcher.tsx` | Dropdown to switch active organization |

### Schema Changes

| Model | Fields |
|-------|--------|
| `OrganizationMember` | `id`, `userId`, `organizationId`, `role` (enum), `isDefault`, `joinedAt`, `isActive` |
| `User` | Add `organizationMemberships: OrganizationMember[]` |
| `Organization` | Add `members: OrganizationMember[]` |

New migration: `20260922_add_organization_member`

### Key Decisions

1. **Session active org:** The session JWT carries `organizationId` (active org). `switchOrganization()` calls Better-Auth's `updateSession()` to re-issue the token with the new org.
2. **Backward compatibility:** Existing users with `User.organizationId` get an `OrganizationMember` row created during migration (one-time data migration script).
3. **Role enum:** `org_admin`, `org_manager`, `org_member` — maps to permission sets.
4. **Default org:** `isDefault` on `OrganizationMember` determines the landing org.

### Tests

- `src/tests/security/multi-org-isolation.test.ts` — user in Org A cannot access Org B records after switch
- `src/tests/actions/org-switching.test.ts` — session re-issuance, active org switch

### Dependencies

Phase 1 (soft-delete: trashed records must respect org boundaries).

---

## Phase 3 — CRM Object Expansion

### Description
Seed Product, Note, Call, Meeting, and Document as first-class objects so the CRM has complete object coverage.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/seeding/create-org-template.ts` | Add `createProductObject`, `createNoteObject`, `createCallObject`, `createMeetingObject`, `createDocumentObject` seeds |
| `src/lib/seeding/create-default-app.ts` | Add new objects to `objectDefs[]` array passed to `createDefaultAppAndPermissionSets` |

### Schema Changes

None (all use existing EAV engine).

### New Object Definitions

| Object | apiName | Fields |
|--------|---------|--------|
| Product | `product` | name (required), sku, price (Number/Currency), description, company (lookup) |
| Note | `note` | title (required), body (TextArea), related_to (lookup, polymorphic) |
| Call | `call` | subject (required), status (picklist), direction (picklist), duration (Number), related_to (lookup) |
| Meeting | `meeting` | subject (required), start (DateTime), end (DateTime), status (picklist), related_to (lookup) |
| Document | `document` | title (required), file (File), version (Text), related_to (lookup) |

### Key Decisions

1. **Activity as object vs model:** Calls and Meetings are seeded as objects here (for simple use); the unified Activity model comes in Phase 4.
2. **Note as object:** A standalone `note` object with a `related_to` lookup. Phase 4's Activity framework can optionally absorb it.
3. **Document as object:** Uses the existing `File` field type. The `file` field stores the `FileAttachment` row.

### Tests

- `src/tests/seeding/create-org-template.test.ts` — assert new objects + fields are created

### Dependencies

None (independent seeding change).

---

## Phase 4 — Activities & Timeline

### Description
Introduce a unified Activity record type and a Contact 360 timeline that aggregates activities, comments, and field history on the record page.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/seeding/create-org-template.ts` | Create `Activity` object definition with `activity_type` picklist, `related_to`, `status`, `direction`, `duration`, `start_time`, `end_time` |
| `src/lib/seeding/create-default-app.ts` | Add Activity to permission set object permissions |
| `src/components/standard/record/record-detail.tsx` | Add Timeline tab; render activities, comments, history |
| `src/actions/standard/record-actions.ts` | Add `activity_type` picklist to seeded objects; add Activity to default list views |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/activity.ts` | `createActivity()`, `getActivityFeed()`, `ActivityType` constants |
| `src/actions/standard/activity-actions.ts` | `logActivity()`, `getActivityTimeline()` Server Actions |
| `src/components/standard/record/timeline.tsx` | Timeline component (activities + comments + history) |

### Schema Changes

| Model | Fields |
|-------|--------|
| `Activity` (object) | `name`, `activity_type` (picklist: CALL, MEETING, TASK, EMAIL, NOTE), `related_to` (lookup), `status`, `direction`, `duration`, `start_time`, `end_time`, `subject`, `description` |

Activities reuse the EAV `Record` table — no new DB model needed (object-defined).

### Key Decisions

1. **Activity as EAV record:** The `Activity` object is a regular `ObjectDefinition` — it uses the universal `Record` + `FieldData` engine, so no new table is required.
2. **Timeline aggregation:** The timeline queries three sources on one record: Activity records (same org + record access), `RecordComment` rows, `FieldHistory` rows. Results are merged and sorted by timestamp in-memory.
3. **Activity creation triggers:** Assignment rules, sharing rule changes, and duplicate rule warnings can auto-create Activity records.

### Tests

- `src/tests/actions/activity-actions.test.ts` — activity creation, timeline ordering, access scoping
- `src/tests/lib/activity.test.ts` — activity feed aggregation

### Dependencies

Phase 3 (objects must exist).

---

## Phase 5 — Lead Lifecycle

### Description
Implement the full lead lifecycle: a state machine on lead status, complete conversion (Company + Contact + Opportunity), and lead score/source fields.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/seeding/create-org-template.ts` | Update lead status picklist: New, Contacted, Qualified, Unqualified, Converted, Rejected; add `score` and `source` fields |
| `src/actions/standard/lead-actions.ts` | Rewrite `convertLead` to create Company + Contact + Opportunity; enforce state machine on status change |
| `src/components/standard/record/convert-lead-button.tsx` | Update UI for full conversion (was Contact-only) |
| `src/lib/validation/rule-logic.ts` | Extend state transition evaluation for lead status |

### Files to Create

None (modifies existing).

### Schema Changes

| Object | Field | Change |
|--------|-------|--------|
| `lead` | `status` | Updated picklist options |
| `lead` | `score` | New Number field |
| `lead` | `source` | New Picklist field |

### Key Decisions

1. **State machine enforcement:** Validation runs on `updateRecord` — if `objectDef.apiName === "lead"` and `fieldDef.apiName === "status"`, check the transition against the allowed state graph. Blocked transitions return a validation error.
2. **Full conversion flow:** `convertLead` creates:
   - A `Company` (if `company_name` is not empty and no existing Company match by name)
   - A `Contact` (from first_name, last_name, email, phone, title, company lookup)
   - An `Opportunity` (amount=0, stage=LEAD, close_date=30 days out, company lookup)
   - Sets `lead.is_converted = true`, `lead.status = Converted`
3. **Idempotency:** If the lead is already converted, `convertLead` returns the existing converted records.

### Tests

- `src/tests/actions/convertLead.test.ts` — extend existing 7 tests: assert Company + Opportunity creation
- `src/tests/lib/validation/lead-state-machine.test.ts` — transition rules

### Dependencies

Phase 4 (Activity timeline for lead events).

---

## Phase 6 — Opportunity Pipeline & Forecasting

### Description
Add opportunity stage history tracking, probability derivation, expected close value, and forecast categories.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/seeding/create-org-template.ts` | Add `probability`, `expected_revenue`, `forecast_category` fields to opportunity |
| `src/actions/standard/record-actions.ts` | On stage change, write `FieldHistory` entry (already tracked); compute probability |
| `src/components/standard/record/record-detail.tsx` | Add Pipeline sub-tab / stage progress bar |

### Files to Create

| File | Purpose |
|------|---------|
| `src/actions/standard/opportunity-actions.ts` | `updateOpportunityStage()`, `getPipelineReport()` Server Actions |
| `src/lib/opportunity.ts` | `computeProbability(stage)`, `computeExpectedRevenue(amount, probability)` |

### Schema Changes

| Object | Field | Type |
|--------|-------|------|
| `opportunity` | `probability` | Number |
| `opportunity` | `expected_revenue` | Number/Currency |
| `opportunity` | `forecast_category` | Picklist (Pipeline, Best Case, Commit) |

Stage history is tracked via existing `FieldHistory` (no new model needed — stage changes are picklist changes that already generate `FieldHistory`).

### Key Decisions

1. **Probability derivation:** Default probability per stage (LEAD=10%, QUALIFIED=25%, DEMO=50%, PROPOSAL=75%, NEGOTIATION=90%, WON=100%, LOST=0%). `probability` field is editable per record but auto-set on stage change.
2. **Expected revenue:** Computed as `amount × probability / 100`, stored in `expected_revenue`.
3. **Forecast category:** Derived from stage + amount threshold; editable.

### Tests

- `src/tests/actions/opportunity-actions.test.ts` — stage transition, probability computation
- `src/tests/lib/opportunity.test.ts` — `computeProbability`, `computeExpectedRevenue`

### Dependencies

Phase 5 (opportunity created during lead conversion).

---

## Phase 7 — Document Store Backend

### Description
Make file storage pluggable: local filesystem (default, preserved) + S3/MinIO adapter, configured via environment variables.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/file-storage.ts` | Extract `StorageProvider` interface; keep `LocalProvider` (current) + add `S3Provider` |
| `src/app/api/files/upload/route.ts` | Use `StorageProviderFactory` to select backend |
| `src/app/api/files/[id]/route.ts` | Use `StorageProviderFactory` for download/stream |
| `src/.env.example` | Add `STORAGE_PROVIDER=local\|s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/storage/types.ts` | `StorageProvider` interface: `save`, `read`, `delete`, `getUrl` |
| `src/lib/storage/local-provider.ts` | Local filesystem implementation (extracted from current code) |
| `src/lib/storage/s3-provider.ts` | S3/MinIO implementation (AWS SDK v3) |
| `src/lib/storage/factory.ts` | `StorageProviderFactory.getProvider()` — env-driven selection |

### Schema Changes

| Model | Field |
|-------|-------|
| `FileAttachment` | `storageProvider: String` (default `"local"`) |

### Key Decisions

1. **Interface design:** `StorageProvider` has `save(file, path) → storageKey`, `read(storageKey) → stream`, `delete(storageKey)`, `getUrl(storageKey) → url`.
2. **Path traversal guard:** Retained in `resolveStoragePath` — all providers must validate the resolved path stays within the allowed namespace.
3. **Backward compatibility:** Existing local files remain accessible; `storageProvider` column distinguishes old vs new uploads.
4. **S3-compatible:** Uses `@aws-sdk/client-s3` with configurable `S3_ENDPOINT` for MinIO support.

### Tests

- `src/tests/lib/file-storage.test.ts` — local vs S3 adapter factory, path traversal guard

### Dependencies

None (independent infrastructure).

---

## Phase 8 — Email Provider

### Description
Abstract email sending behind an `EmailProvider` interface (SMTP + SES), add a template system, and queue outbound emails through pg-boss.

### Files to Modify

| File | Change |
|------|--------|
| `src/jobs/sharing-rule-worker.ts` | Rename/extend to `src/jobs/nextcrm-worker.ts` handling multiple queues |
| `src/lib/rate-limit-store.ts` | No change (email has its own rate limiting) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/email/types.ts` | `EmailProvider` interface, `EmailTemplate` type |
| `src/lib/email/smtp-provider.ts` | SMTP implementation using `nodemailer` |
| `src/lib/email/ses-provider.ts` | AWS SES implementation using `@aws-sdk/client-ses` |
| `src/lib/email/templates.ts` | Template registry: assignment, mention, digest, password-reset |
| `src/lib/email/service.ts` | `sendEmail()`, `renderTemplate()` — facade over providers |
| `src/lib/jobs/email-jobs.ts` | `queueEmail()` — enqueues `email.send` job |
| `src/components/admin/email/email-templates.tsx` | Admin UI for template management |

### Schema Changes

| Model | Fields |
|-------|--------|
| `EmailTemplate` | `id`, `organizationId`, `name`, `subject`, `bodyHtml`, `bodyText`, `isActive` |

### Key Decisions

1. **No new dependency without check:** `nodemailer` is NOT currently in `package.json` — must be installed. `@aws-sdk/client-ses` also new.
2. **Provider selection:** `EMAIL_PROVIDER=smtp\|ses` env var; default is a `ConsoleEmailProvider` (dev mode) that logs to stdout.
3. **Template rendering:** Simple `{field}` interpolation; templates stored in DB for admin editing.
4. **Queueing:** Every email goes through pg-boss `email.send` job for reliability + retry.

### Tests

- `src/tests/lib/email/service.test.ts` — template rendering, provider selection
- `src/tests/lib/jobs/email-jobs.test.ts` — queue enqueue/dequeue

### Dependencies

Phase 4 (activity-triggered emails like assignment notifications).

---

## Phase 9 — Search Infrastructure

### Description
Add PostgreSQL full-text search (`tsvector`) and a `SearchProvider` abstraction, with the native provider as default and Elasticsearch/Meilisearch as an optional alternate.

### Files to Modify

| File | Change |
|------|--------|
| `src/app/api/search/global/route.ts` | Route through `SearchProvider` instead of raw LIKE |
| `src/lib/field-data.ts` | On field save, update parent `Record.searchVector` |
| `src/lib/record-access.ts` | Ensure search results respect `buildRecordAccessFilter` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/search/types.ts` | `SearchProvider` interface, `SearchHit`, `SearchOptions` |
| `src/lib/search/postgresql.ts` | PostgreSQL native full-text (`tsvector` + `to_tsquery`) implementation |
| `src/lib/search/elasticsearch.ts` | Elasticsearch implementation (optional) |
| `src/lib/search/factory.ts` | `SearchProviderFactory.getProvider()` — env-driven |
| `src/lib/search/index-sync.ts` | `rebuildSearchIndex(orgId)` — full reindex for recovery |

### Schema Changes

| Model | Field |
|-------|-------|
| `Record` | `searchVector: String?` (mapped to `tsvector` type) |
| | New index: `@@fulltext` or GIN on `searchVector` |

### Key Decisions

1. **tsvector maintenance:** On `createRecord`/`updateRecord`, set `searchVector` to the concatenated `valueSearch` of all searchable fields for that record. Use a raw SQL `UPDATE` for efficiency.
2. **Query approach:** Native provider uses `to_tsquery($query)` + `WHERE searchVector @@ to_tsquery($query)`. Results then filtered by `organizationId` + `buildRecordAccessFilter`.
3. **Ranking:** PostgreSQL `ts_rank_cd` for relevance + exact-match boost.
4. **Cutover:** Both LIKE and tsvector run in parallel during Phase 9-10; switch the API route once validated.

### Tests

- `src/tests/lib/search/postgresql.test.ts` — index build, search ranking, org scoping
- `src/tests/lib/search/factory.test.ts` — provider selection

### Dependencies

Phase 1 (search must respect soft-delete).

---

## Phase 10 — Command Palette

### Description
Add a Cmd+K searchable command palette for object navigation, record search, and quick actions.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/standard/layout/app-header.tsx` | Add Cmd+K keyboard listener that opens the palette |
| `src/actions/standard/command-actions.ts` | Extend existing; add nav + record suggestions |
| `src/components/standard/layout/standard-sidebar.tsx` | Ensure all nav items are exposed to palette |

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/cmdk/route.ts` | `/api/cmdk?q=...` endpoint returning search results |
| `src/components/standard/layout/command-palette.tsx` | Modal palette component using `cmdk` package (already installed) |

### Key Decisions

1. **Use existing `cmdk` dependency:** `cmdk` ^1.0.0 is in `package.json` — no new install needed.
2. **API design:** `/api/cmdk?q=term` returns `{navItems, records, objects}` scoped by user's permission set + record access.
3. **Keyboard shortcut:** `⌘K` (Mac) / `Ctrl+K` (PC); closes on `Escape` or click-away.
4. **Performance:** Debounced input; results cached client-side briefly.

### Tests

- `@playwright/test/e2e/cmdk.spec.ts` — opens with shortcut, finds records, navigates

### Dependencies

Recommended: Phase 9 (NL search) or independent (nav/record search only).

---

## Phase 11 — AI Assistant

### Description
Add AI-powered record summarization, smart field suggestions from unstructured notes, and natural-language search.

### Files to Modify

| File | Change |
|------|--------|
| `src/actions/standard/record-actions.ts` | After successful create/update, enqueue `ai.process` for summarization |
| `src/app/api/search/global/route.ts` | Add NL query path: if `q` looks like a natural-language question, route through AI |
| `.env.example` | Add `AI_PROVIDER=openai|anthropic|none`, `AI_API_KEY` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/ai/types.ts` | `AiProvider` interface: `summarize()`, `generateFieldSuggestions()`, `translateQuery()` |
| `src/lib/ai/openai-provider.ts` | OpenAI implementation (`gpt-4o-mini` for cost efficiency) |
| `src/lib/ai/service.ts` | `AISuggestionFacade` — orchestrates provider calls |
| `src/app/api/ai/summarize/route.ts` | Endpoint returning record summary |
| `src/app/api/ai/suggest/route.ts` | Endpoint returning field suggestions |
| `src/lib/jobs/ai-jobs.ts` | `ai.process` queue item |
| `src/components/standard/record/ai-summary.tsx` | Summary panel on record detail |

### Schema Changes

| Model | Field |
|-------|-------|
| `Record` | `aiSummary: String?` (Text), `aiSummaryUpdatedAt: DateTime?` |

### Key Decisions

1. **Opt-in model:** AI features are disabled unless `AI_PROVIDER != "none"`. No PII leaves the system without explicit org opt-in.
2. **Cost control:** Use `gpt-4o-mini` for summarization; cache results; invalidate on field change.
3. **NL search:** Detect question syntax (starts with "which", "how many", "show me"); translate to structured query before hitting DB.
4. **Background processing:** Summaries generated async; stale `aiSummaryUpdatedAt` triggers regeneration.

### Tests

- `src/tests/lib/ai/service.test.ts` — prompt formatting, provider selection
- `src/tests/lib/ai/summarize.test.ts` — mock provider returns summary

### Dependencies

Phase 9 (search infrastructure), Phase 4 (timeline feed).

---

## Phase 12 — Communication Hub

### Description
Enhance notifications with email digests, a unified communication view, and smart grouping (leveraging AI from Phase 11).

### Files to Modify

| File | Change |
|------|--------|
| `src/app/api/notifications/route.ts` | Add `deliveryMethod` filter, digest grouping |
| `src/lib/email/templates.ts` | Add `digest` template |
| `src/components/standard/layout/app-header.tsx` | Update notification bell to show unread count + link to hub |

### Files to Create

| File | Purpose |
|------|---------|
| `src/actions/standard/notification-actions.ts` | `getCommunicationHub()`, `markAllReadByCategory()` |
| `src/components/standard/layout/communication-hub.tsx` | Hub page: all activity notifications |
| `src/components/standard/layout/notification-digest.tsx` | Daily/weekly digest email template preview |

### Schema Changes

| Model | Field |
|-------|-------|
| `Notification` | `deliveryMethod: String` (in_app, email, digest) |
| `Notification` | `category: String` (assignment, mention, report_ready, digest) |

### Key Decisions

1. **Digest batching:** Daily digest aggregates all low-priority notifications per user, sent at 8 AM local time.
2. **Hub view:** Combines in-app notifications, email status, and activity feed (from Phase 4 timeline).

### Tests

- `src/tests/actions/notification-actions.test.ts` — digest aggregation, unread counting

### Dependencies

Phase 8 (email), Phase 11 (AI grouping).

---

## Phase 13 — Reporting & Forecasting

### Description
Add a reports builder with saved report definitions, grouped/filtered output, chart rendering, and async report generation.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/layout/admin-sidebar.tsx` | Add "Reports" nav item |
| `src/components/standard/record/record-detail.tsx` | Add forecast summary for opportunity records |

### Files to Create

| File | Purpose |
|------|---------|
| `src/actions/admin/report-actions.ts` | `createReport()`, `runReport()`, `scheduleReport()` |
| `src/components/admin/reports/report-builder.tsx` | Report builder UI (fields, filters, groupings, chart type) |
| `src/components/admin/reports/report-list.tsx` | List + run + schedule saved reports |
| `src/lib/jobs/report-jobs.ts` | `report.generate` queue for async large reports |

### Schema Changes

| Model | Fields |
|-------|--------|
| `ReportDefinition` | `id`, `organizationId`, `name`, `objectApiName`, `criteria` (JSON), `groupings` (JSON), `chartType`, `isScheduled`, `scheduleCron`, `createdBy` |

### Key Decisions

1. **Report engine:** Reuses the existing `getRecords` pipeline (org-scoped + record access). Reports are saved query + display configs.
2. **Async generation:** Reports over 1000 rows are queued; email sent when ready (Phase 8 integration).
3. **Forecasting:** Opportunity pipeline report groups by `forecast_category` × `stage` × `close_date` quarter.

### Tests

- `src/tests/actions/report-actions.test.ts` — saved report CRUD, criteria validation
- `src/tests/lib/report-engine.test.ts` — grouping + aggregation logic

### Dependencies

Phase 6 (forecasting), Phase 9 (search criteria).

---

## Phase 14 — Integration Hub

### Description
Add outbound webhooks with delivery logs + retry, bearer API tokens with scopes, and a REST connector framework.

### Files to Modify

| File | Change |
|------|--------|
| `src/middleware.ts` | Add bearer-token auth path for `/api/v1/*` routes |
| `src/actions/standard/record-actions.ts` | After create/update/delete, fire `webhook.trigger("record.changed", ...)` |
| `src/lib/rate-limit-store.ts` | Add per-API-token rate limiting |

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/route.ts` | CRUD endpoints for webhook endpoints |
| `src/app/api/webhooks/[id]/deliveries/route.ts` | Delivery log viewer |
| `src/app/api/integrations/api-tokens/route.ts` | API token management |
| `src/lib/webhooks/types.ts` | `WebhookPayload`, `WebhookDeliveryStatus` |
| `src/lib/webhooks/service.ts` | `fireWebhook()`, `signPayload()` (HMAC-SHA256) |
| `src/lib/webhooks/verifier.ts` | `verifySignature()` for incoming webhooks |
| `src/lib/connectors/types.ts` | `Connector` interface |
| `src/lib/connectors/rest-connector.ts` | Generic REST connector implementation |
| `src/lib/jobs/webhook-jobs.ts` | `webhook.deliver` queue item |
| `src/actions/admin/webhook-actions.ts` | `createWebhookEndpoint()`, `testWebhook()`, `getDeliveryLog()` |
| `src/actions/admin/api-token-actions.ts` | `createApiToken()`, `revokeApiToken()` |

### Schema Changes

| Model | Fields |
|-------|--------|
| `WebhookEndpoint` | `id`, `organizationId`, `name`, `url`, `events` (JSON), `isActive`, `secret`, `createdAt` |
| `WebhookEvent` | `id`, `endpointId`, `eventType`, `payload` (JSON), `status`, `responseCode`, `errorMessage`, `attempts`, `nextRetryAt`, `createdAt`, `deliveredAt` |
| `ApiToken` | `id`, `organizationId`, `userId`, `tokenHash`, `name`, `scopes` (JSON), `expiresAt`, `revokedAt`, `createdAt` |

### Key Decisions

1. **Recursion guard:** Webhooks firing on record changes must not re-trigger if the change originated from a webhook. Flag via `X-Webhook-Trigger` header on internal updates.
2. **HMAC signing:** `Webhook-Signature` header = `sha256(secret + timestamp + payload)`.
3. **API token scopes:** Granular scopes (`records.read`, `records.write`, `users.read`, etc.) enforced in middleware.
4. **Token hashing:** Store `bcrypt`/`scrypt` hash of token (one-time plaintext exposure at creation only).

### Tests

- `src/tests/lib/webhooks/service.test.ts` — payload signing, signature verification
- `src/tests/security/api-token-scoping.test.ts` — scope enforcement, cross-org isolation

### Dependencies

Phase 1 (soft-delete: webhooks fire on delete events).

---

## Phase 15 — Performance & Observability

### Description
Add Redis-backed caching and rate limiting, a health check endpoint, slow-query logging, and OpenTelemetry-style spans.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/rate-limit-store.ts` | Replace `RateLimiter` (in-memory Map) with Redis-backed `RedisRateLimiter` |
| `src/lib/db.ts` | Add Prisma `$extends` middleware for query timing logs (slow > 500ms) |
| `src/middleware.ts` | Add `X-Response-Time` header |
| `src/app/api/search/global/route.ts` | Cache search results for 60s by query hash |

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/health/route.ts` | Health check: DB, Redis, worker status |
| `src/lib/observability.ts` | `span()` helper, `recordMetric()` facade |
| `src/lib/cache.ts` | `CacheProvider` (Redis) with TTL + invalidation |

### Key Decisions

1. **Redis as optional:** `REDIS_URL` env var; if unset, fall back to in-memory (dev mode).
2. **Cache invalidation:** Record mutations invalidate all cached queries for that object + org.
3. **Slow query logging:** Prisma `$queryRaw` and `findMany` calls above 500ms log a warning with query + orgId.
4. **Health check:** Checks PostgreSQL (via Prisma), Redis (if configured), and pg-boss queue health.

### Tests

- `src/tests/lib/cache.test.ts` — cache get/set/invalidate
- `src/tests/api/health.test.ts` — health endpoint returns 200 with all dependencies up

### Dependencies

Phase 14 (webhook delivery metrics), Phase 8 (email delivery metrics).

---

## Phase 16 — Delivery & Quality

### Description
Expand test coverage to client components and E2E, set up CI/CD with GitHub Actions, and clean up packaging artifacts.

### Files to Modify

| File | Change |
|------|--------|
| `vitest.config.ts` | Add `client` (jsdom) project |
| `package.json` | Add `test:e2e` script, `lint` + `typecheck` scripts if missing |
| `.env.example` | Update with all new env vars from Phases 2–15 |
| `src/actions/auth.ts` | Already fixed in Phase 2 (bcrypt cost alignment) |

### Files to Create

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI: lint + typecheck + unit tests + build; CD: build + deploy (optional) |
| `playwright.config.ts` | E2E test config |
| `src/tests/client/` | Client component test files |
| `src/tests/e2e/` | Playwright E2E specs (auth flow, record CRUD, admin config) |
| `src/tests/api/` | API route tests (`search`, `notifications`, `files`, `cmdk`) |
| `src/tests/admin/` | Admin action tests (`admin-actions.ts`, `permission-actions.ts`) |

### Cleanup Tasks

| File | Action |
|------|--------|
| `yarn.lock` | Delete (pnpm-lock.yaml is the real lockfile) |
| `prisma/schema.pprisma` | Delete (typo duplicate) |
| `start.bat` | Delete (empty) |
| `scripts/deploy-railway.sh` | Remove hardcoded paths |
| `src/lib/rate-limit-redis.ts` | Verify it's wired (exists but unused) |

### Key Decisions

1. **Test pyramid:** Unit (Vitest, 104 existing + new) → Client Component (Vitest jsdom) → E2E (Playwright).
2. **CI gates:** `npm run lint && npm run typecheck && npm run test:unit`. `typecheck` script must be added.
3. **E2E auth fixture:** Playwright uses `authClient.signIn.username()` to establish a session, then uses the session cookie for authenticated requests.

### Tests

- Client: `src/tests/client/record-form.test.tsx` — form validation, field rendering
- E2E: `src/tests/e2e/auth.spec.ts`, `src/tests/e2e/record-crud.spec.ts`, `src/tests/e2e/admin-config.spec.ts`
- API: `src/tests/api/search.test.ts`, `src/tests/api/notifications.test.ts`

### Dependencies

All prior phases complete (comprehensive test coverage).

---

## Cross-Phase Dependency Graph

```
                    Phase 3 (Objects) ──→ Phase 4 (Activities) ──→ Phase 5 (Lead) ──→ Phase 6 (Opp)
                          │                       │                      │                    │
Phase 1 (Soft-Delete) ────┼───────────────────────┼──────────────────────┼────────────→  Phase 13 (Reports)
      │                   │                       │                      │                    │
Phase 2 (Multi-Org)      │              Phase 8 (Email)              Phase 12 (Comm)   Phase 15 (Perf)
      │                   │                       │                      │                    │
Phase 7 (Storage)         │                       │                      │                    │
                          │              Phase 9 (Search) ───────────────┼────────────────────┤
                          │                    │                        │                    │
                          │                    ├──→  Phase 10 (CmdK)       │                    │
                          │                    ├──→  Phase 11 (AI) ──→ Phase 12  (Perf)           │
                          │                    │                        │                    │
                          │                    │                     Phase 14 (Webhooks)        │
                          │                    │                        │                    │
                          └──────────────────────────→ Phase 15 (Perf) ──┘                    │
                                                                                             │
Phase 14 (Integration) ───────────────────────────────────────────────────────────────────→ Phase 16 (Delivery)
                                                                                             │
                                                   All phases ───────────────────────────────┘
```

### Recommended Sprint Schedule (16 phases in ~12 sprints)

| Sprint | Phases | Focus |
|--------|--------|-------|
| Sprint 1 | 1, 7, 3 | Core correctness + infrastructure foundations |
| Sprint 2 | 2, 4 | Multi-org + activities/timeline |
| Sprint 3 | 5, 6 | Lead lifecycle + opportunity pipeline |
| Sprint 4 | 8, 9 | Email provider + search infrastructure |
| Sprint 5 | 10, 11 | Command palette + AI assistant |
| Sprint 6 | 12, 13 | Communication hub + reporting/forecasting |
| Sprint 7 | 14, 15 | Integration hub + performance/observability |
| Sprint 8 | 16 | Delivery & quality (tests + CI/CD + cleanup) |
| Sprint 8.5 | — | Regression + stabilization + hardening |

Independent phases (3, 7, 14) can be parallelized within sprints.

---

## Environment Variables (Consolidated)

All new env vars introduced across phases:

```dotenv
# Phase 1 — none (soft-delete uses existing schema)

# Phase 2 — none (session re-issue uses existing Better-Auth)
# (bcrypt cost already in src/lib/crypto.ts)

# Phase 7 — Document Store
STORAGE_PROVIDER=local|s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com  (or MinIO endpoint)

# Phase 8 — Email
EMAIL_PROVIDER=console|smtp|ses
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=...
SES_SECRET_ACCESS_KEY=...

# Phase 9 — Search
SEARCH_PROVIDER=postgresql|elasticsearch|meilisearch
ELASTICSEARCH_URL=http://localhost:9200

# Phase 11 — AI
AI_PROVIDER=none|openai|anthropic
AI_API_KEY=...
AI_MODEL=gpt-4o-mini

# Phase 15 — Observability
REDIS_URL=redis://localhost:6379
```

---

*NextCRM Implementation Roadmap — Kilo execution guide for the 16-phase transformation.*
