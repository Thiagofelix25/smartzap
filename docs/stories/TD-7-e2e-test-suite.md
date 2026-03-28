# TD-7: E2E Test Suite Creation

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Month 2 (Week 6-7)
**Status:** Draft
**Effort:** 14-19 hours
**Priority:** HIGH
**Debt Items Covered:** #16 (E2E Tests Missing — severity upgraded from Phase 4)
**Dependencies:** None strict — but benefits from TD-3 (auth) and TD-5 (ESLint) being complete

---

## Description

The Phase 7 QA review revealed that `tests/e2e/` is completely empty — zero E2E test files exist despite prior documentation claiming otherwise. This story creates the foundational E2E test suite for critical user paths using Playwright (already configured in `package.json`).

---

## Acceptance Criteria

### AC1: E2E Test Infrastructure Setup — 2-3h
- [ ] Verify Playwright config (`playwright.config.ts`) is correct and functional
- [ ] Create test fixtures for authenticated sessions:
  - `tests/e2e/fixtures/auth.ts` — login fixture using `MASTER_PASSWORD`
  - Global setup that creates auth state file for reuse across tests
- [ ] Create test utilities:
  - `tests/e2e/utils/test-data.ts` — factory functions for test campaigns, contacts, templates
  - `tests/e2e/utils/api-helpers.ts` — direct API calls for test setup/teardown
- [ ] Run `npx playwright test --list` — confirms test discovery works
- [ ] Verify dev server auto-starts for E2E (per `package.json` config)

### AC2: Authentication Flow Tests — 2h
- [ ] `tests/e2e/auth.spec.ts`:
  - [ ] Test: Login with correct password succeeds, redirects to dashboard
  - [ ] Test: Login with incorrect password shows error
  - [ ] Test: Unauthenticated access to dashboard redirects to login
  - [ ] Test: Session persistence (refresh page, still logged in)

### AC3: Campaign CRUD Tests — 3-4h
- [ ] `tests/e2e/campaigns.spec.ts`:
  - [ ] Test: Campaign list page loads and displays campaigns
  - [ ] Test: Create new campaign (name, template selection, contact selection)
  - [ ] Test: Edit campaign details
  - [ ] Test: Delete campaign with confirmation
  - [ ] Test: Campaign status filtering works
  - [ ] Test: Empty state shown when no campaigns exist

### AC4: Contact Management Tests — 2-3h
- [ ] `tests/e2e/contacts.spec.ts`:
  - [ ] Test: Contact list loads with pagination
  - [ ] Test: Create new contact (name, phone, tags)
  - [ ] Test: Edit contact details
  - [ ] Test: Delete contact
  - [ ] Test: Search contacts by name/phone
  - [ ] Test: Tag filtering works

### AC5: Webhook Processing Test — 2h
- [ ] `tests/e2e/webhook.spec.ts` (or `tests/e2e/webhook.test.ts` using Vitest for API-level):
  - [ ] Test: Valid Meta webhook payload is processed (status update callback)
  - [ ] Test: Invalid webhook payload returns 400
  - [ ] Test: Webhook updates campaign_contacts status correctly

### AC6: Flow Builder Smoke Test — 2h
- [ ] `tests/e2e/flow-builder.spec.ts`:
  - [ ] Test: Flow builder page loads
  - [ ] Test: Create new flow with start node
  - [ ] Test: Add a message node to flow
  - [ ] Test: Save flow and verify persistence

### AC7: CI/CD Integration — 2-3h
- [ ] Add E2E test step to CI pipeline (GitHub Actions or equivalent)
- [ ] Configure Playwright to run in headless mode for CI
- [ ] Set up test artifacts (screenshots on failure, trace files)
- [ ] Ensure E2E tests run after unit tests in pipeline
- [ ] Configure test timeout appropriate for CI (60s per test)
- [ ] Test: CI pipeline runs E2E suite and reports results

---

## Technical Notes

- Playwright is already in `package.json` — verify version and config
- Use `data-testid` attributes for reliable selectors (add to components as needed)
- MSW (Mock Service Worker) can mock external APIs (WhatsApp) during E2E
- Start with happy-path tests; edge cases can be added incrementally
- Each test should be independent — use setup/teardown to create/clean test data
- The webhook test may be better as a Vitest integration test (API-level, no browser)

---

## Test Priority Order

If time-constrained, implement in this order:
1. Auth flow (AC2) — gate for all other tests
2. Campaign CRUD (AC3) — core business flow
3. CI integration (AC7) — enables regression detection
4. Contact management (AC4)
5. Webhook (AC5)
6. Flow builder (AC6)

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
