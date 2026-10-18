FROM node:22-bookworm-slim AS ocr-runtime
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-ind tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN --mount=type=tmpfs,target=/app/.next/cache npm run build

FROM deps AS seeder
RUN mkdir -p /var/lib/bongkar-data && chown node:node /var/lib/bongkar-data
ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
COPY data ./data
USER node
CMD ["npm", "run", "db:seed"]

FROM seeder AS updater
COPY scripts ./scripts
CMD ["node", "--import", "tsx", "scripts/refresh-data.ts"]

FROM ocr-runtime AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# Optional Linux host-loopback access through an exclusive filesystem socket.
FROM node:22-bookworm-slim AS router-socket
RUN mkdir -p /run/router /bridge && chown -R 1001:1001 /run/router /bridge
COPY --chown=1001:1001 scripts/router-socket.mjs /bridge/router-socket.mjs
USER 1001:1001
CMD ["node", "/bridge/router-socket.mjs"]
