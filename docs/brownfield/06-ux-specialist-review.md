# 06 - UX Specialist Review

> **Phase 6 -- Brownfield Discovery**
> **Agent:** @ux-design-expert (Uma)
> **Date:** 2026-03-28
> **Reviewing:** `04-technical-debt-DRAFT.md` (Section 3: Frontend Debt)
> **Cross-reference:** `03-frontend-specification.md` (Sections 5, 7)

---

## Table of Contents

1. [Accessibility Audit Validation](#1-accessibility-audit-validation)
2. [Form UX Review](#2-form-ux-review)
3. [Additional Findings](#3-additional-findings)
4. [Design System Assessment](#4-design-system-assessment)
5. [Prioritized Remediation Plan](#5-prioritized-remediation-plan)
6. [Verdict](#6-verdict)

---

## 1. Accessibility Audit Validation

### 1.1 Skip Link -- CONFIRMED (Severity: HIGH)

**Draft Finding (3.1):** "Sem skip link ('Skip to main content')"

**Validation:** Confirmed. `app/layout.tsx` renders `<Providers>` and `<ThemedToaster>` directly inside `<body>` with no skip navigation link. The `DashboardShell` wraps content in a `<main>` element (via `PageContentShell`) but that `<main>` tag has no `id` attribute, making it impossible to target with a skip link even if one existed.

The `globals.css` already contains `.sr-only:focus` styles that would visually reveal a skip link on focus, so the CSS infrastructure is ready -- only the HTML element is missing.

**Impact:** Keyboard-only users and screen reader users must tab through the entire sidebar navigation (9+ items in compact mode, more in expanded) on every page load before reaching main content. This is a WCAG 2.1 Level A failure (Success Criterion 2.4.1: Bypass Blocks).

**Remediation:**

Add to `app/layout.tsx`, as the first child of `<body>`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-[var(--ds-bg-elevated)] focus:text-[var(--ds-text-primary)] focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-[var(--ds-border-default)] focus:shadow-lg focus:text-sm focus:font-medium"
>
  Pular para o conteudo principal
</a>
```

Then in `DashboardShell.tsx`, add `id="main-content"` to the `<main>` element in `PageContentShell`:

```tsx
<main id="main-content" className={...}>
```

**Effort:** 30 minutes. **Priority:** HIGH.

---

### 1.2 ARIA Labels on Notification Bell -- CONFIRMED (Severity: MEDIUM)

**Draft Finding (3.1):** "Notification count hardcoded (nao dinamico)"

**Validation:** Confirmed. In `DashboardShell.tsx` line 559:

```tsx
aria-label="Notificacoes (1 nova)"
```

And on line 561, the badge span:

```tsx
aria-label="1 notificacao nao lida"
```

Both values are hardcoded strings. The notification bell does not consume any dynamic data source -- there is no `useNotifications()` hook or notifications API endpoint. The bell appears to be a placeholder UI element with a static dot indicator.

**Impact:** Screen reader users receive inaccurate information about notification count. Since there is no notification system behind this UI element, the button is effectively non-functional, which violates user expectations.

**Remediation (two options):**

**Option A -- Remove placeholder (recommended if no notification system is planned):**
Remove the bell button entirely until a notification system is implemented. Shipping non-functional UI that announces "1 nova" to screen readers is misleading.

**Option B -- Wire to dynamic data (if notification system is planned):**

```tsx
const notificationCount = useNotificationCount() // future hook

<button
  className="..."
  aria-label={
    notificationCount > 0
      ? `Notificacoes (${notificationCount} ${notificationCount === 1 ? 'nova' : 'novas'})`
      : 'Notificacoes'
  }
>
  <Bell size={20} aria-hidden="true" />
  {notificationCount > 0 && (
    <span
      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-[var(--ds-bg-base)]"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{notificationCount} notificacao nao lida</span>
    </span>
  )}
</button>
```

**Effort:** 30min (Option A) or 2-3h (Option B). **Priority:** MEDIUM.

---

### 1.3 Missing Landmark Roles -- NEW FINDING (Severity: MEDIUM)

**Validation of sidebar landmarks:** The `DashboardSidebar.tsx` correctly uses `<aside aria-label="Menu de navegacao compacto">` with nested `<nav aria-label="Menu principal">`. This is well-implemented.

However, the `<main>` element in `PageContentShell` lacks an accessible name. While `<main>` is a landmark by default, adding `aria-label="Conteudo principal"` would improve screen reader navigation context, especially since the app has three distinct layout variants (default, builder, inbox).

Additionally, the builder and inbox layouts do NOT wrap content in a `<main>` element at all -- they use plain `<div>` containers. Only the default layout uses `PageContentShell` which renders `<main>`.

**Impact:** Screen reader users in builder/inbox views cannot navigate to a "main" landmark. WCAG 1.3.1 (Info and Relationships).

**Remediation:** Ensure all three layout variants in `DashboardShell` wrap their content area in a `<main id="main-content">` element.

**Effort:** 1h. **Priority:** MEDIUM.

---

### 1.4 Viewport Zoom Restriction -- NEW FINDING (Severity: HIGH)

In `app/layout.tsx` line 20:

```typescript
userScalable: false,
```

Combined with `maximumScale: 1`, this prevents users from zooming on mobile devices. This is a WCAG 2.1 Level AA failure (Success Criterion 1.4.4: Resize Text). Users with low vision rely on pinch-to-zoom to read content.

**Remediation:**

```typescript
export const viewport: Viewport = {
  // ... keep existing values
  maximumScale: 5,
  userScalable: true,
}
```

**Effort:** 15 minutes. **Priority:** HIGH (WCAG AA compliance).

---

### 1.5 Mobile Overlay Keyboard Accessibility -- PARTIAL (Severity: LOW)

The mobile overlay `div` correctly implements:
- `role="button"`
- `aria-label="Fechar menu"`
- `tabIndex={0}`
- `onKeyDown` handler for Escape and Enter

This is functional but uses a `div` with `role="button"` rather than a native `<button>`. While technically WCAG-compliant, a native button would provide better built-in keyboard support and click handling.

**No immediate action required** -- this is a nice-to-have improvement.

---

## 2. Form UX Review

### 2.1 Validation Timing -- PARTIALLY CONFIRMED (Severity: LOW, downgraded)

**Draft Finding (3.2):** "Alguns forms mostram erro apenas ao submit (nao em tempo real)"

**Validation:** The draft overgeneralizes. The project actually has **two form systems**:

1. **Custom Form system** (`components/ui/Form.tsx`): Configured with `mode: 'onBlur'` and `reValidateMode: 'onChange'` -- this provides real-time validation after first blur, which is a strong UX pattern.

2. **Campaign Wizard forms** (`hooks/useCampaignForm.ts`): All four form hooks (`useCampaignStep1Form`, `useCampaignStep2Form`, `useCampaignStep3Form`, `useCampaignFormComplete`) correctly use `mode: 'onBlur'` + `reValidateMode: 'onChange'`.

The core form infrastructure is well-designed. The `Form.tsx` component integrates ARIA attributes automatically (`aria-invalid`, error message IDs linked to inputs, required attribute).

**Remaining concern:** Forms outside the Form.tsx system (ad-hoc forms in feature components like settings, contacts import) may use `useForm` with default mode (`'onSubmit'`). A grep for `useForm(` in `components/features/` returned no matches, suggesting forms there use the centralized Form system or custom handlers -- but this should be verified during QA.

**Recommendation:** The draft should downgrade this from a general finding to a specific note: "Verify ad-hoc forms outside `Form.tsx` and `useCampaignForm.ts` for consistent validation timing."

**Effort:** 2h (audit). **Priority:** LOW (core forms are already well-implemented).

---

### 2.2 Form Error Recovery UX -- NEW FINDING (Severity: LOW)

The `Form.tsx` system shows error states with `AlertCircle` icons and valid states with `Check` icons. However, there is no error summary component that aggregates all form errors at the top of the form for screen reader users. WCAG best practice (not strictly required) recommends an error summary with links to each invalid field, especially for long forms like the campaign wizard.

**Recommendation:** Consider adding an optional `<FormErrorSummary>` component for multi-step wizards.

**Effort:** 3h. **Priority:** LOW.

---

## 3. Additional Findings

### 3.1 Mobile Responsiveness -- GOOD

The `DashboardShell` implements a solid responsive strategy:
- **Sidebar:** Compact (56px icons only) on desktop, full overlay on mobile with backdrop blur
- **Three layout variants:** Default, Builder (minimal chrome), Inbox (no desktop header)
- **Touch detection:** `use-touch` and `use-mobile` hooks available for conditional behavior
- **Mobile menu:** Proper overlay with z-index management, backdrop click dismiss, Escape key support

**Concern:** The builder layout uses a fixed `--builder-sidebar-width: 56px` CSS variable, which works well, but the content area does `lg:pl-14` which is a static value. If the sidebar width ever changes, these would desync. Minor maintainability issue.

**Assessment:** Responsive design is well-implemented. No critical issues found.

---

### 3.2 Dark Mode Consistency -- GOOD

The project has a comprehensive dual-token system:

1. **Design System tokens** (`--ds-*` prefix, ~85 tokens): Full light/dark mode coverage defined in `globals.css` `:root` and `.dark` blocks
2. **shadcn/ui OKLCH variables**: Synchronized with DS tokens

Both systems are defined and both have dark mode overrides. The `DashboardShell` consistently uses `var(--ds-*)` tokens for all custom styling. shadcn/ui components use their own OKLCH variables.

**Minor concern:** The dual system (DS tokens + OKLCH variables) creates maintenance overhead. Both must be updated in parallel when colors change. The `03-frontend-specification.md` documents this correctly as "synchronized but defined separately."

**Assessment:** Dark mode is well-implemented and consistent. The dual system is documented and manageable.

---

### 3.3 Performance / Lighthouse Considerations -- MIXED

**Strengths:**
- React Compiler enabled (automatic memoization)
- `optimizePackageImports` for lucide-react and @radix-ui
- ISR with client hydration pattern (no loading spinners on first page load)
- Suspense boundaries with skeleton fallbacks
- Data prefetching on sidebar hover
- Realtime event debouncing (200ms)

**Concerns:**
- `DashboardShell` is 662 lines -- a single client component handling layout, onboarding, health checks, credential modals, guided tours, success banners, and webhook alerts. This monolithic component may impact bundle size and hydration time for the dashboard route.
- `globals.css` at 1209 lines is large. Tailwind v4 purges unused utilities, but the custom token definitions, animations, and vendor overrides are always shipped.
- Three Google Fonts (Inter, Satoshi via Fontshare CDN, JetBrains Mono via Google Fonts CDN) -- each is a separate network request. Only Inter uses `next/font` optimization; the other two are loaded via CDN links, bypassing Next.js font optimization.

**Recommendation:** Consider splitting `DashboardShell` into smaller layout components (e.g., extract onboarding logic, extract header, extract modal orchestration). This would improve code maintainability and potentially reduce client-side JavaScript on routes that do not need onboarding.

**Effort:** 8-12h. **Priority:** MEDIUM.

---

### 3.4 User Testing Gaps -- OBSERVATION

No evidence of user testing infrastructure was found:
- No analytics/event tracking code
- No A/B testing framework
- No heatmap/session recording integration
- No user feedback collection mechanism

For a single-tenant SaaS, this may be acceptable if the operator has direct access to users. However, as the product matures, adding basic analytics (page views, feature usage) would inform UX decisions.

**Recommendation:** Track as future enhancement, not debt.

---

## 4. Design System Assessment

### 4.1 shadcn/ui (new-york style) Application -- GOOD

The project uses shadcn/ui new-york style with appropriate customizations:

| Aspect | Assessment |
|--------|-----------|
| Component coverage | 30+ shadcn/ui primitives installed |
| Customization approach | CVA-based extensions (button: 7 variants, 6 sizes) |
| Consistency | Components use `data-slot` attributes from shadcn/ui conventions |
| Extensions | Custom `brand` button variant, DS token integration |

The `button.tsx` component correctly extends shadcn/ui with project-specific variants (including a `brand` variant with emerald glow and a `ghost-destructive` variant) while maintaining the standard API.

**Assessment:** Well-applied. Extensions follow shadcn/ui conventions.

---

### 4.2 Color System Consistency -- GOOD with minor concern

**Primary palette (Emerald / WhatsApp green):** Consistent across all three tiers:
- Tailwind config: `--color-primary-400` through `--color-primary-950`
- DS tokens: `--ds-brand-primary: #10b981`
- shadcn/ui: OKLCH equivalents

**Background palette (Zinc scale):** Consistent and well-structured:
- Light: white -> `#fafafa` -> `#f4f4f5`
- Dark: `#09090b` -> `#18181b` -> `#27272a`

**Color contrast:** Verified in `03-frontend-specification.md` Section 7.4:
- All primary/secondary text colors meet WCAG AA (4.5:1 minimum)
- Most meet AAA (7:1)
- Muted text at 4.6-4.8:1 -- passes AA but is near the threshold

**Minor concern:** Some components directly use `bg-primary-500` Tailwind classes while others use `var(--ds-brand-primary)`. Both resolve to `#10b981` but the inconsistent reference style makes future token changes riskier. A component might use `bg-primary-500` directly and miss a DS token update.

**Assessment:** Color system is consistent and accessible. The dual-reference style is a minor maintainability concern.

---

### 4.3 Tailwind v4 Token Usage -- GOOD

The project correctly uses Tailwind CSS v4 features:
- `@import "tailwindcss"` directive (v4 style)
- `@theme` block for custom token registration
- `@custom-variant dark` for class-based dark mode
- CSS-native configuration instead of `tailwind.config.js`

The `--ds-*` custom property system is comprehensive (~85 tokens across typography, colors, borders, shadows, motion, and radius). Tokens are used consistently via `var(--ds-*)` in custom components and via Tailwind utilities in shadcn/ui components.

**Assessment:** Tailwind v4 is properly adopted with a mature token system.

---

### 4.4 Atomic Design Alignment -- PARTIAL

The component architecture loosely follows Atomic Design principles but without explicit layering:

| Atomic Level | Project Equivalent | Assessment |
|-------------|-------------------|-----------|
| Atoms | `components/ui/` (button, input, label, badge) | Well-defined |
| Molecules | `components/ui/` (FormField, stat-card, status-badge) | Mixed with atoms |
| Organisms | `components/features/` (CampaignListView, InboxView) | Well-separated |
| Templates | `DashboardShell` layout variants | Implicit, not explicit |
| Pages | `app/(dashboard)/*/page.tsx` | Clear |

**Concern:** Atoms and molecules are mixed in the same `components/ui/` directory without subdirectories to distinguish them. The `components/features/` directory correctly separates organisms by domain, which is good.

**Assessment:** The architecture works well in practice. Explicit atomic layering would improve discoverability but is not blocking.

---

## 5. Prioritized Remediation Plan

### Quick Wins (do in current sprint)

| Item | Effort | Impact | WCAG |
|------|--------|--------|------|
| **Add skip link** | 30min | Keyboard users bypass nav | 2.4.1 (A) |
| **Enable zoom** (`userScalable: true`) | 15min | Low-vision users can zoom | 1.4.4 (AA) |
| **Add `id="main-content"` to `<main>`** | 15min | Enables skip link target | 2.4.1 (A) |
| **Add `<main>` to builder/inbox layouts** | 1h | Landmark navigation | 1.3.1 (A) |

**Total quick wins: ~2h**

### Short-term (next sprint)

| Item | Effort | Impact |
|------|--------|--------|
| **Fix notification bell** (Option A: remove or Option B: wire) | 30min-3h | Accurate screen reader info |
| **Verify ad-hoc forms validation timing** | 2h | Consistent form UX |
| **Optimize font loading** (move Satoshi/JetBrains to `next/font`) | 2h | Performance, fewer network requests |

### Medium-term (1-3 months)

| Item | Effort | Impact |
|------|--------|--------|
| **Split DashboardShell** into smaller components | 8-12h | Maintainability, bundle size |
| **Add FormErrorSummary component** | 3h | A11y best practice for wizards |
| **Standardize token references** (DS tokens vs Tailwind classes) | 4h | Maintainability |

---

## 6. Verdict

### **APPROVED** -- with mandatory quick wins

**Rationale:**

The SmartZap frontend demonstrates a well-structured, professionally implemented architecture with:

- A mature design token system (~85 tokens, light/dark mode)
- Consistent shadcn/ui new-york style application with thoughtful extensions
- Good responsive design with three layout variants
- Proper ARIA attributes on interactive elements (sidebar, breadcrumbs, forms)
- Solid form validation infrastructure (onBlur + onChange revalidation)
- Tailwind CSS v4 correctly adopted with CSS-native configuration

The accessibility gaps identified (skip link, zoom restriction) are WCAG Level A/AA failures that **must** be fixed before any production accessibility claim, but they are straightforward fixes totaling approximately 2 hours of work.

The draft's assessment of frontend debt is **accurate but under-scoped**:
- Section 3.1 (A11y gaps) correctly identifies the skip link and notification issues but misses the zoom restriction (HIGH severity) and missing `<main>` landmarks in builder/inbox layouts.
- Section 3.2 (Form validation UX) is overstated -- the core form system already implements best-practice validation timing.

**Conditions for approval:**
1. The 4 quick-win items (skip link, zoom enable, main id, main element in all layouts) MUST be included in the immediate action plan
2. The zoom restriction finding (1.4) MUST be added to Section 3 of the draft as a HIGH severity item
3. Section 3.2 severity should be downgraded from LOW to NOTE (core forms are already well-implemented)

---

## Change Log

| Date | Version | Notes |
|------|---------|-------|
| 2026-03-28 | 1.0 | Phase 6 initial UX specialist review |

---

**Status:** APPROVED (with conditions)
**Next:** Phase 7 -- QA Review (@qa)
