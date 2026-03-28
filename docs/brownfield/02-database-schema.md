# SmartZap -- Database Schema Document

**Brownfield Discovery -- Phase 2 (Schema)**
**Data:** 2026-03-28
**Autor:** Dara (Data Engineer Agent)
**Status:** Completo

---

## 1. Overview

| Metric | Value |
|--------|-------|
| **Tables** | 38 |
| **Views** | 1 (`campaign_stats_summary`) |
| **Functions (RPC)** | 20 |
| **Triggers** | 9 |
| **Indexes** | 102+ |
| **Foreign Keys** | 29 |
| **Extensions** | `vector` (pgvector), `uuid-ossp` (implicitly via `uuid_generate_v4`) |
| **Active Migrations** | 4 (init + 3 incremental) |
| **Archived Migrations** | 16 (consolidated into init.sql) |
| **RLS** | Enabled on ALL 38 tables |
| **Schema** | `public` (all objects) |

---

## 2. Tables by Domain

### 2.1 Campaigns Domain (8 tables + 1 view)

#### `campaigns` (core)

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | text | `'c_' \|\| uuid` | NOT NULL | PK, prefixed text ID |
| `name` | text | -- | NOT NULL | |
| `status` | text | `'Rascunho'` | NOT NULL | Enum in pt-BR: Rascunho, Agendado, Enviando, etc. |
| `template_name` | text | -- | YES | Name of WhatsApp template |
| `template_id` | text | -- | YES | |
| `template_variables` | jsonb | -- | YES | `{header:[], body:[], buttons:{}}` |
| `template_snapshot` | jsonb | -- | YES | Full template state at send time |
| `template_spec_hash` | text | -- | YES | |
| `template_parameter_format` | text | -- | YES | |
| `template_fetched_at` | timestamptz | -- | YES | |
| `scheduled_date` | timestamptz | -- | YES | |
| `created_at` | timestamptz | `now()` | NOT NULL | |
| `updated_at` | timestamptz | -- | YES | Via trigger |
| `started_at` | timestamptz | -- | YES | |
| `completed_at` | timestamptz | -- | YES | |
| `total_recipients` | integer | `0` | YES | |
| `sent` | integer | `0` | YES | Counter |
| `delivered` | integer | `0` | YES | Counter |
| `read` | integer | `0` | YES | Counter |
| `failed` | integer | `0` | YES | Counter |
| `skipped` | integer | `0` | YES | Counter |
| `last_sent_at` | timestamptz | -- | YES | |
| `first_dispatch_at` | timestamptz | -- | YES | |
| `cancelled_at` | timestamptz | -- | YES | |
| `qstash_schedule_message_id` | text | -- | YES | QStash integration |
| `qstash_schedule_enqueued_at` | timestamptz | -- | YES | |
| `flow_id` | text | -- | YES | Link to workflow |
| `flow_name` | text | -- | YES | Denormalized name |
| `folder_id` | uuid | -- | YES | FK to campaign_folders |

**Constraints:** PK(id)
**FKs:** `folder_id` -> `campaign_folders(id)` ON DELETE SET NULL
**Indexes:** `idx_campaigns_status`, `idx_campaigns_created_at`, `idx_campaigns_active` (partial), `idx_campaigns_folder_id`, `idx_campaigns_flow_id` (partial), `idx_campaigns_qstash_schedule_message_id`, `campaigns_first_dispatch_at_idx`, `campaigns_last_sent_at_idx`, `campaigns_cancelled_at_idx`
**Trigger:** `set_updated_at` BEFORE UPDATE
**Autovacuum:** scale_factor=0.10, analyze_scale_factor=0.05

#### `campaign_contacts`

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | text | `'cc_' \|\| uuid` | NOT NULL | PK |
| `campaign_id` | text | -- | NOT NULL | FK to campaigns |
| `contact_id` | text | -- | YES | FK to contacts |
| `phone` | text | -- | NOT NULL | |
| `name` | text | -- | YES | Denormalized |
| `email` | text | -- | YES | Denormalized |
| `custom_fields` | jsonb | `'{}'` | YES | Snapshot at send time |
| `status` | text | `'pending'` | YES | pending/sending/sent/delivered/read/failed/skipped |
| `message_id` | text | -- | YES | WhatsApp message ID |
| `sending_at` | timestamptz | -- | YES | |
| `sent_at` | timestamptz | -- | YES | |
| `delivered_at` | timestamptz | -- | YES | |
| `read_at` | timestamptz | -- | YES | |
| `failed_at` | timestamptz | -- | YES | |
| `skipped_at` | timestamptz | -- | YES | |
| `error` | text | -- | YES | |
| `skip_code` | text | -- | YES | |
| `skip_reason` | text | -- | YES | |
| `failure_code` | integer | -- | YES | Meta error code |
| `failure_reason` | text | -- | YES | |
| `trace_id` | text | -- | YES | |
| `failure_title` | text | -- | YES | |
| `failure_details` | text | -- | YES | |
| `failure_fbtrace_id` | text | -- | YES | |
| `failure_subcode` | integer | -- | YES | |
| `failure_href` | text | -- | YES | |

**Constraints:** PK(id), UNIQUE(campaign_id, contact_id), CHECK(skipped -> failure_reason or error)
**FKs:** `campaign_id` -> `campaigns(id)` CASCADE, `contact_id` -> `contacts(id)` SET NULL
**Indexes:** 13 indexes including composite (campaign_id, status), (campaign_id, phone), partial (failed_at WHERE status='failed'), message_id, trace_id, failure columns
**Autovacuum:** scale_factor=0.05, analyze_scale_factor=0.02

#### `campaign_folders`

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `name` | text | -- | NOT NULL |
| `color` | text | `'#6B7280'` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |
| `updated_at` | timestamptz | `now()` | NOT NULL |

**Constraints:** PK(id), UNIQUE(name)
**Trigger:** `update_campaign_folders_updated_at_trigger`

#### `campaign_tags`

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `name` | text | -- | NOT NULL |
| `color` | text | `'#6B7280'` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

**Constraints:** PK(id), UNIQUE(name)

#### `campaign_tag_assignments`

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| `campaign_id` | text | -- | NOT NULL |
| `tag_id` | uuid | -- | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

**Constraints:** PK(campaign_id, tag_id)
**FKs:** `campaign_id` -> `campaigns(id)` CASCADE, `tag_id` -> `campaign_tags(id)` CASCADE
**Indexes:** `idx_campaign_tag_assignments_tag`

#### `campaign_batch_metrics`

Stores per-batch dispatch metrics for campaign sends. 15 columns including `campaign_id` (FK), `trace_id`, `batch_index`, throughput stats, error tracking.

**FKs:** None (campaign_id is text but no FK declared)
**Indexes:** (campaign_id, created_at DESC), (trace_id, batch_index)

#### `campaign_run_metrics`

Aggregated per-run metrics. 16 columns including throughput_mps, config JSONB, config_hash for A/B testing.

**Constraints:** UNIQUE(campaign_id, trace_id)
**Indexes:** (campaign_id, created_at DESC), (config_hash, created_at DESC), (created_at DESC)

#### `campaign_trace_events`

Fine-grained trace events for debugging. 12 columns: trace_id, phase, step, ok, ms, extra JSONB.

**Indexes:** (campaign_id, ts DESC), (trace_id, ts DESC), (trace_id, phase, ts DESC)

#### `campaign_stats_summary` (VIEW)

Aggregation view with `security_invoker=true`. Summarizes campaign counts by status, totals for sent/delivered/read/failed, and 24h metrics. Handles bilingual status values (pt-BR + en).

---

### 2.2 Contacts Domain (3 tables)

#### `contacts` (core)

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | text | `'ct_' \|\| uuid` | NOT NULL | PK |
| `name` | text | `''` | NOT NULL | |
| `phone` | text | -- | NOT NULL | E.164 format |
| `email` | text | -- | YES | |
| `status` | text | `'Opt-in'` | YES | Opt-in/Opt-out |
| `tags` | jsonb | `'[]'` | YES | Array of strings |
| `notes` | text | -- | YES | |
| `custom_fields` | jsonb | `'{}'` | YES | Dynamic fields |
| `created_at` | timestamptz | `now()` | NOT NULL | |
| `updated_at` | timestamptz | -- | YES | Via trigger |

**Constraints:** PK(id), UNIQUE(phone)
**Indexes:** `idx_contacts_tags` (GIN), `idx_contacts_custom_fields` (GIN), `idx_contacts_status`
**Trigger:** `set_updated_at` BEFORE UPDATE

#### `custom_field_definitions`

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| `id` | text | `'cfd_' \|\| uuid` | NOT NULL |
| `key` | text | -- | NOT NULL |
| `label` | text | -- | NOT NULL |
| `type` | text | `'text'` | NOT NULL |
| `options` | jsonb | -- | YES |
| `entity_type` | text | `'contact'` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

**Constraints:** PK(id), UNIQUE(entity_type, key)

#### `phone_suppressions`

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| `id` | text | `'ps_' \|\| uuid` | NOT NULL |
| `phone` | text | -- | NOT NULL |
| `is_active` | boolean | `true` | NOT NULL |
| `reason` | text | -- | YES |
| `source` | text | -- | YES |
| `metadata` | jsonb | `'{}'` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |
| `last_seen_at` | timestamptz | -- | YES |
| `expires_at` | timestamptz | -- | YES |

**Constraints:** PK(id), UNIQUE(phone)
**Indexes:** partial (is_active WHERE true), partial (expires_at WHERE NOT NULL), phone

---

### 2.3 Inbox Domain (5 tables)

#### `inbox_conversations`

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | uuid | `gen_random_uuid()` | NOT NULL | PK |
| `contact_id` | text | -- | YES | FK to contacts |
| `ai_agent_id` | uuid | -- | YES | FK to ai_agents |
| `phone` | text | -- | NOT NULL | |
| `status` | text | `'open'` | NOT NULL | CHECK: open/closed |
| `mode` | text | `'bot'` | NOT NULL | CHECK: bot/human |
| `priority` | text | `'normal'` | NOT NULL | CHECK: low/normal/high/urgent |
| `unread_count` | integer | `0` | NOT NULL | Atomic counter |
| `total_messages` | integer | `0` | NOT NULL | Atomic counter |
| `last_message_at` | timestamptz | -- | YES | |
| `last_message_preview` | text | -- | YES | Truncated 100 chars |
| `automation_paused_until` | timestamptz | -- | YES | |
| `automation_paused_by` | text | -- | YES | |
| `handoff_summary` | text | -- | YES | |
| `human_mode_expires_at` | timestamptz | -- | YES | |
| `created_at` | timestamptz | `now()` | NOT NULL | |
| `updated_at` | timestamptz | `now()` | NOT NULL | |

**FKs:** `contact_id` -> `contacts(id)` SET NULL, `ai_agent_id` -> `ai_agents(id)` SET NULL
**Indexes:** Covering index on phone (INCLUDE id, status, mode, ai_agent_id, contact_id, etc.), composite (phone, status), (mode, status), (last_message_at DESC), (ai_agent_id), (contact_id), partial (human_mode_expires WHERE mode='human')
**Autovacuum:** scale_factor=0.05, analyze_scale_factor=0.02

#### `inbox_messages`

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | uuid | `gen_random_uuid()` | NOT NULL | PK |
| `conversation_id` | uuid | -- | NOT NULL | FK to inbox_conversations |
| `direction` | text | -- | NOT NULL | CHECK: inbound/outbound |
| `content` | text | -- | NOT NULL | |
| `message_type` | text | `'text'` | NOT NULL | CHECK: text/image/audio/video/document/template/interactive/internal_note |
| `media_url` | text | -- | YES | |
| `whatsapp_message_id` | text | -- | YES | |
| `delivery_status` | text | `'pending'` | NOT NULL | CHECK: pending/sent/delivered/read/failed |
| `ai_response_id` | uuid | -- | YES | |
| `ai_sentiment` | text | -- | YES | CHECK: positive/neutral/negative/frustrated |
| `ai_sources` | jsonb | -- | YES | |
| `payload` | jsonb | -- | YES | Raw WhatsApp payload |
| `created_at` | timestamptz | `now()` | NOT NULL | |
| `delivered_at` | timestamptz | -- | YES | |
| `read_at` | timestamptz | -- | YES | |
| `failed_at` | timestamptz | -- | YES | |
| `failure_reason` | text | -- | YES | |

**FKs:** `conversation_id` -> `inbox_conversations(id)` CASCADE
**Indexes:** composite (conversation_id, created_at DESC), (created_at), partial (whatsapp_message_id WHERE NOT NULL)
**Autovacuum:** scale_factor=0.05, analyze_scale_factor=0.02

#### `inbox_labels`

Simple label entity: id (uuid PK), name (unique), color, created_at.

#### `inbox_conversation_labels`

Join table: PK(conversation_id, label_id), FKs CASCADE on both sides.

#### `inbox_quick_replies`

id (uuid PK), title, content, shortcut (unique), created_at.

---

### 2.4 AI Domain (4 tables)

#### `ai_agents`

22 columns including model config (model, temperature, max_tokens), embedding config (provider, model, dimensions), RAG config (similarity_threshold, max_results), rerank config, behavior flags (debounce_ms, handoff_enabled, handoff_instructions, booking_tool_enabled, allow_reactions, allow_quotes).

**Constraints:** PK(id), Unique partial index (is_default WHERE true) -- ensures single default agent.
**Triggers:** `set_updated_at`, `ensure_default_ai_agent_trigger` (auto-marks first agent as default)

#### `ai_knowledge_files`

Knowledge base files for RAG. 12 columns. CHECK constraint on indexing_status (pending/processing/completed/failed/local_only).

**FKs:** `agent_id` -> `ai_agents(id)` CASCADE

#### `ai_embeddings`

Vector embeddings: id, agent_id (FK CASCADE), file_id (FK CASCADE), content, embedding (vector(768)), dimensions, metadata JSONB.

**Indexes:** HNSW on embedding (cosine), composite (agent_id, dimensions), (file_id)

#### `ai_agent_logs`

Inference logs: input/output messages, response_time_ms, model_used, tokens_used, sources_used, error_message.

**FKs:** `ai_agent_id` -> `ai_agents(id)` CASCADE, `conversation_id` -> `inbox_conversations(id)` SET NULL

---

### 2.5 Templates Domain (3 tables)

#### `templates`

14 columns. WhatsApp template cache synced from Meta.

**Constraints:** PK(id), UNIQUE(name, language)
**Indexes:** `idx_templates_status`
**Trigger:** `set_updated_at`

#### `template_projects`

AI-generated template projects. 10 columns including source ('ai'), strategy ('utility').

#### `template_project_items`

Individual template drafts within projects. 16 columns including Meta submission tracking (meta_id, meta_status, rejected_reason, submitted_at).

---

### 2.6 Flows Domain (2 tables)

#### `flows`

WhatsApp Flows (Meta Flows API). 15 columns including meta_flow_id, spec JSONB, flow_json JSONB, mapping JSONB, Meta sync fields.

**Trigger:** `set_updated_at`

#### `flow_submissions`

User responses to flows. 14 columns. message_id (unique), response_json JSONB, mapped_data JSONB.

**FKs:** `contact_id` -> `contacts(id)` SET NULL, `campaign_id` -> `campaigns(id)` SET NULL, `flow_local_id` -> `flows(id)` SET NULL

---

### 2.7 Workflow Builder Domain (6 tables)

#### `workflows`

Visual workflow definitions: id (text PK), name, description, status, active_version_id (FK to workflow_versions, SET NULL).

#### `workflow_versions`

Versioned node/edge definitions: nodes JSONB, edges JSONB, version (integer), UNIQUE(workflow_id, version).

#### `workflow_runs`

Execution tracking: trigger_type, input/output JSONB, error, timing.

#### `workflow_run_logs`

Per-node execution logs: node_id, node_type, status, input/output JSONB. Uses BIGINT SERIAL PK.

#### `workflow_builder_executions` / `workflow_builder_logs`

Legacy builder execution tracking (appears to be deprecated/parallel to workflow_runs).

#### `workflow_conversations`

Active workflow conversations: phone, resume_node_id, variable_key, variables JSONB.

---

### 2.8 Other Tables

#### `settings`

Simple key-value store: key (text PK), value (text), updated_at. Used for WhatsApp credentials, AI config, etc. Redis-cached (60s TTL).

#### `account_alerts`

System health alerts: type, code (integer), message, details JSONB, dismissed boolean.

#### `lead_forms`

Public lead capture forms: slug (unique), tag, is_active, fields JSONB, webhook_token (unique).

#### `attendant_tokens`

Human agent auth tokens for inbox: token (unique), permissions JSONB, is_active, expires_at, access_count.

**Trigger:** `update_attendant_tokens_updated_at_trigger`

#### `push_subscriptions`

Web Push subscriptions: endpoint (unique), keys JSONB (CHECK: p256dh + auth), attendant_token_id FK.

#### `whatsapp_status_events`

WhatsApp delivery status webhook events: message_id, status, dedupe_key (unique), apply_state, campaign tracking fields.

**FKs:** `campaign_contact_id` -> `campaign_contacts(id)` SET NULL, `campaign_id` -> `campaigns(id)` SET NULL
**Autovacuum:** scale_factor=0.05, analyze_scale_factor=0.02

---

## 3. Foreign Key Relationship Map

```
ai_agents
  |-- ai_agent_logs (CASCADE)
  |-- ai_knowledge_files (CASCADE)
  |   |-- ai_embeddings (CASCADE via file_id)
  |-- ai_embeddings (CASCADE via agent_id)
  |-- inbox_conversations (SET NULL via ai_agent_id)

contacts
  |-- campaign_contacts (SET NULL via contact_id)
  |-- flow_submissions (SET NULL via contact_id)
  |-- inbox_conversations (SET NULL via contact_id)

campaigns
  |-- campaign_contacts (CASCADE)
  |-- campaign_tag_assignments (CASCADE)
  |-- flow_submissions (SET NULL via campaign_id)
  |-- whatsapp_status_events (SET NULL via campaign_id)
  |-- campaign_folders (SET NULL via folder_id, reverse FK)

campaign_contacts
  |-- whatsapp_status_events (SET NULL via campaign_contact_id)

campaign_tags
  |-- campaign_tag_assignments (CASCADE via tag_id)

inbox_conversations
  |-- inbox_messages (CASCADE)
  |-- inbox_conversation_labels (CASCADE)
  |-- ai_agent_logs (SET NULL via conversation_id)

inbox_labels
  |-- inbox_conversation_labels (CASCADE via label_id)

workflows
  |-- workflow_versions (CASCADE)
  |-- workflow_runs (CASCADE)
  |-- workflow_conversations (CASCADE)
  |   (circular: workflows.active_version_id -> workflow_versions SET NULL)

workflow_versions
  |-- workflow_runs (SET NULL via version_id)

workflow_builder_executions
  |-- workflow_builder_logs (CASCADE)

template_projects
  |-- template_project_items (CASCADE)

attendant_tokens
  |-- push_subscriptions (CASCADE)

flows
  |-- flow_submissions (SET NULL via flow_local_id)
```

---

## 4. RPC Functions Summary

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `get_campaign_contact_stats` | campaign_id text | json | Per-campaign delivery stats |
| `get_campaigns_with_all_tags` | tag_ids uuid[] | text[] | Campaign IDs having ALL specified tags |
| `get_contact_stats` | -- | json | Total/optIn/optOut counts |
| `get_contact_tags` | -- | json | Distinct tags across all contacts |
| `get_contact_tag_counts` | -- | TABLE(tag, count) | Tags with contact count |
| `get_dashboard_stats` | -- | TABLE(6 bigints) | Global dashboard counters |
| `increment_campaign_stat` | campaign_id text, field text | void | Atomic counter increment (text overload) |
| `increment_campaign_stat` | campaign_id uuid, stat text, value int | void | Atomic counter increment (uuid overload, dynamic SQL) |
| `search_embeddings` (2 overloads) | query_embedding vector, ... | TABLE | RAG similarity search |
| `increment_conversation_counters` | conversation_id uuid, direction, preview | inbox_conversations | Atomic message counter |
| `decrement_unread_count` | conversation_id uuid, amount int | inbox_conversations | Reduce unread (GREATEST 0) |
| `reset_unread_count` | conversation_id uuid | inbox_conversations | Mark all read |
| `process_inbound_message` | phone, content, ... | json | Atomic inbound: find/create convo + insert message |
| `get_agent_config` | conversation_id uuid | json | Agent config for conversation |
| `bulk_update_contact_tags` | ids text[], add text[], remove text[] | integer | Bulk tag edit with nesting protection |
| `bulk_delete_contacts` | ids text[] | integer | Bulk delete avoiding 414 URI length |
| `analyze_table` | table_name text | void | Whitelisted ANALYZE for hot tables |

---

## 5. Trigger Summary

| Table | Trigger | Function | Event |
|-------|---------|----------|-------|
| `ai_agents` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `ai_agents` | `ensure_default_ai_agent_trigger` | `ensure_default_ai_agent` | BEFORE INSERT |
| `campaigns` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `contacts` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `flows` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `inbox_conversations` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `templates` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `workflows` | `set_updated_at` | `update_updated_at_column` | BEFORE UPDATE |
| `attendant_tokens` | `update_attendant_tokens_updated_at_trigger` | `update_attendant_tokens_updated_at` | BEFORE UPDATE |
| `campaign_folders` | `update_campaign_folders_updated_at_trigger` | `update_campaign_folders_updated_at` | BEFORE UPDATE |

Note: `update_campaign_dispatch_metrics` trigger function exists but is NOT attached to any table in the current schema (the trigger appears to have been removed but the function was kept).

---

## 6. Row Level Security (RLS)

### Coverage

RLS is **enabled on all 38 tables**.

### Policy Strategy

The application is **single-tenant** and uses `service_role` key (bypasses RLS) for all server-side API routes. RLS serves as a defense-in-depth layer.

### Policies Defined

| Table | Policy | Operation | Role | Using |
|-------|--------|-----------|------|-------|
| `campaigns` | `anon_select_campaigns` | SELECT | anon | `true` |
| `contacts` | `anon_select_contacts` | SELECT | anon | `true` |
| `templates` | `anon_select_templates` | SELECT | anon | `true` |
| `flows` | `anon_select_flows` | SELECT | anon | `true` |
| `inbox_conversations` | `anon_select_inbox_conversations` | SELECT | anon | `true` |
| `inbox_messages` | `anon_select_inbox_messages` | SELECT | anon | `true` |
| `account_alerts` | `anon_select_account_alerts` | SELECT | anon | `true` |

### Security Grants

- **7 tables with anon SELECT policies:** Only SELECT granted; INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER revoked from anon + authenticated.
- **31 tables without policies:** ALL privileges revoked from anon + authenticated. Only service_role has access.
- **All SECURITY DEFINER functions:** REVOKE ALL from PUBLIC, anon, authenticated. GRANT EXECUTE only to service_role.

---

## 7. Migrations History

### Active Migrations

| Timestamp | File | Description |
|-----------|------|-------------|
| `00000000000000` | `_init.sql` | Full schema dump (38 tables, all indexes, triggers, FKs, RLS). Generated from pg_dump 2026-01-22, updated 2026-01-24. |
| `20260204000000` | `add_agent_reaction_quote_settings.sql` | Adds `allow_reactions`, `allow_quotes` to ai_agents (idempotent IF NOT EXISTS) |
| `20260225000001` | `fix_nested_tags_and_stats.sql` | Fixes corrupted nested tags in contacts, recreates RPCs with sanitization |
| `20260225000002` | `add_get_contact_tag_counts.sql` | Adds `get_contact_tag_counts()` RPC |

### Archived Migrations (16, consolidated into init.sql)

Located in `supabase/migrations/_archive/`:
- `20250124000000` - atomic_conversation_counters
- `20260121000001` - add_handoff_enabled
- `20260121000002` - add_attendant_tokens
- `20260121000003` - add_push_subscriptions
- `20260122000000` - telegram_miniapp
- `20260122000001` - add_handoff_instructions / seed_strategy_prompts
- `20260122000002` - add_booking_tool_enabled
- `20260122000003` - add_template_variables_columns
- `20260122000004` - add_source_to_template_projects
- `20260122000005` - add_missing_template_item_columns
- `20260123000001` - update_default_model
- `20260124115031` - add_strategy_to_template_projects
- `20260224000001` - add_contacts_tags_gin_index
- `20260224000002` - add_bulk_update_contact_tags_rpc
- `20260224000003` - add_bulk_delete_contacts_rpc

---

## 8. ID Strategy

The schema uses a **mixed ID strategy**:

| Pattern | Tables Using It | Example |
|---------|----------------|---------|
| `uuid` (native) | ai_agents, ai_embeddings, ai_knowledge_files, ai_agent_logs, inbox_conversations, inbox_messages, inbox_labels, campaign_folders, campaign_tags, campaign_batch/run_metrics, push_subscriptions | `gen_random_uuid()` |
| `prefixed text` | campaigns (`c_`), contacts (`ct_`), campaign_contacts (`cc_`), flows (`fl_`), lead_forms (`lf_`), templates (`tpl_`), template_projects (`tp_`), template_project_items (`tpi_`), flow_submissions (`fs_`), phone_suppressions (`ps_`), custom_field_definitions (`cfd_`), account_alerts (`alert_`), whatsapp_status_events (`wse_`) | `concat('c_', replace(uuid, '-', ''))` |
| `text` (manual) | workflows, workflow_versions, workflow_runs, workflow_builder_executions, workflow_conversations | Client-generated |
| `bigint serial` | workflow_builder_logs, workflow_run_logs | Auto-increment |

---

## 9. Naming Conventions

- **Tables:** snake_case, plural (`campaigns`, `contacts`, `inbox_messages`)
- **Columns:** snake_case (`created_at`, `campaign_id`, `ai_agent_id`)
- **Indexes:** Mix of `idx_{table}_{column}` and `{table}_{column}_idx` (inconsistent)
- **Constraints:** Mix of auto-generated (`{table}_pkey`) and manual (`campaign_contacts_skipped_reason_check`)
- **Functions:** snake_case with descriptive names (`get_campaign_contact_stats`, `process_inbound_message`)
- **Triggers:** `set_updated_at` or `update_{table}_updated_at_trigger` (inconsistent)
