# SmartZap — System Architecture Document

**Análise Brownfield — Phase 1**
**Data:** 2026-03-28
**Status:** Rascunho de Análise

---

## 1. Executive Summary

SmartZap é um **SaaS single-tenant** de automação de marketing via WhatsApp, construído com:
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- **Backend:** Next.js API Routes (serverless) + Supabase (PostgreSQL)
- **Queues:** Upstash QStash para workflows durable
- **AI:** Vercel AI SDK v6 + suporte multi-provider (Gemini, OpenAI, Claude, Cohere)
- **Integração:** Meta WhatsApp Cloud API v24.0

**Arquitetura:** Monolith serverless com Next.js (frontend + backend colocados), Supabase para persistência, QStash para async workflows.

---

## 2. Tech Stack Actual

| Category | Technology | Version | Purpose | Notes |
|----------|-----------|---------|---------|-------|
| **Runtime** | Node.js | 20.x | JavaScript runtime | Via Vercel |
| **Language** | TypeScript | 5.x | Type safety | Configurado, sem ESLint |
| **Framework** | Next.js | 16 | Full-stack React | App Router habilitado |
| **Frontend** | React | 19 | UI components | React Compiler ativo |
| **Styling** | Tailwind CSS | v4 | Utility CSS | shadcn/ui (new-york) |
| **UI Library** | shadcn/ui | latest | Component library | RSC-enabled |
| **Forms** | react-hook-form | latest | Form management | + Zod validation |
| **State** | TanStack Query | latest | Server state | staleTime: 30s, gcTime: 5min |
| **Database** | Supabase/PostgreSQL | latest | Data storage | 31+ migrations |
| **Auth** | Custom (MASTER_PASSWORD) | — | Dashboard auth | Bcrypt hashed |
| **Queues** | Upstash QStash | v1 | Durable workflows | SDK @upstash/workflow |
| **AI** | Vercel AI SDK | v6 | LLM integration | Multi-provider support |
| **WhatsApp** | Meta Cloud API | v24.0 | Messaging | Template + text messages |
| **Testing** | Vitest | latest | Unit tests | jsdom environment |
| **E2E** | Playwright | latest | Browser tests | chromium + mobile |
| **Linting** | — | — | Code quality | ❌ **NÃO CONFIGURADO** |
| **Formatting** | — | — | Code formatting | ❌ **NÃO CONFIGURADO** |
| **Caching** | Upstash Redis | optional | Cache layer | 60s TTL configs |

---

## 3. Architecture Patterns

### Frontend Pattern: Page → Hook → Service → API
```
app/(dashboard)/campaigns/page.tsx    # Thin page (RSC)
    ↓
hooks/useCampaigns.ts                 # Controller hook (React Query)
    ↓
services/campaignService.ts           # Typed fetch wrapper
    ↓
app/api/campaigns/route.ts            # API route → Supabase
```

**Princípios:**
- Pages são thin (apenas conectam hooks a views)
- Hooks gerenciam estado e React Query
- Services abstraem API calls (fetch wrapper)
- API Routes fazem validação (Zod) + business logic

### Backend Pattern: Serverless + Workflows Durable
```
API Routes (Next.js)  →  QStash Workflow  →  Meta WhatsApp API
        ↓                     ↓
  Supabase DB           (queue/durable steps)
```

**Node types:** start, message, template, menu, input, condition, delay, ai_agent, handoff, end

---

## 4. Project Structure

```
app/                    # Next.js App Router
  (auth)/               # Auth pages (login, install wizard)
  (dashboard)/          # Dashboard pages
  api/                  # 28+ API route directories
  atendimento/          # (Purpose TBD)
  debug-auth/           # Debug utilities
  docs/                 # Documentation pages
components/
  features/             # Feature-specific view components
  ui/                   # shadcn/ui (new-york, RSC-enabled)
  builder/              # Workflow builder components
  attendant/            # (Purpose TBD)
  install/              # Install wizard components
  patterns/             # (Purpose TBD)
  layout/               # Layout components
  providers/            # Provider wrappers
hooks/                  # Controller hooks (React Query)
services/               # API client layer (typed fetch)
lib/
  ai/                   # AI providers & prompts
  builder/              # Workflow executor
  whatsapp/             # WhatsApp API integration
  phone-formatter.ts    # E.164 phone normalization
  auth.ts               # API key verification
  schemas/              # Zod validation schemas
  supabase.ts           # Supabase clients (3 variants)
  supabase-db.ts        # Abstracted CRUD layer
types.ts                # All TypeScript interfaces
supabase/migrations/    # 31+ SQL migrations
tests/
  e2e/                  # Playwright tests
lib/__tests__/          # Vitest unit tests
.github/workflows/      # 1 existing workflow (test.yml)
```

---

## 5. Key Supabase Clients

| Client | Scope | RLS | When to Use |
|--------|-------|-----|------------|
| `getSupabaseAdmin()` | API routes | ❌ Bypassed | Server-side, internal routes |
| `getSupabaseBrowser()` | Client components | ✓ Enforced | Browser, respects RLS |
| `createClient()` (Server) | Server components | ✓ Enforced | RSC, cookie-aware (@supabase/ssr) |

**Both return `null` when env vars missing** (allows install wizard to run unconfigured).

---

## 6. Database Schema (Key Tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `settings` | Config, credentials, Redis-cached | key, value, updated_at |
| `campaigns` | Campaign metadata + counters | id, name, status, template_id, sent_count, failed_count |
| `campaign_contacts` | Per-contact status | id, campaign_id, contact_id, status, message_id |
| `contacts` | Contact info + custom fields | id, phone, name, custom_fields, opt_status |
| `templates` | Template cache (Meta sync) | id, name, category, language, body_text |
| `flows` | Workflow definitions | id, name, definition (JSON) |
| `account_alerts` | Health alerts | id, type, message, created_at |

---

## 7. Authentication

**Single-tenant (no user accounts):**

| Mechanism | Where | Purpose |
|-----------|-------|---------|
| MASTER_PASSWORD | Dashboard login | Bcrypt-hashed environment variable |
| `Authorization: Bearer <key>` | API routes | General API access |
| `X-API-Key: <key>` | API routes | Alternative header |
| `SMARTZAP_API_KEY` | Global API key | General operations |
| `SMARTZAP_ADMIN_KEY` | Admin endpoints | `/api/database/*`, `/api/vercel/*` |
| Public (no auth) | `/api/webhook`, `/api/health`, `/api/flows` | Webhooks, health checks |

**Implementação:** `verifyApiKey()` in `lib/auth.ts` (per-route, não há middleware).

---

## 8. Error Handling

### WhatsApp Errors (44+ mapeados)
- `mapWhatsAppError(code)` → `{ type, message, action }`
- `isCriticalError(code)` → Payment, auth errors (bloqueadores)
- `isOptOutError(code)` → User blocked business

### API Error Handling
- Validation com Zod → 400 + error details
- Business errors → 4xx com contexto
- Unhandled errors → 500 + logged

### Frontend Error Handling
- React Query onError → toast.error()
- User-facing messages em português

---

## 9. Critical Behavioral Patterns

### WhatsApp Credentials Flow
```
DB settings table (Supabase)
  → Redis cache (60s TTL)
    → env vars as fallback
      → getWhatsAppCredentials()
```

### Phone Number Handling
- **E.164 format required:** `+5511999999999`
- `normalizePhoneNumber()` → E.164
- `validatePhoneNumber()` → libphonenumber-js

### Forms with react-hook-form + Zod
```typescript
const schema = z.object({ ... })
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

### React Query Patterns
```typescript
// Query
useQuery({ queryKey: ['campaigns'], queryFn: campaignService.getAll() })

// Mutation with auto-invalidation
useMutation({
  mutationFn: campaignService.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
})

// Optimistic updates (optional)
onMutate: (data) => { /* update cache */ }
onError: (err, data, context) => { /* rollback */ }
```

---

## 10. Provider Stack

```
ThemeProvider (next-themes, dark default)
  → QueryClientProvider (staleTime: 30s, gcTime: 5min, retry: 1)
    → DevModeProvider
      → CentralizedRealtimeProvider (Supabase Realtime)
        → PWAProvider
```

---

## 11. Existing Workflows

**GitHub Actions:** `.github/workflows/test.yml`
- Roda em push + PR para `main`
- Node.js 20 setup
- `npm install` + `tsc --noEmit` + `npm test -- --run`
- Upload de test-results (7 dias)

**Status:** ✓ Compatível com AIOX workflows (não há conflitos)

---

## 12. Known Gaps (Technical Debt)

| Gap | Severity | Impact |
|-----|----------|--------|
| ❌ ESLint não configurado | HIGH | Code quality, consistency |
| ❌ Prettier não configurado | HIGH | Formatting variance |
| ⚠️ No rate limiting on internal APIs | MEDIUM | Could be abused |
| ⚠️ Limited input validation at boundaries | MEDIUM | XSS/injection risk |
| ⚠️ Error boundary coverage incomplete | MEDIUM | UI crashes possible |
| ⚠️ E2E tests (Playwright) run locally only | LOW | CI/CD gap |

---

## 13. Recommendations for AIOX Integration

1. **Adicionar ESLint + Prettier** (melhorar qualidade)
2. **Manter workflow test.yml existente** (compatível, não mudar)
3. **Adicionar AIOX workflows** em paralelo:
   - quality-gate (lint + type check)
   - security-scan (SAST)
   - release management
4. **Documentar padrões arquiteturais** (este documento)
5. **Considerar E2E CI/CD** (Playwright em GitHub Actions)

---

## 14. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-28 | 0.1 | Rascunho inicial de Phase 1 |

---

**Next:** Phase 2 (Database Audit) — @data-engineer
**Then:** Phase 3 (Frontend Spec) — @ux-design-expert
