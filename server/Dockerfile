# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=builder /app/server/node_modules ./node_modules
COPY server/package.json server/package-lock.json ./
COPY server/src ./src
COPY server/public ./public
COPY server/migrations ./migrations
COPY server/scripts ./scripts
COPY desktop-app ../desktop-app
COPY mobile-scanner ../mobile-scanner
COPY public ../public

RUN addgroup -S easyqr && adduser -S easyqr -G easyqr
USER easyqr

EXPOSE 3000

CMD ["npm", "start"]
