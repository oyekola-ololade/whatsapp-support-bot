# Bizi Core

Bizi Core is the reusable multi-client runtime underneath the client-specific adapters in this repository.

## Current architecture

Client adapter (for example Favfare web chat / CRM / WhatsApp)
→ Bizi Core router
→ Bizi Core assistant / booking / CRM services
→ tenant-scoped Supabase data

The client-facing adapter is allowed to contain channel-specific presentation and endpoint paths, but business data and operational logic belong in Bizi Core.

## Tenant boundary

Every operational record is scoped by `client_key`. Current scoped tables include:

- services
- service_sales_metadata
- faq_items
- clinic_settings
- availability_rules
- blocked_dates
- contacts
- enquiries
- appointments
- activities
- conversation_sessions
- staff_profiles

`bizi_clients` stores non-secret client configuration. `bizi_channels` maps external channel identities (for example an Evolution API WhatsApp instance) to a client.

Uniqueness is client-aware for service names/slugs, WhatsApp IDs, clinic-setting keys, availability rules and conversation sessions.

## Deployed core services

- `bizi-core-assistant` — natural-language receptionist logic, catalogue grounding, memory and human-handoff suppression.
- `bizi-core-data` — catalogue, availability, contact/enquiry capture and booking.
- `bizi-core-booking-intake` — validated patient details plus calendar generation.
- `bizi-core-crm` — tenant-scoped CRM reads and staff actions.
- `bizi-core-router` — resolves provider/channel instance → client configuration.

All public core functions use server-side custom-key authentication. They are not intended to be called directly from public client browsers.

## Favfare status

Favfare is client key `favfare` and is now an adapter on top of Bizi Core.

The Favfare V9 patient flow routes assistant, catalogue, intake and booking operations through Bizi Core. The Favfare CRM backend routes through `bizi-core-crm`. The public Favfare adapters overwrite any incoming tenant selector with `favfare`, preventing a browser/user from switching tenants.

The CRM UI loads branding and clinic identity from `client_config` rather than hardcoding the client name in its operational logic. Mobile navigation is top-mounted; there is no bottom navigation.

## New-client onboarding model

1. Create a `bizi_clients` row.
2. Import that client's services, FAQs, clinic settings and availability rules with its `client_key`.
3. Add one or more `bizi_channels` rows for web chat, WhatsApp or other channels.
4. Create a thin client adapter that fixes `client_key` server-side and points to Bizi Core.
5. Apply client branding/presentation in the adapter.
6. Run tenant-isolation, booking, handoff and CRM tests before connecting the live channel.

No client should require a fork of the core business logic.

## Verified invariants

- Favfare V9 still quotes server-backed prices and creates client-scoped enquiries.
- CRM take-over sets `automation_paused=true` and suppresses assistant output.
- Return-to-assistant restores automated replies.
- A second synthetic tenant can use the same service slug, clinic-setting key, WhatsApp ID and session ID without colliding with Favfare. The synthetic rows were rolled back after the test.
