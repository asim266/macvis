---
name: Docker & Deploy
description: Containerize apps and ship to cloud platforms.
when_to_use: Writing Dockerfiles, docker-compose, or deploying containerized apps.
icon: 🐳
---

# Docker & Deploy

## Dockerfile essentials
- Start from a slim, pinned base (`node:22-slim`, `python:3.12-slim`).
- Multi-stage builds: build in one stage, copy only artifacts to a minimal runtime stage.
- Order layers cache-friendly: copy lockfile + install deps BEFORE copying source.
- Run as non-root (`USER node`). Add a `HEALTHCHECK`. Use `.dockerignore`.

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node","dist/index.js"]
```

## Compose
- `docker compose up -d` for multi-service (app + db). Use named volumes for persistence; env via `.env` (gitignored).

## Deploy
- Use the connected platform MCP (Railway/Cloudflare/Vercel) when available.
- Never bake secrets into the image — pass at runtime. Tag images with a version, not just `latest`.

## Verify
- `docker build` succeeds, container starts, healthcheck passes, port responds.
