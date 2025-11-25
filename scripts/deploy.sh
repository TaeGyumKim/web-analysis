#!/bin/bash
# ===========================================
# Docker Compose Deploy Script
# ===========================================

set -e

# Get git information
export GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
export GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
export GIT_VERSION=${GIT_TAG:-$GIT_COMMIT}
export GIT_DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export APP_NAME=${APP_NAME:-"Web Performance Analyzer"}

echo "==================================="
echo "Deploying Web Performance Analyzer"
echo "==================================="
echo "Version: $GIT_VERSION"
echo "Branch: $GIT_BRANCH"
echo "Commit: $GIT_COMMIT"
echo "==================================="

# Parse arguments
USE_NGINX=false
DETACHED=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --with-nginx)
      USE_NGINX=true
      shift
      ;;
    --foreground|-f)
      DETACHED=false
      shift
      ;;
    --build)
      BUILD="--build"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build command
CMD="docker compose"

if [ "$USE_NGINX" = true ]; then
  CMD="$CMD --profile with-nginx"
fi

CMD="$CMD up"

if [ "$DETACHED" = true ]; then
  CMD="$CMD -d"
fi

if [ -n "$BUILD" ]; then
  CMD="$CMD $BUILD"
fi

echo "Running: $CMD"
eval $CMD

echo "==================================="
echo "Deployment Complete!"
echo "==================================="
if [ "$USE_NGINX" = true ]; then
  echo "Access: https://localhost"
else
  echo "Access: http://localhost:3000"
fi
echo "Health: http://localhost:3000/api/health"
echo "Version: http://localhost:3000/api/version"
