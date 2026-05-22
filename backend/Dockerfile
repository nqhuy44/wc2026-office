FROM node:26-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install

FROM node:26-alpine AS builder
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/src ./
COPY prisma /app/prisma
RUN npm run prisma:generate && npm run build

FROM node:26-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app/backend/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/backend/package.json ./package.json
COPY --from=builder --chown=appuser:nodejs /app/prisma /app/prisma
USER appuser
EXPOSE 4000
CMD ["node", "dist/server.js"]
