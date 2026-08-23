# syntax=docker/dockerfile:1.7

# Build stage
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/migrate.cjs
RUN npm prune --production

# Runtime stage
FROM node:22-slim AS runtime
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip curl ca-certificates && \
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/v1.49.0/install.sh | sh -s -- -b /usr/local/bin v1.49.0 && \
    syft version && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/migrations ./migrations
COPY --from=builder --chown=node:node /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder --chown=node:node /app/Dockerfile.worker ./Dockerfile.worker
COPY --from=builder --chown=node:node /app/index.html ./index.html

ENV NODE_ENV=production
EXPOSE 3000

USER node

CMD ["sh", "-c", "if [ \"$PROCESS_ROLE\" = \"worker\" ]; then exec node dist/worker.cjs; else exec node dist/server.cjs; fi"]
