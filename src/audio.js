// 효과음 엔진 (WebAudio 합성) + TTS (Web Speech API)
//
// 사운드 디자인 근거 (듀오링고 실측 + UI 사운드 원칙 리서치):
// · 정답: F#5→A#5 16분음표 2개 — 장3도 상행 "동-딩" (도어벨/차임 계열)
// · 오답: F#4→C4 하행 트라이톤 — 의도된 불안정 음정, 부드러운 "보잉" 질감
// · 짝맞추기 콤보: 성공마다 반음(2^(1/12))씩 상승 → 체인 만족감 강화
// · 모든 타격음에 ±0.8% 미세 피치 랜덤화 → 반복 피로 감소
// · 음색: 첼레스타/차임 계열(순수 기음 + 약한 고차 배음 + 빠른 어택, 지수 감쇠)
// · 짧고 즉각적, 하나의 사운드 패밀리(F# 장조 기반), 음소거 제어 제공
import { profile } from './state.js';

let ctx = null;

function ac() {
  if (profile.muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 미세 피치 랜덤화
const drift = (f) => f * (1 + (Math.random() - 0.5) * 0.016);

// 첼레스타형 타격음: 기음 + 4배음(약하게) + 지수 감쇠
function strike(freq, { start = 0, dur = 0.5, gain = 0.16, partial = 0.16, type = 'sine' } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const f = drift(freq);
  const mk = (fq, g, d) => {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fq, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(g, t0 + 0.008); // 빠른 어택
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(env).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + d + 0.05);
  };
  mk(f, gain, dur);
  if (partial > 0) mk(f * 4, gain * partial, dur * 0.35); // 고차 배음 반짝임
}

// 낮고 무른 음 (오답용): 삼각파 + 아래로 피치 벤드
function boing(freq, { start = 0, dur = 0.3, gain = 0.13, bend = 0.86 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const f = drift(freq);
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(f, t0);
  osc.frequency.exponentialRampToValueAtTime(f * bend, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// 탭 노이즈 클릭 (기계식 팝)
function click({ start = 0, gain = 0.05 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const len = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const env = c.createGain();
  env.gain.value = gain;
  src.buffer = buf;
  src.connect(env).connect(c.destination);
  src.start(t0);
}

// 음정 상수 (F# 장조 패밀리)
const FS4 = 369.99, C4 = 261.63;
const FS5 = 739.99, AS5 = 932.33, CS6 = 1108.73, FS6 = 1479.98;
const D5 = 587.33;
const SEMI = Math.pow(2, 1 / 12);

export const sfx = {
  // 버튼/칩 탭: 짧은 팝 + 노이즈 클릭
  select() {
    click();
    strike(1244.5, { dur: 0.07, gain: 0.05, partial: 0 });
  },
  // 정답: F#5 → A#5 장3도 상행, 16분음표 간격
  // 연속 정답(combo)마다 반음씩 상승 → 콤보 에스컬레이션
  correct(combo = 0) {
    const k = Math.pow(SEMI, Math.min(combo, 8));
    strike(FS5 * k, { dur: 0.42, gain: 0.15 });
    strike(AS5 * k, { start: 0.11, dur: 0.55, gain: 0.17 });
  },
  // 오답: F#4 → C4 하행 트라이톤, 무른 보잉
  wrong() {
    boing(FS4, { dur: 0.22 });
    boing(C4, { start: 0.13, dur: 0.34, gain: 0.14 });
  },
  // 짝맞추기: 콤보마다 반음씩 상승하는 차임
  match(combo = 0) {
    strike(D5 * Math.pow(SEMI, combo), { dur: 0.32, gain: 0.14 });
  },
  // 레슨 완료: F# 장조 상행 팡파르 + 옥타브 스파클
  complete() {
    [FS5, AS5, CS6, FS6].forEach((f, i) =>
      strike(f, { start: i * 0.115, dur: 0.5, gain: 0.15 })
    );
    strike(FS6 * 2, { start: 0.52, dur: 0.7, gain: 0.07, partial: 0 });
  },
  // 스트릭/마일스톤: 따뜻한 상행 차임 2회
  streak() {
    strike(AS5, { dur: 0.4, gain: 0.13 });
    strike(CS6, { start: 0.14, dur: 0.45, gain: 0.14 });
    strike(FS6, { start: 0.3, dur: 0.6, gain: 0.12 });
  },
  // 레벨 업: 완료 팡파르보다 길고 화음 포함
  levelup() {
    [FS5, AS5].forEach((f) => strike(f, { dur: 0.5, gain: 0.1 }));
    [CS6, FS6].forEach((f, i) => strike(f, { start: 0.18 + i * 0.14, dur: 0.6, gain: 0.14 }));
    [FS5 * 2, AS5 * 2].forEach((f) => strike(f, { start: 0.55, dur: 0.8, gain: 0.08 }));
  },
  // XP/보상 틱: 카운트업에 맞춘 아주 짧은 블립
  tick(i = 0) {
    strike(CS6 * Math.pow(SEMI, i % 5), { dur: 0.06, gain: 0.05, partial: 0 });
  },
  // 구매/보상: 동전 블립 (B5→E6)
  buy() {
    strike(987.77, { dur: 0.1, gain: 0.11, partial: 0 });
    strike(1318.5, { start: 0.07, dur: 0.22, gain: 0.13 });
  },
  // 퀘스트 보상: F# 장조 화음
  claim() {
    [FS5, AS5, CS6].forEach((f) => strike(f, { dur: 0.6, gain: 0.09 }));
  },
  // ── 영상 통화 ──
  // 미국식 링백 톤 (440+480Hz)
  ring() {
    const c = ac();
    if (!c) return;
    [440, 480].forEach((f) => {
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.frequency.value = f;
      env.gain.setValueAtTime(0.05, c.currentTime);
      env.gain.setValueAtTime(0.05, c.currentTime + 1.4);
      env.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.45);
      osc.connect(env).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 1.5);
    });
  },
  connect() {
    strike(FS5, { dur: 0.14, gain: 0.1, partial: 0 });
    strike(CS6, { start: 0.09, dur: 0.3, gain: 0.12 });
  },
  hangup() {
    boing(480, { dur: 0.16, gain: 0.08, bend: 1 });
    boing(350, { start: 0.18, dur: 0.24, gain: 0.08, bend: 1 });
  },
};

// ── TTS ──
// "보이스웨어" 느낌 제거 전략:
// 1) 보이스 랭킹 — 브라우저별 최고 품질 음성을 우선 선택
//    Edge "... Online (Natural)" (뉴럴) > Chrome "Google US English" > macOS (Premium)/(Enhanced) > 기본
// 2) 프로소디 휴머나이즈 — 문장/절 단위로 쪼개 자연스러운 숨 쉬는 간격(140~240ms) 삽입,
//    청크마다 rate/pitch를 ±3% 지터 → 단조로운 억양 제거
// 3) 뉴럴 TTS 주입점 — window.DUO_TTS = async (text) => audioUrl 을 정의하면
//    (ElevenLabs/OpenAI/Azure 등) 해당 오디오를 재생하고, 실패 시 브라우저 TTS로 폴백
export function ttsAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function srSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// 자연스러움 점수 (높을수록 좋음) + Emma 페르소나(여성 음성) 가중
function voiceScore(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural/.test(n)) s += 100; // Edge 뉴럴 (Aria/Jenny Online Natural)
  if (n === 'google us english' || /google us english/.test(n)) s += 90;
  if (/premium/.test(n)) s += 80; // macOS 프리미엄
  if (/enhanced/.test(n)) s += 70; // macOS 향상된 음질
  if (/aria|jenny|ava|samantha|allison|zoe|joelle|michelle/.test(n)) s += 25; // 자연스러운 여성 보이스
  if (v.lang === 'en-US') s += 15;
  else if (v.lang.startsWith('en')) s += 5;
  if (/compact|espeak|robot/.test(n)) s -= 60;
  // macOS novelty 보이스 (장난용) 강등
  if (/albert|bad news|good news|bahh|bells|boing|bubbles|cellos|wobble|organ|superstar|trinoids|whisper|zarvox|jester|fred|junior|kathy|ralph/.test(n)) s -= 80;
  return s;
}

export function voiceList() {
  if (!ttsAvailable()) return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith('en'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

let enVoice = null;
let preferredName = null;

export function setVoice(name) {
  preferredName = name || null;
  pickVoice();
  return enVoice?.name || null;
}

function pickVoice() {
  if (!ttsAvailable()) return null;
  const list = voiceList();
  if (!list.length) return null;
  enVoice = (preferredName && list.find((v) => v.name === preferredName)) || list[0];
  return enVoice;
}

if (ttsAvailable()) {
  speechSynthesis.onvoiceschanged = pickVoice;
  pickVoice();
}

// 문장/긴 절 단위로 분할 — 청크 사이에 숨 쉬는 간격을 넣는다
function splitChunks(text) {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const chunks = [];
  for (const s of sentences) {
    if (s.length > 90) {
      // 아주 긴 문장은 쉼표에서 한 번 더 분할
      let rest = s;
      while (rest.length > 90) {
        const cut = rest.lastIndexOf(',', 90);
        if (cut < 30) break;
        chunks.push(rest.slice(0, cut + 1));
        rest = rest.slice(cut + 1).trim();
      }
      if (rest) chunks.push(rest);
    } else {
      chunks.push(s);
    }
  }
  return chunks.length ? chunks : [text];
}

const jitter = (base, amt = 0.03) => base * (1 + (Math.random() - 0.5) * 2 * amt);

let speakGen = 0; // 세대 카운터: cancel 후 이전 큐의 콜백 무력화
let extAudio = null;

// onEnd 콜백 지원 (통화 대화 엔진용)
export function speak(text, { rate = 1, pitch = 1.03, onEnd = null } = {}) {
  const gen = ++speakGen;
  stopSpeak(false);

  // 외부 뉴럴 TTS 주입점
  if (typeof window !== 'undefined' && typeof window.DUO_TTS === 'function') {
    (async () => {
      try {
        const src = await window.DUO_TTS(text);
        if (gen !== speakGen) return;
        extAudio = new Audio(typeof src === 'string' ? src : URL.createObjectURL(src));
        extAudio.onended = () => { if (gen === speakGen && onEnd) onEnd(); };
        extAudio.onerror = () => speakSynth(text, { rate, pitch, onEnd }, gen);
        await extAudio.play();
      } catch {
        if (gen === speakGen) speakSynth(text, { rate, pitch, onEnd }, gen);
      }
    })();
    return true;
  }
  return speakSynth(text, { rate, pitch, onEnd }, gen);
}

function speakSynth(text, { rate, pitch, onEnd }, gen) {
  if (!ttsAvailable()) {
    if (onEnd) setTimeout(() => { if (gen === speakGen) onEnd(); }, 600);
    return false;
  }
  if (!enVoice) pickVoice();
  const chunks = splitChunks(text);
  let done = false;
  const finish = () => {
    if (done || gen !== speakGen) return;
    done = true;
    if (onEnd) onEnd();
  };
  // 안전장치: onend 미발화 브라우저 대비 (rate가 느릴수록 여유를 더 준다)
  setTimeout(finish, Math.max(2000, (text.length * 95) / rate));

  const speakChunk = (i) => {
    if (gen !== speakGen) return;
    if (i >= chunks.length) return finish();
    const u = new SpeechSynthesisUtterance(chunks[i]);
    u.lang = 'en-US';
    u.rate = jitter(rate * 0.97, 0.025); // 살짝 느리게 + 지터
    u.pitch = jitter(pitch, 0.03);
    if (enVoice) u.voice = enVoice;
    const next = () => {
      if (gen !== speakGen) return;
      if (i + 1 >= chunks.length) return finish();
      // 문장 사이 자연스러운 호흡
      setTimeout(() => speakChunk(i + 1), 140 + Math.random() * 100);
    };
    u.onend = next;
    u.onerror = next;
    speechSynthesis.speak(u);
  };
  speakChunk(0);
  return true;
}

export function stopSpeak(bump = true) {
  if (bump) speakGen++;
  if (extAudio) {
    try { extAudio.pause(); } catch {}
    extAudio = null;
  }
  if (ttsAvailable()) speechSynthesis.cancel();
}
