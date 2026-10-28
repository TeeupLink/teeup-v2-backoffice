# Step 5 프롬프트: 검수 자동화

## P-501. 테스트 시나리오 생성기

```
claude "기능명세서.md를 읽고 테스트 시나리오를 작성해줘. 기능별 정상/예외 케이스를 포함해줘"
```

**입력**: docs/02.기획문서/기능명세서.md
**출력**: docs/04.검수문서/테스트시나리오.md
**참고**: 각 기능의 정상 흐름과 예외 케이스를 모두 포함합니다

---

## P-502. 단위 테스트 생성기

```
claude "테스트시나리오.md(TC-001~TC-060)를 기반으로 pytest 테스트 코드를 작성해줘.
- 프레임워크: pytest + pytest-asyncio + FastAPI TestClient
- apps/api/tests/conftest.py의 픽스처를 사용해줘 (client, auth_headers, task_headers)
- DB는 모킹해서 실제 DB 없이 돌아가게 해줘
- 파일 구조: apps/api/tests/ 하위에 test_*.py"
```

**입력**: apps/api/ 소스 코드, docs/04.검수문서/테스트시나리오.md
**출력**: apps/api/tests/test_*.py
**참고**: Mock 기반 테스트로 DB 없이 CI 환경에서 안정적으로 실행합니다. 픽스처 목록은 [apps/api/tests/README.md](../apps/api/tests/README.md) 참조.

**실전 주의사항**:
- **환경변수는 앱 import 전에 세팅**해야 합니다. `settings`가 import 시점에 생성되므로 이후 변경은 반영되지 않습니다 (`conftest.py`가 처리)
- 인증 테스트는 **Supabase 토큰을 검증하는 경로 그대로** 태웁니다. 백엔드는 자체 토큰을 발급하지 않습니다
- 데일리 리포트 같은 웹훅 엔드포인트는 **시크릿 없이 호출 시 거부되는지**를 반드시 테스트합니다

---

## P-503. CI/CD 파이프라인 생성기

```
claude "GitHub Actions CI/CD 파이프라인을 활성화해줘.
- push/PR 시 자동 실행
- Backend: pip install -e '.[dev]' -> ruff check -> pytest
- Frontend: npm install -> tsc --noEmit -> npm run lint -> npm run build
- 배포: gcloud run deploy 로 {repo}-api, {repo}-web 두 서비스 배포
- 알림: 배포 결과를 Discord deploy 채널로 발송
- 런타임 버전(NODE_VERSION, PYTHON_VERSION)은 이 프로젝트에서 확정한 값으로 채워줘
대상 파일: .github/workflows/ci.yml"
```

**입력**: 프로젝트 구조, `.nvmrc` / `.python-version`
**출력**: .github/workflows/ci.yml (활성화)
**참고**: 프레임워크의 ci.yml 템플릿 주석을 해제하고 프로젝트에 맞게 설정합니다.

**실전 주의사항**:
- **GCP 인증은 WIF 키리스 방식**입니다. 서비스 계정 JSON 키를 만들지 마세요. Secrets에 `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GCP_RUNTIME_SERVICE_ACCOUNT` 등록이 선행되어야 하고, 잡에 `permissions: id-token: write`가 필요합니다
- **`VITE_` 값은 빌드 시점에 번들에 박힙니다.** `docker build --build-arg`로 넘겨야 하며, 공개돼도 되는 값만 넣습니다. 시크릿을 넣으면 번들에 그대로 노출됩니다
- **`gcloud run deploy --source`를 프론트에 쓰지 마세요.** `--build-arg`를 전달할 수 없어 `VITE_` 값이 주입되지 않습니다. 직접 `docker build` → push → `--image`로 배포합니다
- **이미지는 커밋 SHA로 태깅**합니다. 배포 이력 추적과 롤백이 가능해집니다
- **시크릿은 이미지에 굽지 않습니다.** `--set-secrets`로 Secret Manager에서 주입합니다
- **런타임 버전은 프레임워크가 고정하지 않습니다.** ci.yml의 `NODE_VERSION`/`PYTHON_VERSION`은 교체 대상 placeholder이며, `.nvmrc`·`.python-version`과 일치시킵니다

---

## P-504. 테스트 결과 보고서 생성기

```
claude "테스트 실행 결과를 분석하여 테스트결과보고서를 작성해줘. 통계, 미해결 이슈, 최종 판정을 포함해줘"
```

**입력**: 테스트 실행 결과, docs/04.검수문서/테스트시나리오.md
**출력**: docs/04.검수문서/테스트결과보고서.md
**참고**: Pass/Fail 통계와 미해결 이슈 목록을 자동으로 정리합니다

---

## P-505. 배포 후 검증 자동화

```
claude "배포된 라이브 사이트를 검증해줘.
- 대상 URL: {배포 URL}
- 검증 항목:
  1. 회원가입/로그인 (특수문자 포함 비밀번호)
  2. 정적 에셋 (이미지, 폰트 HTTP 200 확인)
  3. UI 레이아웃 (중복 요소 육안 확인)
  4. API 응답 (주요 엔드포인트 200/401 확인)
  5. 모바일 반응형 (375px 뷰포트)
  6. 환경변수 (배포 플랫폼 대시보드 확인)
- 결과를 docs/05.리포트/배포검증결과_YYYY-MM-DD.md로 저장"
```

**입력**: 배포된 라이브 사이트 URL
**출력**: docs/05.리포트/배포검증결과_YYYY-MM-DD.md
**참고**: 자동 테스트는 Mock 기반이므로 배포 환경 특이 이슈를 발견하지 못합니다. 반드시 라이브 사이트에서 수동 검증을 수행합니다.

**실전 주의사항**:
- Mock 테스트 Pass가 라이브 정상 동작을 보장하지 않음
- 배포 환경(서버리스)에서만 발생하는 문제는 디버그 엔드포인트 배포로 확인
- 6~8회 이터레이션은 정상이며, 매 실패마다 원인을 기록

---

## P-506. 온디맨드 리포트 생성기

```
claude "docs/05.리포트/ 폴더에 {주제}에 대한 가이드 문서를 작성해줘.
- 형식: 마크다운
- 용도: 팀 내부 참고용 또는 교육 배포용
- 내용: 배경, 절차, 주의사항, 트러블슈팅을 포함"
```

**입력**: 프로젝트 컨텍스트, 주제 키워드
**출력**: docs/05.리포트/{주제}-가이드.md
**참고**: Document Chaining에 포함되지 않는 부가 문서를 생성합니다. 예시: 배포 가이드, 결제 연동 가이드, AI Agent 가이드 등.
