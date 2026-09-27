| # | Area | Status | Owner | Target | Next Step |
|---|------|--------|-------|--------|-----------|
| 1 | Audit Phase 1 | DONE | — | Baseline assessment complete | Move to integration sprint |
| 2 | Git Backup Branch (migration/nextcrm-core) | DONE — branche créée sur commit b81e9c7 | maintainer | Create backup branch before merge | Push branch and open tracking PR — PR À OUVRIR |
| 3 | License Compliance (both MIT) | DONE | legal/steward | License headers verified | Close compliance task |
| 4 | Multi-tenancy Integration | DONE — OrganizationMember model (schema + register + switchOrganization + migration), getUserQueueIds corrigé avec filtre orgId, 7 multi-org-isolation tests pass + 14 auth-proxy tests pass | backend team | Shared-schema tenancy model | Appliquer migration + script de migration one-time |
| 5 | Auth Layer Merge | DONE — proxy.ts (getProxySession) créé avec 14 tests, getUserContext/checkPermission centralisés via requireAdmin() helper (12 copies supprimées), bcrypt cost aligné à 12 | security team | Merge nextcrm auth into openCRM | Vérifier RBAC admin plugin `ac` statements |
| 6 | Data Model Migration | DONE — QueueMember.organizationId ajouté, Session.organizationId corrigé (String→Int), OrganizationMember model complet, migration 20260923_add_organization_member_fields | db team | Migrate entities to unified schema | Formaliser Prisma Migrate workflow |
| 7 | UI Layer Port | PARTIAL — Command palette implémenté (command-palette.tsx, wired dans layout.tsx); record-form, data-table, record-detail, kanban-board existent. i18n fully wired (~165 files use t()). Parity UI complète en cours. | frontend team | Port React components | Verify component parity |
| 8 | i18n/Branding | DONE — Système i18n avec en.ts/fr.ts, 165+ fichiers utilisant t(), login button fix appliqué | localization team | Replace "NextCRM" branding | Aucun |
| 9 | CI/Validation | DONE — `.github/workflows/ci.yml` exécute lint + typecheck + tests + build + Semgrep (returntocorp/semgrep) + pnpm audit --audit-level=high + `scripts/scan-secrets.sh` (secret scan) | devops | Restore test/lint pipelines | None |

**Test Summary:** 30 test files, 318 tests passing (all green).
