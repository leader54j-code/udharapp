# Changelog

All notable changes are documented here. This project follows semantic versioning once released.

## [Unreleased]

### Added — 2026-10-13

- Created the React/Vite/Tailwind application structure.
- Added the responsive dashboard, cash-flow chart, people, transaction, and reports screens.
- Added Express/SQLite authentication and account-scoped APIs.
- Added immutable ledger rules, charges, partial/full payments, corrections, and receipts.
- Added CSV export and JSON merge-only backup/restore.
- Added automated tests for balance calculations, overpayments, immutable history, corrections, authentication, API writes, and disk persistence.

### Verification

- `npm test`: 8 tests passed across 2 files.
- `npm run build`: production build completed successfully.
- `npm run db:seed`: demo database seeded successfully.
- Development frontend returned HTTP 200.
- `npm audit --omit=dev`: 0 production vulnerabilities.
- Browser-based visual QA was not available because the execution environment exposed no browser surface.
