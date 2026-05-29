---
name: SQL & Databases
description: Query, model, and optimize SQL across Postgres/SQLite.
when_to_use: Writing SQL, designing schemas, or querying a database.
icon: 🗄
---

# SQL & Databases

## Connect
- Use the **postgres** / **sqlite** / **supabase** MCP if connected (preferred — already authed).
- Else `psql "$DATABASE_URL"` or `sqlite3 file.db` via bash.

## Querying
- Be explicit: name columns, not `SELECT *`. Always `LIMIT` exploratory queries.
- Parameterize — never string-concatenate user input (SQL injection).
- Use CTEs (`WITH`) for readability; window functions for ranking/running totals.
- `EXPLAIN ANALYZE` slow queries; index the columns in `WHERE`/`JOIN`/`ORDER BY`.

## Schema design
- Normalize to 3NF unless you have a measured reason not to. Use FKs + constraints.
- Pick correct types (`timestamptz`, `numeric` for money, `uuid` for ids).
- Migrations are versioned and reversible; never edit a shipped migration.

## Safety
- Run `SELECT` to preview rows before any `UPDATE`/`DELETE`. Wrap mutations in a transaction.
- Confirm destructive statements with the user. Never `DROP`/`TRUNCATE` without explicit OK.
