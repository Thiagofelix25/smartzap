# SmartZap — Technical Debt Assessment (DRAFT)

**Brownfield Discovery — Phase 4**
**Data:** 2026-03-28
**Autor:** Aria (Architect Agent)
**Status:** Rascunho para Validação (Phases 5-7)

---

## Executive Summary

SmartZap é uma base de código **bem-estruturada** com padrões sólidos, mas com **8-10 áreas de debt técnico** distribuídas entre backend, frontend e DevOps.

**Severity Distribution:**
- **CRITICAL (Blocks):** 0
- **HIGH (Must fix):** 6 itens
- **MEDIUM (Should fix):** 11 itens
- **LOW (Nice to fix):** 8 itens

**Overall Health:** GOOD (7/10) — código é mantível, mas há gaps que acumulam risco.

---

## 1. Database Debt (Phase 2 Analysis)

### 1.1 Missing Data Integrity Constraints (HIGH)

**Issue:** Enum-like columns sem CHECK constraints
- `campaigns.status` (7+ values, misto PT/EN)
- `campaign_contacts.status` (7 values)
- `contacts.status` (Opt-in/out)
- `flows.status`

**Risk:** Application-level validation falha → dados inválidos no DB

**Effort:** 1-2h (add CHECK constraints via migration)

**Priority:** HIGH

---

### 1.2 Bilingual Status Values (MEDIUM)

**Issue:** Database usa português (`'Rascunho'`) mas app usa English (`DRAFT`)
- `campaigns.status` default = `'Rascunho'`
- `campaign_stats_summary` view lida com ambos (`'enviando'`, `'sending'`, `'SENDING'`)
- Migração de linguagem foi incompleta

**Risk:** Inconsistência, bugs sutis em filtros/reports

**Effort:** 4-6h (rewrite defaults + migrate data + add CHECK)

**Priority:** MEDIUM

**Decision Needed:** Padronizar em English ou Portuguese?

---

### 1.3 Mixed ID Strategy (MEDIUM)

**Issue:** Três estratégias de ID simultâneas
1. Native UUID (`gen_random_uuid()`) — 13 tables
2. Prefixed text IDs (`'c_' || uuid`) — 13 tables
3. Client-generated text IDs — 5 tables

**Risk:** Casting implícito em joins, confusão em logs, queries menos otimizadas

**Effort:** HIGH (16+ tables × migration risk)

**Priority:** LOW (é legacy, funciona ok, migração de risco alto)

**Recommendation:** Padronizar novos tables em UUID nativo; não migrar existentes

---

### 1.4 Tags as JSONB Array (MEDIUM)

**Issue:** `contacts.tags` é array JSONB → já causou corrupção (nested arrays)
- Requer defensive unwrapping em todas as RPCs
- Não há type safety at DB level

**Risk:** Data corruption, defensive coding overhead

**Effort:** 6-8h (normalize para `contact_tags` join table)

**Priority:** MEDIUM (considerar para novos features)

**Recommendation:** Manter padrão atual para existing; usar join tables para novos

---

### 1.5 Orphaned Trigger Function (LOW)

**Issue:** `update_campaign_dispatch_metrics()` não é usado (foi substituído por RPC)

**Effort:** 15min (drop function em migration)

**Priority:** LOW

---

### 1.6 Missing Backup Strategy (HIGH)

**Issue:** Nenhuma estratégia de backup/recovery documentada
- Nenhum script de rollback para migrations
- Disaster recovery undefined

**Risk:** Data loss em caso de corruption/attack

**Effort:** 4-8h (setup + documentação)

**Priority:** HIGH

**Recommendation:**
- Daily automated backups (Supabase managed ou manual script)
- Test recovery procedure monthly
- Document RTO/RPO SLAs

---

### 1.7 Missing Indexes (HIGH)

**Issue:** `contacts(created_at DESC)` sem índice (usado em "Recent Contacts")

**Risk:** Full table scans em queries frequentes

**Effort:** 1h (add index via migration)

**Priority:** HIGH

---

### 1.8 Unused Foreign Keys (MEDIUM)

**Issue:** `campaign_batch_metrics` e `campaign_trace_events` faltam FKs
- Schema permite orphan records
- Data integrity risk

**Effort:** 2-3h (add FKs + cleanup orphans)

**Priority:** MEDIUM

---

## 2. Backend Debt (Architecture + Pattern Analysis)

### 2.1 No ESLint Configuration (HIGH)

**Issue:** TypeScript, Next.js, sem ESLint
- Nenhuma análise estática automática
- Inconsistência de código style
- Sem regras customizadas para projeto

**Risk:** Code quality issues acumulam, AI-driven features get inconsistent code

**Effort:** 4-6h (setup ESLint + Prettier + pre-commit hooks)

**Priority:** HIGH

**Recommendation:**
```bash
npm install -D eslint @typescript-eslint/{parser,eslint-plugin} prettier
```
Configure rules para:
- No `console.log` in production
- All API responses use ApiResponse wrapper
- DB queries use repository pattern
- Proper error handling

---

### 2.2 No Prettier Configuration (HIGH)

**Issue:** Sem formatter automático
- Variância de estilo entre devs/AI
- Sem consistency guarantees

**Effort:** 2-3h (setup + husky pre-commit)

**Priority:** HIGH

---

### 2.3 Rate Limiting Not Implemented (MEDIUM)

**Issue:** API routes (28+) sem rate limiting
- Internal webhooks (QStash) poderiam ser abusadas
- No DDoS protection

**Risk:** Resource exhaustion, abuse

**Effort:** 4-6h (add rate-limiting middleware usando Upstash Redis)

**Priority:** MEDIUM

---

### 2.4 Incomplete Input Validation (MEDIUM)

**Issue:** Nem todas as API routes usam Zod validation
- 50 routes analisadas; alguns tem gaps
- XSS/injection risks

**Risk:** Security vulnerabilities

**Effort:** 8-12h (audit + add validation systematically)

**Priority:** MEDIUM

---

### 2.5 Error Boundary Coverage (MEDIUM)

**Issue:** Erro handling incompleto em componentes React
- Algumas páginas faltam Error boundaries
- UI crashes em edge cases

**Risk:** Poor UX, unhandled promise rejections

**Effort:** 3-4h (add Error boundaries, improve error UI)

**Priority:** MEDIUM

---

### 2.6 E2E Tests Not in CI/CD (MEDIUM)

**Issue:** Playwright E2E tests rodam localmente apenas (`npm run test:e2e`)
- Nenhum E2E em GitHub Actions
- Regressões UI não detectadas no CI

**Risk:** Bugs não-detectados até production

**Effort:** 2-3h (add GitHub Actions job para E2E)

**Priority:** MEDIUM

---

### 2.7 No Type Strictness Enforcement (LOW)

**Issue:** `tsconfig.json` sem `strict: true`

**Effort:** 2-4h (enable + fix type errors)

**Priority:** LOW (refactoring effort, mas recomendado)

---

## 3. Frontend Debt

### 3.1 Accessibility Gaps (MEDIUM)

**Issue:** A11y não completo:
- Sem skip link ("Skip to main content")
- Alguns components faltam ARIA labels
- Notification count hardcoded (não dinâmico)

**Risk:** Users com disabilities terão dificuldade

**Effort:** 4-6h (systematic a11y audit + fixes)

**Priority:** MEDIUM

---

### 3.2 Form Validation UX (LOW)

**Issue:** Alguns forms mostram erro apenas ao submit (não em tempo real)

**Effort:** 2-3h (improve validation feedback)

**Priority:** LOW

---

## 4. DevOps/Release Debt

### 4.1 No CI/CD for Database Migrations (MEDIUM)

**Issue:** Migrations rodam offline (`supabase db push`), não em CI

**Risk:** Deployment risk, inconsistent environments

**Effort:** 3-4h (integrate migrations com GitHub Actions)

**Priority:** MEDIUM

---

### 4.2 No Release Management (MEDIUM)

**Issue:** Sem semantic versioning, release notes, ou deployment strategy

**Risk:** Unclear deployment history, rollback complexity

**Effort:** 4-6h (setup semantic-release + changelog)

**Priority:** MEDIUM

---

## 5. Documentation Debt

### 5.1 No API Documentation (MEDIUM)

**Issue:** 28+ API routes sem OpenAPI spec
- `CLAUDE.md` tem patterns, mas sem comprehensive API docs

**Risk:** Onboarding difficulty, integration errors

**Effort:** 6-10h (generate OpenAPI from routes)

**Priority:** MEDIUM

---

### 5.2 Incomplete Architecture Docs (MEDIUM)

**Issue:** Padrões estão em CLAUDE.md mas sem formal architecture docs

**Risk:** Knowledge transfer risk, onboarding slow

**Effort:** 4-6h (consolidate into formal docs)

**Priority:** MEDIUM

---

## 6. Security Debt

### 6.1 No SAST (Static Analysis Security Testing) (MEDIUM)

**Issue:** Sem automated security scanning
- No OWASP checking
- No dependency vulnerability scanning in CI

**Risk:** Security issues não-detectadas

**Effort:** 2-3h (setup Snyk + GitHub Advanced Security)

**Priority:** MEDIUM

---

### 6.2 Secrets Management Not Documented (LOW)

**Issue:** `.env.local` handling documented mas não enforced (no `.env` check-in protection)

**Effort:** 1h (add pre-commit hook)

**Priority:** LOW

---

## 7. Code Quality Debt

### 7.1 SELECT * in Database Queries (HIGH)

**Issue:** 22+ locations usam `SELECT *` em Supabase queries
- Transfers unnecessary data (network overhead)
- Makes schema changes risky
- Breaks if columns are added/removed

**Effort:** 4-6h (audit + rewrite with explicit columns)

**Priority:** HIGH

---

### 7.2 Incomplete Error Logging (MEDIUM)

**Issue:** Algumas API routes não loggam errors adequadamente
- Debugging em production é difícil

**Effort:** 3-4h (systematic logging audit)

**Priority:** MEDIUM

---

## 8. Prioritization Matrix

| Debt Item | Severity | Effort | Impact | Quick Win? |
|-----------|----------|--------|--------|-----------|
| **Add ESLint + Prettier** | HIGH | 4-6h | Code consistency, AI quality | ✓ |
| **Missing CHECK constraints** | HIGH | 1-2h | Data integrity | ✓ |
| **Backup Strategy** | HIGH | 4-8h | Disaster recovery | ✓ |
| **Rate Limiting** | MEDIUM | 4-6h | Security | — |
| **Input Validation Audit** | MEDIUM | 8-12h | Security | — |
| **E2E in CI/CD** | MEDIUM | 2-3h | Quality gates | ✓ |
| **A11y Fixes** | MEDIUM | 4-6h | Compliance | — |
| **Bilingual Status** | MEDIUM | 4-6h | Data consistency | — |
| **Tags Normalization** | MEDIUM | 6-8h | Future scalability | — |
| **SELECT * Cleanup** | HIGH | 4-6h | Performance | — |
| **API Documentation** | MEDIUM | 6-10h | Onboarding | — |

---

## 9. Immediate Action Items (Next Sprint)

**Quick Wins (do first):**
1. ✅ Add ESLint + Prettier (4-6h)
2. ✅ Add CHECK constraints (1-2h)
3. ✅ Add missing index on contacts(created_at) (1h)
4. ✅ Add E2E to CI/CD (2-3h)

**Total: ~10-12h = 1-2 days**

---

## 10. Medium-term Roadmap (1-3 months)

- Database: Backup strategy, foreign keys, bilingual migration
- Backend: Rate limiting, comprehensive validation, error logging
- Frontend: A11y audit, form UX
- DevOps: CI/CD migrations, release management
- Docs: API spec, architecture formalization

---

## 11. Next Steps

**Phase 5-7:** Specialist reviews (Data Engineer, UX, QA) validate findings
**Phase 8:** Consolidate into final assessment
**Phase 9:** Executive summary (@analyst)
**Phase 10:** Create epic + stories (@pm) para resolver debt

---

## Change Log

| Date | Version | Notes |
|------|---------|-------|
| 2026-03-28 | DRAFT | Phase 4 initial assessment |

---

**Status:** ⏳ Awaiting Phase 5-7 reviews (Dara, Uma, Quinn)
