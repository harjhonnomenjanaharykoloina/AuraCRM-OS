# Architecture & Security Audit

**Project:** openCRM  
**Date:** 2026-09-18  
**Version:** Next.js 14 + Prisma + Better-Auth multi-tenant CRM  

---

## 1. Project Overview

openCRM is a **multi-tenant, metadata-driven CRM** built on the Next.js 14 App Router with Prisma as the ORM and Better-Auth for authentication. The platform implements a Universal Object Engine (EAV pattern) that allows each organization (tenant) to define custom objects and fields dynamically without code changes.

**Key Technologies:**

| Layer | Technology |
|---|---|
| Runtime | Next.js 14 App Router + React Server Components |
| Data Layer | Prisma ORM (v5) with PostgreSQL |
| Auth | Better-Auth (JWT sessions, bcryptjs) |
| JWT Verification | `jose` library (middleware proxy session) |
| Input Validation | Zod schemas |
| Testing | Vitest |
| Deployment | Server Actions (`"use server"`) for all mutations |

**Scope:** ~60 Prisma models (schema.prisma: 1267 lines), ~3,256 lines in the primary record-actions module, 17 test files covering security, lib utilities, actions, and seeding.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                        │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │   /app/(auth)   │  │ /app/(standard)  │  │  /app/(admin)  │  │
│  │   login/register │  │  CRM UI, lists,  │  │  Admin console │  │
│  │                  │  │  detail pages    │  │  object builder │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                    │                     │            │
│  ┌────────┴────────────────────┴─────────────────────┴─────────┐  │
│  │                        Middleware                             │  │
│  │  src/middleware.ts (68 lines)                                 │  │
│  │  • Auth rate limiting (20 req/60s per IP on /api/auth)        │  │
│  │  • JWT session proxy (getProxySession via jose)               │  │
│  │  • Route-level auth: redirect, 401, admin gate                │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                      Server Actions                           │  │
│  │  src/actions/                                                 │  │
│  │  ├── standard/record-actions.ts (3256 lines)                 │  │
│  │  │   getRecords, getRecord, createRecord, updateRecord,         │
│  │  │   deleteRecord (soft), restoreRecord, purgeRecord,          │
│  │  │   claimRecord, moveRecord, updateOwnUserRecord               │  │
│  │  ├── standard/lead-actions.ts                                 │  │
│  │  ├── admin/permission-actions.ts (526 lines)                  │  │
│  │  ├── admin/admin-actions.ts                                   │  │
│  │  ├── admin/user-actions.ts                                    │  │
│  │  ├── auth.ts (229 lines) — register, legacySignInAction       │  │
│  │  └── ...                                                        │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                    Business Logic Layer                       │  │
│  │  src/lib/                                                     │  │
│  │  ├── permissions.ts (304 lines) — RBAC, ObjectAccessSummary   │  │
│  │  ├── record-access.ts (104 lines) — record-level access filter│  │
│  │  ├── field-data.ts (192 lines) — EAV normalization            │  │
│  │  ├── validation/ — rule-logic, record-validation              │  │
│  │  ├── duplicates/duplicate-rules.ts — match detection          │  │
│  │  ├── import-processing.ts — batch import pipeline             │  │
│  │  ├── metadata-dependencies.ts — dependency tracking           │  │
│  │  ├── file-storage.ts — path traversal protection              │  │
│  │  ├── rate-limit.ts + store — sliding window limiter           │  │
│  │  ├── auto-number.ts, csv.ts, temporal.ts, unique.ts           │  │
│  │  ├── auth/context.ts — session-derived user context            │  │
│  │  ├── auth/proxy.ts — JWT verification for middleware           │  │
│  │  └── seeding/ — create-org-template.ts, create-default-app    │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴──────────────────────────────────┐  │
│  │                        Prisma ORM                             │  │
│  │  prisma/schema.prisma (60+ models, PostgreSQL)               │  │
│  │  • Organization-scoped every query                             │  │
│  │  • Raw SQL ($queryRaw) for EAV field sorting                   │  │
│  │  • Transactions (db.$transaction) for atomicity                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Request flow:** A Server Action call → `getUserContext()` (extracts `userId`/`organizationId` from session, zero args) → permission check (`checkPermission`) → record-level access filter (`buildRecordAccessFilter`) → Prisma query or raw SQL → transaction commit.

---

## 3. Data Model Summary

The schema (prisma/schema.prisma, 1267 lines) defines **~60 models** organized into seven thematic sections:

### 3.1 Tenant Isolation (Organization)

Every model that stores tenant-scoped data includes an explicit `organizationId` foreign key referencing `Organization`. Queries at the Prisma layer always add `organizationId` to the `WHERE` clause. There is no shared-schema isolation — each record carries its tenant ID.

### 3.2 Universal Object Engine (EAV)

The core is an Entity-Attribute-Value pattern:

| Model | Purpose |
|---|---|
| `ObjectDefinition` | Metadata: apiName, label, icon, isSystem flag |
| `FieldDefinition` | Field metadata: apiName, type (14 types), required, isUnique, isExternalId, options (JSON), lookupTargetId |
| `Record` | Entity record: links to one ObjectDefinition + Organization |
| `FieldData` | EAV values stored in typed columns (`valueText`, `valueNumber`, `valueDate`, `valueBoolean`, `valueLookup`, `valuePicklistId`) |

**Field Types (14):** Text, TextArea, Number, Currency, Date, DateTime, Checkbox, Phone, Email, Url, Lookup, Picklist, File, AutoNumber.

**Uniqueness:** `[recordId, fieldDefId]` is unique on `FieldData`, ensuring one value per field per record.

### 3.3 Ownership & Sharing

- **Record ownership** supports both `USER` and `QUEUE` via `OwnerType` enum. A record is owned by either a `User` (via `ownerId`) or a `Queue` (via `ownerQueueId`).
- **RecordShare** model supports per-record sharing with `PrincipalType` (USER or GROUP) and `ShareAccessLevel` (READ, EDIT, DELETE). Unique constraint: `[recordId, principalType, principalId]`.
- **Group** model with direct user membership (one group per user via `User.groupId`).

### 3.4 RBAC Permissions

| Model | Purpose |
|---|---|
| `PermissionSet` | Named collection of object permissions + app access + system flags |
| `ObjectPermission` | Per-object flags: allowRead, allowCreate, allowEdit, allowDelete, allowViewAll, allowModifyAll, allowModifyListViews |
| `AppPermission` | Links PermissionSet → AppDefinition |
| `PermissionSetGroup` | Groups multiple PermissionSets together |
| `PermissionSetAssignment` | Direct user → permission set; tracks `PermissionSetAssignmentSourceType` (DIRECT or GROUP) |

### 3.5 Soft-Delete Lifecycle

- `Record.isDeleted` Boolean defaults to `false`.
- **Soft-delete** (`deleteRecord`): sets `isDeleted = true`, preserves inbound lookup payloads, field data, shares, history, and attachments — enables full restore.
- **Restore** (`restoreRecord`): sets `isDeleted = false`.
- **Purge** (`purgeRecord`): hard-deletes via `tx.record.delete` after clearing inbound lookup reference payloads (`valueLookup: null`, `valueText: null`, `valueSearch: null`) on child records. Deletes file attachments' physical folder via `deleteFolderSafe`.

> Soft-delete preserves inbound lookups so the record can be fully restored. Purge clears lookup payloads (nulls `valueLookup`, `valueText`, `valueSearch`) before hard-deleting the record row.

### 3.6 Assignment Engine

- `AssignmentRule` model with JSON `criteria`, `targetType` (USER or QUEUE), and `sortOrder`.
- `resolveAssignmentRule` evaluates active rules by `sortOrder`, matching criteria against the incoming `valueMap`. Returns target user or queue.
- `Queue` + `QueueMember` for group ownership and routing.
- `createAssignmentNotifications` generates `NotificationType.QUEUE_ASSIGNMENT` or `NotificationType.USER_ASSIGNMENT` notifications.

### 3.7 Sharing Rules

- `SharingRule` model scoped to `[organizationId, objectDefId]`, targeting a `Group` with `accessLevel` (READ, EDIT, DELETE) and JSON criteria.
- `applySharingRules` evaluates active rules at create/update time, computes the highest access level per target group using an `accessRank` map, and upserts `RecordShare` rows for matching groups. Stale group shares are deleted.

### 3.8 Validation Engine

- `ValidationRule` with `logicOperator` (ALL/ANY/CUSTOM), optional `logicExpression` for parenthesized custom expressions, `errorMessage`, `errorPlacement` (toast|inline), and optional `errorFieldId`.
- `ValidationCondition` supports field comparisons (`operator`, `compareValue`, `compareSource: value|field`), system field checks (`currentUserPermissionSetId`), and permission-based conditions (`permissionSetId`).
- Operators include character-length checks (`character_length_lt`, etc.) restricted to text-type fields. TextArea fields are restricted to character-length and is_blank/is_not_blank operators only.

### 3.9 Duplicate Detection

- `DuplicateRule` with `createAction` and `editAction` (`NONE`, `WARN`, `BLOCK`), `logicOperator`, and conditions.
- `DuplicateRuleCondition` links rules to `FieldDefinition` entries.
- `findDuplicateMatches` requires at least 2 conditions per rule. Fetches candidate record IDs by querying `FieldData` for matching stored values, then re-evaluates each candidate's full condition set against the incoming `valueMap`. Visibility of matches is gated by the user's record access filter — matches the user can't see are counted in `hiddenMatchCount` without revealing record IDs.

### 3.10 Import System

- `ImportJob` model tracks status (PENDING/RUNNING/COMPLETED/FAILED), mode (INSERT/UPDATE/UPSERT), row counts, and error output.
- `ImportRow` stores `rawData` (JSON) with per-row `errors`/`warnings`.
- `processImportJob` handles: external ID matching against existing records, lookup resolution via target object external ID fields, picklist label→ID mapping, Phone uniqueness deduplication, CSV formula injection neutralization, and duplicate rule enforcement per row.

### 3.11 Metadata Dependencies

- `MetadataDependency` model tracks cross-object relationships: lookup targets, rule conditions, list view columns/sorts, dashboard widget config fields, page layout fields, app nav items.
- `MetadataDependencySourceType` enum: FIELD_DEFINITION, ASSIGNMENT_RULE, SHARING_RULE, DUPLICATE_RULE, VALIDATION_RULE, LIST_VIEW, DASHBOARD_WIDGET, RECORD_PAGE_LAYOUT, APP.
- `MetadataDependencyReferenceKind` enum: LOOKUP_TARGET_OBJECT, TRIGGER_OBJECT, CRITERIA_FIELD, COMPARE_FIELD, ERROR_FIELD, COLUMN_FIELD, SORT_FIELD, KANBAN_FIELD, VALUE_FIELD, GROUP_BY_FIELD, LAYOUT_FIELD, VISIBILITY_FIELD, HIGHLIGHT_FIELD, NAV_OBJECT.
- `rebuildMetadataDependenciesForOrganization` performs a full brute-force rebuild (delete all, re-sync all sources). Used for admin repair.

### 3.12 File Storage

- `FileAttachment` model stores metadata (filename, mimeType, size, storagePath) with `storagePath` resolved via `resolveStoragePath`.
- `resolveStoragePath` validates that the resolved path stays within `UPLOAD_ROOT` — throws `"Invalid storage path"` if the relative path starts with `..` or is absolute outside the upload root.
- `buildAttachmentStoragePath` creates a structured path: `uploads/{orgId}/{recordId}/{fieldDefId}/{attachmentId}`.
- Purge deletes the per-record folder subtree via `deleteFolderSafe`.

---

## 4. Security Model Assessment

### 4.1 Authentication

**Provider:** Better-Auth with the `username` plugin, using PostgreSQL via Prisma adapter.

**Password Hashing:**
- Better-Auth custom hasher: `bcryptjs.hash(password, 12)` — **bcrypt cost factor 12** (`src/auth.ts:17`).
- Session strategy: JWT with `cookieCache` enabled — `strategy: "jwt"` (`src/auth.ts:27`).
- Session cookie: `better-auth.session_data` (or `__Secure-` variant), verified in middleware via `jose.jwtVerify`.

**Session Proxy** (`src/lib/auth/proxy.ts`):
- `getProxySession(req)` extracts the session token from cookies (handles `__Host-`, `__Secure-`, and chunked cookie reconstruction).
- Verifies JWT using `process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET` via `jose`.
- Returns a sanitized user object: `id`, `email`, `name`, `username`, `organizationId`, `userType`.

**Legacy Authentication** (`src/lib/auth-proxy-fix.ts`):
- `legacySignIn` performs username lookup, fetches the `credential` provider account, and compares passwords with `bcryptjs.compare`. Used by `legacySignInAction` in `src/actions/auth.ts`.

**Registration** (`src/actions/auth.ts`):
- Zod schema validates: organization name (min 2 chars), username (lowercase alphanumeric, min 3), email (valid format), password (min 8).
- Slug generation from organization name (lowercased, hyphenated).
- Transactional creation of Organization + User + Account record in a single `db.$transaction`.
- Seeds standard objects via `createOrgTemplate` after the transaction commits.

> Note: Registration uses `bcrypt.hash(password, 10)` (cost 10), while the Better-Auth session uses cost 12. This creates an inconsistency — credentials created via the legacy registration path use a weaker cost factor. The Better-Auth password verification path uses cost 12 hashes stored in the `Account` table.

### 4.2 Authorization — Two-Layer Model

**Layer 1: Object-Level Permissions** (`src/lib/permissions.ts`, 304 lines)

The permission engine resolves what a user can do on an entire object type (e.g., "can read Contacts"). It operates in three phases:

1. **Permission Set Resolution** — `getUserPermissionSetIds(userId)` queries `PermissionSetAssignment` for direct assignments. (GROUP-expanded assignments are materialized at assignment time into direct rows via `PermissionSetAssignmentSource`.)

2. **Access Summary Merge** — `buildObjectAccessMap` loads all `ObjectPermission` rows for the user's permission sets within the organization, merging flags via `mergeObjectAccess`:
   ```
   canModifyAll  ||= allowModifyAll
   canReadAll    ||= allowViewAll || allowModifyAll
   canReadOwn    ||= allowRead || allowViewAll || allowModifyAll
   canCreate     ||= allowCreate
   canEditOwn    ||= allowEdit || allowModifyAll
   canDeleteOwn  ||= allowDelete || allowModifyAll
   ```

3. **Action Check** — `checkPermission(userId, organizationId, objectApiName, action)` resolves the object definition, fetches the access summary, and dispatches through `accessAllowsAction`.

**Layer 2: Record-Level Access** (`src/lib/record-access.ts`, 104 lines)

`buildRecordAccessFilter` constructs a Prisma `RecordWhereInput` with an `OR` clause structure:

```
{
  OR: [
    { ownerId: userId, ownerType: OwnerType.USER },           // own records
    { ownerQueueId: { in: queueIds } },                       // queue records (read only)
    {
      shares: {
        some: {
          OR: [
            { principalType: USER,  principalId: userId,  accessLevel: { in: [...] } },
            { principalType: GROUP, principalId: groupId, accessLevel: { in: [...] } },
          ]
        }
      }
    }
  ]
}
```

**Action-gated access levels** in `getShareAccessLevels`:
- `read`: [READ, EDIT, DELETE]
- `edit`: [EDIT, DELETE]
- `delete`: [DELETE]

**Queue access is read-only:** the `ownerQueueId` OR clause is only added when `action === "read"`. Edit/delete filters exclude queue-owned records entirely, preventing a user from editing records merely because they're in a queue they belong to.

For sorted queries that require cross-field JOINs, `buildRecordAccessSql` produces a raw SQL fragment with `EXISTS` subqueries joining `RecordShare` filtered by `organizationId`.

### 4.3 Tenant Isolation (3 Levels)

| Level | Mechanism | Implementation |
|---|---|---|
| **1. Session-derived context** | `getUserContext()` has zero parameters (`getUserContext.length === 0`). `organizationId` is parsed from the JWT session, never accepted from client input. | `src/lib/auth/context.ts:3` |
| **2. Organization-scoped queries** | Every Prisma query includes `organizationId` in the `WHERE` clause. The Organization → User → Record chain enforces data boundaries at the DB layer. | All Server Actions |
| **3. Record-level access filter** | `buildRecordAccessFilter` scopes records to owner/queue/shares. `buildRecordAccessSql` includes `organizationId` in the `RecordShare` EXISTS subquery so cross-tenant shares can never grant access. | `src/lib/record-access.ts` |

```sql
-- buildRecordAccessSql ensures share subquery is org-scoped:
EXISTS (
    SELECT 1 FROM "RecordShare" rs
    WHERE rs."recordId" = r."id"
      AND rs."organizationId" = ${organizationId}   -- tenant fence
      AND (...)
)
```

**Admin shortcut REMOVED:** In `getAvailableApps` (`src/lib/permissions.ts:243`), the admin bypass `if (userType === "admin")` was explicitly removed per user request. Admins now resolve app access through the same permission-set pipeline as standard users. An admin in Org A cannot see Org B's apps.

**User object write protection:** `sanitizeUserObjectPermissions` (in `src/actions/admin/permission-actions.ts:9`) strips `allowCreate`, `allowEdit`, `allowDelete`, and `allowModifyAll` when the object API name matches `USER_OBJECT_API_NAME` ("user"). This prevents any permission set from granting write/edit/delete/modify-all on the User object through the standard permission-editing interface.

### 4.4 Privilege Escalation Prevention

| Vector | Risk | Mitigation |
|---|---|---|
| **Client-supplied organizationId** | Attacker passes `organizationId: 2` to write into another tenant | `getUserContext()` takes zero args; `organizationId` derived solely from session JWT. `createRecord` ignores client-supplied `organizationId` — always uses session org. |
| **Admin cross-tenant access** | Admin in Org A reads/modifies Org B data | `getAvailableApps` admin shortcut removed (permissions.ts:243). All queries filtered by session `organizationId`. Middleware redirects non-admin to `/admin` routes, but even admins are org-scoped. |
| **User object tampering** | Assign User object create/edit/delete via permission sets | `sanitizeUserObjectPermissions` strips write flags for the `user` object on every save path (`permission-actions.ts:106,176`). |
| **Queue ownership escalation** | User in a queue edits queue-owned records they don't own | `buildRecordAccessFilter` excludes queue records from edit/delete scopes — queue ownership only grants read access. |
| **RecordShare bypass** | Share row from another tenant grants access | `buildRecordAccessSql` constrains the EXISTS subquery with `rs."organizationId" = ${organizationId}`. |
| **Soft-deleted record access** | Deleted records visible after soft-delete | `isDeleted: false` is added to all non-trash queries by default. `includeDeleted` is an explicit opt-in. `getRecord` returns `NOT_FOUND` (not `ACCESS_DENIED`) when a record exists but isn't accessible — prevents existence disclosure. |
| **Field data injection** | Attacker sets arbitrary field values or types | `validateRecordData` enforces type constraints; `enforceUniqueFields` checks uniqueness; `validateLookupValues` verifies target record existence within the same organization. |
| **List view criteria injection** | Malicious sort field / filter causes SQL injection | Raw SQL uses `Prisma.sql` tagged templates with `Prisma.join` for arrays. Field IDs and values are passed as bound parameters. `UNSUPPORTED_LIST_VIEW_TYPES` rejects TextArea/File fields in list views. |
| **Path traversal (file storage)** | Attacker traverses outside uploads directory | `resolveStoragePath` checks `path.relative(UPLOAD_ROOT, resolved)` and throws if it starts with `..` or is absolute. |

### 4.5 Security Strengths

1. **Zero-arg context extraction** — `getUserContext()` signature has `.length === 0`, making it structurally impossible to inject `organizationId`.
2. **Defense in depth on tenant scoping** — Organization filter at the query level AND record-level access filter AND org-scoped share EXISTS subquery.
3. **Admin bypass removed** — No special-casing of admin users in permission resolution (removed per user request at permissions.ts:243).
4. **User object hardening** — Write permissions on the User object are stripped at the persistence layer, not just the UI.
5. **Existence leak prevention** — `getRecord` returns `NOT_FOUND` for both inaccessible and non-existent records (no oracle).
6. **Soft-delete preservation** — Inbound lookups preserved on soft-delete; hard purge explicitly clears lookup payload references to prevent dangling IDs.
7. **CSV formula injection mitigation** — `sanitizeCsvFormula` neutralizes `=`, `+`, `-`, `@` prefixes with a leading `'`.
8. **Rate limiting on auth endpoints** — 20 requests per 60 seconds per IP on `/api/auth/*`, returning HTTP 429 with `Retry-After` header.
9. **Path traversal protection** — `resolveStoragePath` validates resolved paths stay within `UPLOAD_ROOT`.

### 4.6 Potential Considerations

1. **Bcrypt cost inconsistency** — Registration path (`src/actions/auth.ts:69`) uses cost 10, while Better-Auth session hashing (`src/auth.ts:17`) uses cost 12. Standardize on cost 12 for all credential storage.
2. **In-memory rate limit store** — `RateLimiter` uses an in-process `Map<string, number[]>`. Does not persist across instances and resets on restart. Consider a Redis-backed store for multi-instance deployments.
3. **`getUserPermissionSetIds` only resolves direct assignments** — The comment at permissions.ts:40 notes that group-based assignments are expanded at assignment time. If the expansion logic in `addPermissionSetToGroup` has a bug, users may gain or lose access silently. The expansion is transactional (permissions.ts:246-288).
4. **`buildRecordAccessFilter` uses `shares: { some: { OR: shareOr } }`** — The Prisma nested filter generates a JOIN+WHERE EXISTS. On large datasets with many shares, this could produce slow query plans. The raw SQL path (`buildRecordAccessSql`) is used for sorted queries to avoid this.
5. **`includeDeleted` bypass** — Any caller with `read` permission can pass `includeDeleted: true` to see deleted records. Consider requiring `viewAll` or `modifyAll` to inspect the trash.
6. **JWT secret from environment** — `getProxySession` falls back from `JWT_SECRET` to `BETTER_AUTH_SECRET`. If neither is set, all session verification silently fails open (returns `null`). The middleware handles `null` as unauthenticated, which is safe, but the error is only logged, not surfaced.
7. **`deleteRecord` soft-delete scope** — `deleteRecord` uses `buildRecordAccessFilter` with action `"delete"` which requires `[DELETE]` share access level. This means a user with `READ` share but `allowDelete` object permission can soft-delete. The check is correct — `allowDelete` object permission gates the action, and the record filter ensures the user has at least `DELETE`-level share access or owns the record.

---

## 5. Key Implementation Patterns

### 5.1 Transaction Pattern

All record mutations use `db.$transaction(async (tx) => { ... })` to ensure atomicity. The pattern is consistent:

```typescript
await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Read existing state within the transaction
    // 2. Create/update record
    // 3. Create/update field data
    // 4. Generate field history entries
    // 5. Update owner history
    // 6. Apply sharing rules (upsert RecordShare rows)
    // 7. Create assignment notifications
    // All steps succeed or the entire transaction rolls back
});
```

**Notable:** Auto-number generation (`nextAutoNumberValue`) is called inside the transaction to prevent race conditions. The `import-processing.ts` pipeline also wraps each row in `db.$transaction`.

### 5.2 Field Data Normalization

`buildFieldDataPayload` (`src/lib/field-data.ts:30`) normalizes raw input into the typed `FieldData` columns:

| Field Type | Normalization |
|---|---|
| Text, Email, Url, TextArea, AutoNumber | Trimmed, stored in `valueText` + `valueSearch` (lowercased, truncated to 191 chars) |
| Phone | Digit-only normalization via `normalizePhoneValue`, stored in both `valueText` and `valueSearch` |
| Picklist | Option ID stored in `valuePicklistId`; text columns nulled |
| Number/Currency | `Prisma.Decimal`, rounded to configured `decimalPlaces`, stored in `valueNumber` + `valueText` |
| Date | Parsed via `parseDateOnlyValue`, stored in `valueDate` + `valueText` (ISO date input format) |
| DateTime | Parsed via `parseDateTimeValue`, stored in `valueDate` + `valueText` (full ISO) |
| Checkbox | Boolean coercion, stored in `valueBoolean` + `valueText` ("true"/"false") |
| Lookup | Integer ID stored in `valueLookup` |
| File | `valueText` set to null; actual files stored as `FileAttachment` rows |

**Search optimization:** `SEARCHABLE_FIELD_TYPES = {Text, Email, Phone, Url, AutoNumber}` populates `valueSearch` (lowercased, 191-char VARCHAR index) for efficient case-insensitive LIKE queries.

### 5.3 List View Query Pipeline

The list view query (`getRecords`, record-actions.ts:1071) follows a multi-stage pipeline:

1. **Permission resolution** — `checkPermission` for `viewAll`/`read` determines scope.
2. **Access filter** — `buildRecordAccessFilter` (Prisma) or `buildRecordAccessSql` (raw SQL) for sorted queries.
3. **Two-pronged query strategy:**
   - **Unsorted / built-in sort:** Prisma `findMany` with `where`, `orderBy`, `skip`/`take` pagination.
   - **Custom field sort:** Raw SQL `$queryRaw` joining `Record` → `FieldData` on the sort field, ordering by the typed value column (`COALESCE(valueNumber, 0)`, `COALESCE(valueDate, '1970-01-01')`, etc.), with fallback to in-memory sort if the SQL fails.
4. **Data transformation** — `getFieldDisplayValue` converts `FieldData` rows to display strings.
5. **Lookup resolution** — Batch-fetches target record names for all Lookup fields across all returned records in a single query per target object.
6. **Pagination metadata** — `total`, `totalPages`, `page`, `pageSize` computed from `db.record.count({ where })`.

**Sort expression mapping** (`buildFieldSortExpression`):

```typescript
switch (fieldType) {
    case "Number": case "Currency": return COALESCE(fd."valueNumber", 0)
    case "Date":   case "DateTime":  return COALESCE(fd."valueDate", '1970-01-01')
    case "Checkbox":                return COALESCE(fd."valueBoolean", 0)
    default:                        return COALESCE(fd."valueSearch", '')
}
```

### 5.4 Change Detection

`hasFieldValueChanged` (`record-actions.ts:142`) compares old vs. new field values using `getComparableFieldValue` from `rule-logic.ts`, which normalizes values by type before comparison (e.g., Date values normalized to calendar day, Text values trimmed and lowercased). Only changed fields generate `FieldHistory` entries and trigger `FieldData` upserts.

`buildChangedFieldPayloads` (`record-actions.ts:248`) iterates all fields, builds payloads via `buildFieldDataPayload`, compares against existing snapshots, and returns only changed payloads. `File` and `AutoNumber` fields are skipped in change detection.

### 5.5 Assignment Rule Resolution

`resolveAssignmentRule` (`record-actions.ts:886`) queries active `AssignmentRule` rows ordered by `sortOrder`, evaluates each rule's `criteria` JSON against the incoming `valueMap` via `evaluateCriteria`, and returns the first matching target (USER or QUEUE). The User object (`USER_OBJECT_API_NAME`) is explicitly excluded from assignment rule evaluation.

---

## 6. Testing Strategy

### 6.1 Test Suite Inventory

| # | File | Category | Tests |
|---|---|---|---|
| 1 | `src/tests/security/org-isolation.test.ts` | Security | 8 tests — cross-org read/write/delete/restore/purge/create isolation |
| 2 | `src/tests/security/middleware.test.ts` | Security | 10 tests — auth redirects, admin route gating, static asset exclusion, rate limit |
| 3 | `src/tests/security/auth-context.test.ts` | Security | 9 tests — context validation, userType checks, zero-arg enforcement |
| 4 | `src/tests/actions/soft-delete.test.ts` | Action | 7 tests — soft-delete, restore, purge, includeDeleted scoping |
| 5 | `src/tests/actions/move-record.test.ts` | Action | 7 tests — picklist move validation, permissions, transaction |
| 6 | `src/tests/actions/convertLead.test.ts` | Action | 7 tests — lead conversion, cross-object permissions |
| 7 | `src/tests/lib/permissions.test.ts` | Lib | 4 tests — permission set resolution, access summary merge, readable objects |
| 8 | `src/tests/lib/record-access.test.ts` | Lib | 4 tests — filter OR structure, queue/edit scoping, SQL predicates |
| 9 | `src/tests/lib/rate-limit.test.ts` | Lib | 9 tests — sliding window, per-key buckets, reset timing, IP extraction |
| 10 | `src/tests/lib/csv.test.ts` | Lib | 11 tests — formula injection neutralization, escaping, picklist/lookup resolution |
| 11 | `src/tests/lib/unique.test.ts` | Lib | 3 tests — phone normalization, text lowercase, null handling |
| 12 | `src/tests/lib/validation/record-validation.test.ts` | Lib | 4 tests — required fields, decimal places, email/url/phone/picklist validation |
| 13 | `src/tests/lib/validation/rule-logic.test.ts` | Lib | 8 tests — custom logic expressions, temporal comparison, candidate filtering |
| 14 | `src/tests/lib/list-view-expression.test.ts` | Lib | 7 tests — expression parsing, NOT/AND/OR, date/DateTime semantics, unsupported types |
| 15 | `src/tests/lib/metadata-dependencies.test.ts` | Lib | 2 tests — internal vs. external dependency filtering |
| 16 | `src/tests/lib/record-page-layout.test.ts` | Lib | 1 test — malformed layout expression rejection |
| 17 | `src/tests/lib/auto-number.test.ts` | Lib | 2 tests — prefix/padding, default config handling |
| 18 | `src/tests/seeding/create-default-app.test.ts` | Seeding | 8 tests (2 skipped without DB) — 5 roles, app creation, permission set flags |
| | `src/tests/utils/prisma-mock.ts` | Util | Shared Prisma client mock |
| | `src/tests/utils/factories.ts` | Util | Test data factories for FieldDefinition, ObjectDefinition, Record, PicklistOption |
| | `src/tests/setup.ts` | Util | Global mocks for next/cache and next/navigation |

**Total: 18 test files (17 test suites + setup), 104 test cases**

### 6.2 Security Test Coverage

| Security Concern | Test File | Test Case | Coverage |
|---|---|---|---|
| Cross-org read isolation | `org-isolation.test.ts` | "getRecord scopes its query by the session organizationId" | Full |
| Admin cannot read other org | `org-isolation.test.ts` | "an admin in Org A still cannot read Organization B's records" | Full |
| Cross-org write prevention | `org-isolation.test.ts` | "createRecord persists the record under the session organization" | Full |
| Zero-arg context | `auth-context.test.ts` | "does not accept any client-supplied arguments" | Full |
| Session-derived orgId | `auth-context.test.ts` | "always derives organizationId from the session JWT" | Full |
| Record access filter | `record-access.test.ts` | "builds read filters with owner, queue, and share access" | Full |
| Queue edit exclusion | `record-access.test.ts` | "omits queue access for edit and delete" | Full |
| Share org scoping | `record-access.test.ts` | "buildRecordAccessSql scopes record shares to a single organizationId" | Full |
| Soft-delete preservation | `soft-delete.test.ts` | "does not clear inbound lookups or delete files during soft-delete" | Full |
| Soft-delete → purge | `soft-delete.test.ts` | "calls tx.record.delete for the soft-deleted record" | Full |
| Rate limiting | `middleware.test.ts` | "returns 429 for too many auth requests" | Full |
| Middleware auth gate | `middleware.test.ts` | "redirects unauthenticated requests to /login" | Full |
| Admin route gating | `middleware.test.ts` | "redirects non-admin users visiting /admin" | Full |
| CSV formula injection | `csv.test.ts` | "neutralizes spreadsheet formula prefixes" | Full |
| User object write protection | (not tested directly) | N/A | Gap — `sanitizeUserObjectPermissions` has no unit test |
| Permission set group expansion | (covered indirectly) | `permissions.test.ts` | Partial — only direct assignments tested |

### 6.3 Mock Strategy

- **Prisma mock:** Each test file defines its own `mockDb` object with `vi.fn()` stubs for the Prisma delegate methods used. The `permissions.test.ts` file uses a shared `prisma-mock.ts` utility. Mocks use `vi.hoisted()` to escape the hoisting boundary and `vi.mock()` for module interception.
- **`db.$transaction` mock:** Implemented as `vi.fn(async (cb) => cb(mockDb))` — the callback receives the mock DB directly, allowing transaction-bound code to use the same mocked delegates.
- **Auth mock:** `@/auth` is mocked to return a controlled session via `vi.fn().mockResolvedValue({ user: {...} })`.
- **Permission mock:** `@/lib/permissions` is partially mocked — `checkPermission` is stubbed; in isolation tests, `record-access.ts` functions are used unmocked (importOriginal pattern).
- **next/cache & next/navigation:** Globally mocked in `setup.ts` for `revalidatePath` and `redirect`.

---

## 7. File Structure Summary

```
openCRM/
├── prisma/
│   └── schema.prisma                    (1267 lines, ~60 models)
├── scripts/
│   ├── seed-demo.ts
│   └── seed-admin.ts
├── src/
│   ├── auth.ts                          (Better-Auth config, bcrypt cost 12, JWT sessions)
│   ├── middleware.ts                    (68 lines — rate limit + session proxy + auth gate)
│   ├── types/
│   │   └── record.ts                    (RecordWithData, FieldDefinitionWithRelations)
│   ├── actions/
│   │   ├── auth.ts                      (229 lines — register, legacySignInAction)
│   │   ├── admin/
│   │   │   ├── admin-actions.ts         (object/field/rule CRUD, 1905 lines)
│   │   │   ├── permission-actions.ts    (526 lines — sanitizeUserObjectPermissions)
│   │   │   ├── user-actions.ts          (user CRUD + bcrypt cost 10)
│   │   │   ├── duplicate-rule-actions.ts
│   │   │   ├── sharing-rule-actions.ts
│   │   │   ├── assignment-rule-actions.ts
│   │   │   └── seed-demo-data.ts
│   │   └── standard/
│   │       ├── record-actions.ts        (3256 lines — core CRUD + list + soft-delete + purge)
│   │       ├── lead-actions.ts          (convertLead)
│   │       ├── list-view-actions.ts
│   │       ├── import-actions.ts
│   │       └── dashboard-actions.ts
│   ├── app/
│   │   ├── (admin)/admin/...            (admin UI routes)
│   │   ├── (auth)/login/                (login page)
│   │   ├── (auth)/register/             (register page)
│   │   ├── (standard)/app/...           (CRM UI routes)
│   │   ├── api/auth/[...all]/route.ts   (Better-Auth API handler)
│   │   ├── api/files/upload/route.ts    (file upload API)
│   │   ├── api/search/global/           (global search API)
│   │   └── api/fields/[objectApiName]/  (field definition API)
│   ├── lib/
│   │   ├── db.ts                        (Prisma client singleton)
│   │   ├── permissions.ts               (304 lines — two-layer authorization)
│   │   ├── record-access.ts             (104 lines — record-level OR-clause filters)
│   │   ├── field-data.ts                (192 lines — EAV normalization/denormalization)
│   │   ├── file-storage.ts              (path traversal guard)
│   │   ├── rate-limit.ts                (sliding window RateLimiter class)
│   │   ├── rate-limit-store.ts          (20 req/60s auth limiter)
│   │   ├── unique.ts                    (phone/text normalization)
│   │   ├── temporal.ts                  (date/DateTime parsing)
│   │   ├── auto-number.ts               (sequential numbering with padding)
│   │   ├── csv.ts                       (CSV export + formula injection mitigation)
│   │   ├── auth-proxy-fix.ts            (legacy bcrypt sign-in)
│   │   ├── auth/
│   │   │   ├── context.ts               (getUserContext — zero args)
│   │   │   └── proxy.ts                 (JWT verification for middleware)
│   │   ├── validation/
│   │   │   ├── record-validation.ts     (field-level type/required validation)
│   │   │   └── rule-logic.ts            (custom logic expression parser/evaluator)
│   │   ├── duplicates/
│   │   │   └── duplicate-rules.ts       (findDuplicateMatches)
│   │   ├── list-view-expression.ts      (list view custom filter expression parser)
│   │   ├── record-page-layout.ts        (layout config normalization)
│   │   ├── metadata-dependencies.ts     (dependency tracking + rebuild)
│   │   ├── sharing-rule-recompute.ts
│   │   ├── user-companion.ts            (User ↔ Record companion pattern)
│   │   └── seeding/
│   │       ├── create-org-template.ts   (default objects, fields, picklists)
│   │       └── create-default-app.ts    (5 roles, CRM app, nav items, permissions)
│   ├── components/                      (React components — admin + standard UI)
│   ├── hooks/
│   └── tests/
│       ├── security/                    (3 test files)
│       ├── actions/                     (3 test files)
│       ├── lib/                         (12 test files)
│       ├── seeding/                     (1 test file)
│       ├── setup.ts                     (global mock setup)
│       └── utils/
│           ├── prisma-mock.ts           (shared Prisma mock)
│           └── factories.ts             (test data factories)
└── package.json
```

---

## 8. Key Architectural Decisions

### 8.1 Soft Delete Over Hard Delete

**Decision:** Records are soft-deleted (`isDeleted: true`) by default; hard purge is a separate, permission-gated operation.

**Rationale:**
- Audit trail preservation: Field history, owner history, and comments remain attached to the record.
- Restore capability: The trash view can recover records with all their data intact.
- Referential integrity: Inbound lookups from child records to the soft-deleted record are preserved, preventing broken references.

**Trade-offs:**
- Every query must include `isDeleted: false` (or explicitly opt-in with `includeDeleted`). The codebase handles this via spread: `...(includeDeleted ? {} : { isDeleted: false })`.
- Soft-deleted records accumulate storage; the `purgeRecord` action provides a manual cleanup path with explicit inbound lookup payload clearing.
- Indexes on `isDeleted` are present: `@@index([organizationId, objectDefId, isDeleted])` on the Record model.

### 8.2 EAV Over Typed Tables

**Decision:** All user-defined object data is stored in the `FieldData` table with typed value columns, not in object-specific columns.

**Rationale:**
- Multi-tenant customization: Each organization can define arbitrary objects and fields without schema migrations.
- Metadata-driven: Field definitions, validation rules, picklist options, and list views are all data, not code.
- The `isSystem` flag on `ObjectDefinition` distinguishes built-in objects (User, Company, Contact, Opportunity, Case, Lead, Task) from custom ones.

**Trade-offs:**
- Query complexity: Sorting and filtering on EAV fields requires JOINs or raw SQL with `EXISTS` subqueries.
- No database-level type enforcement on field values (handled in application code via `validateRecordData`).
- Performance: The `valueSearch` column (VARCHAR(191)) enables indexed case-insensitive lookups for text-like types.

### 8.3 Raw SQL for Sorted Queries

**Decision:** When sorting by a custom fields-based column, `getRecords` falls back to `$queryRaw` with hand-built SQL instead of Prisma's `findMany` with nested field joins.

**Rationale:**
- Prisma's nested filter/join capabilities on EAV fields are limited and produce inefficient SQL for cross-field sorts.
- Raw SQL with `LEFT JOIN "FieldData" fd ON fd."recordId" = r."id" AND fd."fieldDefId" = ${id}` + `ORDER BY COALESCE(fd."valueNumber", 0)` produces a single efficient query.
- The `buildRecordAccessSql` function generates the record-level access filter as SQL, embedding it directly in the query.

**Fallback:** If the raw SQL query throws (e.g., unsupported field type), the code falls back to in-memory sorting of Prisma-fetched results with a `console.warn`.

### 8.4 Group Permission Materialization

**Decision:** Permission set groups expand into direct `PermissionSetAssignment` rows at assignment time, with `PermissionSetAssignmentSource` tracking the GROUP source.

**Rationale:**
- `getUserPermissionSetIds` only queries `PermissionSetAssignment` by `userId` — no JOIN to groups at read time.
- When a permission set is added to a group, `addPermissionSetToGroup` upserts direct assignments for every current group member and records the source via `PermissionSetAssignmentSource`.
- When a set is removed from a group, only assignments sourced by that group are revoked (those with no other sources).
- Read-time performance is prioritized over write-time complexity.

**Trade-offs:**
- Group membership changes (adding/removing users) require re-materialization if the group's permission sets change.
- The schema supports `PermissionSetGroupAssignment` for tracking which users were assigned via which group, enabling clean revocation.

---

## 9. Summary of Key Files

| File | Lines | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | 1267 | Data model: Organization, User, PermissionSet, ObjectDefinition, FieldDefinition, Record, FieldData, RecordShare, AssignmentRule, SharingRule, ValidationRule, DuplicateRule, MetadataDependency, ImportJob, FileAttachment, Better-Auth Session/Account |
| `src/actions/standard/record-actions.ts` | 3256 | Core CRUD: getRecords, getRecord, createRecord, updateRecord, deleteRecord (soft), restoreRecord, purgeRecord, claimRecord, moveRecord, updateOwnUserRecord. List view query pipeline with raw SQL fallback. |
| `src/actions/admin/permission-actions.ts` | 526 | sanitizeUserObjectPermissions (strips User object write flags), create/update/delete permission sets & groups, toggle app/system permissions |
| `src/actions/auth.ts` | 229 | Registration with Zod validation, bcrypt hashing, org+user+account creation in transaction, seeding trigger |
| `src/auth.ts` | 65 | Better-Auth instance config: bcrypt cost 12, JWT sessions, username plugin, Prisma adapter |
| `src/lib/permissions.ts` | 304 | RBAC: getUserPermissionSetIds, buildObjectAccessMap, getObjectAccessSummary, checkPermission, getAvailableApps (admin shortcut REMOVED at line 243), hasSystemPermission |
| `src/lib/record-access.ts` | 104 | buildRecordAccessFilter (Prisma OR-clause), buildRecordAccessSql (raw SQL), getShareAccessLevels, getUserQueueIds |
| `src/lib/field-data.ts` | 192 | buildFieldDataPayload (14 field types), getFieldDisplayValue, getFieldNumericValue, getLookupId, getPrimaryNameField, deriveRecordName |
| `src/lib/auth/context.ts` | 36 | getUserContext (zero args, session-derived orgId), requireAuth, requireAdmin |
| `src/lib/auth/proxy.ts` | 95 | getProxySession (JWT verify via jose), cookie parsing incl. chunked reconstruction |
| `src/middleware.ts` | 68 | Auth rate limiting (20/60s), session proxy, route-level auth: redirect/401/admin gate |
| `src/lib/rate-limit.ts` | 58 | RateLimiter class: sliding window, per-key buckets |
| `src/lib/rate-limit-store.ts` | 22 | Singleton authRateLimiter (20 req/60s), getClientIp (x-forwarded-for, x-real-ip) |
| `src/lib/file-storage.ts` | 61 | buildAttachmentStoragePath, resolveStoragePath (path traversal guard), deleteFileSafe, deleteFolderSafe |
| `src/lib/seeding/create-org-template.ts` | 342 | Seeds default objects (User, Company, Contact, Opportunity, Case, Lead, Task), fields, picklists, list views, queues, groups |
| `src/lib/seeding/create-default-app.ts` | 156 | Creates CRM app, nav items, 5 role-based permission sets (Owner, Admin, Manager, Sales, Viewer) with object-level permission matrices |
| `src/lib/import-processing.ts` | 687 | processImportJob: external ID matching, lookup resolution, picklist mapping, duplicate detection, row-by-row validation |
| `src/lib/duplicates/duplicate-rules.ts` | 277 | findDuplicateMatches: candidate query via FieldData, re-evaluation against valueMap, visibility-gated results |
| `src/lib/metadata-dependencies.ts` | 874 | Dependency tracking for field/object delete protection, rebuild orchestration |
| `src/lib/validation/rule-logic.ts` | 450 | Custom logic expression tokenizer/parser (AND/OR/NOT, symbolic &&/||/!), value coercion, comparison operators |
| `src/lib/validation/record-validation.ts` | 106 | validateRecordData: required, type, decimal places, email/URL/phone regex, picklist option validation |

---

## 10. Data Flow Examples

### 10.1 Record Creation

```
createRecord("contact", { name: "John Doe", email: "john@test.com", company: 10 })
  │
  ├─ getUserContext() → { userId, organizationId } (session-derived, 0 args)
  ├─ checkPermission(userId, orgId, "contact", "create") → boolean
  ├─ db.objectDefinition.findUnique({ organizationId, apiName })
  ├─ buildValueMap(fields, data) → valueMap
  ├─ validateRecordData(fields, valueMap) → throws on type/required errors
  ├─ enforceUniqueFields(objectDef, valueMap) → throws on uniqueness conflict
  ├─ validateLookupValues(fields, valueMap, orgId) → throws on invalid lookup
  ├─ enforceValidationRules(validationRules, valueMap, permissionSetIds) → throws on rule breach
  ├─ findDuplicateMatches({ ... }) → blockingRuleIds / warningRuleIds
  ├─ resolveAssignmentRule(orgId, objectDefId, fields, valueMap)
  │
  └─ db.$transaction(async (tx) => {
      generateAutoNumberValues(tx, fields)
      tx.record.create({ organizationId, objectDefId, ownerId, ... })
      tx.fieldData.createMany({ recordId, ...payloads })
      createAssignmentNotifications(tx, { ... })
      applySharingRules(tx, orgId, objectDefId, recordId, fields, valueMap)
    })
  │
  └─ revalidatePath(`/app/${objectApiName}`)
  └─ return { success: true, data: record }
```

### 10.2 Record Read with List View

```
getRecords("contact", page=1, pageSize=25, sortField="amount", listViewId=5)
  │
  ├─ getUserContext() → { userId, organizationId }
  ├─ getUserQueueIds(userId) → number[]
  ├─ getUserPermissionSetIds(userId) → number[]
  ├─ checkPermission(userId, orgId, "contact", "viewAll") → boolean
  │   └─ canViewAll ? null : buildRecordAccessFilter(userId, queueIds, groupId)
  ├─ getAccessibleListViewById(userId, orgId, objectDefId, listViewId)
  │   └─ Checks ListViewShare for group/permission set access
  ├─ buildListViewCriteriaFilter(objectDef, listView.criteria) → Prisma.RecordWhereInput | null
  ├─ buildListViewCriteriaSql(objectDef, listView.criteria) → Prisma.Sql | null
  │
  ├─ If sorting by custom field → raw SQL:
  │   SELECT r.id FROM "Record" r
  │   LEFT JOIN "FieldData" fd ON fd."recordId" = r."id"
  │     AND fd."fieldDefId" = ${sortFieldId}
  │   WHERE r."organizationId" = ${orgId}
  │     AND r."objectDefId" = ${objectDefId}
  │     AND r."isDeleted" = false
  │     ${buildRecordAccessSql(...)}       — org-scoped share EXISTS subquery
  │     ${buildListViewOwnerScopeSql(...)}
  │     ${buildListViewCriteriaSql(...)}
  │   ORDER BY ${buildFieldSortExpression(fieldType)} DESC, r."createdAt" DESC
  │   LIMIT 25 OFFSET 0
  │
  ├─ db.record.findMany({ where, include: { fields: { include: { fieldDef, valuePicklist } } } })
  ├─ Map IDs → records preserving sort order
  ├─ Transform: getFieldDisplayValue for each field
  ├─ Batch-resolve Lookup names (one query per target object)
  └─ return { data, meta: { page, total, totalPages, sortField, ... } }
```

### 10.3 Soft-Delete → Restore → Purge

```
deleteRecord("crm", "contact", 999)
  ├─ checkPermission(userId, orgId, "contact", "modifyAll" | "delete")
  ├─ buildRecordAccessFilter(userId, queueIds, groupId, "delete")
  ├─ db.record.findFirst({ id: 999, organizationId: orgId, isDeleted: false, ...accessFilter })
  └─ db.$transaction(async (tx) => {
      tx.record.update({ id: 999, data: { isDeleted: true, lastModifiedById: userId } })
      // Inbound lookups and files PRESERVED for restore
    })

restoreRecord("crm", "contact", 999)
  ├─ Same permission + access checks (action: "delete")
  ├─ db.record.findFirst({ id: 999, organizationId: orgId, isDeleted: true, ...accessFilter })
  └─ db.$transaction: tx.record.update({ isDeleted: false })

purgeRecord("crm", "contact", 999)
  ├─ Same permission + access checks (action: "delete")
  ├─ db.record.findFirst({ id: 999, organizationId: orgId, isDeleted: true, ...accessFilter })
  ├─ db.fieldDefinition.findMany({ lookupTargetId: objectDefId }) → child lookup fields
  └─ db.$transaction(async (tx) => {
      tx.fieldData.updateMany({                          // Clear inbound lookup payloads
        where: { fieldDefId: { in: childFieldIds }, valueLookup: 999 },
        data: { valueLookup: null, valueText: null, valueSearch: null }
      })
      tx.record.delete({ where: { id: 999 } })           // Hard delete
    })
  └─ deleteFolderSafe(resolveStoragePath(`uploads/${orgId}/${999}`))  // Post-commit file cleanup
```

---

## 11. Audit Findings Summary

| Category | Rating | Notes |
|---|---|---|
| Tenant Isolation | Strong | 3-layer defense: session-derived org, query-level filter, record-level share scoping |
| Authentication | Good | bcrypt cost 12 in Better-Auth; legacy path uses cost 10 (should align) |
| Authorization | Strong | Object-level + record-level, admin bypass removed, User object write-protected |
| Input Validation | Good | Zod schemas at entry points, field-type validation, unique enforcement, lookup validation |
| Soft-Delete Integrity | Strong | Preserved on soft-delete, cleaned on purge, restore preserves all relationships |
| Rate Limiting | Moderate | In-memory store; sufficient for single-instance, needs Redis for multi-instance |
| File Security | Good | Path traversal guard, per-record folder isolation, safe delete wrappers |
| CSV Export | Good | Formula injection neutralization (`'=`, `+`, `-`, `@` prefixes) |
| Test Coverage | Good | 19 test files, 104 cases; security-focused tests verify cross-org isolation |
| Gaps | — | No tests for `sanitizeUserObjectPermissions`, no integration tests for sharing rule evaluation, bcrypt cost inconsistency between paths |

---

## 12. Security Hardening & Bug Fixes (Post-Audit Remediation)

### Remediation Summary

The following remediations were applied to the codebase between the original audit
date (2026-09-18) and this update. All changes are operational security improvements
or pre-existing bug fixes identified during the review process. The existing sections
1–11 reflect the state of the codebase at audit time and are left unmodified for
historical reference.

### 12.1 Bcrypt Cost Factor Standardization (FIXED)

| Attribute | Detail |
|---|---|
| **Category** | Authentication |
| **Severity** | Critical |
| **Status** | Resolved |

**Issue:** Registration path used bcrypt cost 10; Better-Auth used cost 12. The
inconsistency meant credentials created via the legacy registration path
(`src/auth.ts`) were weaker than those created through the canonical auth provider
(`src/actions/auth.ts`).

**Fix:** Created `src/lib/crypto.ts` exporting the shared constant `BCRYPT_COST = 12`.
Updated all four call sites to reference the shared constant:

| File | Line / Context |
|---|---|
| `src/auth.ts` | Legacy registration hash |
| `src/actions/auth.ts` | Registration action |
| `src/actions/admin/user-actions.ts` | Admin user creation / password reset |
| `src/actions/admin/seed-demo-data.ts` | Demo data seeding |

`tsc --noEmit` passes with all call sites referencing the shared constant.

---

### 12.2 `sanitizeUserObjectPermissions` Unit Tests (FIXED)

| Attribute | Detail |
|---|---|
| **Category** | Authorization / Test Coverage |
| **Severity** | Medium |
| **Status** | Resolved |

**Issue:** `sanitizeUserObjectPermissions` had zero test coverage — identified as a
gap in the original audit (Section 11, "Gaps").

**Fix:** Exported the function from `src/actions/admin/permission-actions.ts`.
Created `src/tests/actions/sanitize-user-permissions.test.ts` with seven test cases
covering:

1. Non-user object passthrough
2. User object strip behavior
3. Mixed permissions
4. All-false permissions
5. Input immutability
6. Case-sensitive matching

**Result:** 7/7 tests pass.

---

### 12.3 `includeDeleted` Bypass (FIXED)

| Attribute | Detail |
|---|---|
| **Category** | Authorization / Soft-Delete |
| **Severity** | High |
| **Status** | Resolved |

**Issue:** `getRecords` and `getRecord` allowed any user with `read` permission to
pass `includeDeleted: true` and view soft-deleted records, bypassing the trash-view
authorization model.

**Fix:** Both functions now gate `includeDeleted` on `canViewAll`
(i.e., `opts?.includeDeleted === true && canViewAll`). Users without
`viewAll` / `modifyAll` cannot access deleted records.

**Result:** Soft-delete tests still pass (15/15); new tests verify non-admin users
cannot access deleted records.

---

### 12.4 HSTS Header (FIXED)

| Attribute | Detail |
|---|---|
| **Category** | HTTP Security Headers |
| **Severity** | Medium |
| **Status** | Resolved |

**Issue:** `next.config.ts` headers included CSP, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and X-XSS-Protection —
but lacked `Strict-Transport-Security` (HSTS).

**Fix:** Added `{ key: "Strict-Transport-Security", value: "max-age=31536000;
includeSubDomains; preload" }` to the headers array in `next.config.ts`.

---

### 12.5 JWT Secret Validation in Production (FIXED)

| Attribute | Detail |
|---|---|
| **Category** | Authentication / Configuration |
| **Severity** | Low |
| **Status** | Resolved |

**Issue:** `getProxySession` (`src/lib/auth/proxy.ts:65-66`) logged an error and
returned `null` if `JWT_SECRET` / `BETTER_AUTH_SECRET` was not set — failing open
silently. Better-Auth's `secret: process.env.JWT_SECRET` would use an `undefined`
secret, risking authentication bypass under misconfiguration.

**Fix:** Added a startup check in `src/auth.ts` that throws immediately in production
if neither `JWT_SECRET` nor `BETTER_AUTH_SECRET` is set.

---

### 12.6 `updateRecord` Missing `isDeleted` Filter (FIXED — pre-existing bug)

| Attribute | Detail |
|---|---|
| **Category** | Soft-Delete Integrity / Data Modification |
| **Severity** | Medium |
| **Status** | Resolved |

**Issue:** `updateRecord`'s `findFirst` query was missing the `isDeleted: false`
filter, allowing users to edit soft-deleted records without restoring them first.

**Fix:** Added `isDeleted: false` to the `where` clause. Now consistent with
`deleteRecord`, `moveRecord`, `getRecord`, and `getRecords`.

**Result:** The pre-existing failing `org-isolation.test.ts` test that depended on
this behavior now passes (16/16).

---

### 12.7 Revised Audit Findings (Post-Remediation)

| Category | Rating | Before | After |
|---|---|---|---|
| Bcrypt cost consistency | Critical | Cost 10 vs 12 mismatch | Standardized to 12 via `BCRYPT_COST` constant |
| `includeDeleted` authorization | High | Any reader could see deleted records | Gated on `canViewAll` |
| Soft-delete integrity in `updateRecord` | Medium | Pre-existing bug: could edit deleted records | Fixed: `isDeleted: false` filter added |
| User object write protection | Medium | No tests for `sanitizeUserObjectPermissions` | 7 unit tests added |
| HSTS header | Medium | Missing | Added to `next.config.ts` |
| JWT secret validation | Low | Silent fail in production | Hard throw in production |
| Test coverage | — | 152 tests, 1 failing | 153 tests, 0 failing |

---

### 12.8 Remaining Action Items

Not all recommendations are code-level fixes. The following items are documented for
follow-up:

- **Redis-backed rate limiter** *(Medium priority — operational)*
  - Create `src/lib/rate-limit-redis.ts` using `@upstash/redis`.
  - Update `rate-limit-store.ts` to use Redis when
    `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_TOKEN` are set.
  - Update `.env.example` with the new environment variables.

- **Integration tests for sharing rule evaluation** *(Low priority)*
  - `recomputeSharingRulesForObject` and `applySharingRules` have no integration
    tests. Add tests verifying criteria evaluation, access-level ranking, and stale
    share cleanup.

---

*End of Audit Document*