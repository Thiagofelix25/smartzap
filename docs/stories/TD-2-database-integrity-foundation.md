# TD-2: Database Integrity Foundation

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 1-2
**Status:** Draft
**Effort:** 8-12 hours
**Priority:** HIGH
**Debt Items Covered:** #2 (Bilingual Status), #4 (Missing Indexes), #5 (CHECK Constraints), #8 (Unused Trigger), #9 (Foreign Key Gaps), #7 (Mixed ID Strategy), #10 (Duplicate Triggers), #11 (Data Retention), #12 (Anonymous SELECT on PII)
**Dependencies:** Item #2 (bilingual fix) MUST complete BEFORE item #5 (CHECK constraints on campaigns.status)

---

## Description

Address 9 database integrity issues in a single coordinated effort. The critical path is: standardize bilingual status values to English first, then apply CHECK constraints. Index additions and FK fixes can run in parallel.

---

## Acceptance Criteria

### AC1: Standardize Bilingual Status Values (Debt Item #2) — 4-6h
- [ ] Create migration `supabase/migrations/{timestamp}_standardize_status_english.sql`
- [ ] Map all Portuguese status values to English equivalents per `types.ts`:
  - `'Rascunho'` -> `'DRAFT'`
  - `'Agendada'` -> `'SCHEDULED'`
  - `'Enviando'` -> `'SENDING'`
  - `'Concluida'` / `'Concluída'` -> `'COMPLETED'`
  - `'Pausada'` -> `'PAUSED'`
  - `'Falhou'` -> `'FAILED'`
- [ ] Audit ALL queries in `lib/supabase-db.ts` and API routes that filter by status — confirm they use English values
- [ ] Audit all frontend components that display or filter by status
- [ ] Run migration in test environment — zero data loss
- [ ] Verify campaign list, campaign detail, and filtering work correctly after migration

### AC2: Add Missing Indexes (Debt Item #4) — 1-2h
- [ ] Create migration adding:
  - `CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);`
  - `CREATE INDEX idx_campaign_contacts_status_updated ON campaign_contacts(status, updated_at);`
  - `CREATE INDEX idx_templates_status_updated ON templates(status, updated_at);`
  - `CREATE INDEX idx_flows_workspace_updated ON flows(workspace_id, updated_at);`
- [ ] Verify indexes appear in Supabase dashboard
- [ ] Run EXPLAIN on "Recent Contacts" query — confirm index usage

### AC3: Add CHECK Constraints (Debt Item #5) — 1-2h
- [ ] **Depends on AC1 completion**
- [ ] Create migration adding CHECK constraints:
  - `campaign_contacts.status` — valid English values only
  - `contacts.status` — valid opt_status values only
  - `flows.status` — valid flow status values only
  - `templates.status` — valid template status values only
  - Counter columns (`sent_count`, `delivered_count`, `failed_count`, etc.) `>= 0`
- [ ] Verify constraint violations produce clear error messages
- [ ] Test inserting invalid status — confirm rejection

### AC4: Clean Up Orphaned Trigger (Debt Item #8) — 15 min
- [ ] Create migration: `DROP FUNCTION IF EXISTS update_campaign_dispatch_metrics();`
- [ ] Verify no trigger references this function (query `pg_trigger`)
- [ ] Confirm no runtime errors after drop

### AC5: Add Missing Foreign Keys (Debt Item #9) — 2-3h
- [ ] Add FK from `campaign_batch_metrics` to `campaigns(id)` with `ON DELETE CASCADE`
- [ ] Add FK from `campaign_trace_events` to `campaigns(id)` with `ON DELETE CASCADE`
- [ ] Verify existing data satisfies FK constraints (no orphan rows)
- [ ] If orphan rows exist, clean them up in the same migration (DELETE orphans first, then ADD CONSTRAINT)

### AC6: Document Decisions for LOW Items — 30 min
- [ ] Mixed ID Strategy (#7): Document in migration comment "New tables use native UUID; existing tables not retrofitted (single-tenant, low value)"
- [ ] Duplicate Triggers (#10): Identify and document (or remove if safe)
- [ ] Data Retention (#11): Create `docs/architecture/data-retention-policy.md` with initial retention recommendations
- [ ] Anonymous SELECT on PII (#12): Document RLS policy recommendation for future implementation

---

## Technical Notes

- All migrations go to `supabase/migrations/` with timestamp prefix
- Run `supabase db push` to apply locally
- The bilingual fix is the CRITICAL PATH — everything else can happen in parallel
- FK additions may fail if orphan data exists; always check first with a SELECT query
- CHECK constraints must use the exact enum values from `types.ts`

---

## Migration Order

```
1. {timestamp}_standardize_status_english.sql    (AC1 — must be first)
2. {timestamp}_add_missing_indexes.sql            (AC2 — parallel)
3. {timestamp}_add_check_constraints.sql          (AC3 — after AC1)
4. {timestamp}_cleanup_orphaned_trigger.sql       (AC4 — parallel)
5. {timestamp}_add_foreign_keys.sql               (AC5 — parallel)
```

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
