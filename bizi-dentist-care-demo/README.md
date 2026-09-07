# Bizi Dentist Care Demo

Interactive sales demo for the three Bizi Systems dental Care packages.

## Business enquiries

The persistent Contact Us button opens a separate Bizi Systems enquiry form. Finishing the guided tour brings visitors to “Want this for your clinic?”, with form and direct chat options. Both routes use business WhatsApp +2347074396136. Form details are composed into a WhatsApp message; the visitor must tap Send in WhatsApp. The form does not save leads into the synthetic patient CRM or claim delivery. No patient or staff handlers are replaced by this feature. A small tooth mark accompanies the Bizi Systems heading.

## Live demo

https://bizi-dentist-demo-production.up.railway.app/

## What the demo proves

This is not positioned as only a chatbot. The demo shows a patient-operations workflow where enquiries become structured work for clinic staff.

- Patient questions and service/pricing enquiries
- Appointment request / booking state
- Structured patient context
- Staff CRM / operations workspace
- Human takeover and return-to-assistant flow
- Follow-up actions
- Care 3 website intake into the same staff system
- Clinic-specific branding and synthetic demo tenants

## Care packages

### Care 1 — Essential
**Never miss another patient enquiry.**

Patient Assistant + Simple Enquiry Table.

Approx. ₦160k setup + approx. ₦40k/month managed.

Includes approved answers, enquiry capture, appointment-request capture, lightweight staff visibility and human handoff.

### Care 2 — Operations
**Your front desk, without the chaos.**

Patient Assistant + Enquiry CRM.

Approx. ₦300k setup + approx. ₦70k/month managed.

Adds the branded multi-page staff CRM, availability-aware booking, patient directory, follow-up workflow, activity context and structured staff actions.

### Care 3 — Custom
**Your clinic. Fully automated.**

Custom Clinic Operations Platform.

Custom quote after discovery.

Extends the Care 2 foundation with the generated clinic website, unified intake concept, additional approved channels, clinic-specific routing and custom operational modules.

## Final review status — 2026-09-07

The final reviewed deployment passed the user-led end-to-end walkthrough for the launch build.

Verified:

- Care selection and personalisation are separate screens.
- The homepage exposes the Care choices first; personalisation is a separate routed state with the selected package preselected.
- Patient chat works across tested Care levels.
- Reset chat is visible and functional.
- Staff experience is visually separated from the public website.
- Selected clinic colour propagates into the staff experience closely enough for launch use.
- Patient, Assistant and Clinic Staff messages are visually distinguishable.
- Human takeover no longer freezes the UI.
- Staff can reply while assistant automation is paused.
- Patient can continue replying while staff remains in control.
- Staff can return control to the assistant.
- Care 3 website enquiry submits successfully.
- Phone / WhatsApp number is included on the website form.
- Website enquiries appear in the staff workspace.
- Website-only leads use **Contact patient**, rather than **Take over conversation**.
- Care 3 Unified intake remains the first staff-side differentiation view.

## Product truth boundary

- Current Care 1 and Care 2 demo conversation logic is deterministic / rule-driven.
- The system is a patient-operations demo, not an EHR.
- It does not diagnose, prescribe or provide clinical judgement.
- Symptom / medicine / clinical-uncertainty conversations escalate to staff.
- Care 3 demonstrates premium/custom workflow capability; production integrations require clinic-owned account/API access and discovery.
- Synthetic demo patient data only.

## Architecture

The deployed demo uses:

- Static / browser UI for the sales demo
- Node server wrapper
- Supabase Edge Functions / Postgres for demo tenant data and Bizi Core APIs
- Railway for deployment
- Bizi Core service boundaries for assistant, CRM, data and demo-generation behavior

The source is intentionally tenant-aware. Demo configuration is stored per generated clinic tenant rather than relying on one shared hard-coded clinic state.

## Important implementation files

- `index.html` — demo shell
- `live.js` — API bridge and primary demo behavior
- `app.js` — package-to-personalisation route plus final behavior patches
- `v2.js` — review-stage UX, CRM and Care 3 experience
- `review-hotfix.js` — final takeover / branding / website-contact fixes
- `styles.css`, `v2.css`, `screenfit.css`, `review-hotfix.css`, `conversion.css` — presentation layers
- `conversion.js` — Bizi Systems conversion form / WhatsApp CTA
- `server.mjs` — secure server / proxy wrapper

## Automated launch verification / screenshots

The `bizi-demo-screenshot-runner` service uses Playwright against the production demo. On startup it automatically runs the same launch path and writes eight PNG assets:

1. `01-home-care-packages.png`
2. `02-care3-personalisation.png`
3. `03-patient-experience.png`
4. `04-care3-unified-intake.png`
5. `05-human-takeover.png`
6. `06-care3-website.png`
7. `07-care3-website-form.png`
8. `08-website-enquiry-crm.png`

The automated path covers package selection, Care 3 personalisation, generated demo entry, staff CRM, human takeover, generated website, website appointment submission, and the resulting website enquiry inside the CRM.

## Final launch asset checklist

Capture / retain the reviewed build before making additional non-launch code changes:

1. Three-package homepage
2. Personalisation screen
3. Patient experience
4. Care 1 staff capture view
5. Care 2 CRM overview / Patients
6. Human takeover chat
7. Care 3 Unified intake
8. Generated Care 3 clinic website
9. Website appointment form with phone / WhatsApp
10. Website lead inside CRM with Contact patient action

## Recording sequence

Recommended 60–120 second prospect walkthrough:

1. Package homepage
2. Pick Care 2 or Care 3
3. Personalise clinic + high-contrast colour
4. Patient service/pricing interaction
5. Open staff workspace
6. Take over and send staff reply
7. Patient replies while assistant remains paused
8. Return to assistant
9. Care 3 Unified intake + website
10. Submit website enquiry and show it in CRM

For a technical recording, extend the walkthrough with the Railway deployment, Bizi Core / Supabase data layer, automation services, WhatsApp gateway and screenshot runner after the customer-facing journey is complete.

## Deployment

Production service: `bizi-dentist-demo` in the Railway `favfare-demo` project.

Screenshot verification service: `bizi-demo-screenshot-runner` in the same Railway project.

Use the reviewed production deployment as the source for screenshots and recording unless a launch-blocking defect is discovered.
