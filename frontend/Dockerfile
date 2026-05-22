FROM node:26-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install

FROM node:26-alpine AS builder
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/package.json frontend/next.config.ts frontend/tsconfig.json frontend/postcss.config.mjs frontend/tailwind.config.ts frontend/components.json ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
