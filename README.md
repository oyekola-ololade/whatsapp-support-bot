# Bizi Real Estate Care — Technical Showcase

## What it is
A self-contained interactive product demo showing how a property business can turn an enquiry into a structured buyer profile, matched listings, viewing intent and a staff workflow.

## Source
`bizi-real-estate-care-demo/`

## Runtime
- Node.js service wrapper
- Browser HTML/CSS/JavaScript application
- `npm start -> node server.mjs`
- Railway deployment

## Demo model
The UI runs a deterministic sample journey using synthetic identities and `.example` contact data. It is portfolio/product-demo software, not a claim of production customer usage.

Core flow represented in `app.js`:
1. choose Care package
2. personalise agency/market/locations/brand colour
3. capture buyer identity/contact route
4. capture buy/rent/invest intent
5. capture preferred location
6. capture budget range
7. capture property type
8. capture purchase timeline
9. capture physical/virtual viewing preference
10. expose matched sample listings and a staff-side lead view

## Engineering points worth showing
- clear state model for captured buyer context
- package-dependent UX
- client-brand personalisation
- synthetic listing catalogue
- staff takeover / operational view
- isolated Node wrapper with health endpoint
- no external secret required by the current source

## Portfolio recording
Target 60–90 seconds:
1. landing + Care packages
2. enter Care 3 setup
3. change agency name and brand colour
4. run the guided qualification flow
5. show matched listings
6. open the staff/lead workspace
7. show the captured buyer profile and next action

## Public-repo hygiene
Before making public:
- keep all sample identities clearly synthetic
- preserve source attribution for external image URLs
- add screenshots/video
- add architecture diagram
- verify no deployment-specific secrets are introduced
