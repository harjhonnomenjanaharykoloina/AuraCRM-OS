# Feature Matrix — NextCRM vs OpenCRM

**Purpose:** Side-by-side comparison of every feature area between the NextCRM reference implementation (`pdovhomilja/nextcrm-app`) and the openCRM codebase under migration. Each row maps a discrete capability, its status in both projects, and the migration decision that should be applied when aligning openCRM to the NextCRM target.

> **Directory note:** NextCRM uses root-level dirs (`lib/`, `app/`, `prisma/`) — NOT `src/`. openCRM uses `src/` layout. Import paths must be remapped during migration.

> **Auth note:** NextCRM auth modules: `lib/auth.ts`, `lib/auth-permissions.ts`, `lib/auth-server.ts`, `lib/auth-guards.ts`, `lib/authz/session.ts`, `lib/authz/route.ts`, `lib/auth-client.ts`.

> **Multi-tenancy note:** NextCRM has NO tenant model — `Users` has no `organizationId`. openCRM has full multi-tenant isolation. This is the #1 migration challenge.

**Migration Decision Legend**
| Decision | When to use |
|----------|-------------|
| **KEEP** | Feature exists in both and is functionally equivalent — preserve openCRM's implementation. |
| **ADAPT** | Feature exists in both but needs modification (API changes, wiring gaps, cost alignment) to match NextCRM. |
| **MERGE** | Both have the feature but with different/complementary approaches; combine the strengths of each. |
| **REBUILD** | Feature exists in openCRM but is inadequate/incomplete; rebuild from scratch to match NextCRM. |
| **REPLACE** | openCRM uses a different approach; substitute with the NextCRM approach wholesale. |
| **REMOVE** | Feature exists in openCRM but not in NextCRM; it is deprecated/unnecessary for the target. |
| **ADD** | Feature exists in NextCRM but not in openCRM; implement from scratch. |

---

## 1. Authentication

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Authentication | BetterAuth + NextAuth.js v5 | Yes | Yes | ADAPT | Both use Better Auth; openCRM also bridges with NextAuth.js v5 for OAuth (email OTP, Google OAuth). openCRM needs to align session strategy with NextCRM (admin plugin, access control). |
| Authentication | Passwordless Email OTP | Yes (6-digit, 5-min expiry, Resend) | Yes (via NextAuth.js v5) | ADAPT | openCRM has email OTP via NextAuth.js v5 bridge. Align with NextCRM's Better-Auth emailOTP plugin for consistency. |
| Authentication | OAuth (Google) | Yes (socialProviders.google) | Yes (via NextAuth.js v5) | ADAPT | openCRM has Google OAuth via NextAuth.js v5. Consolidate to Better-Auth socialProviders.google for unified auth. |
| Authentication | Admin plugin / access control | Yes (adminPlugin with `ac`) | No | ADD | NextCRM uses BetterAuth admin plugin with `accessControl`. openCRM uses UserType enum. Replace/enhance with admin plugin. |
| Authentication | Session management | Yes (7-day expiry, 24h refresh) | Yes (JWT sessions) | KEEP | Both have JWT-based sessions. openCRM already uses `strategy: "jwt"` with `cookieCache`. |
| Authentication | First-user bootstrap | Yes (auto-promoted to admin + ACTIVE) | Via register() | ADAPT | openCRM's register() creates org + admin user in transaction. NextCRM has explicit `ADMIN_EMAIL` bootstrap. Align to NextCRM pattern. |
| Authentication | Pending/Inactive user interstitial | Yes (PENDING / INACTIVE redirect pages) | No | ADD | openCRM has no user status interstitials. Add `/pending` and `/inactive` interstitial pages. |
| Authentication | Dev OTP capture (E2E testing) | Yes (test-otp endpoint, captureOTP plugin) | No | ADD | NextCRM has `app/api/auth/test-otp/route.ts` gated on `NODE_ENV !== "production"`. Adds Playwright E2E test login capability. |
| Authentication | Legacy credential fallback | No | Yes (legacySignIn via bcryptjs.compare) | REMOVE | NextCRM disables password auth entirely (`emailAndPassword.enabled: false`). openCRM's `legacySignIn` should be removed post-migration. |

## 2. Authorization

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Authorization | RBAC roles (enum-based) | Yes (admin, manager, user) | Partial (Owner, Admin, Manager, Sales, Viewer as PermissionSets) | MERGE | NextCRM uses 3 BetterAuth roles; openCRM uses 5 PermissionSet-based roles. Merge: adopt NextCRM's 3-role model but keep openCRM's permission set granularity for finer control. |
| Authorization | Permission statements/abilities | Yes (user→CRUD, crm→CRUD, project→CRUD, report→read/export, settings→read/update) | No (object-level CRUD via PermissionSet/ObjectPermission) | REPLACE | NextCRM uses BetterAuth `ac` statements. openCRM uses ObjectPermission CRUD flags. Replace with statement-based model for consistency. |
| Authorization | Permission sets (fine-grained) | Partial (NextCRM uses RBAC not permission sets) | Yes (PermissionSet, PermissionSetGroup, assignments) | KEEP | openCRM's permission set model is more powerful. NextCRM's OpenCRM mapping reference acknowledges NextCRM's RBAC is equivalent. Preserve. |
| Authorization | Object-level permissions | Yes (BetterAuth `ac` CRUD per object type) | Yes (allowRead/Create/Edit/Delete + viewAll/modifyAll) | MERGE | NextCRM uses `ac` statements; openCRM uses ObjectPermission model. Merge: use openCRM's ObjectPermission model but enforce via NextCRM's scope helpers. |
| Authorization | Record-level access / ownership scoping | Yes (assertCan* scope helpers in lib/authz/scopes/crm.ts) | Yes (buildRecordAccessFilter + buildRecordAccessSql) | ADAPT | Both have record-level scoping. openCRM's exists in `lib/record-access.ts`; needs to be extended to cover NextCRM's broader entity graph (activities, documents, contracts). |
| Authorization | Ownership columns model | Yes (assigned_to, createdBy, watchers, sharedWith[]) | Yes (ownerId/ownerType USER/QUEUE, RecordShare, Group) | MERGE | NextCRM uses flat ownership columns + watchers junction; openCRM uses Queue/RecordShare/Group model. Merge both approaches. |
| Authorization | Queue-based assignment | No | Yes (Queue, QueueMember, OwnerType enum) | REPLACE | NextCRM has no queue model. openCRM's queue-based ownership is richer. Adopt into NextCRM target. |
| Authorization | Group-based sharing | No | Yes (Group, RecordShare with GROUP principal) | REPLACE | NextCRM has `sharedWith[]`; openCRM has Group + RecordShare. Adopt group-based sharing from openCRM. |
| Authorization | Tenant isolation (multi-org) | No (single-user ownership model, no Organization) | Yes (Organization model, organizationId on all tables) | **CRITICAL GAP** | NextCRM has NO tenant/organization model — `Users` has no `organizationId`. openCRM has full multi-tenant isolation (3 layers). **Highest-priority migration challenge.** |
| Authorization | API token / bearer auth | Yes (nxtc__ prefixed tokens, SHA-256 hashed) | No | ADD | NextCRM has MCP API tokens in `lib/api-tokens.ts`. openCRM has no API tokens (planned Phase 14). Add. |
| Authorization | Existence leak prevention | Yes (assertScopeOrNotFound → NOT_FOUND) | Yes (getRecord returns NOT_FOUND for inaccessible) | KEEP | Both protect against existence oracle. Equivalent approaches. |

## 3. CRM Core

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| CRM Core | Accounts | Yes (crm_Accounts, full CRUD, watchers, case-study, products, tasks) | Yes (Company object via EAV) | MERGE | NextCRM uses typed Prisma tables; openCRM uses EAV. Merge: keep EAV engine, adopt NextCRM's watcher + case-study + account-products patterns. |
| CRM Core | Contacts | Yes (crm_Contacts, social links, tags, notes, enrichment) | Yes (Contact object) | MERGE | NextCRM has social profile fields + enrichment. openCRM has EAV flexibility. Merge. |
| CRM Core | Leads | Yes (crm_Leads, source/status/type, account linkage, convert) | Yes (Lead + convertLead) | ADAPT | openCRM's convertLead only creates Contact; NextCRM creates Contact + (partial). Adapt openCRM to full conversion (Company + Contact + Opportunity) per Phase 5. |
| CRM Core | Lead source/status/type lookup tables | Yes (crm_Lead_Sources, _Statuses, _Types) | Partial (picklist fields) | ADAPT | openCRM uses picklist fields on the Lead object. NextCRM uses dedicated lookup tables. Adapt to dedicated lookup tables for richer management. |
| CRM Core | Opportunities | Yes (crm_Opportunities, sales stages, approval gate, line items, FX) | Yes (Opportunity) | MERGE | NextCRM has approval gate + FX snapshot + line items. openCRM has EAV. Merge: adopt NextCRM's approval gate + FX, keep EAV model. |
| CRM Core | Sales stages with probability | Yes (crm_Opportunities_Sales_Stages, stage_kind, probability) | Partial (stage picklist) | ADAPT | openCRM has a stage picklist but no probability/forecast. Adapt per Phase 6: add probability + expected_revenue + forecast_category. |
| CRM Core | Approval gate (CSO) | Yes (lib/crm/approval-gate.ts on opportunities) | No | ADD | NextCRM has CSO approval gate for opportunities before quote sent. openCRM has no approval gate. Add per Phase 6 dependency. |
| CRM Core | Contracts | Yes (crm_Contracts, value, dates, renewal reminders, line items, status) | No | ADD | openCRM has no contract object. Seed per Phase 3 + build per NextCRM's model. |
| CRM Core | Activities | Yes (crm_Activities + polymorphic ActivityLinks, 5 types: call/meeting/note/email) | No | ADD | openCRM only has Task. NextCRM has full polymorphic activity engine. Add per Phase 4. |
| CRM Core | Activity types (Call, Meeting, Note, Email) | Yes (call/meeting/note/email via polymorphic links) | No | ADD | openCRM has only Task. Need Call, Meeting, Note, Email activity types via Phase 3+4. |
| CRM Core | Polymorphic activity linking | Yes (crm_ActivityLinks: entityType + entityId) | No | ADD | NextCRM's ActivityLinks junction allows activities to attach to ANY entity. openCRM's RecordComment is record-specific. Add polymorphic linking. |
| CRM Core | Notes | Partial (notes[] array on contacts/targets) | No (standalone) | ADAPT | NextCRM has notes arrays but not a standalone Notes object. openCRM will seed Note as object per Phase 3. Adopt NextCRM's array approach on CRM entities. |
| CRM Core | Tags | Yes (tags[] on contacts, targets) | No | ADD | NextCRM uses JSONB tags arrays. openCRM has no tagging. Add. |
| CRM Core | Custom Fields | Partial (hardcoded Prisma schema columns) | Yes (EAV FieldDefinition, 14 field types) | MERGE | openCRM's EAV model is more flexible. Merge: keep EAV for custom objects, adopt NextCRM's typed columns for standard objects. |
| CRM Core | Timeline / History | Yes (AuditTimeline, AuditEntry components, per-entity History tab) | Partial (FieldHistory on record detail) | ADAPT | openCRM has FieldHistory but no unified timeline. Adopt NextCRM's ActivityTimeline that aggregates activities + comments + field history per Phase 4. |
| CRM Core | Products / Catalog | Yes (crm_Products, ProductCategories, unit_price, tax, recurring) | No | ADD | openCRM has no product object. Seed per Phase 3 + build per NextCRM's model. |
| CRM Core | Account Products (subscriptions) | Yes (crm_AccountProducts, custom_price, recurring) | No | ADD | NextCRM links products to accounts with subscription-like model. openCRM has nothing. Add. |
| CRM Core | Line Items (Opportunity/Contract) | Yes (OpportunityLineItems, ContractLineItems) | No | ADD | openCRM has no line item concept. Add per NextCRM's model. |
| CRM Core | Opportunity line items | Yes (crm_OpportunityLineItems) | No | ADD | See above. |
| CRM Core | Contract line items | Yes (crm_ContractLineItems) | No | ADD | See above. |
| CRM Core | Watchers pattern | Yes (AccountWatchers, BoardWatchers junctions) | No | ADD | NextCRM has watchers on accounts, boards, tasks. openCRM has no watcher concept. Add. |
| CRM Core | Funnel / Automation | Yes (funnel-timers, stage-transition, auto-task, kill-rule, recycle) | No | ADD | NextCRM has CRM funnel automation via Inngest. openCRM has none. Add per Phase 11 dependency (AI) + Inngest integration. |
| CRM Core | Case Study Pipeline | Yes (case_study_candidate flag → CSO approval gate) | No | ADD | openCRM has no case study pipeline. Add per NextCRM's model. |
| CRM Core | Calendar Sync | Yes (Google Calendar OAuth2, Calendly webhooks, outbound sync) | No | ADD | openCRM has no calendar integration. Add per Phase 8 (email provider). |
| CRM Core | Client Activity | Yes (lib/crm/client-activity.ts) | No | ADD | openCRM has no client activity tracking. Add. |

## 4. Projects

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Projects | Boards (Kanban) | Yes (Boards, Sections, dnd-kit drag-drop) | No | ADD | openCRM has no project boards. NextCRM has full Kanban boards. Add per NextCRM's model. |
| Projects | Tasks | Yes (Tasks model + crm_Accounts_Tasks for CRM-linked tasks) | Yes (Task object via EAV) | MERGE | openCRM has Task as EAV object; NextCRM has typed Tasks table + CRM-linked tasks. Merge: adopt NextCRM's dual-task-pool model. |
| Projects | Comments on tasks | Yes (tasksComments model) | Yes (RecordComment on records) | ADAPT | openCRM's comments are on Records (EAV); NextCRM has task-specific comments. Adapt to support task comments with openCRM's mention model. |
| Projects | Task status | Yes (taskStatus enum: ACTIVE/PENDING/COMPLETE) | Partial (status picklist) | KEEP | Both have task status. Equivalent. |
| Projects | Task priority | Yes (priority field) | No | ADD | openCRM's Task has no priority field. Add per NextCRM's model. |
| Projects | Task deadlines | Yes (due dates) | No | ADD | openCRM's Task seed has no due date fields. Add per Phase 3. |
| Projects | Task members / assignment | Yes (user assignee, watchers) | Partial (owner model) | ADAPT | openCRM uses owner/queue model; NextCRM has user assignee + watchers. Adapt to add watchers. |
| Projects | Task progress tracking | Yes (progress tracking) | No | ADD | openCRM has no progress tracking. Add. |
| Projects | Task documents | Yes (DocumentsToTasks, DocumentsToCrmAccountsTasks junctions) | No | ADD | openCRM has no document-to-task linking. Add. |
| Projects | Board watchers | Yes (BoardWatchers junction) | No | ADD | openCRM has no board/watcher concept. Add. |
| Projects | Shared with (boards) | Yes (sharedWith[] on Boards) | No | ADD | openCRM has no board sharing. Add. |
| Projects | Projects dashboard | Yes (databox page, projects dashboard) | No | ADD | openCRM has dashboard widgets but no project-specific dashboard. Add. |

## 5. Invoicing

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Invoicing | Invoices module | Yes (full module, Server Actions + Zod) | No | ADD | openCRM has no invoicing. Add per NextCRM's full model. |
| Invoicing | Credit Notes | Yes (CREDIT_NOTE type, originalInvoiceId linkage) | No | ADD | openCRM has no credit notes. Add. |
| Invoicing | Proforma invoices | Yes (PROFORMA type) | No | ADD | openCRM has no proforma. Add. |
| Invoicing | Receipts | Yes (mentioned in README enum) | No | ADD | openCRM has no receipts. Add. |
| Invoicing | Line Items | Yes (Invoice_LineItems, quantity, unit_price, discount, tax) | No | ADD | openCRM has no invoice line items. Add. |
| Invoicing | Tax Engine | Yes (Invoice_TaxRates, per-line VAT, summary buckets) | No | ADD | openCRM has no tax engine. Add. |
| Invoicing | Multi-currency + FX | Yes (Currency, ExchangeRate, ECB sync, fxRateToBase, baseCurrency) | No | ADD | openCRM has no multi-currency. Add per NextCRM's model. |
| Invoicing | Currency switching | Yes (CurrencySwitcher component, currency-context) | No | ADD | openCRM has no currency context. Add. |
| Invoicing | Payments | Yes (Invoice_Payments, partial/full, auto balanceDue) | No | ADD | openCRM has no payment tracking. Add. |
| Invoicing | PDF generation | Yes (@react-pdf/renderer, templates, i18n-aware) | No | ADD | openCRM has no PDF generation. Add. |
| Invoicing | Email delivery | Yes (Resend + React Email templates) | No | ADD | openCRM has no email delivery. Add (depends on Phase 8 email provider). |
| Invoicing | Status lifecycle | Yes (DRAFT→ISSUED→PAID/PARTIALLY_PAID/CANCELLED/OVERDUE/DISPUTED/REFUNDED/WRITTEN_OFF) | No | ADD | openCRM has no invoice status lifecycle. Add with permission guards. |
| Invoicing | Invoice Series (numbering) | Yes (numbering.ts, prefix/suffix, resetPolicy, counters) | No | ADD | openCRM has no invoice numbering. Add. |
| Invoicing | Invoice Activity Log | Yes (Invoice_Activity model, every status change + edit) | No | ADD | openCRM has no invoice activity log. Add. |
| Invoicing | Admin settings | Yes (/admin/invoices/ — tax rates, series, currencies, company details) | No | ADD | openCRM has no invoice admin settings. Add. |
| Invoicing | Invoice search | Yes (lib/invoices/search.ts) | No | ADD | openCRM has no invoice search. Add. |
| Invoicing | Duplicate & cancel | Yes (one-click duplication, originalInvoiceId linkage) | No | ADD | openCRM has no invoice duplication. Add. |

## 6. Documents

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Documents | Storage backend | Yes (S3/MinIO via presigned PUT URLs, UploadThing alternative) | Partial (local disk only) | ADAPT | openCRM has local disk with path traversal guard. Adopt NextCRM's S3/MinIO adapter per Phase 7. |
| Documents | Upload (presigned) | Yes (presigned PUT URLs for direct browser upload) | Yes (multipart upload via /api/files/upload) | MERGE | openCRM uses multipart; NextCRM uses presigned PUT. Merge: adopt NextCRM's presigned approach for scalability. |
| Documents | File types | Yes (react-doc-viewer for inline preview, mammoth for text extraction) | Partial (magic-byte MIME detection for PNG/JPEG/GIF/WebP/PDF/SVG) | ADAPT | openCRM detects 8 types; NextCRM supports broader set. Expand openCRM's allow-list. |
| Documents | Versioning | Yes (parent_document_id / child_versions, version column) | No | ADD | openCRM's FileAttachment has no version tracking. Add per NextCRM's model. |
| Documents | Document model | Yes (Documents table, 6 junction links) | Yes (FileAttachment model) | REPLACE | NextCRM's Documents model is richer (visibility, processing_status, content_text, summary, thumbnail). Adopt NextCRM's full model. |
| Documents | Content extraction (text) | Yes (mammoth for docx → content_text) | No | ADD | openCRM stores file metadata only. Adopt NextCRM's text extraction per Phase 7. |
| Documents | Document enrichment (embeddings) | Yes (enrich-document Inngest function, crm_Document_Chunks, vector search) | No | ADD | openCRM has no document enrichment. Add per Phase 11 dependency. |
| Documents | Document chunking | Yes (crm_Document_Chunks table for large document search) | No | ADD | openCRM has no chunking. Add per NextCRM's model. |
| Documents | Thumbnail generation | Yes (generate-thumbnail Inngest function) | No | ADD | openCRM has no thumbnail generation. Add. |
| Documents | Processing status | Yes (PENDING/PROCESSING/READY/FAILED enum) | No | ADD | openCRM has no document processing pipeline. Add. |
| Documents | Document linking (junctions) | Yes (DocumentsToAccounts, DocumentsToOpportunities, DocumentsToContacts, DocumentsToLeads, DocumentsToTasks, DocumentsToCrmAccountsTasks) | No | ADD | openCRM has no document-to-entity linking. Add junction tables. |
| Documents | Document visibility | Yes (public/private visibility field) | No | ADD | openCRM has no document visibility model. Add. |
| Documents | Soft delete on documents | Yes (deletedAt/deletedBy) | Partial (no soft delete on FileAttachment) | ADAPT | openCRM's FileAttachment has no soft delete. Adopt NextCRM's pattern. |

## 7. Email

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Email | IMAP client (sync) | Yes (imap library, EmailAccount model, sync-all/sync-account Inngest) | No | ADD | openCRM has no IMAP client. Add per NextCRM's model (IMAP_* env vars). |
| Email | SMTP sending | Yes (nodemailer, lib/sendmail.ts) | No | ADD | openCRM mentions SMTP env vars but has no SMTP sending wired. Add per Phase 8 email provider. |
| Email | Client interface (inbox) | Yes (emails routes, Email model, imap-safety.ts) | No | ADD | openCRM has no email client UI. Add per NextCRM's model. |
| Email | Email templates | Yes (React Email 2.x templates in emails/) | No | ADD | openCRM has no email templates. Add per Phase 8 (EmailTemplate model + templates). |
| Email | Transactional provider (Resend) | Yes (resend@^6.9, lib/resend.ts with env+DB fallback) | No | ADD | openCRM has no transactional email. Add Resend per Phase 8. |
| Email | Email account management | Yes (EmailAccount with encrypted password + OAuth2 refresh tokens) | No | ADD | openCRM has no email account model. Add with AES-256-GCM encryption. |
| Email | Email-to-CRM linking | Yes (link-crm Inngest, EmailsToContacts/EmailsToAccounts junctions) | No | ADD | openCRM has no email-CRM linking. Add. |
| Email | Email embedding (semantic) | Yes (embed-email Inngest, EmailEmbedding vector table) | No | ADD | openCRM has no email embeddings. Add per Phase 11 (AI). |
| Email | Mailtrap fallback | Yes (Mailtrap API key alternative) | No | ADD | openCRM has no Mailtrap integration. Add. |
| Email | Email safety guards | Yes (lib/email/imap-safety.ts protects against unsafe IMAP ops) | No | ADD | openCRM has no IMAP safety. Add. |
| Email | Incremental sync | Yes (tracks inboxLastUid/sentLastUid) | No | ADD | openCRM has no email sync tracking. Add. |

## 8. AI Features

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| AI Features | Vector embeddings | Yes (OpenAI text-embedding-3-small, 1536-dim, Inngest embed-* functions, pgvector HNSW) | No | ADD | openCRM has no embedding pipeline. Add per Phase 11. |
| AI Features | Semantic search | Yes (pgvector cosine similarity, unified with keyword) | No | ADD | openCRM has only LIKE search. Add per Phase 9+11. |
| AI Features | Find Similar | Yes (find-similar-button, similar-records-drawer per CRM entity) | No | ADD | openCRM has no similarity search. Add. |
| AI Features | Document chunks (vector) | Yes (crm_Document_Chunks table) | No | ADD | openCRM has no document chunking. Add per Phase 11. |
| AI Features | Enrichment (E2B agent) | Yes (E2B cloud sandbox + Claude Sonnet 4.6, tool-use loop, specialised agents) | No | ADD | openCRM has no enrichment. Add per Phase 11. |
| AI Features | Enrichment agent architecture | Yes (orchestrator + company-profile/discovery/funding/metrics/tech-stack/general agents) | No | ADD | openCRM has no agent architecture. Add. |
| AI Features | Confidence scoring | Yes (fields below 0.6 confidence discarded) | No | ADD | openCRM has no confidence scoring. Add. |
| AI Features | C-level contact discovery | Yes (crm_Target_Contact records from company enrichment) | No | ADD | openCRM has no C-level discovery. Add. |
| AI Features | AI assistant (project mgmt) | Partial (P4/Future — GPT via Vercel AI SDK) | No | ADD | NextCRM marks this as P4 (future). Add per Phase 11. |
| AI Features | API key management (3-tier) | Yes (lib/api-keys.ts, ENV → system DB → user DB, AES-256-GCM) | No | ADD | openCRM has no API key management. Add. |
| AI Features | Encrypted secret storage | Yes (email-crypto.ts, AES-256-GCM, EMAIL_ENCRYPTION_KEY env) | Partial (bcrypt for passwords only) | ADAPT | openCRM has bcrypt for passwords but no AES-256-GCM encryption. Adopt NextCRM's encryption module. |

## 9. MCP Server

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| MCP Server | MCP server | Yes (mcp-handler@^1.1, 127 tools across 15 modules) | No | ADD | openCRM has no MCP server. API tokens + webhooks planned for Phase 14 — extend to full MCP server. |
| MCP Server | Bearer token auth | Yes (nxtc__ prefix, SHA-256 hashed, 10 max per user) | No | ADD | openCRM has no bearer tokens. Add per Phase 14 + NextCRM's model. |
| MCP Server | Streamable HTTP transport | Yes (GET/POST + SSE via /api/mcp/[transport]) | No | ADD | openCRM has no MCP transport. Add. |
| MCP Server | Tool coverage (CRM modules) | Yes (accounts, contacts, leads, opportunities, targets, products, contracts, activities, documents, target-lists, enrichment, email-accounts, users) | No | ADD | openCRM has no MCP tools. Add per NextCRM's 15 modules. |
| MCP Server | Tool coverage (campaigns) | Yes (18 campaign tools — full lifecycle) | No | ADD | openCRM has no campaigns module. Add. |
| MCP Server | Tool coverage (projects) | Yes (18 project tools — boards, sections, tasks, comments, documents, watch) | No | ADD | openCRM has no project boards. Add. |
| MCP Server | Tool coverage (reports) | Yes (list, run reports) | No | ADD | openCRM has no reports. Add. |
| MCP Server | Scope adapter (auth parity) | Yes (all tools receive userId/mcpUser, delegate to lib/authz scope helpers) | No | ADD | openCRM's permission model is different — MCP tools must integrate with buildRecordAccessFilter. |
| MCP Server | Dev session fallback | Yes (NODE_ENV=development only) | No | ADD | openCRM has no session-based MCP auth fallback. Add. |
| MCP Server | Token prefix + suffix display | Yes (8-char prefix shown, hashed tokenHash stored) | No | ADD | openCRM has no token display model. Add. |

## 10. Audit & History

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Audit & History | Soft delete (records) | Yes (deletedAt/deletedBy on all CRM entities) | Partial (Record.isDeleted added + migration, NOT wired in reads; deleteRecord hard-deletes) | ADAPT | openCRM's soft-delete exists in schema but is not wired. Must filter isDeleted on all reads + make deleteRecord set isDeleted=true. (Phase 1) |
| Audit & History | Change tracking (diff engine) | Yes (diffObjects() in lib/audit-log.ts, strips internal fields) | Yes (FieldHistory with old/new values, hasFieldValueChanged) | MERGE | openCRM has FieldHistory; NextCRM has AuditLog with diffObjects. Merge: use FieldHistory for EAV + AuditLog for typed objects. |
| Audit & History | Audit log (centralized) | Yes (crm_AuditLog table, admin /admin/audit-log page, per-entity History tab) | No | ADD | openCRM has no centralized audit log. FieldHistory is per-record only. Add central audit log. |
| Audit & History | Audit log actions (enum) | Yes (created/updated/deleted/restored/relation_added/relation_removed) | No | ADD | openCRM has no audit action enum. Add. |
| Audit & History | Audit history per entity | Yes (AuditTimeline + AuditEntry components per entity detail page) | Partial (FieldHistory on record detail) | ADAPT | openCRM shows FieldHistory on record detail. Adapt to NextCRM's AuditTimeline pattern with restore capability. |
| Audit & History | Soft delete restore | Yes (lib/crm/recycle.ts, restore-account action, admin restore) | Partial (restoreRecord exists but isDelete wired is incomplete) | ADAPT | openCRM's restoreRecord exists conceptually. Wire it properly per Phase 1. |
| Audit & History | Admin trash view | No (admin restore exists but no trash UI) | No | ADD | openCRM has purgeRecord but no trash view UI. Add admin trash view per Phase 1. |
| Audit & History | Owner history | Partial (crm_Accounts has ownership changes tracked via audit) | Yes (RecordOwnerHistory model) | KEEP | openCRM's RecordOwnerHistory is more complete. NextCRM tracks via AuditLog. Keep openCRM's model. |
| Audit & History | Inbound lookup preservation | Yes (soft-delete preserves inbound lookups for restore) | Yes (purgeRecord clears inbound lookups; soft-delete preserves) | KEEP | Both preserve inbound lookups on soft-delete. Equivalent. |
| Audit & History | Audit-on-mutate pattern | Yes (writeAuditLog called in same transaction scope as mutation, fire-and-forget on failure) | Partial (FieldHistory written in transaction) | ADAPT | openCRM writes FieldHistory inside transaction. Adopt NextCRM's writeAuditLog (fire-and-forget) for non-critical audit. |

## 11. Search

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Search | Keyword search | Yes (PostgreSQL tsvector / search_vector column, GIN index) | Partial (server-side LIKE, valueSearch column with 191-char index) | ADAPT | openCRM uses LIKE on valueSearch. Migrate to PostgreSQL full-text tsvector per Phase 9. |
| Search | Semantic search | Yes (pgvector cosine similarity, HNSW indexes) | No | ADD | openCRM has no vector search. Add per Phase 9+11. |
| Search | Unified search (keyword + semantic) | Yes (fulltext-search components, combined grouped UI) | No | ADD | openCRM has only global search endpoint. Add unified keyword+semantic search per Phase 9+11. |
| Search | Global search | Yes (/fulltext-search/ route, org + record-access scoped) | Yes (/api/search/global, org + record-access scoped) | MERGE | Both have global search. Merge: adopt NextCRM's combined keyword+semantic approach while keeping openCRM's org scoping. |
| Search | Search filters | Yes (UI filters in search components) | Partial (basic criteria in list views) | ADAPT | openCRM has list view criteria. Expand to search filters per Phase 9. |
| Search | Search ranking | Yes (ts_rank_cd + exact-match boost) | No | ADD | openCRM has no search ranking. Add per Phase 9. |
| Search | Search provider abstraction | No (native PostgreSQL only) | No (LIKE only) | ADD | Neither has abstraction. Add SearchProvider interface per Phase 9. |

## 12. Background Jobs

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Background Jobs | Job runner | Yes (Inngest 4.0, inngest/functions/) | Yes (pg-boss 11.1.2, src/lib/jobs/) | MERGE | openCRM uses pg-boss (two queues: sharing-rule + import); NextCRM uses Inngest. Merge: keep pg-boss for reliability, adopt Inngest for AI enrichment jobs that need complex orchestration. |
| Background Jobs | Embedding jobs | Yes (embed-account, embed-contact, embed-lead, embed-opportunity, embed-backfill, embed-email) | No | ADD | openCRM has no embedding jobs. Add per Phase 11. |
| Background Jobs | Enrichment jobs | Yes (enrich-contact, enrich-target, enrich-contacts-bulk, enrich-targets-bulk, enrich-document) | No | ADD | openCRM has no enrichment jobs. Add per Phase 11. |
| Background Jobs | Email sync jobs | Yes (sync-all, sync-account, embed-email, link-crm) | No | ADD | openCRM has no email sync jobs. Add per Phase 8. |
| Background Jobs | Campaign send jobs | Yes (send-now, send-step, schedule-send, process-follow-up) | No | ADD | openCRM has no campaigns. Add with jobs per Phase 8. |
| Background Jobs | CRM automation jobs | Yes (care-tasks, kill-rule, qualified-cadence, recycle-targets, renewal-reminders) | No | ADD | openCRM has no CRM automation. Add per Phase 11 dependency. |
| Background Jobs | Report schedule jobs | Yes (send-scheduled for report delivery) | No | ADD | openCRM has no scheduled reports. Add per Phase 13. |
| Background Jobs | Exchange rate sync | Yes (ecb/sync-exchange-rates, ECB feed) | No | ADD | openCRM has no FX sync. Add per invoicing phase. |
| Background Jobs | Calendar sync jobs | Yes (google-sync-all, google-sync-connection, outbound-sync, process-event) | No | ADD | openCRM has no calendar sync. Add per Phase 8. |
| Background Jobs | Document processing jobs | Yes (enrich-document, generate-thumbnail) | No | ADD | openCRM has no document processing jobs. Add per Phase 7+11. |
| Background Jobs | Import processing | No (synchronous in record-actions.ts) | Yes (pg-boss import-processing.ts) | KEEP | openCRM's async import via pg-boss is solid. Preserve as-is. |
| Background Jobs | Sharing rule recompute | No (synchronous in transaction) | Yes (pg-boss sharing-rule-worker.ts) | KEEP | openCRM's async sharing rule recompute via pg-boss. Preserve. |

## 13. Integrations

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Integrations | OAuth providers | Yes (Google OAuth for auth + Google Calendar OAuth2) | No | ADD | openCRM has no OAuth. Add Google OAuth for auth + calendar per Phase 8+NextCRM. |
| Integrations | Email providers | Yes (Resend + React Email, SMTP via nodemailer, IMAP, Mailtrap) | No | ADD | openCRM has no email provider abstraction. Add per Phase 8. |
| Integrations | Webhooks (outbound) | Yes (Calendly webhooks, Resend webhooks, campaigns) | No | ADD | openCRM has no webhooks. Add per Phase 14. |
| Integrations | Webhook delivery log | Yes (campaign_sends tracking delivery) | No | ADD | openCRM has no webhook delivery tracking. Add per Phase 14. |
| Integrations | External APIs (ECB) | Yes (ECB exchange rate feed for FX) | No | ADD | openCRM has no external API integrations. Add ECB for currency. |
| Integrations | External APIs (E2B/Anthropic/OpenAI) | Yes (E2B sandbox, Anthropic Claude, OpenAI embeddings) | No | ADD | openCRM has no external AI APIs. Add per Phase 11. |
| Integrations | REST connector framework | No | No | ADD | Neither has connectors. Add per Phase 14. |
| Integrations | API token auth (bearer) | Yes (MCP Bearer tokens, nxtc__ prefix, SHA-256) | No | ADD | openCRM has no API tokens. Add per Phase 14. |
| Integrations | OAuth provider (auth) | Yes (Google via BetterAuth social plugin) | No | ADD | See OAuth providers above. |
| Integrations | Calendar provider | Yes (Google Calendar OAuth2, Calendly webhooks) | No | ADD | openCRM has no calendar provider. Add per Phase 8. |

## 14. Internationalization

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Internationalization | i18n library | Yes (next-intl @^4.11) | Yes (custom t-function: src/i18n/) | REPLACE | NextCRM uses next-intl; openCRM uses custom system. Replace with next-intl per Phase 16. |
| Internationalization | Locales | Yes (en, cz, de, uk — 4 locales) | Yes (en, fr — 2 locales) | MERGE | Merge locale sets: adopt next-intl framework, include both en+cz+de+uk+fr (5 locales). |
| Internationalization | Locale routing | Yes (next-intl routing, /[locale]/ prefix, hasLocale fallback) | Yes (NEXT_LOCALE cookie, localeCookieName) | ADAPT | openCRM uses cookie-based locale. Adapt to next-intl's locale-prefixed routing. |
| Internationalization | Server-side translation | Yes (next-intl middleware + request handlers) | Yes (getT() from src/i18n/server.ts) | ADAPT | Replace openCRM's getT() with next-intl's getMessage + useTranslations. |
| Internationalization | Client-side translation | Yes (useTranslations from next-intl) | Yes (useTranslations from @/i18n/client) | REPLACE | Replace with next-intl's client hook. |
| Internationalization | Pluralization | Partial (next-intl built-in) | Yes (custom \| separator syntax) | KEEP | Both support plurals. next-intl's is more standard. Replace custom syntax with next-intl built-in. |
| Internationalization | Interpolation | Yes (next-intl {var} syntax) | Yes (custom {var} syntax) | REPLACE | Replace custom interpolation with next-intl's. |
| Internationalization | Time zone handling | Yes (Europe/Prague) | No | ADAPT | openCRM has no explicit timezone. Adopt NextCRM's Europe/Prague config. |
| Internationalization | Currency formatting | Yes (currency-format.ts + next-intl, locale-aware) | No | ADD | openCRM has no currency formatting. Add per Phase 7 (invoicing). |
| Internationalization | Hardcoded strings | Partial (some in message files) | Yes (~40+ hardcoded strings in components) | ADAPT | openCRM has many hardcoded strings (UI_AUTH_I18N_AUDIT). Migrate all to i18n keys. |

## 15. UI/UX

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| UI/UX | Design system | Yes (shadcn/ui + Radix + Tailwind v4 + Tremor + PrimeReact + PrimeIcons) | Yes (shadcn/ui + Radix + Tailwind + recharts + framer-motion) | MERGE | Merge: keep openCRM's shadcn/ui + Radix; add NextCRM's Tremor for charts + PrimeReact where needed. |
| UI/UX | Navigation (sidebar) | Yes (AppSidebar component, locale-aware) | Yes (standard-sidebar.tsx) | KEEP | Both have sidebar navigation. Equivalent. |
| UI/UX | Dashboard | Yes (databox page, reports dashboard, Tremor charts) | Yes (dashboard widgets, recharts) | MERGE | Merge: keep openCRM's widget system; adopt NextCRM's Tremor visual style. |
| UI/UX | Tables | Yes (TanStack React Table, server + client side) | Yes (data-table.tsx) | KEEP | Both use TanStack Table. Equivalent. |
| UI/UX | Forms | Yes (react-hook-form + @hookform/resolvers + Zod) | Partial (uses shadcn form primitives) | ADAPT | openCRM uses form wrappers. Adopt NextCRM's react-hook-form + Zod pattern. |
| UI/UX | Modals / Dialogs | Yes (Radix Dialog + Vaul bottom sheets, form-sheet.tsx wrapper) | Partial (shadcn Dialog primitives) | ADAPT | openCRM has basic dialogs. Adopt NextCRM's Vaul bottom sheets + form-sheet pattern. |
| UI/UX | Responsive design | Yes (useMobile hook, responsive grids) | Partial (some responsive layouts) | ADAPT | openCRM is partially responsive. Expand to full responsive per NextCRM's patterns. |
| UI/UX | Rich text editor | Yes (Tiptap, extension-link, underline, starter-kit) | No | ADD | openCRM has no rich text editor. Add Tiptap per Phase 3 (for emails/notes). |
| UI/UX | Drag & drop | Yes (@dnd-kit/core, /sortable, /modifiers for boards/tasks) | Partial (kanban-board.tsx) | ADAPT | openCRM has basic kanban DnD. Adopt NextCRM's @dnd-kit pattern for boards + tasks. |
| UI/UX | Command palette (Cmd+K) | No | No | ADD | Neither has Cmd+K. Add per Phase 10. |
| UI/UX | Toast notifications | Yes (Sonner toaster, internal toast hooks) | Partial (shadcn toast) | ADAPT | openCRM uses shadcn toast. Adopt NextCRM's Sonner for richer notifications. |
| UI/UX | Theme system | Yes (next-themes, system/light/dark) | No | ADD | openCRM has no theme system. Add per Phase 16. |
| UI/UX | Skeleton loaders | Yes (skeletons/ per module) | Partial (only sidebar.tsx uses Skeleton) | ADAPT | openCRM has minimal skeletons. Expand per NextCRM's per-module pattern. |
| UI/UX | Error boundaries | Partial (no error.tsx/loading.tsx) | No | ADD | openCRM has no error/loading/not-found pages (P0 gap). Add per Phase 16. |
| UI/UX | Input OTP component | Yes (input-otp) | No | ADD | openCRM has no OTP input. Add per auth phase. |
| UI/UX | Spreadsheet (import/export) | Yes (exceljs, papaparse) | Partial (csv.ts, import via pg-boss) | MERGE | Merge: keep openCRM's CSV pipeline; add exceljs for Excel export. |
| UI/UX | HTML sanitization | Yes (sanitize-html) | No | ADD | openCRM has no HTML sanitization. Add per Phase 3 (rich text). |
| UI/UX | Chart library | Yes (Tremor + Recharts) | Yes (recharts) | KEEP | Both use Recharts. openCRM's is sufficient. |
| UI/UX | PDF rendering (client) | Yes (@react-pdf/renderer for invoices) | No | ADD | openCRM has no client PDF rendering. Add per invoicing phase. |
| UI/UX | Document viewer | Yes (react-doc-viewer) | No | ADD | openCRM has no document viewer. Add per Phase 7. |
| UI/UX | Resizable panels | Yes (react-resizable-panels) | No | ADD | openCRM has no resizable panels. Add. |
| UI/UX | Autocomplete / search select | Yes (cmdk for command palette) | No | ADD | openCRM has no autocomplete. Add. |

## 16. API

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| API | API routes | Yes (app/api/ — auth, mcp, inngest, invoices/pdf, admin, campaigns, crm, upload, og) | Yes (src/app/api/ — auth, files, search, notifications, fields) | MERGE | Merge openCRM's API routes with NextCRM's expanded set. |
| API | Versioned API (v1) | No | No | ADD | Neither has versioned API. Add /api/v1/ per Phase 14 (integration hub). |
| API | Server Actions (mutations) | Yes (use server + Zod via createSafeAction) | Yes (use server + Zod) | KEEP | Both use Server Actions with Zod. Equivalent pattern. |
| API | Safe action wrapper | Yes (createSafeAction.ts — Zod-validated server action wrapper) | Partial (manual Zod in individual actions) | ADAPT | openCRM uses inline Zod schemas. Adopt NextCRM's createSafeAction wrapper for consistency. |
| API | Decimal serialization | Yes (serializeDecimals.ts — Decimal → Number for React boundary) | No | ADD | openCRM has no decimal serialization. Needed when adding invoicing/multi-currency (Phase 7). |
| API | Zod validation | Yes (extensive) | Yes (extensive) | KEEP | Both use Zod. Equivalent. |
| API | Error handling | Yes (unauthorizedResponse/forbiddenResponse/notFoundOrForbiddenResponse) | Partial (basic error handling) | ADAPT | openCRM has basic error handling. Adopt NextCRM's authz error helpers. |
| API | Inngest webhook receiver | Yes (app/api/inngest/route.ts) | No | ADD | openCRM uses pg-boss directly. If Inngest is adopted for AI jobs, add receiver. |
| API | PDF export endpoint | Yes (app/api/invoices/[invoiceId]/pdf/route.ts) | No | ADD | openCRM has no PDF export. Add per invoicing. |
| API | Presigned URL upload | Yes (app/api/upload/presigned-url/route.ts) | Yes (app/api/files/upload/route.ts multipart) | ADAPT | Adopt NextCRM's presigned PUT approach for scalability. |
| API | Open Graph image endpoint | Yes (app/api/og) | No | ADD | openCRM has no OG image generation. Add. |
| API | Health check endpoint | No | No | ADD | Neither has health endpoint. Add per Phase 15. |
| API | Search endpoint | Yes (fulltext-search routes) | Yes (/api/search/global) | MERGE | Merge into unified search API per Phase 9. |

## 17. Database

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Database | PostgreSQL | Yes (PostgreSQL 17+) | Yes (PostgreSQL) | KEEP | Both use PostgreSQL. openCRM's version is sufficient. |
| Database | Prisma ORM | Yes (Prisma 7.6, @prisma/adapter-pg, native pg pool) | Yes (Prisma 7.10, @prisma/adapter-pg) | KEEP | openCRM uses newer Prisma (7.10 > 7.6). Keep openCRM's version. |
| Database | pgvector | Yes (vector(1536) embeddings, HNSW indexes) | No | ADD | openCRM has no pgvector extension. Add per Phase 11 for AI embeddings. |
| Database | Schema design (typed tables) | Yes (60+ typed Prisma models, EAV-free) | Yes (EAV: Record + FieldData, ~60 models) | MERGE | NextCRM uses typed tables; openCRM uses EAV. Merge: keep EAV for custom objects, add typed tables for standard CRM objects (Accounts, Contacts, Invoices, etc.). |
| Database | Schema design (EAV) | No (typed tables) | Yes (ObjectDefinition, FieldDefinition, FieldData) | KEEP | openCRM's EAV is a key strength. Preserve as the metadata engine. |
| Database | Migrations | Yes (prisma migrate deploy in Docker entrypoint) | Yes (4 migrations, prisma db push) | ADAPT | openCRM uses db push (no formal migrations). Adopt NextCRM's `prisma migrate deploy` workflow. |
| Database | Connection pooling | Yes (pg.Pool singleton, lib/prisma.ts) | Yes (Prisma client singleton, lib/db.ts) | KEEP | Both have singleton patterns. Equivalent. |
| Database | Transaction handling | Yes (db.$transaction in all mutations) | Yes (db.$transaction in all mutations) | KEEP | Both use transactions. Equivalent. |
| Database | UUID v4 primary keys | Yes (default(uuid()), @db.Uuid) | No (autoincrement Int) | ADAPT | openCRM uses autoincrement; NextCRM uses UUID. Consider for new tables, but openCRM's Int PK is fine for EAV engine. |
| Database | Indexes | Yes (extensive @@index annotations) | Partial (some @@index) | ADAPT | openCRM's Record model has `organizationId + objectDefId + isDeleted` index. Expand indexing per NextCRM's patterns. |
| Database | Soft-delete column | Yes (deletedAt/deletedBy on CRM entities) | Partial (Record.isDeleted) | ADAPT | openCRM's soft-delete is unwired. Wire per Phase 1. Use isDeleted (consistent with EAV) not deletedAt. |
| Database | Dual date fields (migration artifacts) | Yes (createdAt/created_on, typos preserved) | No | REMOVE | NextCRM has migration artifacts from Mongo. openCRM doesn't (cleaner schema). Don't introduce artifacts. |

## 18. Deployment

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Deployment | Docker | Yes (Dockerfile + docker-compose.yml + docker-compose.dev.yml) | Yes (Dockerfile + docker-compose.yml) | KEEP | Both have Docker. openCRM's is multi-stage (node:20-alpine). Equivalent. |
| Deployment | Docker entrypoint | Yes (docker-entrypoint.sh — prisma migrate deploy + conditional seed) | No | ADD | openCRM has no custom entrypoint. Add per NextCRM's pattern. |
| Deployment | Docker services | Yes (app + postgres:17 + minio + inngest) | Yes (db + web + worker) | MERGE | Merge: openCRM's 3-tier (web+worker+db); NextCRM adds minio + inngest. Combine into single compose. |
| Deployment | CI/CD pipeline | Yes (.github/workflows/ — ci.yml, release-please.yml) | No | ADD | openCRM has no CI/CD. Add per Phase 16. |
| Deployment | Environment config | Yes (.env.example, .env.docker) | Yes (.env) | MERGE | Merge env vars from both projects. Adopt NextCRM's comprehensive .env.example. |
| Deployment | Standalone output | Yes (next.config: output: "standalone") | No | ADAPT | openCRM should adopt standalone output per Phase 16. |
| Deployment | Cloudflare edge (open-next) | No | Yes (open-next.config.ts + wrangler.jsonc) | REMOVE | openCRM targets Cloudflare; NextCRM targets Docker. Standardize on Docker per Phase 16. |
| Deployment | Nixpacks config | Yes (nixpacks.toml) | No | ADD | openCRM has no nixpacks. Add for alternative deployment. |
| Deployment | Coolify/Dokku/Portainer | Yes (deployment options documented) | No | ADD | openCRM has deployment guides. Standardize per NextCRM's options. |
| Deployment | Postgres version | Yes (17+ with pgvector) | Yes (PostgreSQL) | ADAPT | openCRM should ensure pgvector extension (add per Phase 15). |
| Deployment | MinIO / S3 | Yes (MinIO in Docker, S3/MinIO storage) | No | ADD | openCRM has no object storage. Add per Phase 7. |
| Deployment | Inngest runner | Yes (Inngest Docker + inngest CLI) | No | ADD | openCRM uses pg-boss worker. Adopt Inngest per Phase 8+ (or keep pg-boss for import + add Inngest for AI). |
| Deployment | Backups | No | No | ADD | Neither has explicit backup strategy. Document per deployment phase. |
| Deployment | Dev compose | Yes (docker-compose.dev.yml) | No | ADD | openCRM has single compose. Split dev/prod per NextCRM's pattern. |
| Deployment | Release management | Yes (release-please + changelog) | No | ADD | openCRM has no release management. Add per Phase 16. |

## 19. Testing

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Testing | Unit testing | Yes (Jest 30, __tests__/ directory) | Yes (Vitest, src/tests/ directory) | ADAPT | Merge: keep Vitest for node/unit tests; adopt openCRM's test structure. Standardize on one framework (Vitest preferred per Phase 16). |
| Testing | Integration testing | Yes (Jest, co-located __tests__/) | Yes (Vitest, mock-based) | KEEP | Both have integration tests. Equivalent. |
| Testing | API route tests | Yes (Jest tests for API routes) | No (P0: no API route tests) | ADD | openCRM has no API route tests. Add per Phase 16. |
| Testing | E2E testing | Yes (Playwright 1.58, tests/ directory) | No (P0-16: no E2E) | ADD | openCRM has no E2E. Add Playwright per Phase 16. |
| Testing | Client component tests | Yes (Jest with jsdom-like setup) | No (only node project, excludes src/app/**) | ADD | openCRM has no client component tests. Add jsdom project per Phase 16. |
| Testing | Admin action tests | Yes (Jest coverage for admin actions) | No (P0: no admin action tests) | ADD | openCRM has no admin action tests. Add per Phase 16. |
| Testing | Worker/job tests | Yes (Jest for Inngest functions) | No (no worker tests) | ADD | openCRM has no background job tests. Add per Phase 16. |
| Testing | Security tests | Yes (extensive scope/authz tests, org-isolation) | Yes (org-isolation, middleware, auth-context) | MERGE | Merge: keep openCRM's security tests; adopt NextCRM's scope-test-first pattern for all new authz. |
| Testing | Auth tests | Yes (dev OTP endpoint for E2E login, authz scope tests) | Yes (auth-context.test.ts, middleware.test.ts) | MERGE | Merge openCRM's auth-context tests with NextCRM's OTP-based E2E login testing. |
| Testing | Scope/authorization tests | Yes (per-entity scope tests in actions/__tests__/) | Partial (org-isolation, record-access) | ADAPT | openCRM has basic record-access tests. Expand to per-object scope tests per NextCRM's pattern. |
| Testing | E2B mock | Yes (__mocks__/e2b.ts for Jest) | No | ADD | openCRM has no E2B mock. Add when AI features are implemented (Phase 11). |
| Testing | Test factories | No | Yes (tests/utils/factories.ts) | KEEP | openCRM's test factories are well-structured. Preserve. |
| Testing | Prisma mock | No | Yes (tests/utils/prisma-mock.ts) | KEEP | openCRM's Prisma mock pattern. Preserve. |
| Testing | Test framework choice | Jest 30 | Vitest | ADAPT | Standardize on Vitest (lighter, faster) per Phase 16. Adopt NextCRM's test coverage patterns. |
| Testing | Test coverage (count) | ~300+ tests across __tests__/ | 104 tests, 18 files | ADAPT | Expand openCRM's test coverage to match NextCRM's breadth per Phase 16. |

## 20. Security

| Feature/Module Category | Feature Name | NextCRM Status | OpenCRM Status | Migration Decision | Notes |
|------------------------|-------------|---------------|---------------|-------------------|-------|
| Security | CSRF protection | Partial (SameSite=Lax default, no explicit CSRF tokens on server actions) | Partial (origin/referer validation on mutating API requests) | MERGE | openCRM's origin/referer validation is stronger. Merge: keep openCRM's origin/referer check + adopt NextCRM's SameSite hardening. |
| Security | SameSite cookie | Partial (BetterAuth default) | Partial (BetterAuth JWT default) | ADAPT | openCRM's middleware checks origin/referer. Ensure SameSite is explicitly set per NextCRM's hardening. |
| Security | XSS prevention | Partial (sanitize-html library) | No | ADD | openCRM has no XSS sanitization. Add sanitize-html for rich text content. |
| Security | SQL injection | Yes (Prisma ORM parameterized queries) | Yes (Prisma ORM + parameterized raw SQL) | KEEP | Both use Prisma ORM. Equivalent protection. |
| Security | Rate limiting | Yes (Upstash Redis + @upstash/ratelimit, app-wide) | Partial (in-memory + Redis-backed store, auth-only) | MERGE | openCRM has auth rate limiting (20/60s); NextCRM has Redis rate limiting. Merge: expand openCRM's to use Redis-backed store (already exists but unused — wire it up). |
| Security | Password hashing | Yes (BetterAuth bcrypt via admin plugin) | Yes (bcryptjs cost 12, BCRYPT_COST constant) | KEEP | Both use bcrypt cost 12. Equivalent. |
| Security | API key encryption | Yes (AES-256-GCM, lib/email-crypto.ts, 3-tier resolution) | No | ADD | openCRM has no encrypted secret storage. Add AES-256-GCM per Phase 8/14. |
| Security | Email password encryption | Yes (AES-256-GCM for EmailAccount.passwordEncrypted) | No | ADD | openCRM has no email password storage. Add per email provider phase. |
| Security | Secrets management | Partial (ENV vars + systemServices table) | Partial (JWT_SECRET env, env vars in .env) | ADAPT | openCRM relies on env vars. Adopt NextCRM's 3-tier resolution (ENV → system DB → user DB). |
| Security | Token hashing | Yes (SHA-256 for API tokens) | No | ADD | openCRM has no token hashing. Add per Phase 14. |
| Security | Security headers | Yes (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, HSTS) | Partial (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, HSTS added post-audit) | KEEP | openCRM has comprehensive headers (post-audit fixes applied). Keep as-is. |
| Security | JWT secret validation | Yes (startup check throws in production) | Yes (startup check throws in production) | KEEP | Both validate JWT secret at startup. Equivalent. |
| Security | User object write protection | Yes (sanitizeUserObjectPermissions strips write flags) | Yes (sanitizeUserObjectPermissions in permission-actions.ts) | KEEP | Both protect user object from write permissions. Equivalent. |
| Security | Existence leak prevention | Yes (assertScopeOrNotFound → NOT_FOUND) | Yes (getRecord returns NOT_FOUND) | KEEP | Both prevent existence oracle. Equivalent. |
| Security | Path traversal protection | Yes (resolveStoragePath validates paths) | Yes (resolveStoragePath in file-storage.ts) | KEEP | Both have path traversal guards. Equivalent. |
| Security | CSV formula injection | Yes (sanitizeCsvFormula neutralizes = + - @) | Yes (sanitizeCsvFormula in csv.ts) | KEEP | Both mitigate CSV formula injection. Equivalent. |
| Security | Admin route protection | Yes (requireAdmin / requireOwnerOrAdmin guards) | Yes (middleware redirect + getUserContext in admin actions) | MERGE | NextCRM uses centralized guards; openCRM uses middleware + duplicated checks. Merge: centralize admin guards (removes duplication). |
| Security | Input validation | Yes (Zod schemas via createSafeAction) | Yes (Zod schemas in record-validation.ts) | KEEP | Both use Zod. Equivalent. |
| Security | Record access filter (Prisma + SQL) | Yes (scope asserts + ReadScopeWhere) | Yes (buildRecordAccessFilter + buildRecordAccessSql) | KEEP | Both have dual Prisma + SQL access filters. Equivalent approaches. |
| Security | Rate limiting scope | App-wide (all endpoints) | Auth-only (20 req/60s on /api/auth/*) | ADAPT | openCRM only rate-limits auth. Expand to all endpoints per Phase 15. |
| Security | IncludeDeleted bypass | Yes (gated on viewAll/modifyAll) | Yes (fixed post-audit, gated on canViewAll) | KEEP | Both gate includeDeleted on viewAll. Equivalent. |

---

## 21. Critical Gaps

The following table consolidates the critical architectural divergences
identified in the latest audit. These are **not feature gaps** — they are
fundamental design paradigm differences that define the migration's highest-risk
integration points.

| # | Gap | NextCRM (reference) | openCRM (current) | Migration Strategy |
|---|-----|---------------------|-------------------|--------------------|
| CG-01 | **No multi-tenancy** | Single-instance. `Users` has no `organizationId`. No `Organization` model. | Full 3-layer multi-tenancy: `Organization` + `User.organizationId` + org-scoped queries + `buildRecordAccessFilter` (org-scoped EXISTS). | **Inject `organizationId` into every NextCRM table.** Update all `lib/authz/scopes/*` helpers with org filter. Every query, test, MCP tool must be org-scoped. Affects ALL phases. |
| CG-02 | **Auth divergence** | Better-Auth OTP-first (email OTP + Google OAuth, no passwords). Auth modules: `lib/auth.ts`, `lib/auth-permissions.ts`, `lib/auth-server.ts`, `lib/auth-guards.ts`, `lib/authz/session.ts`, `lib/authz/route.ts`, `lib/auth-client.ts`. | Better-Auth 1.7.x + NextAuth.js v5 (bcrypt cost 12, username plugin, email OTP, Google OAuth, JWT sessions). | **Converge in Phase 2.** Preserve multi-method auth. Standardize on Better-Auth admin plugin + `ac` statements. Align auth module file layout. |
| CG-03 | **EAV vs concrete model** | ~2017-line schema, ~60 typed Prisma models (`crm_Accounts`, `crm_Contacts`, etc.). No EAV. | 1267-line schema, ~47 models. EAV (`Record` + `FieldData`). | **Hybrid model.** EAV for custom objects; typed tables for standard CRM entities. Unified scope helpers across both. |
| CG-04 | **Root-level dirs** | `lib/`, `app/`, `prisma/` at root — NOT `src/`. | `src/` layout (`src/actions/`, `src/lib/`, `src/app/`). | Import path remapping. Adjust aliases when porting code. |

**See also:** `docs/NEXTCRM_AUDIT.md` §11, `docs/OPENCRM_AUDIT.md` §15,
`docs/MIGRATION_PLAN.md` §5 for per-repository gap analyses.

---

## Summary

**Quick reference: Migration decision counts**

| Decision | Count | Description |
|----------|-------|-------------|
| ADD | ~120 | Features in NextCRM not in openCRM — the largest category, covering AI, MCP, Invoicing, Email client, i18n library migration, E2E tests, CI/CD, and many more. |
| KEEP | ~45 | Features equivalent in both projects — core patterns like Prisma, Server Actions, Zod, tsvector search base, soft-delete concept, RBAC, tenant isolation. |
| ADAPT | ~50 | Features in both needing modification — soft-delete wiring, i18n migration, search evolution, storage backend, testing framework alignment, rate limiting expansion. |
| MERGE | ~25 | Features with complementary approaches — RBAC models, record access, EAV + typed tables, job runners, design systems, security patterns. |
| REPLACE | ~10 | Features where openCRM's approach differs fundamentally — i18n library (custom → next-intl), command palette, email provider abstraction. |
| REMOVE | ~8 | Features deprecated or unnecessary — legacy credential fallback, Cloudflare edge config, stray files. |

**Migration phases covered:** Phases 1–16 (per `NEXTCRM_SPECIFICATION.md` and `IMPLEMENTATION_ROADMAP.md`) address nearly all ADD/ADAPT/REPLACE decisions. The 16-phase roadmap is the execution plan for closing the gaps identified in this matrix.

*Document generated from static analysis of `NEXTCRM_AUDIT.md`, `OPENCRM_AUDIT.md`, `P0_AUDIT.md`, `UI_AUTH_I18N_AUDIT.md`, `ARCHITECTURE_AUDIT.md`, `NEXTCRM_SPECIFICATION.md`, `MIGRATION_PLAN.md`, and `IMPLEMENTATION_ROADMAP.md`. Last updated: 2026-09-22.

**Key audit findings:** NextCRM is MIT (C) 2023 Pavel Dovhomilja; openCRM is MIT (C) 2026 Ayas A.Hadi. NextCRM has NO multi-tenancy, uses root-level dirs, has ~2017-line schema with ~60 models. openCRM uses EAV (1267 lines, ~47 models) with full multi-tenant isolation. Auth diverges: NextCRM uses Better-Auth OTP-first; openCRM uses Better-Auth + NextAuth.js v5 with bcrypt. These critical gaps are documented in §21.*
