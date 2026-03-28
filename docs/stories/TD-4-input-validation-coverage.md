# TD-4: Input Validation Systematic Coverage

**Epic:** EPIC-TD (SmartZap Technical Debt Remediation)
**Sprint:** Week 3-4
**Status:** Draft
**Effort:** 8-12 hours
**Priority:** HIGH
**Debt Items Covered:** #14/#31 (Input Validation Gap)
**Dependencies:** SHOULD start after TD-3 (same routes are affected; auth audit provides the route inventory)

---

## Description

Only 21% of API routes (44 of 209) have Zod input validation. This story systematically adds validation schemas to all routes that accept user input, prioritizing webhook routes (accept any JSON), debug routes, and internal utilities. Items #14 and #31 are the same finding listed in both Backend and Security categories.

---

## Acceptance Criteria

### AC1: Audit Routes Missing Validation — 2h
- [ ] Using route inventory from TD-3 (or create if TD-3 not done yet), classify each POST/PUT/PATCH/DELETE route:
  - `VALIDATED` — already has Zod schema
  - `NEEDS_VALIDATION` — accepts body/params without validation
  - `NO_INPUT` — GET-only or no user input
- [ ] Prioritize by risk:
  - P1: Webhook routes (accept external JSON)
  - P2: Routes that write to database
  - P3: Routes that trigger external API calls (WhatsApp, QStash)
  - P4: Debug/utility routes
- [ ] Document audit results in the story (update File List)

### AC2: Create Shared Validation Schemas — 2h
- [ ] Create `lib/schemas/` directory for shared Zod schemas (if not exists)
- [ ] Define reusable schemas for common entities:
  - `ContactSchema` (phone validation using existing `validatePhoneNumber`)
  - `CampaignInputSchema` (name, template, contacts)
  - `TemplateParamsSchema` (component parameters)
  - `WebhookPayloadSchema` (Meta webhook structure)
  - `PaginationSchema` (page, limit, offset)
- [ ] Export all schemas with TypeScript inferred types (`z.infer<typeof Schema>`)

### AC3: Apply Validation to P1 Routes (Webhooks) — 2-3h
- [ ] Add Zod validation to `/api/webhook` route(s)
- [ ] Add Zod validation to any QStash callback routes
- [ ] Ensure invalid payloads return 400 with clear error messages
- [ ] Test: malformed webhook payload returns 400, not 500
- [ ] Test: valid webhook payload processes normally

### AC4: Apply Validation to P2-P3 Routes (DB writes + external API) — 3-4h
- [ ] Add Zod validation to all routes that write to database without existing validation
- [ ] Add Zod validation to routes that call WhatsApp API
- [ ] Use consistent error response format:
  ```json
  { "error": "Validation failed", "details": [...zodErrors] }
  ```
- [ ] Test: invalid input to each route returns 400 with specific field errors
- [ ] Verify existing validated routes follow the same pattern (consistency)

### AC5: Validation Coverage Metric — 30 min
- [ ] After implementation, re-count validated routes
- [ ] Target: 80%+ of routes with user input have Zod validation
- [ ] Document final coverage percentage in story completion notes

---

## Technical Notes

- Follow existing validation pattern from `app/api/campaigns/route.ts` (Zod + try/catch + ZodError handling)
- Do NOT use middleware for validation — keep it per-route (consistent with existing pattern)
- Webhook routes may need lenient validation (log unknown fields, don't reject) to avoid breaking Meta callbacks
- Use `z.passthrough()` for webhook schemas that may receive new fields from Meta
- Shared schemas in `lib/schemas/` should import from `types.ts` for enum values

---

## File List

_Updated during implementation_

| File | Action |
|------|--------|
| | |
