---
name: CI/CD
description: GitHub Actions pipelines for test, build, and deploy.
when_to_use: Setting up or fixing CI/CD — automated tests, builds, and deploys.
icon: 🔁
---

# CI/CD (GitHub Actions)

## Workflow layout
- `.github/workflows/ci.yml` triggered on `push`/`pull_request`.
- Jobs: `lint` → `test` → `build` → (on main) `deploy`. Use `needs:` to chain.

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
```

## Practices
- Cache deps (`cache: npm`/`actions/cache`). Pin action versions.
- Secrets via `${{ secrets.X }}` — never echo them. Use environments + required reviewers for prod deploys.
- Fail fast; make the pipeline reproduce locally (`npm ci`, not `npm install`).
- Matrix-test across versions when it matters.

## Deploy step
- Gate on branch (`if: github.ref == 'refs/heads/main'`). Use OIDC over long-lived cloud keys where supported.

## Verify
- Push to a branch and confirm the run is green before merging. Read failing logs, fix root cause.
