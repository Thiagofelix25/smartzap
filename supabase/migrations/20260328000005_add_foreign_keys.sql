-- TD-2 AC5: Add missing foreign key constraints
-- Ensures referential integrity between tables
-- Debt Item #9: Foreign key gaps

-- ============================================================================
-- Before adding FK constraints, verify no orphan rows exist
-- These queries should return 0 rows if data is clean
-- ============================================================================

-- Verify campaign_batch_metrics references valid campaigns
-- SELECT COUNT(*) FROM campaign_batch_metrics cbm
-- WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = cbm.campaign_id);

-- Verify campaign_trace_events references valid campaigns
-- SELECT COUNT(*) FROM campaign_trace_events cte
-- WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = cte.campaign_id);

-- ============================================================================
-- Clean up any orphan rows (if they exist)
-- ============================================================================
-- Delete campaign_batch_metrics rows with invalid campaign_id
DELETE FROM campaign_batch_metrics cbm
WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = cbm.campaign_id);

-- Delete campaign_trace_events rows with invalid campaign_id
DELETE FROM campaign_trace_events cte
WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = cte.campaign_id);

-- ============================================================================
-- Add foreign key constraints with cascading delete
-- When a campaign is deleted, related metrics and events are cleaned up
-- ============================================================================

-- FK: campaign_batch_metrics → campaigns
ALTER TABLE campaign_batch_metrics
ADD CONSTRAINT fk_campaign_batch_metrics_campaign_id
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

-- FK: campaign_trace_events → campaigns
ALTER TABLE campaign_trace_events
ADD CONSTRAINT fk_campaign_trace_events_campaign_id
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

-- ============================================================================
-- Verification (after migration)
-- ============================================================================
-- List all ForeignKey constraints:
-- SELECT * FROM information_schema.table_constraints
-- WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public' ORDER BY table_name;
