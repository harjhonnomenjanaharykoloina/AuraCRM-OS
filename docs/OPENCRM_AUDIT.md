# OpenCRM Feature Inventory & Audit

This document catalogs all features and capabilities of the OpenCRM project as observed in the codebase.

---

## 1. Project Overview

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Runtime | Node.js (Edge/Server Actions via Bun-compatible `use server`) |
| Language | TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Auth | BetterAuth (customized) with bcrypt password hashing |
| UI | React 19, Tailwind CSS, shadcn/ui, lucide-react, recharts |
| Deployment | Vercel (Next.js optimized) |
| Package Manager | Bun |

### Project Structure

```
src/
├── actions/           # Server Actions (use server)
│   ├── standard/      # CRM record, dashboard, list view actions
│   └── auth.ts        # Registration & legacy sign-in server actions
├── app/               # Next.js App Router
│   ├── api/           # API route handlers
│   └── (routes)       # UI pages (app, auth, login, register, admin)
├── components/        # React UI components
│   ├── ui/            # shadcn/ui primitives
│   ├── standard/      # CRM-specific components
│   └── shared/        # Shared components
├── lib/               # Core libraries & utilities
│   ├── auth/          # Authentication providers, context
│   ├── db.ts          # Prisma client singleton
│   ├── permissions.ts # Permission checking engine
│   ├── record-access.ts # Record access / ownership scoping
│   ├── crypto.ts      # Password hashing, encryption
│   ├── rate-limit.ts  # In-memory rate limiter
│   ├── rate-limit-redis.ts # Redis-backed rate limiter (Upstash)
│   ├── temporal.ts    # Date/time parsing utilities
│   ├── ui-themes.ts   # Widget color themes
│   └── seeding/       # Org template seeding logic
└── prisma/
    └── schema.prisma  # Full data model
```

---

## 2. Configuration

### package.json (`package.json`)

| Key | Value |
|-----|-------|
| Name | opencrm |
| Scripts | `dev` (bun --hot), `build` (next build), `start`, `lint`, `test` (bunx jest) |
| Test Framework | Jest |
| Linter | ESLint (`bunx eslint .`) |
| Package Manager | Bun |
| Runtime Scripts | `dev`, `build`, `start`, `lint`, `test` |

### next.config.ts (`next.config.ts`)

- TypeScript-based Next.js config
- Custom domain handling via rewrites (`@opencrm.io` -> app path)
- Image optimization configured for external domains

### Environment Variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret for BetterAuth JWT/session signing |
| `BETTER_AUTH_URL` | Base URL for auth callbacks |
| `SMTP_*` / `EMAIL_*` | Email provider config for verification/password reset |
| `REDIS_URL` / `REDIS_TOKEN` | Upstash Redis for distributed rate limiting |
| `NODE_ENV` | Production vs development flagging |

---

## 3. Authentication & User Management

### Auth Provider (`src/auth.ts`)

- Uses BetterAuth framework with:
  - Credential-based email/password authentication
  - bcrypt password hashing (`BCRYPT_COST` factor)
  - Session management (token-based, expiry)
  - Account linking (multiple providers per user)
  - Email verification flow support
  - Password reset flow support

### Auth Actions (`src/actions/auth.ts`)

**Exports:**

| Function | Description |
|----------|-------------|
| `register(data)` | Full registration flow: validates input, creates org + admin user, hashes password, links account, seeds template, assigns companion record & owner permission set. Handles Zod errors and Prisma unique constraint errors gracefully. |
| `legacySignInAction(username, password)` | Wraps `legacySignIn` for backwards compatibility |

### Auth Context (`src/lib/auth/context.ts`)

- Provides authenticated session via `getServerSession`-style helper
- Exports session type with `user.id` and `user.organizationId`

### Auth Proxy Fix (`src/lib/auth-proxy-fix.ts`)

- Bridges legacy session tokens to BetterAuth session format
- Handles token migration for existing users

### Crypto (`src/lib/crypto.ts`)

- Exports `BCRYPT_COST` constant
- Password hashing/verification helpers using bcryptjs

### Password Validation (`src/lib/password-validation.ts`)

- `passwordSchema` — Zod schema for password rules
- Minimum length, complexity requirements

### Sign-in / Sign-up Pages

- **Login**: `src/app/login/page.tsx` — form with username/email + password
- **Register**: `src/app/register/page.tsx` — organization name, username, email, password
- **Clean Components**: 
  - `src/components/auth/clean-minimal-sign-in.tsx`
  - `src/components/auth/clean-minimal-register.tsx`

### Middleware (`src/middleware.ts`)

- CSRF protection (origin/referer checks)
- Rate limiting for auth endpoints (login, register)
- Session validation on protected routes
- Redirects unauthenticated users to login

### Rate Limiting

| Module | Description |
|--------|-------------|
| `src/lib/rate-limit.ts` | In-memory sliding-window `RateLimiter` class (keyed, windowSeconds, maxRequests) |
| `src/lib/rate-limit-redis.ts` | Redis-backed `RedisRateLimiter` using Upstash for distributed rate limiting |
| `src/lib/rate-limit-store.ts` | Stores singleton instances of rate limiters per configuration |

---

## 4. Multi-Tenancy & Organizations

### Organization Model

- Each user belongs to one `Organization`
- Organization has an `owner` (User) and a unique `slug`
- All CRM entities are scoped by `organizationId`
- Org creation triggers seeding of standard objects, permission sets, and apps

### Isolation Tests (`tests/org-isolation.test.ts`)

- Verifies records cannot leak between organizations
- Tests permission checks respect org boundaries

---

## 5. CRM Data Model (`prisma/schema.prisma`)

### 5.1 Core Entities

#### Organization
- `slug` for subdomain access
- `ownerId` → User (org owner)
- Cascading deletes to related entities

#### User (`UserType` enum: admin, standard, system)
- `username`, `email`, `password` (bcrypt)
- `name`, `userType`, `organizationId`
- `groupId` → Group (user groups)
- Companion record support (see below)

#### Session / Account / Verification
- Standard BetterAuth models for session/token management

### 5.2 Metadata Layer (EAV Architecture)

| Model | Description |
|-------|-------------|
| `ObjectDefinition` | Custom object types (Lead, Contact, Account, Opportunity, etc.) with `apiName`, `label`, `fields`, `pageLayouts`, `listViews`, `validationRules`, `duplicateRules`, `sharingRules` |
| `FieldDefinition` | 20+ field types: Text, TextArea, Number, Currency, Percent, Date, DateTime, Checkbox, Picklist, Lookup, Formula, RollupSummary, ExternalLookup. Has `picklistOptions`, `referenceTargetId`, `isRequired`, etc. |
| `PicklistOption` | Picklist values with sort order and active flag |
| `FieldData` | EAV storage: `valueText`, `valueSearch`, `valueNumber`, `valueDate`, `valueBoolean`, `valueLookup`, `valuePicklistId` |
| `FieldHistory` | Audit trail of field changes (old/new values, changed by, timestamp) |

### 5.3 Record Ownership & Sharing

| Model | Description |
|-------|-------------|
| `Record` | Universal record entity with EAV fields, `ownerType` (USER/QUEUE), `ownerId`, `ownerQueueId`, `backingUserId` (companion records) |
| `Queue` | Work queues for record assignment; QueueMembers for membership |
| `RecordShare` | Manual sharing grants (grantee type, level: READ/READ_WRITE) |
| `RecordOwnerHistory` | Tracks ownership changes (old→new owner, user or queue) |
| `SharingRule` | Configurable sharing rules by role/group/role+hierarchy |

### 5.4 UI Configuration

| Model | Description |
|-------|-------------|
| `RecordPageLayout` | Layout definitions with JSON config (sections, columns, field placement) |
| `RecordPageAssignment` | Assigns layouts to apps, objects, and optionally permission sets |
| `ListView` | Saved views with filter criteria, sort config, view mode (table/kanban/gantt/calendar), kanban grouping |
| `ListViewColumn` | Column definitions for list views |
| `ListViewShare` | Sharing of list views across users/groups |
| `UserListViewPreference` | Per-user default list view settings |
| `ListViewPin` | User-pinned list views |
| `DashboardWidget` | Widget definitions (metric, list, chart) linked to apps and objects |

### 5.5 Permissions & Access Control

| Model | Description |
|-------|-------------|
| `PermissionSet` | Collection of object/app permissions |
| `PermissionSetGroup` | Groups of permission sets for bulk assignment |
| `PermissionSetAssignment` | Links users to permission sets (with source tracking: DIRECT/GROUP) |
| `ObjectPermission` | CRUD + viewAll/modifyAll flags per object per permission set |
| `AppPermission` | App-level access grants |
| `PermissionSetAssignmentSource` | Tracks assignment provenance (direct vs group) |

### 5.6 Validation & Data Quality

| Model | Description |
|-------|-------------|
| `ValidationRule` | Custom validation logic with `logicOperator` (ALL/ANY/CUSTOM), error messages, error placement (toast/inline) |
| `ValidationCondition` | Conditions for validation rules (field comparison, operator, value) |
| `DuplicateRule` | Prevents/catches duplicate records; `createAction`/`editAction` (WARN/BLOCK) |
| `DuplicateRuleCondition` | Fields to check for duplicates |

### 5.7 Imports

| Model | Description |
|-------|-------------|
| `ImportJob` | Batch import records with mode (INSERT/UPDATE/UPSERT), status (PENDING/RUNNING/COMPLETED/FAILED), counts |
| `ImportRow` | Individual import rows with rawData, parsed recordId, errors, warnings |

### 5.8 App Builder

| Model | Description |
|-------|-------------|
| `AppDefinition` | Custom apps with `navItems`, `permissions`, `widgets`, `recordPageAssignments` |
| `AppNavItem` | Navigation items linking apps to objects |

### 5.9 Relationships & Metadata Dependencies

| Model | Description |
|-------|-------------|
| `MetadataDependency` | Tracks dependencies between metadata (objects, fields, apps) for deletion safety (`isBlockingDelete`) |

### 5.10 Notifications & Comments

| Model | Description |
|-------|-------------|
| `Notification` | In-app notifications (types: various, isRead flag) |
| `RecordComment` | Threaded comments on records with mentions |
| `RecordCommentMention` | Mentions within comments (user references) |
| `FileAttachment` | File attachments linked to records/fields |

### 5.11 Enums

- `UserType`: admin, standard, system
- `OwnerType`: USER, QUEUE
- `NotificationType`, `DuplicateRuleAction`, `ListViewMode`, `ListViewPrincipalType`, `ValidationRuleErrorPlacement`

---

## 6. CRM Server Actions (`src/actions/standard/*.ts`)

### record-actions.ts (`src/actions/standard/record-actions.ts`)

Core CRUD for all CRM objects; all functions are `use server` Server Actions.

| Function | Description |
|----------|-------------|
| `createRecord` | Create record with field validation, owner assignment, sharing rules |
| `updateRecord` | Update record fields, track history, fire automation |
| `deleteRecord` | Soft-delete records (`isDeleted` flag), cascading ownership |
| `getRecord` | Fetch record with all field values, computed fields, lookups resolved |
| `getRecordForEdit` | Fetch record prepped for edit view |
| `bulkUpdateRecords` | Update multiple records in one operation |
| `getRecordHistory` | Retrieve field change history for a record |
| `getRecordComments` | Fetch comments on a record |
| `addComment` | Add a comment to a record |
| `mentionUser` | Mention handling within comments |
| `getRecordAttachments` | List file attachments for a record |
| `getRelatedRecords` | Fetch related records via lookup relationships |

### lead-actions.ts (`src/actions/standard/lead-actions.ts`)

Lead-specific operations:
- Lead conversion (Lead → Contact + Account + Opportunity)
- Lead assignment rules
- Lead source tracking
- Lead status progression

### export-actions.ts (`src/actions/standard/export-actions.ts`)

- Export records to CSV/Excel
- Field selection and mapping
- Bulk export with filtering

### dashboard-actions.ts (`src/actions/standard/dashboard-actions.ts`)

| Function | Description |
|----------|-------------|
| `getMetricData` | Aggregates (count, sum, avg, min, max) over records with filters, owner scope, permissions |
| `getListWidgetData` | Retrieves list of records for list widget with columns, sorting, lookup resolution |
| `getChartData` | Groups records by picklist field, computes counts or sums for chart visualizations |

All dashboard actions respect:
- Organization scoping
- Permission checks (`read`, `viewAll`)
- Record-level access filtering (`buildRecordAccessFilter`)
- Owner scope filtering (mine/queue/any)
- Custom filter expressions (ALL/ANY/CUSTOM logic)

### import-actions.ts (`src/actions/standard/import-actions.ts`)

- Create/import job records
- Parse uploaded file data
- Queue processing of import rows

### import-processing.ts (`src/actions/standard/import-processing.ts`)

- Background processing of import jobs
- Row-by-row validation and insertion
- Error tracking per row

### record-actions.ts Additional Helpers

- `getFieldDisplayValue` - resolves field display values
- `filterCandidateIdsByCustomLogicMatches` - custom boolean expression evaluation for filters

---

## 7. Permissions Engine

### permissions.ts (`src/lib/permissions.ts`)

| Export | Description |
|--------|-------------|
| `checkPermission` | Checks if a user has a specific permission on an object (read, create, edit, delete, viewAll, modifyAll, modifyListViews) |
| `ObjectAccessSummary` | Aggregated access level for a user/object pair |
| `PermissionContext` | Contextual permission evaluation |
| `getUserObjectPermissions` | Get all object permissions for a user |
| `canUserViewAllRecords` | ViewAll check |
| `canUserModifyAllRecords` | ModifyAll check |

### record-access.ts (`src/lib/record-access.ts`)

| Function | Description |
|----------|-------------|
| `buildRecordAccessFilter` | Builds Prisma WHERE filter for record-level access (owner/queue sharing) |
| `getUserQueueIds` | Get all queue IDs a user belongs to |
| `getUserGroupIds` | Get group IDs for a user |
| `getSharedRecordIds` | Records explicitly shared with a user |
| `RecordAccessScope` | Ownership-based scoping (owner, role hierarchy, sharing) |

### sharing-rule-recompute.ts (`src/lib/sharing-rule-recompute.ts`)

- Recomputes `RecordShare` entries when sharing rules change
- Handles role hierarchy propagation
- Cascades ownership-based sharing

---

## 8. UI Components

### Layout System

| Component | Location | Description |
|-----------|----------|-------------|
| `Auth Layout` | `src/app/auth/layout.tsx` | Layout for auth pages (login, register, password reset) |
| `Standard Sidebar` | `src/components/standard/standard-sidebar.tsx` | Navigation sidebar with app nav items, object links |
| `Standard Shell` | `src/components/standard/standard-shell.tsx` | Page shell wrapping content with header, sidebar, main |
| `Record Form` | `src/components/standard/record-form.tsx` | Dynamic form for create/edit records using page layouts |
| `Record Detail` | `src/components/standard/record-detail.tsx` | Read-only record view with field rendering, tabs, related lists |
| `Data Table` | `src/components/standard/data-table.tsx` | Paginated, sortable table with column config, search, bulk actions |
| `List View` | `src/components/standard/list-view.tsx` | Full list view page with view mode switching (table/kanban) |
| `Dashboard` | `src/components/standard/dashboard.tsx` | Dashboard container with responsive widget grid |

### Dashboard Widgets (`src/components/standard/dashboard/`)

| Widget | Type | Description |
|--------|------|-------------|
| `metric-widget.tsx` | Metric (`use client`) | Displays aggregated counts (count/sum/avg/min/max) with configurable color theme, icon, owner scope, filters |
| `list-widget.tsx` | List (`use client`) | Displays a table of records with configurable columns, sorting, lookup field resolution, clickable record links |
| `chart-widget.tsx` | Chart (`use client`) | Renders bar/line/area/pie charts using recharts; groups data by picklist field; supports count or sum aggregations, configurable themes/colors/icons |
| `WIDGET_THEMES` | Config | 16 named color themes (ocean, sunset, forest, berry, midnight, royal, lavender, mint, coral, amber, sky, rose, lime, indigo, slate) for widgets |

### UI Theme System (`src/lib/ui-themes.ts`)

- `WIDGET_THEMES`: Tailwind CSS class map per theme (light/dark variants for backgrounds, text, borders)
- `CHART_COLORS`: Per-theme color palette arrays for chart rendering

### shadcn/ui Primitives (`src/components/ui/`)

- Standard set: Card, Table, Button, Input, Badge, Dialog, DropdownMenu, Form, Label, Select, Tabs, Tooltip, etc.

### Auth Components

| Component | Description |
|-----------|-------------|
| `clean-minimal-sign-in.tsx` | Clean sign-in form component |
| `clean-minimal-register.tsx` | Clean registration form component |

---

## 9. API Routes (`src/app/api/`)

### Auth Routes

| Path | Method | Description |
|------|--------|-------------|
| `/api/auth/[...all]` | GET/POST | BetterAuth route handler (sign in, sign up, sign out, callbacks) |

### Files API

| Path | Method | Description |
|------|--------|-------------|
| `/api/files/upload` | POST | File upload endpoint with size/type validation, S3/local storage, returns file metadata |

### Search API

| Path | Method | Description |
|------|--------|-------------|
| `/api/search/global` | GET | Global search across multiple objects; returns matches scoped to current user's permissions |

### Fields API

| Path | Method | Description |
|------|--------|-------------|
| `/api/fields` | GET | Fetch field definitions for a given object; used for dynamic form and view rendering |

### Notifications API

| Path | Method | Description |
|------|--------|-------------|
| `/api/notifications` | GET | Fetch unread notifications for the current user |
| `/api/notifications/[id]/read` | POST | Mark notification as read |

---

## 10. Admin Features

### User Management (`src/actions/admin/user-actions.ts`)

| Function | Description |
|----------|-------------|
| `getUsers` | Paginated user list with org filtering |
| `createUser` | Admin-created user accounts |
| `updateUser` | Update user details, reset password |
| `deactivateUser` | Deactivate/reactivate user accounts |
| `getUserPermissionSets` | Get permission sets assigned to a user |

### Permission Sets (`src/actions/admin/permission-actions.ts`)

| Function | Description |
|----------|-------------|
| `getPermissionSets` | List all permission sets in org |
| `createPermissionSet` | Create a new permission set |
| `updatePermissionSet` | Edit permission set properties |
| `assignPermissionSet` | Assign permission set to user/group |
| `clonePermissionSet` | Clone existing permission set |
| `getPermissionSetDetail` | Get full permission set with object/app access |

### Object Manager

- Create/edit/delete object definitions
- Manage field definitions
- Configure page layouts and list views
- Define validation and duplicate rules
- Manage picklist options

### Seeding (`src/lib/seeding/create-org-template.ts`)

| Function | Description |
|----------|-------------|
| `createOrgTemplate` | Seeds standard objects (Lead, Contact, Account, Opportunity), default permission sets, apps, queues, and system settings for a new organization |

### Demo Data Seeder (`src/actions/standard/seed-demo-data.ts`)

- Seeds sample records for demonstration
- Creates users, records across all standard objects

---

## 11. Import & Data Processing

### Import Workflow

1. **Upload**: Files uploaded via `/api/files/upload`, stored temporarily
2. **Job Creation**: `ImportJob` record created with mode (INSERT/UPDATE/UPSERT)
3. **Parsing**: `import-processing.ts` parses file rows, maps to field definitions
4. **Validation**: Per-row validation against field types and validation rules
5. **Processing**: Records created/updated in batches
6. **Results**: `ImportRow` records track success/failure per row with error messages

### Import Actions (`src/actions/standard/import-actions.ts`)

| Function | Description |
|----------|-------------|
| `createImportJob` | Initialize import job |
| `getImportJob` | Get job status and results |
| `cancelImportJob` | Cancel running import |

### Import Processing (`src/actions/standard/import-processing.ts`)

| Function | Description |
|----------|-------------|
| `processImportJob` | Main processing loop |
| `parseFieldValue` | Type-convert field values |
| `validateRow` | Validate a row against schema |

---

## 12. Export Capabilities

### Export Actions (`src/actions/standard/export-actions.ts`)

| Function | Description |
|----------|-------------|
| `exportRecords` | Export filtered record set to CSV |
| `getExportFields` | Get available fields for export |
| `exportRecordDetails` | Export full record details |

- CSV format export
- Field selection mapping
- Filtered by list view criteria
- Respects record-level permissions

---

## 13. Testing

### Test Suite (`tests/`)

| File | Scope |
|------|-------|
| `org-isolation.test.ts` | Multi-tenant data isolation tests |
| `middleware.test.ts` | Middleware CSRF and rate-limiting tests |
| `auth-context.test.ts` | Authentication context tests |

### Test Framework

- Jest
- Command: `bun test` (via `package.json` `test` script → `bunx jest`)

---

## 14. Key Architectural Patterns

### EAV (Entity-Attribute-Value)

- `ObjectDefinition` defines entities (Lead, Contact, etc.)
- `FieldDefinition` defines attributes
- `FieldData` stores actual values per record
- `Record` is the universal entity row
- Enables runtime customization without database migrations

### Server Actions First

- All data mutations go through `use server` Server Actions
- No client-side direct DB access
- Type-safe with Zod validation

### Permission Cascading

1. Check `ObjectPermission.allowRead/ViewAll` at permission set level
2. If no `viewAll`, apply `buildRecordAccessFilter` for record ownership/sharing
3. Apply `SharingRule` computed grants via `RecordShare`

### Rate Limiting Strategy

- In-memory `RateLimiter` for single-instance deployments
- Redis-backed `RedisRateLimiter` for distributed/vercel deployments
- Applied primarily to auth endpoints (login, register)

### Dashboard Widgets

- Type-safe via TypeScript interfaces
- Configurable filters with ALL/ANY/CUSTOM logical operators
- Owner scope filtering (mine/queue/any)
- Theme-aware rendering using `WIDGET_THEMES` and `CHART_COLORS`
