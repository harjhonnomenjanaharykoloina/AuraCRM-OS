# NextCRM Feature Inventory & Audit

A comprehensive feature-level inventory of the open-source **NextCRM** repository
(`github.com/pdovhomilja/nextcrm-app`). This document maps every module,
capability, and convention to source files so the OpenCRM team can map it onto
its own existing structure.

---

## 1. Project Overview

NextCRM is an open-source, full-stack CRM SaaS built on the Next.js 16 App Router.
It bundles CRM, project management, invoicing, document storage, a built-in
email client (IMAP/SMTP), AI-powered enrichment/vector search, a Model Context
Protocol (MCP) server for AI-agent data access, audit logging, background jobs,
campaign management, and internationalization. It is deployable via Docker Compose
(bundled Postgres + MinIO + Inngest) or self-hosted on Vercel/Cloud.

### Stack

| Layer              | Technology                                                                 |
|--------------------|---------------------------------------------------------------------------|
| Framework          | Next.js 16 (App Router)                                                   |
| Runtime            | Node.js 22+                                                               |
| Language           | TypeScript 5.9                                                            |
| Package Manager    | pnpm 11.20                                                                |
| Database           | PostgreSQL 17+ (with **pgvector** extension)                              |
| ORM                | Prisma 7.6 (`@prisma/adapter-pg`, native `pg` pool)                       |
| Auth               | Better Auth 1.6.x (email OTP + Google OAuth + admin plugin)               |
| Authz              | Custom RBAC (3 roles) + per-object scope helpers in `lib/authz/`          |
| UI                 | React 19, Tailwind CSS v4, shadcn/ui, Radix UI, Lucide, Tremor, PrimeReact|
| i18n               | next-intl (en, cz, de, uk), locale-based routing                           |
| Data Fetching      | Server Actions (`"use server"`), SWR, Axios, TanStack React Table         |
| Background Jobs    | Inngest 4.0                                                               |
| AI / Embeddings    | OpenAI (`text-embedding-3-small`), Anthropic Claude Sonnet 4.6, E2B, Vercel AI SDK 6 |
| MCP Server         | `mcp-handler` — 127 tools across 15 modules, Bearer-token auth              |
| Email              | Resend + React Email 2.x, Mailtrap fallback                               |
| IMAP/SMTP          | `imap`, `nodemailer`, `mailparser`                                         |
| File Storage       | UploadThing + S3 / MinIO (`@aws-sdk/client-s3`)                             |
| Encryption         | AES-256-GCM (email-crypto.ts)                                             |
| Rate Limiting      | Upstash Redis + `@upstash/ratelimit`                                      |
| Testing            | Jest 30 (unit/integration), Playwright 1.58 (E2E)                         |
| Docs / Diagrams    | Mermaid in markdown, JSDoc-heavy libraries                                |
| Deployment         | Docker Compose (standalone output), Dockerfile, Coolify/Dokku/Portainer  |

### Key Dependencies (from `package.json`)

**Auth & Infra:** `better-auth@^1.6`, `prisma@7.6`, `@prisma/adapter-pg`, `@prisma/client@7.6`,
`pg@^8.18`, `@aws-sdk/client-s3`, `mcp-handler@^1.1`, `inngest@^4.0`,
`@modelcontextprotocol/sdk@^1.26`, `@upstash/redis`, `@upstash/ratelimit`.

**AI & Vector:** `openai@^6.25`, `@anthropic-ai/sdk` (via `@openai/agents`/sdk), `e2b@^2.18`,
`ai@^6.1` (Vercel AI SDK), `pgvector` (PostgreSQL extension, not npm).

**Email & Storage:** `resend@6.9`, `@react-email/render@^2.0`, `@react-email/components`,
`react-email` templates, `imap@^0.8`, `nodemailer@^9.0`, `mailparser@^3.9`, `mammoth`,
`pdf-parse@^2.4`, `@react-pdf/renderer@^4.3`, `sharp`.

**UI & Rich Text:** `next-themes`, `tailwindcss@^4.2`, `tailwind-merge`,
`react-hook-form@^7.71`, `@hookform/resolvers`, `zod@^4.4`, `lucide-react@^0.574`,
`@radix-ui/*`, `cmdk`, `vaul`, `react-day-picker`, `react-youtube`, `react-doc-viewer`,
`@tiptap/*` (rich text), `@dnd-kit/*` (boards/tasks drag-drop), `@tanstack/react-table`,
`@tanstack/react-table`, `tremor`, `recharts`, `primereact`, `primeicons`.

**Data & Parsing:** `decimal.js`, `date-fns`, `dayjs`, `exceljs`, `papaparse`,
`sanitize-html`, `xmlbuilder2`, `moment`.

**Dev/Testing:** `jest@^30`, `@types/jest`, `ts-jest`, `@playwright/test@^1.58`,
`@types/*`, `tsx`, `ts-node`, `dotenv`.

---

## 2. Feature Inventory

| # | Module / Feature                | Status     | Key Source Paths                                              | Env / Service Dependencies                     |
|---|---------------------------------|------------|---------------------------------------------------------------|------------------------------------------------|
| 1 | Authentication (Email OTP)      | Core       | `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, `app/[locale]/(auth)/sign-in/` | BETTER_AUTH_SECRET, RESEND_API_KEY             |
| 2 | OAuth (Google)                  | Core       | `lib/auth.ts` (socialProviders.google)                        | GOOGLE_ID, GOOGLE_SECRET                       |
| 3 | RBAC Authorization (3 roles)    | Core       | `lib/auth-permissions.ts`, `lib/authz/roles.ts`, `lib/authz/session.ts`, `lib/authz/route.ts` | better-auth admin plugin                       |
| 4 | Object-level Scoping            | Core       | `lib/authz/scopes/crm.ts` (scope helpers)                     | prisma                                          |
| 5 | CRM — Accounts                  | Core       | `actions/crm/accounts/`, `prisma/schema.prisma` (`crm_Accounts`) | postgresql                                      |
| 6 | CRM — Contacts                  | Core       | `actions/crm/contacts/`, `crm_Contacts`                       | —                                               |
| 7 | CRM — Leads                     | Core       | `actions/crm/leads/`, `crm_Leads`                             | —                                               |
| 8 | CRM — Opportunities             | Core       | `actions/crm/opportunities/` (get-*), `crm_Opportunities`     | —                                               |
| 9 | CRM — Contracts                 | Core       | `actions/crm/contracts/`, `crm_Contracts`                     | —                                               |
| 10| CRM — Products                  | Core       | `actions/crm/products/`?, `crm_Products`, `crm_ProductCategories` | —                                               |
| 11| CRM — Account Products          | Core       | `actions/crm/account-products/`, `crm_AccountProducts`        | —                                               |
| 12| CRM — Line Items (Opp/Contract) | Core       | `actions/crm/opportunity-line-items/`, `actions/crm/contract-line-items/` | —                                               |
| 13| CRM — Targets                   | Core       | `actions/crm/targets/`, `crm_Targets`, `crm_TargetLists`      | —                                               |
| 14| CRM — Activities                | Core       | `actions/crm/activities/`, `crm_Activities` + `crm_ActivityLinks` (polymorphic) | —                                               |
| 15| CRM — Audit Log / History       | Core       | `lib/audit-log.ts`, `actions/crm/audit-log/`, `crm_AuditLog`, `components/crm/audit-log/` | —                                               |
| 16| CRM — Soft Delete               | Core       | All CRM models (`deletedAt`/`deletedBy`), `lib/crm/recycle.ts` | —                                               |
| 17| CRM — Case Study Pipeline       | Core       | `actions/crm/accounts/case-study.ts`, `crm_Accounts.case_study_*` | —                                               |
| 18| CRM — Funnel / Automation       | Core       | `lib/crm/funnel-timers.ts`, `lib/crm/funnel-settings.ts`, `lib/crm/stage-transition.ts`, `inngest/functions/crm/*` | inngest                                         |
| 19| CRM — Approval Gate (CSO)       | Core       | `lib/crm/approval-gate.ts` (opportunities)                    | —                                               |
| 20| CRM — Auto Tasks                | Core       | `lib/crm/auto-task.ts`                                        | inngest (care/cadence tasks)                    |
| 21| CRM — Calendar Sync             | Core       | `lib/crm/calendar/*`, `app/api/crm/calendar/webhooks/calendly/`, `app/api/profile/calendar-connections/google/*` | GOOGLE_CALENDAR_CLIENT_ID/SECRET, Calendly       |
| 22| CRM — Client Activity           | Core       | `lib/crm/client-activity.ts`                                  | email sync                                      |
| 23| CRM — Recycling / Restore       | Core       | `lib/crm/recycle.ts`, `actions/crm/accounts/restore-account.ts` | —                                               |
| 24| Projects — Boards               | Core       | `app/[locale]/(routes)/projects/boards/`, `Boards`, `Sections` | —                                               |
| 25| Projects — Tasks                | Core       | `app/[locale]/(routes)/projects/tasks/`, `Tasks`, `crm_Accounts_Tasks` | —                                               |
| 26| Projects — Comments             | Core       | `tasksComments` model, comments components                    | —                                               |
| 27| Projects — Documents            | Core       | `DocumentsToTasks`, `DocumentsToCrmAccountsTasks`             | uploadthing/s3                                  |
| 28| Projects — Watch                | Core       | `BoardWatchers` junction                                        | —                                               |
| 29| Projects — Dashboard            | Core       | `app/[locale]/(routes)/projects/dashboard/`                   | —                                               |
| 30| Invoices Module                 | Core       | `app/[locale]/(routes)/invoices/`, `lib/invoices/*`, `actions/invoices*`?, `Invoices` model | resend, @react-pdf/renderer                    |
| 31| Invoices — Series               | Core       | `lib/invoices/numbering.ts`, `Invoice_Series`                  | —                                               |
| 32| Invoices — Tax Engine           | Core       | `Invoice_TaxRates`, `lib/invoices/pdf/i18n.ts`                 | —                                               |
| 33| Invoices — Multi-currency + FX  | Core       | `lib/invoices/fx.ts`, `Currency`, `ExchangeRate`, ECB sync     | ECB feed (external)                             |
| 34| Invoices — Payments             | Core       | `Invoice_Payments`, payments UI                                 | —                                               |
| 35| Invoices — PDF Export           | Core       | `lib/invoices/pdf/render.tsx`, `lib/invoices/pdf/templates/*`, `app/api/invoices/[invoiceId]/pdf/route.ts` | —                                               |
| 36| Invoices — Email Delivery       | Core       | `emails/` (React Email templates), resend helper              | RESEND_API_KEY                                  |
| 37| Invoices — Admin Settings       | Core       | `app/[locale]/(routes)/admin/invoices/`, `app/api/admin/invoices/*` | —                                               |
| 38| Invoices — Activity Log         | Core       | `Invoice_Activity` model                                      | —                                               |
| 39| Documents — Storage             | Core       | `lib/minio.ts`, `app/api/upload/presigned-url/route.ts`, `Documents` model | MINIO_*, S3                                     |
| 40| Documents — Versioning          | Core       | `Documents.parent_document_id` / `child_versions`             | —                                               |
| 41| Documents — Enrichment          | Core       | `inngest/functions/documents/`, `crm_Document_Chunks`          | openai, sharp                                   |
| 42| Documents — Linking             | Core       | `DocumentsTo*` junction tables, `lib/junction-helpers.ts`      | —                                               |
| 43| Email Client (IMAP)             | Core       | `lib/email/imap-safety.ts`, `inngest/functions/emails/sync-*`, `EmailAccount`, `Email` | IMAP_*, SMTP_*                                  |
| 44| Email Client (SMTP)             | Core       | `lib/sendmail.ts` (nodemailer)                                 | SMTP_* / EMAIL_* (legacy sendmail)              |
| 45| Email — Linking to CRM          | Core       | `inngest/functions/emails/link-crm.ts`, `EmailsToContacts`, `EmailsToAccounts` | —                                               |
| 46| Email — Embedding (semantic)    | Core       | `EmailEmbedding`, `inngest/functions/emails/embed-email.ts`    | openai                                          |
| 47| AI — Vector Embeddings            | Core       | `inngest/functions/embed-*.ts`, `crm_Embeddings_*`, `lib/openai.ts` | OPENAI_API_KEY, pgvector                        |
| 48| AI — Unified Search (keyword+semantic) | Core   | `components/fulltext-search/*`, `app/[locale]/(routes)/fulltext-search/` | postgres fulltext, pgvector                     |
| 49| AI — Find Similar               | Core       | `components/crm/find-similar-button.tsx`, `components/crm/similar-records-drawer.tsx` | openai, pgvector                               |
| 50| AI — Enrichment (E2B agent)     | Core       | `lib/enrichment/e2b/*`, `lib/enrichment/strategies/*`, `lib/enrichment/agent-architecture/*`, `inngest/functions/enrich-*` | E2B_API_KEY, ANTHROPIC_API_KEY                  |
| 51| AI — Key Management (3-tier)    | Core       | `lib/api-keys.ts`, `app/[locale]/(routes)/admin/llm-keys/`, `app/[locale]/(routes)/profile?tab=llms`, `email-crypto.ts` | AES key                                         |
| 52| AI — Project Assistant (GPT)    | Future/P4  | `openai.ts`, `ai` (Vercel SDK)                                 | OPENAI_API_KEY                                  |
| 53| MCP Server                      | Core       | `app/api/mcp/[transport]/route.ts`, `lib/mcp/*`                | —                                               |
| 54| MCP — Bearer Token Auth         | Core       | `lib/mcp/auth.ts`, `lib/api-tokens.ts`, `ApiToken`             | —                                               |
| 55| Reports & Dashboards            | Core       | `app/[locale]/(routes)/reports/`, `crm_Report_Config`, `crm_Report_Schedule`, `components/reports/*` | resend (scheduled), tremor                    |
| 56| Campaigns                       | Core       | `app/[locale]/(routes)/campaigns/`, `actions/campaigns/`, `crm_campaigns*` models, `lib/campaigns/*` | resend, resend webhook                          |
| 57| Campaigns — Templates           | Core       | `crm_campaign_templates`, `crm_campaign_steps`, merge-tags    | —                                               |
| 58| Campaigns — Send/Pause/Resume   | Core       | `inngest/functions/campaigns/*`, `crm_campaign_sends`          | inngest, resend                                  |
| 59| Campaigns — Unsubscribe         | Core       | `app/api/campaigns/unsubscribe/route.ts`                        | —                                               |
| 60| Campaigns — Resend Webhooks     | Core       | `app/api/campaigns/webhooks/resend/route.ts`                   | RESEND_WEBHOOK_SECRET                            |
| 61| Internationalization (i18n)     | Core       | `i18n/request.ts`, `i18n/routing.ts`, `locales/*.json`         | next-intl                                       |
| 62| Currency Switcher               | Core       | `components/CurrencySwitcher.tsx`, `context/currency-context.tsx` | —                                               |
| 63| User Profile                    | Core       | `app/[locale]/(routes)/profile/page.tsx`                       | —                                               |
| 64| Admin Panel                     | Core       | `app/[locale]/(routes)/admin/`                                 | —                                               |
| 65| Admin — User Management         | Core       | `actions/admin/users/*`, `app/[locale]/(routes)/admin/users/`  | —                                               |
| 66| Admin — Email Broadcast         | Core       | `actions/admin/send-mail-to-all/`, `app/[locale]/(routes)/admin/users/components/send-mail-to-all.tsx` | resend                                    |
| 67| Admin — System Services         | Core       | `systemServices` model, `app/[locale]/(routes)/admin/services/` | —                                               |
| 68| Admin — Resend Key Config       | Core       | `actions/admin/system/set-resend-key.ts`, `ResendCard.tsx`     | RESEND_API_KEY                                  |
| 69| Employees Module                | Core       | `Employees` model, `app/[locale]/(routes)/employees/`         | —                                               |
| 70| Databox / Analytics             | Core       | `app/[locale]/(routes)/databox/page.tsx`                        | —                                               |
| 71| Testing — Jest                  | Core       | `__tests__/`, `jest.config.ts`, `jest.env.setup.ts`             | jest                                              |
| 72| Testing — Playwright (E2E)      | Core       | `tests/`, `playwright.config.ts`                               | @playwright/test                                |
| 73| Docker / Deployment             | Core       | `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `.env.docker`, `docker-entrypoint.sh`, `nixpacks.toml` | postgres:17, minio, inngest                  |

---

## 3. Architecture Details

### 3.1 Routing & Layout

The app router is **locale-aware** — every UI route is prefixed with `/[locale]/`:

```
app/
├── [locale]/
│   ├── globals.css
│   ├── layout.tsx                         # Root layout: i18n provider, theme, toaster
│   ├── (auth)/
│   │   ├── layout.tsx                     # Centered auth shell, GitHub stars, footer
│   │   ├── pending/page.tsx               # PENDING-status interstitial
│   │   ├── inactive/page.tsx              # INACTIVE-status interstitial
│   │   └── sign-in/
│   │       └── components/LoginComponent.tsx
│   ├── (routes)/
│   │   ├── layout.tsx                     # App layout: session guard, sidebar, header, footer, currency/avatar providers
│   │   ├── components/                    # Header, Footer, AppSidebar, FulltextSearch
│   │   ├── crm/...                        # CRM module pages
│   │   ├── campaigns/...
│   │   ├── invoices/...
│   │   ├── projects/...
│   │   ├── documents/...
│   │   ├── emails/...
│   │   ├── reports/...
│   │   ├── profile/...
│   │   └── admin/...
├── api/
│   ├── auth/[...all]/route.ts             # Better Auth handler
│   ├── auth/test-otp/route.ts             # Dev-only OTP retrieval (non-prod)
│   ├── mcp/[transport]/route.ts           # MCP server (streamable HTTP + SSE)
│   ├── inngest/route.ts                   # Inngest webhook receiver
│   ├── invoices/[invoiceId]/pdf/route.ts  # PDF export endpoint
│   ├── admin/invoices/series|tax-rates/...
│   ├── campaigns/...                      # enrichment, unsubscribe, resend webhook
│   ├── crm/...                            # contacts, targets, leads, calendar
│   ├── profile/calendar-connections/google/...
│   ├── reports/export
│   ├── upload/presigned-url
│   └── og                                 # Open Graph image
```

**Redirects** (`next.config.js`):
- `/crm/targets/*` → `/campaigns/targets/*` (301)
- `/crm/target-lists/*` → `/campaigns/target-lists/*` (301)

### 3.2 Data Layer

**Prisma client** (`lib/prisma.ts`):
- Uses `@prisma/adapter-pg` with a native `pg.Pool` connection pool.
- Singleton in production (`prismaClientSingleton()`); global-cached in dev.
- Logs `error`/`warn` in dev, only `error` in prod.
- Graceful shutdown hooks (`beforeExit`, `SIGINT`, `SIGTERM`).

**Decimal serialization** (`lib/serialize-decimals.ts`) — mandated by `AGENTS.md`:
- Prisma returns `Decimal` objects that are **not serializable** across the React Server Action boundary.
- `serializeDecimals(obj)` / `serializeDecimalsList(list)` convert Decimal → Number before returning from server actions or passing to client components. Failing to do so causes silent failures, `undefined` returns, and hydration mismatches.

### 3.3 Server Actions (mutations)

All create/update/delete operations use **Next.js Server Actions** (`"use server"`) with **Zod** validation via `createSafeAction` (`lib/create-safe-action.ts`). The pattern:

```
actions/<module>/<entity>/<action>.ts         # the action (schema + handler)
actions/<module>/<entity>/<action>/schema.ts  # zod schema
actions/<module>/<entity>/<action>/types.ts   # inferred types
actions/<module>/<entity>/__tests__/*         # scope/authorization tests
```

Every mutation calls a scope assert helper from `lib/authz/scopes/crm.ts` (e.g. `assertCanWriteAccount`, `assertCanWriteOpportunity`) and writes an audit log entry via `lib/audit-log.ts#writeAuditLog`.

### 3.4 Server Actions vs API Routes

| Concern                  | Mechanism        | Location                                   |
|--------------------------|------------------|--------------------------------------------|
| UI data fetching (lists) | Server Components + SWR | `hooks/use-action.ts`, `lib/fetcher.ts` |
| Mutations (CRUD)         | Server Actions   | `actions/` tree                            |
| Bulk/external access     | API Routes       | `app/api/`                                 |
| MCP tool access          | API Routes       | `app/api/mcp/[transport]/route.ts`         |
| Inngest webhooks         | API Routes       | `app/api/inngest/route.ts`                 |
| File uploads             | API Routes       | `app/api/upload/presigned-url/route.ts`    |
| PDF export               | API Routes       | `app/api/invoices/[id]/pdf/route.ts`       |

### 3.5 Background Jobs (Inngest)

`inngest/client.ts` constructs an `Inngest` client from `INNGEST_ID`, `INNGEST_APP_NAME`,
`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. Function registry lives in
`inngest/functions/`. The webhook receiver is `app/api/inngest/route.ts`.

**Function catalog:**

| Category        | Functions                                                                 |
|-----------------|---------------------------------------------------------------------------|
| Embeddings      | `embed-account`, `embed-contact`, `embed-lead`, `embed-opportunity`, `embed-backfill` |
| Enrichment      | `enrich-contact`, `enrich-target`, `enrich-target-contact`, `enrich-contacts-bulk`, `enrich-targets-bulk` |
| Emails          | `sync-all`, `sync-account`, `embed-email`, `link-crm`                     |
| Documents       | `enrich-document`, `generate-thumbnail`                                   |
| Campaigns       | `send-now`, `send-step`, `schedule-send`, `process-follow-up`             |
| CRM automation    | `care-tasks`, `kill-rule`, `qualified-cadence`, `recycle-targets`, `renewal-reminders` |
| Reports         | `send-scheduled`                                                          |
| Exchange rates  | `ecb/sync-exchange-rates`                                                 |
| Calendar        | `google-sync-all`, `google-sync-connection`, `outbound-sync`, `process-event` |

### 3.6 State Management & Hooks

| Hook                  | File                | Purpose                                         |
|-----------------------|---------------------|-------------------------------------------------|
| `useAction`            | `hooks/use-action.ts` | Wraps server actions with loading/error state   |
| `useCurrency`          | `context/currency-context.tsx` | Currency selection + cookie persistence   |
| `useAvatarContext`     | `context/avatar-context.tsx`   | Avatar URL management                       |
| `useDebounce`          | `hooks/useDebounce.tsx`       | Debounced value hook                          |
| `useToast`             | `hooks/use-toast.ts`          | Toast notifications                           |
| `useMobile`            | `hooks/use-mobile.tsx`        | Mobile breakpoint detection                   |
| SWR (data fetching)    | `lib/fetcher.ts`              | Remote data fetching with revalidation        |

Global state uses **Jotai** (`jotai@^2.18`) for cross-component state.

### 3.7 File Upload & Storage

- **`lib/minio.ts`**: Configures an `@aws-sdk/client-s3` `S3Client` pointed at S3-compatible storage (MinIO in Docker). Reads `MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET`. `forcePathStyle: true` required for MinIO.
- **`app/api/upload/presigned-url/route.ts`**: Issues presigned PUT URLs for direct-to-storage browser uploads.
- Documents also support **UploadThing** (mentioned in README) as an alternative provider.
- Public URL prefix: `NEXT_PUBLIC_MINIO_ENDPOINT`.

---

## 4. Security Model

### 4.1 Authentication

| Aspect               | Detail                                                                 |
|----------------------|------------------------------------------------------------------------|
| Framework            | Better Auth 1.6.x                                                      |
| Primary method       | **Passwordless Email OTP** (6-digit code, 5-min expiry)                |
| OAuth                | Google (`socialProviders.google`)                                       |
| Password auth        | **Disabled** (`emailAndPassword.enabled: false`)                        |
| Provider             | Better Auth admin plugin (`adminPlugin`) with `ac` access control      |
| User model           | `Users` table; maps `createdAt→created_on`, `updatedAt→updated_at`     |
| User fields          | `role` (AppRole), `userStatus` (PENDING/ACTIVE/INACTIVE), `userLanguage`, `avatar` |
| Session              | 7-day expiry, refreshed every 24 h                                     |
| First-user bootstrap    | The very first user created is auto-promoted to `admin` + `ACTIVE`    |
| Pending/Inactive users | Redirected to `/pending` or `/inactive` interstitial pages            |
| Dev OTP capture      | `testUtils({ captureOTP: true })` plugin in non-production; `/api/auth/test-otp` retrieves it (404 in prod) |
| Email delivery       | Resend (via `lib/resend.ts`); falls back to DB key if env not set      |

**Source:** `lib/auth.ts:1` — `betterAuth({...})` config; `lib/auth-client.ts` — React client with `emailOTPClient()` + `adminClient()`; `app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)`; `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx` — two-step email→OTP + Google OAuth UI.

### 4.2 Authorization (RBAC + Object-level Scoping)

**Two layers:**

1. **Role-based (Better Auth access control)** — defined in `lib/auth-permissions.ts`:
   - Statements: `user` (create/read/update/delete/activate/deactivate),
     `crm` (CRUD), `project` (CRUD), `report` (read/export), `settings` (read/update).
   - **admin**: all permissions across all statements.
   - **manager**: `user→read` only; `crm→CRUD`; `project→CRUD`; `report→read/export`; `settings→read`.
   - **user**: `user→read`; `crm→read`; `project→read`; `report→read`; `settings→read`.
   - Roles enforced via Better Auth `adminPlugin({ ac, roles: { admin, manager, user }, defaultRole: "user" })`.

2. **Object-level scoping** — `lib/authz/scopes/crm.ts` (the heart of authorization).
   Every read/write path resolves a Prisma `where` clause based on `user.role`
   plus **ownership columns** and **linked-entity graph traversal**. Pattern:

   - **admin / manager**: no ownership filter (`{ deletedAt: null }`); full access.
   - **user**: scoped to `OR: [assigned_to, createdBy, linked-account ownership, watchers, visibility="public"]`.

   | Entity           | Ownership columns used for `user` scope                                          |
   |------------------|----------------------------------------------------------------------------------|
   | Accounts         | `assigned_to`, `createdBy`, `watchers` (AccountWatchers junction)                |
   | Contacts         | `assigned_to`, `createdBy`, + account via `assigned_accounts` (nested)           |
   | Leads            | `assigned_to`, `createdBy`, + account via `assigned_accounts` (nested)           |
   | Opportunities    | `assigned_to`, `createdBy`, + account via `assigned_account` (nested)            |
   | Contracts        | `assigned_to`, `createdBy`, + account via `assigned_account` (nested)            |
   | Targets          | `created_by` only (no assignee column)                                           |
   | Target Lists     | `created_by` only                                                                |
   | Documents        | `created_by_user`/`createdBy`, `assigned_user`, `visibility=public`, + all linked entities |
   | Campaigns        | `created_by` (soft-delete via `status="deleted"`)                                |
   | Campaign templates | `created_by` (`deletedAt`)                                                     |
   | Boards           | `user` (owner) + `sharedWith[]` + `visibility=public` + `watchers` (BoardWatchers) |
   | Tasks (Projects) | parent Board scope via `assigned_section.board_relation`                        |
   | Tasks (CRM)      | `createdBy`, `user` (assignee) (no `deletedAt` — hard delete)                  |
   | Activities       | write = ownership (`createdBy`) or manager/admin. **Email side-effect**: meeting writes push Google Calendar invites |
   | Line items (opp/contract) | parent delegation: resolve parent → `assertCanWriteParent`                  |

   **Key helpers** (all in `lib/authz/scopes/crm.ts`):
   `assertCanReadAccount`, `assertCanWriteAccount`, `assertCanReadContact`, `assertCanWriteContact`,
   `assertCanReadLead/Opportunity/Contract`, `assertCanReadTarget`, `assertCanReadTargetList`,
   `assertCanReadDocument`, `assertCanWriteDocument`, `assertCanReadBoard`, `assertCanWriteBoard`,
   `assertCanReadTask`, `assertCanWriteTask`, `assertCanWriteActivity`,
   `assertCanReadCampaign`, `assertCanWriteCampaign`, `assertCanReadTemplate`, `assertCanWriteTemplate`,
   `filterAuthorized*Ids` (for bulk filtering), `assertCanReadActivityForEntity` (polymorphic dispatch),
   `assertScopeOrNotFound` (converts `AuthorizationError` → `NOT_FOUND` to prevent existence oracle).

   `lib/authz/index.ts` re-exports the public surface. `lib/authz/session.ts` provides
   `requireAuthenticated()` / `requireRole()` / `isAdmin()` / `isManagerOrAdmin()` — all resolve the DB `role` and `mapLegacyRole()`. `lib/authz/route.ts` provides `unauthorizedResponse`/`forbiddenResponse`/`notFoundOrForbiddenResponse` helpers. `lib/authz/errors.ts` defines `AuthenticationError`/`AuthorizationError`.

### 4.3 MCP Token Authentication

- Tokens prefixed `nxtc__`, 24 random bytes (48 hex chars).
- **SHA-256 hashed** before storage (`ApiToken.tokenHash`); raw token shown **only once** at generation.
- `tokenPrefix` (8 chars) stored for display; `tokenHash` for lookup.
- `validateApiToken()` (`lib/api-tokens.ts`): checks `revokedAt`, `expiresAt`, updates `lastUsedAt`.
- 10 active tokens max per user.
- `lib/mcp/auth.ts#getMcpUser()`: resolves Bearer token → userId → DB role (with `mapLegacyRole`).
  Dev fallback to session cookie only in `NODE_ENV=development`.

### 4.4 Encryption at Rest

- **API keys** (`lib/api-keys.ts`): AES-256-GCM via `lib/email-crypto.ts`.
  - `encrypt(plaintext)` → base64(iv + authTag + ciphertext).
  - `decrypt(ciphertext)` reverses.
  - `EMAIL_ENCRYPTION_KEY` env var must be a 64-char hex string (32 bytes).
- **Email account passwords** (`EmailAccount.passwordEncrypted`): same AES-256-GCM path; OAuth2 uses encrypted refresh tokens.

### 4.5 3-Tier API Key Resolution

`lib/api-keys.ts#getApiKey(provider, userId)`:
1. ENV var (`OPENAI_API_KEY`, `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`)
2. System-wide DB key (`ApiKeys` scope=SYSTEM)
3. User's personal key (`ApiKeys` scope=USER)

Admin panel: `/admin/llm-keys` sets system-wide encrypted keys. Profile: `/profile?tab=llms` sets user keys. Graceful degradation when none available.

---

## 5. Database Schema Overview

PostgreSQL 17+ with the **pgvector** extension. Prisma schema at `prisma/schema.prisma`.
Models use explicit `@@index` annotations extensively (by `createdAt`, `deletedAt`, `assigned_to`, `status`, etc.).

### 5.1 Auth / System Models

| Model             | Purpose                                                       |
|-------------------|---------------------------------------------------------------|
| `Users`           | Better Auth user (role, status, language, avatar, banned)    |
| `Session`         | Better Auth sessions                                          |
| `Account`         | Better Auth OAuth account linking                              |
| `Verification`    | Better Auth OTP verification records                          |
| `ApiToken`        | MCP Bearer tokens (hashed)                                    |
| `ApiKeys`         | Encrypted OpenAI/Anthropic/Firecrawl/Groq keys (SYSTEM/USER)  |
| `systemServices`  | Stored third-party service config (e.g. resend_smtp key)      |

### 5.2 CRM Models

| Model                          | Key columns                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| `crm_Accounts`                 | name, billing/shipping address, email, website, phone, status, type, industry (FK→`crm_Industry_Type`), case_study_candidate/approved, assigned_to, watchers, embedding, deletedAt |
| `crm_Contacts`                 | first_name, last_name, email, phones, social links, account (FK), assigned_to, tags[], notes[], embedding, deletedAt |
| `crm_Leads`                    | firstName, lastName, company, jobTitle, lead_source/status/type (FKs→lookup tables), assigned_accounts (FK→Accounts), campaign, embedding, deletedAt |
| `crm_Opportunities`            | account (FK), budget, close_date, sales_stage (FK→`crm_Opportunities_Sales_Stages`), type (FK), approval_status (NONE/PENDING/APPROVED/REJECTED), currency (FK), snapshot_rate, embedding, deletedAt |
| `crm_Contracts`                | title, value, startDate, endDate, renewalReminderDate, account (FK), assigned_to, status (NOTSTARTED/INPROGRESS/SIGNED), currency, lineItems, deletedAt |
| `crm_Products`                 | name, sku, type (PRODUCT/SERVICE), status, unit_price, tax_rate, billing_period, is_recurring, category (FK), currency |
| `crm_ProductCategories`        | name, order, isActive, createdBy                                |
| `crm_AccountProducts`          | account (FK), product (FK), quantity, custom_price, currency, status, start/renewal dates |
| `crm_OpportunityLineItems`     | opportunityId, productId, name, quantity, unit_price, discount_type/value, tax_rate, line_total, currency |
| `crm_ContractLineItems`        | contractId, productId, name, quantity, unit_price, discount, line_total, currency |
| `crm_Targets`                  | first_name, last_name, email, phones, company, social links, do_not_email, tags, notes, created_by, converted_account/contact, deletedAt |
| `crm_TargetLists`              | name, description, status, created_by, deletedAt                |
| `TargetsToTargetLists`         | junction (target_id, target_list_id)                              |
| `crm_Activities`               | type (call/meeting/note/email), title, description, date, duration, outcome, status (scheduled/completed/cancelled), metadata (JSONB) |
| `crm_ActivityLinks`            | **polymorphic junction**: entityType + entityId → Activity       |
| `crm_AuditLog`                 | entityType, entityId, action (enum), changes (JSON diff), userId, createdAt |
| `crm_Embeddings_{Accounts,Contacts,Leads,Opportunities,Documents}` | `vector(1536)` embedding + content_hash + embedded_at (1:1 with entity) |
| `crm_Document_Chunks`          | document_id, chunk_index, chunk_text, embedding (vector)         |
| `crm_Opportunities_Sales_Stages` | name, probability, order, stage_kind (pre_sale/qualified/purchase_order/delivery/care) |
| `crm_Opportunities_Type`       | name, order                                                     |
| `crm_Contact_Types`            | name (unique)                                                   |
| `crm_Lead_Sources/Statuses/Types` | name (unique) each                                             |
| `crm_Industry_Type`            | name, accounts[]                                                 |
| `crm_FunnelSettings`           | Singleton: kill_after_days, recycle_after_days, cadence offsets, care intervals |
| `crm_SystemSettings`           | key/value store (singleton-style)                                |
| `AccountWatchers`              | junction (account_id, user_id)                                   |

### 5.3 Campaign Models

| Model                    | Key columns                                                   |
|--------------------------|---------------------------------------------------------------|
| `crm_campaigns`          | name, description, status (draft/scheduled/sending/sent/paused/deleted), template_id, from_name, reply_to, scheduled_at, sent_at, created_by, target_lists (junction) |
| `crm_campaign_templates` | name, subject_default, content_html, content_json (block editor) |
| `crm_campaign_steps`     | campaign_id, order, template_id, subject, delay_days, send_to (all/non_openers) |
| `CampaignToTargetLists`  | junction (campaign_id, target_list_id)                        |
| `crm_campaign_sends`     | campaign_id, step_id, target_id, email, status (queued/sent/delivered/bounced/failed), resend_message_id, unsubscribe_token (unique UUID), opened/clicked/unsubscribed_at |

### 5.4 Invoice Models

| Model                 | Key columns                                                       |
|-----------------------|-------------------------------------------------------------------|
| `Invoices`            | type (INVOICE/CREDIT_NOTE/PROFORMA), status (DRAFT→ISSUED→PAID/etc.), number, seriesId (FK), accountId, billingSnapshot (JSON), issueDate, taxableSupplyDate, dueDate, currency, baseCurrency, fxRateToBase, subtotal, discountTotal, vatTotal, grandTotal, paidTotal, balanceDue, bank/iban/swift details, originalInvoiceId (credit notes), pdfStorageKey, searchVector (tsvector), lineItems[], payments[], activity[], attachments[] |
| `Invoice_LineItems`   | invoiceId, productId, position, name, quantity, unitPrice, discount_type/value, taxRateId (FK), lineSubtotal, lineVat, lineTotal |
| `Invoice_Payments`    | invoiceId, paidAt, amount, method, reference, note, createdBy    |
| `Invoice_Attachments` | invoiceId, storageKey, filename, mimeType, size, uploadedBy       |
| `Invoice_Activity`    | invoiceId, actorId, action, meta (JSON) — audit trail per invoice |
| `Invoice_TaxRates`    | name, rate, isDefault, active, lineItems[]                        |
| `Invoice_Series`      | name, prefixTemplate, resetPolicy (YEARLY), currentYear, counter, isDefault |
| `Invoice_Settings`    | baseCurrency, defaultSeriesId/TaxRate, defaultDueDays, bank details, company info |

### 5.5 Documents Models

| Model                   | Key columns                                                     |
|-------------------------|-----------------------------------------------------------------|
| `Documents`             | document_name, document_file_url, mimeType, tags (JSONB), visibility, key, size, created_by_user, assigned_user, document_type (FK), content_text, summary, content_hash, thumbnail_url, processing_status (PENDING/PROCESSING/READY/FAILED), version, parent_document_id (versions), deletedAt |
| `Documents_Types`       | name                                                             |
| `DocumentsTo*`          | 6 junction tables (Accounts, Opportunities, Contacts, Tasks, CrmAccountsTasks, Leads) |
| `EmailEmbedding`        | emailId, embedding (vector), contentHash                         |

### 5.6 Email Models

| Model             | Key columns                                                       |
|-------------------|-------------------------------------------------------------------|
| `EmailAccount`    | userId, label, imapHost/Port/Ssl, smtpHost/Port/Ssl, username, passwordEncrypted, isActive, sentFolderName, lastSyncedAt, inboxLastUid, sentLastUid |
| `Email`           | emailAccountId, userId, rfcMessageId, imapUid, folder (INBOX/SENT), subject, from, to/cc/bcc (JSON), bodyText, bodyHtml, sentAt, isRead, isDeleted |
| `EmailsToContacts` | junction (email_id, contact_id)                                   |
| `EmailsToAccounts` | junction (email_id, account_id)                                   |

### 5.7 Projects Models

| Model            | Key columns                                                    |
|------------------|----------------------------------------------------------------|
| `Boards`         | description, favourite, icon, position, title, user, visibility, sharedWith[], createdBy, watchers (BoardWatchers) |
| `Sections`       | board (FK), title, position                                    |
| `Tasks`          | content, title, position, priority, section (FK), tags (JSON), user, taskStatus (ACTIVE/PENDING/COMPLETE), comments[] |
| `tasksComments`  | comment, task (FK), user, assigned_crm_account_task (FK)       |
| `BoardWatchers`  | junction (board_id, user_id)                                    |
| `TodoList`       | title, description, url, user                                  |
| `Employees`      | name, avatar, email, salary, status                            |

### 5.8 Other Models

| Model                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `crm_Report_Config`    | Report definition: name, category, filters (JSON), isShared, createdBy, schedules[] |
| `crm_Report_Schedule`  | cronExpression, recipients (JSON), format (csv/pdf/both), isActive |
| `CalendarConnection`   | Google Calendar OAuth (encrypted tokens, syncToken, scopeLevel, isActive) |
| `crm_CalendarEvents`   | Calendar events linked to CRM activities             |
| `crm_Target_Contact`   | C-level contacts discovered per target (enrichment)   |
| `crm_Contact_Enrichment` / `crm_Target_Enrichment` | Enrichment job records (status, fields, result JSON, error) |
| `ImageUpload`          | Image upload staging                                 |

### 5.9 Enums

`AppRole` (user/manager/admin), `ActiveStatus` (ACTIVE/INACTIVE/PENDING), `Language` (cz/en/de/uk),
`crm_Approval_Status` (NONE/PENDING/APPROVED/REJECTED), `crm_Opportunity_Status`, `crm_Contracts_Status`,
`crm_Product_Type`, `crm_Product_Status`, `crm_Billing_Period`, `crm_AccountProduct_Status`, `crm_Discount_Type`,
`crm_Activity_Type` (call/meeting/note/email), `crm_Activity_Status` (scheduled/completed/cancelled),
`crm_Enrichment_Status` (PENDING/RUNNING/COMPLETED/FAILED/SKIPPED), `crm_AuditLog_Action` (created/updated/deleted/restored/relation_added/relation_removed),
`DocumentSystemType`, `DocumentProcessingStatus`, `Invoice_Status`, `Invoice_Type`, `ExchangeRateSource`,
`CalendarProvider` (google), `taskStatus`, `ApiKeyScope` (SYSTEM/USER), `ApiKeyProvider` (OPENAI/FIRECRAWL/ANTHROPIC/GROQ),
`EmailFolder` (INBOX/SENT).

### 5.10 Junction Tables

**10 junction tables** (documented via `lib/junction-helpers.ts`):

| Junction Table              | Sides                                   |
|-----------------------------|-----------------------------------------|
| `DocumentsToAccounts`       | Documents ↔ Accounts                    |
| `DocumentsToOpportunities`  | Documents ↔ Opportunities               |
| `DocumentsToContacts`       | Documents ↔ Contacts                    |
| `DocumentsToTasks`          | Documents ↔ Projects Tasks              |
| `DocumentsToCrmAccountsTasks` | Documents ↔ CRM Tasks (crm_Accounts_Tasks) |
| `DocumentsToLeads`          | Documents ↔ Leads                       |
| `AccountWatchers`           | Accounts ↔ Users (watchers)             |
| `BoardWatchers`             | Boards ↔ Users (watchers)               |
| `ContactsToOpportunities`   | Contacts ↔ Opportunities                |
| `TargetsToTargetLists`      | Targets ↔ Target Lists                  |
| `CampaignToTargetLists`     | Campaigns ↔ Target Lists                |
| `EmailsToContacts`          | Emails ↔ Contacts                       |
| `EmailsToAccounts`          | Emails ↔ Accounts                       |

`junction-helpers.ts` exports a `junctionTableHelpers` object with `connectDocuments`, `updateDocuments`, `addDocuments`, `removeDocuments`, `connectWatchers`, `updateWatchers`, `addWatcher`, `removeAccountWatcher`, `removeBoardWatcher`, `connectContactsToOpportunity`, `updateContactsForOpportunity`, `hasDocument`, `hasAnyDocument`, `watchedByUser`, `includeWatchersWithUsers`, `includeDocuments`, plus `extractWatcherUsers`/`extractDocuments`/`extractContacts`/`extractOpportunities`.

---

## 6. Module Deep-Dives

### 6.1 CRM Core Module

**Accounts** (`actions/crm/accounts/`, `crm_Accounts`):
- Full CRUD (`create-account`, `update-account`, `delete-account` [soft], `restore-account`, `get-accounts`, `get-account-by-id`, `search-accounts`).
- Watchers pattern (`watch-account`/`unwatch-account`) — junction-based.
- Account products (`actions/crm/account-products/`: assign/update/remove).
- Tasks tied to accounts (`crm_Accounts_Tasks`).
- Case study pipeline: `case_study_candidate` flag → CSO approval gate.
- Activities tab, audit history timeline.
- "Find Similar" (vector).

**Contacts** (`actions/crm/contacts/`, `crm_Contacts`):
- CRUD, linked to Accounts. Many-to-many with Opportunities (`ContactsToOpportunities`).
- Social profile fields (Twitter, Facebook, LinkedIn, Skype, Instagram, YouTube, TikTok).
- Tags + notes arrays.
- Enrichment jobs (`crm_Contact_Enrichment`).

**Leads** (`actions/crm/leads/`, `crm_Leads`):
- Lead source/status/type lookup tables. Linked to Accounts via `assigned_accounts`.
- Convert to target pipeline.

**Opportunities** (`crm_Opportunities`):
- Sales stages with probabilities + automation kinds (`stage_kind`).
- Approval gate (CSO must approve before quote sent) — `lib/crm/approval-gate.ts`.
- `snapshot_rate` + `currency` for FX-aware revenue.
- Line items, contacts linkage.
- Funnel automation timers (`lib/crm/funnel-timers.ts`): kill rule, recycle, cadence, care.

**Contracts** (`crm_Contracts`):
- value, startDate, endDate, renewal reminders, status (NOTSTARTED/INPROGRESS/SIGNED).
- Line items, currency FX.

**Products** (`crm_Products`):
- Categories, SKU, unit_price, tax_rate, billing_period, recurring flag.
- Account products (subscription-like), opportunity/contract line items.

**Activities** (`crm_Activities` + `crm_ActivityLinks`):
- 5 types: call, meeting, note, email.
- Statuses: scheduled, completed, cancelled.
- **Polymorphic linking**: `crm_ActivityLinks` uses `(entityType, entityId)` to attach an activity to ANY entity (Account, Contact, Opportunity, etc.).
- Compound cursor pagination (`createdAt + id`) for stable ordering.
- Real-time revalidation via server actions after mutations.
- Meetings push to Google Calendar (email side-effect → scope-gated writes).

**Audit Log & History** (`lib/audit-log.ts`, `crm_AuditLog`, `components/crm/audit-log/`):
- `diffObjects()` computes before/after field diffs; strips internal fields.
- `writeAuditLog()` — never rethrows (audit failures don't block mutations).
- Per-entity History tab via `AuditTimeline` + `AuditEntry` components.
- Admin global audit log page at `/admin/audit-log` with restore for soft-deleted records.
- Soft delete on every CRM entity (`deletedAt`/`deletedBy`); `lib/crm/recycle.ts` for restore.

**Funnel & Automation** (`lib/crm/`):
- `funnel-settings.ts` — singleton config (kill_after_days=45, recycle_after_days=90, cadence offsets, care intervals).
- `funnel-timers.ts` — business-day and cadence timers.
- `stage-transition.ts` — stage-kind automation triggers.
- `auto-task.ts` — auto-generates tasks on stage transitions.
- `approval-gate.ts` — CSO approval workflow for opportunities.
- Inngest: `care-tasks`, `kill-rule`, `qualified-cadence`, `recycle-targets`, `renewal-reminders`.

**Calendar Sync** (`lib/crm/calendar/`):
- Google Calendar OAuth2 (`CalendarConnection`, encrypted refresh tokens).
- Calendly webhooks (`/api/crm/calendar/webhooks/calendly/`).
- Outbound event emission, scope-level sync, event classification, Google normalization.
- `process-event` classifies and routes calendar events.

### 6.2 Projects Module

**Boards** (`Boards`, `Sections`):
- Kanban-style boards with sections (columns), drag-and-drop via `@dnd-kit`.
- Favourite + position ordering, visibility (public/private), sharedWith[].
- Watch/unwatch pattern via `BoardWatchers`.
- Owner-scoped writes (manager/admin unrestricted).

**Tasks** (`Tasks`, `crm_Accounts_Tasks`, `tasksComments`):
- Two task pools: standalone `Tasks` (projects) and `crm_Accounts_Tasks` (tied to CRM accounts/opportunities).
- Comments (`tasksComments`) on both.
- Priority, tags (JSON), due dates, status (ACTIVE/PENDING/CPLETE).
- Tasks can attach documents via `DocumentsToTasks` / `DocumentsToCrmAccountsTasks`.
- Projects dashboard with AI assistant (GPT) — README roadmap "daily summary".

### 6.3 Invoices Module (*New*)

**Architecture:** Server Actions + Zod validation (no API-route middleman).
**Location:** `app/[locale]/(routes)/invoices/`, `lib/invoices/`, `lib/invoices/pdf/`.

- **Invoice types**: INVOICE, CREDIT_NOTE, PROFORMA (README mentions Receipt too — likely enum gap).
- **Status lifecycle**: `DRAFT → ISSUED → PAID / PARTIALLY_PAID / CANCELLED / OVERDUE / DISPUTED / REFUNDED / WRITTEN_OFF` with permission guards (only drafts editable).
- **Invoice Series** (`lib/invoices/numbering.ts`): auto-numbered sequences with prefix/suffix (e.g. `INV-2026-0001`), `resetPolicy` (YEARLY), per-series counters.
- **Tax engine** (`Invoice_TaxRates`): per-line tax rates, VAT summary buckets.
- **Line items**: quantity, unit_price, discount % (PERCENTAGE/FIXED), tax_rate snapshot, line_subtotal/vat/total.
- **Multi-currency**: `Currency` + `ExchangeRate` (ECB-sourced), `fxRateToBase`, `baseCurrency`, locale-aware formatting via next-intl.
- **Payments** (`Invoice_Payments`): record partial/full, auto-computed `balanceDue`, payment history.
- **PDF export** (`lib/invoices/pdf/render.tsx`, `@react-pdf/renderer`): server-side generation at `/api/invoices/[id]/pdf`, template system (`templates/default-invoice.tsx`), i18n-aware (`lib/invoices/pdf/i18n.ts`).
- **Email delivery**: Resend + React Email templates in `emails/`.
- **Duplicate & cancel**: one-click duplication (`originalInvoiceId` linkage for credit notes); cancellation with audit trail.
- **Activity log**: `Invoice_Activity` records every status change + edit (actor, action, meta).
- **Admin settings** (`/admin/invoices/`): tax rates, series, currencies, company details, default settings.
- **Permissions** (`lib/invoices/permissions.ts`): role-based edit guards.
- **Search** (`lib/invoices/search.ts`).

### 6.4 Documents Module (*New-ish*)

**Location:** `app/[locale]/(routes)/documents/`, `lib/minio.ts`, `app/api/upload/`.

- **Storage**: S3/MinIO via presigned PUT URLs (direct browser upload). Configurable public endpoint.
- **Document model**: file_url, mime_type, size, tags (JSONB), visibility (public/private), key, type, processing_status, content_text (extracted via `mammoth`), summary, thumbnail_url (Inngest `generate-thumbnail`), version (parent/child versioning), deletion (soft).
- **Enrichment**: Inngest `enrich-document` (text extraction + embedding), `generate-thumbnail`.
- **Linking**: `DocumentsTo*` junction tables connect documents to accounts, opportunities, contacts, leads, tasks, CRM tasks.
- **Viewer**: `react-doc-viewer` for inline preview.

### 6.5 Email Client

**Location:** `app/[locale]/(routes)/emails/`, `lib/email/`, `inngest/functions/emails/`, `imap`, `nodemailer`.

- **Accounts** (`EmailAccount`): per-user IMAP/SMTP config with encrypted passwords (AES-256-GCM) + OAuth2 refresh tokens (Google).
- **Sync**: Inngest `sync-all`/`sync-account` pull emails via IMAP; tracks `inboxLastUid`/`sentLastUid` for incremental sync.
- **Safety**: `lib/email/imap-safety.ts` guards against unsafe IMAP operations.
- **Linking**: `link-crm` Inngest function links incoming/outgoing emails to Contacts/Accounts via `EmailsToContacts`/`EmailsToAccounts` junctions.
- **Embedding**: `embed-email` Inngest function creates `EmailEmbedding` (vector) for semantic email search.
- **SMTP sending**: `lib/sendmail.ts` (nodemailer) for server-side email; Resend is the primary transactional provider.

### 6.6 AI Features

| Feature                | Mechanism                                                                 |
|------------------------|---------------------------------------------------------------------------|
| Vector embeddings       | OpenAI `text-embedding-3-small` (1536-dim) via `lib/openai.ts`; Inngest `embed-*` functions; stored as `vector(1536)` with HNSW indexes |
| Semantic search         | pgvector cosine similarity; `Find Similar` on every CRM detail page      |
| Unified search          | Keyword (Postgres `tsvector`/`search_vector`) + semantic (pgvector) combined in grouped UI |
| Document chunks         | `crm_Document_Chunks` — chunked text + embeddings for large document search |
| Enrichment (E2B)        | E2B cloud sandbox (real Chrome + Claude Sonnet 4.6) via Inngest; tool-use loop (`browser_open/click/extract`, `web_search`) |
| Agent architecture      | `lib/enrichment/agent-architecture/`: orchestrator + specialised agents (company-profile, discovery, funding, metrics, tech-stack, general) |
| Confidence scoring      | Fields below 0.6 confidence discarded; only empty fields overwritten     |
| C-level discovery       | Given company name, agent discovers C-level contacts → `crm_Target_Contact` records |
| Key management          | 3-tier (`lib/api-keys.ts`): ENV → system DB → user DB; AES-256-GCM at rest |
| Project assistant (P4)  | GPT via Vercel AI SDK (`ai@^6`) for project management assistant         |

**Enrichment strategies** (`lib/enrichment/strategies/`):
- `agent-enrichment-strategy.ts` (E2B), `email-parser.ts`, `enrichment-strategy.ts` (interface).

**Enrichment types/config** (`lib/enrichment/types/`, `lib/enrichment/config/`):
- Field generation types, source context, skip-lists, rate-limiting (`rate-limit.ts`).

### 6.7 MCP Server (*New*)

**Transport & Auth** (`app/api/mcp/[transport]/route.ts`, `lib/mcp/auth.ts`):
- Powered by `mcp-handler@^1.1` (Vercel MCP adapter).
- **Bearer tokens** (`nxtc__` prefix, 48 hex). SHA-256 hashed at rest.
- Dev fallback to session cookie (`NODE_ENV=development` only).
- Role resolved from DB for object-level scoping.
- Base path: `/api/mcp`. Handles both `GET`/`POST` (streamable HTTP) and SSE.

**127 tools across 15 modules** (`lib/mcp/tools/index.ts`):

| Module (file)           | Tools | Operations                                           |
|-------------------------|-------|--------------------------------------------------------|
| crm-accounts            | 6     | list, get, search, create, update, delete              |
| crm-contacts            | 6     | list, get, search, create, update, delete              |
| crm-leads               | 6     | list, get, search, create, update, delete              |
| crm-opportunities       | 6     | list, get, search, create, update, delete              |
| crm-targets             | 6     | list, get, search, create, update, delete              |
| crm-products            | 5     | list, get, create, update, delete                      |
| crm-contracts           | 5     | list, get, create, update, delete                      |
| crm-activities          | 5     | list, get, create, update, delete                      |
| crm-documents           | 8     | list, get, create, upload, download, link, unlink, delete |
| crm-target-lists        | 7     | list, get, create, update, delete, add/remove members  |
| crm-enrichment          | 4     | enrich contact, enrich target, bulk contact, bulk target |
| crm-email-accounts      | 1     | list                                                   |
| crm-users               | —     | user listing (scoped)                                  |
| campaigns               | 18    | full lifecycle: CRUD, send, pause, resume, templates, steps, stats |
| projects                | 18    | boards, sections, tasks, comments, documents, watch    |
| reports                 | 2     | list, run                                              |

**Scope adapter** (`lib/mcp/__tests__/scope-adapter.test.ts`, `lib/mcp/helpers.ts`):
- All tool handlers receive `(args, userId, mcpUser)` and delegate to the same `lib/authz` scope helpers used by server actions, ensuring MCP access has identical authorization semantics to the UI.

### 6.8 Campaigns Module

- **Campaigns** (`crm_campaigns`): multi-step email sequences with templates, scheduling, pause/resume, send-now.
- **Templates** (`crm_campaign_templates`): HTML + JSON block-editor content, subject defaults.
- **Steps** (`crm_campaign_steps`): ordered, delay_days, send_to (all/non-openers), per-step scheduling.
- **Audiences**: target lists (`TargetsToTargetLists`, `CampaignToTargetLists`).
- **Sends** (`crm_campaign_sends`): per-recipient send tracking (queued/sent/delivered/bounced/failed), open/click tracking, unique unsubscribe token.
- **Merge tags** (`lib/campaigns/merge-tags.ts`): variable substitution in templates.
- **Recipient filters** (`lib/campaigns/recipient-filters.ts`): audience filtering logic.
- **Email rendering** (`lib/campaigns/render-email.ts`): template → email pipeline.
- **Delivery**: Inngest `send-step`/`send-now`/`schedule-send`/`process-follow-up`; Resend for sending + webhooks for delivery tracking.
- **Unsubscribes**: `/api/campaigns/unsubscribe` (global opt-out + per-campaign).
- **Resend webhook**: `/api/campaigns/webhooks/resend` for bounces/complaints.

### 6.9 Reports & Dashboards

- **Report configs** (`crm_Report_Config`): category (sales/leads/accounts/activity/campaigns/users), filters (JSON), shared flag.
- **Schedule** (`crm_Report_Schedule`): cron expression, recipients (JSON), format (csv/pdf/both).
- **Scheduled delivery**: Inngest `send-scheduled`.
- **Reports dashboard**: `/reports/` — accounts, leads, sales, activity, campaigns, users, dashboard overview.
- **Charts**: Tremor + Recharts.
- **Export**: `/api/reports/export` (CSV/PDF).
- **Saved configs & scheduling** UI (`components/reports/`).

### 6.10 Admin Panel

Routes: `/admin/` — all gated by `requireAdmin()` or role-based checks.

| Admin Sub-route          | Purpose                                                      |
|--------------------------|--------------------------------------------------------------|
| `/admin` (dashboard)     | Overview                                                     |
| `/admin/users`           | User management (activate/deactivate/invite/set-role/delete) |
| `/admin/audit-log`       | Global audit log table with restore                          |
| `/admin/crm-settings`    | CRM entity config (lookup tables, etc.)                      |
| `/admin/currencies`      | Currency list, ECB exchange-rate toggle, rate table         |
| `/admin/funnel-settings` | Funnel timing parameters                                     |
| `/admin/invoices/*`      | Invoice settings, series, tax rates                          |
| `/admin/llm-keys`        | System-wide encrypted API keys (OpenAI, Anthropic, Firecrawl, Groq) |
| `/admin/services`        | System services config                                       |
| `/admin/calendar-settings` | Calendly integration settings                              |

### 6.11 Profile

`/profile` — user profile with tabs:
- `llms` tab: configure personal API keys (fallback tier).
- Developer tab: generate MCP Bearer tokens; download Claude Code `SKILL.md`.

### 6.12 Internationalization (i18n)

- **Library**: `next-intl@^4.11` with Next.js App Router plugin (`next-intl/plugin` in `next.config.js`).
- **Locales**: `en` (default), `cz` (Czech), `de` (German), `uk` (Ukrainian) — via `i18n/routing.ts`.
- **Time zone**: `Europe/Prague`.
- **Routing**: locale-prefixed URLs (`/:locale/...`). `hasLocale` fallback.
- **Messages**: loaded from `locales/{locale}.json` (4 files, large per-language).
- **Currency**: locale-aware formatting via `lib/currency-format.ts` + next-intl.

### 6.13 Design System / UI

| Component               | Source / Lib                                           |
|-------------------------|--------------------------------------------------------|
| UI primitives           | shadcn/ui (Radix UI + Tailwind CSS v4)                 |
| Icons                   | Lucide React, Radix Icons, React Icons, PrimeIcons     |
| Charts                  | Tremor, Recharts                                       |
| Rich text editor        | Tiptap (extension-link, underline, starter-kit)      |
| Drag & drop             | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers |
| Modal/sheet dialogs     | Radix Dialog, Vaul (bottom sheets)                     |
| Notifications           | Sonner (`toaster`), internal toast hooks               |
| Tables                  | TanStack React Table (server + client side)            |
| Forms                   | react-hook-form + @hookform/resolvers + Zod            |
| Date picker             | react-day-picker                                       |
| Autocomplete/command    | cmdk                                                   |
| Resizable panels        | react-resizable-panels                                 |
| Themes                  | next-themes (system/light/dark)                        |
| OTP input               | input-otp                                              |
| PDF rendering           | @react-pdf/renderer (invoices)                         |
| Email templates         | @react-email/* (React Email 2.x)                       |
| Document viewer         | react-doc-viewer                                       |
| Spreadsheet             | exceljs, papaparse (import/export)                     |
| HTML sanitization       | sanitize-html                                        |

`components.json` configures shadcn/ui: `style: "default"`, `rsc: true`, `tsx: true`, aliases `@/components` + `@/lib/utils`, CSS at `app/[locale]/globals.css`.

---

## 7. Testing Strategy

| Layer        | Framework         | Config                    | Scope / Coverage                                             |
|--------------|-------------------|---------------------------|--------------------------------------------------------------|
| Unit + Integration | Jest 30        | `jest.config.ts`, `jest.env.setup.ts` | `__tests__/` (Jest) — authz scopes, MCP tools, invoices, crm, enrichment, reports, lib, campaigns, inngest |
| E2E          | Playwright 1.58   | `playwright.config.ts`    | `tests/` + `__tests__/**/__tests__/` (some co-located)        |
| Mocks        | `__mocks__/e2b.ts` | Jest manual mock        | E2B sandbox mocking                                           |

**Jest test buckets (by directory under `__tests__/`):**
- `actions/admin/system/` — set-resend-key
- `actions/emails/accounts.test.ts`
- `actions/import-targets-suppression.test.ts`
- `actions/crm-decimal-serialization.test.ts`
- `campaigns/` — api (unsubscribe, resend webhook), inngest (send-step), merge-tags, recipient-filters, render-email
- `crm/` — approval-gate, auto-task, business-days, client-activity, funnel-settings, funnel-timers, lead/opportunity table schemas, recycle, stage-transition
- `enrichment/` — e2b-apply-result, enrich-contact-job, enrich-target-job, enrich route tests, utils
- `inngest/` — emails/embed-email, send-scheduled-scope
- `invoices/` — lifecycle (the big one: ~9.9KB testing the full status state machine), fx, numbering, permissions, search, totals
- `lib/` — api-keys, api-tokens, currency, email-crypto, email/imap-safety, export-targets, invoices/{fx,numbering,permissions,search,totals}, parse-spreadsheet
- `mcp/` — campaigns-scope, crm-account-linking, crm-read-scope, crm-users, products-rbac, projects-boards/sections/tasks/comments-docs/watch-scope, scope-adapter
- `reports/` — accounts, activity, campaigns, config, dashboard, export-csv, leads, sales, schedule, types, users

**Notable:** `actions/crm/__tests__/` contains extensive **scope/authorization tests** for every CRM get/create/update pathway — these document the exact RBAC + object-level scoping semantics. The `lib/authz/__tests__/` directory has parallel tests (`scopes-crm-account`, `scopes-crm-read`, `scopes-crm-write`, `scopes-document-read`, `scopes-projects`, `scopes-crm-entity-read`, etc.).

**Dev OTP retrieval**: `app/api/auth/test-otp/route.ts` — GET endpoint returning the captured OTP for a given email, only in non-production. Enables E2E tests to log in without an email provider.

---

## 8. Deployment & Infrastructure

### Docker Compose (`docker-compose.yml` + `.env.docker`)

| Service        | Image / Purpose               | Port | Internal Service |
|----------------|-------------------------------|------|------------------|
| `app`          | NextCRM (standalone build)    | 3000 | —                |
| `postgres`     | PostgreSQL 17 + pgvector      | —    | internal only    |
| `minio`        | S3-compatible object storage  | —    | internal only    |
| `inngest`      | Background job runner         | —    | internal only    |

- Entrypoint: `docker-entrypoint.sh` — runs `prisma migrate deploy` on every start, seeds only on first install (no users exist).
- Only port `3000` exposed by default; Postgres/MinIO/Inngest ports are commented in compose for direct access when needed.
- Named volumes: `postgres_data`, `minio_data` (persist across restarts).
- `next.config.js`: `output: "standalone"`, `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]`, image remote patterns (localhost, cloudinary, googleusercontent, minio, minio-coolify host).

**Required env for first login:** `ADMIN_EMAIL` + an email provider (`RESEND_API_KEY`). Without a provider, OTP can be read from the `Verification` table directly.

### CI/CD (`.github/workflows/`)

| Workflow     | Purpose                                  |
|--------------|------------------------------------------|
| `ci.yml`     | Lint, typecheck, tests                   |
| `release-please.yml` | Version bumps + changelog (on `main`) |

### Environment Variables (`.env.example` / `.env.docker`)

**Required:**
- `DATABASE_URL` (PostgreSQL 17+, pgvector)
- `BETTER_AUTH_SECRET` (openssl rand -base64 32)
- `BETTER_AUTH_URL`

**Auth:**
- `GOOGLE_ID`, `GOOGLE_SECRET`

**AI (all optional — can be set via admin panel instead):**
- `OPENAI_API_KEY` (embeddings, project assistant)
- `ANTHROPIC_API_KEY` (Claude Sonnet 4.6 enrichment agent)
- `GROQ_API_KEY`
- `FIRECRAWL_API_KEY` (legacy enrichment path)
- `E2B_API_KEY` (sandboxed enrichment)

**Email:**
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- `MAILTRAP_API_KEY` (alternative provider)
- SMTP: `SMTP_HOST/PORT/USER/PASSWORD` (legacy sendmail)
- IMAP: `IMAP_HOST/PORT/USER/PASSWORD` (email client)
- `EMAIL_ENCRYPTION_KEY` (req — 64 hex chars for AES-256-GCM of API keys + email passwords)

**Storage:**
- `NEXT_PUBLIC_MINIO_ENDPOINT`, `MINIO_ENDPOINT/PORT/BUCKET/USE_SSL/ACCESS_KEY/SECRET_KEY`

**Background jobs:**
- `INNGEST_ID`, `INNGEST_APP_NAME`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

**Other:**
- `ROSSUM_USERNAME/PASSWORD` (invoice parsing — legacy)
- `GOOGLE_CALENDAR_CLIENT_ID/SECRET` (calendar sync)
- `CRON_SECRET` (internal cron endpoints)
- `ADMIN_EMAIL` (Docker bootstrap admin)

---

## 9. File Structure (Condensed)

```
nextcrm-app/
├── app/
│   ├── [locale]/                          # Locale-prefixed routes
│   │   ├── globals.css
│   │   ├── layout.tsx                     # Root: i18n + theme + toaster providers
│   │   ├── (auth)/                        # Sign-in, pending, inactive interstitials
│   │   └── (routes)/                      # Main app: crm/, campaigns/, invoices/, projects/,
│   │                                     # documents/, emails/, reports/, profile/, admin/, databox, employees
│   ├── api/                               # API route handlers
│   │   ├── auth/[...all]/route.ts         # Better Auth handler
│   │   ├── auth/test-otf/route.ts        # Dev OTP retrieval
│   │   ├── mcp/[transport]/route.ts       # MCP server
│   │   ├── inngest/route.ts               # Inngest webhook
│   │   ├── invoices/[id]/pdf/route.ts     # PDF export
│   │   ├── admin/invoices/...             # Series + tax-rate CRUD
│   │   ├── campaigns/...                  # Enrichment, unsubscribe, Resend webhooks
│   │   ├── crm/{contacts,targets,leads}/  # Enrichment + entity routes
│   │   ├── crm/calendar/webhooks/calendly/
│   │   ├── profile/calendar-connections/google/...
│   │   ├── reports/export
│   │   ├── upload/presigned-url
│   │   └── og
├── actions/                               # Server Actions (use server) + Zod
│   ├── admin/{users,system,send-mail-to-all}/
│   ├── campaigns/{*, templates/*}/
│   ├── crm/{accounts,contacts,leads,opportunities,contracts,products,
│   │   account-products,contract-line-items,opportunity-line-items,
│   │   activities,audit-log,targets,contacts-enrichment/*}
│   └── api-tokens.ts
├── components/
│   ├── ui/                  # shadcn/ui primitives (full Radix set)
│   ├── crm/                 # CRM entity components, activities, audit-log, find-similar
│   ├── campaigns/           # Campaign wizard, TipTap editor
│   ├── reports/             # KPI cards, charts, filters, scheduling
│   ├── form/                # shadcn form wrapper components
│   ├── modals/              # Alerts, sheets, file-upload, import targets
│   ├── skeletons/           # Loading states per module
│   ├── sheets/              # Bottom sheets (form-sheet)
│   ├── fulltext-search/     # Search result UI
│   └── ThemeToggle, CurrencySwitcher, etc.
├── context/                 # avatar-context, currency-context
├── hooks/                   # use-action, use-mobile, use-toast, useDebounce
├── lib/                     # Core libraries (see sections 3.2–3.7)
│   ├── auth.ts              # Better Auth config
│   ├── auth-client.ts       # React client (OTP + admin plugin)
│   ├── auth-server.ts       # getSession()
│   ├── auth-guards.ts       # requireOwnerOrAdmin, requireAdmin
│   ├── auth-permissions.ts  # RBAC statements + roles
│   ├── authz/               # Authorization engine (roles, session, errors, route, scopes/crm, scopes/report-scope)
│   ├── api-tokens.ts        # MCP Bearer token CRUD (SHA-256)
│   ├── api-keys.ts          # 3-tier API key resolution (AES-256-GCM)
│   ├── audit-log.ts         # diffObjects + writeAuditLog
│   ├── campaigns/           # merge-tags, recipient-filters, render-email
│   ├── crm/                 # approval-gate, auto-task, funnel-*, recycle, client-activity, calendar/
│   ├── enrichment/          # e2b agent, strategies, agent-architecture, types, utils, services
│   ├── invoices/            # fx, numbering, search, permissions, pdf/
│   ├── mcp/                 # auth, helpers, tools/{15 files}
│   ├── email/               # imap-safety
│   ├── minio.ts             # S3/MinIO client
│   ├── openai.ts            # embedding client factory
│   ├── resend.ts            # Resend helper (env + DB fallback)
│   ├── sendmail.ts          # SMTP via nodemailer
│   ├── email-crypto.ts      # AES-256-GCM encrypt/decrypt
│   ├── prisma.ts            # Prisma singleton (pg pool)
│   ├── serialize-decimals.ts # Decimal → Number conversion
│   ├── create-safe-action.ts  # Zod-validated server action wrapper
│   ├── junction-helpers.ts  # Standardized M2M junction operations
│   ├── fetcher.ts           # SWR fetcher
│   └── utils.ts, currency.ts, currency-format.ts
├── inngest/
│   ├── client.ts
│   └── functions/           # embed-*, enrich-*, email sync/link/embed,
│                            # document processing, campaigns send/now/schedule/follow-up,
│                            # crm automation (care/kill/qualified/recycle/renewal),
│                            # reports/scheduled, ecb/exchange-rates, calendar sync
├── prisma/                  # schema.prisma, seeds, migrations, prisma.config.ts
├── i18n/                    # request.ts, routing.ts
├── locales/                 # en.json, cz.json, de.json, uk.json
├── emails/                  # React Email templates
├── components.json          # shadcn/ui config
├── next.config.js           # withNextIntl plugin, standalone, redirects
├── tailwind.config.js       # Tailwind v4
├── jest.config.ts, playwright.config.ts
├── Dockerfile, docker-compose.yml, docker-compose.dev.yml, .env.docker
└── ...env, lint, deps
```

---

## 10. Notable Patterns & Practices

### 10.1 Architecture Patterns

- **Server Actions as the mutation boundary** — All CRUD operations go through `createSafeAction` (Zod-validated) server actions in `actions/`. No raw mutation API routes. UI reads use Server Components + SWR; mutations use server actions; the `form-sheet.tsx` wrapper pattern is used pervasively for inline create/edit.
- **Scope asserts before every write** — Every server action and MCP tool calls an `assertCan*` from `lib/authz/scopes/crm.ts`. Read paths apply `*ReadScopeWhere` Prisma where clauses. The `assertScopeOrNotFound` helper masks existence.
- **Audit-on-mutate** — `writeAuditLog()` is called in the same transaction scope as the mutation (fire-and-forget on failure).
- **Soft delete everywhere** — `deletedAt` + `deletedBy` on all CRM entities; `status="deleted"` for campaigns (string field); no hard deletes except `Tasks`/`crm_Accounts_Tasks` (documented). Restore via `recycle.ts`.
- **Decimal serialization hygiene** — `AGENTS.md` mandates `serializeDecimals()`/`serializeDecimalsList()` on every server action return that crosses into client components. This is a documented pain point.
- **Junction-table helper library** — `lib/junction-helpers.ts` standardizes the 10+ document/link/watcher junction tables with `connect`/`update`/`add`/`remove` + `extract` utilities.
- **Polymorphic activity linking** — `crm_ActivityLinks(entityType, entityId)` allows activities to attach to any CRM entity without per-entity FK columns. `assertCanReadActivityForEntity` dispatches to the right scope assert.
- **3-tier secret/key resolution** — `lib/api-keys.ts` chains ENV → system DB → user DB with AES-256-GCM at rest. Same pattern conceptually extends to Resend keys (`lib/resend.ts` checks `RESEND_API_KEY` env then DB `systemServices`).
- **Token prefix + suffix** — API tokens display `tokenPrefix` (8 chars) without storing the raw value; lookup uses hashed `tokenHash`.
- **Currency provider context** — Currency display selection is a React context (`currency-context.tsx`) persisted to a cookie, driving the multi-currency display layer.

### 10.2 Data Conventions

- **UUID v4 primary keys** everywhere (`@db.Uuid`, `default(uuid())`).
- **`__v` integer versioning** on most models (`@map("__v")`) — legacy from the MongoDB migration; preserved but unused.
- **Dual date fields** — e.g. `createdAt`/`created_on`, `cratedAt` (typo), `last_activity`/`last_activity_by` — migration artifacts; `AGENTS.md` notes ongoing `any` type cleanup.
- **`createdBy`/`updatedBy`** user-FK columns on auditable entities (except where legacy naming like `created_on` exists).
- **`assigned_to`** is a UUID FK to `Users` with named relations (e.g. `AccountAssignedTo`, `LeadAssignedTo`, `assigned_contacts`, `assigned_to_user_relation`).
- **`snapshot_rate`** + `currency` columns on Opportunities/Contracts/AccountProducts/Invoices capture FX at write time.
- **`status` enum + `deletedAt`** coexistence — active records have `deletedAt: null`.

### 10.3 Testing Conventions

- **Scope-test-first** — Every `actions/*/__`tests__/` directory contains `<entity>-scope.test.ts` files verifying the authorization boundary. These are the most reliable spec for "what can each role do."
- **E2B mock** — `__mocks__/e2b.ts` replaces the real E2B client in Jest, returning canned agent outputs.
- **Dev OTP endpoint** — `app/api/auth/test-otp` is gated on `NODE_ENV !== "production"`; used by Playwright E2E to auto-login without email delivery.
- **Inngest function tests** — Functions are tested in isolation (e.g. `send-step-scope.test.ts`, `embed-email.test.ts`, `send-scheduled-scope.test.ts`).

### 10.4 DevEx & Tooling

- **Trunk-based flow** on `dev` branch; `main` is release-only via PR. Release-please automates versioning (`release-please-config.json`). Never commit to `main` directly.
- **`AGENTS.md`** is the authoritative agent guide (auth, scopes, Decimal hygiene, git workflow).
- **Context-mode MCP plugin** (in the repo's own `.claude/skills/`) intercepts large tool outputs into a local SQLite FTS5 sandbox.
- **Skills system**: `.claude/skills/` contains `SKILL.md` files for rigid/flexible agent behaviors.
- **E2B sandbox** (`e2b.Dockerfile`, `e2b.toml`) used for AI enrichment and could host the app for interactive exploration.

### 10.5 Migration Artifacts (Mongo → Postgres)

- `scripts/migrate-mongo-to-postgres.ts` + `scripts/validate-migration.ts`.
- `__v` fields, dual date columns, `status` strings on campaigns (instead of `deletedAt`) are migration remnants.
- `mongodb@^7` still in deps (legacy migration tool, not runtime).

---

## 11. OpenCRM Mapping Reference

This section cross-references NextCRM modules to likely OpenCRM counterparts to accelerate the mapping.

| OpenCRM Concept (from audit)        | NextCRM Equivalent                          | Notes                                               |
|-------------------------------------|---------------------------------------------|-----------------------------------------------------|
| Custom BetterAuth                   | `lib/auth.ts` + admin plugin                | Passwordless OTP + Google OAuth; RBAC via plugin    |
| Permission engine                   | `lib/authz/`                                | Better than OpenCRM's `permissions.ts` — scope-based + role-based |
| Record access / ownership scoping   | `lib/authz/scopes/crm.ts`                   | Graph-traversal scoping (linked-account aware)       |
| CRM record CRUD actions             | `actions/crm/*/create-*/update-*.ts`        | Server actions + Zod, not API routes                |
| Accounts                            | `crm_Accounts`                              | Watchers, case-study candidate, account products    |
| Contacts                            | `crm_Contacts`                              | Social links, tags, notes                           |
| Leads                               | `crm_Leads`                                 | Source/status/type lookups, account linkage         |
| Opportunities                       | `crm_Opportunities`                         | Approval gate (CSO), funnel automation              |
| Contracts                           | `crm_Contracts`                             | Renewal reminders, line items                       |
| Products / Catalog                  | `crm_Products`, `crm_ProductCategories`     | Recurring billing, account products                 |
| Activity tracking                   | `crm_Activities` + `crm_ActivityLinks`      | Polymorphic linking to any entity                   |
| Audit trail / soft delete           | `crm_AuditLog`, `deletedAt`                 | Diff engine, per-entity History tab, admin restore |
| Dashboards / charts                 | Tremor + recharts                           | `components/reports/*`, `/reports/`                 |
| Reports                             | `crm_Report_Config`, `crm_Report_Schedule`  | Cron scheduling, CSV/PDF export                     |
| Tasks / Kanban boards               | `Tasks`, `crm_Accounts_Tasks`, `Boards`     | dnd-kit, comments, watchers, assignees              |
| Documents / file storage            | `Documents` + `DocumentsTo*` (6 junctions)  | MinIO/S3, versioning, enrichment, chunks            |
| Search                              | fulltext (`tsvector`) + pgvector            | `/fulltext-search/`, unified keyword+semantic        |
| Email sending                       | Resend + React Email                        | `lib/resend.ts`, `emails/` templates                |
| Email client (IMAP)                 | `EmailAccount`, `Email`                     | IMAP sync + linking + embeddings                    |
| User management                     | `actions/admin/users/`, `/admin/users`      | Invite, activate/deactivate, set role               |
| Rate limiting                       | Upstash Redis                               | `lib/rate-limit.ts`? (not yet located in tree)       |
| i18n                                | next-intl                                   | 4 locales, `/[locale]/` routing                      |
| AI enrichment                       | E2B + Claude Sonnet 4.6                     | `lib/enrichment/e2b/`, `lib/enrichment/agent-architecture/` |
| Vector search / embeddings          | OpenAI + pgvector                           | `crm_Embeddings_*`, HNSW indexes, Inngest embed jobs |
| Background jobs                     | Inngest                                     | `inngest/functions/`                                |
| MCP server                          | `mcp-handler`                               | 127 tools, Bearer auth, streamable HTTP + SSE       |
| Invoicing (new)                     | `Invoices`, `Invoice_*`                     | Multi-currency, tax, series, PDF, payments          |
| Campaigns (new)                     | `crm_campaigns*`                            | Multi-step, templates, targeting, tracking          |

---

*Document generated from static analysis of `pdovhomilja/nextcrm-app` (main branch). Source: README.md, package.json, prisma/schema.prisma, lib/*, app/*, inngest/*, i18n/*. Last updated: 2026-09-22.*
