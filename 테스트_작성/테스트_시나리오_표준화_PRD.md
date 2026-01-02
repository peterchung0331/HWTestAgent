# 테스트 시나리오 표준화 PRD

**작성일:** 2026-01-02
**목적:** HWTestAgent 테스트 시나리오를 ISTQB 표준 기반으로 재설계하여 3개 프로젝트에 동일하게 적용
**상태:** 완료

---

## 1. 개요

### 1.1 목적
HWTestAgent의 기존 테스트 시나리오(GENERAL, PRECISION, AUTH, 404, SSO)를 **ISTQB 표준 기반**의 새로운 4종 PRD로 **완전 대체**하여, 3개 프로젝트(WBHubManager, WBSalesHub, WBFinHub)에 동일하게 적용 가능한 표준화된 테스트 체계 수립

### 1.2 배경
- 기존 테스트 시나리오가 프로젝트별로 상이하게 구성됨
- 테스트 우선순위 체계가 명확하지 않음
- ISTQB 국제 표준에 맞는 테스트 분류 필요

### 1.3 대상 프로젝트
| 프로젝트 | 설명 | 프로덕션 URL |
|---------|------|-------------|
| WBHubManager | 중앙 인증/관리 허브 | https://wbhub.up.railway.app |
| WBSalesHub | 영업 관리 허브 | https://wbsaleshub.up.railway.app |
| WBFinHub | 금융 관리 허브 | https://wbfinhub.up.railway.app |

---

## 2. 산출물

### 2.1 PRD 4종
| PRD 번호 | 파일명 | 테스트 타입 | 목적 | 상태 |
|---------|--------|-----------|------|------|
| 1 | `테스트_작성_Smoke.md` | Smoke Test | 배포 전 최소 검증 | **완료** |
| 2 | `테스트_작성_Core-API-P0.md` | Core API P0 | 시스템 장애 수준 Critical | **완료** |
| 3 | `테스트_작성_Core-API-P1.md` | Core API P1 | 핵심 기능 오류 수준 High | **완료** |
| 4 | `테스트_작성_Core-API-P2.md` | Core API P2 | 부가 기능 오류 수준 Medium | **완료** |

### 2.2 저장 위치
`C:\GitHub\WHCommon\기능 PRD\`

---

## 3. 리서치 결과

### 3.1 ISTQB 프레임워크 참조
- **P0 (Critical)**: 시스템 장애, 즉시 대응 필요, 배포 중단 기준
- **P1 (High)**: 핵심 기능 오류, 사용자 경험 심각 저하
- **P2 (Medium)**: 부가 기능 오류, 일정 내 수정 가능

**참조 자료:**
- [ISTQB 공식 사이트](https://istqb.org/)
- [ISTQB API Testing 정의](https://istqb-glossary.page/api-testing/)
- [P0-P4 Priority Levels Explained](https://fibery.io/blog/product-management/p0-p1-p2-p3-p4/)

### 3.2 기존 테스트 시나리오 분석
| 시나리오 | 테스트 수 | 실행 주기 | 대체 PRD |
|---------|----------|----------|---------|
| GENERAL | 4개 | 하루 2회 | Smoke |
| PRECISION | 9개 | 하루 2회 | P1 |
| AUTH | 7개 | 8시간마다 | P0 |
| 404 | 10-20개 | 12시간마다 | P2 |
| SSO | 6-7개 | 6시간마다 | P0 |

### 3.3 프로젝트별 핵심 엔드포인트
| 프로젝트 | 주요 리소스 | 핵심 API |
|---------|-----------|---------|
| WBHubManager | Hubs, Documents, Auth | `/api/hubs`, `/api/documents`, `/api/auth/*` |
| WBSalesHub | Customers, Products, Meetings | `/api/customers`, `/api/products`, `/api/meetings` |
| WBFinHub | Accounts, Transactions, Assets | `/api/accounts`, `/api/transactions`, `/api/assets` |

---

## 4. 테스트 설계

### 4.1 스모크 테스트 (Smoke)
**목적**: 배포 전 최소한의 시스템 가동 확인

**테스트 항목 (4-5개)**:
1. Health Check (`/api/health`)
2. Me 엔드포인트 (`/api/auth/me` 또는 JWT verify)
3. 인증 플로우 (토큰 발급 → 검증)
4. Frontend 접근 (`/`)
5. (선택) Public Key 조회 (`/api/auth/public-key`)

**실행 조건**: 모든 배포 전, 타임아웃 2분

### 4.2 Core API P0 (Critical)
**목적**: 시스템 장애 수준 Critical 기능 검증

**우선순위 기준**: 실패 시 서비스 전체 중단

**테스트 항목**:
1. **인증/보안**: JWT 토큰 발급, 검증, 갱신, 로그아웃
2. **핵심 데이터 조회**: 주요 리소스 목록 조회
3. **데이터베이스 연결**: 기본 CRUD 동작
4. **SSO 통신**: Hub 간 토큰 전달 및 검증

### 4.3 Core API P1 (High)
**목적**: 핵심 기능 오류 수준 High 기능 검증

**우선순위 기준**: 실패 시 핵심 업무 수행 불가

**테스트 항목**:
1. **CRUD 전체**: 생성(POST), 수정(PUT), 삭제(DELETE)
2. **관계 데이터**: 하위 리소스 조회/생성
3. **권한 검증**: 인증 없이 접근 시 401, 권한 없이 접근 시 403
4. **데이터 무결성**: 필수 필드 누락 시 400

### 4.4 Core API P2 (Medium)
**목적**: 부가 기능 오류 수준 Medium 기능 검증

**우선순위 기준**: 실패해도 핵심 업무 가능, 사용자 불편 수준

**테스트 항목**:
1. **검색/필터**: 쿼리 파라미터 기반 필터링
2. **페이지네이션**: limit, offset 동작
3. **404 에러 처리**: 존재하지 않는 리소스 접근
4. **엣지 케이스**: 빈 데이터, 특수문자, 대용량 요청

---

## 5. 프로젝트별 매핑

### 5.1 공통 패턴
모든 프로젝트의 주요 리소스에 대해 동일한 테스트 패턴 적용:
- 목록 조회 (GET /api/{resource})
- 상세 조회 (GET /api/{resource}/:id)
- 생성 (POST /api/{resource})
- 수정 (PUT /api/{resource}/:id)
- 삭제 (DELETE /api/{resource}/:id)

### 5.2 프로젝트별 리소스 매핑
| 테스트 영역 | WBHubManager | WBSalesHub | WBFinHub |
|-----------|--------------|------------|----------|
| 주요 리소스 | Hubs | Customers | Accounts |
| 목록 조회 | `/api/hubs` | `/api/customers` | `/api/accounts` |
| 상세 조회 | `/api/hubs/:id` | `/api/customers/:id` | `/api/accounts/:id` |
| 하위 리소스 | Documents | Contacts, Meetings | Transactions, Wallets |
| 인증 | `/api/auth/verify` | SSO 토큰 검증 | SSO 토큰 검증 |

---

## 6. 작업 계획

### Phase 1: 스모크 테스트 PRD 작성 ✅
- [x] `테스트_작성_Smoke.md` 작성
- [x] 3개 프로젝트 공통 적용 가능한 YAML 템플릿 포함
- [x] 기존 GENERAL 시나리오 대체 매핑

### Phase 2: Core API P0 PRD 작성 ✅
- [x] `테스트_작성_Core-API-P0.md` 작성
- [x] 시스템 장애 수준 테스트 정의
- [x] 기존 AUTH, SSO 시나리오 통합

### Phase 3: Core API P1 PRD 작성 ✅
- [x] `테스트_작성_Core-API-P1.md` 작성
- [x] 핵심 CRUD 테스트 정의
- [x] 기존 PRECISION 시나리오 통합

### Phase 4: Core API P2 PRD 작성 ✅
- [x] `테스트_작성_Core-API-P2.md` 작성
- [x] 부가 기능 테스트 정의
- [x] 기존 404 시나리오 통합

---

## 7. 성공 기준

- [x] 4개 PRD 모두 동일한 구조로 작성
- [x] 각 PRD에 3개 프로젝트 매핑 테이블 포함
- [x] 실행 가능한 YAML 템플릿 포함
- [x] 기존 시나리오 → 신규 PRD 대체 매핑 명시
- [x] ISTQB 우선순위 정의 포함

---

**문서 버전:** 1.0
**작성:** Claude Code
**최종 수정:** 2026-01-02
