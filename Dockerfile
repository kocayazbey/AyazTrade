# Multi-stage build for AyazTrade Backend
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image with distroless
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

# Expose port
EXPOSE 5000

# Start the application
ENV OTEL_SERVICE_NAME=ayaztrade-backend
ENV NODE_ENV=production
CMD ["dist/main.js"]