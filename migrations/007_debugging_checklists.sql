-- Migration 007: Debugging Checklists System
-- 디버깅 체크리스트 시스템 - 에러 패턴 분석 기반 코드 컨벤션
-- Date: 2026-01-17

-- ============================================
-- Debugging Checklists Tables
-- ============================================

-- Debugging Checklists Table (체크리스트 메타데이터)
CREATE TABLE IF NOT EXISTS debugging_checklists (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,           -- 'sso', 'docker', 'database', 'nginx', 'api'
  title VARCHAR(200) NOT NULL,             -- '허브 간 SSO 인증 체크리스트'
  description TEXT,                        -- 체크리스트 설명
  scope VARCHAR(20) DEFAULT 'both',        -- 'implementation', 'debugging', 'both'
  applicable_projects TEXT[],              -- ['WBHubManager', 'WBSalesHub', 'WBFinHub']
  priority INTEGER DEFAULT 0,              -- 정렬 우선순위 (높을수록 먼저)
  version VARCHAR(10) DEFAULT '1.0',       -- 버전 관리
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Checklist Items Table (체크리스트 항목)
CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES debugging_checklists(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,             -- 표시 순서

  -- 체크 항목 내용
  title VARCHAR(200) NOT NULL,             -- '쿠키 이름 통일 확인'
  description TEXT,                        -- 상세 설명
  severity VARCHAR(20) DEFAULT 'medium',   -- 'critical', 'high', 'medium', 'low'

  -- 코드 예시
  code_example TEXT,                       -- 올바른 코드 예시
  anti_pattern TEXT,                       -- 잘못된 코드 예시

  -- 에러 패턴 연결
  related_error_pattern_ids INTEGER[],     -- 관련 에러 패턴 ID 배열

  -- 참고 자료
  reference_docs TEXT[],                   -- 참고 문서 링크
  keywords TEXT[],                         -- 검색 키워드

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Debugging Checklists Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_category_title ON debugging_checklists(category, title);
CREATE INDEX IF NOT EXISTS idx_checklist_category ON debugging_checklists(category);
CREATE INDEX IF NOT EXISTS idx_checklist_scope ON debugging_checklists(scope);
CREATE INDEX IF NOT EXISTS idx_checklist_active ON debugging_checklists(is_active) WHERE is_active = TRUE;

-- Checklist Items Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_items_order ON checklist_items(checklist_id, item_order);
CREATE INDEX IF NOT EXISTS idx_checklist_items_severity ON checklist_items(severity);
CREATE INDEX IF NOT EXISTS idx_checklist_items_keywords ON checklist_items USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_checklist_items_error_patterns ON checklist_items USING gin(related_error_pattern_ids);

-- ============================================
-- Triggers for Automatic Updates
-- ============================================

-- Update debugging_checklists updated_at timestamp
CREATE OR REPLACE FUNCTION update_debugging_checklists_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_debugging_checklists_timestamp ON debugging_checklists;
CREATE TRIGGER trigger_update_debugging_checklists_timestamp
BEFORE UPDATE ON debugging_checklists
FOR EACH ROW
EXECUTE FUNCTION update_debugging_checklists_timestamp();

-- Update checklist_items updated_at timestamp
CREATE OR REPLACE FUNCTION update_checklist_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_checklist_items_timestamp ON checklist_items;
CREATE TRIGGER trigger_update_checklist_items_timestamp
BEFORE UPDATE ON checklist_items
FOR EACH ROW
EXECUTE FUNCTION update_checklist_items_timestamp();

-- ============================================
-- Views
-- ============================================

-- Checklists with Item Counts View
CREATE OR REPLACE VIEW v_checklists_summary AS
SELECT
  dc.id,
  dc.category,
  dc.title,
  dc.description,
  dc.scope,
  dc.applicable_projects,
  dc.priority,
  dc.version,
  dc.is_active,
  COUNT(ci.id) as item_count,
  COUNT(CASE WHEN ci.severity = 'critical' THEN 1 END) as critical_count,
  COUNT(CASE WHEN ci.severity = 'high' THEN 1 END) as high_count,
  dc.created_at,
  dc.updated_at
FROM debugging_checklists dc
LEFT JOIN checklist_items ci ON dc.id = ci.checklist_id
WHERE dc.is_active = TRUE
GROUP BY dc.id
ORDER BY dc.priority DESC, dc.category, dc.title;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE debugging_checklists IS '디버깅 및 구현 체크리스트 - 에러 패턴 기반 코드 컨벤션';
COMMENT ON TABLE checklist_items IS '체크리스트 개별 항목';

COMMENT ON COLUMN debugging_checklists.category IS '체크리스트 카테고리 (sso, docker, database, nginx, api 등)';
COMMENT ON COLUMN debugging_checklists.scope IS '적용 범위 (implementation: 구현, debugging: 디버깅, both: 둘 다)';
COMMENT ON COLUMN debugging_checklists.applicable_projects IS '적용 가능 프로젝트 배열';

COMMENT ON COLUMN checklist_items.severity IS '심각도 (critical, high, medium, low)';
COMMENT ON COLUMN checklist_items.code_example IS '올바른 코드 예시';
COMMENT ON COLUMN checklist_items.anti_pattern IS '피해야 할 코드 패턴';
COMMENT ON COLUMN checklist_items.related_error_pattern_ids IS '연결된 에러 패턴 ID 배열';

-- ============================================
-- Initial Data: SSO Checklist
-- ============================================

-- SSO 구현 체크리스트
INSERT INTO debugging_checklists (category, title, description, scope, applicable_projects, priority)
VALUES (
  'sso',
  '허브 간 SSO 인증 체크리스트',
  'HubManager와 다른 허브 간 SSO 인증 구현/디버깅 시 확인할 항목. 쿠키 기반 인증, OAuth 플로우, 리디렉트 처리 등 포함.',
  'both',
  ARRAY['WBHubManager', 'WBSalesHub', 'WBFinHub', 'WBOnboardingHub', 'WBRefHub'],
  100
)
ON CONFLICT (category, title) DO UPDATE SET
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  applicable_projects = EXCLUDED.applicable_projects,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- SSO 체크리스트 항목들
WITH sso_checklist AS (
  SELECT id FROM debugging_checklists WHERE category = 'sso' AND title = '허브 간 SSO 인증 체크리스트'
)
INSERT INTO checklist_items (checklist_id, item_order, title, description, severity, code_example, anti_pattern, related_error_pattern_ids, keywords)
VALUES
-- 구현 체크 항목
(
  (SELECT id FROM sso_checklist), 1,
  '쿠키 이름 통일 (wbhub_access_token)',
  '모든 허브에서 동일한 쿠키 이름 사용. HubManager가 설정하는 이름(wbhub_access_token)과 일치해야 함.',
  'critical',
  E'// 올바른 예시\nconst accessToken = req.cookies.wbhub_access_token;\nconst refreshToken = req.cookies.wbhub_refresh_token;',
  E'// 잘못된 예시 - 쿠키 이름 불일치\nconst accessToken = req.cookies.wb_access_token;\nconst accessToken = req.cookies.access_token;',
  ARRAY[36],
  ARRAY['cookie', 'token', 'wbhub_access_token', '쿠키', '토큰']
),
(
  (SELECT id FROM sso_checklist), 2,
  'HubManager URL 환경변수 확인',
  'HUB_MANAGER_URL 환경변수가 올바른 프로토콜과 포트를 사용하는지 확인. 스테이징은 HTTP:4400, 프로덕션은 HTTPS.',
  'critical',
  E'# .env.staging\nHUB_MANAGER_URL=http://staging.workhub.biz:4400\n\n# .env.prd\nHUB_MANAGER_URL=https://workhub.biz',
  E'# 잘못된 예시 - HTTPS로 HTTP 포트 접근\nHUB_MANAGER_URL=https://staging.workhub.biz:4400',
  ARRAY[37, 8],
  ARRAY['HUB_MANAGER_URL', '환경변수', 'URL', 'staging', 'production']
),
(
  (SELECT id FROM sso_checklist), 3,
  'cookie-parser 미들웨어 등록',
  'Express 앱에서 쿠키를 읽으려면 cookie-parser 미들웨어가 반드시 등록되어 있어야 함.',
  'critical',
  E'// server/index.ts\nimport cookieParser from ''cookie-parser'';\n\napp.use(cookieParser());',
  E'// 잘못된 예시 - 미들웨어 미등록 시\nreq.cookies // undefined\nreq.cookies.wbhub_access_token // Cannot read properties of undefined',
  ARRAY[35],
  ARRAY['cookie-parser', 'middleware', '미들웨어', 'express']
),
(
  (SELECT id FROM sso_checklist), 4,
  'Express basePath 설정 확인',
  'Nginx 프록시 뒤에서 동작하는 경우 Express 라우터에 basePath 설정 필요. /saleshub, /finhub 등.',
  'high',
  E'// authRoutes.ts\nrouter.get(''/sso-complete'', handler);\n\n// server/index.ts\napp.use(''/saleshub/auth'', authRoutes);',
  E'// 잘못된 예시 - basePath 누락\napp.use(''/auth'', authRoutes);\n// 결과: /saleshub/auth/sso-complete → 404',
  ARRAY[32],
  ARRAY['basePath', 'router', 'express', 'nginx', '라우팅']
),
(
  (SELECT id FROM sso_checklist), 5,
  'redirect_uri 파라미터 검증',
  'OAuth 콜백 후 리디렉트할 URI가 올바른지 확인. 잘못된 redirect_uri는 무한 리디렉트 유발.',
  'high',
  E'// getLoginUrl 헬퍼 사용\nconst loginUrl = getLoginUrl({\n  hubManagerUrl: process.env.HUB_MANAGER_URL,\n  redirectUri: `${req.protocol}://${req.get(''host'')}/saleshub/auth/sso-complete`,\n  accountId: account.id\n});',
  E'// 잘못된 예시 - 절대 경로 하드코딩\nconst loginUrl = `http://hubmanager/login?redirect_uri=/dashboard`;',
  ARRAY[8],
  ARRAY['redirect_uri', 'OAuth', 'callback', '리디렉트', 'getLoginUrl']
),
(
  (SELECT id FROM sso_checklist), 6,
  '쿠키 도메인/경로 설정',
  '허브 간 쿠키 공유를 위해 도메인과 경로 설정 확인. 프로덕션에서는 .workhub.biz 도메인 사용.',
  'medium',
  E'res.cookie(''wbhub_access_token'', token, {\n  httpOnly: true,\n  secure: process.env.NODE_ENV === ''production'',\n  sameSite: ''lax'',\n  domain: ''.workhub.biz'',  // 프로덕션\n  path: ''/''\n});',
  E'// 잘못된 예시 - 도메인 미설정 시 하위 도메인 공유 불가\nres.cookie(''token'', value);',
  NULL,
  ARRAY['cookie', 'domain', 'path', 'httpOnly', 'secure', 'sameSite']
),
(
  (SELECT id FROM sso_checklist), 7,
  'Enum 대소문자 통일 (소문자)',
  'DB의 Enum 값과 코드의 비교 값이 일치하는지 확인. PostgreSQL enum은 소문자 사용.',
  'medium',
  E'// 올바른 예시 - 소문자 사용\nif (account.status === ''active'') {\nif (user.role === ''admin'') {',
  E'// 잘못된 예시 - 대소문자 불일치\nif (account.status === ''ACTIVE'') {  // DB는 ''active''\nif (user.role === ''Admin'') {',
  ARRAY[34, 39],
  ARRAY['enum', '대소문자', 'status', 'role', 'PostgreSQL']
),

-- 디버깅 체크 항목
(
  (SELECT id FROM sso_checklist), 8,
  '브라우저 쿠키 확인 (DevTools)',
  '개발자 도구 > Application > Cookies에서 wbhub_access_token, wbhub_refresh_token 쿠키 존재 여부 확인.',
  'critical',
  E'// DevTools Console에서 확인\ndocument.cookie\n\n// 쿠키 확인 사항:\n// 1. wbhub_access_token 존재 여부\n// 2. 도메인이 현재 사이트와 일치하는지\n// 3. 만료 시간이 유효한지',
  NULL,
  NULL,
  ARRAY['DevTools', 'cookie', '브라우저', '디버깅', 'Application']
),
(
  (SELECT id FROM sso_checklist), 9,
  '네트워크 탭에서 리디렉트 추적',
  'DevTools Network 탭에서 302 리디렉트 체인 확인. 무한 루프 패턴 탐지.',
  'high',
  E'// Network 탭 확인 사항:\n// 1. Preserve log 체크\n// 2. 302 응답의 Location 헤더 확인\n// 3. 리디렉트 체인이 순환하는지 확인\n// 4. Set-Cookie 헤더가 올바른지 확인',
  NULL,
  ARRAY[8],
  ARRAY['Network', 'redirect', '302', '리디렉트', '무한루프']
),
(
  (SELECT id FROM sso_checklist), 10,
  '환경변수 런타임 값 확인',
  'Docker 컨테이너 또는 서버에서 실제 환경변수 값 확인. 빌드타임 vs 런타임 값 차이 주의.',
  'high',
  E'# Docker 컨테이너 환경변수 확인\ndocker exec <container> env | grep HUB_MANAGER\n\n# Node.js 런타임 확인\nconsole.log(''HUB_MANAGER_URL:'', process.env.HUB_MANAGER_URL);',
  NULL,
  ARRAY[37, 10],
  ARRAY['환경변수', 'docker', 'env', 'runtime', 'HUB_MANAGER_URL']
),
(
  (SELECT id FROM sso_checklist), 11,
  'Docker 컨테이너 환경변수',
  'docker-compose.yml의 environment 섹션과 .env 파일이 올바르게 연결되었는지 확인.',
  'medium',
  E'# docker-compose.yml\nservices:\n  backend:\n    environment:\n      - HUB_MANAGER_URL=${HUB_MANAGER_URL}\n      - JWT_SECRET=${JWT_SECRET}\n    env_file:\n      - .env.staging',
  NULL,
  NULL,
  ARRAY['docker-compose', 'environment', 'env_file', 'Docker']
),
(
  (SELECT id FROM sso_checklist), 12,
  'Nginx 프록시 설정 확인',
  'Nginx가 올바른 upstream으로 프록시하는지, 헤더가 제대로 전달되는지 확인.',
  'medium',
  E'# nginx 설정 확인\nlocation /saleshub/ {\n  proxy_pass http://wbsaleshub:4010/;\n  proxy_set_header Host $host;\n  proxy_set_header X-Real-IP $remote_addr;\n  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n  proxy_set_header X-Forwarded-Proto $scheme;\n  proxy_set_header Cookie $http_cookie;\n}',
  NULL,
  ARRAY[28, 30],
  ARRAY['nginx', 'proxy', 'upstream', 'header', 'X-Forwarded']
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Initial Data: Docker Checklist
-- ============================================

-- Docker 빌드/배포 체크리스트
INSERT INTO debugging_checklists (category, title, description, scope, applicable_projects, priority)
VALUES (
  'docker',
  'Docker 빌드 및 배포 체크리스트',
  'Docker 이미지 빌드, 컨테이너 배포 시 확인할 항목. OOM, 네트워크, 캐시 관련 이슈 포함.',
  'both',
  ARRAY['WBHubManager', 'WBSalesHub', 'WBFinHub', 'WBOnboardingHub', 'WBRefHub', 'HWTestAgent'],
  90
)
ON CONFLICT (category, title) DO UPDATE SET
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  applicable_projects = EXCLUDED.applicable_projects,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- Docker 체크리스트 항목들
WITH docker_checklist AS (
  SELECT id FROM debugging_checklists WHERE category = 'docker' AND title = 'Docker 빌드 및 배포 체크리스트'
)
INSERT INTO checklist_items (checklist_id, item_order, title, description, severity, code_example, anti_pattern, related_error_pattern_ids, keywords)
VALUES
(
  (SELECT id FROM docker_checklist), 1,
  'BuildKit 캐시 마운트 사용',
  'npm ci 실행 시 BuildKit 캐시 마운트로 빌드 시간 단축. OOM 방지를 위해 메모리 제한도 설정.',
  'critical',
  E'# Dockerfile\nRUN --mount=type=cache,target=/root/.npm \\\n    npm ci --prefer-offline --no-audit',
  E'# 잘못된 예시 - 캐시 미사용\nRUN npm ci\n\n# 잘못된 예시 - npm cache clean과 충돌\nRUN npm cache clean --force && npm ci',
  ARRAY[5, 7],
  ARRAY['BuildKit', 'cache', 'npm', 'OOM', 'Dockerfile']
),
(
  (SELECT id FROM docker_checklist), 2,
  'Docker Compose v5 BuildKit 버그 대응',
  'Docker Compose v5.0.0에서 BuildKit 캐시 버그로 Exit 255 발생 시 COMPOSE_BAKE=true 또는 docker build 직접 사용.',
  'high',
  E'# 해결 방법 1: COMPOSE_BAKE 환경변수\nexport COMPOSE_BAKE=true\ndocker compose build\n\n# 해결 방법 2: docker build 직접 사용\ndocker build -t myimage .',
  E'# 문제 상황\ndocker compose build\n# Exit code 255 발생',
  ARRAY[6],
  ARRAY['docker-compose', 'BuildKit', 'Exit 255', 'COMPOSE_BAKE']
),
(
  (SELECT id FROM docker_checklist), 3,
  '컨테이너 재생성 vs 재시작 구분',
  '설정 변경 후에는 restart가 아닌 up --force-recreate 사용. Nginx upstream 캐시 문제 방지.',
  'high',
  E'# 설정 변경 후 재생성\ndocker compose up -d --force-recreate backend\n\n# Nginx도 함께 재시작\ndocker compose restart nginx',
  E'# 잘못된 예시 - IP 변경 시 upstream 캐시 문제\ndocker compose restart backend\n# Nginx가 이전 IP를 캐시하여 404 발생',
  ARRAY[38],
  ARRAY['restart', 'recreate', 'nginx', 'upstream', 'cache']
),
(
  (SELECT id FROM docker_checklist), 4,
  '메모리 제한 설정 (OOM 방지)',
  'Docker 빌드 및 런타임에서 메모리 제한 설정. WSL2 환경에서 특히 중요.',
  'high',
  E'# docker-compose.yml\nservices:\n  backend:\n    deploy:\n      resources:\n        limits:\n          memory: 2G\n    environment:\n      - NODE_OPTIONS=--max-old-space-size=1536',
  E'# 문제 상황 - Exit 137 (OOM Killed)\n# 메모리 제한 없이 빌드 시 시스템 전체 OOM',
  ARRAY[5],
  ARRAY['OOM', 'memory', 'Exit 137', 'NODE_OPTIONS', 'WSL2']
),
(
  (SELECT id FROM docker_checklist), 5,
  '네트워크 설정 확인',
  'workhub-network가 external로 정의되어 있고, 모든 컨테이너가 동일 네트워크에 연결되어 있는지 확인.',
  'medium',
  E'# docker-compose.yml\nnetworks:\n  workhub-network:\n    external: true\n\nservices:\n  backend:\n    networks:\n      - workhub-network',
  E'# 잘못된 예시 - 네트워크 라벨 충돌\n# Error: network was found but has incorrect label',
  ARRAY[33],
  ARRAY['network', 'workhub-network', 'external', 'docker-compose']
)
ON CONFLICT DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Migration 007: Debugging Checklists System completed successfully';
  RAISE NOTICE 'Created tables: debugging_checklists, checklist_items';
  RAISE NOTICE 'Inserted initial data: SSO checklist (12 items), Docker checklist (5 items)';
END $$;
