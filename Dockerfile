# syntax=docker/dockerfile:1.7

ARG SYFT_VERSION=1.49.0

FROM node:22.19.0-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/migrate.cjs
RUN npm prune --production

FROM node:22.19.0-slim AS runtime
WORKDIR /app

ARG SYFT_VERSION

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
         https://raw.githubusercontent.com/anchore/syft/v1.49.0/install.sh \
         -o /tmp/syft-install.sh \
    && sh /tmp/syft-install.sh -b /usr/local/bin "v${SYFT_VERSION}" \
    && syft version \
    && rm -f /tmp/syft-install.sh \
    && rm -rf /var/lib/apt/lists/*

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
