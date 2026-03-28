# Brownfield Discovery → Dev Handoff

**Para:** @dev (Dex)
**De:** @architect (Aria) + 6 especialistas
**Data:** 2026-03-28
**Status:** ✅ READY FOR IMPLEMENTATION

---

## 🎯 TL;DR — Comece Aqui

SmartZap tem **36 technical debt items** em uma base de código bem-estruturada (health 7.5/10).

**Seu trabalho:** Implementar 8 feature stories em 3-4 semanas (100-120 horas total).

**Week 1 Quick Wins:** 8-10 horas (baixo risco, ganhos imediatos)

**Onde começar:**
1. Leia: `docs/brownfield/README.md` (5 min)
2. Leia: `docs/stories/EPIC-TECHNICAL-DEBT-SMARTZAP.md` (10 min)
3. Comece: `docs/stories/TD-1-accessibility-quick-wins.md` (Week 1)

---

## 📚 Documentação Disponível

### **Entenda o Projeto (30 min)**
```
docs/brownfield/
├── 01-system-architecture.md       ← Tech stack, padrões, DB clients
├── 02-database-schema.md           ← 38 tabelas, 102+ índices
├── 03-frontend-specification.md    ← 62 UI components, React Query
└── README.md                        ← Navigation guide
```

### **Entenda o Debt Técnico (20 min)**
```
docs/brownfield/
├── 08-technical-debt-assessment-FINAL.md ⭐ ← LEIA ISSO (core reference)
└── QUICK-WINS-SUMMARY.md                 ← Quick reference implementation
```

### **Specialist Reviews — Detalhes Técnicos (15 min cada)**
```
docs/brownfield/
├── 05-database-specialist-review.md  ← Database deep-dive
├── 06-ux-specialist-review.md        ← Frontend deep-dive
└── 07-qa-specialist-review.md        ← Testing/security deep-dive
```

### **Seu Roadmap (30 min)**
```
docs/stories/
├── EPIC-TECHNICAL-DEBT-SMARTZAP.md   ← Epic principal + roadmap
├── TD-1-accessibility-quick-wins.md  ← Week 1 (2-3h)
├── TD-2-database-integrity-foundation.md ← Week 1-2 (8-12h)
├── TD-3-auth-enforcement-security.md ← Week 3 (8-12h)
├── TD-4-input-validation-coverage.md ← Week 3-4 (8-12h)
├── TD-5-code-quality-tooling.md      ← Week 4 (6-9h)
├── TD-6-select-star-refactor.md      ← Month 2 (8-12h)
├── TD-7-e2e-test-suite.md            ← Month 2 (14-19h)
└── TD-8-infrastructure-docs-polish.md ← Month 2-3 (20-30h)
```

---

## 🗺️ Quick Navigation

**Quer saber por onde começar?**
→ `docs/stories/TD-1-accessibility-quick-wins.md`

**Quer entender a arquitetura?**
→ `docs/brownfield/01-system-architecture.md`

**Quer detalhes de uma story?**
→ `docs/stories/TD-{N}-*.md`

**Quer detalhes técnicos de database?**
→ `docs/brownfield/05-database-specialist-review.md`

**Quer detalhes técnicos de frontend?**
→ `docs/brownfield/06-ux-specialist-review.md`

**Quer detalhes técnicos de testing/security?**
→ `docs/brownfield/07-qa-specialist-review.md`

---

## 📊 O Que Você Vai Fazer

### **Week 1: Quick Wins** (8-10h, baixo risco)

**Story TD-1: Accessibility Quick Wins** (2-3h)
- [ ] Fix viewport scaling (15 min)
- [ ] Add skip link (30 min)
- [ ] Remove notification bell (15 min)
- [ ] Add `<main>` to layouts (1h)
- [ ] Review color contrast (30 min)

**Story TD-2 (Part 1): Database Foundation** (3-5h)
- [ ] Add missing indexes (1h)
- [ ] Add CHECK constraints (1-2h)
- [ ] Setup backup strategy (2-3h)

**Benefit:** WCAG AA compliance + performance + data integrity

### **Week 2-3: High-Priority** (25-35h)

**Story TD-2 (Part 2): Database Integrity** (4-7h remaining)
- Bilingual status standardization
- Foreign key fixes
- Data retention policies

**Story TD-3: Auth Enforcement** (8-12h)
- Centralized auth middleware
- Audit all 209 routes
- Enforce auth on endpoints

**Story TD-4: Input Validation** (8-12h)
- Zod schema audit
- Add validation to 165 routes (missing)
- E2E validation testing

**Story TD-5: Code Quality** (6-9h)
- ESLint + Prettier setup
- Pre-commit hooks
- Coverage thresholds

**Benefit:** Security hardening + code quality

### **Month 2+: Medium-Priority** (30-40h)

**Story TD-6: SELECT * Refactor** (8-12h)
- 108 queries → explicit columns
- Performance improvement (15-20% latency)

**Story TD-7: E2E Test Suite** (14-19h)
- Zero tests → critical path coverage
- CI/CD integration

**Story TD-8: Polish & Docs** (20-30h)
- DashboardShell refactoring
- API documentation
- Architecture docs

---

## 🔗 Dependencies & Order

**MUST DO IN ORDER:**

1. **TD-2 Bilingual fix** → Must complete BEFORE CHECK constraints
2. **TD-3 Auth audit** → Informs TD-4 validation priorities
3. **TD-5 ESLint** → Guards TD-6 refactor quality

**CAN RUN IN PARALLEL:**
- TD-1 (A11y) + TD-2 (Database) — separate domains
- TD-3 + TD-4 → but TD-3 findings inform TD-4 scope
- TD-6 + TD-7 + TD-8 → independent after Week 1-4

---

## 📋 Cada Story Tem

✅ **Title & Description** — O quê e por quê
✅ **Acceptance Criteria** — Checklist de conclusão
✅ **Effort Estimate** — Horas (realistic)
✅ **Sprint Assignment** — Semana ou mês
✅ **Dependencies** — O que vem antes/depois
✅ **Implementation Notes** — Detalhes técnicos
✅ **Testing Strategy** — Como validar

**Formato:** Markdown checklist (fácil de rastrear progresso)

---

## 🛠️ Tecnologias & Padrões

**SmartZap Stack:**
- Frontend: Next.js 16, React 19, Tailwind v4, shadcn/ui
- Backend: Next.js API Routes (serverless)
- Database: Supabase PostgreSQL (38 tables, RLS ativo)
- State: React Query (staleTime 30s)
- Testing: Vitest (unit), Playwright (E2E)
- Forms: react-hook-form + Zod

**Padrões Principais:**
- Page → Hook → Service → API (thin pages, controller hooks)
- All API validation with Zod
- React Query for server state
- RLS policies for multi-tenant safety (single-tenant, but implemented)

**Database:**
- 38 tables, 102+ indexes
- Supabase admin client (API routes bypass RLS)
- `lib/supabase-db.ts` has abstracted CRUD layer
- Migrations in `supabase/migrations/`

---

## 🚀 How to Start

### **Step 1: Understand Context** (30 min)
```bash
# Read these files in order:
1. docs/brownfield/README.md                    (5 min)
2. docs/brownfield/01-system-architecture.md   (15 min)
3. docs/stories/EPIC-TECHNICAL-DEBT-SMARTZAP.md (10 min)
```

### **Step 2: Pick First Task** (2 min)
```
Open: docs/stories/TD-1-accessibility-quick-wins.md
Start with: Fix viewport scaling (15 min)
```

### **Step 3: Execute** (8-10h Week 1)
```bash
npm run dev              # Start dev server
# Make changes to:
# - next.config.ts (viewport scaling)
# - app/layout.tsx (skip link)
# - components/layout/DashboardShell.tsx (main element)
# etc.

npm run test            # Run unit tests
npm run lint            # Check code quality
npm run typecheck       # TypeScript check

# When ready:
git add .
git commit -m "feat: implement accessibility quick wins [EPIC-TECH-DEBT]"
git push
```

### **Step 4: Track Progress**
- Mark checkboxes in each story file ✅
- Update story file with notes
- Link commits to story acceptance criteria

---

## 📞 Getting Help

### **Questions About Debt Items?**
→ Read specialist reviews in `docs/brownfield/05-07-*.md`

### **Questions About Architecture?**
→ Read `docs/brownfield/01-system-architecture.md`

### **Questions About Patterns?**
→ Read `CLAUDE.md` (project documentation)

### **Questions About Specific Route/Component?**
→ Use your IDE to grep the codebase
→ All files follow clear naming conventions

### **Need to Escalate?**
→ Mention the story number (TD-1, TD-2, etc.)
→ Reference specialist review if technical question

---

## ✅ Definition of Done (per story)

- [ ] All acceptance criteria completed
- [ ] Code passes `npm run lint`
- [ ] Code passes `npm run typecheck`
- [ ] Unit tests added for new logic
- [ ] E2E tests added (if applicable)
- [ ] Git commit with story reference
- [ ] Story file updated with completion notes
- [ ] Checklist marked complete in story file

---

## 📊 Effort Breakdown

```
Week 1 Quick Wins:           8-10h   (TD-1 + TD-2 part 1)
Week 2-3 High-Priority:      25-35h  (TD-2 part 2 + TD-3 + TD-4 + TD-5)
Month 2-3 Medium-Priority:   30-40h  (TD-6 + TD-7 + TD-8)
─────────────────────────────────────
TOTAL:                       ~100-120h = 2.5-3 weeks full-time
```

**Recommended Pace:**
- Week 1: 8-10h (full focus)
- Week 2-4: 25-35h (50% dev time, 50% features)
- Month 2-3: 30-40h (25% dev time, 75% features)

---

## 🎯 Success Criteria (Team Level)

By end of Week 1:
- ✅ WCAG AA compliance (viewport + skip link)
- ✅ Database indexes in place
- ✅ CHECK constraints on enums

By end of Week 4:
- ✅ All API routes have auth verification
- ✅ All API routes have input validation
- ✅ ESLint + Prettier configured
- ✅ Pre-commit hooks active

By end of Month 2:
- ✅ All SELECT * queries refactored
- ✅ E2E test suite for critical paths
- ✅ Backup strategy implemented

---

## 📝 Notes for You

1. **Stories are grouped, not individual** — Each "story" covers 1-12 debt items to reduce management overhead

2. **Dependencies are explicit** — Read dependency section in each story before starting

3. **Effort estimates are realistic** — Based on code review, not guesses. They include testing + review

4. **Tests are mandatory** — Each story includes testing strategy. No story is "done" without tests.

5. **Your work is tracked** — Update story files as you go. They're living documents.

6. **Code quality is enforced** — ESLint (TD-5) will run pre-commit. Plan for that.

7. **You're not alone** — Specialist reviews available for deep-dives. Ask @architect, @data-engineer, @qa for context.

---

## 🚀 You're Ready!

All documentation is in `docs/brownfield/` and `docs/stories/`.

**Start with:** `docs/stories/TD-1-accessibility-quick-wins.md`

**Track your work in:** Story files (markdown checklists)

**Reference architecture:** `docs/brownfield/01-system-architecture.md`

**Questions?** → Check specialist reviews or ask @architect

---

**Handoff Complete. Good luck! 🎯**

Generated by: @architect (Aria) + 6 specialists
Date: 2026-03-28
Status: ✅ READY FOR EXECUTION
