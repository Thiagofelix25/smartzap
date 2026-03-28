# TD-3: Auth Enforcement & Security Hardening

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 3
**Status:** Draft
**Effort:** 8-12 hours
**Priority:** HIGH
**Debt Items Covered:** #13/#30 (Auth Enforcement Gap), #33 (Secrets Management), #32 (SAST in CI/CD)
**Dependencies:** None — can start after Sprint 1

---

## Description

Address the most critical security finding: only 10% of API routes enforce authentication. Implement centralized auth verification, add secrets management safeguards, and introduce basic SAST tooling. Items #13 and #30 are the same finding listed in both Backend and Security categories.

---

## Acceptance Criteria

### AC1: Audit All API Routes for Auth Requirements (Debt Item #13) — 2h
- [ ] Create inventory spreadsheet/document of all 209 API routes (use `app/api/` directory scan)
- [ ] Classify each route:
  - `PUBLIC` — intentionally unauthenticated (webhook, health, install, flows)
  - `API_KEY` — requires `SMARTZAP_API_KEY` (general operations)
  - `ADMIN_KEY` — requires `SMARTZAP_ADMIN_KEY` (database, vercel endpoints)
  - `QSTASH` — verified via QStash signature (workflow callbacks)
- [ ] Document classification in `docs/architecture/api-auth-matrix.md`
- [ ] Identify all routes currently missing auth that SHOULD have it

### AC2: Implement Centralized Auth Helper (Debt Item #13) — 3-4h
- [ ] Create `lib/api-auth.ts` with wrapper functions:
  ```
  requireApiKey(handler) — wraps route with SMARTZAP_API_KEY check
  requireAdminKey(handler) — wraps route with SMARTZAP_ADMIN_KEY check
  ```
- [ ] Use existing `verifyApiKey()` from `lib/auth.ts` as the core verification
- [ ] Return consistent 401 response format: `{ error: 'Unauthorized', code: 'AUTH_REQUIRED' }`
- [ ] Apply to all routes classified as `API_KEY` or `ADMIN_KEY` in AC1
- [ ] Maintain explicit PUBLIC allowlist (routes that intentionally skip auth)
- [ ] Test: unauthenticated request to protected route returns 401
- [ ] Test: authenticated request to protected route succeeds
- [ ] Test: public routes remain accessible without auth

### AC3: Add Secrets Management Safeguards (Debt Item #33) — 1h
- [ ] Add `.env` and `.env.local` to `.gitignore` (verify they are already there)
- [ ] Create pre-commit hook (or add to existing) that blocks commits containing:
  - Files matching `*.env`, `.env.*` (except `.env.example`)
  - Files containing patterns like `SUPABASE_SECRET_KEY=ey`, `API_KEY=sk-`
- [ ] Document the hook in `CONTRIBUTING.md` or `docs/architecture/secrets-policy.md`
- [ ] Test: attempt to commit `.env.local` — blocked by hook

### AC4: Add Basic SAST to CI/CD (Debt Item #32) — 2-3h
- [ ] Add `npm audit --audit-level=high` to CI pipeline
- [ ] Configure to fail build on HIGH/CRITICAL vulnerabilities
- [ ] Add `npm audit` to pre-push hook (warning only, non-blocking)
- [ ] Document: Snyk integration is a future enhancement (not in scope for this story)
- [ ] Run initial `npm audit` and document current state of dependency vulnerabilities

---

## Technical Notes

- The auth wrapper pattern should NOT use Next.js middleware.ts (per CLAUDE.md: "No middleware.ts — auth enforced per-route")
- Per-route auth enforcement is the established pattern; the wrapper just reduces boilerplate
- Public routes that MUST remain unauthenticated: `/api/webhook`, `/api/health`, `/api/flows`, `/api/install/*`
- QStash-verified routes use `verifyQstashSignature()` from `@upstash/workflow` — different auth mechanism
- The pre-commit hook can use `husky` if already installed, or a simple shell script in `.husky/`

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
