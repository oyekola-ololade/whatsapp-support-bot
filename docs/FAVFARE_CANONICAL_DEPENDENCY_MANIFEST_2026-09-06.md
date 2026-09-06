# Favfare Canonical Dependency Manifest

**Date:** 2026-09-06  
**Status:** Sanitized architecture checkpoint  
**Purpose:** Record which live demo workflows are actually connected before handoff/persistence changes. No credentials, API keys, secret values, database passwords, or private deployment identifiers are included.

## Canonical patient path

```text
GET /webhook/favfare-demo/patient
  -> Patient Simulator
  -> POST /webhook/favfare-demo/patient-action-v9
  -> Patient Conversation V9
  -> server-side assistant / structured-data gateway
```

The Patient Simulator explicitly targets `patient-action-v9`, so **Patient Conversation V9 is the canonical conversation workflow currently used by the patient entry point**. Historical V2-V8 workflows should not be modified or deleted until recovery and dependency inspection are complete.

## Canonical staff path

```text
GET /webhook/favfare-demo/crm-ui-v2
  -> CRM UI V2
  -> POST /webhook/favfare-demo/crm
  -> CRM Backend
  -> server-side Favfare CRM function
```

The current patient simulator links directly to CRM UI V2.

## Existing handoff surface

CRM UI V2 already contains staff controls for:

- Take Over conversation
- Return to Assistant
- Mark contacted
- Approve booking request
- Close enquiry
- viewing whether automation is paused

Therefore the next handoff task is **backend enforcement**, not simply adding buttons. We must verify that the canonical patient-processing path:

1. reads takeover / automation-paused state before AI processing;
2. stores patient inbound messages while human mode is active without replying;
3. filters staff/business outbound provider events before assistant logic;
4. rechecks takeover state immediately before an automated send;
5. resumes only on a new eligible patient message after explicit return to assistant.

## Preservation rule

The current n8n instance has a known persistence risk, so the main service must not be intentionally redeployed until workflow recovery is durable and the persistence path is validated.

A private recovery manifest with exact workflow identifiers and the protected API-backup checkpoint is stored in the project Drive. This public repository intentionally contains only the sanitized dependency representation.

## Next implementation sequence

1. Preserve the current Supabase schema, Edge Functions and seed/config logic.
2. Inspect the current `staff_action` implementation and patient assistant path for `automation_paused` enforcement.
3. Add normalized provider event direction/type handling.
4. Add deduplication and conversation state where current implementation is insufficient.
5. Implement/verify the pre-AI and pre-send handoff gates.
6. Run the full assistant -> takeover -> human -> return -> assistant acceptance test.
