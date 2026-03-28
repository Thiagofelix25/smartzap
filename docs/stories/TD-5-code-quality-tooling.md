# TD-5: Code Quality Tooling Setup

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 4
**Status:** Draft
**Effort:** 6-9 hours
**Priority:** HIGH
**Debt Items Covered:** #15 (ESLint/Prettier), #20 (Coverage Reporting)
**Dependencies:** SHOULD complete before TD-6 (lint rules catch SELECT * regressions)

---

## Description

Set up ESLint and Prettier for consistent code quality enforcement, and configure Vitest coverage reporting with thresholds. These tools form the foundation for maintaining code quality as debt is resolved in subsequent stories.

---

## Acceptance Criteria

### AC1: ESLint Configuration (Debt Item #15) — 3-4h
- [ ] Install ESLint and required plugins:
  - `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
  - `eslint-plugin-react`, `eslint-plugin-react-hooks`
  - `eslint-config-next` (if not already included by Next.js)
- [ ] Create `eslint.config.mjs` (flat config format for ESLint 9+)
- [ ] Configure rules:
  - `no-console: ["warn", { allow: ["error", "warn"] }]` — catch stray console.log
  - `@typescript-eslint/no-explicit-any: "warn"` — flag untyped code
  - `@typescript-eslint/no-unused-vars: "error"` — clean imports
  - React hooks rules (exhaustive-deps)
- [ ] Run `npm run lint` — document initial error/warning count
- [ ] Fix any auto-fixable issues: `npx eslint --fix .`
- [ ] Remaining issues documented as tech debt (do NOT block on fixing all)
- [ ] Verify `npm run lint` completes without errors (warnings OK)

### AC2: Prettier Configuration — 1-2h
- [ ] Install Prettier: `prettier`, `eslint-config-prettier`
- [ ] Create `.prettierrc` with project-consistent settings:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100
  }
  ```
- [ ] Create `.prettierignore` (node_modules, .next, coverage, dist)
- [ ] Add `format` script to `package.json`: `"format": "prettier --write ."`
- [ ] Add `format:check` script: `"format:check": "prettier --check ."`
- [ ] Run initial format and review changes (large diff expected — single commit)

### AC3: Coverage Reporting Setup (Debt Item #20) — 2h
- [ ] Configure Vitest coverage in `vitest.config.ts`:
  ```typescript
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    exclude: ['node_modules/', 'tests/', '*.config.*', '.next/'],
    thresholds: {
      statements: 30,
      branches: 25,
      functions: 25,
      lines: 30,
    }
  }
  ```
- [ ] Set initial thresholds LOW (based on current coverage) — raise over time
- [ ] Run `npm run test:coverage` — document baseline numbers
- [ ] Add `coverage/` to `.gitignore`
- [ ] Verify CI can run coverage report without failure

### AC4: CI Integration — 1h
- [ ] Ensure `npm run lint` runs in CI pipeline (if CI exists)
- [ ] Ensure `npm run format:check` runs in CI pipeline
- [ ] Ensure coverage thresholds are enforced in CI
- [ ] Document: thresholds will be raised incrementally as test coverage improves

---

## Technical Notes

- SmartZap already has `npm run lint` in `package.json` — check if ESLint is partially configured
- Prettier settings should match existing code style (examine a few files to determine semicolon/quote convention)
- Coverage thresholds should start at current levels to avoid blocking development; raise by 5% per sprint
- ESLint flat config is preferred over `.eslintrc` for new setups with ESLint 9+

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
