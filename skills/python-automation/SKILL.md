---
name: Python Automation
description: Scripts for files, APIs, scraping, and data wrangling.
when_to_use: Automating tasks in Python — file processing, API calls, scraping, glue scripts.
icon: 🐍
---

# Python Automation

## Setup
- Use a venv: `python3 -m venv .venv && source .venv/bin/activate`.
- Pin deps in `requirements.txt`. Common: `requests`, `httpx`, `pandas`, `beautifulsoup4`, `rich`, `typer`.

## Patterns
- CLI: use `argparse` or `typer`. Always provide `--help`.
- HTTP: `httpx` (sync/async) with timeouts and retry/backoff; check `resp.raise_for_status()`.
- Files: `pathlib.Path`; use context managers; handle encoding explicitly.
- Logging over print for anything long-running (`logging`, or `rich` for pretty output).
- Fail loudly: catch specific exceptions, not bare `except`.

## Scraping etiquette
- Respect `robots.txt`, rate-limit, set a real User-Agent, cache responses. Prefer official APIs.

## Verify
- Run the script on a small sample first. `python -m py_compile script.py` to catch syntax errors.
