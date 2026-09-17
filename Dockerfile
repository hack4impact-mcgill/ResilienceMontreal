# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ARG DIRECT_URL
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ARG APP_URL
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
ENV APP_URL=$APP_URL

RUN bunx prisma generate
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["bun", "server.js"]
