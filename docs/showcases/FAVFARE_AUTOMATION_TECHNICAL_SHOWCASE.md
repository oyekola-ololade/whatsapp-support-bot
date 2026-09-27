# Favfare Automation Controller — Technical Showcase

## What it is
A source-controlled controller for synchronising a multi-workflow n8n demo stack, including patient conversation versions, booking, CRM, patient status, simulator/actions and a WhatsApp gateway workflow.

## Source
Branch: `favfare-controller`
Directory: `favfare-controller/`

## Runtime
- Node.js >=20
- controller: `sync.mjs`
- n8n Public API with authenticated owner-session fallback

## Preserved components
- workflow JSON files
- embedded Code-node JavaScript under `code/`
- CRM/patient UI under `ui/`
- sync controller
- Evolution WhatsApp gateway workflow

## Controller behavior
1. authenticate through n8n Public API when possible
2. fall back to owner session only when required
3. load source-controlled workflow definitions
4. inject separately versioned HTML/CSS/JS assets into workflow nodes
5. update or create matching workflows
6. reactivate expected workflows
7. optionally run a watchdog health check and repair sync

## Engineering points
- infrastructure-as-code approach to n8n workflows
- repeatable sync instead of manual editor-only state
- separated embedded code/UI source
- API + fallback authentication strategy
- versioned Patient Conversation V2–V9 history
- deterministic health/watchdog path

## Truth boundary
The repo is technical evidence of the automation design and demo implementation. Do not present synthetic patient activity as real clinic usage.

## Recording
1. show the source tree
2. explain workflow JSON + embedded code/UI split
3. show controller sync path
4. show n8n workflow graph with secrets hidden
5. run a safe health/read-only verification
6. show resulting demo UI
