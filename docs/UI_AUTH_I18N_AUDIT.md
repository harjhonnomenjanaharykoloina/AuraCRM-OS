# UI / Auth / i18n Audit

**Project:** AuraCRM (open-source CRM)
**Date:** 2026-09-18
**Scope:** Login button bug, auth flow architecture, i18n system review, hardcoded English strings, landing page assessment, and remediation plan.

---

## 1. Login Button Issue — "Get Started" instead of "Sign In"

### Status: BUG (confirmed — root cause is an incorrect source string, not a template error)

### Summary

The login form submit button renders **"Get Started"** instead of **"Sign In"**. The form markup and component wiring are correct; the problem lives entirely in the i18n message files.

### Root Cause

The submit button label is resolved from the i18n key `auth.signIn.submitButton`. That key holds the wrong string value in both locale files.

| File | Line | Key | Current (BUG) | Should Be |
|------|------|-----|---------------|-----------|
| `src/i18n/messages/en.ts` | 982 | `auth.signIn.submitButton` | `"Get Started"` | `"Sign In"` |
| `src/i18n/messages/fr.ts` | 982 | `auth.signIn.submitButton` | `"Commencer"` | `"Se connecter"` |

> **Note on key path:** The audit source material references `auth.login.submitButton`, but the actual key in the message files is `auth.signIn.submitButton` (the key namespace is `signIn`, not `login`). The loading-state sibling key is `auth.signIn.submitButtonLoading` (`"Signing in..."` / `"Connexion en cours..."`).

### Data Flow (verified)

1. **`src/app/(auth)/login/page.tsx`** — Renders a native `<form onSubmit={handleSubmit}>` with `<CleanMinimalSignIn ... />`. It passes `submitDisabled={!canSubmit}` but does **not** pass a `submitLabel` prop. (Discrepancy noted: the source description states a `submitLabel: t("auth.login.submitButton")` prop is passed, but no such prop exists in the component or the page.)
2. **`src/components/auth/clean-minimal-sign-in.tsx`** — The `<Button type="submit">` is rendered inside the component at lines 90–96:

   ```tsx
   // src/components/auth/clean-minimal-sign-in.tsx:90-96
   <Button
       type="submit"
       disabled={isLoading || submitDisabled}
       className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
   >
       {isLoading ? t("auth.signIn.submitButtonLoading") : t("auth.signIn.submitButton")}
   </Button>
   ```

   The component imports `useTranslations` from `@/i18n/client` (line 8) and calls `t("auth.signIn.submitButton")` at line 95.

3. **`t("auth.signIn.submitButton")`** resolves through `createTFunction()` (`src/i18n/t.ts:41`), which walks the messages object using dotted key resolution (`resolveKey`, line 9).

The form's `handleSubmit` (login/page.tsx:73-76) and the submit logic are correct — they call `submitLogin()` which invokes `authClient.signIn.username(...)`.

### Before / After

**Before** (current behavior):

```
Username: [  ________________ ]
Password: [  ________________ ]

[ Get Started ]     ← wrong label
```

**`src/i18n/messages/en.ts:982` (before):**
```ts
submitButton: "Get Started",
```

**`src/i18n/messages/fr.ts:982` (before):**
```ts
submitButton: "Commencer",
```

**After (fix):**

**`src/i18n/messages/en.ts:982` (after):**
```ts
submitButton: "Sign In",
```

**`src/i18n/messages/fr.ts:982` (after):**
```ts
submitButton: "Se connecter",
```

**Result:**
```
Username: [  ________________ ]
Password: [  ________________ ]

[ Sign In ]     ← correct label
```

### Fix

A single-line change in each message file is sufficient. No component or template changes are required.

---

## 2. Auth Flow Architecture

### Stack Overview

AuraCRM uses **Better-Auth** as the authentication layer with the following configuration:

| Concern | Configuration | Source File |
|---------|--------------|-------------|
| Library | `better-auth` (v1, Next.js integration via `toNextJsHandler`) | `src/auth.ts:2` |
| Session strategy | JWT (`cookieCache.strategy: "jwt"`) | `src/auth.ts:24-28` |
| Cookie name | `better-auth.session_data` | `src/lib/auth/proxy.ts:3` |
| Password hashing | bcryptjs, cost factor **12** (in Better-Auth config) | `src/auth.ts:17` |
| Username plugin | `username({ displayUsername: false })` | `src/auth.ts:49-51` |
| Email provider | `emailAndPassword` enabled | `src/auth.ts:12-13` |
| Org field | Custom `organizationId` (number) on user + session | `src/auth.ts:29-47` |
| DB adapter | `@better-auth/prisma-adapter` (PostgreSQL) | `src/auth.ts:9-11` |
| Secret | `process.env.JWT_SECRET` | `src/auth.ts:53` |

### Key Files

| File | Responsibility |
|------|---------------|
| `src/auth.ts` | Better-Auth instance config, `auth()` helper, `signOut()` |
| `src/lib/auth-client.ts` | Client-side `authClient` with `usernameClient` plugin |
| `src/lib/auth/proxy.ts` | `getProxySession()` — manual JWT verification from `better-auth.session_data` cookie via `jose` |
| `src/lib/auth/context.ts` | `getUserContext()` — takes **zero arguments**; orgId extracted from JWT/session only |
| `src/actions/auth.ts` | `register()` Server Action (Zod validation), `legacySignInAction()` fallback wrapper |
| `src/lib/auth-proxy-fix.ts` | `legacySignIn()` — direct bcrypt.js comparison fallback for legacy credential accounts |
| `src/middleware.ts` | Route protection: redirects unauthenticated users to `/login` |

### Auth Flow: Login (client)

```
User submits form → authClient.signIn.username({ username, password })
                      ├─ Success → toast + redirect to /app/dashboard
                      └─ Error   → legacySignInAction(username, password)
                                   ├─ legacySignIn() finds user + credential account
                                   ├─ bcryptjs.compare(password, account.password)
                                   └─ If valid → retry authClient.signIn.username → redirect
```

### Auth Flow: Registration (server)

```
User submits registration → register(data) Server Action
  1. Zod validation (registerSchema, src/actions/auth.ts:11-22)
  2. Check username uniqueness
  3. Check email/org owner conflict
  4. bcrypt.hash(password, 10)  ← NOTE: cost 10, not 12 (see Risks)
  5. Transaction: create Organization → User → Account → link owner
  6. Seed standard objects + permission sets (createOrgTemplate)
```

### Important Discrepancy: bcrypt Cost Mismatch

| Location | Cost Factor | Notes |
|----------|------------|-------|
| `src/auth.ts:17` | **12** | Better-Auth's internal password hash for email/password flow |
| `src/actions/auth.ts:69` | **10** | Custom `register()` action that creates Account records |

The custom `register()` action hashes passwords at cost 10, while Better-Auth's own config uses cost 12. This is not a functional bug (bcrypt verification succeeds regardless of cost since the cost is embedded in the hash), but it represents an inconsistency in the auth implementation. The `legacySignIn()` fallback (`src/lib/auth-proxy-fix.ts:30`) uses `bcryptjs.compare()` which handles both costs correctly.

### Middleware Behavior

`src/middleware.ts:12-62` handles:

- Rate limiting on `/api/auth/*` routes (20 requests / 60s per IP)
- JWT session verification via `getProxySession()`
- Redirect unauthenticated, non-public routes to `/login`
- Redirect authenticated users away from `/login` and `/register` to `/app/dashboard`
- Admin route protection (`/admin/*` requires `userType === "admin"`)

### getUserContext() — Zero-Argument Design

`src/lib/auth/context.ts:3` — `getUserContext()` accepts no parameters. It reads the session via `auth()` and extracts `userId` and `organizationId` directly from the JWT/session payload. Neither `getProxySession()` nor `getUserContext()` accept an `orgId` argument; the org is embedded in the token.

---

## 3. i18n System (Custom-Built)

### Overview

The project does **not** use `next-i18next` or `next-intl`. The i18n system is fully custom at `src/i18n/`.

| File | Responsibility |
|------|---------------|
| `src/i18n/config.ts` | Locales (`["en", "fr"]`), `defaultLocale`, `localeCookieName` (`NEXT_LOCALE`), fallback logic |
| `src/i18n/t.ts` | `createTFunction()` — dotted key resolution, `{interpolation}`, plural `\|` syntax |
| `src/i18n/server.ts` | `getLocale()`, `getMessages()`, `getT()` for server components |
| `src/i18n/client.tsx` | `I18nProvider`, `useTranslations()`, `useLocale()`, `useSetLocale()` |
| `src/i18n/messages/index.ts` | Exports `enMessages`, `frMessages` |
| `src/i18n/messages/en.ts` | ~1017 lines (verified: 1289 lines total including the type export) |
| `src/i18n/messages/fr.ts` | ~1017 lines (1289 lines total) |

### How Translation Works

**Server components** (e.g., pages): Use the `getT()` async function from `src/i18n/server.ts`:

```ts
// Server component pattern
const t = await getT();
t("auth.signIn.submitButton");  // → "Sign In" (after fix)
```

**Client components** (e.g., forms, dialogs): Use the `useTranslations()` hook from `src/i18n/client.tsx`, which relies on the `I18nProvider` context:

```tsx
// Client component pattern
const t = useTranslations();
t("auth.signIn.submitButton");
```

### createTFunction() Capabilities (src/i18n/t.ts:41)

1. **Dotted key resolution:** `t("public.header.login")` walks `messages.public.header.login`.
2. **Interpolation:** `t("public.footer.copyright", { year: 2026 })` replaces `{year}`.
3. **Pluralization:** Uses `\|` separator. `t("key", { count: 1 })` returns the first part; `count: 2+` returns the second.

### Current Message Structure

```
enMessages = {
  admin: { sidebar: {...}, ... }
  auth:  { signIn: {...}, register: {...} }
  public: { appName, header: {...}, nav: {...}, home: {...}, footer: {...} }
  standard: { nav: {...}, dashboard: {...}, record: {...}, dataTable: {...}, ... }
  shared: { nav: {...} }
  i18n: { locale: {...} }
  notFound: { objectNotFound, errorLoading, appNotFound }
}
```

### Existing Keys That Are Already Migrated

Many keys already exist in the message files, including:

- `notFound.objectNotFound` → `"Object not found"` (en.ts:1282)
- `notFound.errorLoading` → `"Error Loading Data"` (en.ts:1283)
- `notFound.appNotFound` → `"App not found"` (en.ts:1284)
- `standard.record.save` → `"Save"` (en.ts:1085)
- `standard.record.cancel` → `"Cancel"` (en.ts:1086)

These existing keys can be reused by components that currently hardcode the same strings.

---

## 4. Hardcoded English Strings Found

All strings below are hardcoded in component source (not routed through `t()`), meaning they do not translate when the locale is switched to French.

> **Note:** File paths have been verified against the actual repository. Two path discrepancies from the source material are documented in the table footnotes.

| # | File:Line | Hardcoded String | Key Context |
|---|-----------|-----------------|-------------|
| 1 | `src/components/admin/objects/validation-rule-dialog.tsx:267` | `"Edit Validation Rule"` | DialogTitle conditional on `initialValues` |
| 2 | `src/components/admin/objects/validation-rule-dialog.tsx:267` | `"New Validation Rule"` | DialogTitle when no `initialValues` |
| 3 | `src/components/admin/objects/validation-rule-dialog.tsx:272` | `"Name"` | Label for rule name input |
| 4 | `src/components/admin/objects/validation-rule-dialog.tsx:276` | `"Opportunity must have Amount"` | Input placeholder |
| 5 | `src/components/admin/objects/validation-rule-dialog.tsx:280` | `"Description"` | Label for description textarea |
| 6 | `src/components/admin/objects/validation-rule-dialog.tsx:284` | `"Explain why this validation exists."` | Textarea placeholder |
| 7 | `src/components/admin/objects/validation-rule-dialog.tsx:290` | `"Match Logic"` | Label + tooltip trigger |
| 8 | `src/components/admin/objects/validation-rule-dialog.tsx:296` | `"Choose how multiple conditions..."` | Tooltip content |
| 9 | `src/components/admin/objects/validation-rule-dialog.tsx:602` | `"Cancel"` | Cancel button |
| 10 | `src/components/admin/objects/validation-rule-dialog.tsx:605` | `"Saving..."` / `"Save Rule"` | Submit button |
| 11 | `src/components/admin/objects/delete-field-button.tsx:114` | `"Delete Field"` | Button title (hover + `aria-label`) |
| 12 | `src/components/admin/objects/object-icon-card.tsx:173` | `"Saving..."` / `"Save Changes"` | Save button |
| 13 | `src/components/admin/objects/record-page-builder.tsx:456` | `"New Section"` | Default section title on add |
| 14 | `src/components/admin/users/managed-user-profile-form.tsx:317` | `"Save Profile"` | `submitLabel` prop value |

### Standard Components (client-side)

| # | File:Line | Hardcoded String | Notes |
|---|-----------|-----------------|-------|
| 15 | `src/components/standard/views/list-view-editor-dialog.tsx:448` | `"Basics"` | Collapsible section header |
| 16 | `src/components/standard/views/list-view-editor-dialog.tsx:452` | `"View name"` | Label |
| 17 | `src/components/standard/views/list-view-editor-dialog.tsx:457` | `"e.g. My Open Deals"` | Input placeholder |
| 18 | `src/components/standard/views/list-view-editor-dialog.tsx:462` | `"Description"` | Label |
| 19 | `src/components/standard/views/list-view-editor-dialog.tsx:467` | `"Optional notes"` | Input placeholder |
| 20 | `src/components/standard/views/list-view-editor-dialog.tsx:482` | `"Visibility"` | Section header |
| 21 | `src/components/standard/views/list-view-editor-dialog.tsx:492` | `"Everyone with access"` | Radio label |
| 22 | `src/components/standard/views/list-view-editor-dialog.tsx:496` | `"Only specific groups or permissions"` | Radio label |
| 23 | `src/components/standard/views/list-view-editor-dialog.tsx:502` | `"Groups"` | Subheading |
| 24 | `src/components/standard/views/list-view-editor-dialog.tsx:506` | `"No groups available."` | Empty state |
| 25 | `src/components/standard/views/list-view-editor-dialog.tsx:521` | `"Permission sets"` | Subheading |
| 26 | `src/components/standard/views/list-view-editor-dialog.tsx:525` | `"No permission sets available."` | Empty state |
| 27 | `src/components/standard/views/list-view-editor-dialog.tsx:897` | `"Cancel"` | Cancel button |
| 28 | `src/components/standard/views/list-view-editor-dialog.tsx:900` | `"Saving..."` / `"Create view"` / `"Save changes"` | Submit button (conditional on `mode`) |
| 29 | `src/components/standard/record/record-form.tsx:658` | `"Save Changes"` / `"Create Record"` | Submit button (conditional on `record`) |
| 30 | `src/components/standard/record/record-form.tsx:664` | `"Cancel"` | Cancel button |
| 31 | `src/components/standard/record/record-form.tsx:679` | `"Possible duplicates found"` | AlertDialogTitle |
| 32 | `src/components/standard/record/record-form.tsx:681` | `"This save matches one or more..."` | AlertDialogDescription |
| 33 | `src/components/standard/record/record-form.tsx:696` | `"Open record"` | Link text in duplicate match row |
| 34 | `src/components/standard/record/record-form.tsx:700` | `"Rules: {matchedRuleNames}"` | Match metadata (interpolation: `matchedRuleNames.join(", ")`) |
| 35 | `src/components/standard/record/record-form.tsx:703` | `"Matching fields: {matchedFieldLabels}"` | Match metadata (interpolation: `matchedFieldLabels.join(", ")`) |
| 36 | `src/components/standard/record/record-form.tsx:710` | `"Matching records exist, but you do not have access..."` | Warning text (no visible matches) |
| 37 | `src/components/standard/record/record-form.tsx:716` | `"Additional possible duplicates exist but..."` | Warning text (hidden matches) |

### Server Components

| # | File:Line | Hardcoded String | Notes |
|---|-----------|-----------------|-------|
| 38 | `src/app/(standard)/app/[appApiName]/dashboard/page.tsx:37` | `"App not found"` | Already exists as `notFound.appNotFound`; not wired up |
| 39 | `src/app/(standard)/app/[appApiName]/[objectApiName]/page.tsx:70` | `"Object not found"` | Already exists as `notFound.objectNotFound`; not wired up |
| 40 | `src/app/(standard)/app/[appApiName]/[objectApiName]/page.tsx:149` | `"Error Loading Data"` | Already exists as `notFound.errorLoading`; not wired up |
| 41 | `src/app/actions/command-actions.ts:54` (actual: `src/actions/standard/command-actions.ts:54`) | `"Dashboard"` | Nav item label in command palette |

> **Path correction:** The source material lists `src/app/actions/command-actions.ts`, but the actual file is at `src/actions/standard/command-actions.ts`. Similarly, the source material lists `src/app/(standard)/app/[appApiName]/no-apps/page.tsx`, but the actual file is at `src/app/(standard)/no-apps/page.tsx`.

### Server Component: `src/app/(standard)/no-apps/page.tsx`

This is a full page (119 lines) with **10+ hardcoded English strings**. All content is conditional on `isAdmin` and covers: workspace status message, heading, descriptive text, "What is missing" section, "Next action" section, button labels ("Open Admin", "Return to Login"), and several instructional strings. This page does not currently use the i18n `getT()` pattern at all.

### Additional Hardcoded Strings in `record-page-builder.tsx`

Beyond line 456, the file contains additional hardcoded strings discovered during verification:

| # | File:Line | Hardcoded String |
|---|-----------|-----------------|
| — | `record-page-builder.tsx:857` | `"Add at least one section to this layout."` (toast error) |
| — | `record-page-builder.tsx:934` | `"Add sections to create the layout grid."` (instructional list item) |
| — | `record-page-builder.tsx:935` | `"Drag fields into sections or the highlights strip."` |
| — | `record-page-builder.tsx:936` | `"Add visibility rules to control what shows for users."` |
| — | `record-page-builder.tsx:1060` | `"Add Section"` (button) |
| — | `record-page-builder.tsx:1066` | `"Add a section to start building this layout."` (empty state) |
| — | `record-page-builder.tsx:1403` | `"Add filter"` (button) |
| — | `record-page-builder.tsx:1617` | `"Add filter"` (button) |

> **String not found:** The source material references `"Add Field"` at `record-page-builder.tsx:456`, but line 456 actually contains `title: "New Section"`. A search for `"Add Field"` across the entire `src/` directory returns **zero** matches. This may indicate a stale reference or a string that was renamed during development.

---

## 5. Landing Page (`src/app/page.tsx`)

### Current State

- **828 lines**, fully hardcoded client-rendered page (not using i18n at all).
- **Audience:** Technical/developer-oriented — functions as an internal setup guide and architecture documentation.
- **Content:** Hardcoded arrays of feature descriptions, tech stack items, architecture diagrams (Mermaid charts embedded as strings).

### Current Sections

| Section ID | Current Heading | Content Focus |
|-----------|----------------|---------------|
| `#about` | "Open-Source CRM for Developers" | Overview / setup guide |
| `#modules` | "Configuration areas available in the app" | Admin control surface cards + capability coverage + field types |
| `#stack` | "Core technologies used in the project" | Tech stack groups (App, Data Layer, Auth, UI, Runtime, Testing) |
| `#architecture` | "System architecture and execution diagrams" | User type boundaries + 6 Mermaid architecture diagrams |

### Assessment

The page uses descriptive text like:
- *"AuraCRM is an open-source, metadata-driven, multi-tenant CRM learning project for developers."*
- *"This organization is ready, but the standard workspace cannot open until at least one app is created."*

These are appropriate for an internal dev team but **not** suitable for external B2B SaaS marketing.

### Required Rewrite

The page needs a full rewrite as a **commercial B2B SaaS marketing page** with the following sections:

1. **Hero** — Compelling headline, subheadline, primary CTA ("Get Started" → should be localized to sign-in context), secondary CTA
2. **Value Propositions** — 3-4 core value props with icons
3. **Features** — Product features (pipeline management, customer 360, collaboration, security)
4. **Pipeline View** — Visual representation of deal pipeline
5. **Customer 360** — Unified customer view
6. **Collaboration** — Team collaboration features
7. **Security** — Enterprise security posture
8. **How It Works** — Simple 3-step onboarding
9. **Use Cases** — Industry-specific applications
10. **Final CTA** — Conversion-focused call to action

### Dependencies

- Uses **`PublicSiteHeader`** (`src/components/shared/public-site-header.tsx`) — already i18n-wired via `useTranslations()`.
- Uses **`PublicSiteFooter`** (`src/components/shared/public-site-footer.tsx`) — currently only renders `public.footer.license` key (line 18). Has unused keys: `copyright`, `privacy`, `terms`, `cookies` that should be expanded.
- **`PublicSiteHeader` nav** currently has 4 items: About, Modules, Tech Stack, Architecture. Needs updating to reflect the new B2B SaaS structure.

### Landing Page Content — Not i18n Ready

All content in `src/app/page.tsx` is hardcoded in JavaScript/TypeScript string literals. None of the section text, feature descriptions, or diagram descriptions use the `t()` function. The page does not even import `getT()` or `useTranslations()`. A full i18n migration is required alongside the content rewrite.

---

## 6. Message Files — Current State

### `public.footer` Section (en.ts:1065-1071)

```ts
footer: {
    copyright: "© {year} AuraCRM. Open source under the MIT license.",
    license: "Open source under MIT license.",
    privacy: "Privacy",
    terms: "Terms",
    cookies: "Cookies",
},
```

### `public.footer` Section (fr.ts:1065-1071)

```ts
footer: {
    copyright: "© {year} AuraCRM. Open source sous licence MIT.",
    license: "Code source ouvert sous licence MIT.",
    privacy: "Confidentialité",
    terms: "Conditions",
    cookies: "Cookies",
},
```

The `PublicSiteFooter` component only uses `t("public.footer.license")`. The `copyright`, `privacy`, `terms`, and `cookies` keys exist but are unused.

---

## 7. Files to Modify — Remediation Plan

### Priority 1: Login Button Fix (trivial)

| File | Change |
|------|--------|
| `src/i18n/messages/en.ts:982` | `"Get Started"` → `"Sign In"` |
| `src/i18n/messages/fr.ts:982` | `"Commencer"` → `"Se connecter"` |

### Priority 2: Admin Components (client-side)

| File | Keys to Add | Migration Pattern |
|------|------------|-------------------|
| `src/components/admin/objects/validation-rule-dialog.tsx` | `admin.validationRule.editTitle`, `.newTitle`, `.name`, `.namePlaceholder`, `.description`, `.descriptionPlaceholder`, `.matchLogic`, `.matchLogicTooltip`, `.cancel`, `.saving`, `.save` | `useTranslations()` (client component) |
| `src/components/admin/objects/delete-field-button.tsx` | `admin.deleteField.title`, `.confirmTooltip` | `useTranslations()` |
| `src/components/admin/objects/object-icon-card.tsx` | `admin.objectIcon.saving`, `.saveChanges` | `useTranslations()` |
| `src/components/admin/objects/record-page-builder.tsx` | `admin.recordPage.newSection`, `.addSection`, `.addFilter`, `.savingError`, `.instructions.*` | `useTranslations()` |
| `src/components/admin/users/managed-user-profile-form.tsx` | `admin.userProfile.saveLabel` | `useTranslations()` (or reuse `standard.record.save`) |

### Priority 3: Standard Components (client-side)

| File | Keys to Add / Reuse | Migration Pattern |
|------|-------------------|-------------------|
| `src/components/standard/views/list-view-editor-dialog.tsx` | `standard.listView.basics`, `.viewName`, `.viewNamePlaceholder`, `.description`, `.descriptionPlaceholder`, `.visibility`, `.everyone`, `.specificGroups`, `.groups`, `.noGroups`, `.permissionSets`, `.noPermissionSets`, `.cancel`, `.saving`, `.create`, `.save` | `useTranslations()` |
| `src/components/standard/record/record-form.tsx` | `standard.record.save`, `.cancel`, `.duplicateTitle`, `.duplicateDesc`, `.openRecord`, `.matchedRules`, `.matchedFields`, `.hiddenMatches`, `.moreHiddenMatches` | `useTranslations()` |
| | | Reuse existing: `standard.record.save` (en.ts:1085), `standard.record.cancel` (en.ts:1086) |

### Priority 4: Server Components

| File | Keys to Add / Reuse | Migration Pattern |
|------|-------------------|-------------------|
| `src/app/(standard)/no-apps/page.tsx` | `standard.noApps.workspaceStatus`, `.adminTitle`, `.userTitle`, `.adminDesc`, `.userDesc`, `.whatIsMissing`, `.adminMissing`, `.userMissing`, `.nextAction`, `.adminNext`, `.userNext`, `.adminCta`, `.userCta` | `getT()` from `src/i18n/server.ts` |
| `src/app/(standard)/app/[appApiName]/dashboard/page.tsx:37` | Reuse `notFound.appNotFound` | `getT()` |
| `src/app/(standard)/app/[appApiName]/dashboard/page.tsx:70` | Reuse `standard.nav.dashboard` | `getT()` |
| `src/app/(standard)/app/[appApiName]/[objectApiName]/page.tsx:70` | Reuse `notFound.objectNotFound` | `getT()` |
| `src/app/(standard)/app/[appApiName]/[objectApiName]/page.tsx:149` | Reuse `notFound.errorLoading` | `getT()` |
| `src/actions/standard/command-actions.ts:54` | Reuse `standard.nav.dashboard` | Note: this is a Server Action that returns data, not a UI render. Strings returned here are used by a client component — the translation should happen on the client side, or the server action should return a key rather than a label. |

### Priority 5: Landing Page Rewrite

| File | Change |
|------|--------|
| `src/app/page.tsx` | Full rewrite: 828 lines of technical documentation → commercial B2B SaaS marketing page. All content must use i18n keys. |
| `src/components/shared/public-site-header.tsx` | Update nav links to match new landing page sections |
| `src/components/shared/public-site-footer.tsx` | Expand to use `copyright`, `privacy`, `terms`, `cookies` keys |
| `src/i18n/messages/en.ts` | Add `public.home.*` keys for new marketing content |
| `src/i18n/messages/fr.ts` | Add French translations for all new keys |

### Priority 6: Root Metadata

| File | Change |
|------|--------|
| `src/app/layout.tsx:8-12` | Update `metadata.title` and `metadata.description` to use commercial B2B SaaS language (currently: "Open source learning project") |

---

## 8. Migration Patterns

### Client Components

Client components should import `useTranslations` from `@/i18n/client` and replace hardcoded strings:

```tsx
// Before
<Button>Save Changes</Button>

// After
import { useTranslations } from "@/i18n/client";
const t = useTranslations();
<Button>{t("standard.record.saveChanges")}</Button>
```

### Server Components

Server components should use the async `getT()` function:

```tsx
// Before (server component)
export default async function DashboardPage() {
    return <div>{!app && <div>App not found</div>}</div>;
}

// After
import { getT } from "@/i18n/server";
export default async function DashboardPage() {
    const t = await getT();
    return <div>{!app && <div>{t("notFound.appNotFound")}</div>}</div>;
}
```

### Key Naming Convention

All new keys must follow the existing dotted notation that `createTFunction()` expects (`src/i18n/t.ts:9-20`):

```
namespace.section.subsection.key
```

Examples:
- `admin.validationRule.editTitle`
- `admin.validationRule.save`
- `standard.listView.create`
- `standard.noApps.adminTitle`
- `public.home.hero.title`

---

## 9. Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Custom i18n, not next-intl/next-i18next** | No framework auto-discovery of missing keys; typos silently return the key string | Enforce key naming convention; consider adding a dev-mode warning when `t()` returns the key unchanged |
| **Server components need async `getT()`** | Easy to forget `await` or use client hook in server component | Follow the pattern in `src/app/(standard)/...` pages; verify with TypeScript |
| **Client components need `useTranslations()` from `@/i18n/client`** | Importing from wrong path causes runtime errors | Always import from `@/i18n/client`, never from `@/i18n/server` in client components |
| **Server Actions returning localized strings** | `src/actions/standard/command-actions.ts` returns `"Dashboard"` as a label — this runs server-side but the result is consumed by a client component | Return a translation key instead of a localized string, and translate on the client side |
| **Landing page rewrite maintains routes** | 828-line page with no current i18n; rewrite must preserve all `#anchor` links and external behavior | Keep section IDs (`about`, `modules`, `stack`, `architecture`) or update `PublicSiteHeader` nav to match new IDs |
| **PublicSiteFooter limited** | Only uses `public.footer.license`; `copyright`, `privacy`, `terms`, `cookies` keys exist but unused | Expand footer during landing page rewrite; these keys are already present in both en.ts and fr.ts |
| **bcrypt cost mismatch** | Login registration uses cost 10; Better-Auth uses cost 12 | Not a functional bug, but should be reconciled for consistency |
| **Hardcoded strings in record-page-builder are extensive** | 8+ additional strings beyond the documented line 456 | Full grep audit of the file recommended before migration |

---

## 10. Summary

| Category | Count | Status |
|----------|-------|--------|
| Login button bug | 2 files | **Fixable in 2 lines** — wrong string values |
| Auth architecture | — | Working, with noted bcrypt cost inconsistency |
| Hardcoded admin strings | ~20 strings | All in client components; use `useTranslations()` |
| Hardcoded standard strings | ~20 strings | All in client components; use `useTranslations()` |
| Hardcoded server strings | ~12 strings | Use `getT()` from `@/i18n/server` |
| Server Action label | 1 string | Should return key, not localized string |
| Landing page | 828 lines | Full rewrite + i18n migration required |
| Root metadata | 2 strings | Update for B2B SaaS positioning |

**Total estimated effort:** 1-2 days for the login button + component i18n migration; 1 week for the landing page full rewrite with B2B SaaS content and i18n integration.
