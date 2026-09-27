# Bizi WhatsApp Gateway — Technical Showcase

## What it is
An Evolution API -> Bizi Core WhatsApp gateway with channel resolution, inbound processing, outbound recording, duplicate-safe message handling, dry-run support and device-linking UX.

## Source
`bizi-whatsapp-gateway/`

## Runtime
- Node.js >=20
- PostgreSQL client dependency
- `runtime-bootstrap.mjs`
- `server.mjs`

## Environment contract
Values must never be committed:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_DATABASE_URL`
- `BIZI_CORE_URL`
- `BIZI_CORE_KEY`
- `WEBHOOK_SHARED_SECRET`
- `EVOLUTION_INSTANCE_ID`
- `WEBHOOK_URL`
- `INSTANCE_NAME`
- `LINK_ACCESS_TOKEN`
- `QR_ACCESS_TOKEN`
- `DEFAULT_COUNTRY_CODE`
- `GLOBAL_DRY_RUN`

## Architecture
Evolution webhook -> event normalization -> Bizi Core router -> Bizi Core WhatsApp processor -> optional outbound send -> outbound event recording.

The gateway also exposes controlled WhatsApp linking flows for pairing code / QR and a health endpoint.

## Technical points
- provider event normalization
- channel/tenant resolution
- group/status/from-me filtering
- dry-run path for safe tests
- outbound event recording
- duplicate-safe self-test behavior
- device pairing flow
- secrets stay server-side

## Recording
A technical recording should use dry-run/test mode only. Show health, event flow, routing decision and recorded outbound result. Do not display tokens, QR secrets, customer messages or live credentials.
