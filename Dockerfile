# Dedicated-server image (adapter-node + SQLite + local disk storage).
#   docker compose up -d --build
# ── build ──────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Build tools are only needed if no prebuilt better-sqlite3 binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN DEPLOY_TARGET=node npm run build && npm prune --omit=dev

# ── runtime ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/data/clinic.db \
    UPLOAD_DIR=/data/uploads \
    MIGRATIONS_DIR=/app/drizzle \
    BODY_SIZE_LIMIT=10M
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
# Scripts (seed, create-admin, migrate-data) run with tsx and import from src/lib.
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/static ./static
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
