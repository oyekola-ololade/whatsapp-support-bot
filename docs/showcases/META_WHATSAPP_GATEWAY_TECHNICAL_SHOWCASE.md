# Bizi Meta WhatsApp Gateway — Technical Showcase

## What it is
A direct Meta WhatsApp Cloud API gateway that connects signed Meta webhook events to Bizi Core routing and WhatsApp processing.

## Source
`bizi-meta-whatsapp-gateway/`

## Runtime
- Node.js >=20
- `node server.mjs`

## Public routes
- `/health`
- `/webhook/meta`

## Environment contract
Never commit values:
- `BIZI_CORE_URL`
- `BIZI_CORE_KEY`
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_WABA_ID`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_REQUIRE_SIGNATURE`
- `META_GRAPH_VERSION`

## Architecture
Meta webhook -> verification/signature boundary -> Bizi Core router -> Bizi Core WhatsApp processing -> Meta send path -> Bizi Core outbound recording.

## Technical points
- webhook verification
- optional signature enforcement
- server-side Meta credentials
- tenant/channel resolution through Bizi Core
- provider-independent core processing
- health endpoint and test-recipient support

## Recording
Use synthetic/test events only. Show webhook architecture and verification behavior without exposing tokens or real customer payloads.
