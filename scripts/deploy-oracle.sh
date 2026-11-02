#!/bin/bash
# HWTestAgent Oracle Deployment Script
# Usage: ./scripts/deploy-oracle.sh

set -e  # Exit on error

echo "🚀 HWTestAgent 오라클 배포 시작..."
echo "---"

# Configuration
ORACLE_HOST="158.180.95.246"
ORACLE_USER="ubuntu"
ORACLE_KEY="~/.ssh/oracle-cloud.key"
REMOTE_DIR="/home/ubuntu/workhub/HWTestAgent"
DOCKER_IMAGE="hwtestagent-api"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Local validation
echo -e "${YELLOW}📋 Step 1: 로컬 검증 중...${NC}"
echo "  - Git 상태 확인"
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}❌ 커밋되지 않은 변경사항이 있습니다. 먼저 커밋하세요.${NC}"
  exit 1
fi

echo "  - 현재 브랜치 확인"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  - 브랜치: $CURRENT_BRANCH"

echo "  - TypeScript 타입 체크"
npm run type-check || { echo -e "${RED}❌ 타입 체크 실패${NC}"; exit 1; }

echo -e "${GREEN}✅ Step 1 완료${NC}"
echo "---"

# Step 2: Git push
echo -e "${YELLOW}📤 Step 2: Git push 중...${NC}"
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✅ Step 2 완료${NC}"
echo "---"

# Step 3: SSH to Oracle and deploy
echo -e "${YELLOW}🔌 Step 3: 오라클 서버 접속 및 배포 중...${NC}"

ssh -i "$ORACLE_KEY" "${ORACLE_USER}@${ORACLE_HOST}" << 'EOF'
set -e

# Navigate to project directory
cd /home/ubuntu/workhub/HWTestAgent || { echo "❌ 프로젝트 디렉토리 없음"; exit 1; }

# Git pull
echo "📥 Git pull 중..."
git pull origin master

# Stop existing container
echo "🛑 기존 컨테이너 중지 중..."
docker-compose down || echo "⚠️  실행 중인 컨테이너 없음"

# Build Docker image with BuildKit
echo "🔨 Docker 이미지 빌드 중..."
DOCKER_BUILDKIT=1 docker-compose build --no-cache

# Start new container
echo "🟢 새 컨테이너 시작 중..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ 컨테이너 시작 대기 중 (10초)..."
sleep 10

# Health check
echo "🏥 Health check 실행 중..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/api/health)

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo "✅ Health check 성공 (HTTP $HEALTH_STATUS)"
else
  echo "❌ Health check 실패 (HTTP $HEALTH_STATUS)"
  echo "컨테이너 로그:"
  docker logs hwtestagent-api --tail 50
  exit 1
fi

echo "---"
echo "✅ 오라클 서버 배포 완료!"
EOF

echo -e "${GREEN}✅ Step 3 완료${NC}"
echo "---"

# Step 4: External API test
echo -e "${YELLOW}🧪 Step 4: 외부 접근 테스트 중...${NC}"
echo "  - URL: https://workhub.biz/testagent/health"

EXTERNAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://workhub.biz/testagent/health)

if [ "$EXTERNAL_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ 외부 접근 성공 (HTTP $EXTERNAL_STATUS)${NC}"
else
  echo -e "${RED}❌ 외부 접근 실패 (HTTP $EXTERNAL_STATUS)${NC}"
  echo "  - Nginx 설정을 확인하세요"
  exit 1
fi

echo "---"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo ""
echo "📊 접속 정보:"
echo "  - 대시보드: https://workhub.biz/testagent"
echo "  - API Health: https://workhub.biz/testagent/health"
echo "  - 에러 패턴: https://workhub.biz/testagent/api/error-patterns"
echo ""
echo "🔍 로그 확인 (오라클 서버에서):"
echo "  ssh -i ~/.ssh/oracle-cloud.key ubuntu@158.180.95.246"
echo "  docker logs -f hwtestagent-api"
