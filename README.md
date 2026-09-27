# Bizi Demo Platform — Technical Showcase

## What it is
A reusable Node-based interactive demo shell that connects customer-facing demo views to Bizi Core service boundaries.

## Source
`bizi-demo-web/`

## Runtime
- Node.js >=20
- secure wrapper: `secure-wrapper.mjs`
- app server: `server.mjs`
- Railway

## Environment contract
Placeholders only:
- `BIZI_CORE_URL`
- `BIZI_CORE_KEY`
- `GROQ_API_KEY`
- `CLIENT_KEY`
- `DEMO_PACKAGE`
- `PORT`

## Main routes
- `/`
- `/patient`
- `/crm`
- `/health`
- `/api/config`
- `/api/overview`
- `/api/enquiries`
- `/api/catalogue`
- `/api/detail`
- `/api/action`
- `/api/reset`
- `/api/chat`

## Architecture
Browser demo -> Node server -> authenticated Bizi Core functions.

Observed Bizi Core boundaries include assistant, CRM, data and demo-admin services. The server owns the public/demo boundary so browser code does not receive the Bizi Core key.

## Engineering points worth showing
- server-side credential boundary
- patient and staff views from one demo shell
- explicit API surface
- resettable synthetic demo state
- tenant/client-key driven configuration
- deployable as a standalone service

## Recording
1. open patient surface
2. run one enquiry
3. switch to CRM/staff surface
4. show structured enquiry/context
5. show a staff action
6. briefly show architecture diagram and route boundary
