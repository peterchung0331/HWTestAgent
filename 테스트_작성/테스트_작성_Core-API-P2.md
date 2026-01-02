# 테스트_작성_Core-API-P2

**작성일:** 2026-01-02
**목적:** 부가 기능 오류 수준 Medium 기능 검증 (검색, 필터, 404, 엣지 케이스)
**대상 프로젝트:** WBHubManager, WBSalesHub, WBFinHub
**ISTQB 분류:** Priority 2 (Medium) - 실패해도 핵심 업무 가능, 사용자 불편 수준

---

## 1. 개요

### 1.1 목적
P2 테스트는 **부가적인 기능과 예외 상황 처리가 정상 동작하는지** 검증합니다. 이 테스트가 실패해도 핵심 업무는 수행 가능하지만, 사용자 경험이 저하될 수 있습니다.

### 1.2 범위
| 검증 영역 | 설명 | 실패 시 영향 |
|----------|------|------------|
| 검색/필터 | 쿼리 파라미터 기반 검색 | 데이터 검색 불편 |
| 페이지네이션 | limit, offset 동작 | 대량 데이터 조회 불편 |
| 404 에러 처리 | 존재하지 않는 리소스 | 에러 메시지 불명확 |
| 엣지 케이스 | 빈 데이터, 특수문자 등 | 예외 상황 대응 미흡 |

### 1.3 ISTQB P2 정의
> **Priority 2 (Medium)**: P2 tasks are medium-priority tasks that contribute to the overall project goals but don't require immediate attention. They include product enhancements and non-critical bugs.
>
> 참조: [P0-P4 Priority Levels](https://fibery.io/blog/product-management/p0-p1-p2-p3-p4/)

### 1.4 기존 시나리오 대체
| 기존 시나리오 | 테스트 수 | 대체 여부 |
|-------------|----------|----------|
| 404 | 10-20개 | **완전 대체** |

---

## 2. 테스트 항목

### 2.1 공통 테스트 항목

#### 2.1.1 검색/필터 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 1 | P2-SEARCH-001 | 키워드 검색 | GET | `/api/{resource}?search=keyword` | 200, 필터된 결과 |
| 2 | P2-SEARCH-002 | 상태 필터 | GET | `/api/{resource}?status=active` | 200, 상태 일치 결과 |
| 3 | P2-SEARCH-003 | 날짜 범위 필터 | GET | `/api/{resource}?from=&to=` | 200, 날짜 범위 내 결과 |
| 4 | P2-SEARCH-004 | 빈 검색 결과 | GET | `/api/{resource}?search=없는키워드` | 200, data: [] |
| 5 | P2-SEARCH-005 | 복합 필터 | GET | `/api/{resource}?status=active&search=` | 200, 복합 조건 결과 |

#### 2.1.2 페이지네이션 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 6 | P2-PAGE-001 | limit 적용 | GET | `/api/{resource}?limit=5` | 200, 최대 5개 |
| 7 | P2-PAGE-002 | offset 적용 | GET | `/api/{resource}?offset=10` | 200, 10번째부터 |
| 8 | P2-PAGE-003 | limit + offset | GET | `/api/{resource}?limit=5&offset=10` | 200, 페이지네이션 |
| 9 | P2-PAGE-004 | 큰 offset (빈 결과) | GET | `/api/{resource}?offset=99999` | 200, data: [] |
| 10 | P2-PAGE-005 | 정렬 옵션 | GET | `/api/{resource}?sort=created_at&order=desc` | 200, 정렬된 결과 |

#### 2.1.3 404 에러 처리 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 11 | P2-404-001 | 존재하지 않는 리소스 조회 | GET | `/api/{resource}/99999` | 404, success: false |
| 12 | P2-404-002 | 존재하지 않는 리소스 수정 | PUT | `/api/{resource}/99999` | 404, success: false |
| 13 | P2-404-003 | 존재하지 않는 리소스 삭제 | DELETE | `/api/{resource}/99999` | 404, success: false |
| 14 | P2-404-004 | 존재하지 않는 하위 리소스 | GET | `/api/{parent}/99999/{child}` | 404 |
| 15 | P2-404-005 | 잘못된 API 경로 | GET | `/api/nonexistent` | 404 |

#### 2.1.4 엣지 케이스 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 조건 | 예상 결과 |
|-----|----------|---------|-------|------|----------|
| 16 | P2-EDGE-001 | 특수문자 검색 | GET | `?search=<script>` | 200, 안전한 처리 |
| 17 | P2-EDGE-002 | 한글 검색 | GET | `?search=테스트` | 200, 한글 지원 |
| 18 | P2-EDGE-003 | 공백만 있는 검색 | GET | `?search=   ` | 200, 빈 결과 또는 전체 |
| 19 | P2-EDGE-004 | 매우 긴 검색어 | GET | `?search=[500자]` | 400 또는 200 (truncate) |
| 20 | P2-EDGE-005 | SQL Injection 시도 | GET | `?search='; DROP TABLE--` | 200, 안전한 처리 |

### 2.2 프로젝트별 매핑 테이블

| 테스트 ID | WBHubManager | WBSalesHub | WBFinHub |
|----------|--------------|------------|----------|
| P2-SEARCH-* | `/api/documents/search` | `/api/customers?search=` | `/api/transactions?filter=` |
| P2-PAGE-* | `/api/hubs?limit=&offset=` | `/api/customers?limit=` | `/api/accounts?limit=` |
| P2-404-001~003 | `/api/hubs/99999` | `/api/customers/99999` | `/api/accounts/99999` |
| P2-404-004 | `/api/hubs/99999/documents` | `/api/customers/99999/contacts` | `/api/accounts/99999/wallets` |

### 2.3 프로젝트별 404 테스트 대상

#### WBHubManager
| 리소스 | GET | PUT | DELETE |
|-------|-----|-----|--------|
| Hubs | `/api/hubs/99999` | N/A | N/A |
| Documents | `/api/documents/hub/cat/99999` | `/api/documents/hub/cat/99999` | `/api/documents/hub/cat/99999` |

#### WBSalesHub
| 리소스 | GET | PUT | DELETE |
|-------|-----|-----|--------|
| Customers | `/api/customers/99999` | `/api/customers/99999` | `/api/customers/99999` |
| Contacts | `/api/contacts/99999` | `/api/contacts/99999` | `/api/contacts/99999` |
| Meetings | `/api/meetings/99999` | `/api/meetings/99999` | `/api/meetings/99999` |
| Products | `/api/products/99999` | `/api/products/99999` | `/api/products/99999` |

#### WBFinHub
| 리소스 | GET | PUT | DELETE |
|-------|-----|-----|--------|
| Accounts | `/api/accounts/99999` | `/api/accounts/99999` | `/api/accounts/99999` |
| Transactions | `/api/transactions/99999` | `/api/transactions/99999` | `/api/transactions/99999` |
| Wallets | `/api/wallets/99999` | `/api/wallets/99999` | `/api/wallets/99999` |
| Assets | `/api/assets/99999` | `/api/assets/99999` | `/api/assets/99999` |

---

## 3. 테스트 시나리오 YAML 템플릿

### 3.1 WBHubManager용 P2 테스트

```yaml
# HWTestAgent/scenarios/wbhubmanager/core-api-p2.yaml
name: "WBHubManager Core API P2 Test"
description: "부가 기능 검증 - 검색, 페이지네이션, 404, 엣지 케이스"
type: CORE_API_P2
version: "2.0"

variables:
  PROJECT_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 12 * * *"  # 매일 정오
  on_deploy: false    # 배포 시 실행 안 함

timeout: 300000  # 5분

notify_on:
  - failure

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: 토큰 발급"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  # ===== 검색/필터 테스트 =====
  - name: "P2-SEARCH-001: 문서 키워드 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/search?q=test"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-002: Hub 필터 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents?hub=wbhubmanager"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-004: 빈 검색 결과"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/search?q=존재하지않는검색어xyz123"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  # ===== 페이지네이션 테스트 =====
  - name: "P2-PAGE-001: limit 적용"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs?limit=2"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-PAGE-004: 큰 offset (빈 결과)"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs?offset=99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 404 에러 처리 테스트 =====
  - name: "P2-404-001: 존재하지 않는 Hub 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs/nonexistent-hub-99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404
      json:
        success: false

  - name: "P2-404-002: 존재하지 않는 Document 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/hub/category/nonexistent-99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-003: 존재하지 않는 Document 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/documents/hub/category/nonexistent-99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        title: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-004: 존재하지 않는 Document 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/documents/hub/category/nonexistent-99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-005: 잘못된 API 경로"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/nonexistent-endpoint"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 엣지 케이스 테스트 =====
  - name: "P2-EDGE-001: 특수문자 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/search?q=<script>alert(1)</script>"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-EDGE-002: 한글 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/search?q=테스트"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-EDGE-005: SQL Injection 시도"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/search?q='; DROP TABLE documents;--"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
```

### 3.2 WBSalesHub용 P2 테스트

```yaml
# HWTestAgent/scenarios/wbsaleshub/core-api-p2.yaml
name: "WBSalesHub Core API P2 Test"
description: "부가 기능 검증 - 검색, 페이지네이션, 404"
type: CORE_API_P2
version: "2.0"

variables:
  PROJECT_URL: "https://wbsaleshub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 12 * * *"
  on_deploy: false

timeout: 300000

notify_on:
  - failure

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: HubManager 토큰 발급"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  # ===== 검색/필터 테스트 =====
  - name: "P2-SEARCH-001: Customer 키워드 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?search=test"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-002: Customer 상태 필터"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?status=active"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-004: 빈 검색 결과"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?search=없는고객이름xyz123"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  # ===== 페이지네이션 테스트 =====
  - name: "P2-PAGE-001: limit 적용"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?limit=5"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-PAGE-003: limit + offset"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?limit=5&offset=10"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 404 에러 처리 테스트 - Customers =====
  - name: "P2-404-001: 존재하지 않는 Customer 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404
      json:
        success: false

  - name: "P2-404-002: 존재하지 않는 Customer 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/customers/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-003: 존재하지 않는 Customer 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/customers/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - Contacts =====
  - name: "P2-404-004: 존재하지 않는 Contact 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/contacts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-005: 존재하지 않는 Contact 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/contacts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-006: 존재하지 않는 Contact 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/contacts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - Meetings =====
  - name: "P2-404-007: 존재하지 않는 Meeting 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/meetings/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-008: 존재하지 않는 Meeting 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/meetings/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        title: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-009: 존재하지 않는 Meeting 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/meetings/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - 하위 리소스 =====
  - name: "P2-404-010: 존재하지 않는 Customer의 Contacts"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/99999/contacts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 엣지 케이스 테스트 =====
  - name: "P2-EDGE-001: 특수문자 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?search=<script>"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P2-EDGE-002: 한글 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers?search=테스트"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
```

### 3.3 WBFinHub용 P2 테스트

```yaml
# HWTestAgent/scenarios/wbfinhub/core-api-p2.yaml
name: "WBFinHub Core API P2 Test"
description: "부가 기능 검증 - 검색, 페이지네이션, 404"
type: CORE_API_P2
version: "2.0"

variables:
  PROJECT_URL: "https://wbfinhub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 12 * * *"
  on_deploy: false

timeout: 300000

notify_on:
  - failure

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: HubManager 토큰 발급"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  # ===== 검색/필터 테스트 =====
  - name: "P2-SEARCH-001: Account 키워드 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts?search=test"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-002: Transaction 타입 필터"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/transactions?type=deposit"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-SEARCH-003: Transaction 날짜 범위 필터"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/transactions?from=2025-01-01&to=2025-12-31"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 페이지네이션 테스트 =====
  - name: "P2-PAGE-001: limit 적용"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts?limit=5"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "P2-PAGE-003: limit + offset"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/transactions?limit=10&offset=20"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 404 에러 처리 테스트 - Accounts =====
  - name: "P2-404-001: 존재하지 않는 Account 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404
      json:
        success: false

  - name: "P2-404-002: 존재하지 않는 Account 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/accounts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-003: 존재하지 않는 Account 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/accounts/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - Transactions =====
  - name: "P2-404-004: 존재하지 않는 Transaction 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/transactions/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-005: 존재하지 않는 Transaction 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/transactions/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        description: "수정 시도"
    expect:
      status: 404

  - name: "P2-404-006: 존재하지 않는 Transaction 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/transactions/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - Wallets =====
  - name: "P2-404-007: 존재하지 않는 Wallet 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/wallets/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-008: 존재하지 않는 Wallet 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/wallets/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "수정 시도"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - Assets =====
  - name: "P2-404-009: 존재하지 않는 Asset 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/assets/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-010: 존재하지 않는 Asset 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/assets/99999"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "수정 시도"
    expect:
      status: 404

  # ===== 404 에러 처리 테스트 - 하위 리소스 =====
  - name: "P2-404-011: 존재하지 않는 Account의 Wallets"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/99999/wallets"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  - name: "P2-404-012: 존재하지 않는 Account의 Transactions"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/99999/transactions"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 엣지 케이스 테스트 =====
  - name: "P2-EDGE-001: 특수문자 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts?search=<script>"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P2-EDGE-002: 한글 검색"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts?search=테스트"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P2-EDGE-005: SQL Injection 시도"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts?search='; DROP TABLE accounts;--"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
```

---

## 4. 실행 조건

### 4.1 실행 주기
| 트리거 | 조건 | 우선순위 |
|-------|------|---------|
| 정기 실행 | 매일 1회 (정오) | 낮음 |
| 기능 변경 시 | 검색/필터 기능 변경 시 | 중간 |
| 수동 실행 | QA 팀 요청 시 | 선택 |

### 4.2 타임아웃 설정
| 항목 | 값 | 설명 |
|-----|---|------|
| 전체 타임아웃 | 300초 (5분) | 모든 테스트 완료 기준 |
| 개별 요청 타임아웃 | 10초 | 일반 조회 요청 |
| 재시도 횟수 | 1회 | P2는 재시도 최소화 |

### 4.3 실행 순서
```
Smoke Test (PASSED) → P0 Test (PASSED) → P1 Test (PASSED) → P2 Test
                                                               ↑
                                                           현재 위치
```

---

## 5. 성공/실패 기준

### 5.1 Pass 조건
- [ ] 모든 검색/필터 테스트(P2-SEARCH-*) 통과
- [ ] 모든 페이지네이션 테스트(P2-PAGE-*) 통과
- [ ] 모든 404 테스트(P2-404-*) 통과
- [ ] 모든 엣지 케이스 테스트(P2-EDGE-*) 통과

### 5.2 Fail 조건
| 조건 | 심각도 | 조치 |
|-----|-------|------|
| 404 반환 안 함 | **Medium** | 에러 핸들링 점검 |
| 검색 기능 오류 | **Medium** | 검색 로직 점검 |
| 페이지네이션 오류 | **Low** | 쿼리 로직 점검 |
| SQL Injection 취약점 | **High** | 즉시 보안 패치 |

### 5.3 배포 차단 기준
```
P2 테스트 실패 시:
├── 보안 관련 (SQL Injection 등) 실패 → 배포 차단
├── 404 에러 처리 실패 → 배포 진행 (권고 사항)
└── 검색/필터 실패 → 배포 진행 (개선 사항)

P2 테스트는 배포 필수 조건이 아니지만,
보안 관련 테스트 실패는 즉시 대응 필요
```

---

## 6. 기존 시나리오 대체 매핑

### 6.1 대체되는 기존 시나리오

| 기존 파일 | 신규 파일 | 대체 범위 |
|----------|----------|----------|
| `wbhubmanager/404.yaml` | `wbhubmanager/core-api-p2.yaml` | 완전 대체 |
| `wbhubmanager/404-*.yaml` | `wbhubmanager/core-api-p2-*.yaml` | 완전 대체 |
| `wbsaleshub/404.yaml` | `wbsaleshub/core-api-p2.yaml` | 완전 대체 |
| `wbsaleshub/404-*.yaml` | `wbsaleshub/core-api-p2-*.yaml` | 완전 대체 |
| `wbfinhub/404.yaml` | `wbfinhub/core-api-p2.yaml` | 완전 대체 |
| `wbfinhub/404-*.yaml` | `wbfinhub/core-api-p2-*.yaml` | 완전 대체 |

### 6.2 마이그레이션 체크리스트
- [ ] 기존 `404.yaml` 백업
- [ ] 신규 `core-api-p2.yaml` 파일 생성
- [ ] 검색/필터 테스트 추가 (기존 404에 없던 항목)
- [ ] 엣지 케이스 테스트 추가 (기존 404에 없던 항목)
- [ ] 환경별 변수 파일 생성
- [ ] 스케줄러 업데이트 (주기 변경: 12시간 → 매일 정오)
- [ ] 테스트 실행 및 검증

---

## 7. 테스트 커버리지 요약

### 7.1 기존 vs 신규 비교

| 항목 | 기존 404 테스트 | 신규 P2 테스트 |
|-----|---------------|---------------|
| 테스트 수 | 10-20개 | 15-20개 |
| 검색/필터 | 없음 | **추가** |
| 페이지네이션 | 없음 | **추가** |
| 엣지 케이스 | 없음 | **추가** |
| 404 에러 | 있음 | 유지 |
| 실행 주기 | 12시간마다 | 매일 1회 |

### 7.2 테스트 타입별 분포
```
P2 테스트 구성:
├── 검색/필터: 5개 (25%)
├── 페이지네이션: 5개 (25%)
├── 404 에러: 5-10개 (40%)
└── 엣지 케이스: 3-5개 (10%)
```

---

**문서 버전:** 1.0
**작성:** Claude Code
**최종 수정:** 2026-01-02
