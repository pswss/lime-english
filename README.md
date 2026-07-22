# LIME (라임) — Paper & Acid Edition

한국어 화자를 위한 영어 학습 앱. 듀오링고식 학습 루프를 완전 구현한 정적 SPA로,
빌드 도구·프레임워크·의존성 없이 vanilla ES 모듈로만 작성됐다.

## 실행

```sh
./serve.sh            # 0.0.0.0:8642 에서 서빙 (백그라운드, nohup)
```

| 접속 경로 | URL |
|---|---|
| 이 맥에서 | http://localhost:8642 |
| 테일넷 기기(iPhone/iPad 등) | `http://<tailscale-ip>:8642` |
| MagicDNS | `http://<device>.<tailnet>.ts.net:8642` |

> HTTPS `ts.net` 주소가 필요하면 테일넷에서 serve 기능을 활성화한 뒤
> `tailscale serve --bg 8642` 를 실행하면 된다 (관리 콘솔 승인 필요).

### LLM 통화 인증

`/call/reply`는 HTTP Basic 인증을 통과해야 Codex를 실행한다. 두 값이 없거나
비밀번호가 16자 미만이면 통화 API만 `503`으로 닫히고 정적 앱은 계속 제공된다.

```sh
export LIME_CALL_USER='<username>'
export LIME_CALL_PASSWORD='<strong-random-password>'
./serve.sh
```

브라우저 UI가 첫 `401`에서 자격 증명을 요청하고 재시도한다. Basic 인증은 자격 증명을
암호화하지 않으므로 테일스케일 터널 또는 HTTPS 안에서만 사용한다.

launchd는 셸의 `export`를 상속하지 않는다. 로컬 LaunchAgent의 `EnvironmentVariables`에
같은 두 키를 추가하고 plist를 사용자만 읽을 수 있게 설정한 뒤 재시작한다.
실제 값이나 plist는 저장소에 커밋하지 않는다.

## 기능

- **커리큘럼** — CEFR A1→C1, 7개 섹션 × 6유닛 = 42유닛 · 252레슨 노드 · 문장쌍 500+
- **문제 유형 9종** — 객관식, 단어은행(양방향), 타이핑, 듣기(TTS), 짝 맞추기, 빈칸, **말하기(음성 인식)**, **자유응답 대화**(B1+ 이상)
- **학습 시스템** — 배치고사(섹션별 2문제 → 시작점 추천), 간격 반복 복습(SM-2 lite: 틀린 문장은 즉시, 맞히면 1→3→7→21일로 간격 성장, 7일+ 간격에서 2회 성공하면 졸업 — 완료한 유닛의 문장도 다음 날 due로 자동 유입), 유닛 체크포인트(트로피 복습), 레전더리 티어(복습 무실수 클리어)
- **가상 원어민 영상 통화** — 시나리오 6종(프리토크∞·스몰토크·카페·면접·여행·토론), 음성 인식 + 제안 답 하이브리드, 오답 리캐스트 교정, 통화 후 리포트(교정·표현·통계), XP 연동
  - 로컬 LLM: `server.py`가 ChatGPT 로그인된 Codex CLI의 `gpt-5.6-sol`을 reasoning `high`로 호출 (API 키 없음, shell·web·apps 등 도구 비활성화)
  - 대화 엔진 플러그인: `window.DUO_DIALOGUE_ENGINE = (scenario) => ({first, answer})` 로 LLM 교체 가능
- **자연스러운 음성** — 보이스 자동 랭킹(Edge Natural > Google US English > macOS Premium), 문장 청크·호흡·피치 지터로 프로소디 휴머나이즈, 로비에서 보이스 선택/미리듣기
  - 뉴럴 TTS 주입점: `window.DUO_TTS = async (text) => audioUrl` (실패 시 브라우저 TTS 폴백)
- **사운드 디자인(리서치 기반)** — 정답 F#5→A#5 장3도, 오답 F#→C 트라이톤, 연속 정답·짝맞추기 콤보 반음 상승, 레벨업/스트릭/XP 틱, 전 재생 미세 피치 랜덤, 상단바 음소거 토글
- **오답 재출제 / 오타 허용**(편집거리 1) / **게임화**(하트·XP·레벨·보석·스트릭·프리즈·부스트) / **일일 퀘스트·주간 리그·상점·프로필**
- **영속화** — localStorage (`duo.profile.v1`)

## 디자인: "Paper & Acid"

awwwards 2025–2026 수상작(SOTY Messenger·Igloo Inc, SOTD MONOLOG·Depo Luxe 등)과
트렌드 리포트를 분석해 도출한 원칙을 적용:

1. **타입이 히어로** — Bricolage Grotesque(디스플레이) + Pretendard(한글) + IBM Plex Mono(데이터 라벨)
2. **단일 훈 커밋** — 애시드 라임(`#c9f158`) tone-on-tone; 기능색은 크림슨(하트/오답)·코발트(보석)만
3. **본지 위 잉크** — 순백/순흑 대신 `#f2efe3` / `#16190e`
4. **구조 노출** — 헤어라인 룰, 인덱스 숫자(01–06), 모노 대문자 라벨, 에디토리얼 섹션 헤더
5. **다크 포커스 모드** — 레슨은 잉크 배경 + 라임 글로우 (CSS 변수 스코프 재정의로 전환)
6. **절제된 모션** — 로드 스태거, 마퀴, 정답/오답 컬러 블록 슬램만
7. **그레인 텍스처** — SVG feTurbulence 오버레이

## 구조

```
index.html          셸 + 에러 비컨
styles.css          디자인 시스템 전체
server.py           no-store 정적 서버 + /__err 비컨 + 인증된 /call/reply
serve.sh            서버 런처
src/
  app.js            해시 라우터 + 상단바/내비 + 부트스트랩
  data.js           코스 애그리게이터 (SECTIONS/COURSE/섹션 경계)
  course/           섹션별 콘텐츠 (section1~7.js, CEFR A1→C1)
  checker.js        답안 정규화·채점 (순수)
  session.js        시드 RNG·문제 생성·배치고사·약점복습 (순수)
  dialogue.js       자유응답 프롬프트 (B1+)
  convo.js          통화 시나리오 스크립트 + 튜터 페르소나
  state.js          프로필·영속화·하트/스트릭/퀘스트/리그/레전더리/약점
  audio.js          효과음 신시사이저 + 휴머나이즈드 TTS (+DUO_TTS 훅)
  views/            path / lesson / call / shop / leaderboard / profile
tests/              bun test (순수 로직 + 브라우저 인증 620 테스트)
CLAUDE.md           다음 세션 AI 인수인계 문서
```

## 테스트

```sh
bun test
python3 -m unittest discover -s tests -p 'test_server.py'
```
