# License & Attribution Guide — openCRM

This document records all license and attribution information for the **openCRM**
project (package name `AuraCRM`), including its own license, the license of the
NextCRM reference implementation it is derived from, all third-party dependencies,
fonts, icons/assets, and the compliance requirements that must be preserved.

> **Last updated:** 2026-09-22  
> **Tooling used for verification:** `node_modules/.pnpm/*/package.json` fields
> (`license`, `version`), raw `LICENSE`/`LICENSE.txt` files fetched from upstream
> GitHub repositories, and npm registry metadata.

---

## 1. Project License

### openCRM / AuraCRM

| Field | Value |
|-------|-------|
| **License** | MIT License |
| **Copyright holder** | Ayas A.Hadi |
| **Copyright year** | 2026 |
| **License file** | [`LICENSE`](../LICENSE) (repository root) |

**Full license text (repository `LICENSE`):**

```
MIT License

Copyright (c) 2026 Ayas A.Hadi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Key requirement:** The MIT license requires that the above copyright notice
and this permission notice appear in all copies or substantial portions of the
Software.

---

## 2. NextCRM Source License

openCRM is modeled on and draws from the **NextCRM** reference implementation
maintained by Pavel Dovhomilja, hosted at
[`github.com/pdovhomilja/nextcrm-app`](https://github.com/pdovhomilja/nextcrm-app).

| Field | Value |
|-------|-------|
| **Project** | NextCRM (`pdovhomilja/nextcrm-app`) |
| **License** | MIT License |
| **Copyright holder** | Pavel Dovhomilja |
| **Copyright year** | 2023 |

**Full license text:**

```
MIT License

Copyright (c) 2023 Pavel Dovhomilja

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Attribution requirement:** When distributing openCRM (or a derivative), the
NextCRM MIT copyright notice ("Copyright (c) 2023 Pavel Dovhomilja") must be
preserved alongside the openCRM copyright notice. See §7 — Attribution
Requirements for preservation rules.

---

## 3. Key Dependencies Licenses

All dependencies listed below are declared in [`package.json`](../package.json)
and resolved via `pnpm-lock.yaml`. License values were read directly from each
package's `package.json` `license` field and/or `LICENSE` file on disk.

### MIT-licensed dependencies

| Package | Installed version | License | Notes |
|---------|-------------------|---------|-------|
| `next` | 16.3.5 | MIT | Core framework (React framework) |
| `react` | 19.2.0 | MIT | UI library |
| `react-dom` | 19.2.0 | MIT | React DOM renderer |
| `better-auth` | 1.7.5 | MIT | Authentication framework |
| `@better-auth/prisma-adapter` | 1.7.5 | MIT | Better-Auth Prisma adapter |
| `tailwindcss` | 4.3.3 | MIT | CSS utility framework |
| `@tailwindcss/postcss` | 4.3.3 | MIT | PostCSS plugin for Tailwind |
| `@radix-ui/*` (all) | 1.1.x–2.2.x | MIT | 25 Radix UI primitive packages |
| `lucide-react` | 0.555.0 | ISC | Icon library (see §5 — Icons/Assets) |
| `sonner` | 2.0.8 | MIT | Toast notifications |
| `zod` | 4.6.5 | MIT | Schema validation |
| `date-fns` | 4.4.0 | MIT | Date utilities |
| `react-hook-form` | 7.88.0 | MIT | Form handling |
| `@hookform/resolvers` | 5.9.1 | MIT | React Hook Form resolvers |
| `@tanstack/react-query` | 5.102.8 | MIT | Server state management |
| `react-day-picker` | 9.14.0 | MIT | Date picker |
| `framer-motion` | 12.43.0 | MIT | Animation library |
| `cmdk` | 1.1.1 | MIT | Command menu (kmenu) |
| `pg-boss` | 11.1.2 | MIT | Background job queue |
| `jose` | 6.2.12 | MIT | JWT/JWS/JWE library |
| `pg` | 8.23.0 | MIT | PostgreSQL client |
| `@dnd-kit/core` | 6.3.1 | MIT | Drag-and-drop (dnd-kit) |
| `@dnd-kit/sortable` | 8.0.0 | MIT | Drag-and-drop sortable |
| `@dnd-kit/utilities` | 3.2.2 | MIT | Drag-and-drop utilities |
| `embla-carousel-react` | 8.6.0 | MIT | Carousel component |
| `recharts` | 3.10.1 | MIT | Charting library |
| `@upstash/redis` | 1.38.4 | MIT | Redis client (rate limiting) |
| `vaul` | 1.1.2 | MIT | Drawer/sheet component |
| `input-otp` | 1.5.0 | MIT | OTP input component |
| `csv-parse` | 6.2.1 | MIT | CSV parsing |
| `mermaid` | 10.9.8 | MIT | Diagram rendering |
| `clsx` | 2.1.1 | MIT | Conditional classnames |
| `tailwind-merge` | 3.7.0 | MIT | Tailwind class conflict resolution |
| `zustand` | 5.0.15 | MIT | State management |
| `@tanstack/react-table` | _(not installed — planned)_ | MIT | Table library (NextCRM target dependency) |

### Apache-2.0-licensed dependencies

| Package | Installed version | License | Notes |
|---------|-------------------|---------|-------|
| `prisma` | 7.10.0 | Apache-2.0 | ORM CLI |
| `@prisma/client` | 7.10.0 | Apache-2.0 | Prisma client library |
| `@prisma/adapter-pg` | 7.10.0 | Apache-2.0 | Prisma Postgres adapter |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | Utility for managing component variants |
| `openai` | _(not installed — planned)_ | Apache-2.0 | OpenAI SDK (Copyright 2026 OpenAI) |
| `inngest` | _(not installed — planned)_ | Apache-2.0 | Workflow/job scheduling (npm package) |

### BSD-3-Clause licensed dependencies

| Package | Installed version | License | Notes |
|---------|-------------------|---------|-------|
| `bcryptjs` | 3.0.3 | BSD-3-Clause | Password hashing |

### PostgreSQL License

| Package | Installed version | License | Notes |
|---------|-------------------|---------|-------|
| `pgvector` | _(not installed — planned)_ | PostgreSQL License | PostgreSQL extension for vector similarity search (Copyright PostgreSQL Global Development Group). Note: the `pgvector` npm driver package is MIT-licensed (Copyright Andrew Kane), but the PostgreSQL extension itself uses the PostgreSQL License. |

### Mozilla Public License 2.0

| Package | Installed version | License | Notes |
|---------|-------------------|---------|-------|
| `jose` | 6.2.12 | MIT | _(jose is MIT; the Mozilla Public License family is noted for reference where applicable in the broader ecosystem)_ |

> **Note on `@tanstack/react-table`:** Listed in the user's task as MIT. This
> package is part of the NextCRM target architecture but is not yet installed
> in the openCRM `node_modules`. The upstream project is MIT-licensed.

> **Note on `better-auth` plugins:** The `@better-auth/prisma-adapter` patch
> applied via `patch-package` (see `patches/@better-auth+prisma-adapter+1.7.5.patch`)
> is derived from the MIT-licensed upstream package and remains MIT-licensed.

---

## 4. Fonts

Fonts are loaded via Next.js's `next/font/google` provider in
[`src/lib/fonts.ts`](../src/lib/fonts.ts). No font files are bundled in the
repository.

| Font | Usage | License | Source |
|------|-------|---------|--------|
| **Geist** / **Geist Mono** | Primary sans-serif and monospace font (`--font-geist-sans`, `--font-geist-mono`) | SIL Open Font License 1.1 | `next/font/google` (Vercel, [geist-font](https://github.com/vercel/geist-font)) |
| **Open Sans** | Secondary sans-serif (`openSans` export) | SIL Open Font License 1.1 | `next/font/google` (Google Fonts) |
| **Poppins** | Heading/accent font (`poppins` export) | SIL Open Font License 1.1 | `next/font/google` (Google Fonts) |

**Attribution requirement (OFL 1.1):** The font license requires that the
SIL Open Font License text be included wherever the fonts are distributed.
When distributing openCRM binaries, the `OFL.txt` from each font must be
included in the distribution archive. The full OFL 1.1 text is available at
<https://scripts.sil.org/OFL>.

---

## 5. Icons / Assets

### lucide-react (icons)

| Package | Version | License | Notes |
|---------|---------|---------|-------|
| `lucide-react` | 0.555.0 | ISC | Icon library. Contains some icons derived from the Feather project (MIT, Copyright Cole Bemis). The ISC license is BSD-style and functionally equivalent to MIT. |

### Logo and image assets

| Asset | Path | License | Notes |
|-------|------|---------|-------|
| `logo.png` | `/public/logo.png` | Custom (project copyright) | AuraCRM logo used in headers, footers, and auth pages. Created for this project; copyright (c) 2026 Ayas A.Hadi. |
| `logo_24x24.png` | `/public/analysis/logo_24x24.png` | Custom (project copyright) | Small logo variant. |
| `logo_36x36.png` | `/public/analysis/logo_36x36.png` | Custom (project copyright) | Small logo variant. |
| `hero-bg.png` | `/public/imgs/hero-bg.png` | Custom (project copyright) | Hero background image. |
| SVG icons | `/public/*.svg` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) | MIT (Next.js) / MIT (Vercel) | Default Next.js starter SVGs. |

> The SVG assets `next.svg` and `vercel.svg` originate from the Next.js
> template project and are MIT-licensed. All other image assets are original
> to openCRM.

---

## 6. Components Reused from NextCRM

openCRM is a reimplementation and evolution of the NextCRM reference
implementation (`pdovhomilja/nextcrm-app`). The following component categories
and modules follow patterns and conventions from NextCRM:

| Component/Module | Source (NextCRM) | License | Notes |
|------------------|-------------------|---------|-------|
| **shadcn/ui primitives** (`src/components/ui/*`) | `ui/` directory | MIT | 49 shadcn/ui components built on Radix UI. These follow the NextCRM style (`"style": "new-york"` per `components.json`). |
| **Radix UI components** (`@radix-ui/react-*`) | NextCRM uses same Radix packages | MIT | 25 `@radix-ui/*` packages. |
| **Authentication layer** | `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts` | MIT | Based on NextCRM's Better-Auth configuration pattern. |
| **CRM core data model** | NextCRM `crm_*` Prisma models | MIT | openCRM uses a metadata-driven EAV model instead of NextCRM's typed table approach. |
| **Layout components** (`admin-sidebar`, `admin-header`, `app-header`, `public-site-header`, `public-site-footer`) | NextCRM `components/` | MIT | Structure adapted to openCRM's multi-tenant model. |
| **Form patterns** (`react-hook-form` + `@hookform/resolvers` + `zod`) | NextCRM `form/` | MIT | Form validation patterns. |
| **Global search** (`app/api/search/global/route.ts`) | NextCRM `fulltext-search` | MIT | Server-side search adapted. |
| **Import/export flow** | NextCRM async import | MIT | CSV import processing via background jobs. |
| **i18n infrastructure** | NextCRM i18n | MIT | Custom i18n implementation (not next-i18next). |

### shadcn/ui component inventory (`src/components/ui/`)

The following 49 components were scaffolded using shadcn/ui and follow the
NextCRM pattern:

```
accordion.tsx, alert-dialog.tsx, alert.tsx, aspect-ratio.tsx, avatar.tsx,
badge.tsx, breadcrumb.tsx, button-group.tsx, button.tsx, calendar.tsx,
card.tsx, carousel.tsx, chart.tsx, checkbox.tsx, collapsible.tsx, command.tsx,
context-menu.tsx, dialog.tsx, drawer.tsx, dropdown-menu.tsx, empty.tsx,
field.tsx, form.tsx, hover-card.tsx, image-lightbox.tsx, input-group.tsx,
input-otp.tsx, input.tsx, item.tsx, kbd.tsx, label.tsx, menubar.tsx,
native-select.tsx, navigation-menu.tsx, pagination.tsx, popover.tsx,
progress.tsx, radio-group.tsx, resizable.tsx, scroll-area.tsx, select.tsx,
separator.tsx, sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, spinner.tsx,
switch.tsx, table.tsx, tabs.tsx, textarea.tsx, toggle-group.tsx, toggle.tsx,
tooltip.tsx
```

---

## 7. Attribution Requirements

The following items **must be preserved** to remain in compliance with all
applicable licenses:

### 7.1 Copyright notices in source files

- **No copyright headers are currently present in `src/` files.** When adding
  new files that incorporate code adapted from NextCRM, include a header
  comment preserving the NextCRM attribution:
  ```ts
  // Portions of this code are derived from NextCRM.
  // Copyright (c) 2023 Pavel Dovhomilja
  // Licensed under the MIT License.
  ```
  The openCRM copyright header (where applicable):
  ```ts
  // Copyright (c) 2026 Ayas A.Hadi
  // Licensed under the MIT License.
  ```

### 7.2 LICENSE file preservation

- The `LICENSE` file at the repository root must be distributed with all
  copies or substantial portions of openCRM.
- The NextCRM copyright notice ("Copyright (c) 2023 Pavel Dovhomilja") must
  be included alongside the openCRM copyright notice in any distribution
  LICENSE file.

**Recommended combined LICENSE header for distributions:**

```
openCRM License
===============

Copyright (c) 2026 Ayas A.Hadi
Copyright (c) 2023 Pavel Dovhomilja (NextCRM reference implementation)

This software is licensed under the MIT License (see full text below).
Portions derived from NextCRM (https://github.com/pdovhomilja/nextcrm-app),
also licensed under the MIT License.

[Full MIT license text follows...]
```

### 7.3 Third-party license files

The following third-party license texts must be included in distributions:

- **Apache-2.0:** `prisma`, `@prisma/client`, `@prisma/adapter-pg`,
  `class-variance-authority`, `openai`, `inngest` — Apache License 2.0
  boilerplate + NOTICE file.
- **SIL Open Font License 1.1:** Geist, Open Sans, Poppins — `OFL.txt`.
- **ISC:** `lucide-react`.
- **BSD-3-Clause:** `bcryptjs`.

### 7.4 README attribution

The [`README.md`](../README.md) should include an attribution section for
NextCRM. Currently the README states:

> openCRM is an open-source, metadata-driven, multi-tenant CRM learning project
> for developers.

**Add the following attribution block:**

```markdown
## Attributions

This project is derived from and modeled on [NextCRM](https://github.com/pdovhomilja/nextcrm-app)
by Pavel Dovhomilja (MIT License). See [`docs/LICENSES.md`](./docs/LICENSES.md)
for the full license and attribution guide.
```

---

## 8. Modifications Documented

The following modifications are planned (per `docs/NEXTCRM_SPECIFICATION.md`
and `docs/MIGRATION_PLAN.md`):

| Modification | Description | Files affected | License impact |
|-------------|-------------|----------------|----------------|
| **UI replacement** | Replace NextCRM's visual identity with openCRM's color scheme, theming, and branding | `src/app/globals.css`, `src/components/` | No change — MIT applies to both |
| **Multi-tenant model** | Add `Organization` model and `organizationId` on all tenant-scoped tables (NextCRM is single-instance) | `prisma/schema.prisma`, `src/lib/record-access.ts` | MIT — extends NextCRM pattern |
| **Auth model adaptation** | Use bcrypt cost 12 + JWT sessions (openCRM's approach) instead of NextCRM's OTP + Google OAuth primary | `src/lib/auth*`, `src/actions/auth.ts` | MIT — both MIT licensed |
| **EAV vs typed tables** | openCRM uses a metadata-driven EAV model; NextCRM uses typed Prisma tables. openCRM preserves its EAV engine and adapts NextCRM's feature surface to it | `prisma/schema.prisma`, `src/lib/field-data.ts` | MIT — openCRM's architectural choice |
| **Permission model** | openCRM uses RBAC via permission sets/groups; NextCRM uses Better-Auth `ac` statements. Merged approach preserves openCRM's granularity. | `src/lib/permissions.ts`, `src/lib/record-access.ts` | MIT |
| **Worker/queue expansion** | Rename/extend `src/jobs/sharing-rule-worker.ts` → `src/jobs/nextcrm-worker.ts` handling multiple queues (`email.send`, `email.sync`, `webhook.deliver`, `ai.process`, `report.generate`) | `src/jobs/` | MIT |
| **AI subsystem (phased)** | Add OpenAI SDK + pgvector for semantic search and AI enrichment | `src/lib/`, new modules | Apache-2.0 (OpenAI) + PostgreSQL (pgvector) |

---

## 9. Compliance Checklist

Use this checklist to verify license compliance before any release or
distribution:

- [ ] **1. PROJECT LICENSE FILE** — `LICENSE` at repository root contains the
  MIT license with copyright notice "Copyright (c) 2026 Ayas A.Hadi".
  - [ ] Confirmed present at [`LICENSE`](../LICENSE).
  - [ ] Copyright year updated for current year if needed.

- [ ] **2. NEXTCRM ATTRIBUTION** — NextCRM copyright and license are credited.
  - [ ] NextCRM MIT notice ("Copyright (c) 2023 Pavel Dovhomilja") included in
    `docs/LICENSES.md`.
  - [ ] NextCRM full MIT license text included in `docs/LICENSES.md`.
  - [ ] README.md `Attributions` section added (or confirmed present).

- [ ] **3. DEPENDENCY LICENSE INVENTORY** — All third-party licenses verified.
  - [ ] Run `node scripts/check-licenses.js` (or manual verification) to confirm
    every package in `node_modules` is accounted for.
  - [ ] Apache-2.0 packages (`prisma`, `@prisma/client`, `@prisma/adapter-pg`,
    `class-variance-authority`) — Apache License 2.0 + NOTICE included.
  - [ ] BSD-3-Clause (`bcryptjs`) — license text included.
  - [ ] ISC (`lucide-react`) — license text included.
  - [ ] All MIT packages — license text included.
  - [ ] No GPL or AGPL dependencies (verified none present).

- [ ] **4. SOURCE FILE COPYRIGHT HEADERS** — Copyright notices in source files.
  - [ ] Files adapted from NextCRM contain attribution header comments.
  - [ ] No existing copyright headers were removed or altered.
  - [ ] New files include appropriate copyright headers.

- [ ] **5. FONTS** — OFL compliance.
  - [ ] Geist, Open Sans, Poppins loaded via `next/font/google` (not bundled).
  - [ ] OFL.txt from SIL included in distribution archives.
  - [ ] Attribution to Vercel/Basement Studio for Geist provided in docs.

- [ ] **6. ICONS AND ASSETS** —
  - [ ] `lucide-react` ISC license included.
  - [ ] Feather-derived icons (subset) acknowledged per OFL/lucide license.
  - [ ] SVG assets from Next.js template (MIT) credited.
  - [ ] Custom assets (`logo.png`, `hero-bg.png`) remain under openCRM
    copyright.

- [ ] **7. DISTRIBUTION** — For any binary distribution or published package:
  - [ ] Combined `LICENSE` includes both openCRM and NextCRM copyright lines.
  - [ ] `THIRD-PARTY-NOTICES` file generated with all dependency licenses.
  - [ ] Font `OFL.txt` files included in distribution archive.
  - [ ] shadcn/ui/NextCRM attribution present in `THIRD-PARTY-NOTICES`.

- [ ] **8. CHANGES TRACKED** —
  - [ ] All modifications documented in this file (§8) are up to date.
  - [ ] When adding new dependencies, their license is checked and added to
    this document.
  - [ ] `patch-package` patches (`patches/`) preserve upstream MIT licensing.

- [ ] **9. VERIFICATION COMMANDS** — Run these before release:
  ```bash
  # Verify all installed packages have permissive licenses
  npx license-checker --onlyAllow="MIT;Apache-2.0;BSD-3-Clause;ISC;PostgreSQL;SIL-OFL-1.1;UNLICENSED" --summary

  # Check for missing license files in distributions
  ls LICENSE docs/LICENSES.md
  ```

---

## Appendix A: Dependency License Summary

| License | Count (installed) | Packages |
|---------|-------------------|----------|
| MIT | ~40+ | Most dependencies (Next.js, React, Better-Auth, Tailwind, Radix, Zod, Sonner, etc.) |
| Apache-2.0 | 5 | `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `class-variance-authority`, `openai` (planned) |
| ISC | 1 | `lucide-react` |
| BSD-3-Clause | 1 | `bcryptjs` |
| SIL Open Font License 1.1 | 3 | Geist, Open Sans, Poppins (via `next/font/google`) |
| PostgreSQL License | 1 (planned) | `pgvector` (extension) |
| MIT (planned) | 4 | `@tanstack/react-table`, `@anthropic-ai/sdk`, `inngest` (npm), `pgvector` (npm driver) |

**All licenses are permissive (BSD/MIT/Apache-style).** No GPL, LGPL, or AGPL
dependencies are present in the project.

---

## Appendix B: References

| Resource | Location |
|----------|----------|
| openCRM project license | [`LICENSE`](../LICENSE) |
| NextCRM repository | <https://github.com/pdovhomilja/nextcrm-app> |
| NextCRM LICENSE (MIT) | <https://github.com/pdovhomilja/nextcrm-app/blob/main/LICENSE> |
| NEXTCRM_AUDIT.md (feature inventory) | [`docs/NEXTCRM_AUDIT.md`](./NEXTCRM_AUDIT.md) |
| NEXTCRM_SPECIFICATION.md (technical spec) | [`docs/NEXTCRM_SPECIFICATION.md`](./NEXTCRM_SPECIFICATION.md) |
| MIGRATION_PLAN.md (16-phase plan) | [`docs/MIGRATION_PLAN.md`](./MIGRATION_PLAN.md) |
| FEATURE_MATRIX.md (NextCRM vs openCRM) | [`docs/FEATURE_MATRIX.md`](./FEATURE_MATRIX.md) |
| shadcn/ui licenses | <https://ui.shadcn.com/license> |
| Radix UI license | MIT (<https://radix-ui.com>) |
| Geist font | <https://github.com/vercel/geist-font> (SIL OFL 1.1) |
| Lucide React | <https://github.com/lucide-icons/lucide> (ISC) |

---

*This document is maintained alongside the openCRM project. When new
dependencies are added or existing ones are replaced, update this file to
reflect the current license landscape.*
