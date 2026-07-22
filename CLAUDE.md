# LIME (라임) — AI 세션 인수인계

한국어 화자용 영어 학습 앱 (듀오링고식 학습 루프). 빌드 도구·프레임워크·의존성 **없음** — vanilla ES 모듈 정적 SPA. 이 문서만 읽으면 바로 작업 가능하도록 유지할 것.

## 실행·검증 명령

```sh
./serve.sh                 # server.py 를 0.0.0.0:8642 에 nohup 실행
bun test                   # 순수 로직 + 브라우저 인증 620 테스트 — 커밋 전 필수
python3 -m unittest discover -s tests -p 'test_server.py'  # 로컬 LLM 서버 호출 계약
open http://localhost:8642
```

- 통화 인증: `LIME_CALL_USER='<username>'`, `LIME_CALL_PASSWORD='<strong-random-password>'` (16자 이상) 설정 후 서버 재시작. 미설정 시 `/call/reply`만 `503`.
- launchd: 로컬 LaunchAgent `EnvironmentVariables`에 위 두 키 추가. plist 권한은 사용자 전용, 실제 값은 커밋 금지.
- 테일넷 접속: `http://<tailscale-ip>:8642` (또는 `http://<device>.<tailnet>.ts.net:8642`)
- 원격 기기 디버깅: 클라이언트 JS 에러·렌더 핑이 `POST /__err` → `/tmp/duolingo-client-errors.log` 에 쌓임. 원격 기기 blank 화면이면 이 로그부터 볼 것.
- 스모크 테스트는 헤드리스 브라우저로: 레슨은 `generateSession`을 페이지 안에서 동일 인자로 재계산하면 정답 자동 입력 가능 (결정적 RNG).

## 아키텍처 (모듈 경계 = 계약)

- **순수 로직** (`src/checker.js`, `src/session.js`) — DOM 금지. 테스트 대상. 시드 RNG(mulberry32 + seedFrom)로 **완전 결정적**: 같은 (unitId, lessonIndex, attempt) → 같은 세션.
- **콘텐츠** (`src/course/section1~7.js`) — 스키마 고정: 유닛 = `{id, title, subtitle, icon, lessonCount:5, pairs[12]{ko,en,alt[]}, words[8]{ko,en}, distractorsEn[8], distractorsKo[8]}`. en은 공백 토큰화 전제(하이픈·스마트쿼트 금지, 아포스트로피는 큰따옴표 JS 문자열). **콘텐츠 추가 시 `bun test`가 불변식(은행 멀티셋, 정답 인덱스, 중복 등)을 자동 검증**.
- **상태** (`src/state.js`) — localStorage 키 `duo.profile.v1` (브랜드 변경과 무관하게 유지 — 마이그레이션 비용 회피). 프로필 필드 추가는 `defaults()`에 넣으면 스프레드 병합으로 하위호환.
- **오디오** (`src/audio.js`) — 효과음은 WebAudio 합성(F# 장조 패밀리; 정답 F#5→A#5 장3도, 오답 트라이톤, 콤보 반음 상승 — 리서치 근거 주석 참조). TTS는 보이스 랭킹(Natural>Google US English>Premium) + 문장 청크·호흡·지터. **주입점**: `window.DUO_TTS = async (text) => audioUrl`.
- **통화 엔진** (`src/views/call.js` + `src/convo.js` + `src/llm-engine.js`) — 웹 서버의 `/call/reply`가 Codex CLI(`gpt-5.6-sol`, reasoning `high`)를 text-only로 호출(shell·web·apps·browser·multi-agent 비활성화). **주입점**: `window.DUO_DIALOGUE_ENGINE = (scenario) => ({first(), answer(text)})`. answer 반환 계약: `{verdict:'match'|'recast'|'moveon', reaction, model?, next}`.
- **뷰** (`src/views/`) — 템플릿 문자열 + innerHTML. app.js ↔ views 순환 임포트는 함수 선언 호이스팅으로 안전 (모듈 레벨에서 상호 호출 금지 유지할 것).

## 디자인 시스템 "Paper & Acid" (awwwards 2025–26 분석 기반)

- 단일 훈 **애시드 라임** `#c9f158` tone-on-tone. 기능색은 크림슨(하트/오답)·코발트(보석)만. 새 색 추가 금지.
- 본지 `#f2efe3` / 잉크 `#16190e`. 타이포: Bricolage Grotesque(라틴 디스플레이) + Pretendard(한글) + IBM Plex Mono(데이터 라벨).
- 레슨/통화 오버레이는 **CSS 변수 스코프 재정의**로 다크 전환 (`#overlay { --text: ...; --paper: ... }`) — 컴포넌트 색을 하드코딩하지 말고 변수를 쓸 것.
- 마스코트 금지 (제거된 사양). 하드 섀도우 `4px 4px 0 var(--ink)`, 헤어라인, 모노 대문자 라벨이 아이덴티티.

## 함정 (겪은 것들)

1. **스테일 모듈 캐시**: 과거 `js/` 경로 시절 캐시가 새 모듈과 섞여 `Importing binding name not found` blank 발생 → `src/`로 이전 + server.py가 `Cache-Control: no-store` 전송. **모듈 export를 바꾸면 구캐시 기기에서 깨질 수 있음을 항상 의심** (비컨 로그 확인).
2. **python http.server 기본값**: backlog 5 + HTTP/1.0은 모듈 13개 동시 fetch에서 connection reset → server.py는 HTTP/1.1 keep-alive + backlog 64. SimpleHTTPServer로 되돌리지 말 것.
3. **Safari**: SpeechRecognition 미지원 → 말하기 문제는 세션 생성에서 자동 제외(`srAvailable` 게이트), 통화는 칩/입력 폴백. `speechSynthesis` 보이스도 빈약 — 로비 안내문 유지.
4. **ES 모듈 = strict mode**: 브라우저 전용 API는 `ttsAvailable()` 같은 typeof 가드 뒤에서만. JSC CLI(`/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc --module-file=src/app.js`)로 사파리 엔진 파싱 검증 가능 (window 에러 도달 = 파싱 전체 통과).
5. **generateSession 옵션 게이트**: `srAvailable`/`dialoguePrompts`를 명시해야 speak/dialogue 유형이 나옴 — 기본 호출은 기존 테스트와 동일 출력을 유지해야 함 (결정성 테스트가 이를 방어).

## 게임 시스템 요약

하트 5(30분당 1 재생) · XP(레벨=100당 1) · 보석 · 스트릭+프리즈 · 더블XP부스트 · 일일퀘스트 3종 · 주간 리그(결정적 봇: `weekStart` 시드) · 배치고사(섹션별 2문제, 전 섹션 통과시 C1 배치) · 간격 반복 복습(`weakPairs`: en 키 → `{misses,due,interval,wins}` SM-2 lite — miss면 즉시, hit면 1→3→7→21일, 7일+에서 2회 성공 시 졸업, 유닛 완료 시 문장 자동 유입) · 레전더리(완료 유닛 복습을 무실수 재클리어) · 통화 XP(교환당 2).

## 커밋 규칙 (사용자 글로벌 지침)

- 논리적 변경 1개 = 커밋 1개, 메시지는 한국어로 무엇을·왜.
- 커밋 전 `bun test` 통과 확인. main 직접 커밋·푸시.
- 비밀(API 키 등) 커밋 금지.

## 남은 아이디어 (우선순위 없음)

- 오프라인 `LIME.app`용 통화 LLM 네이티브 브리지 (현재 `/call/reply`는 웹 서버 전용)
- 뉴럴 TTS 연결 (`DUO_TTS` 훅에; API 키 필요)
- 듣기 전용 롱폼 콘텐츠(B2+), 스토리 모드
- 리그 승급/강등 실제 반영 (현재 표시만)
- PWA 매니페스트 + 오프라인 캐시(단, no-store 정책과 조율 필요)
