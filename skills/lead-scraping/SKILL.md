---
name: Lead Scraping
description: Find and extract prospect data from the web ethically.
when_to_use: Building a list of prospects/companies from public web sources.
icon: 🎯
---

# Lead Scraping

## Sources & tools
- **web_search** to discover companies/people; **web_fetch** to read pages.
- **Firecrawl MCP** (if connected) for structured crawl/extract at scale.
- Public directories, company sites, and official APIs first.

## Process
1. Define the ICP: industry, size, role, geography.
2. Discover candidate sources (search queries, directories).
3. Extract: company name, website, role, public contact (only what's publicly listed).
4. Normalize into a CSV/sheet: `company, name, title, email, source_url, captured_at`.
5. Dedupe and validate (see crm-enrich).

## Compliance (important)
- Only collect publicly available data. Respect `robots.txt`, ToS, and rate limits.
- Follow GDPR/CCPA: have a lawful basis, honor opt-outs, don't harvest behind logins.
- Never buy or use breached data. Don't scrape LinkedIn in violation of its ToS.

## Output
- Hand the user a clean, deduped CSV plus a note on the source and date for each row.
