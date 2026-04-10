FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/chat-server.js ./chat-server.js
COPY --from=builder /app/node_modules/ws ./node_modules/ws

RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'node /app/chat-server.js &' >> /app/start.sh && \
    echo 'node /app/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs
EXPOSE 3000 4000

CMD ["sh", "/app/start.sh"]
