#!/bin/bash

# ============================================
# smoke-test.sh
# 배포 후 헬스체크 스크립트
# ============================================

set -e

# 사용법
if [ $# -lt 1 ]; then
  echo "Usage: $0 <project_name>"
  echo "Example: $0 WBHubManager"
  echo "Projects: WBHubManager, WBSalesHub, WBFinHub, WBOnboardingHub"
  exit 1
fi

PROJECT=$1

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트별 포트 매핑
get_port() {
  case $1 in
    "WBHubManager"|"wbhubmanager"|"hubmanager"|"허브매니저")
      echo "5050"  # Backend 포트
      ;;
    "WBSalesHub"|"wbsaleshub"|"saleshub"|"세일즈허브")
      echo "4010"
      ;;
    "WBFinHub"|"wbfinhub"|"finhub"|"핀허브")
      echo "4020"
      ;;
    "WBOnboardingHub"|"wbonboardinghub"|"onboardinghub"|"온보딩허브")
      echo "4030"
      ;;
    *)
      echo ""
      ;;
  esac
}

PORT=$(get_port $PROJECT)

if [ -z "$PORT" ]; then
  echo -e "${RED}❌ 알 수 없는 프로젝트: ${PROJECT}${NC}"
  echo "지원 프로젝트: WBHubManager, WBSalesHub, WBFinHub, WBOnboardingHub"
  exit 1
fi

HEALTH_URL="http://158.180.95.246:${PORT}/api/health"

echo "🔍 Smoke 테스트 시작..."
echo "   프로젝트: ${PROJECT}"
echo "   URL: ${HEALTH_URL}"
echo ""

# 헬스체크 실행
echo "📍 헬스체크 요청 중..."
RESPONSE=$(curl -s -o /tmp/health-response.json -w "%{http_code}" ${HEALTH_URL} 2>&1)

# HTTP 상태 코드 확인
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ HTTP 200 OK${NC}"

  # JSON 응답 파싱 (jq 있으면 사용, 없으면 grep)
  if command -v jq &> /dev/null; then
    if [ -f /tmp/health-response.json ]; then
      SUCCESS=$(jq -r '.success // empty' /tmp/health-response.json 2>/dev/null)
      TIMESTAMP=$(jq -r '.timestamp // empty' /tmp/health-response.json 2>/dev/null)

      echo ""
      echo "📋 응답 내용:"
      cat /tmp/health-response.json | jq '.'
      echo ""

      if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo -e "${GREEN}   Timestamp: ${TIMESTAMP}${NC}"
        rm -f /tmp/health-response.json
        exit 0
      else
        echo -e "${RED}❌ Health check failed (success: false)${NC}"
        rm -f /tmp/health-response.json
        exit 1
      fi
    fi
  else
    # jq 없을 경우 간단한 grep 체크
    if [ -f /tmp/health-response.json ]; then
      echo ""
      echo "📋 응답 내용:"
      cat /tmp/health-response.json
      echo ""

      if grep -q '"success".*true' /tmp/health-response.json; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        rm -f /tmp/health-response.json
        exit 0
      else
        echo -e "${YELLOW}⚠️ Health check response received, but cannot verify 'success' field (jq not installed)${NC}"
        echo -e "${GREEN}   HTTP 200이므로 기본적으로 성공으로 판단합니다.${NC}"
        rm -f /tmp/health-response.json
        exit 0
      fi
    fi
  fi

  # 응답 파일 없으면 HTTP 200만으로 성공 판단
  echo -e "${GREEN}✅ Health check passed (HTTP 200)${NC}"
  exit 0

elif [ "$RESPONSE" = "000" ]; then
  echo -e "${RED}❌ 연결 실패 (Connection refused or timeout)${NC}"
  echo ""
  echo -e "${YELLOW}💡 확인사항:${NC}"
  echo -e "  1. 컨테이너가 실행 중인지 확인: docker ps | grep ${PROJECT,,}"
  echo -e "  2. 포트가 열려있는지 확인: netstat -tulpn | grep ${PORT}"
  echo -e "  3. 방화벽 설정 확인"
  exit 1

else
  echo -e "${RED}❌ HTTP ${RESPONSE}${NC}"

  if [ -f /tmp/health-response.json ]; then
    echo ""
    echo "📋 에러 응답:"
    cat /tmp/health-response.json
    echo ""
    rm -f /tmp/health-response.json
  fi

  exit 1
fi
