# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

# Create non-root user for security
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV API_BASE_URL=http://localhost:8000/api/v1

CMD ["serve", "-s", "dist", "-l", "3000"]
