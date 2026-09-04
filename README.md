# Prompt Manager

프롬프트를 보관·검색하고, 수정할 때마다 버전으로 남기고, 변수를 채워 Claude로 바로 실행하는 개인용 웹앱.

- **보관/검색** — 제목·설명·본문·태그 전체 검색, 태그/즐겨찾기 필터
- **버전 관리** — 본문이 바뀔 때마다 스냅샷 저장, 이전 버전과 줄 단위 diff 비교, 복원
- **변수 템플릿 + 실행** — 본문의 `{{변수}}` 를 채워 렌더링 후 Claude API 호출, 실행 기록 보관

React + Vite + Firebase(Auth/Firestore) + Cloudflare Worker.

## 구조

```
src/
  firebase.js          Firebase 초기화 (환경변수 기반)
  auth/AuthContext.jsx Google 로그인 + 허용 이메일 제한
  lib/store.js         Firestore 데이터 계층 (prompts / versions / runs)
  lib/template.js      {{변수}} 추출·치환
  lib/diff.js          LCS 줄 단위 diff
  lib/claude.js        Worker 호출 클라이언트
  pages/               목록·편집·상세(버전/diff)·실행·실행기록
worker/index.js        Claude API 프록시 (API 키를 브라우저에 노출하지 않음)
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

프롬프트 실행 기능까지 쓰려면 Worker도 함께 띄웁니다 (Vite가 `/run` 을 :8798로 프록시).

```bash
npx wrangler secret put ANTHROPIC_API_KEY   # 최초 1회 (배포용 시크릿)
npm run worker:dev
```

로컬 Worker에서는 `.dev.vars` 파일에 `ANTHROPIC_API_KEY=...` 를 넣어두면 됩니다. 이 파일은 `.env` 와 함께 커밋되지 않습니다.

## 준비 (Firebase)

1. Firebase 콘솔에서 프로젝트 생성 → 웹 앱 추가 → SDK 설정값을 `.env` 에 복사
2. Authentication → Google 로그인 사용 설정, 승인된 도메인에 `localhost` 와 배포 도메인 추가
3. Firestore 생성 후 규칙 배포: `npx firebase deploy --only firestore:rules`

`VITE_ALLOWED_EMAILS` 에 이메일을 넣으면 그 계정만 로그인할 수 있습니다.

## 배포

- **프론트엔드** — main 브랜치 푸시 시 GitHub Actions가 GitHub Pages로 배포. 저장소 Variables에 `FIREBASE_*`, `ALLOWED_EMAILS`, `WORKER_BASE` 를 등록해야 합니다.
- **Worker** — `npm run worker:deploy`. 배포 후 나온 workers.dev URL을 `WORKER_BASE` 변수에 넣습니다.

Worker는 `worker/index.js` 의 `ALLOWED_ORIGINS` 에 있는 출처에서만 호출을 받습니다. 배포 도메인이 다르면 이 목록을 함께 수정하세요.
