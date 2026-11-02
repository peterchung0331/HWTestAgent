# WorkHub Probe (formerly HWTestAgent)

AI 기반 24/7 자동 테스트 시스템 — Playwright 테스트 실행, 에러 패턴 DB, 테스트 리포트 생성.

## WorkHub Ecosystem

| Repo | Path | Role | Ports (FE/BE) |
|------|------|------|---------------|
| WBHubManager | /mnt/c/GitHub/WBHubManager | SSO 인증, 허브관리, AI 페르소나 | 3090/4090 |
| WBSalesHub | /mnt/c/GitHub/WBSalesHub | CRM, Reno AI, Slack 연동 | 3010/4010 |
| WBFinHub | /mnt/c/GitHub/WBFinHub | 딜관리, CSV import, Fireblocks | 3020/4020 |
| WBOnboardingHub | /mnt/c/GitHub/WBOnboardingHub | 고객 온보딩, GCP Vision | - |
| **WorkHub Probe** | /mnt/c/GitHub/HWTestAgent | 테스트 자동화, 에러패턴DB | 3080/4080 |
| WHCommon | /mnt/c/GitHub/WHCommon | 공유 문서, 아키텍처, 스크립트 | - |

## Tech Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Testing**: Playwright (브라우저 자동화)
- **Server**: Express.js (에러 패턴, 테스트 실행 API)
- **DB**: PostgreSQL (에러 패턴, 테스트 결과)

## Key Directories
```
src/server/      # Express API 서버
src/runner/      # 테스트 러너 엔진
src/services/    # 핵심 서비스
src/storage/     # 데이터 저장
src/utils/       # 유틸리티
src/notification/ # 알림 시스템
scenarios/       # 허브별 테스트 시나리오 (wbhubmanager/, wbsaleshub/)
scripts/         # DB 마이그레이션, 시드
```

## Commands
```bash
npm run dev          # Dev 서버
npm run build        # TypeScript 컴파일
npm run db:migrate   # DB 마이그레이션
npm run db:seed      # 테스트 데이터 시드
```

## Error Pattern DB API
- 검색: `GET /api/error-patterns?query=키워드`
- 상세: `GET /api/error-patterns/:id`
- 등록: `POST /api/error-patterns/record`
- URL: http://workhub.biz/probe/api/error-patterns
