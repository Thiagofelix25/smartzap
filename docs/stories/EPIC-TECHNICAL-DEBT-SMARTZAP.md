# EPIC: SmartZap Technical Debt Remediation

**Epic ID:** EPIC-TD
**Status:** Draft
**Created:** 2026-03-28
**Author:** Morgan (PM Agent) — Phase 10 Brownfield Discovery
**Source:** `docs/brownfield/08-technical-debt-assessment-FINAL.md`

---

## Description

This epic addresses 36 technical debt items identified through the complete Brownfield Discovery process (Phases 1-9). The debt spans 5 categories: Database (12 items), Backend (10 items), Frontend (7 items), Security/DevOps (5 items), and Documentation (2 items).

The assessment rated SmartZap's overall health at 7.5/10 — the codebase is well-structured, but accumulated debt creates growing risk in security, performance, and accessibility compliance.

**Scope:** 36 debt items consolidated into 8 deliverable stories.
**Estimated Total Effort:** 100-130 hours across 8-10 weeks.

---

## Business Value

### Why Now

1. **Security Risk:** Only 10% of API routes enforce authentication (item #13). 79% of endpoints are potentially exposed. This is the single highest-risk finding.
2. **Accessibility Compliance:** WCAG AA failures (viewport scaling disabled, missing skip link) expose the product to compliance risk and exclude users with disabilities.
3. **Data Integrity:** Bilingual status values (`'Rascunho'` vs `DRAFT`) cause silent query mismatches. Missing CHECK constraints allow invalid data.
4. **Performance:** 108 `SELECT *` queries across 44 files transfer unnecessary data. 4 missing indexes degrade query performance on core tables.
5. **Quality Assurance:** Zero E2E tests exist (despite prior documentation claiming otherwise). No regression detection for critical paths.

### Expected Outcomes

- All HIGH-severity items resolved (11 items)
- WCAG AA accessibility compliance achieved
- Centralized auth enforcement covering all API routes
- Database integrity guaranteed via constraints and standardized values
- E2E test coverage for critical user paths
- Measurable performance improvement from SELECT * cleanup and index additions

---

## Acceptance Criteria

- [ ] All 11 HIGH-severity items resolved and verified
- [ ] All 17 MEDIUM-severity items resolved or documented with justification for deferral
- [ ] LOW-severity items triaged (resolved or explicitly deferred to backlog)
- [ ] Each story passes QA gate before marking complete
- [ ] No regressions introduced (existing unit tests continue passing)
- [ ] Migration scripts tested in staging before production

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bilingual migration breaks existing queries | Medium | High | Run migration in staging first; audit all queries referencing status values |
| Auth enforcement blocks legitimate public routes | Medium | High | Maintain explicit allowlist for truly public routes (webhook, health, install) |
| SELECT * refactor introduces missing fields | Low | Medium | Add TypeScript column type annotations; run full test suite after each file |
| E2E test flakiness delays CI/CD | Medium | Low | Start with deterministic flows only; use MSW for API mocking |

---

## Roadmap

### Sprint 1 — Week 1-2: Quick Wins + Database Foundation (8-12h)
- **Story TD-1:** Accessibility Quick Wins (viewport, skip link, main elements, notification bell)
- **Story TD-2:** Database Integrity Foundation (indexes, constraints, unused trigger, bilingual fix)

### Sprint 2 — Week 3-4: Security + Backend Hardening (25-35h)
- **Story TD-3:** Auth Enforcement & Security Hardening (centralized auth, secrets management, SAST)
- **Story TD-4:** Input Validation Systematic Coverage (Zod schemas for unvalidated routes)
- **Story TD-5:** ESLint + Prettier + Coverage Setup (code quality tooling)

### Sprint 3 — Month 2: Performance + Testing (30-40h)
- **Story TD-6:** SELECT * Refactor (explicit column selection across 44 files)
- **Story TD-7:** E2E Test Suite Creation (critical paths + CI integration)

### Sprint 4 — Month 2-3: Polish + Documentation (20-30h)
- **Story TD-8:** Infrastructure, Documentation & Frontend Polish (backup strategy, API docs, DashboardShell refactor, remaining items)

---

## Stories

| Story ID | Title | Sprint | Effort | Priority |
|----------|-------|--------|--------|----------|
| TD-1 | Accessibility Quick Wins | Week 1 | 2-3h | HIGH |
| TD-2 | Database Integrity Foundation | Week 1-2 | 8-12h | HIGH |
| TD-3 | Auth Enforcement & Security Hardening | Week 3 | 8-12h | HIGH |
| TD-4 | Input Validation Systematic Coverage | Week 3-4 | 8-12h | HIGH |
| TD-5 | Code Quality Tooling Setup | Week 4 | 6-9h | HIGH |
| TD-6 | SELECT * Refactor | Month 2 | 8-12h | HIGH |
| TD-7 | E2E Test Suite Creation | Month 2 | 14-19h | HIGH |
| TD-8 | Infrastructure, Docs & Frontend Polish | Month 2-3 | 20-30h | MEDIUM |

**Total Estimated Effort:** 74-109h (stories) + buffer = 100-130h

---

## Dependencies

```
TD-2 (bilingual fix) ──MUST COMPLETE BEFORE──> TD-2 (CHECK constraints on campaigns.status)
TD-3 (auth enforcement) ──SHOULD COMPLETE BEFORE──> TD-4 (validation — same routes affected)
TD-5 (ESLint) ──SHOULD COMPLETE BEFORE──> TD-6 (SELECT * — lint rules catch regressions)
TD-1 (accessibility) ──NO DEPENDENCIES──> can start immediately
```

---

## Delegation

| Story | Primary Agent | Supporting Agent |
|-------|--------------|-----------------|
| TD-1 | @dev | @ux-design-expert (validation) |
| TD-2 | @dev + @data-engineer | @qa (migration testing) |
| TD-3 | @dev | @architect (auth pattern review) |
| TD-4 | @dev | @qa (coverage verification) |
| TD-5 | @dev | @devops (CI integration) |
| TD-6 | @dev | @qa (regression testing) |
| TD-7 | @qa + @dev | @devops (CI integration) |
| TD-8 | @dev + @data-engineer | @devops (backup automation) |

---

## Success Metrics

- **Security:** 100% of non-public API routes enforce auth (up from 10%)
- **Validation:** 80%+ of API routes have Zod input validation (up from 21%)
- **Performance:** Zero `SELECT *` queries in production code
- **Accessibility:** WCAG AA compliance on all dashboard pages
- **Testing:** E2E coverage for login, campaign CRUD, webhook, and flow builder
- **Quality:** ESLint + Prettier enforced in CI; coverage thresholds set

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-28 | Epic created from Phase 10 Brownfield Discovery |
