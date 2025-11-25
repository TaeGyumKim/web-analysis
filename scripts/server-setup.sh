#!/bin/bash
# ===========================================
# Server Setup Script for Web Performance Analyzer
# Run this script on the target server to prepare for deployment
# ===========================================

set -e

# Configuration
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/web-perf"}
GITHUB_REPO=${GITHUB_REPO:-""}  # e.g., "username/web-analysis"

echo "==================================="
echo "Web Performance Analyzer - Server Setup"
echo "==================================="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

# Update system
echo "[1/6] Updating system packages..."
apt-get update -qq

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "[2/6] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[2/6] Docker already installed"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
  echo "[3/6] Installing Docker Compose..."
  apt-get install -y docker-compose-plugin
else
  echo "[3/6] Docker Compose already installed"
fi

# Create deployment directory
echo "[4/6] Creating deployment directory..."
mkdir -p $DEPLOY_PATH
mkdir -p $DEPLOY_PATH/nginx/ssl
mkdir -p $DEPLOY_PATH/nginx/logs

# Create .env file
echo "[5/6] Creating environment file..."
cat > $DEPLOY_PATH/.env << EOF
# GitHub Container Registry
GITHUB_REPOSITORY=${GITHUB_REPO}
IMAGE_TAG=latest

# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
EOF

# Download docker-compose files
echo "[6/6] Downloading configuration files..."
if [ -n "$GITHUB_REPO" ]; then
  REPO_URL="https://raw.githubusercontent.com/${GITHUB_REPO}/main"
  curl -sL "${REPO_URL}/docker-compose.prod.yml" -o $DEPLOY_PATH/docker-compose.yml
  curl -sL "${REPO_URL}/nginx/nginx.conf" -o $DEPLOY_PATH/nginx/nginx.conf
else
  echo "Note: GITHUB_REPO not set. Please copy docker-compose.prod.yml manually."
fi

echo ""
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Set up GitHub Secrets in your repository:"
echo "   - SSH_PRIVATE_KEY: Your server's private SSH key"
echo "   - SSH_HOST: Your server's IP or hostname"
echo "   - SSH_USER: SSH username (e.g., deploy)"
echo ""
echo "2. Set up GitHub Variables:"
echo "   - DEPLOY_PATH: $DEPLOY_PATH"
echo "   - PRODUCTION_URL: https://your-domain.com"
echo ""
echo "3. (Optional) Set up SSL certificates:"
echo "   cp /path/to/cert.pem $DEPLOY_PATH/nginx/ssl/"
echo "   cp /path/to/key.pem $DEPLOY_PATH/nginx/ssl/"
echo ""
echo "4. Create deploy user (recommended):"
echo "   useradd -m -s /bin/bash deploy"
echo "   usermod -aG docker deploy"
echo ""
echo "Deployment path: $DEPLOY_PATH"
