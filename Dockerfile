# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.19.0
ARG SYFT_VERSION=1.49.0

FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/migrate.cjs
RUN npm prune --production

FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

ARG SYFT_VERSION

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tar gzip \
    && rm -rf /var/lib/apt/lists/* \
    && set -eux; \
       base="https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}"; \
       checksum_file="syft_${SYFT_VERSION}_checksums.txt"; \
       curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
         "${base}/${checksum_file}" -o "/tmp/${checksum_file}"; \
       echo "1870142953acd02a9de2f5ff019087cee4a6dc03e4a7c15b67de7b1dc48e0865  /tmp/${checksum_file}" | sha256sum -c -; \
       asset="syft_${SYFT_VERSION}_linux_amd64.tar.gz"; \
       curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
         "${base}/${asset}" -o "/tmp/${asset}"; \
       grep "  ${asset}$" "/tmp/${checksum_file}" | sha256sum -c -; \
       tar -xzf "/tmp/${asset}" -C /tmp; \
       install -m 0755 /tmp/syft /usr/local/bin/syft; \
       syft version; \
       rm -f "/tmp/${checksum_file}" "/tmp/${asset}" /tmp/syft

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
