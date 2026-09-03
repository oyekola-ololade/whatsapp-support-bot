# Template Status & Verification

**Classification:** Configurable n8n template asset — not a verified production deployment.

The workflow export and documentation are inspectable template evidence. They do not prove a configured production support bot, support-quality guarantee, SLA, ROI, or client outcome.

## Verification gate
1. Parse/import into a clean current n8n instance.
2. Inspect inbound-message normalization, FAQ/AI/tool logic, escalation/handoff rules, branches, expressions, and Code nodes.
3. Replace placeholder WhatsApp/provider credentials, knowledge sources, model IDs, admin destinations, URLs, webhooks, and resource references.
4. Run known-question, unknown-question, explicit-human-request, malformed-input, AI/tool failure, messaging failure, and replay cases.
5. Verify unsupported/uncertain questions do not produce invented answers and human escalation remains available.
6. Record configured test date/result.

## Security
Never commit messaging tokens, customer phone/message PII, private knowledge-base URLs, model credentials, or production webhooks. Use synthetic conversations and test credentials.

## Change record
- **2026-09-03:** Added repository verification/security/status control. No workflow-logic change or runtime pass is implied.
