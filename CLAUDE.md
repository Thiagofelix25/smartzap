# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartZap é um SaaS single-tenant de automação de marketing via WhatsApp, construído com Next.js 16 (App Router), React 19, Supabase (PostgreSQL) e Upstash QStash. Integra Meta WhatsApp Cloud API (v24.0) para mensagens com template e Vercel AI SDK v6 para geração de conteúdo.

## Development Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npm typecheck            # TypeScript check (zero-emission)

# Unit tests (Vitest, jsdom)
npm run test             # Run all
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI dashboard
npm run test:coverage    # Coverage report
vitest run path/to/file.test.ts          # Single test file
vitest run -t "test name"                # Single test by name

# E2E tests (Playwright, auto-starts dev server)
npm run test:e2e         # Headless (chromium + mobile)
npm run test:e2e:ui      # Interactive UI
npm run test:e2e:headed  # Browser visible
npx playwright test path/to/file.spec.ts # Single E2E file

# Specialized test suites
npm run test:e2e:whatsapp       # WhatsApp E2E scenarios (Vitest)
npm run test:ai:api             # AI API tests (Vitest)
npm run test:all                # Unit + E2E combined

# Local setup (with environment variables)
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, QSTASH_TOKEN, MASTER_PASSWORD
# Optional: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, GEMINI_API_KEY, MEM0_API_KEY
npm install
npm run dev
```

**Test file conventions**: `*.test.ts` for Vitest (unit tests), `*.spec.ts` for Playwright (in `tests/e2e/`).

## Architecture

### Frontend Pattern: Page → Hook → Service → API

```
app/(dashboard)/campaigns/page.tsx    # Thin page: wires hook to view
    ↓
hooks/useCampaigns.ts                 # Controller hook: React Query + UI state
    ↓
services/campaignService.ts           # API calls (fetch wrapper)
    ↓
app/api/campaigns/route.ts            # API Route → Supabase DB
```

- **Pages**: thin components that only connect hooks to views
- **Hooks**: controller pattern with React Query + local state + derived state
- **Services**: typed fetch wrappers for API routes
- **API Routes**: validation (Zod), business logic, DB operations

### Backend Pattern: Serverless + Queues

```
API Routes (Next.js)  →  QStash Workflow  →  Meta WhatsApp API
        ↓                     ↓
  Supabase DB           (queue/durable steps)
```

### Key Directories

```
app/                    # Next.js App Router
  (auth)/               # Auth pages (login, install wizard)
  (dashboard)/          # Dashboard pages
  api/                  # API routes (28+ sub-directories)
components/
  features/             # Feature-specific view components
  ui/                   # shadcn/ui (new-york style, RSC-enabled)
  builder/              # Workflow builder components
hooks/                  # Controller hooks (React Query pattern)
services/               # API client layer
lib/                    # Business logic & utilities
  ai/                   # AI providers & prompts
  builder/              # Workflow executor
  whatsapp/             # WhatsApp API integration
types.ts                # All TypeScript interfaces & enums
supabase/migrations/    # SQL migrations (31+ files)
```

### Provider Stack (app/providers.tsx)

```
ThemeProvider (next-themes, dark default)
  → QueryClientProvider (staleTime: 30s, gcTime: 5min, retry: 1)
    → DevModeProvider
      → CentralizedRealtimeProvider (Supabase Realtime)
        → PWAProvider
```

## Key Patterns

### Authentication

Single-tenant: no user accounts. Two auth mechanisms:

- **Dashboard login**: `MASTER_PASSWORD` env var (bcrypt-hashed comparison)
- **API routes**: `Authorization: Bearer <key>` or `X-API-Key: <key>` header
  - `SMARTZAP_API_KEY` — general API access
  - `SMARTZAP_ADMIN_KEY` — admin endpoints (`/api/database/*`, `/api/vercel/*`)
  - Public (no auth): `/api/webhook`, `/api/health`, `/api/flows`

No middleware.ts — auth enforced per-route via `verifyApiKey()` from `lib/auth.ts`.

### Supabase Client Types

Three client patterns — use the right one for the context:

```typescript
// API Routes (server-side, bypasses RLS)
import { getSupabaseAdmin } from '@/lib/supabase'
const supabase = getSupabaseAdmin()

// Client components (browser, respects RLS)
import { getSupabaseBrowser } from '@/lib/supabase'
const supabase = getSupabaseBrowser()

// Server Components (cookie-aware, @supabase/ssr)
import { createClient } from '@/lib/supabase-server'
const supabase = await createClient()
```

Both return `null` when env vars are missing (allows install wizard to run unconfigured).

### Database Layer (No ORM)

```typescript
// lib/supabase-db.ts - Direct Supabase queries with abstracted CRUD
campaignDb.getAll()
campaignDb.create({ name, templateName })
```

### Component/Controller Separation

```tsx
// components/features/campaigns/CampaignListView.tsx - PURE presentational
interface CampaignListViewProps {
  campaigns: Campaign[];
  onDelete: (id: string) => void;
  onRowClick: (id: string) => void;
}

// hooks/useCampaigns.ts - Controller hook
export const useCampaignsController = () => {
  const { data } = useCampaignsQuery();
  const [filter, setFilter] = useState('All');
  const filteredCampaigns = useMemo(() => ...);
  return { campaigns, filter, setFilter, onDelete };
};
```

### React Query Patterns

```typescript
// hooks/useCampaignsQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query: Fetch data
export const useCampaignsQuery = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => campaignService.getAll(),
    staleTime: 30_000, // 30s (from providers.tsx)
  })
}

// Mutation: Create/Update/Delete with auto-invalidation
export const useCreateCampaignMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CampaignInput) => campaignService.create(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

// Optimistic updates (optional)
export const useDeleteCampaignMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['campaigns'] })
      // Snapshot old data
      const previous = queryClient.getQueryData(['campaigns'])
      // Update cache optimistically
      queryClient.setQueryData(['campaigns'], (old: Campaign[]) =>
        old.filter(c => c.id !== id)
      )
      return { previous }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['campaigns'], context.previous)
      }
    },
  })
}
```

### WhatsApp Credentials

Fetched from Supabase `settings` table first, env vars as fallback, Redis-cached (60s TTL):

```typescript
import { getWhatsAppCredentials } from '@/lib/whatsapp-credentials'
const credentials = await getWhatsAppCredentials()
```

### Error Handling & Validation

**WhatsApp errors** (domain-specific):

```typescript
// lib/whatsapp-errors.ts - 44+ error codes mapped
mapWhatsAppError(131042)  // → { type: 'payment', message: '...', action: '...' }
isCriticalError(code)     // Payment, auth errors
isOptOutError(code)       // User blocked business
```

**General API error handling** (all routes):

```typescript
// app/api/campaigns/route.ts
import { z } from 'zod'

const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Name required'),
  templateId: z.string().uuid(),
  contactIds: z.array(z.string().uuid()).min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = CreateCampaignSchema.parse(body)

    const campaign = await campaignDb.create(data)
    return Response.json(campaign)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Campaign creation failed:', error)
    return Response.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
```

**Frontend error handling** (user feedback):

```typescript
// hooks/useCampaigns.ts
export const useCreateCampaignMutation = () => {
  return useMutation({
    mutationFn: campaignService.create,
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create campaign')
      }
    },
  })
}
```

### Phone Number Handling

```typescript
// lib/phone-formatter.ts - E.164 format required
normalizePhoneNumber('+5511999999999')
validatePhoneNumber(phone)  // Uses libphonenumber-js
```

### Forms with react-hook-form + Zod

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. Define schema
const CampaignSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  templateId: z.string().uuid('Invalid template'),
  contactIds: z.array(z.string().uuid()).min(1, 'Select at least one contact'),
})

type CampaignInput = z.infer<typeof CampaignSchema>

// 2. Use in component
export function CampaignForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CampaignInput>({
    resolver: zodResolver(CampaignSchema),
  })

  const mutation = useCreateCampaignMutation()

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <input
        {...register('name')}
        placeholder="Campaign name"
        aria-invalid={!!errors.name}
      />
      {errors.name && <span>{errors.name.message}</span>}

      <button type="submit" disabled={mutation.isPending}>
        Create
      </button>
    </form>
  )
}
```

## Testing Patterns

### Unit Tests (Vitest + jsdom)

```typescript
// lib/__tests__/phone-formatter.test.ts
import { describe, it, expect } from 'vitest'
import { normalizePhoneNumber, validatePhoneNumber } from '@/lib/phone-formatter'

describe('phone-formatter', () => {
  it('normalizes Brazilian phone numbers', () => {
    expect(normalizePhoneNumber('11 9999-9999')).toBe('+5511999999999')
  })

  it('validates E.164 format', () => {
    expect(validatePhoneNumber('+5511999999999')).toBe(true)
    expect(validatePhoneNumber('invalid')).toBe(false)
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/campaigns.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Campaigns', () => {
  test.beforeEach(async ({ page }) => {
    // Use fixture-based auth
    await page.goto('/campaigns')
    // Should be authenticated from global-setup.ts
  })

  it('creates a new campaign', async ({ page }) => {
    await page.click('[data-testid="new-campaign-btn"]')
    await page.fill('[data-testid="campaign-name"]', 'Test Campaign')
    await page.click('[data-testid="submit"]')

    await expect(page.locator('text=Test Campaign')).toBeVisible()
  })
})
```

### Test Fixtures (reusable setup)

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Load auth state from global-setup.ts
    await page.context().addCookies(/* auth cookies */)
    await use(page)
  },
})

// Usage in tests:
import { test } from './fixtures/auth'

test('protected route', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
})
```

## AI/LLM Patterns

### Using Vercel AI SDK

```typescript
// lib/ai/unified-ai-service.ts
import { generateText, generateObject } from 'ai'
import { getModel } from './model'

// Simple text generation
export async function generateResponse(prompt: string, userContext?: string) {
  const model = await getModel()

  const { text } = await generateText({
    model,
    system: `You are a helpful assistant. ${userContext ? `Context: ${userContext}` : ''}`,
    prompt,
  })

  return text
}

// Structured output (using Zod schema)
export async function analyzeMessage(text: string) {
  const model = await getModel()
  const { object } = await generateObject({
    model,
    schema: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      intent: z.string(),
      suggestedReply: z.string(),
    }),
    prompt: `Analyze: "${text}"`,
  })

  return object
}
```

### Provider Configuration (Gemini, OpenAI, Claude, etc.)

```typescript
// lib/ai/provider-factory.ts - Selects provider based on config
// Auto-routes to Gemini, OpenAI, Anthropic, Cohere, Together.ai
// Credentials from settings table (Supabase) or env vars as fallback
```

### Memory Integration (Mem0)

```typescript
// lib/ai/mem0-client.ts
const mem0 = new Mem0Client(apiKey)

// Store conversation context per user
await mem0.add(
  `User ${contactId} likes product X`,
  { userId: contactId, category: 'preference' }
)

// Retrieve memory for context
const memories = await mem0.search(contactId, limit: 5)
// Use in system prompt: "Remember these about the user: ..."
```

## Workflow Engine

Upstash Workflow SDK with durable steps:

```
lib/builder/workflow-executor.workflow.ts  # Main executor
lib/builder/nodes/                         # Node-specific handlers
```

Node types: `start`, `message`, `template`, `menu`, `input`, `condition`, `delay`, `ai_agent`, `handoff`, `end`

## Meta WhatsApp API (v24.0)

### Template Payload Structure

```json
{
  "messaging_product": "whatsapp",
  "to": "+5511999999999",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": { "code": "pt_BR" },
    "components": [
      { "type": "header", "parameters": [{ "type": "image", "image": { "id": "..." } }] },
      { "type": "body", "parameters": [{ "type": "text", "text": "{{1}} value" }] }
    ]
  }
}
```

### Rate Limits

- **Cloud API**: Up to 1000 msgs/sec
- **Pair limit**: 1 msg/6 sec to same user (error 131056)
- **Retry**: Exponential backoff per Meta recommendation

## Database Schema (Key Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `settings` | Config (credentials, tokens), Redis-cached | `key`, `value`, `updated_at` |
| `campaigns` | Campaign metadata + counters | `id`, `name`, `status`, `template_id`, `sent_count`, `failed_count` |
| `campaign_contacts` | Per-contact status + message_id | `id`, `campaign_id`, `contact_id`, `status`, `message_id` |
| `contacts` | Contact info + custom fields | `id`, `phone`, `name`, `custom_fields`, `opt_status` |
| `templates` | Template cache (synced from Meta) | `id`, `name`, `category`, `language`, `body_text` |
| `flows` | Workflow definitions | `id`, `name`, `definition` (JSON) |
| `account_alerts` | Health alerts | `id`, `type`, `message`, `created_at` |

### Querying Database (Direct SQL)

```typescript
// lib/supabase-db.ts pattern - avoid ORM, use direct queries
const result = await supabase
  .from('campaigns')
  .select('*, campaign_contacts(id, status)')
  .eq('id', campaignId)
  .single()

// With RLS (client-side):
// RLS policies enforced automatically

// Without RLS (admin API routes):
const admin = getSupabaseAdmin() // Bypasses RLS
```

## Codebase Navigation

| Need | Location |
|------|----------|
| Add new API endpoint | `app/api/{domain}/route.ts` + `services/{domain}Service.ts` |
| Add dashboard page | `app/(dashboard)/{feature}/page.tsx` + `hooks/use{Feature}.ts` |
| Add WhatsApp integration | `lib/whatsapp/{feature}.ts` + test with `npm run test:e2e:whatsapp` |
| Add AI feature | `lib/ai/{feature}.ts` + use `unified-ai-service.ts` |
| Add workflow node | `lib/builder/nodes/{nodeType}.ts` + register in `step-registry.ts` |
| Add UI component | `components/ui/{Component}.tsx` (shadcn) or `components/features/{Feature}/` |
| Add validation schema | Define in same file or `lib/schemas/` as `const MySchema = z.object(...)` |
| Add database migration | `supabase/migrations/{timestamp}_description.sql` then `supabase db push` |

## Next.js Configuration

- **React Compiler** enabled (automatic memoization)
- **Standalone output** (Docker-ready)
- **Server Actions**: 20MB body limit
- **Optimized imports**: `lucide-react`, `@radix-ui/react-icons`
- SQL migrations bundled via `outputFileTracingIncludes`
- Path alias: `@/*` → project root

## Environment Variables

### Required (for any setup)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | `eyJhbG...` |
| `SUPABASE_SECRET_KEY` | Supabase service role | `eyJhbG...` |
| `QSTASH_TOKEN` | Upstash QStash token | `xxxxx_xxxxxx_xxx` |
| `MASTER_PASSWORD` | Dashboard login password | Any string (bcrypt hashed in DB) |
| `SMARTZAP_API_KEY` | API access (general) | Generate a secure token |
| `SMARTZAP_ADMIN_KEY` | API access (admin only) | Generate a secure token |

### Optional

| Variable | Purpose | Source |
|----------|---------|--------|
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token | Meta Business Suite (falls back to DB) |
| `WHATSAPP_PHONE_ID` | WhatsApp phone number ID | Meta Business Suite (falls back to DB) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp WABA ID | Meta Business Suite (falls back to DB) |
| `GEMINI_API_KEY` | Google Gemini AI (if no Supabase config) | [Google AI Studio](https://makersuite.google.com) |
| `OPENAI_API_KEY` | OpenAI (if no Supabase config) | [platform.openai.com](https://platform.openai.com) |
| `UPSTASH_REDIS_REST_URL` | Redis cache URL | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | Upstash console |
| `MEM0_API_KEY` | Mem0 conversation memory | [mem0.com](https://mem0.com) |
| `HELICONE_API_KEY` | LLM cost monitoring | [helicone.ai](https://helicone.ai) |

**Env var aliases accepted:**
- `SUPABASE_SECRET_KEY` ← → `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ← → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Local Setup

```bash
# 1. Copy template
cp .env.example .env.local

# 2. Fill REQUIRED variables from your Supabase + Upstash projects
# Minimal .env.local for local dev:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
SUPABASE_SECRET_KEY=eyJhbG...
QSTASH_TOKEN=xxxxx_xxxxxx_xxx
MASTER_PASSWORD=yourpassword123

# 3. Install + run
npm install
npm run dev
# Visit http://localhost:3000/install for initial setup
```

## Language Conventions

- **Code**: English (variable names, function names)
- **Comments/Documentation**: Portuguese (pt-BR)
- **UI text**: Portuguese (pt-BR)

## Styling

- Tailwind CSS v4 with shadcn/ui (new-york style)
- Primary colors: `primary-400/500/600` (emerald/green)
- Backgrounds: `zinc-800/900/950`
- Icons: lucide-react exclusively

## Types Reference

```typescript
// types.ts
CampaignStatus: DRAFT | SCHEDULED | SENDING | COMPLETED | PAUSED | FAILED
TemplateCategory: 'MARKETING' | 'UTILIDADE' | 'AUTENTICACAO'
ContactStatus: OPT_IN | OPT_OUT | UNKNOWN
```

## React 19 Features Used

- **React Server Components (RSC)**: `app/` folder uses RSC by default; use `'use client'` only for interactive/stateful components
- **Server Actions**: API calls via `'use server'` functions in server components (alternative to API routes for simple mutations)
- **use() hook**: For unwrapping async values in client components
- **React Compiler**: Enabled in `next.config.ts` (automatic memoization of components)
- **Form with action prop**: Next.js supports `<form action={serverAction}>` for progressive enhancement

```typescript
// Server Component (RSC) — no interactivity needed
export default async function CampaignListPage() {
  const campaigns = await campaignDb.getAll() // Direct DB call
  return <CampaignListView campaigns={campaigns} />
}

// Client Component — state, event listeners, hooks
'use client'
export function CampaignListView({ campaigns }) {
  const [filtered, setFiltered] = useState(campaigns)
  return <div>{filtered.map(c => <CampaignCard key={c.id} campaign={c} />)}</div>
}

// Server Action — form submission
'use server'
export async function createCampaign(formData: FormData) {
  const name = formData.get('name')
  return campaignDb.create({ name })
}
```

## Known Behaviors

- **Edge cache flash-back**: Deleted items may momentarily reappear due to Vercel 10s TTL cache
- **Payment alerts**: Auto-shown on error 131042, auto-dismissed when delivery succeeds after fix
- **Null Supabase clients**: `getSupabaseAdmin()` and `getSupabaseBrowser()` return `null` when not configured — callers must handle this for the install wizard flow
- **React Compiler memoization**: May cause stale closures in event handlers; use `.bind()` or useCallback if needed
- **QStash rate limiting**: Workflows may queue; check `/api/campaign/workflow` logs for backpressure

## Debugging Tips

### Enable Debug Logging

```bash
# Verbose WhatsApp API logs
DEBUG=whatsapp:* npm run dev

# Verbose Supabase/RLS logs
NEXT_PUBLIC_SUPABASE_DEBUG=true npm run dev

# AI SDK tracing
DEBUG=ai:* npm run dev
```

### Common Issues

**"Template does not exist"** (error 131098)
- Template name must match exactly (case-sensitive)
- Sync templates first: GET `/api/templates/sync`

**"Rate limit exceeded"** (error 131056)
- Pair limit: 1 msg/6 sec to same user
- Use exponential backoff in workflow: `delay` node with calculated duration

**"Database connection refused"**
- Check `SUPABASE_SECRET_KEY` is set
- Verify Supabase project is running: `supabase status`
- Check `.env.local` is loaded: `console.log(process.env.SUPABASE_SECRET_KEY)`

**"QStash callback failed"**
- Endpoint must be publicly accessible (not localhost)
- Check workflow logs: `npm run monitor:all`
- Verify signature validation: `verifyQstashSignature()` from `@upstash/workflow`
