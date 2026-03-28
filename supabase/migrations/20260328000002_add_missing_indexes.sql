-- TD-2 AC2: Add missing database indexes for performance
-- Improves query speed for common filters and sorts

-- ============================================================================
-- Index for recent contacts query (created_at DESC is the most common sort)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_created_at
ON contacts(created_at DESC);

-- ============================================================================
-- Composite index for campaign_contacts filtering by status + date
-- Used in: "get all pending contacts for campaign", sorting by update time
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status_updated
ON campaign_contacts(status, updated_at DESC);

-- ============================================================================
-- Composite index for templates filtering by status + date
-- Used in: "get approved templates", "get rejected templates", sorting by date
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_templates_status_updated
ON templates(status, updated_at DESC);

-- ============================================================================
-- Composite index for flows filtering by workspace + date
-- Used in: "get flows in workspace", sorting by update time
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_flows_workspace_updated
ON flows(workspace_id, updated_at DESC);

-- ============================================================================
-- Additional indexes for common queries (optional, based on usage patterns)
-- ============================================================================

-- Contacts: filter by opt_status for segmentation
CREATE INDEX IF NOT EXISTS idx_contacts_opt_status
ON contacts(opt_status);

-- Campaign contacts: filter by campaign_id + status (used in dashboard)
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_status
ON campaign_contacts(campaign_id, status);

-- Campaigns: filter by status for dashboard/filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_status
ON campaigns(status);

-- ============================================================================
-- Verification (after migration)
-- ============================================================================
-- Check index creation: SELECT * FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
