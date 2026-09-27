# Bizi Systems Technical Archive Manifest — 2026-09-27

## Purpose

This manifest records the preservation boundary before cleanup of the legacy Railway project `Bizi_Systems_Web_App`.

**Deletion gate:** no service or source is removed until its owned code is preserved, its technical documentation is captured, and any customer-facing demo has a verified recording or replacement demo URL.

## Frozen Git restore points

- `oyekola-ololade/bizi-web`
  - Archive branch: `archive/pre-cleanup-2026-09-27`
  - Purpose: immutable restore point for the current public website source.
- `oyekola-ololade/whatsapp-support-bot`
  - Archive branch: `archive/pre-cleanup-2026-09-27`
  - Purpose: immutable restore point for the current demo/gateway monorepo.
- `oyekola-ololade/whatsapp-support-bot`
  - Archive branch: `archive/favfare-controller-2026-09-27`
  - Source ref: `favfare-controller`
  - Purpose: preserve Favfare controller/workflow state separately.

## Current public-website dependency boundary

Production website service:
- Railway project: `Bizi_Systems_Web_App`
- Service: `bizi-systems-site`
- Service ID: `3eae3f85-48a6-45e0-9e71-7d7c16fb2692`
- Source: `oyekola-ololade/bizi-web` / `main`
- Public domains: `bizisystems.com.ng`, `www.bizisystems.com.ng`

The source-controlled website is configured to use:
- Bizi OS at `https://bizi-os-production.up.railway.app`
- Dental demo route `/demo/dental` -> `https://bizi-dentist-demo-production.up.railway.app/`

Therefore the production website and the currently linked Dental demo must remain reachable until the Dental demo is moved or the website route is updated.

## Standalone technical repositories to create

These repositories should be created private first, populated and sanitized, then selectively made public for portfolio use.

### Demo repositories

1. `bizi-dental-care-demo`
   - Current source: `whatsapp-support-bot/bizi-dentist-care-demo`
   - Railway service: `bizi-dentist-demo`
   - Status: source-controlled and recoverable.
   - Recording required: yes.

2. `bizi-real-estate-care-demo`
   - Current source: `whatsapp-support-bot/bizi-real-estate-care-demo`
   - Railway service: `bizi-real-estate-demo`
   - Latest preserved Railway deployment snapshot observed: `906108ae-3739-4135-9d26-279a3c8372db`
   - Status: source-controlled and recoverable.
   - Recording required: yes.

3. `bizi-aesthetic-care-demo`
   - Railway service: `bizi-aesthetic-care-demo`
   - Latest preserved Railway deployment snapshot observed: `d787e2a4-8619-4329-94cc-b211662d32c2`
   - Runtime package observed: `bizi-aesthetic-care-demo@1.0.0`, `node server.mjs`
   - Status: Railway-uploaded source; no matching Git source located yet.
   - Recording required: yes.
   - **Do not delete service until source recovery is complete.**

4. `bizi-logistics-care-demo`
   - Railway service: `bizi-logistics-care-demo`
   - Latest preserved Railway deployment snapshot observed: `3e019657-2979-4c23-bb54-41b445fa953e`
   - Runtime: Node / `npm run start`.
   - Status: Railway-uploaded source; no matching Git source located yet.
   - Recording required: yes.
   - **Do not delete service until source recovery is complete.**

5. `bizi-hospitality-care-demo`
   - Railway service: `bizi-hospitality-care-demo`
   - Latest preserved Railway deployment snapshot observed: `6cf5811c-9e48-4f45-b5df-07b9528af0e2`
   - Runtime package observed: `bizi-hospitality-care-demo@1.0.0`, `node server.mjs`
   - Status: Railway-uploaded source; no matching Git source located yet.
   - Recording required: yes.
   - **Do not delete service until source recovery is complete.**

6. `bizi-demo-platform`
   - Current source: `whatsapp-support-bot/bizi-demo-web`
   - Railway service: `bizi-demo-web`
   - Status: source-controlled and recoverable.
   - Recording required: yes if retained as portfolio evidence.

### Integration / automation repositories

7. `bizi-whatsapp-gateway`
   - Current source: `whatsapp-support-bot/bizi-whatsapp-gateway`
   - Railway services: `bizi-whatsapp-gateway`, `bizi-whatsapp-gateway-v2`
   - Both legacy Railway services are currently configured as disabled duplicates.
   - Preserve source and architecture notes; do not publish secrets.

8. `bizi-meta-whatsapp-gateway`
   - Current source: `whatsapp-support-bot/bizi-meta-whatsapp-gateway`
   - Railway service: `bizi-meta-whatsapp-gateway`
   - Preserve source and environment-variable contract; never copy live access tokens into Git.

9. `bizi-favfare-automation-controller`
   - Current source: `whatsapp-support-bot` branch `favfare-controller`, directory `favfare-controller`
   - Includes controller code, CRM/patient UI assets and n8n workflow JSON files.
   - Railway services associated with the legacy implementation include `favfare-n8n-controller`, `favfare-mobile-sync`, helper patch/test services and the old n8n instance.
   - Preserve workflow JSON and source; do not copy runtime secrets.

## Infrastructure-only legacy services

The following are third-party/container infrastructure rather than original application source:
- `evolution-api`
- `evolution-redis`
- `evolution-postgres`
- `n8n`

The active Bizi OS Railway project has its own Evolution API / Redis / Postgres services. The legacy website-project copies should only be deleted after dependency verification.

The legacy n8n service has a persistent volume. **Export current workflows before deleting it.** Workflow definitions count as code/configuration for this archive.

## One-shot / operational helper services

Preserve their configuration/script logic in the technical archive before deletion:
- `favfare-mobile-patcher`
- `bizi-n8n-manager-v2`

These are operational utilities, not portfolio demos.

## Preview / duplicate services

Candidates for deletion after verification:
- `bizi-web-batch5-preview`
- legacy `bizi-interactive-demos` service in the old website project
- disabled duplicate WhatsApp gateway services

A separate Railway project named `bizi-interactive-demos` exists and must not be confused with the stale service of the same name inside `Bizi_Systems_Web_App`.

## Technical showcase standard

Each standalone repository should contain:
- clear project problem and use case
- architecture overview
- stack and service boundaries
- local setup
- environment-variable contract using placeholders only
- data-flow / request-flow explanation
- security and failure-mode notes
- screenshots
- demo video
- current status and limitations
- explicit note when demo data is synthetic/sample
- no invented users, revenue, ROI, testimonials or production claims

## Final deletion gate

Before deleting any legacy Railway service:

1. Source/code/config preserved.
2. New repository exists and is readable.
3. README and architecture notes exist.
4. Demo video exists for customer-facing demos.
5. Current public website dependency checked.
6. n8n workflow export completed where applicable.
7. Any persistent data that still matters has a backup or is explicitly confirmed disposable.
8. Replacement URL is in place for anything linked from the website.
9. Service is verified non-required.
10. Only then delete and verify the remaining website still passes health and public-route checks.
