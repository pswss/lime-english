// 레슨 세션 생성기 (순수 함수 — 테스트 대상)
import { tokenize } from './checker.js';

// 결정적 RNG (mulberry32)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN(arr, n, rng) {
  return shuffle(arr, rng).slice(0, n);
}

function expectedListOf(pair) {
  return [pair.en, ...(pair.alt || [])];
}

// 단어은행 만들기: 정답 토큰 전체 + 겹치지 않는 오답 토큰
function buildBank(answerTokens, distractorPool, rng, extra = 4) {
  const lowerAnswer = new Set(answerTokens.map((t) => t.toLowerCase()));
  const candidates = [];
  const seen = new Set();
  for (const d of shuffle(distractorPool, rng)) {
    const k = d.toLowerCase();
    if (lowerAnswer.has(k) || seen.has(k)) continue;
    seen.add(k);
    candidates.push(d);
    if (candidates.length >= extra) break;
  }
  return shuffle([...answerTokens, ...candidates], rng);
}

// 유닛의 오답 토큰 풀 (해당 언어)
function distractorPool(unit, lang, excludePair) {
  const pool = [];
  for (const p of unit.pairs) {
    if (p === excludePair) continue;
    pool.push(...tokenize(lang === 'en' ? p.en : p.ko));
  }
  pool.push(...(lang === 'en' ? unit.distractorsEn : unit.distractorsKo));
  return pool;
}

function exSelect(pair, unit, rng) {
  const others = pickN(unit.pairs.filter((p) => p !== pair), 2, rng);
  const options = shuffle([pair.en, ...others.map((p) => p.en)], rng);
  return {
    type: 'select',
    title: '올바른 번역을 고르세요',
    prompt: pair.ko,
    options,
    correct: options.indexOf(pair.en),
    expected: pair.en,
    pairEn: pair.en,
  };
}

function exBank(pair, unit, rng, dir) {
  const answerTokens = tokenize(dir === 'en' ? pair.en : pair.ko);
  const bank = buildBank(answerTokens, distractorPool(unit, dir, pair), rng);
  return {
    type: 'bank',
    dir,
    title: dir === 'en' ? '이 문장을 영어로 옮기세요' : '이 문장을 한국어로 옮기세요',
    prompt: dir === 'en' ? pair.ko : pair.en,
    bank,
    answerTokens,
    expectedList: dir === 'en' ? expectedListOf(pair) : [pair.ko],
    pairEn: pair.en,
  };
}

function exType(pair) {
  return {
    type: 'type',
    title: '영어로 입력하세요',
    prompt: pair.ko,
    expectedList: expectedListOf(pair),
    answer: pair.en,
    pairEn: pair.en,
  };
}

function exSpeak(pair) {
  return {
    type: 'speak',
    title: '이 문장을 소리 내어 읽으세요',
    sentence: pair.en,
    translation: pair.ko,
    pairEn: pair.en,
  };
}

function exListen(pair, unit, rng) {
  const answerTokens = tokenize(pair.en);
  const bank = buildBank(answerTokens, distractorPool(unit, 'en', pair), rng);
  return {
    type: 'listen',
    title: '들리는 대로 문장을 만드세요',
    sentence: pair.en,
    translation: pair.ko,
    bank,
    answerTokens,
    expectedList: expectedListOf(pair),
    pairEn: pair.en,
  };
}

function exMatch(unit, rng, count = 5) {
  const words = pickN(unit.words, count, rng);
  return {
    type: 'match',
    title: '짝을 맞추세요',
    pairs: words.map((w, i) => ({ id: i, ko: w.ko, en: w.en })),
  };
}

function exFill(pair, unit, rng) {
  const tokens = tokenize(pair.en);
  // 3글자 이상인 토큰 중 하나를 빈칸으로
  const idxs = tokens.map((t, i) => ({ t, i })).filter(({ t }) => t.length >= 3);
  const chosen = idxs.length ? idxs[Math.floor(rng() * idxs.length)] : { t: tokens[0], i: 0 };
  const blankIndex = chosen.i;
  const correctWord = tokens[blankIndex];
  const lowerAnswer = correctWord.toLowerCase();
  const pool = distractorPool(unit, 'en', pair).filter(
    (w) => w.toLowerCase() !== lowerAnswer && w.length >= 3
  );
  const distractors = [];
  const seen = new Set();
  for (const d of shuffle(pool, rng)) {
    const k = d.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    distractors.push(d);
    if (distractors.length >= 2) break;
  }
  const options = shuffle([correctWord, ...distractors], rng);
  return {
    type: 'fill',
    title: '빈칸을 채우세요',
    tokens,
    blankIndex,
    hint: pair.ko,
    options,
    correct: options.indexOf(correctWord),
    expected: correctWord,
    pairEn: pair.en,
  };
}

// 레슨 위치에 따른 문제 유형 시퀀스
function typePlan(lessonIndex, isReview, rng) {
  if (isReview) {
    return ['match', 'bank:en', 'select', 'type', 'listen', 'bank:ko', 'fill', 'type'];
  }
  if (lessonIndex === 0) {
    return ['match', 'select', 'bank:en', 'fill', 'bank:ko', 'select', 'bank:en', 'match'];
  }
  if (lessonIndex === 1) {
    return ['select', 'bank:en', 'match', 'bank:ko', 'fill', 'listen', 'bank:en', 'type'];
  }
  // 후반 레슨: 타이핑/듣기 비중 증가
  const late = ['bank:en', 'listen', 'type', 'match', 'fill', 'bank:ko', 'listen', 'type'];
  return shuffle(late, rng);
}

// 세션 생성
// course: COURSE, unitIndex/lessonIndex: 위치
// opts: { attempt, ttsAvailable, isReview, srAvailable, dialoguePrompts }
//  - srAvailable: true면 후반 레슨에 말하기(speak) 문제 삽입
//  - dialoguePrompts: 배열이 주어지면 복습/후반 레슨에 자유응답(dialogue) 문제 삽입
export function generateSession(course, unitIndex, lessonIndex, opts = {}) {
  const { attempt = 0, ttsAvailable = true, isReview = false, srAvailable = false, dialoguePrompts = null } = opts;
  const unit = course.units[unitIndex];
  const seed = seedFrom(`${unit.id}:${lessonIndex}:${attempt}`);
  const rng = mulberry32(seed);

  // 복습 레슨은 이전 유닛 포함
  let pairPool;
  if (isReview && unitIndex > 0) {
    const entries = [];
    for (let u = 0; u <= unitIndex; u++) {
      const weight = u === unitIndex ? 3 : 1;
      for (const p of course.units[u].pairs) {
        for (let w = 0; w < weight; w++) entries.push({ pair: p, unit: course.units[u] });
      }
    }
    pairPool = shuffle(entries, rng);
  }

  let plan = typePlan(lessonIndex, isReview, rng);
  if (!ttsAvailable) plan = plan.map((t) => (t === 'listen' ? 'bank:en' : t));

  // 문제마다 서로 다른 문장을 우선 사용
  const usedPairs = new Set();
  const nextPair = (u) => {
    const fresh = u.pairs.filter((p) => !usedPairs.has(p));
    const src = fresh.length ? fresh : u.pairs;
    const p = src[Math.floor(rng() * src.length)];
    usedPairs.add(p);
    return p;
  };

  const exercises = [];
  let poolIdx = 0;
  for (const t of plan) {
    let srcUnit = unit;
    let pair = null;
    if (isReview && unitIndex > 0 && t !== 'match') {
      const entry = pairPool[poolIdx++ % pairPool.length];
      srcUnit = entry.unit;
      pair = usedPairs.has(entry.pair) ? nextPair(srcUnit) : entry.pair;
      usedPairs.add(pair);
    } else if (t !== 'match') {
      pair = nextPair(unit);
    }
    switch (t) {
      case 'select':
        exercises.push(exSelect(pair, srcUnit, rng));
        break;
      case 'bank:en':
        exercises.push(exBank(pair, srcUnit, rng, 'en'));
        break;
      case 'bank:ko':
        exercises.push(exBank(pair, srcUnit, rng, 'ko'));
        break;
      case 'type':
        exercises.push(exType(pair));
        break;
      case 'listen':
        exercises.push(exListen(pair, srcUnit, rng));
        break;
      case 'fill':
        exercises.push(exFill(pair, srcUnit, rng));
        break;
      case 'match':
        exercises.push(exMatch(srcUnit, rng));
        break;
    }
  }

  // 말하기: 음성 인식이 가능할 때 후반 레슨의 select 하나를 대체
  if (srAvailable && ttsAvailable && (isReview || lessonIndex >= 2)) {
    const i = exercises.findIndex((e) => e.type === 'select' || e.type === 'fill');
    if (i >= 0 && exercises[i].pairEn) {
      // 복습은 이전 유닛 문장도 섞이므로 코스 전체에서 원문 쌍을 찾는다
      const pair =
        course.units.flatMap((u) => u.pairs).find((p) => p.en === exercises[i].pairEn) || unit.pairs[0];
      exercises[i] = exSpeak(pair);
    }
  }
  // 자유응답: 상위 섹션 복습/후반 레슨에서 마지막 문제로 추가 출제
  if (dialoguePrompts && dialoguePrompts.length && (isReview || lessonIndex >= 3)) {
    const d = dialoguePrompts[Math.floor(rng() * dialoguePrompts.length)];
    exercises.push({
      type: 'dialogue',
      title: '영어로 자유롭게 대답하세요',
      say: d.say,
      ko: d.ko,
      keywords: d.keywords,
      sample: d.sample,
    });
  }
  return exercises;
}

// 약점 복습 세션: 자주 틀린 문장(en 기준)으로 구성 — 간격 반복의 회수 단계
export function generateWeakSession(course, weakEns, opts = {}) {
  const { ttsAvailable = true } = opts;
  const rng = mulberry32(seedFrom('weak:' + weakEns.join('|') + ':' + (opts.attempt || 0)));
  const found = [];
  for (const en of weakEns) {
    for (const u of course.units) {
      const p = u.pairs.find((x) => x.en === en);
      if (p) { found.push({ pair: p, unit: u }); break; }
    }
  }
  const kinds = ['select', 'bank:en', 'type', 'listen', 'bank:ko'];
  const exercises = [];
  let k = 0;
  for (const { pair, unit } of found.slice(0, 8)) {
    let kind = kinds[k++ % kinds.length];
    if (kind === 'listen' && !ttsAvailable) kind = 'bank:en';
    switch (kind) {
      case 'select': exercises.push(exSelect(pair, unit, rng)); break;
      case 'bank:en': exercises.push(exBank(pair, unit, rng, 'en')); break;
      case 'bank:ko': exercises.push(exBank(pair, unit, rng, 'ko')); break;
      case 'type': exercises.push(exType(pair)); break;
      case 'listen': exercises.push(exListen(pair, unit, rng)); break;
    }
  }
  return shuffle(exercises, rng);
}

// 배치고사: 섹션마다 2문제(객관식+단어은행), 난이도 오름차순
// sections: [{units:[unitIndex...]}] 형태 대신 섹션별 대표 유닛 인덱스 배열을 받는다
export function generatePlacementSession(course, sectionFirstUnits, opts = {}) {
  const rng = mulberry32(seedFrom('placement:' + (opts.attempt || 0)));
  const exercises = [];
  sectionFirstUnits.forEach((unitIndex, si) => {
    const unit = course.units[unitIndex];
    if (!unit) return;
    const p1 = unit.pairs[Math.floor(rng() * unit.pairs.length)];
    let p2 = unit.pairs[Math.floor(rng() * unit.pairs.length)];
    if (p2 === p1) p2 = unit.pairs[(unit.pairs.indexOf(p1) + 1) % unit.pairs.length];
    const e1 = exSelect(p1, unit, rng);
    const e2 = exBank(p2, unit, rng, 'en');
    e1.sectionIndex = si;
    e2.sectionIndex = si;
    exercises.push(e1, e2);
  });
  return exercises;
}
