# Step 4 프롬프트: 구현 자동화

## P-401. 프론트엔드 코드 생성기

```
claude "화면설계서.md와 디자인스타일가이드.md를 읽고 React + Vite + TypeScript + Tailwind CSS로 프론트엔드 코드를 생성해줘.
- 위치는 apps/web/
- 각 화면을 별도 페이지 컴포넌트로 만들고, 라우팅은 react-router로 구성해줘
- API 호출은 src/api/ 의 클라이언트 한 곳으로 모아줘. 베이스 주소는 import.meta.env.VITE_API_BASE_URL
- API 응답 타입은 백엔드 OpenAPI에서 생성한 타입을 import해서 쓰고, 손으로 다시 정의하지 마
- Supabase는 로그인/세션과 Storage 업로드에만 직접 쓰고, 데이터 조회·변경은 API를 경유해줘"
```

**입력**: docs/02.기획문서/화면설계서.md, docs/03.구현문서/디자인스타일가이드.md
**출력**: apps/web/ (React + Vite 프로젝트)
**참고**: 화면설계서의 레이아웃, 컴포넌트, 인터랙션 명세를 코드로 변환합니다. Figma 디자인이 있다면 색상, 간격 등 디자인 스펙을 텍스트로 전달하여 반영합니다.

**실전 주의사항**:
- 환경변수는 **`VITE_` 접두사가 붙은 것만** 브라우저에 노출됩니다. 시크릿에는 절대 붙이지 마세요
- Vite 환경변수는 **빌드 시점에 번들에 박힙니다.** 런타임에 바꿔도 반영되지 않으니, 값이 바뀌면 재빌드해야 합니다
- SPA이므로 **없는 경로를 `index.html`로 폴백**하도록 서빙 설정이 필요합니다 (미설정 시 새로고침에서 404)
- 프론트와 API는 오리진이 다르므로 **CORS**가 필요합니다

---

## P-402. 백엔드 API 생성기

```
claude "API스펙.md를 읽고 FastAPI REST API를 생성해줘.
- 위치는 apps/api/
- 엔드포인트별 라우터 + Pydantic 스키마 + 서비스 계층으로 나눠줘
- DB는 SQLAlchemy(asyncio) + asyncpg로 Supabase Postgres에 연결해줘
- 인증은 Supabase가 발급한 JWT를 검증만 해줘. 자체 토큰을 발급하지 마
- 모든 응답 모델에 타입을 붙여서 OpenAPI 스키마가 정확히 나오게 해줘"
```

**입력**: docs/02.기획문서/API스펙.md
**출력**: apps/api/ (FastAPI 프로젝트)
**참고**: API 스펙의 엔드포인트, 파라미터, 응답 형식을 그대로 구현합니다. **모든 비즈니스 로직은 여기에 둡니다** — 프론트는 화면만 담당합니다.

**실전 주의사항**:
- **Supabase Pooler(PgBouncer) 사용 시 asyncpg `statement_cache_size=0`이 필수**입니다. 미설정 시 prepared statement 충돌로 간헐적 오류가 납니다
- 컨테이너는 **`$PORT`를 읽어 `0.0.0.0`에서 listen**해야 합니다. 로컬 기본값(8000)을 하드코딩하면 배포 후 전 요청이 타임아웃됩니다
- 응답 모델에 타입이 빠지면 OpenAPI 스키마가 부정확해지고, 프론트 타입 생성이 깨집니다
- 운영 알림이 필요한 지점(가입·문의 등)은 P-408의 Discord 알림 모듈을 호출합니다

---

## P-403. 코드 리뷰 요청기

```
claude "이 PR의 코드를 보안/성능/품질 관점에서 리뷰해줘. 개선 사항을 구체적으로 제안해줘"
```

**입력**: Git diff 또는 PR 내용
**출력**: 리뷰 코멘트
**참고**: GitHub PR 생성 후 Claude Code로 리뷰를 수행합니다

---

## P-404. DB 스키마 생성기

```
claude "기능명세서.md의 데이터 모델을 기반으로 PostgreSQL 스키마를 설계해줘.
- 인증은 Supabase Auth 기준이야. 사용자 테이블을 새로 만들지 말고 public.profiles로 auth.users를 확장해줘
  (id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE)
- 앱 테이블에 비밀번호 컬럼을 두지 마. 사용자 참조 FK는 모두 UUID로 해줘
- 시각 컬럼은 TIMESTAMPTZ로 해줘
- public 스키마 전 테이블에 RLS 활성화 + 본인 행만 허용하는 정책도 함께 써줘
- 가입 시 프로필 생성은 handle_new_user DB 트리거로 해줘
- ERD를 Mermaid로 그리고, SQL DDL도 생성해줘"
```

**입력**: docs/02.기획문서/기능명세서.md
**출력**: DB 스키마 (ERD + DDL + RLS 정책 + 트리거)
**참고**: 교육에서는 설계까지만 수행하며, 실제 DB 구축은 선택 사항입니다. 산출물 서식은 `docs/03.구현문서/데이터베이스설계서.md` 템플릿을 따릅니다

**실전 주의사항**:
- 사용자 테이블을 직접 만들게 하면 `password_hash`가 붙은 자체 인증 스키마가 생성됩니다. Supabase Auth와 이중 관리가 되어 가입·로그인 흐름이 갈라집니다
- **RLS를 켜지 않은 테이블은 공개 테이블과 같습니다.** 프론트에 `anon` 키가 그대로 내려가기 때문입니다
- `service_role`은 RLS를 우회하므로, 권한 검증은 FastAPI에서 한 번 더 합니다 (CLAUDE.md "데이터 모델 규약" 참조)

---

## P-405. 디자인 스타일 가이드 생성기

```
claude "서비스기획서.md의 브랜드 전략과 화면설계서.md를 기반으로 디자인 스타일 가이드를 작성해줘. 컬러 시스템, 타이포그래피, 레이아웃, UI 컴포넌트, 인터랙션 규칙을 포함해줘"
```

**입력**: docs/02.기획문서/서비스기획서.md, docs/02.기획문서/화면설계서.md
**출력**: docs/03.구현문서/디자인스타일가이드.md
**참고**: 프론트엔드 코드 생성 시 이 가이드의 컬러/폰트/컴포넌트 스펙을 참조합니다. Figma Make 프롬프트로도 활용 가능합니다.

---

## P-406. Cloud Run 배포 설정

```
claude "Google Cloud Run에 배포할 수 있도록 프로젝트를 설정해줘.

[프론트 apps/web/]
- 멀티스테이지 Dockerfile: Vite 빌드 -> 산출물을 nginx로 서빙
- nginx는 없는 경로를 index.html로 폴백 (try_files) — SPA 라우팅
- nginx가 $PORT를 듣도록 설정 (포트 하드코딩 금지)
- VITE_ 환경변수는 빌드 인자로 주입 (런타임 주입 불가)

[백엔드 apps/api/]
- Dockerfile: uvicorn 실행, $PORT를 읽어 0.0.0.0에서 listen
- CORS에 프론트 서비스 주소를 허용 오리진으로 등록

[공통]
- .dockerignore, .gcloudignore 생성 (한글 문서 폴더·.venv·node_modules 제외)
- 배포 명령을 README에 정리"
```

**입력**: apps/web/, apps/api/ 소스 코드
**출력**: `apps/web/Dockerfile` + nginx 설정, `apps/api/Dockerfile`, `.dockerignore`, `.gcloudignore`
**참고**: web·api를 **각각 별도 Cloud Run 서비스**로 배포합니다. 배포 시 HTTPS URL이 자동 발급되므로 도메인 없이 바로 검증할 수 있습니다.

**실전 주의사항**:
- **포트를 하드코딩하지 마세요.** Cloud Run은 `$PORT`(기본 8080)로 트래픽을 보냅니다. 로컬 기본값(FastAPI 8000 / Vite 5173)을 그대로 구우면 배포 후 전 요청이 타임아웃됩니다
- **SPA 폴백 미설정 시 새로고침에서 404**가 납니다. nginx `try_files $uri /index.html;` 필요
- **`VITE_` 값은 빌드 시점에 박힙니다.** Cloud Run 환경변수로 넣어도 프론트 화면에는 반영되지 않습니다 — 빌드 인자로 넘겨야 합니다
- 배포 전 로컬에서 `docker run -e PORT=8080 -p 8080:8080 {이미지}`로 먼저 재현해보세요. Cloud Run에서 `failed to start and listen`이 뜨면 대부분 포트 문제입니다
- 배포 후 반드시 라이브 URL에서 수동 검증 수행

---

## P-407. 결제 연동 (토스페이먼츠)

```
claude "토스페이먼츠 결제를 연동해줘.
- SDK: @tosspayments/tosspayments-sdk
- 흐름: 장바구니 -> pending 주문 생성 -> PG 결제창 -> POST /api/v1/payments/confirm -> paid 전환
- .key.md에서 클라이언트 키, 시크릿 키 읽기
- 금액 검증: KRW zero-decimal (89000 = 89,000원)
- 멱등성: 이미 paid인 주문에 confirm 재호출 시 스킵
- 프론트(React Router): /checkout, /payments/success, /payments/fail 3개 라우트
- 백엔드(FastAPI): payments 라우터에 confirm 엔드포인트 (Toss API 호출 + DB 업데이트)"
```

**입력**: docs/02.기획문서/기능명세서.md (결제 관련 기능), .key.md (PG사 키)
**출력**: 결제 프론트엔드 라우트 3개, FastAPI payments 라우터, DB 마이그레이션
**참고**: 한국 서비스는 토스페이먼츠 권장 (Stripe는 한국 사업자 미지원).

**실전 주의사항**:
- **시크릿 키는 프론트에 절대 두지 않습니다.** 클라이언트 키만 `VITE_TOSS_CLIENT_KEY`로 노출하고, `TOSS_SECRET_KEY`는 FastAPI 환경변수로만 둡니다
- DB 마이그레이션: orders 테이블에 `payment_key` 컬럼 + `pending` 상태 추가
- KRW는 zero-decimal (89000 = 89,000원, 100 곱하지 않음)
- 테스트 키로 개발 → 라이브 키로 전환 시 환경변수만 교체
- confirm 엔드포인트에서 Toss API 호출 전 금액 검증 필수

---

## P-408. 운영 알림 (Discord) 연동

```
claude "Discord Incoming Webhook으로 운영 알림을 보내는 모듈을 만들어줘.

[모듈: apps/api/services/notify]
- 채널 분리: member(가입·탈퇴), ops(1:1 문의 등), report(데일리 리포트), deploy(배포)
- 채널별 웹훅 URL은 환경변수 DISCORD_WEBHOOK_{채널명}에서 읽어줘
- 임베드(embed) 형식으로 보내고, 성격에 따라 색을 구분해줘 (정보/성공/경고/실패)
- **예외를 밖으로 던지지 마.** 알림 실패가 본래 요청(가입 등)을 깨뜨리면 안 돼. 로그만 남기고 False 반환
- 웹훅이 설정되지 않은 채널은 조용히 건너뛰어 (로컬·테스트에서 외부 호출 방지)
- 이메일은 마스킹해서 보내줘 (st***@example.com)

[데일리 리포트]
- POST /api/v1/webhooks/tasks/daily-report 엔드포인트 생성
- 헤더 X-Webhook-Secret 을 TASK_WEBHOOK_SECRET 과 비교해 검증
- 어제 하루치 지표를 집계해 report 채널로 발송
- **실제로 세어지는 값만 넣어.** 데이터가 없는 지표를 0으로 채워 있는 척하지 말고 항목을 빼거나 '미구현'으로 표기해"
```

**입력**: docs/02.기획문서/기능명세서.md (알림이 필요한 이벤트), .key.md §8 (Discord 웹훅)
**출력**: `apps/api/services/notify.py`, `apps/api/services/daily_report.py`, webhooks 라우터
**참고**: 호출 경로는 **Cloud Scheduler → 웹훅 엔드포인트**입니다. 스케줄은 `.key.md` §8에 기록합니다.

**실전 주의사항**:
- **알림은 부가 기능입니다.** 발송 실패가 본래 트랜잭션을 롤백시키면 안 됩니다
- **웹훅 URL 자체가 크리덴셜입니다.** URL을 아는 사람은 누구나 그 채널에 글을 쓸 수 있으므로 저장소에 커밋하지 마세요
- 한 채널에 전부 쏟으면 중요한 이벤트가 묻힙니다. 용도별로 나누세요
- 데일리 리포트 엔드포인트를 인증 없이 열어두면 외부에서 임의 호출이 가능합니다. 공유 시크릿 검증 필수

---

## P-409. Supabase Storage 연동

```
claude "Supabase Storage를 연동해줘.
- 비공개 버킷: 인증된 사용자만 다운로드 가능한 파일 저장
- 공개 버킷: 이미지 등 공개 에셋 저장
- 파일 업로드: Supabase Storage REST API + service_role JWT
- Signed URL: 시간 제한 다운로드 링크 생성
- 다운로드 관리: 횟수 제한, 권한 검증"
```

**입력**: docs/02.기획문서/기능명세서.md (파일 관리 기능)
**출력**: Storage 서비스 모듈, 다운로드 API 엔드포인트
**참고**: Supabase Storage는 S3 호환 API를 제공합니다. 비공개 파일은 Signed URL로 제어합니다.

**실전 주의사항**:
- service_role JWT는 백엔드에서만 사용 (프론트 노출 금지)
- Signed URL TTL은 5분 권장 (너무 길면 보안 위험)
- 파일 키 규칙 통일: `{카테고리}/{id}.{확장자}` (예: `vol/32.pdf`)
- 대용량 파일은 multipart upload 고려

---

## P-410. Group B 병렬 실행 (화면설계서 + API스펙 이후)

> 화면설계서(#9)와 API스펙(#7) 완료 후 독립적인 3개 산출물을 동시 생성합니다.

```
"화면설계서(#9)와 API스펙(#7)이 완료되었으니, 다음 3개 산출물을 병렬로 생성해줘.

1. 인프라아키텍처 (#10): 화면설계서.md + 시스템 환경 기반
2. 데이터베이스설계서 (#12): 기능명세서.md + API스펙.md 기반 ERD + DDL
3. 디자인스타일가이드 (#13): 서비스기획서.md 브랜드 전략 + 화면설계서.md 기반

각 산출물은 독립적으로 생성하되, 해당 전제 문서를 참조해.
완료 후 .progress.md를 일괄 업데이트해줘."
```

**입력**: #4, #6, #7, #9 산출물
**출력**: #10, #12, #13 (3개 산출물 동시 생성)
**전제조건**: .progress.md에서 #7, #9 상태=완료 확인
**실행 방식**: Claude Code Task 도구로 3개 서브에이전트 병렬 실행
