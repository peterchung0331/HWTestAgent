#!/bin/bash

# ============================================
# validate-env.sh
# 환경변수 파일 검증 스크립트
# ============================================

set -e

# 사용법
if [ $# -lt 1 ]; then
  echo "Usage: $0 <project_path> [env_file]"
  echo "Example: $0 /home/peterchung/WBHubManager"
  echo "Example: $0 /home/peterchung/WBHubManager .env"
  exit 1
fi

PROJECT_PATH=$1
ENV_FILE=${2:-.env.local}  # 기본값: .env.local, 파라미터로 .env 지정 가능
TEMPLATE_FILE="${PROJECT_PATH}/.env.template"
LOCAL_FILE="${PROJECT_PATH}/${ENV_FILE}"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 환경변수 검증 시작..."
echo ""

# 1. .env.template 존재 확인
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo -e "${RED}❌ .env.template 파일이 없습니다: ${TEMPLATE_FILE}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ .env.template 파일 존재${NC}"

# 2. 환경변수 파일 존재 확인
if [ ! -f "$LOCAL_FILE" ]; then
  echo -e "${RED}❌ ${ENV_FILE} 파일이 없습니다: ${LOCAL_FILE}${NC}"
  echo -e "${YELLOW}💡 다음 명령어로 생성하세요: cp ${TEMPLATE_FILE} ${PROJECT_PATH}/${ENV_FILE}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ ${ENV_FILE} 파일 존재${NC}"

# 3. 필수 변수(*) 추출
REQUIRED_VARS=$(grep -E '^\s*[A-Z_]+\*=' "$TEMPLATE_FILE" | sed 's/\*=/=/' | cut -d= -f1)

if [ -z "$REQUIRED_VARS" ]; then
  echo -e "${YELLOW}⚠️ 필수 변수(*)가 템플릿에 정의되지 않았습니다.${NC}"
  echo -e "${GREEN}✅ 모든 환경변수 검증 통과 (필수 항목 없음)${NC}"
  exit 0
fi

echo ""
echo "📋 필수 환경변수 검증 중..."
echo ""

MISSING_VARS=""
MISSING_COUNT=0

# 4. 필수 변수 체크
while IFS= read -r VAR; do
  # 공백 제거
  VAR=$(echo "$VAR" | xargs)

  if [ -z "$VAR" ]; then
    continue
  fi

  # 환경변수 파일에서 변수 찾기
  if grep -q "^${VAR}=" "$LOCAL_FILE"; then
    # 값이 비어있지 않은지 확인
    VALUE=$(grep "^${VAR}=" "$LOCAL_FILE" | cut -d= -f2- | xargs)
    if [ -z "$VALUE" ] || [ "$VALUE" = '""' ] || [ "$VALUE" = "''" ]; then
      echo -e "${YELLOW}⚠️ ${VAR}: 값이 비어있습니다${NC}"
      MISSING_VARS="${MISSING_VARS}\n  - ${VAR}"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    else
      echo -e "${GREEN}✅ ${VAR}${NC}"
    fi
  else
    echo -e "${RED}❌ ${VAR}: 변수가 없습니다${NC}"
    MISSING_VARS="${MISSING_VARS}\n  - ${VAR}"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done <<< "$REQUIRED_VARS"

echo ""

# 5. 결과 출력
if [ $MISSING_COUNT -gt 0 ]; then
  echo -e "${RED}❌ 누락된 필수 환경변수: ${MISSING_COUNT}개${NC}"
  echo -e "${YELLOW}${MISSING_VARS}${NC}"
  echo ""
  echo -e "${YELLOW}💡 ${ENV_FILE} 파일을 확인하고 누락된 변수를 추가하세요.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 모든 필수 환경변수가 설정되었습니다.${NC}"
  exit 0
fi
