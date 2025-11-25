# Nuxt 3 Web Performance Analyzer - Production Dockerfile
# 멀티 스테이지 빌드를 사용하여 이미지 크기 최적화

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=deps

WORKDIR /app

# Install dependencies required for Puppeteer and Lighthouse
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    yarn

# Puppeteer와 Lighthouse가 시스템 Chromium을 사용하도록 설정
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Git version information (injected during build)
ARG GIT_COMMIT=""
ARG GIT_BRANCH=""
ARG GIT_TAG=""
ARG GIT_VERSION=""
ARG GIT_DATETIME=""
ARG APP_NAME="Web Performance Analyzer"

ENV GIT_COMMIT=${GIT_COMMIT} \
    GIT_BRANCH=${GIT_BRANCH} \
    GIT_TAG=${GIT_TAG} \
    GIT_VERSION=${GIT_VERSION} \
    GIT_DATETIME=${GIT_DATETIME} \
    APP_NAME=${APP_NAME}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Build application
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
LABEL maintainer="Web Performance Team"

WORKDIR /app

# Install runtime dependencies for Puppeteer and Lighthouse
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001

# Git version information (passed from builder)
ARG GIT_COMMIT=""
ARG GIT_BRANCH=""
ARG GIT_TAG=""
ARG GIT_VERSION=""
ARG GIT_DATETIME=""
ARG APP_NAME="Web Performance Analyzer"

# Puppeteer와 Lighthouse 환경 변수 설정
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    HOST=0.0.0.0 \
    PORT=3000 \
    GIT_COMMIT=${GIT_COMMIT} \
    GIT_BRANCH=${GIT_BRANCH} \
    GIT_TAG=${GIT_TAG} \
    GIT_VERSION=${GIT_VERSION} \
    GIT_DATETIME=${GIT_DATETIME} \
    APP_NAME=${APP_NAME}

# Copy built application from builder
COPY --from=builder --chown=nuxt:nodejs /app/.output /app/.output
COPY --from=builder --chown=nuxt:nodejs /app/package*.json /app/

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", ".output/server/index.mjs"]
