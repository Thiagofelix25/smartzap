-- TD-2 AC4: Clean up orphaned/unused database function
-- Debt Item #8: Unused trigger that may be causing confusion

-- ============================================================================
-- Drop unused function that was referenced by trigger
-- This function is no longer used in the metrics calculation
-- ============================================================================
DROP FUNCTION IF EXISTS update_campaign_dispatch_metrics() CASCADE;

-- ============================================================================
-- Verification (after migration)
-- ============================================================================
-- Verify removal: SELECT * FROM pg_proc WHERE proname = 'update_campaign_dispatch_metrics';
-- Should return empty result
