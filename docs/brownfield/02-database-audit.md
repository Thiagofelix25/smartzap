# SmartZap -- Database Audit Report

**Brownfield Discovery -- Phase 2 (Audit)**
**Data:** 2026-03-28
**Autor:** Dara (Data Engineer Agent)
**Status:** Completo

---

## 1. Executive Summary

SmartZap has a well-structured PostgreSQL schema with 38 tables, comprehensive indexing (102+), RLS on all tables, and thoughtful use of RPC functions for atomic operations. The schema shows evidence of deliberate optimization (autovacuum tuning, covering indexes, partial indexes) and good security practices (SECURITY DEFINER functions locked to service_role only).

**Overall health:** GOOD with targeted improvements needed.

**Critical findings:** 0
**High findings:** 6
**Medium findings:** 11
**Low findings:** 8

---

## 2. Schema Anomalies

### 2.1 Mixed ID Strategy (MEDIUM)

**Finding:** The schema uses three different ID strategies simultaneously:
1. Native UUID (`gen_random_uuid()`) -- 13 tables
2. Prefixed text IDs (`'c_' || replace(uuid, '-', '')`) -- 13 tables
3. Client-generated text IDs -- 5 tables (workflow domain)

**Impact:** Cross-table joins between UUID and text-based IDs require implicit casting. The prefixed text IDs use `uuid_generate_v4()` from extensions, while native UUID tables use `gen_random_uuid()` -- two different UUID generation functions.

**Recommendation:** This is a legacy pattern. Standardization is desirable for new tables but migration of existing IDs is high-risk and low-value for a single-tenant app.

### 2.2 Bilingual Status Values (MEDIUM)

**Finding:** The `campaigns.status` column defaults to `'Rascunho'` (Portuguese) but the `campaign_stats_summary` view handles both Portuguese and English values:
```sql
status = ANY (ARRAY['enviando', 'sending', 'SENDING'])
status = ANY (ARRAY['concluida', 'completed', 'COMPLETED'])
```

**Impact:** The application layer in `types.ts` defines `CampaignStatus` as English enums (`DRAFT | SCHEDULED | SENDING | COMPLETED | PAUSED | FAILED`), but the database default is `'Rascunho'`. This indicates a language migration was incomplete.

**Recommendation:** Standardize to English values in database. Add CHECK constraint once migration is complete.

### 2.3 Missing CHECK Constraints (MEDIUM)

**Finding:** Several columns that act as enums lack CHECK constraints:
- `campaigns.status` -- no CHECK (7+ possible values)
- `campaign_contacts.status` -- no CHECK (7 values: pending/sending/sent/delivered/read/failed/skipped)
- `whatsapp_status_events.status` -- no CHECK
- `contacts.status` -- no CHECK (Opt-in/Opt-out)
- `flows.status` -- no CHECK

**Impact:** Data integrity relies entirely on application-level validation. A bug or direct DB access could insert invalid status values.

**Recommendation:** Add CHECK constraints for all enum-like text columns. Example:
```sql
ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_status
CHECK (status IN ('Rascunho', 'Agendado', 'Enviando', 'Concluida', 'Pausado', 'Falhou',
                  'DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'FAILED'));
```

### 2.4 Orphaned Trigger Function (LOW)

**Finding:** `update_campaign_dispatch_metrics()` is defined but no trigger is attached to it. The function does a correlated subquery updating campaigns from campaign_contacts.

**Impact:** Dead code. The function was likely replaced by the `increment_campaign_stat` RPC approach (atomic increments vs. recount).

**Recommendation:** Drop the function in a future migration.

### 2.5 Duplicate Updated-At Trigger Functions (LOW)

**Finding:** Three separate functions do the same thing (`NEW.updated_at = NOW(); RETURN NEW;`):
- `update_updated_at_column()` -- used by 7 triggers
- `update_attendant_tokens_updated_at()` -- used by 1 trigger
- `update_campaign_folders_updated_at()` -- used by 1 trigger

**Impact:** Unnecessary code duplication. All could share `update_updated_at_column()`.

**Recommendation:** Consolidate to single function in next migration cycle.

### 2.6 Tags Stored as JSONB Array (MEDIUM)

**Finding:** `contacts.tags` stores tags as a JSONB array of strings (`["vip", "lead"]`). This has caused data corruption (nested arrays like `[["tag"]]`), evidenced by migration `20260225000001_fix_nested_tags_and_stats.sql` and defensive code in both SQL functions and TypeScript (`flattenTags` in supabase-db.ts).

**Impact:** The JSONB array pattern lacks type safety at the database level. Each RPC function must include defensive unwrapping logic. Performance of tag-based queries relies on GIN index but can't enforce individual element types.

**Recommendation:** Consider migrating to a normalized `contact_tags` join table (similar to `campaign_tag_assignments`) for new development. The current approach works but requires ongoing defensive coding.

### 2.7 Denormalized Campaign Counters (LOW)

**Finding:** `campaigns` has 5 counter columns (`sent`, `delivered`, `read`, `failed`, `skipped`) maintained by:
1. `increment_campaign_stat` RPC (atomic increments)
2. `update_campaign_dispatch_metrics` trigger function (unused, does full recount)

The counters can drift from actual `campaign_contacts` data over time.

**Impact:** Minor. The `get_campaign_contact_stats` RPC provides authoritative counts from `campaign_contacts` when accuracy is needed.

**Recommendation:** Acceptable denormalization for dashboard performance. Add a periodic reconciliation job or use the existing recount function.

---

## 3. Index Analysis

### 3.1 Index Quality Assessment

**Well-designed indexes:**
- Covering index on `inbox_conversations(phone) INCLUDE (...)` -- enables index-only scans for webhook hot path
- Partial index `idx_campaigns_active WHERE status IN ('Enviando', 'Agendado')` -- targets active campaigns
- Partial index `idx_campaign_contacts_failed_recent WHERE status = 'failed'` -- targets failure analysis
- HNSW vector index on `ai_embeddings.embedding` -- proper cosine similarity search
- Composite indexes on (campaign_id, status), (conversation_id, created_at DESC) -- match query patterns

**Redundant indexes already removed (good housekeeping documented in comments):**
- `ai_embeddings_agent_id_idx` -- redundant with `(agent_id, dimensions)`
- `idx_account_alerts_dismissed` -- redundant with `(dismissed, created_at)`
- `idx_campaign_contacts_campaign` -- redundant with UNIQUE(campaign_id, contact_id)
- `idx_contacts_phone` -- redundant with UNIQUE constraint
- `idx_templates_name` -- redundant with UNIQUE(name, language)
- `idx_inbox_conversations_phone` -- redundant with covering + composite indexes
- `idx_inbox_messages_conversation_id` -- redundant with composite
- `idx_custom_field_definitions_entity` -- redundant with UNIQUE
- `idx_campaign_tag_assignments_campaign` -- redundant with PK
- `idx_attendant_tokens_token` -- redundant with UNIQUE

### 3.2 Potentially Excessive Indexes (MEDIUM)

**Finding:** `campaign_contacts` has **13 indexes** (plus PK and UNIQUE), making it the most heavily indexed table.

Potentially redundant:
- `idx_campaign_contacts_status` (single column) may be redundant with `idx_campaign_contacts_campaign_status` (composite) for most queries
- `idx_campaign_contacts_failure_title`, `idx_campaign_contacts_failure_fbtrace_id`, `idx_campaign_contacts_failure_subcode` -- three separate indexes on rarely-queried failure detail columns

**Impact:** Write amplification on a high-volume table. Each INSERT/UPDATE must maintain all 15+ indexes.

**Recommendation:** Evaluate failure detail index usage via `pg_stat_user_indexes`. If `idx_scan` is 0, consider dropping.

### 3.3 Missing Indexes (HIGH)

| Table | Missing Index | Reason |
|-------|--------------|--------|
| `campaign_batch_metrics` | FK on `campaign_id` to `campaigns` | No FK exists, but queries filter by campaign_id -- an FK + index would ensure integrity |
| `workflow_runs` | `(workflow_id, status)` composite | Common query: "running workflows for workflow X" |
| `lead_forms` | Partial index `(slug) WHERE is_active = true` | Public form lookup by slug always filters active |
| `contacts` | `(created_at DESC)` | supabase-db.ts orders contacts by created_at -- currently unindexed |

---

## 4. Query Pattern Analysis

### 4.1 SELECT * Usage (HIGH)

**Finding:** `supabase-db.ts` uses `.select('*')` in **22 locations**. This fetches all columns including large JSONB fields (`custom_fields`, `template_variables`, `template_snapshot`, `payload`, `flow_json`), `spec` columns, and potentially unused fields.

**Impact:**
- Increased network bandwidth between Supabase and application
- No ability to use index-only scans
- Transfers sensitive data when not needed (e.g., `attendant_tokens.token`)

**Recommendation:** Replace `.select('*')` with explicit column lists. The `campaigns.list()` method already demonstrates the correct pattern with explicit column selection + join syntax.

### 4.2 N+1 Query Pattern (HIGH)

**Finding:** `campaignDb.list()` makes a secondary query for tag assignments after fetching campaigns:
```typescript
// Fetch campaigns
const { data } = await query.range(offset, offset + limit - 1)
// Then fetch tags for those campaigns (second query)
const { data: tagAssignments } = await supabase
    .from('campaign_tag_assignments')
    .select('campaign_id, campaign_tags(id, name, color, created_at)')
    .in('campaign_id', campaignIds)
```

**Impact:** This is a **2-query pattern** (not true N+1), which is acceptable. The `.in()` uses a single batched query. However, this could be a single query using Supabase's nested select syntax.

**Recommendation:** Low priority. Consider embedding tags in the main campaign query if PostgREST supports the join path.

### 4.3 Full Table Scans (MEDIUM)

**Finding:** Several RPC functions scan entire tables:
- `get_contact_stats()` -- `SELECT COUNT(*) FROM contacts` (full scan)
- `get_contact_tags()` -- scans all contacts with non-null tags
- `get_dashboard_stats()` -- `SELECT COUNT(*) FROM campaigns` + `SELECT COUNT(*) FROM contacts`

**Impact:** Acceptable at current scale (single-tenant). Will degrade as contacts table grows past ~100K rows.

**Recommendation:** For future scaling:
1. Add materialized counters table updated by triggers
2. Or use `pg_stat_user_tables.n_live_tup` for approximate counts
3. The existing `analyze_table` RPC helps keep statistics fresh

### 4.4 Dynamic SQL in increment_campaign_stat (MEDIUM)

**Finding:** The UUID overload of `increment_campaign_stat` uses `EXECUTE format('UPDATE ... SET %I = ...')` with dynamic column name.

```sql
EXECUTE format(
  'UPDATE public.campaigns SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
  p_stat, p_stat
) USING p_value, p_campaign_id;
```

**Impact:** The `%I` format specifier safely quotes identifiers, preventing SQL injection. However, any string can be passed as `p_stat`, potentially updating unintended columns.

**Recommendation:** Add a whitelist check similar to the text overload:
```sql
IF p_stat NOT IN ('sent', 'delivered', 'read', 'failed', 'skipped') THEN
  RAISE EXCEPTION 'Invalid stat column: %', p_stat;
END IF;
```

---

## 5. Security Assessment

### 5.1 RLS Configuration -- GOOD

- RLS enabled on all 38 tables
- service_role bypasses RLS (standard Supabase pattern)
- anon role limited to SELECT on 7 tables (for Supabase Realtime)
- All SECURITY DEFINER functions locked to service_role only
- INSERT/UPDATE/DELETE revoked from anon/authenticated on all tables

### 5.2 Anon SELECT Policies (MEDIUM)

**Finding:** 7 tables have `SELECT TO anon USING (true)` policies, granting read access to anyone with the publishable (anon) key:
- campaigns, contacts, templates, flows, inbox_conversations, inbox_messages, account_alerts

**Impact:** In a single-tenant app, the anon key is used by the frontend for Supabase Realtime subscriptions. Since there's no multi-tenant data isolation needed, `USING (true)` is functionally correct. However, `contacts` and `inbox_messages` contain PII (phone numbers, message content).

**Recommendation:**
1. Acceptable for current single-tenant model
2. If the app ever becomes multi-tenant, these must be replaced with user-scoped policies
3. Consider whether `contacts` and `inbox_messages` really need anon SELECT (check if Realtime is used for these)

### 5.3 SECURITY DEFINER Functions (LOW)

**Finding:** All 20 RPC functions use `SECURITY DEFINER` with `SET search_path` properly configured (either `'public'` or `''`). All have REVOKE/GRANT locked to service_role.

**Assessment:** Properly secured. The `search_path` is explicitly set to prevent search_path hijacking.

### 5.4 Settings Table (LOW)

**Finding:** The `settings` table stores sensitive credentials (WhatsApp tokens, API keys) as plain text in the `value` column.

**Impact:** Anyone with database access sees all secrets. The table has RLS enabled and ALL revoked from anon/authenticated, so only service_role can read.

**Recommendation:** Acceptable for single-tenant with service_role-only access. For defense-in-depth, consider using `pgsodium` encryption for sensitive keys.

---

## 6. Data Integrity Assessment

### 6.1 Foreign Key Coverage -- GOOD

29 foreign keys cover all critical relationships. Cascade behavior is appropriate:
- `CASCADE` for parent-child (ai_agents -> embeddings, campaigns -> campaign_contacts)
- `SET NULL` for optional references (contacts -> campaign_contacts.contact_id)

### 6.2 Missing Foreign Keys (HIGH)

| Table | Column | Should Reference | Impact |
|-------|--------|-----------------|--------|
| `campaign_batch_metrics.campaign_id` | text | `campaigns(id)` | Orphaned metrics if campaign deleted |
| `campaign_trace_events.campaign_id` | text | `campaigns(id)` | Orphaned trace events |
| `campaign_contacts.message_id` | text | -- | References WhatsApp message_id (external, not a FK issue) |
| `campaigns.template_id` | text | `templates(id)` | No FK; templates may be deleted/re-synced from Meta |

**Recommendation:** Add FKs for `campaign_batch_metrics.campaign_id` and `campaign_trace_events.campaign_id` with `ON DELETE CASCADE`. The `campaigns.template_id` intentionally lacks FK since templates are cache entries synced from Meta.

### 6.3 Constraint Completeness (MEDIUM)

**Well-constrained tables:** `inbox_conversations` (3 CHECK constraints), `inbox_messages` (4 CHECK constraints), `ai_knowledge_files` (1 CHECK).

**Under-constrained tables:**
- `campaigns.status` -- no CHECK constraint
- `campaign_contacts.status` -- no CHECK constraint
- `contacts.status` -- no CHECK constraint
- `contacts.tags` -- no validation that elements are strings (relies on application + RPC defense)
- `templates.status` -- no CHECK constraint
- Counter columns (`sent`, `delivered`, etc.) -- no `CHECK >= 0`

### 6.4 NOT NULL Coverage (MEDIUM)

**Finding:** Several columns that should probably be NOT NULL are nullable:
- `campaign_contacts.status` (defaults to 'pending' but allows NULL)
- `contacts.status` (defaults to 'Opt-in' but allows NULL)
- `contacts.updated_at` (populated by trigger but declared nullable)
- `campaigns.updated_at` (same)

**Recommendation:** Add NOT NULL where defaults ensure a value is always present.

---

## 7. Performance Considerations

### 7.1 Autovacuum Tuning -- GOOD

High-volume tables have aggressive autovacuum settings:
- `campaign_contacts`, `inbox_messages`, `inbox_conversations`, `whatsapp_status_events`: vacuum_scale_factor=0.05, analyze_scale_factor=0.02
- `campaigns`: vacuum_scale_factor=0.10, analyze_scale_factor=0.05

This is well-tuned for write-heavy tables.

### 7.2 Vector Search (MEDIUM)

**Finding:** `ai_embeddings.embedding` is typed as `vector(768)` (fixed dimension). The `search_embeddings` function has a `dimensions` parameter overload that filters by `e.dimensions = expected_dimensions`.

**Impact:** If different embedding models with different dimensions are used (e.g., 768 for Gemini, 1536 for OpenAI), all vectors are stored in the same column with the same HNSW index. The index will work but may be suboptimal for mixed dimensions.

**Recommendation:** Monitor embedding dimension usage. If multiple dimensions are common, consider partitioning or separate tables per dimension.

### 7.3 JSONB Column Growth (LOW)

**Finding:** Several tables store unbounded JSONB:
- `inbox_messages.payload` -- raw WhatsApp webhook payload
- `campaigns.template_snapshot` -- full template state
- `campaign_trace_events.extra` -- arbitrary trace data
- `flow_submissions.response_json_raw` (text) + `response_json` (jsonb) -- duplicated data

**Impact:** Row size growth over time. The `SELECT *` pattern (22 locations) transfers all this data.

**Recommendation:** Use TOAST compression (automatic in PostgreSQL) and explicit column selection in queries.

### 7.4 Table Growth Projections

| Table | Growth Pattern | Estimated Volume | Risk |
|-------|---------------|------------------|------|
| `inbox_messages` | Linear per conversation | High (unbounded) | Needs archival strategy |
| `campaign_contacts` | Linear per campaign send | High (N contacts x M campaigns) | Needs archival strategy |
| `whatsapp_status_events` | Multiple per message | Very High (3-5x messages) | Needs retention policy |
| `campaign_trace_events` | Multiple per campaign run | High | Needs retention policy |
| `ai_agent_logs` | Per inference | Medium | Needs retention policy |

**Recommendation:** Implement data retention policies:
1. Archive `whatsapp_status_events` older than 90 days
2. Archive `campaign_trace_events` older than 30 days
3. Archive `ai_agent_logs` older than 60 days
4. Consider partitioning `inbox_messages` by `created_at` if volume exceeds 1M rows

---

## 8. Migration Safety

### 8.1 Migration Strategy -- GOOD

- Init migration generated from `pg_dump` (reproducible)
- Incremental migrations use `IF NOT EXISTS` / `CREATE OR REPLACE` (idempotent)
- Archived migrations properly moved out of active path
- Changelog maintained (`CHANGELOG_V2.md`)
- Installation guide available (`WIZARD_GUIDE.md`)

### 8.2 Rollback Readiness (HIGH)

**Finding:** No rollback scripts exist for any migration. The init.sql is a full schema dump (not reversible), and incremental migrations add columns/functions without corresponding DOWN scripts.

**Impact:** A failed migration requires manual SQL intervention.

**Recommendation:**
1. Create rollback scripts for each future migration
2. For existing migrations, document manual rollback steps
3. Consider adding a `supabase/rollbacks/` directory

### 8.3 Backup Configuration (HIGH)

**Finding:** No evidence of backup strategy in the codebase. Supabase manages automatic daily backups on Pro plan, but this is not documented or verified.

**Recommendation:**
1. Verify Supabase plan includes point-in-time recovery (PITR)
2. Document backup RPO/RTO requirements
3. Add `pg_dump` script for manual backup before migrations
4. Test restore procedure at least once

---

## 9. Findings Summary by Severity

### HIGH (6)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| H1 | `SELECT *` used in 22 query locations | 4.1 | Medium |
| H2 | Missing CHECK constraints on enum columns | 2.3 | Low |
| H3 | Missing FKs on batch_metrics and trace_events | 6.2 | Low |
| H4 | No rollback scripts for migrations | 8.2 | Medium |
| H5 | No documented backup strategy | 8.3 | Low |
| H6 | Missing index on contacts.created_at | 3.3 | Low |

### MEDIUM (11)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| M1 | Mixed ID strategy (UUID vs prefixed text) | 2.1 | N/A (accept) |
| M2 | Bilingual status values | 2.2 | Medium |
| M3 | Tags stored as JSONB array (corruption risk) | 2.6 | High |
| M4 | Excessive indexes on campaign_contacts | 3.2 | Low |
| M5 | Full table scans in stats RPCs | 4.3 | Medium |
| M6 | Dynamic SQL without column whitelist | 4.4 | Low |
| M7 | Anon SELECT on PII tables | 5.2 | Low |
| M8 | Under-constrained nullable columns | 6.4 | Low |
| M9 | Missing NOT NULL on defaulted columns | 6.4 | Low |
| M10 | No data retention policies | 7.4 | Medium |
| M11 | Vector dimension mixing in single column | 7.2 | Low |

### LOW (8)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| L1 | Orphaned trigger function | 2.4 | Trivial |
| L2 | Duplicate updated_at functions | 2.5 | Low |
| L3 | Denormalized campaign counters | 2.7 | N/A (accept) |
| L4 | Inconsistent index/trigger naming | Schema doc 9 | Low |
| L5 | Settings table stores secrets in plain text | 5.4 | Medium |
| L6 | JSONB column growth | 7.3 | N/A (monitor) |
| L7 | Duplicated data in flow_submissions (raw + jsonb) | 7.3 | Low |
| L8 | Missing indexes on lead_forms, workflow_runs | 3.3 | Low |

---

## 10. Recommended Action Plan

### Phase 1: Quick Wins (1-2 hours)

1. Add CHECK constraints for `campaigns.status`, `campaign_contacts.status`, `contacts.status`
2. Add FK for `campaign_batch_metrics.campaign_id` -> `campaigns(id)` CASCADE
3. Add FK for `campaign_trace_events.campaign_id` -> `campaigns(id)` CASCADE
4. Add whitelist check in `increment_campaign_stat(uuid, text, integer)`
5. Add index on `contacts(created_at DESC)`
6. Drop orphaned `update_campaign_dispatch_metrics()` function

### Phase 2: Medium-Term (1-2 days)

1. Replace `SELECT *` with explicit column lists in `supabase-db.ts`
2. Create rollback scripts template and process
3. Document backup/restore procedure
4. Evaluate and potentially drop low-usage indexes on campaign_contacts failure columns
5. Add NOT NULL constraints where defaults exist

### Phase 3: Strategic (sprint-level)

1. Standardize status values to English (with migration plan)
2. Design data retention policies for high-growth tables
3. Evaluate tag storage migration from JSONB array to join table
4. Consolidate duplicate trigger functions
5. Implement periodic counter reconciliation job

---

*-- Dara, arquitetando dados*
