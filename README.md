# WhatsApp Support Bot with FAQ Deflection

Answers common WhatsApp support questions from an FAQ index and escalates the rest to a human queue.

![n8n](https://img.shields.io/badge/-n8n-333?style=flat-square) ![Twilio (WhatsApp)](https://img.shields.io/badge/-Twilio%20(WhatsApp)-333?style=flat-square) ![Custom FAQ search API](https://img.shields.io/badge/-Custom%20FAQ%20search%20API-333?style=flat-square) ![Slack](https://img.shields.io/badge/-Slack-333?style=flat-square)
![n8n](https://img.shields.io/badge/n8n-workflow-EA4B71?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

**[Open the visual project page →](./index.html)**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Workflow](#workflow)
- [Tech Stack](#tech-stack)
- [Demo status](#demo-status)
- [Setup](#setup)
- [Repository Structure](#repository-structure)
- [Disclaimer](#disclaimer)

## Overview

**Trigger:** Webhook (WhatsApp support message: From, Body)

Answers common WhatsApp support questions from an FAQ index and escalates the rest to a human queue.

### Key Features

- Confidence-gated auto-resolution
- Human handoff with full message context
- Resolved/queued status tracking

## Architecture

The diagram below represents the sanitized template flow. External services, credentials, and environment-specific identifiers must be configured before execution.

```mermaid
flowchart TD
    A["WhatsApp support webhook"] --> B["Normalize phone and message"]
    B --> C["Search FAQ index"]
    C --> D{"Confident match?"}
    D -->|Yes| E["Send FAQ answer"]
    E --> F["Mark resolved"]
    D -->|No| G["Create human-support queue item"]
    G --> H["Notify support agent in Slack"]
```

## Workflow

1. WhatsApp support webhook receives the inbound message
2. Extract phone number and lowercase the message
3. Search an FAQ index for a confident match
4. High confidence: send the FAQ answer directly and mark resolved
5. Low confidence: route to a human support queue and notify the agent in Slack

## Tech Stack

- n8n
- Twilio (WhatsApp)
- Custom FAQ search API
- Slack

## Demo status

A configured live-run recording is not included yet. Credentials and service identifiers remain placeholders.


## Setup

1. Import `workflow/T9_WhatsApp_Support_Bot.json` into your n8n instance (**Workflows → Import from File**).
2. Replace every placeholder credential/URL in the workflow (e.g. `YOUR_..._API_KEY`, `YOUR_..._URL`) with your own service credentials.
3. Activate the workflow and point the relevant integration (webhook source, scheduled trigger, etc.) at the generated webhook URL.
4. Test with a sample payload before going live.

## Repository Structure

```text
.
├── index.html
├── README.md
├── LICENSE
├── .gitignore
└── workflow/
    └── T9_WhatsApp_Support_Bot.json
```


## Disclaimer

This workflow was built as a portfolio/template project to demonstrate n8n workflow automation and AI integration. API credentials and sensitive configuration have been removed before publication — replace all `YOUR_..._KEY` / `YOUR_..._URL` placeholders with your own before use.

---

Designed and engineered by

**Oyekola Ololade**

AI Systems & Integration Engineer

- LinkedIn: <http://linkedin.com/in/ololade-oyekola-5b1797397>
- Email: <oyekolaololade69@gmail.com>
