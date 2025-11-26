# Nuxt 3 Web Performance Analyzer - Production Dockerfile
# 멀티 스테이지 빌드를 사용하여 이미지 크기 최적화

# Stage 1: Builder
FROM node:22-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy application source
COPY . .

# Git version information (injected during build) - AFTER copy to bust cache
ARG GIT_COMMIT=""
ARG GIT_BRANCH=""
ARG GIT_TAG=""
ARG GIT_VERSION=""
ARG GIT_DATETIME=""
ARG APP_NAME="Web Performance Analyzer"
ARG CACHE_BUST=""

ENV GIT_COMMIT=${GIT_COMMIT} \
    GIT_BRANCH=${GIT_BRANCH} \
    GIT_TAG=${GIT_TAG} \
    GIT_VERSION=${GIT_VERSION} \
    GIT_DATETIME=${GIT_DATETIME} \
    APP_NAME=${APP_NAME}

# Build application (cache busted by git info args)
ENV NODE_ENV=production
RUN echo "Building with GIT_COMMIT=${GIT_COMMIT}, GIT_VERSION=${GIT_VERSION}" && npm run build

# Stage 2: Runner (Production)
FROM node:22-alpine AS runner
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
    font-noto-cjk \
    dumb-init \
    curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001 -G nodejs

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

# Copy all node_modules for runtime dependencies (lighthouse, puppeteer, etc.)
COPY --from=builder --chown=nuxt:nodejs /app/node_modules /app/node_modules

# Symlink node_modules to .output/server for Nitro bundled code
RUN mkdir -p /app/.output/server/node_modules && \
    ln -sf /app/node_modules/lighthouse /app/.output/server/node_modules/lighthouse && \
    ln -sf /app/node_modules/axe-core /app/.output/server/node_modules/axe-core && \
    ln -sf /app/node_modules/http-link-header /app/.output/server/node_modules/http-link-header && \
    chown -R nuxt:nodejs /app/.output/server/node_modules

# Create data directory for history storage with proper permissions
RUN mkdir -p /app/.data/history && chown -R nuxt:nodejs /app/.data

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check using curl (installed in runner stage)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -sf http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application with increased memory limit for Lighthouse
CMD ["node", "--max-old-space-size=1536", ".output/server/index.mjs"]
