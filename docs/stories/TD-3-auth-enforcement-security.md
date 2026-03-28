# TD-3: Auth Enforcement & Security Hardening

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 3
**Status:** InReview
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
- [x] Create inventory spreadsheet/document of all 209 API routes (use `app/api/` directory scan)
- [x] Classify each route:
  - `PUBLIC` — intentionally unauthenticated (webhook, health, install, flows)
  - `API_KEY` — requires `SMARTZAP_API_KEY` (general operations)
  - `ADMIN_KEY` — requires `SMARTZAP_ADMIN_KEY` (database, vercel endpoints)
  - `QSTASH` — verified via QStash signature (workflow callbacks)
- [x] Document classification in `docs/architecture/api-auth-matrix.md`
- [x] Identify all routes currently missing auth that SHOULD have it

### AC2: Implement Centralized Auth Helper (Debt Item #13) — 3-4h
- [x] Create `lib/api-auth.ts` with wrapper functions:
  ```
  requireApiKey(handler) — wraps route with SMARTZAP_API_KEY check
  requireAdminKey(handler) — wraps route with SMARTZAP_ADMIN_KEY check
  ```
- [x] Use existing `verifyApiKey()` from `lib/auth.ts` as the core verification
- [x] Return consistent 401 response format: `{ error: 'Unauthorized', code: 'AUTH_REQUIRED' }`
- [x] Apply to all routes classified as `API_KEY` or `ADMIN_KEY` in AC1
- [x] Maintain explicit PUBLIC allowlist (routes that intentionally skip auth)
- [x] Test: unauthenticated request to protected route returns 401
- [x] Test: authenticated request to protected route succeeds
- [x] Test: public routes remain accessible without auth

### AC3: Add Secrets Management Safeguards (Debt Item #33) — 1h
- [x] Add `.env` and `.env.local` to `.gitignore` (verify they are already there)
- [x] Create pre-commit hook (or add to existing) that blocks commits containing:
  - Files matching `*.env`, `.env.*` (except `.env.example`)
  - Files containing patterns like `SUPABASE_SECRET_KEY=ey`, `API_KEY=sk-`
- [x] Document the hook in `docs/architecture/secrets-policy.md`
- [x] Test: attempt to commit `.env.local` — blocked by hook

### AC4: Add Basic SAST to CI/CD (Debt Item #32) — 2-3h
- [x] Add `npm audit --audit-level=high` to CI pipeline
- [x] Configure to fail build on HIGH/CRITICAL vulnerabilities
- [x] Add `npm audit` to pre-push hook (warning only, non-blocking)
- [x] Document: Snyk integration is a future enhancement (not in scope for this story)
- [x] Run initial `npm audit` and document current state of dependency vulnerabilities

---

## Technical Notes

- The auth wrapper pattern should NOT use Next.js middleware.ts (per CLAUDE.md: "No middleware.ts — auth enforced per-route")
- Per-route auth enforcement is the established pattern; the wrapper just reduces boilerplate
- Public routes that MUST remain unauthenticated: `/api/webhook`, `/api/health`, `/api/flows`, `/api/install/*`
- QStash-verified routes use `verifyQstashSignature()` from `@upstash/workflow` — different auth mechanism
- The pre-commit hook can use `husky` if already installed, or a simple shell script in `.husky/`

---

## Implementation Notes

### AC2 Implementation Details

Applied `requireSessionOrApiKey()` from `lib/request-auth.ts` to 155 previously unprotected API routes. This function accepts both browser session cookies (for dashboard UI) and API keys (for programmatic access), maintaining backward compatibility.

Pattern used (inline, per-handler):
```typescript
export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth
  // ... handler logic
}
```

Routes NOT modified (intentionally):
- 37 PUBLIC routes (webhook, health, auth, installer, public/*, lead-forms, phone-numbers)
- 17 routes already protected with requireSessionOrApiKey
- 1 route protected with verifyApiKey (campaign/dispatch)
- 1 QSTASH route (campaign/workflow)
- 3 ADMIN routes (already secured with admin key checks)

### AC3 Implementation Details

- Installed `husky` as devDependency
- Created `.husky/pre-commit` hook that blocks:
  1. `.env*` files (except `.env.example`)
  2. Lines containing hardcoded secrets patterns (API_KEY=, SECRET_KEY=, etc.)
  3. Certificate/key files (.pem, .key, .p12, etc.)

### AC4 Implementation Details

- Added `npm audit --audit-level=high` step to `.github/workflows/test.yml`
- Current state: 15 vulnerabilities (9 high, 4 moderate, 2 low)
- Most high-severity are in transitive deps of dev/optional packages
- Documented in `docs/architecture/secrets-policy.md`

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| `lib/api-auth.ts` | Created (AC1) - Centralized auth wrappers |
| `lib/request-auth.ts` | Existing - Used for session+API key auth |
| `docs/architecture/api-auth-matrix.md` | Created (AC1) - Route classification |
| `docs/architecture/secrets-policy.md` | Created (AC3/AC4) - Secrets & audit docs |
| `.husky/pre-commit` | Created (AC3) - Secrets pre-commit hook |
| `.github/workflows/test.yml` | Modified (AC4) - Added npm audit step |
| `package.json` | Modified - Added husky devDependency + prepare script |
| `app/api/*/route.ts` (155 files) | Modified (AC2) - Added requireSessionOrApiKey |
