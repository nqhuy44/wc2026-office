FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend ./
RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/server.js"]
