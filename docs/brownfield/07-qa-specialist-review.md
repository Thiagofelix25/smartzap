# SmartZap -- QA Specialist Review

**Brownfield Discovery -- Phase 7**
**Data:** 2026-03-28
**Autor:** Quinn (QA Guardian)
**Status:** Review Completa
**Input:** `04-technical-debt-DRAFT.md` (Sections 2, 6, 7)

---

## 1. Backend Testing Gaps

### 1.1 E2E Tests Not in CI/CD (Draft Section 2.6) -- VALIDATED

**Finding confirmed.** The `.github/workflows/test.yml` workflow only runs:
- TypeScript type check (`tsc --noEmit`)
- Unit tests (`npm test -- --run`)

The workflow explicitly comments: `# E2E tests are run locally before deploy`. There is no Playwright job, no browser installation step, and no E2E artifacts in CI.

**Additional finding:** The `tests/e2e/` directory does not exist. No `.spec.ts` files exist in the project (excluding `node_modules`). The only E2E infrastructure present is test helpers in `tests/helpers/` (MSW handlers, factories, mocks). This means E2E tests are not just missing from CI -- they do not exist at all.

**Severity upgrade:** MEDIUM -> HIGH. The draft states E2E tests exist locally but are not in CI. In reality, there are zero E2E test files. This is a more significant gap than documented.

**Impact:**
- No regression detection for UI flows (campaign creation, contact management, inbox)
- No validation of API route integration from the frontend perspective
- WhatsApp workflow paths are completely untested end-to-end

**Recommendation:**
1. Add Playwright to CI with `npx playwright install --with-deps chromium` step
2. Start with critical path E2E: login flow, campaign send, webhook processing
3. Use MSW handlers already in `tests/helpers/msw/` for API mocking in E2E
4. Target: 5-10 critical path E2E tests before broader coverage

---

### 1.2 TypeScript Strict Mode (Draft Section 2.7) -- CORRECTED

**Finding invalidated.** The draft states `tsconfig.json` does not have `strict: true`. Actual inspection of `tsconfig.json` shows:

```json
"strict": true
```

TypeScript strict mode IS enabled. The `npm run typecheck` command (`tsc --noEmit`) runs in CI and enforces this.

**Severity correction:** LOW -> RESOLVED. This is not technical debt. Remove from the debt assessment.

**Note:** Test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) are excluded from `tsconfig.json` via the `exclude` array. This is acceptable practice -- test files use Vitest's own TypeScript handling.

---

### 1.3 Additional Testing Gaps Identified

#### 1.3.1 No Test Coverage Reporting (NEW -- MEDIUM)

The `vitest.config.ts` has no coverage configuration. No `coverage` thresholds are set. The `npm run test:coverage` command exists (per CLAUDE.md) but there is no enforcement of minimum coverage in CI.

**Impact:** No visibility into which code paths are tested. Coverage can silently degrade.

**Recommendation:** Add `c8` or `istanbul` provider to Vitest config with minimum thresholds (suggested: 60% lines for now, increase incrementally).

#### 1.3.2 No API Route Integration Tests (NEW -- HIGH)

There are 209 API route files. Unit tests exist for business logic (`lib/`), hooks, and services. However, no tests exercise the actual API route handlers (the `GET`/`POST`/`PUT`/`DELETE` exports in `route.ts` files). The test helpers (`tests/helpers/api-test-utils.ts`, `tests/helpers/fetch-mock.ts`) exist but are infrastructure only.

**Impact:** Validation logic, error handling, and auth enforcement in routes are untested. Zod schemas in routes are not exercised by tests.

**Recommendation:** Create integration tests for critical routes (auth, campaign dispatch, webhook) using the existing `api-test-utils.ts` helper.

#### 1.3.3 Unit Test Quality -- Broad but Shallow (OBSERVATION)

There are 90+ unit test files across `lib/`, `hooks/`, `services/`, and `components/`. This is a good foundation. Key well-tested areas:
- Phone formatting and validation
- WhatsApp error mapping
- Campaign business rules
- Builder utilities
- CSV parsing

However, no API route handlers are directly tested (see 1.3.2).

---

## 2. Security Debt Validation

### 2.1 No SAST (Draft Section 6.1) -- VALIDATED

**Finding confirmed.** No static analysis security testing tools are configured:
- No `npm audit` in CI workflow
- No Snyk, Semgrep, or GitHub Advanced Security (CodeQL) configured
- No dependency vulnerability scanning in the pipeline

**Severity: MEDIUM (agree with draft)**

**SAST Tool Recommendations (prioritized):**

| Tool | Effort | Coverage | Cost |
|------|--------|----------|------|
| `npm audit` in CI | 15min | Dependency vulnerabilities | Free |
| GitHub CodeQL | 1-2h | Custom SAST rules, JS/TS analysis | Free for public repos |
| Semgrep | 2-3h | OWASP Top 10, custom rules | Free tier available |
| Snyk | 1h | Deps + container scanning | Free tier (200 tests/mo) |

**Recommendation:** Start with `npm audit --audit-level=high` as a CI step (15 minutes to add). Then add CodeQL for deeper analysis.

---

### 2.2 Secrets Management (Draft Section 6.2) -- PARTIALLY VALIDATED

**Finding partially confirmed.** The `.gitignore` does properly exclude `.env*` files with multiple layers:
- `.env*` (catch-all)
- `!.env.example` (whitelist example only)
- `.env.vercel` and `.env.vercel.*` explicit exclusion
- Common secret file types (`*.pem`, `*.key`, etc.) excluded

**Severity correction:** LOW -> INFORMATIONAL. The gitignore is comprehensive. However, no pre-commit hook exists to prevent accidental commits of secrets (no `husky` or `lint-staged` in the project).

**Recommendation:** Add a git pre-commit hook (via husky) that scans for high-entropy strings and known secret patterns. Tools: `git-secrets` or `detect-secrets`.

---

### 2.3 Input Sanitization Gaps (NEW -- HIGH)

**Finding:** Zod validation is present in only 44 of 209 API routes (21% coverage). The remaining routes accept request bodies without schema validation.

Routes with Zod validation are concentrated in:
- AI agent routes (well-validated)
- Installer routes (well-validated)
- Inbox routes (partially validated)

Routes WITHOUT validation include:
- Campaign management routes
- Dashboard stats
- Debug endpoints
- Several settings routes
- Flow management routes

**Impact:** Unvalidated input can lead to injection attacks, unexpected behavior, and data corruption. The `supabase-db.ts` layer uses parameterized queries (Supabase client), which mitigates SQL injection, but application-level validation is still necessary for business rule enforcement and XSS prevention.

---

### 2.4 XSS Risk Areas (NEW -- MEDIUM)

**Findings:**

1. **`dangerouslySetInnerHTML` usage:** Found in 2 files:
   - `app/atendimento/layout.tsx`
   - `app/(dashboard)/design-system-light/page.tsx`
   These are potential XSS vectors if the HTML content is derived from user input.

2. **Sanitization exists but is inconsistent:** 34 files reference `sanitize` or `escape` functions. The `lib/promotional-sanitizer.ts` handles promotional content sanitization. However, there is no centralized input sanitization middleware.

3. **Template variable injection:** WhatsApp template variables (`{{1}}`, `{{2}}`) are user-controlled. The `lib/whatsapp/placeholder.ts` and `lib/whatsapp/validators/template.schema.ts` handle some validation, but the chain from user input to Meta API is not uniformly sanitized.

**Recommendation:** Audit the 2 `dangerouslySetInnerHTML` usages. If rendering user content, pipe through DOMPurify. For API routes, rely on Zod schemas (expand coverage per 2.3).

---

### 2.5 CSRF/CORS Assessment (NEW -- LOW)

**Findings:**

1. **No CSRF protection:** No `middleware.ts` exists at the project root. No CSRF tokens are used. However, the application uses API key authentication (`Authorization: Bearer` / `X-API-Key` headers) for API routes, which provides implicit CSRF protection (custom headers cannot be set by cross-origin form submissions).

2. **CORS configuration:** CORS headers are only set on public endpoints (`lib/http-headers.ts` -> `CORS_PUBLIC_HEADERS` with `Access-Control-Allow-Origin: *`). This is used in:
   - `/api/public/lead-forms/[slug]/route.ts`
   - `/api/public/lead-forms/[slug]/submit/route.ts`

   The wildcard origin on lead form endpoints is acceptable for public forms.

3. **Security headers:** `next.config.ts` includes comprehensive security headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` (camera, mic, geo disabled)
   - `Strict-Transport-Security` (production only)
   - `poweredByHeader: false`
   - No CSP yet (commented as intentional to avoid breakage)

**Severity: LOW.** The security header posture is solid. CSRF risk is mitigated by API key auth. CSP absence is a future improvement item but not a current vulnerability.

---

### 2.6 Authentication Coverage Gap (NEW -- HIGH)

**Critical finding:** Only 21 of 209 API route files (10%) import auth verification (`verifyApiKey`/`verifyAuth`). While `PUBLIC_ENDPOINTS` in `lib/auth.ts` lists 6 intentionally public routes, the remaining ~182 routes that should be protected do not import auth.

There is no `middleware.ts` for centralized auth enforcement. Auth is per-route, but most routes do not implement it.

**Possible mitigations not visible in code:**
- Vercel deployment may add auth at edge (not verified)
- Single-tenant nature reduces attack surface (no multi-user data leakage)
- Dashboard behind `MASTER_PASSWORD` login (cookie-based, client-side)

**Impact:** Any unauthenticated request to unprotected API routes can read/write data. This is the most significant security gap identified.

**Severity: HIGH**

**Recommendation:** Implement centralized auth via Next.js `middleware.ts` that enforces auth on all `/api/*` routes except those in `PUBLIC_ENDPOINTS`. This is a single-file change with high security ROI.

---

## 3. Code Quality Assessment

### 3.1 SELECT * Issue (Draft Section 7.1) -- VALIDATED AND EXPANDED

**Finding confirmed and worse than documented.** The draft states "22+ locations." Actual count: **108 occurrences across 44 files** of `.select()` with no explicit columns (empty select or `select('*')`).

Heaviest offenders:
- `lib/supabase-db.ts` -- 29 occurrences (the main DB abstraction layer)
- `lib/inbox/inbox-db.ts` -- 12 occurrences
- `lib/builder/workflow-db.ts` -- 5 occurrences
- `app/api/ai-agents/knowledge/route.ts` -- 5 occurrences

**Impact:**
- Over-fetching data on every query (network + memory overhead)
- Schema changes (column add/remove) propagate unexpected data
- Increased risk of leaking sensitive columns (e.g., if a `password_hash` column is added)
- Performance degradation proportional to table width

**Severity: HIGH (agree with draft).** The concentration in `supabase-db.ts` means fixing this file alone addresses 27% of occurrences.

---

### 3.2 Error Logging Gaps (Draft Section 7.2) -- VALIDATED

**Finding confirmed.** API routes contain 642 `console.log/error/warn` calls across 155 files. This is a large volume, but the concern is not volume -- it is inconsistency:

- Some routes use `console.error` with context (good)
- Some routes silently swallow errors with empty catch blocks
- No structured logging library (e.g., pino, winston)
- No request correlation IDs for tracing

**Impact:** Debugging production issues requires log correlation, which is currently impossible. Error patterns cannot be aggregated or alerted on.

**Recommendation:**
1. Adopt structured logging (pino recommended for Next.js)
2. Add request IDs via middleware or header propagation
3. Replace raw `console.error` with structured logger calls
4. Add error monitoring (Sentry or similar)

---

### 3.3 Test Coverage Estimation

Based on file analysis:

| Layer | Files with Tests | Total Files (est.) | Coverage (est.) |
|-------|------------------|--------------------|-----------------|
| `lib/` (business logic) | ~70 test files | ~120 source files | ~58% file coverage |
| `hooks/` | 6 test files | ~20 hook files | ~30% file coverage |
| `services/` | 10+ test files | ~15 service files | ~67% file coverage |
| `components/` | 2 test files | ~80+ component files | ~3% file coverage |
| `app/api/` routes | 0 test files | 209 route files | 0% file coverage |
| E2E | 0 test files | N/A | 0% |

**Overall estimated line coverage: 25-35%** (business logic well-tested, but routes and components are largely untested).

---

## 4. Testing Strategy Recommendations

### 4.1 Unit Test Coverage Targets

| Phase | Target | Timeline | Focus |
|-------|--------|----------|-------|
| Current state | ~30% estimated | -- | `lib/` business logic |
| Phase 1 (Quick wins) | 45% | 2 weeks | API route handlers, auth logic |
| Phase 2 (Solid base) | 60% | 1 month | Hooks, critical components |
| Phase 3 (Mature) | 75% | 3 months | Full component coverage |

**Priority test additions:**
1. `lib/auth.ts` -- verify all auth paths (already has `auth.test.ts`, verify completeness)
2. Campaign dispatch route -- critical business path
3. Webhook route -- external-facing, security-critical
4. Settings routes -- credential management

### 4.2 Integration Test Gaps

**Critical missing integration tests:**
1. **Auth flow end-to-end:** Login -> cookie -> API access -> logout
2. **Campaign lifecycle:** Create -> schedule -> dispatch -> webhook status update
3. **WhatsApp webhook processing:** Receive -> validate signature -> process -> update DB
4. **Workflow execution:** Trigger -> QStash -> step execution -> completion

**Recommendation:** Use the existing `tests/helpers/` infrastructure (MSW, factories, fetch-mock) to build integration tests without external dependencies.

### 4.3 Security Testing Approach

| Test Type | Tool | Priority | Effort |
|-----------|------|----------|--------|
| Dependency audit | `npm audit` in CI | P0 | 15min |
| SAST | GitHub CodeQL | P1 | 2h |
| Auth bypass testing | Custom Vitest suite | P0 | 4h |
| Input validation | Zod schema coverage tests | P1 | 8h |
| Secret scanning | `detect-secrets` pre-commit | P2 | 1h |

**Auth bypass test suite (P0):** Write tests that hit every non-public API route without auth headers and verify 401/403 responses. Given that only 10% of routes currently import auth, this suite will immediately identify unprotected endpoints.

### 4.4 Load Testing Needs

**Not currently addressed.** Given SmartZap handles WhatsApp campaign dispatch (potentially thousands of messages), load testing is important for:

1. **Campaign dispatch throughput:** Simulate 1000+ contact campaigns
2. **Webhook ingestion rate:** Meta sends delivery receipts at high volume
3. **Concurrent inbox sessions:** Multiple attendants handling conversations

**Recommendation:** Use `k6` or `autocannon` for load testing. Start with the campaign dispatch endpoint, which is the highest-throughput path.

---

## 5. Summary of Findings

### Draft Validations

| Draft Item | Section | Verdict | Notes |
|------------|---------|---------|-------|
| E2E not in CI | 2.6 | VALIDATED + UPGRADED | E2E tests do not exist at all (not just missing from CI) |
| No type strictness | 2.7 | INVALIDATED | `strict: true` IS set in tsconfig.json |
| No SAST | 6.1 | VALIDATED | No security scanning in pipeline |
| Secrets management | 6.2 | PARTIALLY VALIDATED | Gitignore is comprehensive; pre-commit hook missing |
| SELECT * | 7.1 | VALIDATED + EXPANDED | 108 occurrences (not 22+), concentrated in DB layer |
| Error logging | 7.2 | VALIDATED | 642 console calls, no structured logging |

### New Findings

| Finding | Severity | Section |
|---------|----------|---------|
| No E2E test files exist | HIGH | 1.1 |
| No test coverage reporting in CI | MEDIUM | 1.3.1 |
| No API route integration tests | HIGH | 1.3.2 |
| Input validation in only 21% of routes | HIGH | 2.3 |
| 2 dangerouslySetInnerHTML usages | MEDIUM | 2.4 |
| Auth enforcement in only 10% of routes | HIGH | 2.6 |
| No structured logging | MEDIUM | 3.2 |
| No load testing | MEDIUM | 4.4 |

### Revised Severity Distribution

| Severity | Draft Count | Revised Count | Delta |
|----------|-------------|---------------|-------|
| CRITICAL | 0 | 0 | -- |
| HIGH | 6 | 9 (+3 new) | +3 |
| MEDIUM | 11 | 13 (+3 new, -1 resolved) | +2 |
| LOW | 8 | 7 (-1 resolved) | -1 |

---

## 6. Verdict

### **NEEDS_REVISION**

**Rationale:** The Phase 4 draft is a solid foundation but contains one factual error (TypeScript strict mode) and significantly underestimates the scope of three findings:

1. **E2E tests do not exist** (draft says they exist but are not in CI)
2. **SELECT * count is 108, not 22+** (5x underestimate)
3. **Auth enforcement gap is critical** (10% of routes, not documented in draft)

The auth coverage gap (Section 2.6) is the most significant finding from this review and was not present in the Phase 4 draft at all. While not CRITICAL (single-tenant reduces blast radius), it must be added to the HIGH priority list.

**Required revisions before Phase 8:**
1. Correct Section 2.7 (TypeScript strict mode is enabled -- remove as debt item)
2. Update Section 2.6 to reflect that zero E2E tests exist, and upgrade to HIGH
3. Update Section 7.1 SELECT * count to 108 occurrences across 44 files
4. Add new Section 6.3: Authentication enforcement gap (HIGH)
5. Add new Section 6.4: Input validation coverage gap (HIGH)
6. Update prioritization matrix (Section 8) to reflect revised severities

---

## Change Log

| Date | Version | Notes |
|------|---------|-------|
| 2026-03-28 | 1.0 | Phase 7 QA specialist review complete |

---

**Status:** NEEDS_REVISION -- returned to @architect for corrections before Phase 8 consolidation.

--- Quinn, guardiao da qualidade
