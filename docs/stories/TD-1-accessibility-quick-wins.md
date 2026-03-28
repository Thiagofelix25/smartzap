# TD-1: Accessibility Quick Wins

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 1
**Status:** Draft
**Effort:** 2-3 hours
**Priority:** HIGH
**Debt Items Covered:** #1 (Viewport Scaling), #24 (Skip Link), #25 (Notification Bell), #26 (Missing Main Elements)
**Dependencies:** None — can start immediately

---

## Description

Fix 4 accessibility issues that collectively bring SmartZap closer to WCAG AA compliance. These are all quick, low-risk changes with high impact on usability for assistive technology users.

---

## Acceptance Criteria

### AC1: Fix Viewport Scaling (Debt Item #23) — 15 min
- [ ] Change `userScalable: false` to `userScalable: true` in viewport config
- [ ] Verify on mobile device/emulator that pinch-to-zoom works
- [ ] Confirm no layout breakage at 200% zoom on desktop
- [ ] WCAG 1.4.4 (Resize Text) success criterion met

### AC2: Add Skip Link (Debt Item #24) — 30 min
- [ ] Add `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-zinc-900 focus:text-white">Pular para conteudo principal</a>` as first child of `<body>` in `app/layout.tsx`
- [ ] Add `id="main-content"` to `<main>` element in `DashboardShell.tsx`
- [ ] Test with keyboard: skip link appears on first Tab press
- [ ] Test with screen reader: skip link is announced
- [ ] Verify sr-only + focus styles work correctly
- [ ] WCAG 2.4.1 (Bypass Blocks) success criterion met

### AC3: Remove Hardcoded Notification Bell (Debt Item #25) — 15 min
- [ ] Remove or hide the notification bell with hardcoded `aria-label="Notificacoes (1 nova)"`
- [ ] Verify no visual regression in header area
- [ ] Document: notification system is a future feature, not current

### AC4: Fix Missing Main Elements (Debt Item #26) — 1 hour
- [ ] Ensure Builder layout has proper `<main>` landmark
- [ ] Ensure Inbox layout has proper `<main>` landmark
- [ ] Verify that DashboardShell's `<main>` is not overridden/duplicated
- [ ] Run accessibility audit (browser DevTools) on each layout — zero landmark warnings

---

## Technical Notes

- Viewport fix is in `app/layout.tsx` or `next.config.ts` metadata export
- Skip link must be the very first focusable element in the DOM
- Notification bell is in the header component — remove the entire bell icon + badge, not just the label
- Main element fix may require checking `app/(dashboard)/builder/layout.tsx` and `app/(dashboard)/inbox/layout.tsx`

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
