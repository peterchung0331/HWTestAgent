# HWTestAgent API Documentation

## Base URL

```
http://localhost:4100/api
```

## Authentication

일부 엔드포인트는 API Key 인증이 필요합니다.

```bash
curl -H "X-API-Key: your-api-key" http://localhost:4100/api/test/run
```

---

## Error Pattern API

### GET /error-patterns

에러 패턴 목록을 조회합니다.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | 검색어 (에러 메시지) |
| project | string | No | 프로젝트 필터 (WBHubManager, WBSalesHub 등) |
| category | string | No | 카테고리 필터 (TIMEOUT, DATABASE, AUTH, NETWORK, VALIDATION, RUNTIME, API, UNKNOWN) |
| limit | number | No | 결과 개수 (기본: 20) |
| offset | number | No | 오프셋 (기본: 0) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project_name": "WBHubManager",
      "error_message": "Connection refused",
      "error_category": "NETWORK",
      "error_hash": "abc123...",
      "occurrence_count": 5,
      "first_seen": "2026-01-10T00:00:00Z",
      "last_seen": "2026-01-14T00:00:00Z"
    }
  ]
}
```

---

### GET /error-patterns/:id

특정 에러 패턴과 솔루션을 조회합니다.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | 에러 패턴 ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "pattern": {
      "id": 1,
      "project_name": "WBHubManager",
      "error_message": "Connection refused",
      "error_category": "NETWORK",
      "occurrence_count": 5
    },
    "solutions": [
      {
        "id": 1,
        "solution_title": "DATABASE_URL 확인",
        "solution_description": "PostgreSQL 연결 문자열 확인",
        "solution_steps": ["DATABASE_URL 환경변수 확인", "PostgreSQL 서버 실행 상태 확인"],
        "success_rate": 95.0,
        "times_applied": 10
      }
    ]
  }
}
```

---

### POST /error-patterns/record

에러 발생을 기록하고 유사 패턴을 검색합니다.

**Request Body:**
```json
{
  "error_message": "Connection refused at localhost:5432",
  "error_hash": "md5_hash_of_error",
  "project_name": "WBHubManager",
  "environment": "local",
  "error_category": "NETWORK",
  "stack_trace": "Error: Connection refused\n    at ...",
  "context_info": {
    "test_type": "e2e",
    "browser": "chromium"
  },
  "test_run_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "occurrence": {
      "id": 1,
      "error_pattern_id": 5,
      "environment": "local",
      "resolved": false
    },
    "pattern": {
      "id": 5,
      "project_name": "WBHubManager",
      "error_message": "Connection refused",
      "occurrence_count": 6
    },
    "similar_patterns": [
      {
        "id": 3,
        "error_message": "ECONNREFUSED",
        "occurrence_count": 2
      }
    ]
  }
}
```

---

### GET /error-patterns/stats

에러 패턴 통계를 조회합니다.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project | string | No | 프로젝트 필터 |

**Response:**
```json
{
  "success": true,
  "data": {
    "total_patterns": 25,
    "total_occurrences": 150,
    "by_category": {
      "NETWORK": 10,
      "TIMEOUT": 8,
      "AUTH": 5,
      "DATABASE": 2
    },
    "by_project": {
      "WBHubManager": 12,
      "WBSalesHub": 8,
      "WBFinHub": 5
    }
  }
}
```

---

## Template API

### GET /templates

테스트 스크립트 템플릿 목록을 조회합니다.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | 템플릿 타입 (e2e, integration, unit) |
| tags | string[] | No | 태그 필터 (복수 가능) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "template_name": "e2e-google-oauth-login",
      "template_type": "e2e",
      "description": "Google OAuth 자동 로그인 테스트",
      "variables": {
        "BASE_URL": "string",
        "TEST_USER_EMAIL": "string",
        "TEST_USER_PASSWORD": "string"
      },
      "tags": ["sso", "oauth", "login"],
      "times_used": 15,
      "success_rate": 92.5
    }
  ]
}
```

---

### GET /templates/:id

특정 템플릿을 조회합니다.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | 템플릿 ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "template_name": "e2e-google-oauth-login",
    "template_type": "e2e",
    "script_content": "import { test } from '@playwright/test';\n\ntest('Google OAuth Login', async ({ page }) => {\n  await page.goto('{{BASE_URL}}');\n  // ...\n});",
    "variables": {
      "BASE_URL": "string",
      "TEST_USER_EMAIL": "string"
    }
  }
}
```

---

### POST /templates/:id/generate

템플릿에서 테스트 스크립트를 생성합니다.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | 템플릿 ID |

**Request Body:**
```json
{
  "variables": {
    "BASE_URL": "http://localhost:3090",
    "TEST_USER_EMAIL": "test@example.com",
    "TEST_USER_PASSWORD": "password123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "script": "import { test } from '@playwright/test';\n\ntest('Google OAuth Login', async ({ page }) => {\n  await page.goto('http://localhost:3090');\n  // ...\n});",
    "template_name": "e2e-google-oauth-login"
  }
}
```

---

## Test Run API

### POST /test/run

테스트 시나리오를 실행합니다. (API Key 필요)

**Request Body:**
```json
{
  "project": "WBHubManager",
  "scenario": "smoke",
  "environment": "production",
  "auto_fix": true,
  "max_retry": 3,
  "triggered_by": "manual",
  "stop_on_failure": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test run started",
  "data": {
    "status": "RUNNING"
  }
}
```

---

### GET /test/results

최근 테스트 결과 목록을 조회합니다.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | 결과 개수 (기본: 10) |
| project | string | No | 프로젝트 필터 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project_name": "WBHubManager",
      "scenario_slug": "smoke",
      "status": "PASSED",
      "total_steps": 10,
      "passed_steps": 10,
      "failed_steps": 0,
      "started_at": "2026-01-14T10:00:00Z",
      "completed_at": "2026-01-14T10:05:00Z"
    }
  ]
}
```

---

### GET /test/results/:id

특정 테스트 실행 결과를 조회합니다.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | 테스트 실행 ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "run": {
      "id": 1,
      "project_name": "WBHubManager",
      "scenario_slug": "smoke",
      "status": "PASSED"
    },
    "steps": [
      {
        "id": 1,
        "name": "Check health endpoint",
        "status": "PASSED",
        "duration_ms": 150
      }
    ]
  }
}
```

---

### GET /test/stats/:project

프로젝트별 테스트 통계를 조회합니다.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project | string | Yes | 프로젝트 이름 |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| days | number | No | 통계 기간 (기본: 30일) |

---

## Health Check

### GET /health

API 서버 상태를 확인합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-14T10:00:00Z",
    "version": "1.0.0"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - 잘못된 요청 파라미터 |
| 401 | Unauthorized - API Key 누락 또는 잘못됨 |
| 404 | Not Found - 리소스를 찾을 수 없음 |
| 500 | Internal Server Error - 서버 내부 오류 |

---

## 사용 예시

### 에러 발생 시 솔루션 검색

```bash
# 1. 에러 기록
curl -X POST http://localhost:4100/api/error-patterns/record \
  -H "Content-Type: application/json" \
  -d '{
    "error_message": "Connection refused",
    "error_hash": "abc123",
    "project_name": "WBHubManager",
    "environment": "local",
    "error_category": "NETWORK"
  }'

# 2. 유사 에러 검색
curl "http://localhost:4100/api/error-patterns?query=Connection&project=WBHubManager"

# 3. 솔루션 조회
curl "http://localhost:4100/api/error-patterns/1"
```

### 템플릿에서 테스트 스크립트 생성

```bash
# 1. 템플릿 검색
curl "http://localhost:4100/api/templates?type=e2e&tags=oauth"

# 2. 스크립트 생성
curl -X POST http://localhost:4100/api/templates/1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "BASE_URL": "http://localhost:3090",
      "TEST_USER_EMAIL": "biz.dev@wavebridge.com",
      "TEST_USER_PASSWORD": "wave1234!!"
    }
  }'
```
