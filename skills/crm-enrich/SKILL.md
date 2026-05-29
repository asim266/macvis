---
name: CRM & Enrichment
description: Enrich, dedupe, and sync leads into a CRM/sheet.
when_to_use: Cleaning, enriching, deduping, or loading a lead list into a CRM or spreadsheet.
icon: 📇
---

# CRM & Enrichment

## Clean & dedupe
- Normalize: lowercase emails, strip whitespace, standardize phone (E.164), title-case names.
- Dedupe on email first, then domain+name. Keep the most complete record; log merges.
- Validate emails: syntax + MX check; mark `valid/risky/invalid`. Drop role accounts if doing 1:1 outreach.

## Enrich
- Fill gaps from public sources or enrichment APIs (Hunter `$HUNTER_API_KEY`, Apollo `$APOLLO_API_KEY`) — only if the user has keys.
- Add: company size, industry, location, LinkedIn URL, website.

## Sync
- To a sheet: write CSV with a stable schema, or use the **xlsx** skill/tool.
- To a CRM via its MCP (HubSpot/Salesforce/Notion) — map fields explicitly, upsert on email.

## Schema
`first, last, email, title, company, domain, size, industry, location, source, status, captured_at`

## Guardrails
- Respect privacy law (GDPR/CCPA). Store only what's needed. Never expose enrichment API keys.
