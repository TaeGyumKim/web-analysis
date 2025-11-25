#!/bin/bash
# ===========================================
# Docker Build Script with Git Information
# ===========================================

set -e

# Get git information
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
GIT_VERSION=${GIT_TAG:-$GIT_COMMIT}
GIT_DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Image name
IMAGE_NAME=${IMAGE_NAME:-"web-perf-analyzer"}
IMAGE_TAG=${IMAGE_TAG:-$GIT_VERSION}

echo "==================================="
echo "Building Docker Image"
echo "==================================="
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Commit: $GIT_COMMIT"
echo "Branch: $GIT_BRANCH"
echo "Tag: $GIT_TAG"
echo "Version: $GIT_VERSION"
echo "DateTime: $GIT_DATETIME"
echo "==================================="

# Build with git info
docker build \
  --build-arg GIT_COMMIT="$GIT_COMMIT" \
  --build-arg GIT_BRANCH="$GIT_BRANCH" \
  --build-arg GIT_TAG="$GIT_TAG" \
  --build-arg GIT_VERSION="$GIT_VERSION" \
  --build-arg GIT_DATETIME="$GIT_DATETIME" \
  -t "$IMAGE_NAME:$IMAGE_TAG" \
  -t "$IMAGE_NAME:latest" \
  .

echo "==================================="
echo "Build Complete!"
echo "==================================="
echo "Run with: docker run -p 3000:3000 $IMAGE_NAME:$IMAGE_TAG"
