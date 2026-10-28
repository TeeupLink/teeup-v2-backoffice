# API 스펙

**프로젝트명**: 티업링크 백오피스 재구축
**작성일**: 2026-10-28
**버전**: v1.0
**입력**: [기능명세서](기능명세서.md) 3장 API 갭, [기존 기능 인벤토리](../05.리포트/기존백오피스_기능인벤토리_20261028.md) 3장, `teeup-v2-backend/routers/admin/*` (origin/dev)
**구현 이슈**: teeup-v2-backend #46 (정규화·신설), #49 (감사 로그), #50 (활동 로그), #51 (빌링), #48 (토스 인증 헤더 — PR #52)

> 기존 admin API 약 135개를 전부 다시 적지 않습니다. 이 문서는 ① 모든 엔드포인트가 따를 **공통 계약** ② 기존 엔드포인트의 **보강 목록** ③ **신설** 엔드포인트 상세를 정의합니다. 기존 엔드포인트의 요청 필드는 백엔드 `schemas/`가 기준입니다.

---

## 1. 공통 사항

| 항목 | 내용 |
|------|------|
| Base URL | `/api/v1/admin` (운영: nginx가 백엔드 7777로 프록시, 개발: Vite proxy) |
| 인증 | `Authorization: Bearer {JWT}` (`POST /login` 발급) |
| CSRF | POST·PUT·PATCH·DELETE는 `X-CSRF-Token` 필수. `GET /api/v1/auth/csrf-token`으로 요청마다 발급(일회성) |
| 형식 | JSON, UTF-8. 금액은 원 단위 정수. 일시는 KST `YYYY-MM-DDTHH:mm:ss` |
| 앱 호환 | `/api/v1/admin` 밖의 앱 API 응답은 바꾸지 않음 (NFR-013) |

### 1.1 목록 요청·응답 (모든 목록 공통)

| 쿼리 | 타입 | 기본 | 설명 |
|------|------|------|------|
| page | int ≥ 1 | 1 | 1-base |
| size | 20·50·100 | 20 | 그 외 값은 422 |
| sort | string | 엔드포인트별 | `created_at`(오름), `-created_at`(내림). 허용 필드는 엔드포인트별 화이트리스트, 그 외 422 |
| q | string | - | 검색어 (엔드포인트별 대상 필드) |
| (필터) | | | 엔드포인트별. 다중 값은 반복 키 `status=A&status=B` |

```json
{ "items": [ ... ], "total": 132, "page": 1, "size": 20 }
```

전환 규칙: 기존 응답 키(`data`, `limit`, `total_pages` 등)를 쓰는 화면은 재구축으로 모두 대체되므로 **admin 목록은 이 형식으로 교체**합니다. 기존 백오피스(RUN-70)와 병행 운영하는 기간이 없으므로(빅뱅 교체) 하위 호환 키를 남기지 않습니다. 다만 교체 배포 전까지 dev 서버의 기존 백오피스가 깨지므로, 정규화 PR은 백오피스 교체 배포(BO#33)와 같은 날 운영에 반영합니다.

### 1.2 일괄 처리

```
POST /{resource}/bulk
{ "ids": [1, 2, 3], "action": "approve", "reason": "선택" }

200
{ "succeeded": [1, 3], "failed": [ { "id": 2, "message": "이미 처리된 신청입니다" } ] }
```

- 최대 100건. 건별로 독립 처리(한 건 실패가 나머지를 롤백하지 않음)
- 감사 로그: 건별 1행, 공통 `request_id`

### 1.3 에러

| HTTP | 형식 | 상황 |
|------|------|------|
| 400 | `{ "detail": "메시지" }` | 업무 규칙 위반 |
| 401 | `{ "detail": "..." }` | 토큰 없음·만료 |
| 403 | `{ "detail": "...", "code": "CSRF" \| "FORBIDDEN" \| "INACTIVE" }` | **code 추가**: 프론트가 CSRF 재시도 / 권한 없음 / 계정 비활성을 구분 |
| 404 | `{ "detail": "..." }` | 대상 없음 |
| 409 | `{ "detail": [ { "field": "email", "message": "이미 사용 중" } ] }` | 중복 |
| 422 | `{ "detail": [ { "field": "...", "message": "..." } ] }` | 검증 실패. FastAPI 기본 `loc`/`msg`를 `field`/`message`로 변환하는 예외 핸들러를 admin 라우터에 적용 |
| 500 | `{ "detail": "요청을 처리하지 못했습니다" }` | 내부 정보 노출 금지 |

### 1.4 권한 적용 방식 (변경)

현재는 라우터 단위 `include_router(..., dependencies=[require_roles(...)])`라 "조회는 허용, 변경은 금지" 같은 구분을 못 합니다. 정보구조도 3장 권한 매트릭스를 코드 한 곳(`routers/admin/permissions.py`)에 두고 엔드포인트마다 선언합니다.

```python
# 예시
PERMISSIONS = {
    "users":    {"read": {USER_ADMIN, SUPPORT_ADMIN}, "write": {USER_ADMIN}},
    "payments": {"read": {SUPPORT_ADMIN},             "write": set()},   # SUPER 는 항상 통과
    ...
}

@router.get("/users", dependencies=[Depends(require_access("users", "read"))])
@router.put("/users/{id}", dependencies=[Depends(require_access("users", "write"))])
```

- `GET /me` 응답에 `permissions: { users: "read" | "write" | null, ... }`를 포함 → 프론트 메뉴·가드가 같은 표를 씀
- role이 NULL이면 403 (`code: FORBIDDEN`). 기존 SUPER 간주 제거

---

## 2. 엔드포인트 목록

`상태` 열: **기존** = 그대로 사용, **보강** = 파라미터·응답 변경, **신설** = 새로 만듦. 권한 열은 SUPER_ADMIN을 생략(항상 허용).

### 2.1 인증·공통

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-001 | POST | /login | 로그인 | 기존 (감사 LOGIN·LOGIN_FAIL 기록) | 공개 | F-010 |
| API-002 | POST | /logout | 로그아웃 | 기존 | 인증 | F-010 |
| API-003 | GET | /me | 내 정보 + **permissions** | 보강 | 인증 | F-013 |
| API-004 | PUT | /profile | 내 정보 수정 | 기존 | 인증 | F-081 |
| API-005 | PUT | /password | 내 비밀번호 변경 | 기존 | 인증 | F-081 |
| API-006 | GET | /search | 통합 검색 — 결과를 권한 범위로 제한, 모임 결과에 `meeting_type` | 보강 | 인증 | F-015 |
| API-007 | POST | /upload | 이미지·파일 업로드 | 기존 | 인증 | F-007 |
| API-008 | GET | /lookup/users | 회원 선택용 (id, nickname, 마스킹 email) | **신설** | 인증 | F-008 |
| API-009 | GET | /lookup/clubs | 클럽 선택용 (id, name, status) | **신설** | 인증 | F-008 |
| API-010 | GET | /lookup/clubs/{id}/members | 클럽 멤버 선택용 | **신설** | 인증 | F-008 |
| API-011 | GET | /notifications | 관리자 알림 (`admin_notifications`로 전환, `unread` 필터) | 보강 | 인증 | F-016 |
| API-012 | PATCH | /notifications/{id}/read | 읽음 (기존 PUT 유지 + PATCH 추가) | 보강 | 인증 | F-016 |
| API-013 | PATCH | /notifications/read-all | 모두 읽음 | 보강 | 인증 | F-016 |
| API-014 | GET | /notifications/unread-count | 배지용 건수 | **신설** | 인증 | F-016 |

### 2.2 대시보드·KPI

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-020 | GET | /dashboard/todo | 오늘 처리할 일 4종 (권한 밖 항목 null) | **신설** | 인증 | F-020 |
| API-021 | GET | /dashboard/stats | KPI 4종 — 이번주 라운딩을 `meeting_time` 기준으로 | 보강 | 인증 | F-021 |
| API-022 | GET | /dashboard/activities | 최근 활동 (`size`) | 보강 | 인증 | F-021 |
| API-023 | GET | /kpi | 기간·단위별 지표 시계열 | **신설** | SUPER | F-130 |
| - | GET | /dashboard | (500, 미사용) | **폐기** | - | - |

### 2.3 업무

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-030 | GET | /join-requests | 전 클럽 PENDING 멤버십 통합 목록 | **신설** | CLUB | F-040 |
| API-031 | POST | /join-requests/bulk | 일괄 승인·거절 (`approve`/`reject`) | **신설** | CLUB | F-040 |
| API-032 | GET | /join-requests/history | 처리 이력 (감사 로그 target `CLUB_MEMBERSHIP` 기반) | **신설** | CLUB | F-040 |
| API-033 | PUT | /clubs/{cid}/members/{uid}/approve·reject | 행 단위 승인·거절 | 기존 | CLUB | F-040 |
| API-040 | GET | /inquiries | 서버 페이징·필터(status 다중, type, q, 기간) — 20건 고정 해소 | 보강 | SUPPORT | F-070 |
| API-041 | POST | /inquiries/bulk | 일괄 상태 변경 (`action: "status"`, `status`) | **신설** | SUPPORT | F-070 |
| API-042 | GET·PUT | /inquiries/{id}, /inquiries/{id}/status | 상세·상태 | 기존 | SUPPORT | F-071 |
| API-043 | POST·PUT·DELETE | /inquiries/{id}/responses[/{rid}] | 답변 CRUD — POST에 `set_status` 옵션 | 보강 | SUPPORT | F-071 |
| API-044 | GET | /inquiries/{id}/next | 현재 필터 기준 다음 미답변 id | **신설** | SUPPORT | F-071 |
| API-050 | GET | /reports | 신고 목록 (status, target_type, reason, 기간) + 대상명·누적 수 | **신설** | SUPPORT | F-100 |
| API-051 | GET | /reports/{id} | 상세 + 대상 미리보기 + 같은 대상 신고 | **신설** | SUPPORT | F-100 |
| API-052 | PUT | /reports/{id} | 상태·메모 | **신설** | SUPPORT | F-100 |
| API-053 | POST | /reports/bulk | 일괄 상태 (`reviewing`·`resolve`·`dismiss`, reason=메모) | **신설** | SUPPORT | F-100 |
| API-054 | GET | /blocks | 차단 관계 (`user_id`) | **신설** | SUPPORT | F-101 |

### 2.4 회원

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-060 | GET | /users | 목록 — envelope·sort(`created_at`, `last_login_at`)·status·기간, role_filter 무시 버그 제거 | 보강 | USER(w), SUPPORT(r) | F-030 |
| API-061 | POST | /users/bulk | 일괄 `activate`·`deactivate` | **신설** | USER | F-030 |
| API-062 | GET | /users/export | CSV (reason 필수, 감사 EXPORT) | **신설** | USER | F-006 |
| API-063 | GET·POST·PUT·DELETE | /users/create, /users, /users/{id} | 생성 옵션·생성·수정·삭제 | 기존 | USER | F-031 |
| API-064 | GET | /users/{id} | 상세 — **감사 VIEW_PII 기록** | 보강 | USER, SUPPORT | F-032 |
| API-065 | GET | /users/{id}/clubs·meetings·handicap-history | 탭 데이터 — 페이징 추가 (10건 고정 해소) | 보강 | USER, SUPPORT | F-032 |
| API-066 | GET | /users/{id}/activities | 활동 타임라인 (커서) | **신설** | USER, SUPPORT | F-033 |
| API-067 | GET | /users/{id}/terms-agreements | 약관 동의 이력 | **신설** | USER, SUPPORT | F-111 |
| API-068 | GET·PUT | /users/{id}/clubs/{cid}/note | 클럽별 메모 (앱 API 관리자 토큰 불가 시) | 신설(조건부) | USER | F-034 |
| - | GET | /users/search | `/lookup/users`로 대체 | **폐기** | - | - |

### 2.5 클럽

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-070 | GET | /clubs | 목록 — envelope·sort(`name`, `member_count`, `created_at`)·status(ACTIVE/INACTIVE)·type·sido + `pending_count` | 보강 | CLUB(w), MEETING(r) | F-041 |
| API-071 | GET | /clubs/export | CSV | **신설** | CLUB | F-006 |
| API-072 | POST·GET·PUT·DELETE | /clubs, /clubs/{id} | CRUD (상태 변경 시 `reason`) | 기존 (`HTTP_404_NOT_FOUNDOUND` 오타 수정) | CLUB | F-042 |
| API-073 | GET | /clubs/{id}/members | 서버 페이징·q·role·status | 보강 | CLUB | F-043 |
| API-074 | POST·PUT·DELETE | /clubs/{id}/members[/{uid}][/role] | 추가·역할·제거 | 기존 | CLUB | F-043 |
| API-075 | POST | /clubs/{id}/leader | 리더 교체 (단일 트랜잭션) | **신설** | CLUB | F-044 |
| API-076 | CRUD | /clubs/{id}/notices | 클럽 공지 + `q` | 보강 | CLUB | F-045 |
| API-077 | CRUD | /clubs/{id}/regulations, /regulations/categories | 규정·카테고리 (카테고리 PUT 확인) | 기존 | CLUB | F-046 |
| API-078 | CRUD | /clubs/{id}/fees | 회비 항목 | 기존 | CLUB | F-047 |
| API-079 | GET | /sido-list, /gungu-list | 지역 (앱 공용 API) | 기존 | 인증 | F-042 |
| - | * | /clubs/applications*, /clubs/{id}/approve·reject | 프론트 고아 호출 | **폐기** (승인 없이 자유 등록) | - | - |

### 2.6 모임 (라운딩·소셜)

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-080 | GET | /meetings/rounding, /meetings/event | 목록 — envelope·`club_id`·`date_from`/`date_to`(`meeting_time`)·`today`·sort | 보강 | MEETING(w), CLUB(r) | F-050, F-060 |
| API-081 | GET | /meetings/stats | 라우트 순서 수정(`/{id}`보다 먼저 등록) | 보강 | MEETING | - |
| API-082 | POST | /meetings/rounding, /meetings/event | 생성 | 기존 | MEETING | F-051, F-061 |
| API-083 | GET·PUT·DELETE | /meetings/{id} | 상세·수정·삭제 | 기존 | MEETING | F-052 |
| API-084 | GET | /meetings/{id}/participants | 참가자 | 기존 | MEETING | F-052 |
| API-085 | PUT | /meetings/{id}/participants/{pid}/status | 참가 상태 변경 | **신설** (P2) | MEETING | F-052 |
| API-086 | CRUD | /meetings/{id}/teams, POST /teams/auto-formation | 팀 | 기존 | MEETING | F-053 |
| API-087 | PUT | /meetings/{id}/teams/{tid}/members | 팀 멤버 배정 (`participant_ids`) | **신설** (P1) | MEETING | F-053 |
| API-088 | GET·POST·PUT | /meetings/{id}/scores, …/hole-scores | 점수 | 기존 | MEETING | F-054 |
| API-089 | PUT | /meetings/{id}/scores/bulk | 총타 일괄 `[{participant_id, total}]` | **신설** | MEETING | F-054 |
| API-090 | GET·POST | /meetings/{id}/settlement, /settlement/rounding·social | 정산 | 기존 | MEETING | F-055, F-062 |
| API-091 | PATCH | /meetings/{id}/expenses/{eid}/mark-paid | 납부 완료 | 기존 (미사용 → 사용) | MEETING | F-055 |
| - | GET | /meetings/{id}/stats | 프론트 고아 호출 — 프론트에서 산출 | **폐기** | - | F-056 |

### 2.7 콘텐츠

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-100 | GET | /notices | 페이징·q·category·published + `view_count` — 20건 고정 해소 | 보강 | CONTENT | F-072 |
| API-101 | CRUD | /notices, POST /notices/upload | 공지 | 기존 | CONTENT | F-072 |
| API-102 | GET | /faq | `items` → 공통 envelope | 보강 | CONTENT | F-073 |
| API-103 | CRUD | /faq, PATCH /faq/{id}/toggle-active, /faq-categories | FAQ | 기존 | CONTENT | F-073 |
| API-104 | GET | /terms | 유형별 버전 목록 (`type`) + 동의 수 | 보강 | CONTENT | F-110 |
| API-105 | POST | /terms | 새 버전(초안) — version, effective_at | 보강 | CONTENT | F-110 |
| API-106 | PUT | /terms/{id} | 초안 수정 (게시본이면 400) | 보강 | CONTENT | F-110 |
| API-107 | PUT | /terms/{id}/activate | 게시 — 같은 유형 기존 활성본 자동 비활성(트랜잭션) | 보강 | CONTENT | F-110 |
| API-108 | GET | /terms/{id}/agreements | 버전별 동의 이력 | **신설** | CONTENT | F-111 |
| - | PUT | /terms/{type} | 활성본 덮어쓰기 | **폐기** (버전 체계로 대체) | - | - |

### 2.8 결제·빌링

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-120 | GET | /payments | `size`→공통, status·기간·`user_id` | 보강 | SUPPORT(r) | F-122 |
| API-121 | GET | /payments/{id} | 상세 + 취소 이력 — 감사 VIEW_PII | **신설** | SUPPORT(r) | F-122 |
| API-122 | POST | /payments/{id}/cancel | 전액·부분 취소 (`amount?`, `reason`) | 보강 | SUPER | F-122 |
| API-123 | GET | /payments/export | CSV | **신설** | SUPER | F-006 |
| API-124 | CRUD | /plans | 요금제 | 기존 | SUPER | F-120 |
| API-125 | GET | /subscriptions | 페이징·status (20건 고정 해소) | 보강 | SUPPORT(r) | F-121 |
| API-126 | GET | /subscriptions/{id} | 상세 + 청구 이력 | **신설** | SUPPORT(r) | F-121 |
| API-127 | POST | /subscriptions/{id}/cancel | 해지 (`reason`) | **신설** | SUPER | F-121 |
| API-128 | GET | /billing/status | `{enabled, mode: "test"\|"live"}` | **신설** | 인증 | F-124 |
| API-129 | GET | /billing/failures | 청구 실패 목록 | **신설** | SUPPORT(r) | F-123 |
| API-130 | POST | /billing/charges/{id}/retry | 수동 재청구 (`enabled=false`면 409) | **신설** | SUPER | F-123 |
| API-131 | POST | /billing/sandbox/issue | authKey·customerKey → 빌링키 발급 (TEST 모드만) | **신설** | SUPER | F-125 |
| API-132 | POST | /billing/sandbox/charge | 100원 청구 (TEST 모드만) | **신설** | SUPER | F-125 |
| API-133 | POST | /api/v1/payments/webhook | 토스 웹훅 (admin 밖, 인증 없음, 출처 재확인) | **신설** | 토스 | F-124 |
| - | GET | /refunds | status_filter 무시 버그 — `/payments?status=`로 통합 | **폐기** | - | - |

### 2.9 시스템

| API-ID | Method | URL | 기능 | 상태 | 권한 | F-ID |
|--------|--------|-----|------|------|------|------|
| API-140 | GET | /admins | role 필터 추가 | 보강 | SUPER | F-080 |
| API-141 | CRUD | /admins, /admins/{id} | 관리자 (본인 삭제·마지막 SUPER 강등 금지) | 보강 | SUPER | F-080 |
| API-142 | PUT | /admins/{id}/password | 비밀번호 재설정 | 기존 (미사용 → 사용) | SUPER | F-080 |
| API-150 | GET | /audit-logs | 감사 로그 목록 | **신설** | SUPER | F-091 |
| API-151 | GET | /audit-logs/{id} | 상세 + 같은 request_id | **신설** | SUPER | F-091 |
| API-152 | GET | /audit-logs/export | CSV | **신설** | SUPER | F-091 |
| API-153 | GET | /audit-logs/monthly | 월간 집계 (`month`) | **신설** | SUPER | F-091 |
| API-154 | POST | /audit-logs/monthly/{month}/review | 점검 완료 기록 | **신설** | SUPER | F-091 |

---

## 3. 신설 API 상세

### API-008. 회원 lookup

| 항목 | 내용 |
|------|------|
| Method · URL | `GET /lookup/users?q=김&size=20` |
| 설명 | 다른 역할 화면에서 회원을 "선택"만 하기 위한 최소 정보. 개인정보 최소화로 감사 VIEW_PII 대상 아님 |

```json
{ "items": [ { "id": 12, "nickname": "golfking", "name_masked": "김*수", "email_masked": "go***@gmail.com", "status": "ACTIVE" } ],
  "total": 1, "page": 1, "size": 20 }
```

| 규칙 | 내용 |
|------|------|
| q | 2자 이상 (닉네임·실명·이메일 앞부분 일치). 1자 이하 → 빈 목록 |
| 제외 | DELETED 회원 |

### API-020. 오늘 처리할 일

`GET /dashboard/todo`

```json
{ "join_requests": 7, "unanswered_inquiries": 3, "today_rounds": 2, "pending_reports": null }
```

null = 호출자 권한 밖. 각 숫자는 해당 목록 API에 대시보드 링크 필터를 넣었을 때의 `total`과 같아야 합니다(REQ-060 인수 기준).

| 항목 | 목록 필터 |
|------|-----------|
| join_requests | `/join-requests` (PENDING) |
| unanswered_inquiries | `/inquiries?status=PENDING&status=SUBMITTED` |
| today_rounds | `/meetings/rounding?today=true` (CANCELED 제외) |
| pending_reports | `/reports?status=PENDING` |

### API-030 · API-031. 가입신청

`GET /join-requests?club_id=&q=&date_from=&date_to=&sort=-created_at&page=1&size=20`

```json
{ "items": [ {
    "membership_id": 301, "club": { "id": 5, "name": "강남 골프회" },
    "user": { "id": 12, "nickname": "golfking", "name": "김민수", "average_score": 92 },
    "message": "매주 토요일 가능합니다", "created_at": "2026-10-27T21:04:00"
  } ], "total": 7, "page": 1, "size": 20 }
```

`POST /join-requests/bulk` — `ids`는 **membership_id**.

| action | 처리 | 실패 사유 예 |
|--------|------|-------------|
| approve | status PENDING → ACTIVE, 앱 알림 CLUB_MEMBERSHIP_APPROVED (기존 approve와 같은 서비스 함수 사용) | 이미 처리됨, 클럽 비활성 |
| reject | 행 삭제(기존 동작 유지), 앱 알림 CLUB_MEMBERSHIP_REJECTED, 감사 로그에 before 스냅샷 보존 | 이미 처리됨 |

`GET /join-requests/history` — 감사 로그 `target_type=CLUB_MEMBERSHIP, action IN (APPROVE, REJECT)`를 같은 envelope로 반환(처리자·처리일·사유 포함).

### API-066. 회원 활동 타임라인

`GET /users/{id}/activities?types=LOGIN&types=CLUB_JOIN&from=2026-09-28&to=2026-10-28&cursor=...&size=30`

```json
{ "items": [ { "id": 99812, "event_type": "LOGIN", "summary": "로그인", "target_type": null, "target_id": null,
               "meta": { "device": "ios", "app_version": "1.0.2" }, "ip_masked": "211.***.***.12",
               "created_at": "2026-10-26T21:04:00" } ],
  "next_cursor": "MjAyNi0xMC0yNlQyMTowNDowMHw5OTgxMg==" }
```

커서 페이징(`created_at`, `id` 내림차순). 이 엔드포인트만 공통 envelope의 예외입니다(무한 스크롤).

### API-075. 리더 교체

`POST /clubs/{id}/leader` `{ "new_leader_id": 12 }` → 200 `{ "previous_leader_id": 3, "leader_id": 12 }`

| 규칙 | 내용 |
|------|------|
| 트랜잭션 | 기존 LEADER → MANAGER, 대상 → LEADER, `clubs.leader_id`(있으면) 갱신을 한 커밋으로 |
| 400 | 대상이 이 클럽의 ACTIVE 멤버가 아님 / 이미 리더 |

### API-089. 점수 일괄 저장

`PUT /meetings/{id}/scores/bulk` `{ "scores": [ { "participant_id": 1, "total": 92 }, ... ] }` → 공통 bulk 응답(`succeeded`/`failed` = participant_id). 게스트·범위(50~200) 밖은 failed.

### API-122. 결제 취소 (보강)

`POST /payments/{id}/cancel` `{ "amount": 5000, "reason": "고객 요청" }` (amount 생략 = 잔액 전액)

| 단계 | 내용 |
|------|------|
| 1 | 잔액 = amount − SUM(payment_cancels) 계산, `amount > 잔액` 이면 400 |
| 2 | 토스 `POST /v1/payments/{paymentKey}/cancel` — `toss_auth_headers()` 사용 (#48), `Idempotency-Key: cancel_{payment_id}_{n}` |
| 3 | 성공 시 `payment_cancels` 삽입, 감사 로그 PAYMENT·UPDATE |
| 실패 | 토스 오류 코드·메시지를 `detail`로 전달 (400) |

### API-128 ~ API-133. 빌링 (BE#51)

| 항목 | 내용 |
|------|------|
| 플래그 | `BILLING_ENABLED`(기본 false). false면 스케줄러 미등록, API-130 → 409 `{detail: "정기결제가 비활성 상태입니다"}` |
| 모드 | 시크릿 키 접두사 `test_` → `test`, 그 외 `live`. 샌드박스(API-131·132)는 `live`면 403 |
| 발급 | 토스 `POST /v1/billing/authorizations/issue` `{authKey, customerKey}` → billingKey 암호화 저장 |
| 청구 | 토스 `POST /v1/billing/{billingKey}` `{customerKey, amount, orderId, orderName}` + `Idempotency-Key` |
| 스케줄 | 매일 04:00 KST: `next_billing_date <= 오늘`인 ACTIVE 구독 청구 → 성공 시 다음 결제일 갱신, 실패 시 PAST_DUE + 1·3·7일 재시도, 3회 실패 → GAVE_UP + 관리자 알림 BILLING_FAILURE |
| 웹훅 | 수신 원문 저장 → paymentKey로 토스 조회 API 재확인(위조 방지) → 상태 반영. 같은 이벤트 중복 수신은 `processed_at`으로 무시 |

### API-150. 감사 로그 목록

`GET /audit-logs?actor_id=&action=VIEW_PII&action=EXPORT&target_type=USER&target_id=12&date_from=&date_to=&result=&sort=-created_at`

```json
{ "items": [ { "id": 88123, "request_id": "5f0c…", "actor": { "id": 1, "email": "owner@teeup.run", "role": "SUPER_ADMIN" },
               "action": "UPDATE", "target_type": "CLUB", "target_id": "5", "reason": null,
               "method": "PUT", "path": "/api/v1/admin/clubs/5", "status_code": 200, "result": "SUCCESS",
               "ip": "211.234.10.12", "created_at": "2026-10-28T10:21:03.120" } ],
  "total": 1, "page": 1, "size": 20 }
```

상세(API-151)에만 `before`, `after`, `meta`, `user_agent`, 같은 request_id의 다른 행을 포함합니다. 기간 미지정 시 최근 7일, 최대 조회 기간 1년.

### API-153. 월간 집계

`GET /audit-logs/monthly?month=2026-11`

```json
{ "month": "2026-11",
  "totals": { "view_pii": 412, "export": 3, "login_fail": 5, "changes": 230 },
  "by_admin": [ { "admin_id": 2, "email": "cs@teeup.run", "view_pii": 380, "export": 1, "changes": 40, "max_daily_view_pii": 120, "flagged": true } ],
  "review": null }
```

`flagged` = 1일 VIEW_PII 100건 초과.

---

## 4. 감사 로그 기록 규칙 (BE#49 구현 기준)

| 대상 | 기록 방식 |
|------|-----------|
| 모든 admin POST·PUT·PATCH·DELETE | 미들웨어가 요청·응답 메타(method, path, status, ip, ua, actor) 기록 |
| before/after | 서비스 계층에서 `audit.record(target, before, after, reason)` 호출 — 미들웨어 행에 병합 (같은 request_id) |
| VIEW_PII | `@audit_view("USER")` 데코레이터: API-064, API-121, 결제·구독 상세 |
| EXPORT | 내보내기 엔드포인트 전부 (건수·필터·사유를 meta에) |
| LOGIN / LOGIN_FAIL / LOGOUT | 인증 라우터 |
| 실패 격리 | 기록 예외는 잡아서 애플리케이션 로그로만 남기고 응답에 영향 없음 |

---

## 5. 구현 순서 (backend #46 체크리스트)

| 순서 | 묶음 | 엔드포인트 | 선행 이유 |
|------|------|-----------|-----------|
| 1 | 공통 | envelope·에러 핸들러·permissions·`/me` permissions·role null | 모든 화면의 전제 (BO#17·18) |
| 2 | lookup·dashboard | API-008~010, API-020~022 | BO#19 대시보드, 폼의 선택기 |
| 3 | 업무 Top 3 | API-030~032, 040~044, 080, 089 | BO#21~23 |
| 4 | 회원·클럽 | API-060~068, 070~079 | BO#20, 24 |
| 5 | 콘텐츠·알림 | API-100~108, 011~014 | BO#26, 27, 30 |
| 6 | 신고·KPI | API-050~054, 023 | BO#29, 32 |
| 7 | 결제 보강 | API-120~127 | BO#31 (빌링 신설은 BE#51) |
