// 가상 원어민 영상 통화
// 대화 엔진은 플러그인 구조: window.DUO_DIALOGUE_ENGINE = (scenario, deps) => ({ first(), answer(text) })
// 를 정의하면 스크립트 엔진 대신 LLM 기반 엔진이 사용된다. 반환 계약은 아래 createScriptedEngine 참조.
import { TUTOR, TOPICS, SCENARIOS, REACTIONS, MISS_LINES, MOVE_ON } from '../convo.js';
import { icons } from '../icons.js';
import { sfx, speak, stopSpeak, ttsAvailable, srSupported, voiceList, setVoice, createRecognizer } from '../audio.js';
import { createLlmEngine } from '../llm-engine.js';
import { escapeHtml as esc } from '../checker.js';
import { shuffle } from '../session.js';
import { profile, addXp, save } from '../state.js';
import { render, renderTopbar, trapFocus } from '../app.js';

const overlay = () => document.getElementById('overlay');
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let releaseTrap = null; // 통화 오버레이 포커스 트랩 해제 함수

// ── 스크립트 대화 엔진 ──
// 계약: first() → exchange, answer(text) → { verdict: 'match'|'recast'|'moveon', reaction, model?, next }
// exchange: { say, ko, replies[] }
function createScriptedEngine(scenario) {
  const queue = [...scenario.topics];
  let free = shuffle(TOPICS, Math.random);
  let topic = null;
  let exIdx = 0;
  let misses = 0;

  const nextTopic = () => {
    topic = queue.shift() || free.shift();
    if (!topic) {
      free = shuffle(TOPICS, Math.random);
      topic = free.shift();
    }
    exIdx = 0;
    misses = 0;
  };
  nextTopic();
  const cur = () => topic.exchanges[exIdx];
  const advance = () => {
    misses = 0;
    exIdx += 1;
    if (exIdx >= topic.exchanges.length) nextTopic();
  };

  return {
    first: () => ({ ...cur() }),
    answer(text) {
      const ex = cur();
      const ok = ex.keywords.some((k) => k.test(text));
      if (ok) {
        const reaction = ex.onMatch || pick(REACTIONS);
        advance();
        return { verdict: 'match', reaction, next: { ...cur() } };
      }
      misses += 1;
      if (misses === 1) {
        return { verdict: 'recast', reaction: pick(MISS_LINES), model: ex.replies[0], next: { ...ex } };
      }
      advance();
      return { verdict: 'moveon', reaction: pick(MOVE_ON), next: { ...cur() } };
    },
  };
}

// ── 아바타 (기하학적 튜터 — 마스코트 아님, 통화 상대의 초상) ──
function avatarSVG(size = 220) {
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="92" fill="#262b18"/>
    <circle cx="100" cy="100" r="92" fill="none" stroke="#c9f158" stroke-width="2" opacity="0.35"/>
    <!-- 어깨 -->
    <path d="M40 200c0-34 27-52 60-52s60 18 60 52z" fill="#c9f158"/>
    <!-- 목 -->
    <rect x="88" y="128" width="24" height="26" rx="10" fill="#e8dcc5"/>
    <!-- 얼굴 -->
    <rect x="56" y="42" width="88" height="96" rx="42" fill="#f2efe3"/>
    <!-- 머리 -->
    <path d="M56 84c-4-34 18-52 44-52s48 18 44 52c-2-20-14-26-24-24 4 6 4 12 2 16-8-12-24-16-40-10-12 4-20 10-26 18z" fill="#16190e"/>
    <!-- 귀 헤드폰 -->
    <path d="M50 78c-8 0-12 8-12 18s4 18 12 18z" fill="#16190e"/>
    <path d="M150 78c8 0 12 8 12 18s-4 18-12 18z" fill="#16190e"/>
    <path d="M50 80c0-30 22-46 50-46s50 16 50 46" fill="none" stroke="#16190e" stroke-width="7"/>
    <!-- 눈 -->
    <g class="eyes">
      <circle class="eye" cx="82" cy="92" r="5.5" fill="#16190e"/>
      <circle class="eye" cx="118" cy="92" r="5.5" fill="#16190e"/>
    </g>
    <!-- 볼 -->
    <circle cx="72" cy="106" r="5" fill="#c9f158" opacity="0.55"/>
    <circle cx="128" cy="106" r="5" fill="#c9f158" opacity="0.55"/>
    <!-- 입 -->
    <rect class="mouth" x="90" y="112" width="20" height="7" rx="3.5" fill="#16190e"/>
    <!-- 마이크 붐 -->
    <path d="M152 108c2 16-10 30-28 34" fill="none" stroke="#16190e" stroke-width="5" stroke-linecap="round"/>
    <circle cx="122" cy="144" r="7" fill="#c9f158" stroke="#16190e" stroke-width="4"/>
  </svg>`;
}

// ── 로비 ──
export function renderCall(el) {
  const mins = Math.round(profile.callSeconds / 60);
  el.innerHTML = `
    <div class="page-eyebrow">Video Call — 가상 원어민 회화</div>
    <h1 class="page-title">전화 영어</h1>
    <p class="page-sub">언제든, 원하는 만큼. 통화가 길어질수록 실력이 늘어요.</p>

    <div class="tutor-card">
      <div class="tutor-ava">${avatarSVG(96)}</div>
      <div class="tutor-info">
        <h4>${TUTOR.name} <span class="online-dot"></span><span class="online">온라인</span></h4>
        <p class="t-tag">${TUTOR.tag}</p>
        <p class="t-bio">${TUTOR.bio}</p>
      </div>
      <div class="tutor-stats">
        <div><b>${mins}</b><span>분 통화</span></div>
        <div><b>${profile.callExchanges}</b><span>주고받은 말</span></div>
      </div>
    </div>

    <h3 class="page-eyebrow" style="margin-bottom:14px">Voice — 엠마의 목소리</h3>
    <div class="voice-row">
      <select id="voiceSel" class="voice-select"></select>
      <button class="btn white" id="voicePrev" style="padding:11px 18px;font-size:12px">미리듣기</button>
    </div>
    <p class="call-note" style="margin-top:10px">가장 자연스러운 음성이 자동 선택돼요.
      더 진짜 같은 목소리를 원하면 <b>Edge의 "(Natural)" 음성</b> 또는 <b>Chrome의 "Google US English"</b>를 골라 보세요.
      macOS는 시스템 설정 → 손쉬운 사용 → 음성 콘텐츠에서 <b>프리미엄 음성</b>을 내려받으면 목록에 나타나요.<br>
      대화 모델은 이 Mac의 ChatGPT 로그인으로 <b>GPT-5.6 Sol · High</b>를 실행해요. API 키는 쓰지 않아요.</p>

    <h3 class="page-eyebrow" style="margin-bottom:14px">Scenarios — 시나리오 선택</h3>
    <div class="scenario-grid">
      ${SCENARIOS.map(
        (s) => `
        <button class="scenario" data-scenario="${s.id}">
          <span class="sc-title">${s.title}${s.endless ? ' <em>∞</em>' : ''}</span>
          <span class="sc-desc">${s.desc}</span>
          <span class="sc-cta">${icons.video()} 통화 시작</span>
        </button>`
      ).join('')}
    </div>
    <p class="call-note">${srSupported() ? `${icons.mic()} 마이크로 직접 말하거나, 제안된 답을 탭할 수 있어요.` : '이 브라우저는 음성 인식을 지원하지 않아요 — 제안된 답을 탭하거나 입력해서 대화해요. (Chrome 권장)'}</p>`;

  // 보이스 선택기 채우기 (voiceschanged 대응)
  const sel = el.querySelector('#voiceSel');
  const fillVoices = () => {
    const list = voiceList();
    if (!list.length) {
      sel.innerHTML = `<option value="">(브라우저 기본 음성)</option>`;
      return;
    }
    const current = profile.voiceName;
    sel.innerHTML = list
      .map((v) => `<option value="${v.name.replace(/"/g, '&quot;')}" ${v.name === current ? 'selected' : ''}>${v.name}${v.localService ? '' : ' ☁'}</option>`)
      .join('');
    if (!current) sel.selectedIndex = 0;
  };
  fillVoices();
  if ('speechSynthesis' in window) {
    speechSynthesis.addEventListener('voiceschanged', fillVoices, { once: true });
  }
  sel.onchange = () => {
    profile.voiceName = sel.value || null;
    save();
    setVoice(profile.voiceName);
    speak("Hi! I'm Emma. It's so nice to meet you!");
  };
  el.querySelector('#voicePrev').onclick = () => {
    speak("Hi! I'm Emma, your English tutor. Ready when you are!");
  };

  el.querySelectorAll('[data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => startCall(btn.dataset.scenario));
  });
}

// ── 통화 ──
let C = null;

function startCall(scenarioId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
  // 우선순위: 외부 주입 엔진 > LLM 엔진(실제 대화) > 스크립트 엔진
  const engineFactory = window.DUO_DIALOGUE_ENGINE || createLlmEngine || createScriptedEngine;
  C = {
    scenario,
    engine: engineFactory(scenario),
    ex: null,
    startAt: Date.now(),
    timerInt: null,
    stream: null,
    sr: null,
    micMuted: false,
    showKo: true,
    connected: false,
    log: { exchanges: 0, xp: 0, words: 0, recasts: [], phrases: [] },
  };

  const ov = overlay();
  ov.classList.add('open', 'call');
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', '영상 통화');
  ov.innerHTML = `
    <div class="call-screen">
      <div class="call-top">
        <span class="call-title">${scenario.title} · ${TUTOR.name}</span>
        <span class="call-timer" id="callTimer">연결 중…</span>
      </div>
      <div class="call-stage">
        <div class="tile tutor" id="tutorTile">
          ${avatarSVG(230)}
          <span class="tile-name">${TUTOR.name} · 원어민 튜터</span>
        </div>
        <div class="tile self">
          <video id="selfVid" autoplay muted playsinline></video>
          <div class="self-off" id="selfOff">${icons.face()}<span>카메라 꺼짐</span></div>
          <span class="tile-name">나</span>
        </div>
      </div>
      <div class="call-caption" id="callCap"><em>잠시만요, 연결하고 있어요…</em></div>
      <div class="call-answer" id="callAns"></div>
      <div class="call-controls">
        <button class="cbtn" id="koBtn" title="한국어 자막">한</button>
        <button class="cbtn" id="micBtn" title="마이크">${icons.mic()}</button>
        <button class="cbtn end" id="endBtn" title="통화 종료">${icons.phoneDown()}</button>
      </div>
    </div>`;

  // 셀프 뷰 (실패해도 통화는 계속)
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (!C) return stream.getTracks().forEach((t) => t.stop());
        C.stream = stream;
        const v = document.getElementById('selfVid');
        v.srcObject = stream;
        v.style.display = 'block';
        document.getElementById('selfOff').style.display = 'none';
      })
      .catch(() => {});
  }

  releaseTrap?.(); // 재통화 시 이전 트랩 정리
  releaseTrap = trapFocus(ov, { onEscape: () => (C ? endCall() : closeCall()) });

  document.getElementById('endBtn').onclick = endCall;
  document.getElementById('koBtn').onclick = () => {
    C.showKo = !C.showKo;
    document.getElementById('koBtn').classList.toggle('off', !C.showKo);
    renderCaption();
  };
  document.getElementById('micBtn').onclick = () => {
    C.micMuted = !C.micMuted;
    document.getElementById('micBtn').innerHTML = C.micMuted ? icons.micOff() : icons.mic();
    document.getElementById('micBtn').classList.toggle('off', C.micMuted);
    if (C.micMuted) stopSR();
    else if (C.awaiting) startSR();
  };

  sfx.ring();
  C.connectTO = setTimeout(() => {
    if (!C) return;
    C.connected = true;
    sfx.connect();
    C.timerInt = setInterval(updateTimer, 1000);
    updateTimer();
    tutorTurn(C.engine.first());
  }, 1700);
}

function updateTimer() {
  if (!C) return;
  const s = Math.floor((Date.now() - C.startAt) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const el = document.getElementById('callTimer');
  if (el) el.innerHTML = `<span class="rec-dot"></span>${mm}:${ss}`;
}

function renderCaption(userLine = null) {
  const cap = document.getElementById('callCap');
  if (!cap || !C?.ex) return;
  // LLM 응답(say/ko)·사용자 발화는 신뢰 불가 텍스트 — 반드시 이스케이프
  cap.innerHTML = `
    <div class="cap-tutor"><b>${TUTOR.name}</b> ${esc(C.ex.say)}</div>
    ${C.showKo && C.ex.ko ? `<div class="cap-ko">${esc(C.ex.ko)}</div>` : ''}
    ${userLine ? `<div class="cap-user"><b>나</b> ${esc(userLine)}</div>` : ''}`;
}

function tutorTurn(ex, preline = null) {
  if (!C) return;
  C.ex = ex;
  C.awaiting = false;
  if (!C.log.phrases.includes(ex.say)) C.log.phrases.push(ex.say);
  renderCaption();
  const ansEl = document.getElementById('callAns');
  if (ansEl) ansEl.innerHTML = `<div class="ans-status">…</div>`;
  const tile = document.getElementById('tutorTile');
  tile?.classList.add('speaking');
  const text = preline ? `${preline} ${ex.say}` : ex.say;
  speak(text, {
    rate: 0.96,
    onEnd: () => {
      tile?.classList.remove('speaking');
      awaitAnswer();
    },
  });
}

function awaitAnswer() {
  if (!C) return;
  C.awaiting = true;
  const ansEl = document.getElementById('callAns');
  if (!ansEl) return;
  const canSR = srSupported() && !C.micMuted;
  ansEl.innerHTML = `
    <div class="ans-status ${canSR ? 'live' : ''}" id="ansStatus">
      ${canSR ? `${icons.mic()} 듣고 있어요 — 영어로 말해 보세요` : '답을 탭하거나 입력하세요'}
    </div>
    <div class="call-chips">
      ${canSR ? `<button class="chip" id="speechRetry">${icons.mic()} 다시 말하기</button>` : ''}
      ${C.ex.replies.map((r, i) => `<button class="chip" data-reply="${i}">${esc(r)}</button>`).join('')}
    </div>
    <form class="call-input" id="callForm">
      <input type="text" id="callText" placeholder="직접 영어로 입력…" autocomplete="off" />
      <button class="btn" type="submit">보내기</button>
    </form>`;
  ansEl.querySelectorAll('[data-reply]').forEach((b) => {
    b.onclick = () => {
      sfx.select();
      onUser(C.ex.replies[+b.dataset.reply]);
    };
  });
  document.getElementById('callForm').onsubmit = (e) => {
    e.preventDefault();
    const v = document.getElementById('callText').value.trim();
    if (v) onUser(v);
  };
  const retry = document.getElementById('speechRetry');
  if (retry) retry.onclick = startSR;
  if (canSR) startSR();
}

function startSR() {
  if (!C) return;
  stopSR();
  let failed = false;
  const r = createRecognizer({
    onResult: (t) => onUser(t),
    onInterim: (interim) => {
      const st = document.getElementById('ansStatus');
      if (st) st.innerHTML = `${icons.mic()} "${esc(interim)}"`;
    },
    onError: () => {
      failed = true;
      const st = document.getElementById('ansStatus');
      if (st) st.textContent = '마이크를 듣지 못했어요 — 다시 말하기를 눌러 주세요';
    },
    onEnd: () => {
      if (C?.sr === r) C.sr = null;
      // 무음으로 끝나면 대기 상태 유지 (칩/입력은 계속 사용 가능)
      if (!failed && C?.awaiting && !C.micMuted) {
        const st = document.getElementById('ansStatus');
        if (st) st.textContent = '못 들었어요 — 다시 말하기를 누르거나 아래 답을 탭하세요';
      }
    },
  });
  C.sr = r;
}

function stopSR() {
  if (C?.sr) {
    try { C.sr.onend = null; C.sr.stop(); } catch {}
    C.sr = null;
  }
}

async function onUser(text) {
  if (!C || !C.awaiting) return;
  C.awaiting = false;
  stopSR();
  C.log.words += text.split(/\s+/).filter(Boolean).length;
  renderCaption(text);
  // LLM 엔진은 async — 응답 대기 동안 "생각 중" 연출
  const ansEl = document.getElementById('callAns');
  if (ansEl) ansEl.innerHTML = `<div class="ans-status">Emma가 듣고 생각하고 있어요…</div>`;
  const callToken = C;
  const res = await C.engine.answer(text);
  if (!C || C !== callToken) return; // 대기 중 통화가 끝났으면 무시
  if (res.verdict === 'match') {
    C.log.exchanges += 1;
    profile.callExchanges += 1;
    const gained = addXp(2);
    C.log.xp += gained;
    save();
    sfx.tick(C.log.exchanges % 5);
    tutorTurn(res.next, res.reaction);
  } else if (res.verdict === 'recast') {
    C.log.recasts.push({ prompt: C.ex.say, mine: text, model: res.model });
    tutorTurn(res.next, `${res.reaction} You could say: "${res.model}".`);
  } else {
    tutorTurn(res.next, res.reaction);
  }
}

function endCall() {
  if (!C) return;
  stopSR();
  stopSpeak();
  clearTimeout(C.connectTO); // 연결 연출 타임아웃 — 종료 후·재통화 중 발화 방지
  clearInterval(C.timerInt);
  if (C.stream) C.stream.getTracks().forEach((t) => t.stop());
  sfx.hangup();

  const dur = Math.floor((Date.now() - C.startAt) / 1000);
  profile.callSeconds += dur;
  save();
  renderTopbar();

  const mm = String(Math.floor(dur / 60)).padStart(2, '0');
  const ss = String(dur % 60).padStart(2, '0');
  const { exchanges, xp, words, recasts, phrases } = C.log;
  const newPhrases = phrases.slice(0, 6);

  overlay().innerHTML = `
    <div class="call-feedback">
      <div class="page-eyebrow" style="border-color:var(--lime);color:var(--lime)">Call Report — 통화 리포트</div>
      <h2>수고했어요!</h2>
      <div class="r-cards">
        <div class="r-card acc"><div class="r-label">통화 시간</div><div class="r-value">${mm}:${ss}</div></div>
        <div class="r-card xp"><div class="r-label">주고받은 말</div><div class="r-value">${exchanges}</div></div>
        <div class="r-card xp"><div class="r-label">획득 XP</div><div class="r-value">${icons.bolt()}+${xp}</div></div>
        <div class="r-card gem"><div class="r-label">말한 단어</div><div class="r-value">${words}</div></div>
      </div>
      ${recasts.length ? `
        <h4 class="fb-title">더 자연스럽게 말해 봐요</h4>
        <div class="fb-list">
          ${recasts.slice(0, 5).map((r) => `
            <div class="fb-row">
              <div class="fb-mine">"${esc(r.mine)}"</div>
              <div class="fb-model">→ ${esc(r.model)}</div>
            </div>`).join('')}
        </div>` : ''}
      ${newPhrases.length ? `
        <h4 class="fb-title">오늘 나온 표현</h4>
        <div class="fb-list">
          ${newPhrases.map((p) => `<div class="fb-row"><div class="fb-model">${esc(p)}</div></div>`).join('')}
        </div>` : ''}
      <div class="fb-actions">
        <button class="btn big" id="againBtn">다시 통화하기</button>
        <button class="btn ghost" id="closeBtn">로비로 돌아가기</button>
      </div>
    </div>`;

  const scenarioId = C.scenario.id;
  C = null;
  const againBtn = document.getElementById('againBtn');
  againBtn.focus();
  againBtn.onclick = () => startCall(scenarioId);
  document.getElementById('closeBtn').onclick = closeCall;
}

function closeCall() {
  releaseTrap?.();
  releaseTrap = null;
  const ov = overlay();
  ov.classList.remove('open', 'call');
  ov.innerHTML = '';
  ov.removeAttribute('role');
  ov.removeAttribute('aria-modal');
  ov.removeAttribute('aria-label');
  render();
}
