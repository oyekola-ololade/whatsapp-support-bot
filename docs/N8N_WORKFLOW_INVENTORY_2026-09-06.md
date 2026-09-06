# Favfare n8n Workflow Inventory — 2026-09-06

The n8n Public API was verified successfully through the Railway helper using the stored `N8N_API_KEY` (HTTP 200). This file preserves the workflow inventory discovered before cleanup or architecture changes.

## Active workflows

| Workflow | ID | Active version |
|---|---|---|
| Favfare Demo — Patient Conversation V2 | `LZzrQeQp3zxlUS1w` | `a5856912-d80b-45a9-a3a8-866e56d85293` |
| Favfare Demo — Patient Conversation V3 | `zgW9EuyMqxytQIum` | `e967020b-50cf-4c5d-9bab-050f9f1c0dc6` |
| Favfare Demo — Patient Conversation V4 | `rXnGQiWgwXY54yZC` | `4e5c9991-2370-4249-aece-bc23edc22f3e` |
| Favfare Demo — Patient Conversation V5 | `0ivwxo1ZK3HpEgdt` | `27ff3f49-9bbf-457a-b7e2-24afc96b4fca` |
| Favfare Demo — Patient Conversation V6 | `U8hOpeiSsW4CRARz` | `f5a96ddf-4bcb-4179-acf1-19d1fb2c63db` |
| Favfare Demo — Patient Conversation V7 | `jrgds0UdCuSNJd2e` | `efb7d182-08b1-46f5-ac10-5b3cc62e63f0` |
| Favfare Demo — Patient Conversation V8 | `wYJlkT5BoFWXxpin` | `06308901-7f36-43e1-9dc1-8c2be52c635f` |
| Favfare Demo — Patient Conversation V9 | `mE54hqNzcdpuFNsu` | `dd148add-7ee1-49f1-907b-ea9a6137001c` |
| Favfare Demo — CRM UI | `lWiWl0udrQX9JDtg` | `0ad07135-7fc9-48f7-97ee-c4cdba6a1784` |
| Favfare Demo — CRM UI V2 | `Uw2MJLXb61ZP7hQd` | `93fed27f-114c-43c7-9402-1a63278b1042` |
| Favfare Demo — CRM Backend | `mgyVTQfGgr6yG2pw` | `97cd2117-dbe6-4722-a289-5a2ada5cd36c` |
| Favfare Demo — Patient Simulator | `gXTo1gbaAs93Jtv7` | `067321eb-5d52-4018-b457-0ede6e0e990e` |
| Favfare Demo — Patient Simulator Actions | `OshHkcPIK5LYlMkt` | `92e61ae5-ba65-431a-86f7-fa9316a797d6` |
| Favfare Demo — Availability + Booking Request | `34ab2CXwTYWFzOuX` | `2029dc25-967b-45c4-ad07-0935e2403b98` |
| Favfare Demo — Patient Booking Status | `6IdnChlhE5jEdQy0` | `968b96be-024f-40e2-b72f-87a4209ff6f6` |
| Favfare Demo — Price Quote + Enquiry Capture | `osDn0JFfuPo9oGI1` | `f5ff290f-be64-4572-8b14-d8b22ce06afd` |

## Preservation rule

Do not delete, deactivate, or overwrite the historical Patient Conversation workflows until:

1. the current V9 dependency graph is inspected;
2. simulator / CRM references are identified;
3. the current implementation workflow set has been exported and committed;
4. an acceptance test confirms the consolidated replacement works.

The multiple active V2–V9 workflows are technical debt, but they are also recoverable evidence of the current demo state. Cleanup comes after backup.

No API keys, passwords, credentials or secret environment-variable values are stored in this inventory.
