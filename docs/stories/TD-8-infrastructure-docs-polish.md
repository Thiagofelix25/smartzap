# TD-8: Infrastructure, Documentation & Frontend Polish

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Month 2-3
**Status:** Draft
**Effort:** 20-30 hours
**Priority:** MEDIUM
**Debt Items Covered:** #1 (Backup Strategy), #6 (Tags JSONB), #17 (Rate Limiting), #18 (Error Logging), #19/#34 (API Documentation), #21 (CI/CD Migrations), #22 (Release Management), #27 (DashboardShell Monolith), #28 (Color Contrast), #29 (Form Validation UX), #35 (Architecture Docs)
**Dependencies:** TD-1 through TD-5 should be complete (this story covers remaining items)

---

## Description

This story consolidates all remaining MEDIUM and LOW debt items into a single deliverable. It covers 4 themes: infrastructure reliability (backup, rate limiting), documentation gaps, frontend polish (DashboardShell refactor, minor UX), and operational improvements (error logging, release management). Items are grouped by theme for efficient execution.

---

## Acceptance Criteria

### Theme A: Infrastructure Reliability (10-14h)

#### AC1: Backup Strategy (Debt Item #1) — 4-6h
- [ ] Document RTO/RPO SLAs: target RTO < 4h, RPO < 24h for single-tenant
- [ ] Enable Supabase automated daily backups (verify in dashboard)
- [ ] Create `docs/architecture/backup-recovery.md` with:
  - Backup schedule and retention
  - Recovery procedure (step-by-step)
  - Monthly test cadence
- [ ] Test recovery procedure once (restore to test environment)
- [ ] Set calendar reminder for monthly recovery test

#### AC2: Rate Limiting (Debt Item #17) — 4-6h
- [ ] Install `@upstash/ratelimit` (Upstash Redis-based)
- [ ] Create `lib/rate-limiter.ts` with configurable limits
- [ ] Apply rate limiting to:
  - Webhook endpoints (prevent abuse): 100 req/min per IP
  - Login endpoint: 5 attempts/min per IP
  - Campaign send endpoint: 10 req/min per user
- [ ] Return `429 Too Many Requests` with `Retry-After` header
- [ ] Test: exceed rate limit — confirm 429 response
- [ ] Test: normal traffic within limits — confirm 200 response

#### AC3: Error Logging Improvements (Debt Item #18) — 2h
- [ ] Audit API routes for inconsistent error logging
- [ ] Ensure all catch blocks log: route name, error message, relevant IDs
- [ ] Create `lib/api-logger.ts` with standardized logging helper:
  ```typescript
  logApiError(routeName: string, error: unknown, context?: Record<string, unknown>)
  ```
- [ ] Apply to routes with bare `console.error` or missing error context
- [ ] Document logging standards in coding standards doc

---

### Theme B: Documentation (6-10h)

#### AC4: API Documentation (Debt Items #19, #34) — 4-6h
- [ ] Create `docs/api/` directory
- [ ] Document all API routes with:
  - Method + path
  - Auth requirement
  - Request body schema (reference Zod schemas from TD-4)
  - Response format
  - Error codes
- [ ] Start with most-used routes: campaigns, contacts, templates, webhook
- [ ] Format as markdown (OpenAPI spec is a future enhancement)

#### AC5: Architecture Documentation (Debt Item #35) — 2-4h
- [ ] Update `docs/architecture/` with:
  - System architecture diagram (text/mermaid)
  - Data flow diagram (webhook -> processing -> database)
  - Provider stack explanation
  - Deployment architecture
- [ ] Cross-reference with CLAUDE.md (avoid duplication)

---

### Theme C: Frontend Polish (4-8h)

#### AC6: DashboardShell Refactoring (Debt Item #27) — 4-6h
- [ ] Split `DashboardShell.tsx` (662 lines) into:
  - `DashboardShell.tsx` — layout orchestrator (~100 lines)
  - `Sidebar.tsx` — navigation sidebar
  - `TopBar.tsx` — header with search, notifications
  - `MobileNav.tsx` — mobile navigation drawer
- [ ] Verify all pages render correctly after split
- [ ] Run unit tests — zero failures
- [ ] No visual regression (compare before/after screenshots)

#### AC7: Minor UX Items (Debt Items #28, #29) — 1-2h
- [ ] Color Contrast (#28): Audit error state colors against WCAG AA (4.5:1 ratio); fix any failures
- [ ] Form Validation UX (#29): Ensure error messages appear immediately on blur (not only on submit)
- [ ] Test with browser accessibility tools

---

### Theme D: Operational (2-4h)

#### AC8: CI/CD for Migrations (Debt Item #21) — 1-2h
- [ ] Document migration deployment process in `docs/architecture/migration-process.md`
- [ ] Add migration check to CI: `supabase db diff` to detect unapplied migrations
- [ ] Or: add step to verify migration files are properly numbered/timestamped

#### AC9: Release Management (Debt Item #22) — 1-2h
- [ ] Document release process: versioning strategy, changelog, deployment steps
- [ ] Create `docs/architecture/release-process.md`
- [ ] Define version numbering (semver recommended)
- [ ] Create CHANGELOG.md with initial entry

---

## Technical Notes

- Tags JSONB normalization (item #6) is explicitly deferred — current defensive unwrapping works. Document as "future consideration" only.
- Mixed ID strategy (item #7) is deferred — document "new tables use UUID" policy.
- DashboardShell refactor should preserve all existing functionality; use feature flags if needed during transition.
- Rate limiting requires Upstash Redis credentials (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) — already optional env vars.
- This story can be split into sub-stories if the team prefers smaller deliverables.

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
