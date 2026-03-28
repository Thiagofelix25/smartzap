# TD-6: SELECT * Refactor

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Month 2 (Week 5-6)
**Status:** Draft
**Effort:** 8-12 hours
**Priority:** HIGH
**Debt Items Covered:** #3 (SELECT * Queries — 108 occurrences across 44 files)
**Dependencies:** TD-5 (ESLint) SHOULD be complete — lint rules catch regressions

---

## Description

Replace all 108 `SELECT *` queries with explicit column selection. The Phase 7 QA review escalated this from 22 to 108 occurrences — a scope expansion from the Phase 4 estimate. Primary locations: `lib/supabase-db.ts` (29), API routes (40+), hooks (20+).

This is a high-impact performance and maintainability improvement: explicit columns reduce network overhead, prevent schema fragility, and make TypeScript types more accurate.

---

## Acceptance Criteria

### AC1: Inventory All SELECT * Occurrences — 1h
- [ ] Grep for `.select('*')` and `.select()` (no args = select all) across codebase
- [ ] Create checklist of all 44 files with occurrence count
- [ ] Group by priority:
  - P1: `lib/supabase-db.ts` (29 occurrences — central data layer)
  - P2: API routes (40+ occurrences — server-side, direct perf impact)
  - P3: Hooks/services (20+ occurrences — client-side, network impact)

### AC2: Refactor lib/supabase-db.ts (P1) — 3-4h
- [ ] For each query in `supabase-db.ts`, replace `.select('*')` with explicit columns
- [ ] Determine required columns by checking:
  - TypeScript interface in `types.ts`
  - Consuming components/hooks that use the returned data
- [ ] Verify each refactored query returns the same shape (no missing fields in consumers)
- [ ] Run all unit tests — zero failures
- [ ] Run TypeScript check: `npm run typecheck` — zero errors

### AC3: Refactor API Routes (P2) — 3-4h
- [ ] For each API route with `SELECT *`, replace with explicit columns
- [ ] Pay special attention to:
  - Routes that join tables (`.select('*, related_table(*)')` — replace inner `*` too)
  - Routes that return paginated results
- [ ] Verify API responses contain same fields (no breaking changes for frontend)
- [ ] Run all unit tests after each file — catch regressions immediately

### AC4: Refactor Hooks and Services (P3) — 2-3h
- [ ] For each hook/service with `SELECT *`, replace with explicit columns
- [ ] Verify frontend components still render correctly
- [ ] Check that React Query cache keys remain consistent

### AC5: Add Lint Rule to Prevent Regression — 30 min
- [ ] Add ESLint custom rule or comment convention to flag new `SELECT *` usage
- [ ] Alternatively, add to code review checklist: "No new SELECT * queries"
- [ ] Document the pattern in `docs/framework/coding-standards.md` (or equivalent)

---

## Technical Notes

- Supabase client `.select()` with no arguments defaults to `SELECT *`
- Use `.select('id, name, status, created_at')` format
- For joins: `.select('id, name, campaign_contacts(id, status, contact_id)')`
- TypeScript will catch missing columns if the return type is properly typed
- Some queries may use `.select('*')` intentionally for dynamic/admin endpoints — document these exceptions
- Process one file at a time; run tests after each file to isolate regressions

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
