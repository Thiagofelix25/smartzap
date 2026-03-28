-- TD-2 AC1: Standardize all status values to English
-- Converts Portuguese status values to English equivalents
-- Critical path for TD-2: must complete before CHECK constraints (AC3)

-- ============================================================================
-- Step 1: campaigns.status — CRITICAL (used in many queries)
-- ============================================================================
-- Mapping: 'Rascunho' → 'DRAFT', 'Agendado' → 'SCHEDULED', 'Enviando' → 'SENDING',
--          'Concluído' → 'COMPLETED', 'Pausado' → 'PAUSED', 'Falhou' → 'FAILED', 'Cancelado' → 'CANCELLED'

UPDATE campaigns
SET status = CASE
    WHEN status = 'Rascunho' THEN 'DRAFT'
    WHEN status = 'Agendado' THEN 'SCHEDULED'
    WHEN status = 'Enviando' THEN 'SENDING'
    WHEN status = 'Concluído' THEN 'COMPLETED'
    WHEN status = 'Pausado' THEN 'PAUSED'
    WHEN status = 'Falhou' THEN 'FAILED'
    WHEN status = 'Cancelado' THEN 'CANCELLED'
    ELSE status
END
WHERE status IN ('Rascunho', 'Agendado', 'Enviando', 'Concluído', 'Pausado', 'Falhou', 'Cancelado');

-- Update any mixed-case variants that might exist
UPDATE campaigns
SET status = CASE
    WHEN LOWER(status) = 'enviando' AND status != 'SENDING' THEN 'SENDING'
    WHEN LOWER(status) = 'concluida' AND status != 'COMPLETED' THEN 'COMPLETED'
    WHEN LOWER(status) = 'concluído' AND status != 'COMPLETED' THEN 'COMPLETED'
    ELSE status
END
WHERE LOWER(status) IN ('enviando', 'concluida', 'concluído') AND status NOT IN ('SENDING', 'COMPLETED');

-- ============================================================================
-- Step 2: campaign_contacts.status
-- ============================================================================
-- Mapping: 'Pendente' → 'PENDING', 'Enviado' → 'SENT', 'Entregue' → 'DELIVERED',
--          'Lido' → 'READ', 'Ignorado' → 'SKIPPED', 'Falhou' → 'FAILED'

UPDATE campaign_contacts
SET status = CASE
    WHEN status = 'Pendente' THEN 'PENDING'
    WHEN status = 'Enviado' THEN 'SENT'
    WHEN status = 'Entregue' THEN 'DELIVERED'
    WHEN status = 'Lido' THEN 'READ'
    WHEN status = 'Ignorado' THEN 'SKIPPED'
    WHEN status = 'Falhou' THEN 'FAILED'
    ELSE status
END
WHERE status IN ('Pendente', 'Enviado', 'Entregue', 'Lido', 'Ignorado', 'Falhou');

-- ============================================================================
-- Step 3: contacts.opt_status (should already be English, but verify)
-- ============================================================================
-- Mapping: 'Desconhecido' → 'UNKNOWN', 'Suprimido' → 'SUPPRESSED'

UPDATE contacts
SET opt_status = CASE
    WHEN opt_status = 'Desconhecido' THEN 'UNKNOWN'
    WHEN opt_status = 'Suprimido' THEN 'SUPPRESSED'
    ELSE opt_status
END
WHERE opt_status IN ('Desconhecido', 'Suprimido');

-- ============================================================================
-- Step 4: Update function defaults if they reference old values
-- ============================================================================
-- The function update_campaigns_metrics_from_status uses CASE statements
-- that may need updating, but that's handled via new CHECK constraints

-- ============================================================================
-- Verification (comment these out after migration)
-- ============================================================================
-- SELECT DISTINCT status FROM campaigns ORDER BY status;
-- SELECT DISTINCT status FROM campaign_contacts ORDER BY status;
-- SELECT DISTINCT opt_status FROM contacts WHERE opt_status IS NOT NULL ORDER BY opt_status;
