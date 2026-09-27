# Bizi Systems Web Railway Cleanup Matrix — 2026-09-27

Project: `Bizi_Systems_Web_App`  
Project ID: `27c49f11-8284-4815-b4a6-a55017ea51b5`

## KEEP

### bizi-systems-site
- Production public website.
- Source: `oyekola-ololade/bizi-web` / `main`.
- Custom domains: `bizisystems.com.ng`, `www.bizisystems.com.ng`.
- **Keep.**

## KEEP UNTIL REPLACEMENT URL IS VERIFIED

### bizi-dentist-demo
- Current website route `/demo/dental` redirects to this service.
- Source is preserved under `whatsapp-support-bot/bizi-dentist-care-demo`.
- New standalone repo and recording still required.
- **Do not delete until the replacement deployment/URL is live and the website route is updated and verified.**

## BLOCKED FROM DELETION — SOURCE RECOVERY REQUIRED

### bizi-aesthetic-care-demo
- Railway-uploaded Node project.
- No matching Git/Drive/conversation source recovered.
- Preserve deployment snapshot and record live demo.
- **Blocked.**

### bizi-logistics-care-demo
- Railway-uploaded Node project.
- No matching Git/Drive/conversation source recovered.
- Preserve deployment snapshot and record live demo.
- **Blocked.**

### bizi-hospitality-care-demo
- Railway-uploaded Node project.
- No matching Git/Drive/conversation source recovered.
- Preserve deployment snapshot and record live demo.
- **Blocked.**

## BLOCKED FROM DELETION — WORKFLOW EXPORT GAP

### n8n
- Third-party runtime, but persistent volume contains user-owned workflow state.
- Source-controlled Favfare branch preserves most workflow definitions.
- Historical inventory contains one workflow not yet matched to a Git file: `Favfare Demo — Price Quote + Enquiry Capture`.
- **Do not delete until final workflow export/reconciliation is complete.**

## ARCHIVE / REPO / RECORD, THEN DELETE

### bizi-real-estate-demo
- Source recovered: `whatsapp-support-bot/bizi-real-estate-care-demo`.
- New standalone repo + demo video required.

### bizi-demo-web
- Source recovered: `whatsapp-support-bot/bizi-demo-web`.
- Move to `bizi-demo-platform`.
- Technical demo recording recommended.

### bizi-meta-whatsapp-gateway
- Source recovered: `whatsapp-support-bot/bizi-meta-whatsapp-gateway`.
- Move to standalone private technical repo.
- Do not copy secrets.

### bizi-whatsapp-gateway
- Source recovered: `whatsapp-support-bot/bizi-whatsapp-gateway`.
- Legacy service is disabled.
- Move source to standalone private technical repo.

### bizi-whatsapp-gateway-v2
- Same source root as the legacy gateway.
- Configured as a disabled duplicate.
- Delete after standalone gateway repo is verified.

### favfare-n8n-controller
- Source recovered on `favfare-controller` branch.
- Includes workflow-as-code controller and workflow JSON files.
- Move to `bizi-favfare-automation-controller`.

### favfare-mobile-sync
- Source recovered from `favfare-controller`.
- Archive with Favfare controller.

### favfare-mobile-patcher
- Inline Railway script/config preserved at:
  `docs/archive/FAVFARE_MOBILE_PATCHER_RAILWAY_CONFIG_2026-09-27.json`
- Operational helper, not a standalone portfolio demo.

### bizi-n8n-manager-v2
- Operational helper only.
- Preserve configuration/rollback metadata with the automation archive.
- Delete after n8n reconciliation.

### evolution-api
### evolution-redis
### evolution-postgres
- Legacy website-project infrastructure.
- Active Bizi OS project has a separate Evolution API / Redis / Postgres stack.
- Container images are third-party, not original application source.
- Delete only after final dependency check confirms no legacy caller remains.

## PREVIEW / STALE SERVICES — DELETE AFTER FINAL WEBSITE CHECK

### bizi-web-batch5-preview
- Same website source line; not production.
- Archive branch already exists.
- Candidate for deletion after production website verification.

### bizi-interactive-demos
- Legacy service inside the old website project.
- No active source/deployment evidence found during preservation inventory.
- A separate Railway project named `bizi-interactive-demos` exists.
- Candidate for deletion after confirming no domain/link references it.

## REQUIRED BEFORE ANY DELETE WAVE

- [x] Freeze `bizi-web` source branch.
- [x] Freeze `whatsapp-support-bot` source branch.
- [x] Freeze `favfare-controller` branch.
- [x] Create canonical archive manifest.
- [x] Preserve inline Favfare patcher code/config.
- [x] Prepare technical-showcase docs and recording runbook.
- [ ] Create standalone GitHub repos.
- [ ] Populate repos and verify file parity.
- [ ] Recover Aesthetic source.
- [ ] Recover Logistics source.
- [ ] Recover Hospitality source.
- [ ] Reconcile/export final n8n workflow gap.
- [ ] Record customer-facing demo videos.
- [ ] Move Dental demo to preserved replacement URL or retain service.
- [ ] Update/verify website Dental route if moved.
- [ ] Run production website health/routes after cleanup.
- [ ] Only then remove eligible Railway services.
