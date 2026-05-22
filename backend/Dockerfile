FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend ./
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/backend/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/backend/package.json ./package.json
USER appuser
EXPOSE 4000
CMD ["node", "dist/server.js"]
