---
name: Browser Automation
description: Automate web tasks, forms, and scraping flows.
when_to_use: Automating browser workflows — filling forms, navigating sites, extracting data.
icon: 🕸
---

# Browser Automation

## Options
- **Playwright** (recommended for scripts): `npm i -D playwright && npx playwright install chromium`.
- **Firecrawl MCP** for crawling/extraction at scale (if connected).
- **computer** tool for ad-hoc GUI browser control when scripting isn't set up.

## Playwright pattern
```js
import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.fill('#email', value)
await page.click('text=Sign in')
const data = await page.$$eval('.row', els => els.map(e => e.textContent))
await browser.close()
```

## Practices
- Prefer role/text selectors over brittle CSS. Wait for elements (`page.waitForSelector`), don't sleep.
- Rate-limit, set a realistic User-Agent, respect `robots.txt` and ToS.
- Persist auth state with `storageState` to avoid re-login.

## Don't
- Don't bypass CAPTCHAs/paywalls or scrape sites that forbid it. Don't store credentials in code.
