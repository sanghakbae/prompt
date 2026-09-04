# Prompt Manager

프롬프트를 보관·검색하고, 수정할 때마다 버전으로 남기고, 변수를 채워 Claude로 바로 실행하는 개인용 웹앱.

- **보관/검색** — 제목·설명·본문·태그 전체 검색, 태그/즐겨찾기 필터
- **버전 관리** — 본문이 바뀔 때마다 스냅샷 저장, 이전 버전과 줄 단위 diff 비교, 복원
- **변수 템플릿** — 본문의 `{{변수}}` 를 채워 완성된 프롬프트를 복사. 마지막 입력값 기억
- **Claude 직접 실행 (선택)** — Worker를 배포한 경우에만 활성화. 설정하지 않아도 나머지 기능은 그대로 동작

React + Vite + Firebase(Auth/Firestore) + Cloudflare Worker.

## 구조

```
src/
  firebase.js          Firebase 초기화 (환경변수 기반)
  auth/AuthContext.jsx Google 로그인 + 허용 이메일 제한
  lib/store.js         Firestore 데이터 계층 (prompts / versions / runs)
  lib/template.js      {{변수}} 추출·치환
  lib/diff.js          LCS 줄 단위 diff
  lib/claude.js        Worker 호출 클라이언트 (선택 기능)
  pages/               목록·편집·상세(버전/diff)·실행·실행기록
worker/index.js        Claude API 프록시 — 선택 기능 (API 키를 브라우저에 노출하지 않음)
```

Firestore 문서 구조:

```
users/{uid}/prompts/{id}                 현재 프롬프트
users/{uid}/prompts/{id}/versions/{vid}  버전 스냅샷 (append-only)
users/{uid}/runs/{id}                    실행 기록
```

## 로컬 실행

```bash
npm install
cp .env.example .env      # Firebase 설정 채우기
npm run dev               # http://localhost:5173
```

API 키는 필요 없습니다. 기본 흐름은 변수를 채워 **완성된 프롬프트를 복사**해 쓰는 방식입니다.

Claude를 앱 안에서 바로 호출하고 싶을 때만 Worker를 추가로 띄웁니다.

```bash
echo 'ANTHROPIC_API_KEY=...' > .dev.vars   # 커밋되지 않음
npm run worker:dev                          # Vite가 /run 을 :8798로 프록시
```

이 경우 `.env` 의 `VITE_WORKER_BASE` 를 `http://localhost:8798` 로 설정하면 실행 버튼이 나타납니다.

## 준비 (Firebase)

1. Firebase 콘솔에서 프로젝트 생성 → 웹 앱 추가 → SDK 설정값을 `.env` 에 복사
2. Authentication → Google 로그인 사용 설정, 승인된 도메인에 `localhost` 와 배포 도메인 추가
3. Firestore 생성 후 규칙 배포: `npx firebase deploy --only firestore:rules`

`VITE_ALLOWED_EMAILS` 는 비워두면 모든 Google 계정이 로그인할 수 있습니다. 콤마로 구분한 이메일을 넣으면 그 계정만 허용됩니다. 데이터는 계정(uid)별로 완전히 분리되어 서로의 프롬프트는 보이지 않습니다.

## 배포

- **프론트엔드** — main 브랜치 푸시 시 GitHub Actions가 GitHub Pages로 배포. 저장소 Variables에 `FIREBASE_*`, `ALLOWED_EMAILS`, `WORKER_BASE` 를 등록해야 합니다.
- **Worker (선택)** — 실행 기능을 쓸 때만. `npx wrangler secret put ANTHROPIC_API_KEY` 후 `npm run worker:deploy`, 나온 workers.dev URL을 저장소 `WORKER_BASE` 변수에 넣습니다. 이 변수가 비어 있으면 앱은 실행 버튼 없이 복사 중심으로 동작합니다.

Worker는 `worker/index.js` 의 `ALLOWED_ORIGINS` 에 있는 출처에서만 호출을 받습니다. 배포 도메인이 다르면 이 목록을 함께 수정하세요.
