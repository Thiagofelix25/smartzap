-- TD-2 AC3: Add CHECK constraints to enforce valid status values
-- Must be applied AFTER AC1 (standardize_status_english) completes
-- Ensures data integrity at the database level

-- ============================================================================
-- campaigns.status — Valid status values from CampaignStatus enum
-- ============================================================================
ALTER TABLE campaigns
ADD CONSTRAINT check_campaigns_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'FAILED', 'CANCELLED'));

-- ============================================================================
-- campaign_contacts.status — Valid status values from MessageStatus enum
-- ============================================================================
ALTER TABLE campaign_contacts
ADD CONSTRAINT check_campaign_contacts_status CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'SKIPPED', 'FAILED'));

-- ============================================================================
-- contacts.opt_status — Valid status values from ContactStatus enum
-- ============================================================================
ALTER TABLE contacts
ADD CONSTRAINT check_contacts_opt_status CHECK (opt_status IN ('OPT_IN', 'OPT_OUT', 'UNKNOWN', 'SUPPRESSED'));

-- ============================================================================
-- templates.status — Valid status values
-- ============================================================================
ALTER TABLE templates
ADD CONSTRAINT check_templates_status CHECK (status IN ('DRAFT', 'APPROVED', 'PENDING', 'REJECTED'));

-- ============================================================================
-- flows.status — Valid status values (inferred from usage)
-- ============================================================================
ALTER TABLE flows
ADD CONSTRAINT check_flows_status CHECK (status IN ('draft', 'active', 'archived', 'DRAFT', 'ACTIVE', 'ARCHIVED'));

-- ============================================================================
-- Counter columns — must be non-negative
-- ============================================================================
ALTER TABLE campaigns
ADD CONSTRAINT check_campaigns_sent_count CHECK (sent >= 0),
ADD CONSTRAINT check_campaigns_delivered_count CHECK (delivered >= 0),
ADD CONSTRAINT check_campaigns_read_count CHECK (read >= 0),
ADD CONSTRAINT check_campaigns_failed_count CHECK (failed >= 0),
ADD CONSTRAINT check_campaigns_skipped_count CHECK (skipped >= 0);

ALTER TABLE campaign_contacts
ADD CONSTRAINT check_campaign_contacts_sent_count CHECK (sent >= 0),
ADD CONSTRAINT check_campaign_contacts_delivered_count CHECK (delivered >= 0),
ADD CONSTRAINT check_campaign_contacts_read_count CHECK (read >= 0);

-- ============================================================================
-- Verification (after migration)
-- ============================================================================
-- Check constraints: SELECT * FROM information_schema.check_constraints WHERE constraint_schema = 'public' ORDER BY table_name, constraint_name;
