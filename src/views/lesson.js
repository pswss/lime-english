// 레슨 세션 엔진 (전체 화면 오버레이)
// 모드: lesson(기본) / weak(약점 복습) / placement(배치고사)
import { COURSE, SECTIONS, SECTION_STARTS, sectionOfUnit, SHOP_ITEMS } from '../data.js';
import { icons } from '../icons.js';
import { generateSession, generateWeakSession, generatePlacementSession, shuffle } from '../session.js';
import { DIALOGUE_PROMPTS } from '../dialogue.js';
import { checkAnswer, joinTokens, normalize } from '../checker.js';
import {
  profile, loseHeart, recordLessonComplete, advanceProgress, nodeState, buyItem,
  recordMiss, recordHit, markLegendary, applyPlacement, levelOf,
} from '../state.js';
import { sfx, speak, stopSpeak, ttsAvailable, srSupported } from '../audio.js';
import { render, renderTopbar, toast, trapFocus } from '../app.js';

const overlay = () => document.getElementById('overlay');
let S = null; // 세션 상태
let releaseTrap = null; // 오버레이 포커스 트랩 해제 함수

// ── 시작점 3종 ──
export function startLesson(unitIndex, lessonIndex) {
  if (profile.hearts <= 0) return noHeartsModal();
  const unit = COURSE.units[unitIndex];
  const isReview = lessonIndex === unit.lessonCount;
  const isRedo = nodeState(unitIndex, lessonIndex) === 'done';
  const si = sectionOfUnit(unitIndex);
  const exercises = generateSession(COURSE, unitIndex, lessonIndex, {
    attempt: profile.lessonsDone,
    ttsAvailable: ttsAvailable(),
    isReview,
    srAvailable: srSupported(),
    dialoguePrompts: DIALOGUE_PROMPTS[si] || null,
  });
  beginSession(exercises, {
    mode: 'lesson',
    unitIndex, lessonIndex, isReview, isRedo,
    hearts: true, requeue: true,
    baseXp: isRedo ? 5 : 10, gems: 15,
  });
}

export function startWeakReview(weakEns) {
  if (profile.hearts <= 0) return noHeartsModal();
  const exercises = generateWeakSession(COURSE, weakEns, {
    ttsAvailable: ttsAvailable(),
    attempt: profile.lessonsDone,
  });
  if (!exercises.length) return toast('복습할 문장이 없어요');
  beginSession(exercises, {
    mode: 'weak',
    hearts: false, requeue: false,
    baseXp: 8, gems: 10,
  });
}

export function startPlacement() {
  const exercises = generatePlacementSession(COURSE, SECTION_STARTS, {
    attempt: profile.lessonsDone,
  });
  beginSession(exercises, {
    mode: 'placement',
    hearts: false, requeue: false,
    baseXp: 0, gems: 0,
  });
}

function beginSession(exercises, cfg) {
  S = {
    ...cfg,
    queue: exercises.slice(),
    idx: 0,
    correct: 0,
    mistakes: 0,
    requeued: 0,
    combo: 0,
    checked: false,
    ex: null,
    ui: {},
    sectionScore: {}, // placement용: {si: correctCount}
    speakTries: 0,
  };
  const ov = overlay();
  ov.classList.add('open');
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', cfg.mode === 'placement' ? '배치고사' : cfg.mode === 'weak' ? '복습' : '레슨');
  renderExercise();
  releaseTrap = trapFocus(ov, {
    onEscape: () => {
      if (document.querySelector('.modal-back')) return; // 모달이 자체 Escape 처리
      const done = document.getElementById('doneBtn');
      if (done) return done.click(); // 결과 화면에서는 닫기
      if (S) confirmQuit();
    },
  });
}

function closeLesson() {
  stopSR();
  stopSpeak();
  releaseTrap?.();
  releaseTrap = null;
  const ov = overlay();
  ov.classList.remove('open');
  ov.innerHTML = '';
  ov.removeAttribute('role');
  ov.removeAttribute('aria-modal');
  ov.removeAttribute('aria-label');
  document.onkeydown = null;
  S = null;
  render();
}

// ── 공용 렌더 ──
function headerHtml() {
  // 처리한 문제 수 / 현재 큐 길이 — requeue로 분모가 늘어도 단조 증가 (후퇴 없음), 마지막 답에서 100%
  const done = S.idx + (S.checked ? 1 : 0);
  const pct = Math.round((done / S.queue.length) * 100);
  const right = S.hearts
    ? `<div class="lesson-hearts">${icons.heart(profile.hearts > 0)}${profile.hearts}</div>`
    : `<div class="mode-label">${S.mode === 'placement' ? '배치고사' : '약점 복습'}</div>`;
  return `
    <div class="lesson-head">
      <button class="quit" id="quit" aria-label="나가기">${icons.close()}</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      ${right}
    </div>`;
}

function footerHtml() {
  return `
    <div class="lesson-foot" id="foot">
      <div class="inner">
        <button class="btn white skip" id="skip">건너뛰기</button>
        <button class="btn" id="checkBtn" disabled>확인</button>
      </div>
    </div>`;
}

function renderExercise() {
  stopSR();
  S.ex = S.queue[S.idx];
  S.checked = false;
  S.speakTries = 0;
  S.ui = { chosen: [], selected: -1, matchSel: { ko: -1, en: -1 }, matched: new Set(), matchWrong: 0, spoken: '' };
  const ex = S.ex;
  let body = '';
  switch (ex.type) {
    case 'select': body = bodySelect(ex); break;
    case 'bank': body = bodyBank(ex); break;
    case 'type': body = bodyType(ex); break;
    case 'listen': body = bodyListen(ex); break;
    case 'match': body = bodyMatch(ex); break;
    case 'fill': body = bodyFill(ex); break;
    case 'speak': body = bodySpeak(ex); break;
    case 'dialogue': body = bodyDialogue(ex); break;
  }
  overlay().innerHTML = `
    ${headerHtml()}
    <div class="lesson-body"><div class="exercise" id="exbody">${body}</div></div>
    ${footerHtml()}`;
  wireCommon();
  wireExercise();
  // 키보드 접근성: 새 문제의 첫 컨트롤로 포커스 (타이핑류는 wireExercise가 입력창에 이미 줌)
  const exEl = document.getElementById('exbody');
  if (!exEl.contains(document.activeElement)) exEl.querySelector('button, textarea, input')?.focus();
  if (ex.type === 'listen') setTimeout(() => speak(ex.sentence), 350);
  if (ex.type === 'dialogue') setTimeout(() => speak(ex.say), 300);
}

function wireCommon() {
  document.getElementById('quit').onclick = confirmQuit;
  document.getElementById('checkBtn').onclick = onCheck;
  const skip = document.getElementById('skip');
  if (S.ex.type === 'match') skip.style.visibility = 'hidden';
  skip.onclick = () => !S.checked && showResult(false, { skipped: true });
  document.onkeydown = (e) => {
    if (!S) return;
    if (document.querySelector('.modal-back')) return; // 모달 열림 — 뒤 버튼 클릭 차단
    if (e.key === 'Enter') {
      e.preventDefault();
      const btn = document.getElementById(S.checked ? 'contBtn' : 'checkBtn');
      if (btn && !btn.disabled) btn.click();
    }
  };
}

function setCheckEnabled(on) {
  const b = document.getElementById('checkBtn');
  if (b) b.disabled = !on;
}

// ── 문제 유형별 본문 ──
function bodySelect(ex) {
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="prompt-big">${ex.prompt}</div>
    <div class="options">
      ${ex.options.map((o, i) => `
        <button class="option" data-opt="${i}"><span class="num">${i + 1}</span>${o}</button>`).join('')}
    </div>`;
}

function bodyBank(ex) {
  const sayBtn = ex.dir === 'ko'
    ? `<button class="ghost say-inline" data-say="${escapeAttr(ex.prompt)}">${icons.speaker()}</button>`
    : '';
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="prompt-big">${sayBtn}${ex.prompt}</div>
    <div class="answer-zone" id="zone"><span class="hintline">단어를 눌러 문장을 만드세요</span></div>
    <div class="bank-zone" id="bank">
      ${ex.bank.map((t, i) => `<button class="chip" data-chip="${i}">${t}</button>`).join('')}
    </div>`;
}

function bodyType(ex) {
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="prompt-big">${ex.prompt}</div>
    <textarea class="type-input" id="typein" placeholder="영어로 입력하세요" autocomplete="off" spellcheck="false"></textarea>`;
}

function bodyListen(ex) {
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="listen-btns">
      <button class="play-big" id="play">${icons.speaker()}</button>
      <button class="play-slow" id="playSlow" title="천천히 듣기">${icons.turtle()}</button>
    </div>
    <div class="answer-zone" id="zone"><span class="hintline">들리는 대로 단어를 배열하세요</span></div>
    <div class="bank-zone" id="bank">
      ${ex.bank.map((t, i) => `<button class="chip" data-chip="${i}">${t}</button>`).join('')}
    </div>`;
}

function bodyMatch(ex) {
  const kos = ex.pairs.map((p, i) => ({ i, t: p.ko }));
  const ens = shuffle(ex.pairs.map((p, i) => ({ i, t: p.en })), Math.random);
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="match-grid">
      <div class="match-col">${kos.map((k) => `<button class="mchip" data-ko="${k.i}">${k.t}</button>`).join('')}</div>
      <div class="match-col">${ens.map((e) => `<button class="mchip" data-en="${e.i}">${e.t}</button>`).join('')}</div>
    </div>`;
}

function bodyFill(ex) {
  const parts = ex.tokens.map((t, i) => (i === ex.blankIndex ? `<span class="fill-blank" id="blank">&nbsp;</span>` : t));
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="fill-sentence">${parts.join(' ')}</div>
    <div class="fill-hint">힌트: ${ex.hint}</div>
    <div class="fill-opts">
      ${ex.options.map((o, i) => `<button class="chip" data-opt="${i}">${o}</button>`).join('')}
    </div>`;
}

function bodySpeak(ex) {
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="speak-card">
      <button class="ghost say-inline" data-say="${escapeAttr(ex.sentence)}">${icons.speaker()}</button>
      <div class="speak-sentence">${ex.sentence}</div>
      <div class="speak-ko">${ex.translation}</div>
    </div>
    <div class="speak-zone">
      <button class="mic-big" id="micBig">${icons.mic()}</button>
      <div class="speak-status" id="speakStatus">마이크를 누르고 문장을 읽어 보세요</div>
    </div>`;
}

function bodyDialogue(ex) {
  return `
    <div class="ex-title">${ex.title}</div>
    <div class="prompt-big"><button class="ghost say-inline" data-say="${escapeAttr(ex.say)}">${icons.speaker()}</button>${ex.say}</div>
    <div class="fill-hint">${ex.ko}</div>
    <textarea class="type-input" id="typein" placeholder="정답은 없어요 — 영어로 자유롭게 대답해 보세요" autocomplete="off" spellcheck="false"></textarea>
    ${srSupported() ? `<div class="speak-zone"><button class="mic-big small" id="micBig">${icons.mic()}</button><div class="speak-status" id="speakStatus">또는 마이크로 말하기</div></div>` : ''}`;
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

// ── 음성 인식 (speak/dialogue) ──
let activeSR = null;
function stopSR() {
  if (activeSR) {
    try { activeSR.onend = null; activeSR.stop(); } catch {}
    activeSR = null;
  }
}

function listenOnce(onFinal, onInterim) {
  if (!srSupported()) return false;
  stopSR();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR();
  activeSR = r;
  r.lang = 'en-US';
  r.interimResults = true;
  r.onresult = (e) => {
    let interim = '';
    for (const res of e.results) {
      if (res.isFinal) return onFinal(res[0].transcript.trim());
      interim += res[0].transcript;
    }
    if (interim) onInterim(interim);
  };
  r.onerror = () => onFinal('');
  r.onend = () => onFinal('');
  try { r.start(); } catch { return false; }
  return true;
}

// ── 문제 유형별 상호작용 ──
function wireExercise() {
  const ex = S.ex;
  const body = document.getElementById('exbody');

  body.querySelectorAll('[data-say]').forEach((b) => {
    b.onclick = () => speak(b.dataset.say);
  });

  if (ex.type === 'select' || ex.type === 'fill') {
    body.querySelectorAll('[data-opt]').forEach((btn) => {
      btn.onclick = () => {
        if (S.checked) return;
        sfx.select();
        body.querySelectorAll('[data-opt]').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        S.ui.selected = +btn.dataset.opt;
        if (ex.type === 'fill') document.getElementById('blank').textContent = ex.options[S.ui.selected];
        setCheckEnabled(true);
      };
    });
  }

  if (ex.type === 'bank' || ex.type === 'listen') {
    body.querySelectorAll('[data-chip]').forEach((btn) => {
      btn.onclick = () => {
        if (S.checked) return;
        sfx.select();
        const i = +btn.dataset.chip;
        if (S.ui.chosen.includes(i)) return;
        S.ui.chosen.push(i);
        redrawZone();
      };
    });
  }

  if (ex.type === 'type' || ex.type === 'dialogue') {
    const ta = document.getElementById('typein');
    ta.focus();
    ta.oninput = () => setCheckEnabled(ta.value.trim().length > 0);
    ta.onkeydown = (e) => {
      if (e.key === 'Enter') e.preventDefault();
    };
  }

  if (ex.type === 'listen') {
    document.getElementById('play').onclick = () => speak(ex.sentence);
    document.getElementById('playSlow').onclick = () => speak(ex.sentence, { rate: 0.6 });
  }

  if (ex.type === 'match') {
    body.querySelectorAll('.mchip').forEach((btn) => {
      btn.onclick = () => onMatchTap(btn);
    });
    setCheckEnabled(false);
  }

  if (ex.type === 'speak' || (ex.type === 'dialogue' && srSupported())) {
    const mic = document.getElementById('micBig');
    if (mic) {
      mic.onclick = () => {
        if (S.checked) return;
        const status = document.getElementById('speakStatus');
        mic.classList.add('live');
        status.textContent = '듣고 있어요…';
        const ok = listenOnce(
          (finalText) => {
            mic.classList.remove('live');
            if (!S || S.checked) return;
            if (!finalText) {
              status.textContent = '잘 안 들렸어요. 다시 눌러서 말해 보세요';
              return;
            }
            S.ui.spoken = finalText;
            if (ex.type === 'speak') {
              status.textContent = `"${finalText}"`;
              gradeSpeak(finalText);
            } else {
              document.getElementById('typein').value = finalText;
              setCheckEnabled(true);
              status.textContent = `"${finalText}" — 확인을 누르세요`;
            }
          },
          (interim) => { status.textContent = `"${interim}"`; }
        );
        if (!ok) status.textContent = '이 브라우저에서는 음성 인식이 지원되지 않아요';
      };
    }
  }
}

function redrawZone() {
  const ex = S.ex;
  const zone = document.getElementById('zone');
  const bank = document.getElementById('bank');
  if (S.ui.chosen.length === 0) {
    zone.innerHTML = `<span class="hintline">단어를 눌러 문장을 만드세요</span>`;
  } else {
    zone.innerHTML = S.ui.chosen
      .map((i) => `<button class="chip pop" data-zchip="${i}">${ex.bank[i]}</button>`)
      .join('');
    zone.querySelectorAll('[data-zchip]').forEach((btn) => {
      btn.onclick = () => {
        if (S.checked) return;
        sfx.select();
        S.ui.chosen = S.ui.chosen.filter((x) => x !== +btn.dataset.zchip);
        redrawZone();
      };
    });
  }
  bank.querySelectorAll('[data-chip]').forEach((b) => {
    b.classList.toggle('used', S.ui.chosen.includes(+b.dataset.chip));
  });
  setCheckEnabled(S.ui.chosen.length > 0);
}

function onMatchTap(btn) {
  if (S.checked) return;
  const sel = S.ui.matchSel;
  const side = btn.dataset.ko !== undefined ? 'ko' : 'en';
  const idx = +(btn.dataset.ko ?? btn.dataset.en);
  if (S.ui.matched.has(`${side}:${idx}`)) return;
  sfx.select();
  document.querySelectorAll(`.mchip[data-${side}]`).forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  sel[side] = idx;
  if (sel.ko >= 0 && sel.en >= 0) {
    const koBtn = document.querySelector(`.mchip[data-ko="${sel.ko}"]`);
    const enBtn = document.querySelector(`.mchip[data-en="${sel.en}"]`);
    if (sel.ko === sel.en) {
      S.ui.matched.add(`ko:${sel.ko}`);
      S.ui.matched.add(`en:${sel.en}`);
      sfx.match(S.ui.matched.size / 2); // 콤보마다 반음 상승
      koBtn.classList.remove('selected'); enBtn.classList.remove('selected');
      koBtn.classList.add('matched'); enBtn.classList.add('matched');
      if (S.ui.matched.size === S.ex.pairs.length * 2) {
        showResult(true, { matchDone: true });
      }
    } else {
      S.ui.matchWrong += 1;
      koBtn.classList.add('wrong'); enBtn.classList.add('wrong');
      sfx.wrong();
      setTimeout(() => {
        koBtn.classList.remove('wrong', 'selected');
        enBtn.classList.remove('wrong', 'selected');
      }, 420);
    }
    sel.ko = -1; sel.en = -1;
  }
}

// ── 채점 ──
function gradeSpeak(spoken) {
  const target = normalize(S.ex.sentence).split(' ').filter(Boolean);
  const said = new Set(normalize(spoken).split(' ').filter(Boolean));
  const hit = target.filter((t) => said.has(t)).length;
  const ratio = hit / Math.max(target.length, 1);
  if (ratio >= 0.6) {
    showResult(true, { typo: ratio < 0.85, expected: S.ex.sentence, gentle: true });
  } else {
    S.speakTries += 1;
    if (S.speakTries >= 2) {
      showResult(false, { expected: S.ex.sentence, gentle: true });
    } else {
      const status = document.getElementById('speakStatus');
      if (status) status.textContent = '조금 달랐어요. 한 번 더 또박또박 읽어 볼까요?';
      sfx.wrong();
    }
  }
}

function onCheck() {
  if (S.checked) return;
  const ex = S.ex;
  let ok = false;
  let typo = false;
  let expected = '';
  let gentle = false;
  let note = '';
  if (ex.type === 'select') {
    ok = S.ui.selected === ex.correct;
    expected = ex.expected;
  } else if (ex.type === 'fill') {
    ok = S.ui.selected === ex.correct;
    expected = ex.tokens.map((t, i) => (i === ex.blankIndex ? ex.expected : t)).join(' ');
  } else if (ex.type === 'bank' || ex.type === 'listen') {
    const given = joinTokens(S.ui.chosen.map((i) => ex.bank[i]));
    const res = checkAnswer(ex.expectedList, given);
    ok = res.correct; typo = res.typo; expected = ex.expectedList[0];
  } else if (ex.type === 'type') {
    const given = document.getElementById('typein').value;
    const res = checkAnswer(ex.expectedList, given);
    ok = res.correct; typo = res.typo; expected = ex.expectedList[0];
  } else if (ex.type === 'dialogue') {
    const given = document.getElementById('typein').value.trim();
    const words = given.split(/\s+/).filter(Boolean);
    gentle = true;
    if (words.length >= 2) {
      ok = true;
      const hitKeyword = (ex.keywords || []).some((k) => k.test(given));
      note = hitKeyword ? '' : `이렇게도 말할 수 있어요: ${ex.sample}`;
    } else {
      ok = false;
      expected = ex.sample;
    }
  }
  showResult(ok, { typo, expected, gentle, note });
}

function showResult(ok, { typo = false, expected = '', skipped = false, matchDone = false, gentle = false, note = '' } = {}) {
  S.checked = true;
  stopSR();
  const ex = S.ex;
  const foot = document.getElementById('foot');
  document.getElementById('exbody').style.pointerEvents = 'none';

  // 배치고사 채점 집계
  if (S.mode === 'placement' && ex.sectionIndex !== undefined) {
    S.sectionScore[ex.sectionIndex] = (S.sectionScore[ex.sectionIndex] || 0) + (ok ? 1 : 0);
  }

  if (ok) {
    S.correct += 1;
    // 짝맞추기 중 오답이 있었으면 실수로 집계 (무실수 레전더리/퍼펙트 방지). 하트 차감은 없음.
    if (matchDone && S.ui.matchWrong > 0) S.mistakes += 1;
    sfx.correct(S.combo); // 연속 정답 콤보 → 피치 상승
    S.combo += 1;
    if (ex.pairEn && S.mode === 'weak') recordHit(ex.pairEn); // 회수 단계(약점 복습)에서만 감소
    const say = ex.type === 'bank' && ex.dir === 'en' ? ex.expectedList[0]
      : ex.type === 'type' ? ex.expectedList[0]
      : ex.type === 'select' ? ex.expected
      : ex.type === 'listen' ? ex.sentence
      : null;
    if (say && !matchDone) speak(say);
  } else {
    S.mistakes += 1;
    S.combo = 0;
    sfx.wrong();
    if (ex.pairEn && !skipped) recordMiss(ex.pairEn);
    if (S.hearts && !skipped && !gentle) loseHeart();
    if (S.requeue && !gentle && S.requeued < 6 && ex.type !== 'speak' && ex.type !== 'dialogue') {
      S.queue.push(ex);
      S.requeued += 1;
    }
  }

  const title = ok
    ? typo ? (ex.type === 'speak' ? '발음이 조금 달랐지만 잘 통했어요!' : '오타가 있지만 정답이에요!')
      : note ? '좋은 대답이에요!'
      : pick(['정답입니다!', '훌륭해요!', '완벽해요!', '잘했어요!'])
    : skipped ? '건너뛰었어요' : '아쉬워요…';
  const sub = ok ? note : expected ? `정답: ${expected}` : '';

  foot.className = `lesson-foot ${ok ? 'correct' : 'wrong'}`;
  foot.innerHTML = `
    <div class="inner">
      <div class="verdict">
        <div class="v-badge">${ok ? icons.check() : icons.close()}</div>
        <div>
          <div class="v-title">${title}</div>
          ${sub ? `<div class="v-sub">${sub}</div>` : ''}
        </div>
      </div>
      <button class="btn" id="contBtn">계속하기</button>
    </div>`;
  const head = overlay().querySelector('.lesson-head');
  head.outerHTML = headerHtml();
  document.getElementById('quit').onclick = confirmQuit;

  const cont = document.getElementById('contBtn');
  cont.focus();
  cont.onclick = () => {
    if (!ok && S.hearts && profile.hearts <= 0) return outOfHearts();
    S.idx += 1;
    if (S.idx >= S.queue.length) finishSession();
    else renderExercise();
  };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 하트 모달 ──
function noHeartsModal() {
  showModal({
    body: `<div class="modal-mark">${icons.heartBroken()}</div><h3>하트가 없어요!</h3><p>보석으로 하트를 채우거나, 시간이 지나면 회복돼요. (30분마다 1개)</p>`,
    buttons: [
      { label: `보석 350으로 회복`, cls: 'blue', fn: tryRefill },
      { label: '나중에 하기', cls: 'ghost' },
    ],
  });
}

function outOfHearts() {
  showModal({
    body: `<div class="modal-mark">${icons.heartBroken()}</div><h3>하트를 모두 잃었어요!</h3><p>보석으로 회복하면 이어서 배울 수 있어요.</p>`,
    buttons: [
      {
        label: '보석 350으로 회복', cls: 'blue',
        fn: () => {
          if (tryRefill()) {
            S.idx += 1;
            if (S.idx >= S.queue.length) finishSession();
            else renderExercise();
            return true;
          }
          return false;
        },
      },
      { label: '그만두기', cls: 'red', fn: () => (closeLesson(), true) },
    ],
  });
}

function tryRefill() {
  const item = SHOP_ITEMS.find((s) => s.id === 'heart-refill');
  const r = buyItem(item);
  if (!r.ok) {
    toast(r.reason);
    return false;
  }
  sfx.buy();
  renderTopbar();
  return true;
}

function confirmQuit() {
  showModal({
    body: `<div class="modal-mark" style="color:var(--crimson)">${icons.close()}</div><h3>정말 그만두시겠어요?</h3><p>지금 나가면 이번 세션의 진행 내용을 잃어요!</p>`,
    buttons: [
      { label: '계속 배우기', cls: '' },
      { label: '그만두기', cls: 'red', fn: () => (closeLesson(), true) },
    ],
  });
}

// ── 완료 ──
function finishSession() {
  if (S.mode === 'placement') return finishPlacement();

  const perfect = S.mistakes === 0;
  const baseXp = S.baseXp + (perfect ? 5 : 0);
  const prevStreak = profile.streak;
  const prevLevel = levelOf(profile.xp);
  const gained = recordLessonComplete({ baseXp, perfect, gems: S.gems });
  const newLevel = levelOf(profile.xp);
  const streakUp = profile.streak > prevStreak;
  const leveledUp = newLevel > prevLevel;

  let legendary = false;
  if (S.mode === 'lesson') {
    advanceProgress(S.unitIndex, S.lessonIndex);
    if (S.isReview && S.isRedo && perfect) {
      legendary = markLegendary(COURSE.units[S.unitIndex].id);
    }
  }

  const total = S.queue.length;
  const acc = Math.round((1 - S.mistakes / Math.max(total, 1)) * 100);
  sfx.complete();
  if (legendary) setTimeout(() => sfx.levelup(), 700);
  else if (leveledUp) setTimeout(() => sfx.levelup(), 750);
  if (streakUp) setTimeout(() => sfx.streak(), leveledUp || legendary ? 1500 : 800);

  const confetti = confettiHtml(legendary ? 70 : 40);
  const heading = legendary ? 'Legendary!' : perfect ? 'Perfect!' : S.mode === 'weak' ? 'Recovered!' : 'Clear!';
  const subline = legendary
    ? '유닛을 무실수로 정복했어요 — 레전더리 달성!'
    : perfect ? '실수 없이 해냈어요. 대단해요!'
    : S.mode === 'weak' ? '약점이 회복됐어요. 꾸준한 복습이 답이에요.'
    : '레슨 완료! 꾸준함이 실력을 만들어요.';

  overlay().innerHTML = `
    <div class="results">
      ${confetti}
      ${legendary ? '<div class="legendary-mark">★</div>' : ''}
      <h2 class="${legendary ? 'gold' : ''}">${heading}</h2>
      <div class="r-sub">${subline}</div>
      ${streakUp ? `<div class="streak-banner">${icons.flame(true)} 연속 학습 <b>${profile.streak}일</b> 달성!</div>` : ''}
      ${leveledUp ? `<div class="streak-banner level">${icons.bolt()} 레벨 <b>${newLevel}</b> 달성!</div>` : ''}
      <div class="r-cards">
        <div class="r-card xp"><div class="r-label">총 XP</div><div class="r-value">${icons.bolt()}<span id="xpCount">+0</span></div></div>
        <div class="r-card acc"><div class="r-label">정답률</div><div class="r-value">${Math.max(acc, 0)}%</div></div>
        <div class="r-card gem"><div class="r-label">보석</div><div class="r-value">${icons.gem()}+${S.gems}</div></div>
      </div>
      <button class="btn big" id="doneBtn" style="max-width:340px">계속하기</button>
    </div>`;

  // XP 카운트업 + 틱 사운드
  const xpEl = document.getElementById('xpCount');
  let n = 0;
  const step = Math.max(1, Math.ceil(gained / 12));
  const int = setInterval(() => {
    n = Math.min(gained, n + step);
    xpEl.textContent = `+${n}`;
    sfx.tick(n % 5);
    if (n >= gained) clearInterval(int);
  }, 70);

  const doneBtn = document.getElementById('doneBtn');
  doneBtn.focus();
  doneBtn.onclick = () => { clearInterval(int); closeLesson(); };
  document.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('doneBtn')?.click();
  };
}

function finishPlacement() {
  // 섹션별 2문제 중 2개 정답 → 통과. 첫 실패 섹션에 배치.
  let placeSection = 0;
  for (let si = 0; si < SECTIONS.length; si++) {
    if ((S.sectionScore[si] || 0) >= 2) placeSection = Math.min(si + 1, SECTIONS.length - 1);
    else break;
  }
  const unitIndex = SECTION_STARTS[placeSection];
  const sec = SECTIONS[placeSection];
  sfx.complete();

  overlay().innerHTML = `
    <div class="results">
      ${confettiHtml(30)}
      <h2>배치 완료!</h2>
      <div class="r-sub">당신의 레벨은 <b>${sec.cefr}</b> — 「${sec.title}」부터 시작하는 걸 추천해요.</div>
      <div class="r-cards">
        <div class="r-card acc"><div class="r-label">추천 시작점</div><div class="r-value">${sec.cefr}</div></div>
        <div class="r-card xp"><div class="r-label">정답</div><div class="r-value">${S.correct}/${S.queue.length}</div></div>
      </div>
      <button class="btn big" id="applyBtn" style="max-width:340px">${sec.cefr}에서 시작하기</button>
      <button class="btn ghost" id="keepBtn">처음(A1)부터 할게요</button>
    </div>`;
  document.getElementById('applyBtn').onclick = () => {
    applyPlacement(unitIndex);
    toast(`${sec.title} 섹션으로 이동했어요`);
    closeLesson();
  };
  document.getElementById('keepBtn').onclick = () => {
    applyPlacement(0);
    closeLesson();
  };
}

function confettiHtml(count) {
  return Array.from({ length: count }, () => {
    const colors = ['#c9f158', '#dcff5e', '#a8d92c', '#f2efe3', '#2b47e8'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const dur = 2.4 + Math.random() * 2;
    const delay = Math.random() * 0.8;
    return `<div class="confetti" style="left:${left}%;background:${c};animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
  }).join('');
}

// ── 모달 ──
function showModal({ body, buttons }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      ${body}
      ${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mb="${i}">${b.label}</button>`).join('')}
    </div>`;
  document.body.appendChild(back);
  const release = trapFocus(back, { onEscape: close });
  function close() {
    release();
    back.remove();
  }
  back.querySelectorAll('[data-mb]').forEach((btn) => {
    btn.onclick = () => {
      const b = buttons[+btn.dataset.mb];
      const keepClosed = b.fn ? b.fn() !== false : true;
      if (keepClosed) close();
    };
  });
}
