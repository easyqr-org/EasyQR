# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app/server

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=builder /app/server/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY public ./public
COPY migrations ./migrations
COPY scripts ./scripts

RUN addgroup -S easyqr && adduser -S easyqr -G easyqr
USER easyqr

EXPOSE 3000

CMD ["npm", "start"]
