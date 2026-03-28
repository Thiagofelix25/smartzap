# Brownfield Discovery — Quick Wins Summary

**Data:** 2026-03-28
**Scope:** High-value, low-effort fixes from Phases 5-6

---

## 🚀 Quick Wins (Can do in 1-2 days = ~8-10 hours total)

### Priority 1: Database (2-3 hours)

#### 1.1 Fix Viewport Scaling (15 min) — **HIGH**
**From Phase 6:** `userScalable: false` is WCAG AA failure

```typescript
// next.config.ts
export const viewport = {
  userScalable: true, // Change from false
  // ... rest
}
```

**Impact:** Users can zoom on mobile (accessibility compliance)

---

#### 1.2 Add Missing Index (1 hour) — **HIGH**
**From Phase 5:** `contacts(created_at DESC)` missing

```sql
-- Migration
CREATE INDEX idx_contacts_created_at_desc
ON contacts(created_at DESC);
```

**Impact:** Fixes "Recent Contacts" query performance

---

#### 1.3 Add CHECK Constraints (1-2 hours) — **HIGH**
**From Phase 5:** Enum columns need constraints

```sql
ALTER TABLE campaign_contacts ADD CONSTRAINT chk_campaign_contacts_status
  CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped'));

ALTER TABLE contacts ADD CONSTRAINT chk_contacts_status
  CHECK (status IN ('Opt-in', 'Opt-out', 'Unknown'));

ALTER TABLE flows ADD CONSTRAINT chk_flows_status
  CHECK (status IN ('draft', 'active', 'inactive', 'archived'));

ALTER TABLE templates ADD CONSTRAINT chk_templates_status
  CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'DELETED', 'PAUSED'));

-- Counter columns need >= 0
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_sent_gte0 CHECK (sent >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_delivered_gte0 CHECK (delivered >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_read_gte0 CHECK (read >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_failed_gte0 CHECK (failed >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_skipped_gte0 CHECK (skipped >= 0);
```

**Impact:** Data integrity at database level

---

### Priority 2: Frontend A11y (2-3 hours)

#### 2.1 Add Skip Link (30 min) — **HIGH**
**From Phase 6:** WCAG Level A failure (no bypass blocks)

```tsx
// app/layout.tsx (first child of <body>)
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-[var(--ds-bg-elevated)] focus:text-[var(--ds-text-primary)] focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-[var(--ds-border-default)] focus:shadow-lg"
>
  Pular para o conteudo principal
</a>
```

Then in `components/layout/DashboardShell.tsx`:
```tsx
<main id="main-content" className={...}>
  {/* content */}
</main>
```

**Impact:** Keyboard users can skip sidebar (WCAG Level A)

---

#### 2.2 Fix Hardcoded Notification Bell (15 min) — **MEDIUM**
**From Phase 6:** `aria-label="Notificacoes (1 nova)"` is static

**Option A (Recommended):** Remove until notification system built
```tsx
// In DashboardShell.tsx, comment out or remove:
// <button className="notification-bell">
//   <Bell className="h-5 w-5" />
//   <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
// </button>
```

**Option B:** Implement notification system (6-8h, out of scope for quick wins)

**Impact:** Remove misleading A11y announcement

---

#### 2.3 Add `<main>` to All Layouts (1 hour) — **MEDIUM**
**From Phase 6:** Builder and Inbox layouts missing `<main id="main-content">`

```tsx
// components/layout/BuilderLayout.tsx
// components/layout/InboxLayout.tsx
// Add <main id="main-content"> wrapper around content

// If not present already:
<main id="main-content" className={containerClasses}>
  {children}
</main>
```

**Impact:** Semantic HTML, accessibility structure

---

#### 2.4 Review Color Contrast in Error States (30 min) — **LOW**
**From Phase 6:** Some red (#EF4444) borderline on dark background

```tsx
// Use design tokens instead of raw Tailwind red
className="border border-[var(--ds-border-critical)]" // instead of border-red-600
```

**Impact:** Improve color contrast in forms

---

### Priority 3: Code Quality (1-2 hours, optional for quick wins)

#### 3.1 ESLint + Prettier Setup (4-6h) — **HIGH**
**From Phase 4/7:** Not a quick win but foundational

```bash
npm install -D eslint @typescript-eslint/{parser,eslint-plugin} prettier

# Create .eslintrc.json, .prettierrc
# Add to package.json scripts:
# "lint": "eslint . --ext .ts,.tsx",
# "format": "prettier --write ."

# Add pre-commit hook (husky)
npm install -D husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format"
```

**Impact:** Code consistency, AI code quality

---

#### 3.2 Add E2E to CI/CD (2-3h) — **MEDIUM**
**From Phase 4/7:** Playwright tests run locally only

```yaml
# .github/workflows/e2e.yml (new file)
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**Impact:** Quality gate in CI/CD

---

## 📊 Effort Summary

| Task | Time | Impact | Difficulty |
|------|------|--------|-----------|
| 1.1 Viewport scaling | 15 min | HIGH | ✅ Easy |
| 1.2 Missing index | 1h | HIGH | ✅ Easy |
| 1.3 CHECK constraints | 1-2h | HIGH | ✅ Easy |
| 2.1 Skip link | 30 min | HIGH | ✅ Easy |
| 2.2 Notification bell | 15 min | MEDIUM | ✅ Easy |
| 2.3 Main element | 1h | MEDIUM | ✅ Easy |
| 2.4 Color contrast | 30 min | LOW | ✅ Easy |
| **Subtotal (must-do)** | **~4-5h** | — | — |
| 3.1 ESLint+Prettier | 4-6h | HIGH | ⚠️ Moderate |
| 3.2 E2E CI/CD | 2-3h | MEDIUM | ⚠️ Moderate |
| **Subtotal (optional)** | **~6-9h** | — | — |
| **TOTAL** | **~10-14h** | — | — |

---

## 🎯 Recommended Execution Order

**Day 1 (Must-do Quick Wins):**
1. Viewport scaling fix (15 min)
2. Add skip link (30 min)
3. Fix notification bell (15 min)
4. Add CHECK constraints (1-2h)
5. Add missing index (1h)
6. Add `<main>` to layouts (1h)
7. Review color contrast (30 min)

**Total Day 1: ~4-5 hours**

**Day 2 (Optional, but Recommended):**
1. ESLint + Prettier setup (4-6h)
2. E2E to CI/CD (2-3h)

**Total Day 2: ~6-9 hours**

---

## ✅ Benefits

**After Quick Wins (Day 1):**
- ✅ WCAG Level A compliance (skip link)
- ✅ WCAG AA compliance (viewport scaling)
- ✅ Data integrity (CHECK constraints)
- ✅ Performance (missing index)
- ✅ A11y clarity (remove misleading notifications)
- ✅ Semantic HTML (main elements)

**After Optional (Day 2):**
- ✅ Code quality enforcement (ESLint)
- ✅ Consistency (Prettier)
- ✅ Quality gate in CI/CD (E2E)

---

## 📝 Notes

- All quick wins are **low risk** (no breaking changes)
- Can be done in parallel (database + frontend separate)
- No business logic changes required
- All are foundational improvements

---

**Next:** Phase 7 (QA) will add Security + Testing recommendations. Phase 8 will consolidate everything into final assessment.
