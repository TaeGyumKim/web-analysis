# Deployment Guide

Web Performance Analyzer 배포 가이드입니다.

## 목차

1. [빠른 시작](#빠른-시작)
2. [Docker 배포](#docker-배포)
3. [환경 변수](#환경-변수)
4. [Nginx 설정](#nginx-설정)
5. [CI/CD](#cicd)
6. [문제 해결](#문제-해결)

---

## 빠른 시작

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### Docker로 실행

```bash
# 빌드 및 실행
make build
make run

# 또는 docker compose 직접 사용
docker compose up -d --build
```

접속: http://localhost:3000

---

## Docker 배포

### 1. 기본 빌드

```bash
# Makefile 사용
make build

# 또는 스크립트 사용
./scripts/build.sh

# 또는 직접 빌드
docker build -t web-perf-analyzer:latest .
```

### 2. Git 정보 포함 빌드

```bash
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  --build-arg GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "") \
  --build-arg GIT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || git rev-parse --short HEAD) \
  --build-arg GIT_DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t web-perf-analyzer:latest .
```

### 3. Docker Compose 실행

```bash
# 기본 실행
docker compose up -d

# Nginx와 함께 실행 (HTTPS)
docker compose --profile with-nginx up -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

---

## 환경 변수

### 필수 환경 변수 (Docker)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NODE_ENV` | 실행 환경 | `production` |
| `HOST` | 서버 호스트 | `0.0.0.0` |
| `PORT` | 서버 포트 | `3000` |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium 경로 | `/usr/bin/chromium-browser` |

### 선택 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `APP_NAME` | 애플리케이션 이름 | `Web Performance Analyzer` |
| `GIT_COMMIT` | Git 커밋 해시 | - |
| `GIT_BRANCH` | Git 브랜치 | - |
| `GIT_TAG` | Git 태그 | - |
| `GIT_VERSION` | 버전 | - |
| `GIT_DATETIME` | 빌드 시간 | - |

### .env 파일 사용

```bash
# .env.example을 복사하여 수정
cp .env.example .env

# docker compose가 자동으로 .env 파일을 읽음
docker compose up -d
```

---

## Nginx 설정

### SSL 인증서 준비

```bash
# nginx/ssl 디렉토리 생성
mkdir -p nginx/ssl

# 자체 서명 인증서 생성 (테스트용)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Let's Encrypt 사용 시 (실제 도메인 필요)
# certbot certonly --standalone -d your-domain.com
```

### Nginx와 함께 실행

```bash
docker compose --profile with-nginx up -d
```

### Nginx 설정 커스터마이징

`nginx/nginx.conf` 파일을 수정하여 설정을 변경할 수 있습니다.

주요 설정:
- Rate limiting: `/api/` 엔드포인트에 10 req/s 제한
- Gzip 압축 활성화
- 정적 파일 캐싱 (7일)
- 분석 API 타임아웃 300초

---

## CI/CD

### 자동 배포 파이프라인

GitHub Actions를 사용한 자동 배포 파이프라인이 구성되어 있습니다.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Test     │───▶│    Build    │───▶│   Deploy    │
│  (lint/test)│    │ (docker/push)│   │  (staging/  │
│             │    │   to ghcr   │    │  production)│
└─────────────┘    └─────────────┘    └─────────────┘
```

### 브랜치별 배포 전략

| 브랜치/태그 | 환경 | 자동 배포 |
|------------|------|----------|
| `develop` | Staging | O |
| `main` | Production | O |
| `v*` (태그) | Production + Release | O |
| PR | - | X (테스트만) |

### 1. 서버 준비

```bash
# 서버에서 실행
curl -sL https://raw.githubusercontent.com/YOUR_USER/web-analysis/main/scripts/server-setup.sh | sudo bash
```

또는 수동 설정:

```bash
# Docker 설치
curl -fsSL https://get.docker.com | sh

# 배포 디렉토리 생성
mkdir -p /opt/web-perf/nginx/ssl

# docker-compose.prod.yml 복사
cp docker-compose.prod.yml /opt/web-perf/docker-compose.yml

# 배포 사용자 생성 (권장)
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

### 2. GitHub 설정

Repository Settings > Secrets and variables > Actions에서 설정합니다.

#### Secrets (비밀 값)

| 이름 | 설명 | 예시 |
|------|------|------|
| `SSH_PRIVATE_KEY` | 서버 SSH 개인키 | `-----BEGIN OPENSSH...` |
| `SSH_HOST` | 서버 IP/호스트명 | `192.168.1.100` |
| `SSH_USER` | SSH 사용자명 | `deploy` |

#### Variables (변수)

| 이름 | 설명 | 예시 |
|------|------|------|
| `DEPLOY_PATH` | 서버 배포 경로 | `/opt/web-perf` |
| `PRODUCTION_URL` | 프로덕션 URL | `https://perf.example.com` |
| `STAGING_URL` | 스테이징 URL | `https://staging.example.com` |

### 3. SSH 키 설정

```bash
# 배포용 SSH 키 생성 (로컬)
ssh-keygen -t ed25519 -C "deploy@github-actions" -f ~/.ssh/deploy_key

# 공개키를 서버에 등록
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@YOUR_SERVER

# 개인키를 GitHub Secrets에 등록
cat ~/.ssh/deploy_key
# 이 내용을 SSH_PRIVATE_KEY secret에 저장
```

### 4. Environments 설정 (선택)

Repository Settings > Environments에서 `staging` 및 `production` 환경을 생성합니다.

- 보호 규칙 설정 (리뷰어 승인 필요 등)
- 환경별 secrets/variables 설정

### 5. 배포 실행

#### 자동 배포

```bash
# Staging 배포 (develop 브랜치에 푸시)
git checkout develop
git push origin develop

# Production 배포 (main 브랜치에 푸시)
git checkout main
git merge develop
git push origin main

# 릴리스 배포 (태그 생성)
git tag v1.0.0
git push origin v1.0.0
```

#### 수동 배포

GitHub Actions 탭에서 "Run workflow" 버튼 클릭 후 환경 선택

### 6. 배포 확인

```bash
# 버전 확인
curl https://your-domain.com/api/version

# 헬스 체크
curl https://your-domain.com/api/health
```

### 수동 배포 스크립트

```bash
# 배포
./scripts/deploy.sh

# Nginx와 함께 배포
./scripts/deploy.sh --with-nginx

# 빌드 후 배포
./scripts/deploy.sh --build
```

### 롤백

```bash
# 서버에서 이전 버전으로 롤백
ssh deploy@server 'cd /opt/web-perf && \
  docker compose pull ghcr.io/user/repo:previous-tag && \
  docker compose up -d'
```

---

## 문제 해결

### Chromium 관련 오류

```
Error: Failed to launch the browser process
```

**해결:**
- Docker 컨테이너에서 `seccomp:unconfined` 보안 옵션이 설정되어 있는지 확인
- `PUPPETEER_EXECUTABLE_PATH` 환경 변수 확인

### 메모리 부족

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**해결:**
- docker-compose.yml의 메모리 제한 증가
- 동시 분석 요청 수 제한

```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

### 타임아웃 오류

분석이 오래 걸리는 경우:
- 현재 설정: 무한 대기 (timeout: 0)
- Nginx 사용 시 `proxy_read_timeout` 확인 (기본 300s)

### 버전 확인

```bash
# 실행 중인 버전 확인
curl http://localhost:3000/api/version

# 헬스 체크
curl http://localhost:3000/api/health
```

---

## 리소스 요구사항

### 최소 사양
- CPU: 2 코어
- RAM: 2GB
- 디스크: 5GB

### 권장 사양
- CPU: 4 코어
- RAM: 4GB
- 디스크: 10GB

### Docker 리소스 설정

`docker-compose.yml`에서 수정:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 1G
```

---

## 명령어 요약

```bash
# 개발
make dev              # 개발 서버
make test             # 테스트
make lint             # 린트

# Docker
make build            # 이미지 빌드
make run              # 실행
make run-nginx        # Nginx와 함께 실행
make stop             # 중지
make logs             # 로그 확인
make clean            # 정리

# 프로덕션 (로컬)
make prod-build       # 빌드
make prod-start       # 시작
```
