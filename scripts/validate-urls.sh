#!/bin/bash

# ============================================
# validate-urls.sh
# 프로덕션 환경변수 URL 변환 검증 스크립트
# localhost, 127.0.0.1 등이 포함되지 않았는지 확인
# ============================================

set -e

# 사용법
if [ $# -lt 1 ]; then
  echo "Usage: $0 <env_file>"
  echo "Example: $0 .env.prd"
  exit 1
fi

ENV_FILE=$1

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 URL 변환 검증 시작..."
echo ""

# 1. 파일 존재 확인
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ 환경변수 파일이 없습니다: ${ENV_FILE}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 환경변수 파일 존재: ${ENV_FILE}${NC}"
echo ""

ERRORS=0

# 2. localhost 검색
echo "📍 localhost 검색 중..."
if grep -q "localhost" "$ENV_FILE"; then
  echo -e "${RED}❌ 'localhost'가 발견되었습니다:${NC}"
  grep -n "localhost" "$ENV_FILE" | while IFS=: read -r line_num content; do
    echo -e "  ${YELLOW}Line ${line_num}:${NC} ${content}"
  done
  ERRORS=$((ERRORS + 1))
  echo ""
else
  echo -e "${GREEN}✅ localhost 없음${NC}"
fi

# 3. 127.0.0.1 검색
echo "📍 127.0.0.1 검색 중..."
if grep -q "127\.0\.0\.1" "$ENV_FILE"; then
  echo -e "${RED}❌ '127.0.0.1'이 발견되었습니다:${NC}"
  grep -n "127\.0\.0\.1" "$ENV_FILE" | while IFS=: read -r line_num content; do
    echo -e "  ${YELLOW}Line ${line_num}:${NC} ${content}"
  done
  ERRORS=$((ERRORS + 1))
  echo ""
else
  echo -e "${GREEN}✅ 127.0.0.1 없음${NC}"
fi

# 4. 0.0.0.0 검색 (일부 서버 설정에서 사용될 수 있으므로 경고만)
echo "📍 0.0.0.0 검색 중..."
if grep -q "0\.0\.0\.0" "$ENV_FILE"; then
  echo -e "${YELLOW}⚠️ '0.0.0.0'이 발견되었습니다 (서버 바인딩 주소일 수 있음):${NC}"
  grep -n "0\.0\.0\.0" "$ENV_FILE" | while IFS=: read -r line_num content; do
    echo -e "  ${YELLOW}Line ${line_num}:${NC} ${content}"
  done
  echo ""
else
  echo -e "${GREEN}✅ 0.0.0.0 없음${NC}"
fi

# 5. http://158.180.95.246 또는 workhub.biz 확인 (프로덕션 URL이 있는지)
echo "📍 프로덕션 URL 확인 중..."
if grep -qE "(158\.180\.95\.246|workhub\.biz)" "$ENV_FILE"; then
  echo -e "${GREEN}✅ 프로덕션 URL 발견 (158.180.95.246 또는 workhub.biz)${NC}"
  grep -nE "(158\.180\.95\.246|workhub\.biz)" "$ENV_FILE" | head -5 | while IFS=: read -r line_num content; do
    echo -e "  ${GREEN}Line ${line_num}:${NC} ${content}"
  done
  echo ""
else
  echo -e "${YELLOW}⚠️ 프로덕션 URL을 찾을 수 없습니다.${NC}"
  echo -e "${YELLOW}   예상 URL: 158.180.95.246 또는 workhub.biz${NC}"
  echo ""
fi

# 6. 최종 결과
echo "================================"
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ URL 변환 검증 실패: ${ERRORS}개 문제 발견${NC}"
  echo ""
  echo -e "${YELLOW}💡 권장사항:${NC}"
  echo -e "  - localhost → workhub.biz 또는 158.180.95.246"
  echo -e "  - 127.0.0.1 → 158.180.95.246"
  echo -e "  - .env.template과 .env.prd를 비교하여 프로덕션 URL로 변경하세요."
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ URL 변환 검증 통과${NC}"
  echo -e "${GREEN}   모든 URL이 프로덕션 환경으로 설정되었습니다.${NC}"
  echo ""
  exit 0
fi
