# Bizi Dental Acquisition Demo — Build Plan

**Date:** 2026-09-06  
**Status:** Active working plan  
**Purpose:** Preserve the reusable acquisition-demo architecture, human-handoff design, package boundaries, and tonight's execution checklist without storing credentials or client secrets.

## Locked package correction

**Package 1 / Basic does not include a follow-up engine.** It may capture enquiries, appointment requests, staff attention and simple status/next-action fields, but it does not automatically schedule or send follow-up messages. Automated follow-up is Package 2+.

## Acquisition demo app V1

Build one small reusable sales demo rather than a Favfare-only interface.

### Patient side
- WhatsApp-style simulator backed by real demo workflows.
- Structured service/price lookup only.
- Contact capture: name, phone, email where relevant.
- Appointment request flow.
- Safe clinical escalation with no diagnosis/prescription.
- Visible human-handoff behavior.

### Staff side
- Overview: New Enquiries, Booking Requests, Needs Human.
- Enquiry list and detail view.
- Patient/service/booking state/summary/activity history.
- Take Over.
- Return to Assistant.
- Confirm/propose appointment in the Package 2 demo.
- No Basic follow-up engine.

### Demo controls
- Swap prospect clinic name/logo/config without rebuilding core.
- Synthetic data only.
- Seed Demo and Reset Demo.
- Presentation mode hides n8n, prompts, raw DB and secrets.

## Human handoff — locked design

The webhook **remains active during human takeover**. Every provider event may still arrive. Handoff is enforced with an early routing gate, not by disabling the webhook.

### Normalized event contract

```text
event_type: inbound_message | outbound_message | status | system
direction: inbound | outbound
external_message_id
channel
external_chat_id / conversation_key
sender_id
recipient_id
text
timestamp
provider metadata (minimal)
```

### Provider-adapter rules

- Meta Cloud: distinguish inbound `messages` from delivery/read `statuses`.
- Evolution-style providers: use event type plus `fromMe`/direction so business/staff outbound messages are never treated as patient inbound messages.
- Deduplicate using the provider's external message ID.

### Inbound routing order

1. Receive webhook.
2. Verify and normalize provider payload.
3. Ignore/log status, delivery, read and system events for conversational processing.
4. Determine direction; outbound business/staff events never enter assistant logic.
5. Deduplicate `external_message_id`.
6. Resolve contact + conversation by `channel + external_chat_id`.
7. Load conversation-control state.
8. If `mode = human` or `automation_paused = true`: persist/log patient inbound, update activity/unread state, **do not call AI and do not send an automated reply**.
9. If `mode = assistant`: run normal intent, source-of-truth, booking and response flow.
10. Log resulting activity.

### Take Over

```text
mode = human
automation_paused = true
attention_status = human_active
assigned_staff_id = acting staff when available
taken_over_at = now
log staff_takeover
```

While human mode is active, patient messages still hit the webhook and are stored; the bot is silent. Staff continues the conversation normally. Outbound staff/business events are direction-filtered before AI logic.

### Return to Assistant

```text
mode = assistant
automation_paused = false
attention_status = automated/resolved according to state
resumed_at = now
resume watermark = current message/time boundary
log assistant_resumed
```

Only a new eligible patient inbound message after the resume watermark should re-enter assistant processing.

### Race protection

- Unique external message IDs prevent webhook-retry duplicates.
- Check takeover state before AI generation.
- **Check takeover state again immediately before send.** If staff took over during generation, suppress the pending response.
- Provider outbound events are filtered before assistant logic.

## Reusable conversation state

Long-term, separate chat-control state from commercial enquiries with a `conversations` record.

Suggested fields:

```text
id
contact_id
channel
external_chat_id
mode: assistant | human | needs_human
automation_paused
assigned_staff_id
last_inbound_message_id
last_outbound_message_id
last_message_at
taken_over_at
resumed_at
created_at
updated_at
```

Unique key: `channel + external_chat_id`. Enquiries should reference `conversation_id`.

## Tonight checklist

- [x] Preserve tonight plan in Drive and GitHub.
- [x] Correct Package 1 documentation: no follow-up engine.
- [x] Lock/document webhook-safe human handoff design.
- [ ] Establish supported n8n management API access and verify against current Favfare workflow.
- [ ] Back up current live Favfare n8n workflow before changes.
- [ ] Preserve current Supabase migrations, Edge Function code and seed logic in version control.
- [ ] Add provider-neutral normalized message event contract.
- [ ] Add/prepare `conversations` state model and link to enquiries without breaking current demo.
- [ ] Implement inbound direction and event-type filtering.
- [ ] Implement message deduplication.
- [ ] Implement takeover gate before AI.
- [ ] Implement second pre-send takeover check.
- [ ] Implement Take Over staff action.
- [ ] Implement Return to Assistant with resume watermark.
- [ ] Test assistant → takeover → patient messages → no bot replies → staff talks → return → assistant resumes on next patient message.
- [ ] Test outbound staff/business webhook events never trigger assistant replies.
- [ ] Build generic acquisition-demo app shell.
- [ ] Build WhatsApp-style patient simulator.
- [ ] Build staff overview + enquiry list/detail.
- [ ] Wire Take Over / Return to Assistant into UI.
- [ ] Wire real price/enquiry flow.
- [ ] Wire Package 2 appointment request/availability flow.
- [ ] Wire clinical escalation / Needs Human flow.
- [ ] Add prospect branding/config layer.
- [ ] Add Seed Demo / Reset Demo.
- [ ] Add feature flags with `follow_up_engine = false` for Basic.
- [ ] Run end-to-end acceptance tests.
- [ ] Update Drive source-of-truth docs with final implementation decisions.
- [ ] Commit sanitized workflow backups/code/docs; never commit secrets.
- [ ] Decide deployment target and publish only with explicit approval if external publishing is required.

## Handoff acceptance test

PASS only when all are true:

- Assistant replies while conversation mode is assistant.
- Take Over changes state immediately.
- Subsequent patient inbound messages are stored with zero bot replies.
- Staff/business outbound provider events cannot re-enter AI logic.
- Return to Assistant is deliberate and logged.
- Only a new patient inbound after resume can restart assistant processing.
- Duplicate webhook delivery cannot create duplicate assistant replies.
- A takeover occurring while AI is generating suppresses the pending response.

## Acquisition positioning

This is not sold as a generic chatbot. The demo should prove patient enquiry handling, structured lead capture, safe booking requests, human takeover and a simple staff operating surface. Package 1 is the lower-cost assistant + enquiry option. Package 2 adds branded CRM, availability/booking controls and the follow-up engine.
