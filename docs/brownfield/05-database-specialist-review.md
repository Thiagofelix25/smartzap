# SmartZap -- Database Specialist Review

**Brownfield Discovery -- Phase 5**
**Data:** 2026-03-28
**Autor:** Dara (Data Engineer Agent)
**Status:** Completo
**Reviewed Document:** `04-technical-debt-DRAFT.md` (Section 1: Database Debt)

---

## 1. Validation of Phase 4 Findings (Items 1.1--1.8)

### 1.1 Missing Data Integrity Constraints -- VALIDATED

**Verdict:** CONCORDO, com ajustes de prioridade e escopo.

**Evidence from Phase 2 (Section 2.3):** Confirmed. The init.sql shows CHECK constraints exist on `inbox_conversations` (mode, priority, status), `inbox_messages` (delivery_status, direction, sentiment, type), and `ai_knowledge_files` (indexing_status) -- but NOT on `campaigns.status`, `campaign_contacts.status`, `contacts.status`, or `flows.status`.

**Adjustment to Phase 4:**
- Phase 4 says "1-2h effort". This is accurate for adding constraints only. However, the bilingual issue (1.2) must be resolved BEFORE adding a CHECK on `campaigns.status`, otherwise the constraint must include both language sets, which is technical debt on top of debt.
- Missing from Phase 4: `templates.status` also lacks CHECK constraint (found in Phase 2 Section 6.3).
- Missing from Phase 4: Counter columns (`sent`, `delivered`, `read`, `failed`, `skipped`) lack `CHECK >= 0` constraints. Negative counters would indicate a bug in increment logic.

**Revised Priority:** HIGH (unchanged)
**Revised Effort:** 1-2h (for non-campaigns tables) + depends on 1.2 resolution for `campaigns.status`

**Remediation Steps:**
```sql
-- Step 1: Add constraints for tables without bilingual issue
ALTER TABLE campaign_contacts ADD CONSTRAINT chk_campaign_contacts_status
  CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped'));

ALTER TABLE contacts ADD CONSTRAINT chk_contacts_status
  CHECK (status IN ('Opt-in', 'Opt-out', 'Unknown'));

ALTER TABLE flows ADD CONSTRAINT chk_flows_status
  CHECK (status IN ('draft', 'active', 'inactive', 'archived'));

ALTER TABLE templates ADD CONSTRAINT chk_templates_status
  CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'DELETED', 'PAUSED'));

-- Step 2: Add non-negative checks on counter columns
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_sent_gte0 CHECK (sent >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_delivered_gte0 CHECK (delivered >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_read_gte0 CHECK (read >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_failed_gte0 CHECK (failed >= 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_skipped_gte0 CHECK (skipped >= 0);

-- Step 3: campaigns.status constraint (after bilingual resolution)
-- Depends on item 1.2 decision
```

**Risk Mitigation:** Run `SELECT DISTINCT status FROM {table}` before adding constraints to verify no existing data violates them.

---

### 1.2 Bilingual Status Values -- VALIDATED

**Verdict:** CONCORDO, com elevacao de prioridade.

**Evidence:** Confirmed directly in init.sql:
- Line 442: `status text DEFAULT 'Rascunho'::text NOT NULL`
- Line 489: View handles `'rascunho'`, `'draft'`, `'DRAFT'` simultaneously
- The `campaign_stats_summary` view uses `ARRAY['enviando', 'sending', 'SENDING']`

This is not just inconsistency -- it is a correctness risk. Any new code that checks `status = 'DRAFT'` will miss records with `status = 'Rascunho'`.

**Revised Priority:** HIGH (upgraded from MEDIUM)

**Rationale for upgrade:** This blocks item 1.1 (CHECK constraints on campaigns.status). Until standardized, we cannot add a clean CHECK constraint. The coupling between these two items makes bilingual resolution a prerequisite, not a standalone MEDIUM item.

[AUTO-DECISION] "Padronizar em English ou Portuguese?" --> English. Reason: `types.ts` already defines `CampaignStatus` as English enums (`DRAFT | SCHEDULED | SENDING | COMPLETED | PAUSED | FAILED`). The application layer is authoritative. The database should align with the application, not the other way around.

**Revised Effort:** 4-6h (unchanged, accurate)

**Remediation Steps:**
```sql
-- Migration: Standardize to English
BEGIN;

-- 1. Update existing Portuguese values
UPDATE campaigns SET status = 'DRAFT' WHERE status IN ('Rascunho', 'rascunho');
UPDATE campaigns SET status = 'SCHEDULED' WHERE status IN ('Agendado', 'agendado');
UPDATE campaigns SET status = 'SENDING' WHERE status IN ('Enviando', 'enviando', 'sending');
UPDATE campaigns SET status = 'COMPLETED' WHERE status IN ('Concluida', 'concluida', 'completed');
UPDATE campaigns SET status = 'PAUSED' WHERE status IN ('Pausado', 'pausado');
UPDATE campaigns SET status = 'FAILED' WHERE status IN ('Falhou', 'falhou');

-- 2. Change default
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'DRAFT';

-- 3. Add CHECK constraint
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_status
  CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'FAILED'));

-- 4. Update the campaign_stats_summary view to remove bilingual handling
-- (recreate view with English-only values)

COMMIT;
```

**Rollback:**
```sql
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_campaigns_status;
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Rascunho';
-- Note: Data values cannot be easily reverted; keep backup
```

**Risk Mitigation:** Coordinate with application deployment. The app layer already uses English values, so this migration aligns DB with app. Run during low-traffic window.

---

### 1.3 Mixed ID Strategy -- VALIDATED

**Verdict:** CONCORDO completamente.

**Evidence:** Confirmed three strategies in init.sql:
1. Native UUID with `gen_random_uuid()` -- newer tables
2. Prefixed text IDs (`'c_' || replace(uuid_generate_v4()::text, '-', '')`) -- older tables
3. Client-generated text IDs -- workflow domain

Phase 4 correctly assesses this as LOW priority. For a single-tenant app, the mixed IDs work and migration risk far outweighs benefit.

**Revised Priority:** LOW (unchanged)
**Revised Effort:** HIGH (unchanged -- confirmed 16+ tables)
**Recommendation:** Phase 4's recommendation is sound: standardize new tables on native UUID, do not migrate existing. No action needed.

---

### 1.4 Tags as JSONB Array -- VALIDATED

**Verdict:** CONCORDO, com contexto adicional.

**Evidence from Phase 2 (Section 2.6):** The corruption issue is real and documented -- migration `20260225000001_fix_nested_tags_and_stats.sql` exists specifically to fix nested arrays. The defensive `flattenTags` code in `supabase-db.ts` and SQL RPCs confirms ongoing maintenance burden.

**Additional context not in Phase 4:**
- The existing `campaign_tags` + `campaign_tag_assignments` tables already implement the join-table pattern for campaign tags, proving the pattern works in this codebase
- Migration to a `contact_tags` join table would mirror an existing pattern, reducing implementation risk

**Revised Priority:** MEDIUM (unchanged)
**Revised Effort:** 6-8h (unchanged, accurate)
**Recommendation:** Phase 4's approach is correct. Keep current for existing code; use join tables for new features. If a major contacts refactor is planned, include tag normalization.

---

### 1.5 Orphaned Trigger Function -- VALIDATED

**Verdict:** CONCORDO.

**Evidence:** `update_campaign_dispatch_metrics()` is defined at line 179 of init.sql. No `CREATE TRIGGER` references this function anywhere in the init.sql. It was replaced by the `increment_campaign_stat` RPC pattern (line 100).

**Revised Priority:** LOW (unchanged)
**Revised Effort:** 15min (unchanged)

**Remediation:**
```sql
DROP FUNCTION IF EXISTS public.update_campaign_dispatch_metrics();
```

---

### 1.6 Missing Backup Strategy -- VALIDATED

**Verdict:** CONCORDO.

**Evidence:** Confirmed: no backup scripts, no `pg_dump` automation, no documented RTO/RPO. The `supabase/rollbacks/` directory exists but contains only one file (`20260122100000_remove_telegram_schema.sql`), confirming rollback infrastructure is minimal.

**Revised Priority:** HIGH (unchanged)
**Revised Effort:** 4-8h (unchanged)
**Recommendation:** Phase 4 recommendations are sound. Add:
- Pre-migration `pg_dump` script (automated)
- Verify Supabase plan tier for PITR availability
- Document recovery runbook

---

### 1.7 Missing Indexes -- VALIDATED, with scope expansion

**Verdict:** INCOMPLETO -- Phase 4 lists only one missing index, but Phase 2 identified four.

**Phase 4 lists:** `contacts(created_at DESC)` only.

**Phase 2 (Section 3.3) identified:**
1. `contacts(created_at DESC)` -- confirmed needed; `supabase-db.ts` has `.order('created_at', { ascending: false })` on contacts queries (lines 687, 1490, etc.)
2. `campaign_batch_metrics(campaign_id)` -- FK index, needs addition with FK
3. `workflow_runs(workflow_id, status)` -- composite for workflow queries
4. `lead_forms(slug) WHERE is_active = true` -- partial index for public form lookup

**Revised Priority:** HIGH (unchanged for contacts index; MEDIUM for others)
**Revised Effort:** 2h total (expanded from 1h to cover all four indexes)

**Remediation:**
```sql
-- High priority
CREATE INDEX CONCURRENTLY idx_contacts_created_at_desc
  ON contacts (created_at DESC);

-- Medium priority (add with FK in item 1.8)
CREATE INDEX CONCURRENTLY idx_campaign_batch_metrics_campaign_id
  ON campaign_batch_metrics (campaign_id, created_at DESC);

-- Medium priority
CREATE INDEX CONCURRENTLY idx_workflow_runs_workflow_status
  ON workflow_runs (workflow_id, status);

-- Low priority
CREATE INDEX CONCURRENTLY idx_lead_forms_active_slug
  ON lead_forms (slug) WHERE is_active = true;
```

Note: Use `CONCURRENTLY` to avoid table locks on production.

---

### 1.8 Unused Foreign Keys -- VALIDATED

**Verdict:** CONCORDO.

**Evidence:** Confirmed in init.sql -- `campaign_batch_metrics` and `campaign_trace_events` have `campaign_id` columns with indexes but NO foreign key constraints to `campaigns`. All other campaign-related tables (`campaign_contacts`, `campaign_tag_assignments`, `whatsapp_status_events`, `flow_submissions`) correctly have FK references to `campaigns(id)`.

**Revised Priority:** MEDIUM (unchanged)
**Revised Effort:** 2-3h (unchanged, includes orphan cleanup)

**Remediation:**
```sql
BEGIN;

-- Clean orphaned records first
DELETE FROM campaign_batch_metrics
  WHERE campaign_id NOT IN (SELECT id FROM campaigns);
DELETE FROM campaign_trace_events
  WHERE campaign_id NOT IN (SELECT id FROM campaigns);

-- Add FKs
ALTER TABLE campaign_batch_metrics
  ADD CONSTRAINT fk_campaign_batch_metrics_campaign
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE campaign_trace_events
  ADD CONSTRAINT fk_campaign_trace_events_campaign
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

COMMIT;
```

**Risk Mitigation:** Run the `DELETE` count as a `SELECT COUNT(*)` first to verify impact before executing.

---

## 2. Additional Findings Not in Phase 4

### 2.1 Dynamic SQL Without Column Whitelist in UUID Overload (MEDIUM)

**Source:** Phase 2 Section 4.4

Phase 4 did not include this finding. The `increment_campaign_stat(uuid, text, integer)` overload uses `EXECUTE format('%I')` with no validation on `p_stat`. The text overload (line 100-115) uses explicit `IF field = 'sent' THEN` branching, which is safe. But the UUID overload (line 117-127) accepts any column name.

**Impact:** While access is restricted to `service_role`, a bug in application code could pass an arbitrary column name (e.g., `'name'`, `'status'`) and corrupt data.

**Priority:** MEDIUM
**Effort:** 15min

**Remediation:**
```sql
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
  p_campaign_id uuid, p_stat text, p_value integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $_$
BEGIN
  IF p_stat NOT IN ('sent', 'delivered', 'read', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'Invalid stat column: %', p_stat;
  END IF;
  EXECUTE format(
    'UPDATE public.campaigns SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_stat, p_stat
  ) USING p_value, p_campaign_id;
END;
$_$;
```

---

### 2.2 Duplicate Updated-At Trigger Functions (LOW)

**Source:** Phase 2 Section 2.5

Phase 4 did not include this finding. Three functions do identical work (`NEW.updated_at = NOW(); RETURN NEW;`):
- `update_updated_at_column()` -- used by 7 triggers
- `update_attendant_tokens_updated_at()` -- used by 1 trigger
- `update_campaign_folders_updated_at()` -- used by 1 trigger

**Priority:** LOW
**Effort:** 30min (consolidate triggers to use single function)

---

### 2.3 NOT NULL Missing on Defaulted Columns (MEDIUM)

**Source:** Phase 2 Section 6.4

Phase 4 did not include this finding. Several columns have defaults via triggers or DDL but allow NULL:
- `campaign_contacts.status` -- defaults to `'pending'` but nullable
- `contacts.status` -- defaults to `'Opt-in'` but nullable
- `contacts.updated_at` -- populated by trigger but nullable
- `campaigns.updated_at` -- populated by trigger but nullable

**Priority:** MEDIUM
**Effort:** 1-2h (add NOT NULL after verifying no existing NULLs)

---

### 2.4 No Data Retention Policies (MEDIUM)

**Source:** Phase 2 Section 7.4

Phase 4 did not include this in the database debt section (it appears tangentially in the medium-term roadmap but without analysis). High-growth tables have no archival or retention strategy:

| Table | Growth Pattern | Risk |
|-------|---------------|------|
| `whatsapp_status_events` | 3-5x per message | Very High volume |
| `campaign_trace_events` | Multiple per campaign run | High volume |
| `ai_agent_logs` | Per inference | Medium volume |
| `inbox_messages` | Linear per conversation | Unbounded |

**Priority:** MEDIUM (escalates to HIGH as data volume grows)
**Effort:** 4-6h (design policy + implement archival automation)

---

### 2.5 Anon SELECT on PII Tables (MEDIUM)

**Source:** Phase 2 Section 5.2

Phase 4 did not include this finding. Seven tables have `SELECT TO anon USING (true)` policies, including `contacts` and `inbox_messages` which contain PII (phone numbers, message content). While acceptable for single-tenant, this is a security consideration that should be documented.

**Priority:** MEDIUM (LOW for current single-tenant; would be CRITICAL if multi-tenant)
**Effort:** 1h (document decision + add comment in migration)

---

### 2.6 SELECT * Usage is 28 Occurrences, Not 22 (HIGH)

**Source:** Code verification

Phase 4 (Section 7.1) and Phase 2 (Section 4.1) both reference 22 locations. Current grep shows **28 total occurrences** across 3 files (`supabase-db.ts`: 22, `inbox-db.ts`: 5, `supabase.ts`: 1). The scope is larger than documented.

**Revised Count:** 28 occurrences across 3 files
**Revised Effort:** 6-8h (expanded from 4-6h)

---

## 3. Revised Prioritization Matrix

| # | Item | Phase 4 Priority | Revised Priority | Effort | Quick Win? | Dependency |
|---|------|-----------------|-----------------|--------|-----------|------------|
| 1.2 | Bilingual Status Values | MEDIUM | **HIGH** | 4-6h | No | Blocks 1.1 for campaigns |
| 1.1 | Missing CHECK Constraints | HIGH | HIGH | 1-2h | Yes (non-campaigns) | 1.2 for campaigns.status |
| 1.7 | Missing Indexes (4 total) | HIGH | HIGH | 2h | Yes | None |
| 1.6 | Missing Backup Strategy | HIGH | HIGH | 4-8h | Yes | None |
| 7.1* | SELECT * Cleanup (28 locs) | HIGH | HIGH | 6-8h | No | None |
| 1.8 | Missing Foreign Keys | MEDIUM | MEDIUM | 2-3h | Yes | None |
| 2.1+ | Dynamic SQL Whitelist | -- | MEDIUM | 15min | Yes | None |
| 2.3+ | NOT NULL on Defaulted Cols | -- | MEDIUM | 1-2h | Yes | None |
| 2.4+ | Data Retention Policies | -- | MEDIUM | 4-6h | No | None |
| 2.5+ | Anon SELECT on PII Tables | -- | MEDIUM | 1h | No | None |
| 1.4 | Tags as JSONB Array | MEDIUM | MEDIUM | 6-8h | No | None |
| 1.3 | Mixed ID Strategy | LOW | LOW | HIGH | No | None |
| 1.5 | Orphaned Trigger Function | LOW | LOW | 15min | Yes | None |
| 2.2+ | Duplicate Updated-At Funcs | -- | LOW | 30min | Yes | None |

*Items marked with `+` are additional findings not in Phase 4.*
*Item 7.1 is from Phase 4 Section 7 (Code Quality) but is database-relevant.*

---

## 4. Recommended Execution Order

### Sprint 1: Quick Wins (3-4h)

1. Add `contacts(created_at DESC)` index (15min)
2. Add whitelist check to `increment_campaign_stat` UUID overload (15min)
3. Add CHECK constraints on non-campaigns tables (`campaign_contacts`, `contacts`, `flows`, `templates`) (1h)
4. Add FKs on `campaign_batch_metrics` and `campaign_trace_events` (1h, after orphan count check)
5. Drop orphaned `update_campaign_dispatch_metrics()` function (5min)
6. Add non-negative CHECK on campaign counter columns (15min)

### Sprint 2: Bilingual Resolution + Constraints (4-6h)

1. Migrate `campaigns.status` to English values
2. Update `campaign_stats_summary` view
3. Add CHECK constraint on `campaigns.status`
4. Add NOT NULL on defaulted columns
5. Add remaining indexes (workflow_runs, lead_forms)

### Sprint 3: Query Optimization + Operations (8-10h)

1. Replace `SELECT *` with explicit columns (28 locations, 3 files)
2. Document backup/restore procedure
3. Design data retention policies for high-growth tables

---

## 5. Verdict

**APPROVED**

Phase 4's database debt analysis is accurate and well-grounded in the Phase 2 audit findings. The corrections and additions documented above are:

- **1 priority upgrade:** Item 1.2 (Bilingual Status) upgraded from MEDIUM to HIGH because it blocks clean CHECK constraint on `campaigns.status`
- **1 scope correction:** Missing indexes -- Phase 4 listed 1, Phase 2 identified 4
- **1 count correction:** SELECT * occurrences are 28 (not 22)
- **5 additional findings** from Phase 2 that were not carried into Phase 4 (dynamic SQL whitelist, duplicate trigger functions, NOT NULL gaps, data retention, anon SELECT on PII)
- **0 disagreements** -- all Phase 4 findings are technically accurate

The database is in GOOD health for a single-tenant application. The debt items are manageable and none are blocking current operations. The recommended execution order above ensures dependencies are respected (bilingual resolution before campaigns CHECK constraint).

---

## Change Log

| Date | Version | Notes |
|------|---------|-------|
| 2026-03-28 | 1.0 | Phase 5 specialist review complete |

---

*-- Dara, arquitetando dados*
