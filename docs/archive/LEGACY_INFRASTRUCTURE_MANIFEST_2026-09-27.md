# Legacy Bizi Web Infrastructure Manifest — 2026-09-27

## Scope
This document separates third-party/runtime infrastructure in the legacy Railway project `Bizi_Systems_Web_App` from the active Bizi OS production stack.

No secret values are recorded.

## Legacy website-project infrastructure

### n8n
- Service ID: `f88f3b72-b0ec-463d-91c7-a3ff1802e8e4`
- Image: `docker.n8n.io/n8nio/n8n:latest`
- Volume: `n8n-data`
- Volume ID: `ac15a022-dd4e-4d51-8755-71747487ed71`
- Mount: `/home/node/.n8n`
- Rule: do not delete until workflow reconciliation/export is complete.

### Evolution API
- Service ID: `217777ef-5d45-44ee-be8e-b5fc4e9c7735`
- Image: `evoapicloud/evolution-api:latest`
- Classification: legacy copy in website project.

### Evolution Redis
- Service ID: `ee6e43c9-53a6-407b-b02c-00f4381d1116`
- Image: `redis:7-alpine`
- Classification: legacy copy in website project.

### Evolution Postgres
- Service ID: `b71c3893-6e1f-485b-89bb-a2b60dfcab48`
- Image: `postgres:15`
- Classification: legacy copy in website project.

## Active Bizi OS Evolution stack — DO NOT CONFUSE WITH LEGACY SERVICES

Railway project: `bizi-os`  
Project ID: `88a27373-c4b6-480c-ae4f-42808515cb90`

- Active Evolution API: `ceb8f1e8-209b-478b-81de-ae6729c82086`
- Active Evolution Redis: `3bd0d1eb-c57a-4d15-b96a-5112fbe3fe05`
- Active Evolution Postgres: `950ef955-0e20-4bd5-8c5b-13e3ed54017b`

These active services are outside the legacy website project cleanup scope.

## Deletion rule
The legacy Evolution trio may be removed only after callers/dependencies are checked. Deleting the old services must not touch or reconfigure the active Bizi OS trio above.
