# CHANGELOG

티업링크 백오피스 변경 이력입니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며, [Semantic Versioning](https://semver.org/lang/ko/)을 사용합니다.

## [Unreleased] — 2.0.0 재구축

### Added
- JUSTICELAB-AP-Framework V0.2 적용: `CLAUDE.md`, `PRD.md`, `.progress.md`, `docs/` 00~10 템플릿, `prompts/`, `n8n/`, `.github` 이슈·PR 템플릿과 워크플로 (#14)
- 기획·설계 산출물: 착수보고서, 벤치마킹, 서비스기획서, 요구사항정의서, 기능명세서, 정보구조도, 화면설계서, API스펙, DB설계서, 디자인스타일가이드 (#15, #16)
- React 19 + Vite 7 + TypeScript(strict) + Tailwind 3 스캐폴드, shortcrew 구조 레이아웃(다크 접이식 사이드바·흰 헤더·모바일 드로어) + teeup 브랜드 토큰 (#17)
- 단일 HTTP 클라이언트: JWT 주입, 변경 요청마다 일회성 CSRF 토큰, CSRF 만료 시 1회 재시도, 응답 envelope 어댑터, 에러 메시지 일관 추출 (#17)
- 역할 6종 권한 표 기반 라우트 가드·메뉴 필터, 세션 만료 시 원래 경로로 복귀 (#17)
- Vitest + Testing Library, CI(typecheck·lint·test·build) PR·push 트리거 활성화 (#17)
- 공통 목록 시스템: URL 상태 동기화, `DataTable`(선택·일괄·정렬·빈/에러 상태), `FilterBar`, `BulkActionBar`, 확인 대화상자, 폼 공통, 개인정보 마스킹 포맷터 (#18)
- 대시보드 오늘 처리할 일, 가입신청 통합 목록·일괄 승인/거절, 1:1 문의 목록·상세·답변 (#19 #21 #22)
- 가입신청 처리 이력 탭 — 거절로 지워진 신청도 감사 로그 스냅샷으로 표시 (#21, BE#49)
- 감사 로그 화면: 목록·필터·상세 드로어(변경 전후 비교·같은 요청 묶음)·CSV 내보내기(사유 필수), 월간 점검(관리자별 개인정보 열람 집계, 1일 100건 초과 강조, 점검 완료 기록) (#28, BE#49)

### Changed
- `vite.config` 가 개발 포트 환경변수 없이도 빌드되도록 변경 (Docker 빌드에서 `.env` 의존 제거) (#17)

### Removed
- MUI·Ant Design·Emotion·Formik·SWR·axios 등 기존 의존성과 JS 소스 전체 — 기준선은 `origin/RUN-70` (#17)

## [1.x] — 기존 백오피스

- Mantis(MUI) 템플릿 기반 JavaScript 백오피스. `rebuild` 브랜치 분기 시점: `origin/RUN-70` @ 7918667
