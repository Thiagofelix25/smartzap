# 03 - Frontend Architecture Specification

> **Phase 3 — Brownfield Discovery**
> **Agent:** @ux-design-expert (Uma)
> **Date:** 2026-03-28
> **Scope:** Describe the current frontend architecture, patterns, components, and design system as-is.

---

## Table of Contents

1. [App Router Structure](#1-app-router-structure)
2. [Component Architecture](#2-component-architecture)
3. [State Management](#3-state-management)
4. [Design Patterns](#4-design-patterns)
5. [UI / Design System](#5-ui--design-system)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Accessibility](#7-accessibility)
8. [Summary Statistics](#8-summary-statistics)

---

## 1. App Router Structure

### 1.1 Route Groups

The application uses Next.js 16 App Router with three route groups:

| Route Group | Purpose | Layout Type |
|-------------|---------|-------------|
| `(auth)` | Login and install wizard | Passthrough (renders `children` only) |
| `(dashboard)` | Main application pages | `DashboardShell` (sidebar, header, onboarding) |
| `(public)` | Public-facing pages (lead forms) | No shared layout |

Two standalone routes exist outside groups:
- `/atendimento` — Attendant-facing view with its own layout
- `/docs` — Documentation page
- `/debug-auth` — Auth debugging utility

### 1.2 Root Layout (`app/layout.tsx`)

Server Component. Responsibilities:
- Loads `Inter` font via `next/font/google` (CSS variable `--font-inter`)
- Sets `lang="pt-BR"` on `<html>`
- Wraps all content in `<Providers>` (client component)
- Renders global `<ThemedToaster>` for toast notifications
- Defines PWA metadata (manifest, icons, apple-web-app)
- Viewport config: `device-width`, `initialScale: 1`, `userScalable: false`

### 1.3 Dashboard Layout (`app/(dashboard)/layout.tsx`)

Thin Server Component that delegates to `<DashboardShell>`:

```tsx
export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>
}
```

`DashboardShell` (662 lines, client component) is the largest layout component. It handles:
- Sidebar navigation (collapsible, mobile-responsive)
- Top header with breadcrumbs, theme toggle, dev mode toggle, notifications
- WhatsApp onboarding flow (modal, checklist, guided tour)
- Webhook alert banner
- Route-specific layout variants (builder, inbox, default)
- Data prefetching on sidebar hover (campaigns, templates, contacts, settings, dashboard)
- Health check polling for onboarding state

### 1.4 Layout Variants

`DashboardShell` renders three distinct layouts based on current route:

| Route Pattern | Layout | Characteristics |
|---------------|--------|-----------------|
| `/builder/*` | Builder | Minimal chrome, no header, compact sidebar (56px) |
| `/inbox/*` | Inbox | No desktop header, compact mobile header, full-height overflow hidden |
| Everything else | Default | Full header with breadcrumbs, padded content area, account alerts |

### 1.5 Dashboard Pages

| Route | Page Type | Data Loading |
|-------|-----------|-------------|
| `/` | RSC + Suspense | `getDashboardData()` server action, ISR 30s |
| `/campaigns` | RSC + Suspense | `getCampaignsInitialData()` server action, ISR 60s |
| `/campaigns/[id]` | Client | React Query fetch on mount |
| `/campaigns/new` | Client | Wizard flow |
| `/contacts` | RSC + Suspense | Server action with layout wrapper |
| `/inbox` | Client | React Query + Realtime subscriptions |
| `/inbox/[conversationId]` | Client | React Query + Realtime |
| `/templates` | Client | React Query |
| `/templates/[id]` | Client with layout | Nested layout for template detail |
| `/templates/new` | Client with layout | Template creation wizard |
| `/templates/drafts/[id]` | Client | Draft editor |
| `/templates/drafts/new` | Client | New draft |
| `/flows` | Client | React Query |
| `/flows/builder/[id]` | Client | Flow builder editor |
| `/forms` | Client | React Query |
| `/submissions` | Client | React Query |
| `/workflows` | Client | Dev-only (hidden unless devMode) |
| `/settings` | Client | React Query |
| `/settings/ai` | Client | AI configuration |
| `/settings/ai/agents` | Client | AI agents management |
| `/settings/attendants` | Client | Attendant management |
| `/settings/meta-diagnostics` | Client | Meta API diagnostics |
| `/settings/performance` | Client | Performance settings |
| `/design-system` | Client | Design system showcase (dev) |
| `/design-system-light` | Client | Light mode design system showcase (dev) |

### 1.6 Auth Pages

| Route | Purpose |
|-------|---------|
| `/login` | Master password login |
| `/install` | Initial setup wizard (database, QStash, credentials) |

### 1.7 Public Pages

| Route | Purpose |
|-------|---------|
| `/f/[slug]` | Public lead form renderer |

### 1.8 API Routes

The application has **180+ API route files** across these domains:

| Domain | Route Count | Key Operations |
|--------|------------|----------------|
| `/api/campaigns/*` | 18 | CRUD, dispatch, pause/resume, cancel, clone, folders, tags, traces |
| `/api/contacts/*` | 12 | CRUD, import, bulk operations, tags, stats, segment counts |
| `/api/templates/*` | 9 | CRUD, sync, drafts, clone, bulk-delete, marketing variables |
| `/api/inbox/*` | 12 | Conversations, messages, labels, quick replies, handoff, takeover |
| `/api/settings/*` | 20 | Credentials, AI, performance, integrations, onboarding |
| `/api/builder/*` | 18 | Workflow CRUD, execute, publish, API keys, integrations |
| `/api/flows/*` | 8 | Flow CRUD, submissions, templates, send, Meta publish |
| `/api/installer/*` | 10 | Bootstrap, migrations, Supabase provisioning |
| `/api/ai/*` | 5 | Generate content, respond, test, extract |
| `/api/ai-agents/*` | 6 | Agent CRUD, chat, test, providers |
| `/api/integrations/*` | 9 | Google Calendar connect/config/events/slots |
| `/api/auth/*` | 4 | Login, logout, setup, status |
| Other | ~20+ | Health, webhook, push, debug, meta, usage, system |

### 1.9 Server Actions Pattern

Server actions are colocated with page routes in `actions.ts` files:

```
app/(dashboard)/campaigns/actions.ts    # getCampaignsInitialData
app/(dashboard)/contacts/actions.ts     # getContactsInitialData
app/(dashboard)/page/actions/dashboard.ts  # getDashboardData
app/(dashboard)/forms/actions.ts        # getFormsInitialData
app/(dashboard)/inbox/actions.ts        # getInboxInitialData
app/(dashboard)/submissions/actions.ts  # getSubmissionsInitialData
```

These use `'use server'` + `cache()` for per-request deduplication and query Supabase directly via the server client (`createClient` from `lib/supabase-server`).

---

## 2. Component Architecture

### 2.1 Directory Structure

```
components/
  ui/                    # Base UI components (shadcn/ui + custom)
    icons/               # Custom icon components (1 file: CheckCircleFilled)
    page.tsx             # Page layout primitives (Page, PageHeader, PageTitle, etc.)
    button.tsx           # CVA-based button with 7 variants, 6 sizes
    sidebar.tsx          # Complex sidebar component (26KB)
    ... (60+ files)
  features/              # Feature-specific view components
    campaigns/           # 12 components
    contacts/            # 6 components
    dashboard/           # 2 components (DashboardView, DashboardSkeleton)
    flows/               # 4 components
    inbox/               # 12 components
    lead-forms/          # 2 components
    onboarding/          # 5 components
    settings/            # 20 components
    setup/               # 4 components
    submissions/         # 1 component
    templates/           # 8 components
  layout/                # Layout components
    DashboardSidebar.tsx # Sidebar navigation
  shared/                # Shared components
    WebhookAlertBanner.tsx
    WhatsAppCredentialsForm.tsx
    PermissionStatusView.tsx
  providers/             # Context providers
    CentralizedRealtimeProvider.tsx
    DevModeProvider.tsx
    PageLayoutProvider.tsx
    RealtimeProvider.tsx
  builder/               # Workflow builder components
  patterns/              # Shared UI patterns
  templates/             # Template-specific components
  install/               # Install wizard components
  attendant/             # Attendant-specific components
  pwa/                   # PWA components
  UsagePanel.tsx         # Standalone usage panel (root level)
```

### 2.2 Component Counts by Layer

| Layer | Count | Description |
|-------|-------|-------------|
| `components/ui/` | ~62 files | Base primitives (shadcn/ui + custom) |
| `components/features/` | ~76 files | Domain-specific view components |
| `components/layout/` | 1 file | Dashboard sidebar |
| `components/shared/` | 3 files | Cross-feature reusable components |
| `components/providers/` | 4 files | React context providers |
| `components/builder/` | Multiple | Workflow builder UI |

### 2.3 shadcn/ui Components (new-york style)

The following shadcn/ui primitives are installed and customized:

| Component | Customization Level |
|-----------|-------------------|
| `accordion` | Standard |
| `alert-dialog` | Standard |
| `alert` | Extended with 4 variants (default, destructive, warning, info) |
| `avatar` | Standard |
| `badge` | Extended with status variants |
| `button` | Extended: 7 variants (default, destructive, outline, secondary, ghost, ghost-destructive, link, brand), 6 sizes, DS token integration |
| `calendar` | Standard |
| `card` | Standard |
| `checkbox` | Standard |
| `collapsible` | Standard |
| `command` | Standard |
| `dialog` | Standard |
| `dropdown-menu` | Standard |
| `input` | Standard |
| `label` | Standard |
| `popover` | Standard |
| `progress` | Extended with DS tokens |
| `resizable` | Standard |
| `scroll-area` | Standard |
| `select` | Standard |
| `separator` | Standard |
| `sheet` | Standard |
| `sidebar` | Heavily customized (26KB) |
| `skeleton` | Standard |
| `slider` | Standard |
| `switch` | Standard |
| `tabs` | Standard |
| `textarea` | Standard |
| `toggle` | Standard |
| `toggle-group` | Standard |
| `tooltip` | Standard |

### 2.4 Custom UI Components

Beyond shadcn/ui, the project has custom components:

| Component | Size | Purpose |
|-----------|------|---------|
| `WhatsAppPhonePreview` | 28KB | WhatsApp message preview renderer |
| `MetaFlowPreview` | 34KB | Meta Flow preview |
| `FlowPhonePreview` | 10KB | Flow phone mockup |
| `TemplatePreviewCard` | 17KB | Template card with WhatsApp preview |
| `Form.tsx` | 12KB | Form primitives (react-hook-form + Zod integration) |
| `international-phone-input` | 11KB | International phone number input |
| `stat-card` | 8KB | Statistics card with trend indicators |
| `status-badge` | 5KB | Campaign/entity status badges |
| `section-header` | 4KB | Section header with description and actions |
| `container` | 3KB | Container wrapper component |
| `page.tsx` | 2KB | Page layout primitives (Page, PageHeader, PageTitle, PageDescription, PageActions, PageSection) |
| `confirmation-dialog` | 3KB | Reusable confirmation modal |
| `date-time-picker` | 4KB | Date/time picker component |
| `input-group` | 5KB | Input with prefix/suffix support |
| `lazy-charts` | 2KB | Lazy-loaded chart components |
| `PrefetchLink` | 2KB | Link with route prefetching |
| `RealtimeIndicator` | 4KB | Real-time connection status indicator |
| `ErrorBoundary` | 7KB | Error boundary with fallback UI |
| `whatsapp-text` | 8KB | WhatsApp text formatting renderer |

### 2.5 Page Layout System

The project uses a `PageLayoutProvider` context that allows child pages to declaratively configure their layout:

```typescript
type PageWidth = 'content' | 'wide' | 'full'
type PageOverflow = 'auto' | 'hidden'
type PageHeight = 'auto' | 'full'

interface PageLayoutConfig {
  width: PageWidth       // Wrapper max-width
  overflow: PageOverflow // <main> scroll behavior
  padded: boolean        // Apply padding to <main>
  height: PageHeight     // Full-height mode
  showAccountAlerts: boolean // Show account alert banners
}
```

Defaults: `{ width: 'content', overflow: 'auto', padded: true, height: 'auto', showAccountAlerts: true }`

The system uses a stack-based approach (`push`/`pop`) so nested components can override layout settings and restore them on unmount.

Additionally, page-level primitives are defined in `components/ui/page.tsx`:

```tsx
<Page>              {/* space-y-8 container */}
  <PageHeader>      {/* flex row with title + actions */}
    <PageTitle />   {/* h1, Satoshi display font */}
    <PageActions />  {/* flex row for action buttons */}
  </PageHeader>
  <PageSection />   {/* space-y-4 section */}
</Page>
```

---

## 3. State Management

### 3.1 React Query Configuration

Global defaults set in `app/providers.tsx`:

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — data considered fresh
      gcTime: 5 * 60 * 1000,      // 5 min — cache retained
      refetchOnWindowFocus: false, // No auto-refetch on tab focus
      refetchOnReconnect: true,    // Refetch on network reconnect
      retry: 1,                    // Single retry on failure
      retryDelay: 1000,            // 1s between retries
    },
  },
})
```

### 3.2 Provider Stack

```
ThemeProvider (next-themes, dark default, class-based)
  -> QueryClientProvider
    -> DevModeProvider
      -> CentralizedRealtimeProvider (Supabase Realtime)
        -> PWAProvider
```

All providers are client-side (`'use client'`), wrapped around children in `app/providers.tsx`.

### 3.3 Hooks Layer

The project has **60+ hooks** organized by pattern:

**Controller Hooks** (feature logic + UI state):

| Hook | Domain | Responsibilities |
|------|--------|-----------------|
| `useCampaignsController` | Campaigns | Filter, search, pagination, folder/tag filters, delete/duplicate/move mutations |
| `useCampaignDetails` | Campaign detail | Campaign data, messages, traces, polling |
| `useCampaignWizard` | Campaign creation | Multi-step wizard state |
| `useCampaignNew` | Campaign new | Template selection, contact selection |
| `useContacts` | Contacts | Search, filter, pagination, bulk operations |
| `useInbox` | Inbox | Conversation list, filters, real-time |
| `useInboxChat` | Chat | Message sending, AI suggestions, quick replies |
| `useDashboard` | Dashboard | Stats aggregation, recent campaigns |
| `useTemplates` | Templates | Template list, sync, filter |
| `useSettings` | Settings | Settings CRUD, connection testing |
| `useFlowBuilder` | Flow builder | Node/edge management, save/publish |
| `useLeadForms` | Lead forms | Form CRUD |
| `useSubmissions` | Submissions | Submission list, export |

**Data Hooks** (React Query wrappers):

| Hook | Pattern |
|------|---------|
| `useCampaignsQuery` | `useRealtimeQuery` with table subscriptions |
| `useRealtimeQuery` | Custom hook: React Query + Supabase Realtime |
| `useRealtimeStatus` | Connection status tracking |
| `useAccountAlerts` | Alert polling |
| `useAccountLimits` | Usage limits |
| `useUnreadCount` | Inbox unread badge |

**Utility Hooks:**

| Hook | Purpose |
|------|---------|
| `useMediaQuery` | Responsive breakpoint detection |
| `use-mobile` | Mobile device detection |
| `use-touch` | Touch capability detection |
| `use-copy-to-clipboard` | Clipboard operations |
| `useFocusTrap` | Focus trapping for modals |
| `useSoundFX` | Sound effects playback |
| `useServiceWorker` | PWA service worker management |
| `useMutationWithToast` | Mutation wrapper with automatic toast feedback |

### 3.4 Query Key Conventions

Query keys follow a consistent pattern:

```typescript
['campaigns']                                    // List (all)
['campaigns', { page, search, status, ... }]     // List (filtered)
['campaign', campaignId]                         // Single item
['campaignMessages', campaignId]                 // Related sub-resource
['campaignMetrics', campaignId]                  // Related sub-resource
['recentCampaigns']                              // Dashboard widget
['dashboardStats']                               // Dashboard aggregate
['contacts', { page, search, status, tag }]      // Contacts list
['templates']                                    // All templates
['settings']                                     // Settings object
['healthStatus']                                 // Health check
['authStatus']                                   // Auth state
['systemStatus']                                 // System info
```

### 3.5 Query Invalidation

Centralized in `lib/query-invalidation.ts` with helper functions:

```typescript
invalidateCampaigns(queryClient)         // campaigns + recentCampaigns
invalidateCampaign(queryClient, id)      // campaign + campaigns + messages + metrics
invalidateContacts(queryClient)          // contacts + contactStats + contactTags
```

This prevents scattered `queryClient.invalidateQueries()` calls, though some mutations still call `invalidateQueries` inline.

### 3.6 Realtime Integration

`useRealtimeQuery` extends React Query with Supabase Realtime:

```typescript
useRealtimeQuery({
  queryKey: ['campaigns', params],
  queryFn: () => campaignService.list(params),
  table: 'campaigns',                    // Supabase table to subscribe
  events: ['INSERT', 'UPDATE', 'DELETE'], // Postgres events
  debounceMs: 200,                       // Debounce refetch
})
```

On Realtime events, the hook triggers a debounced `queryClient.invalidateQueries()` instead of manually patching cache, ensuring data consistency.

### 3.7 Optimistic Updates

Used selectively for delete operations where immediate UI feedback matters:

```typescript
// useCampaignMutations — deleteMutation
onMutate: async (id) => {
  await queryClient.cancelQueries({ queryKey: ['campaigns'] })
  const previousData = queryClient.getQueriesData({ queryKey: ['campaigns'] })
  queryClient.setQueriesData({ queryKey: ['campaigns'] },
    (old) => removeCampaignFromCache(old, id)
  )
  return { previousData }
},
onError: (_err, _id, context) => {
  // Rollback
  context?.previousData.forEach(([key, data]) => {
    queryClient.setQueryData(key, data)
  })
},
```

---

## 4. Design Patterns

### 4.1 Page -> Hook -> Service -> API

The primary architectural pattern is a four-layer separation:

```
Page (RSC or Client)
  |-- Server Action (initial data, SSR)
  |-- ClientWrapper ('use client')
        |-- Controller Hook (useCampaignsController)
              |-- Data Hook (useCampaignsQuery / useRealtimeQuery)
              |-- Mutation Hooks (useCampaignMutations)
              |-- Local UI State (filter, search, pagination)
        |-- View Component (CampaignListView — presentational)
```

**Example flow for `/campaigns`:**

1. `page.tsx` (RSC) calls `getCampaignsInitialData()` server action
2. Wraps result in `<Suspense fallback={<CampaignsSkeleton />}>`
3. `CampaignsClientWrapper` receives `initialData`, calls `useCampaignsController(initialData)`
4. Controller hook passes `initialData` to `useCampaignsQuery` as initial hydration data
5. React Query uses `initialData` on first render (no loading spinner)
6. Realtime subscription auto-refreshes on Postgres changes
7. `CampaignListView` receives pure data + callbacks as props

### 4.2 Thin Pages

Pages are minimal wiring components:

```tsx
// Typical RSC page pattern
export default function CampaignsPage() {
  return (
    <Suspense fallback={<CampaignsSkeleton />}>
      <CampaignsWithData />
    </Suspense>
  )
}

async function CampaignsWithData() {
  const initialData = await getCampaignsInitialData()
  return <CampaignsClientWrapper initialData={initialData} />
}
```

Pages never contain business logic, state management, or complex rendering.

### 4.3 ClientWrapper Pattern

Each dashboard feature uses a `*ClientWrapper.tsx` component that bridges RSC data to the client-side hook system:

| Wrapper | Hook | View |
|---------|------|------|
| `CampaignsClientWrapper` | `useCampaignsController` | `CampaignListView` |
| `ContactsClientWrapper` | `useContactsController` | `ContactListView` |
| `InboxClientWrapper` | `useInboxController` | `InboxView` |
| `FormsClientWrapper` | `useLeadFormsController` | `LeadFormsView` |
| `SubmissionsClientWrapper` | `useSubmissionsController` | `SubmissionsView` |
| `DashboardClientLoader` | `useDashboardController` | `DashboardView` |

### 4.4 Service Layer

Services are typed fetch wrappers in `services/` that encapsulate API calls:

```typescript
export const campaignService = {
  list: async (params: CampaignListParams): Promise<CampaignListResult> => {
    const response = await fetch(`/api/campaigns?${searchParams}`)
    if (!response.ok) { /* error handling */ }
    return response.json()
  },
  // ... getById, create, delete, duplicate, pause, resume, cancel, start, etc.
}
```

**Key characteristics:**
- All methods are `async` functions returning typed responses
- Error handling returns empty defaults for list operations, throws for mutations
- No global fetch wrapper or interceptor — each method handles its own errors
- Services are plain objects exported as singletons (not classes)
- Each service has a companion test file (`campaignService.test.ts`)

**Services inventory:**

| Service | API Domain | Methods |
|---------|-----------|---------|
| `campaignService` | `/api/campaigns/*` | list, getAll, getById, getMetrics, getMessages, getRealStatus, create, precheck, dispatchToBackend, resendSkipped, delete, duplicate, pause, resume, cancel, start, cancelSchedule, updateStats, getTraces, getTraceEvents, listFolders, createFolder, updateFolder, deleteFolder, listTags, createTag, deleteTag, updateCampaignFolder, updateCampaignTags |
| `contactService` | `/api/contacts/*` | list, getById, create, update, delete, import, bulkStatus, bulkTags, bulkCustomField, stats, tagCounts |
| `templateService` | `/api/templates/*` | getAll, sync, getByName, clone, delete, bulkDelete, drafts |
| `settingsService` | `/api/settings/*` | get, save, saveMetaAppConfig, testConnection, getPerformance |
| `dashboardService` | `/api/dashboard/*` | getStats, getRecentCampaigns |
| `inboxService` | `/api/inbox/*` | conversations, messages, labels, quickReplies, chat |
| `flowsService` | `/api/flows/*` | list, getById, create, update, delete, send |
| `leadFormService` | `/api/lead-forms/*` | list, getById, create, update, delete |
| `submissionsService` | `/api/submissions/*` | list, export |
| `builderApiService` | `/api/builder/*` | workflows, execute, apiKeys, integrations |
| `aiAgentService` | `/api/ai-agents/*` | list, create, update, delete, chat, test |
| `metaDiagnosticsService` | `/api/meta/*` | diagnostics |
| `templateProjectService` | `/api/template-projects/*` | CRUD |
| `flowTemplatesService` | `/api/flows/templates/*` | list |
| `flowSubmissionsService` | `/api/flows/submissions/*` | list, export |
| `customFieldService` | `/api/custom-fields/*` | CRUD |
| `performanceService` | `/api/settings/performance` | get, update |
| `manualDraftsService` | `/api/templates/drafts/*` | CRUD, submit |

### 4.5 Error Handling Patterns

**Service layer:** Returns empty defaults for reads, throws for mutations.

```typescript
// Read - graceful fallback
if (!response.ok) {
  console.error('Failed to fetch campaigns:', response.statusText)
  return { data: [], total: 0, limit: params.limit, offset: params.offset }
}

// Mutation - throw with message
if (!response.ok) {
  const payload = await response.json().catch(() => ({}))
  throw new Error(payload?.error || 'Falha ao criar pasta')
}
```

**Hook layer:** `useMutationWithToast` provides standardized toast feedback for mutations.

**View layer:** Error states are handled per-component, typically showing empty states or inline error messages.

### 4.6 ISR + Client Hydration

Pages that support server-side rendering use Incremental Static Regeneration:

```typescript
// page.tsx
export const revalidate = 30  // Revalidate every 30s (dashboard)
export const revalidate = 60  // Revalidate every 60s (campaigns)
```

The RSC fetches initial data, passes it to the client wrapper, which forwards it as `initialData` to React Query. This eliminates the loading spinner on first page load while React Query takes over for subsequent updates.

---

## 5. UI / Design System

### 5.1 Tailwind CSS v4 Configuration

The project uses Tailwind CSS v4 with the `@import "tailwindcss"` directive in `globals.css`. Configuration is CSS-native:

```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));
```

Theme extensions are declared via `@theme`:

```css
@theme {
  --font-family-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-family-mono: var(--font-geist-mono), 'SF Mono', monospace;
  --color-primary-50 through --color-primary-950;
}
```

### 5.2 Design Token System

The project implements a comprehensive CSS custom property system (`--ds-*` prefix) with two theme modes:

**Token categories:**

| Category | Prefix | Token Count |
|----------|--------|-------------|
| Typography | `--ds-font-*`, `--ds-text-*` | 11 |
| Brand colors | `--ds-brand-*` | 3 |
| Background | `--ds-bg-*` | 6 |
| Text colors | `--ds-text-*` | 5 |
| Border colors | `--ds-border-*` | 4 |
| Status colors | `--ds-status-*` | 12 |
| Campaign status | `--ds-campaign-*` | 12 |
| Shadows | `--ds-shadow-*` | 14 |
| Glow effects | `--ds-glow-*` | 4 |
| Motion | `--ds-duration-*`, `--ds-ease-*`, `--ds-transition-*` | 8 |
| Border radius | `--ds-radius-*` | 6 |

**Total: ~85 design tokens** defined in `globals.css` `:root` with dark mode overrides in `.dark`.

### 5.3 Color Palette

**Primary (Emerald / WhatsApp green):**

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary-400` | `#34d399` | `#34d399` |
| `--color-primary-500` | `#10b981` | `#10b981` |
| `--color-primary-600` | `#059669` | `#059669` |
| `--ds-brand-primary` | `#10b981` | `#10b981` |

**Backgrounds (Zinc scale):**

| Token | Light | Dark |
|-------|-------|------|
| `--ds-bg-base` | `#ffffff` | `#09090b` |
| `--ds-bg-elevated` | `#fafafa` | `#18181b` |
| `--ds-bg-surface` | `#f4f4f5` | `#27272a` |

**Text:**

| Token | Light | Dark |
|-------|-------|------|
| `--ds-text-primary` | `#0a0a0a` | `#f4f4f5` |
| `--ds-text-secondary` | `#525252` | `#a1a1aa` |
| `--ds-text-muted` | `#737373` | `#71717a` |

### 5.4 Dual Color System

The project maintains two parallel color systems:

1. **Design System tokens** (`--ds-*`) — Used in inline styles and custom components via `var(--ds-*)`. Geist-inspired, high contrast.
2. **shadcn/ui OKLCH variables** (`--background`, `--foreground`, `--primary`, etc.) — Used by shadcn/ui components. OKLCH color space.

Both systems are synchronized (same visual output) but defined separately. Components use whichever system is appropriate:
- shadcn/ui primitives use OKLCH variables
- Custom components use `--ds-*` tokens directly
- Some components mix both (e.g., DashboardShell uses `var(--ds-bg-base)` alongside Tailwind classes)

### 5.5 Typography

| Token | Font | Usage |
|-------|------|-------|
| `--ds-font-display` | Satoshi | Headings, page titles |
| `--ds-font-body` | Inter | Body text, UI elements |
| `--ds-font-mono` | JetBrains Mono | Code, technical values |

Custom Tailwind utility classes are defined for typography:
- `.text-heading-1` — Satoshi display font
- `.text-body-sm` — Body small text

**Font loading:** Inter is loaded via `next/font/google` (CSS variable). Satoshi is loaded via Fontshare CDN. JetBrains Mono via Google Fonts CDN.

### 5.6 Icons

**Exclusively lucide-react.** Icons are imported per-component:

```tsx
import { Search, RefreshCw, Copy, Trash2, Calendar, Play, Pause, Loader2 } from 'lucide-react'
```

One custom icon exists: `components/ui/icons/CheckCircleFilled.tsx`.

The project does not have an `icon-map.ts` — icons are used directly from lucide-react without a centralized mapping layer.

### 5.7 Component Variant System (CVA)

Components use `class-variance-authority` for variant management:

```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "...",
      destructive: "...",
      brand: "...", // Custom brand variant with emerald glow
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      icon: "h-9 w-9",
      "icon-sm": "h-8 w-8",  // Custom icon sizes
      "icon-lg": "h-10 w-10",
    },
  },
})
```

### 5.8 Form System

Forms use react-hook-form + Zod validation with custom form primitives (`components/ui/Form.tsx`):

```tsx
// Custom Form components
<FormField label="Name" error={errors.name?.message} required>
  <Input {...register('name')} error={!!errors.name} />
</FormField>
```

Features:
- Real-time validation (onBlur)
- ARIA attributes for accessibility
- Consistent error styling with DS tokens
- Built-in `AlertCircle`, `Check`, `Loader2` icons for states

### 5.9 Theme System

- `next-themes` with `attribute="class"` and `defaultTheme="dark"`
- Theme toggle component available in header (`ThemeToggle`)
- All DS tokens have light and dark mode values
- `disableTransitionOnChange` prevents flash during theme switch

### 5.10 Globals CSS Size

`globals.css` is **1209 lines**, containing:
- Design system token definitions (light + dark modes)
- shadcn/ui OKLCH variables
- Tailwind v4 theme customizations
- Accessibility enhancements (focus styles, reduced motion)
- Custom scrollbar styling
- Workflow builder node colors (Langflow color system)
- International phone input theming
- Animation keyframes
- Utility classes (`.bg-grid-dots`, `.sr-only`, etc.)

---

## 6. Performance Optimizations

### 6.1 React Compiler

Enabled in `next.config.ts`:

```typescript
reactCompiler: true
```

This provides automatic memoization of components and hooks, reducing the need for manual `React.memo`, `useMemo`, and `useCallback`. However, manual memoization is still used extensively in DashboardShell and hooks (likely predates React Compiler adoption).

### 6.2 Optimized Package Imports

```typescript
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
}
```

This transforms barrel imports to direct module imports, significantly reducing bundle size for icon libraries.

### 6.3 Data Prefetching

`DashboardShell` prefetches route data on sidebar link hover:

```typescript
const prefetchRoute = useCallback((path) => {
  switch (path) {
    case '/campaigns':
      queryClient.prefetchQuery({ queryKey: ['campaigns', ...], staleTime: 15000 })
      break
    // ... similar for templates, contacts, settings, dashboard
  }
}, [queryClient])
```

### 6.4 ISR (Incremental Static Regeneration)

| Page | `revalidate` | Strategy |
|------|-------------|----------|
| Dashboard | 30s | Server-rendered stats, client takes over |
| Campaigns | 60s | Server-rendered list, client hydrates |

### 6.5 Suspense Boundaries

All RSC pages use `<Suspense>` with skeleton fallbacks:

```tsx
<Suspense fallback={<CampaignsSkeleton />}>
  <CampaignsWithData />
</Suspense>
```

Skeleton components exist for: Dashboard, Campaigns, Contacts, Forms.

### 6.6 Lazy Loading

- `lazy-charts.tsx` — Chart components loaded on demand
- Turbopack development server (default in Next.js 16)
- Standalone output mode for Docker deployment

### 6.7 Query Stale Times

| Query | staleTime | Purpose |
|-------|-----------|---------|
| Global default | 30s | Most queries |
| Auth status | 5 min | Rarely changes |
| Health status | 5 min | Low frequency check |
| Template list | Infinity | Rarely changes (synced from Meta) |
| Settings | 60s | Configuration data |
| Dashboard prefetch | 15s | Prefetched on hover |

### 6.8 Realtime Debouncing

Supabase Realtime events are debounced (default 200ms) to prevent excessive refetches during rapid database changes (e.g., during campaign sending).

### 6.9 Security Headers

Applied via `next.config.ts` `headers()`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` (production only)
- `poweredByHeader: false`

---

## 7. Accessibility

### 7.1 Global Accessibility Styles

Defined in `globals.css`:

**Screen reader utilities:**
```css
.sr-only { /* Standard visually-hidden class */ }
.sr-only:focus, .sr-only:focus-visible { /* Show on focus for skip links */ }
```

**Focus indicators:**
```css
:focus-visible:not(input):not(textarea):not(select) {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}

button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
}
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Placeholder contrast:**
```css
::placeholder {
  color: #71717a; /* 4.7:1 contrast ratio against zinc-900 */
}
```

### 7.2 Component-Level Accessibility

**ARIA attributes observed in codebase:**

| Pattern | Usage |
|---------|-------|
| `aria-invalid` | Form inputs with validation errors |
| `aria-label` | Buttons without visible text (icon buttons, mobile menu) |
| `aria-hidden="true"` | Decorative icons (lucide-react) |
| `aria-current="page"` | Active breadcrumb item |
| `aria-label="Breadcrumb"` | Navigation landmark |
| `role="button"` | Non-button interactive elements (mobile overlay) |
| `tabIndex={0}` | Focusable non-button elements |
| `onKeyDown` | Keyboard event handlers for Escape/Enter |

**DashboardShell accessibility patterns:**
- Mobile menu overlay has `role="button"`, `aria-label`, `tabIndex={0}`, and `onKeyDown` for keyboard dismiss
- Menu toggle button has `aria-label="Abrir menu de navegacao"`
- Breadcrumb uses `<nav aria-label="Breadcrumb">`
- Notification bell has descriptive `aria-label="Notificacoes (1 nova)"`
- Focus-visible styles use `focus-visible:outline` classes

### 7.3 Form Accessibility

The `Form.tsx` component integrates ARIA automatically:
- `aria-invalid` set on inputs with errors
- Error messages linked to inputs via generated IDs
- Required fields marked with `required` attribute and visual indicator
- `AlertCircle` icon for error states, `Check` for valid states

### 7.4 Color Contrast

Light mode uses Geist-inspired high-contrast values:
- Primary text (`#0a0a0a`) on white background: **21:1 ratio** (AAA)
- Secondary text (`#525252`) on white: **7.6:1 ratio** (AAA)
- Muted text (`#737373`) on white: **4.8:1 ratio** (AA)

Dark mode:
- Primary text (`#f4f4f5`) on `#09090b`: **19.7:1 ratio** (AAA)
- Secondary text (`#a1a1aa`) on `#09090b`: **8.5:1 ratio** (AAA)
- Muted text (`#71717a`) on `#09090b`: **4.6:1 ratio** (AA)

### 7.5 Keyboard Navigation

- Focus trap hook (`useFocusTrap`) available for modal dialogs
- `focus-visible` ring styles on all interactive elements
- `:focus:not(:focus-visible)` removes outlines for mouse users
- Escape key handling on mobile overlay
- Tab indexing on non-native interactive elements

### 7.6 Accessibility Gaps (Observed)

- No skip-to-content link in the main layout (`.sr-only:focus` styles exist but no skip link implemented)
- Notification bell has hardcoded count in `aria-label` ("1 nova") — not dynamic
- Some `hidden` nav items use `{ hidden: true }` in JS but rely on `.filter()` rather than `aria-hidden`
- No landmark roles explicitly set on `<main>` or `<aside>` elements (DashboardShell uses `<main>` element but sidebar is a `<div>`)
- `html lang="pt-BR"` is correctly set

---

## 8. Summary Statistics

| Metric | Value |
|--------|-------|
| **Framework** | Next.js 16, React 19 |
| **Build Tool** | Turbopack (dev), Webpack (prod) |
| **CSS Framework** | Tailwind CSS v4 |
| **Component Library** | shadcn/ui (new-york style) |
| **State Management** | TanStack React Query v5 |
| **Form Validation** | react-hook-form + Zod |
| **Route Groups** | 3 (auth, dashboard, public) + 2 standalone |
| **Dashboard Pages** | ~25 routes |
| **API Routes** | ~180 route files |
| **Server Actions** | 6 action files |
| **UI Components** | ~62 files |
| **Feature Components** | ~76 files |
| **Hooks** | ~60 files |
| **Services** | ~18 service files |
| **Design Tokens** | ~85 CSS custom properties |
| **globals.css Lines** | 1,209 |
| **Theme Modes** | Light + Dark (dark default) |
| **Font Stack** | Satoshi (display), Inter (body), JetBrains Mono (code) |
| **Icon Library** | lucide-react (exclusively) |
| **Realtime** | Supabase Realtime via useRealtimeQuery |
| **PWA** | Yes (manifest, service worker, push notifications) |
| **React Compiler** | Enabled (automatic memoization) |
| **Output Mode** | Standalone (Docker-ready) |
| **Default Language** | pt-BR |

---

> **Document Status:** COMPLETE
> **Next Phase:** Phase 4 — Technical Debt Draft (@architect)
