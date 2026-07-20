// 순수 로직 단위 테스트: js/checker.js, js/session.js
// 실행: cd /tmp/duolingo && bun test
import { describe, test, expect } from 'bun:test';
import { normalize, levenshtein, checkAnswer, tokenize, joinTokens } from '../src/checker.js';
import { generateSession, mulberry32, seedFrom, shuffle } from '../src/session.js';
import { COURSE } from '../src/data.js';

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------
describe('normalize', () => {
  const cases = [
    ['소문자화', 'HeLLo World', 'hello world'],
    ['구두점 제거', 'Hello, world! (really?)', 'hello world really'],
    ['공백 축약 + 트림', '  i   drink\t water  ', 'i drink water'],
    ['스마트쿼트 → 곧은따옴표', 'I’m fine', "i'm fine"],
    ['겹따옴표(스마트 포함) 제거', '\u201cGood\u201d "night".', 'good night'],
    ['구두점만 있는 입력 → 빈 문자열', ' ?! ,. ', ''],
  ];
  for (const [name, input, want] of cases) {
    test(name, () => {
      expect(normalize(input)).toBe(want);
    });
  }
});

// ---------------------------------------------------------------------------
// levenshtein
// ---------------------------------------------------------------------------
describe('levenshtein', () => {
  const cases = [
    ['동일 문자열 → 0', 'water', 'water', 0],
    ['빈 문자열 둘 → 0', '', '', 0],
    ['치환 1회', 'cat', 'cut', 1],
    ['삽입 1회', 'cat', 'cats', 1],
    ['삭제 1회', 'cats', 'cat', 1],
    ['빈 문자열 대비 → 길이', '', 'abc', 3],
    ['반대 방향도 길이', 'abc', '', 3],
    ['인접 전위(transposition)는 2', 'water', 'watre', 2],
    ['고전 케이스 kitten→sitting', 'kitten', 'sitting', 3],
  ];
  for (const [name, a, b, want] of cases) {
    test(name, () => {
      expect(levenshtein(a, b)).toBe(want);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenize / joinTokens
// ---------------------------------------------------------------------------
describe('tokenize', () => {
  test('구두점 제거, 대소문자 보존, 공백 분리', () => {
    expect(tokenize('Hello, nice to meet you.')).toEqual(['Hello', 'nice', 'to', 'meet', 'you']);
  });
  test('스마트쿼트는 곧은따옴표로 보존', () => {
    expect(tokenize('I’m fine, thank you.')).toEqual(["I'm", 'fine', 'thank', 'you']);
  });
  test('연속/양끝 공백은 빈 토큰을 만들지 않음', () => {
    expect(tokenize('  Good   morning! ')).toEqual(['Good', 'morning']);
  });
  test('tokenize ∘ joinTokens 결과는 원문과 checkAnswer로 일치', () => {
    // 단어은행 흐름: 정답 토큰을 이어붙인 문장이 검사기를 통과해야 한다
    const sentence = 'The boy and the girl eat.';
    const rebuilt = joinTokens(tokenize(sentence));
    expect(checkAnswer([sentence], rebuilt)).toEqual({
      correct: true,
      typo: false,
      expected: sentence,
    });
  });
});

// ---------------------------------------------------------------------------
// checkAnswer
// ---------------------------------------------------------------------------
describe('checkAnswer', () => {
  const WATER = ['I drink water.'];

  test('구두점/대소문자/공백 차이는 정확 일치로 처리', () => {
    expect(checkAnswer(WATER, '  i   DRINK water ')).toEqual({
      correct: true,
      typo: false,
      expected: 'I drink water.',
    });
  });

  test('alt 답안 허용 (스마트쿼트 입력 포함), expected는 일치한 항목', () => {
    const list = ['I am a boy.', "I'm a boy."];
    expect(checkAnswer(list, 'i’m a boy')).toEqual({
      correct: true,
      typo: false,
      expected: "I'm a boy.",
    });
  });

  const typoCases = [
    ['치환 오타', 'I drink watee'],
    ['삽입 오타', 'I drinkk water'],
    ['삭제 오타', 'I drink wter'],
  ];
  for (const [name, given] of typoCases) {
    test(`편집거리 1 → correct:true, typo:true (${name})`, () => {
      expect(checkAnswer(WATER, given)).toEqual({
        correct: true,
        typo: true,
        expected: 'I drink water.',
      });
    });
  }

  test('편집거리 2(전위 포함)는 오답', () => {
    expect(checkAnswer(WATER, 'I drink watre')).toEqual({
      correct: false,
      typo: false,
      expected: 'I drink water.',
    });
  });

  test('정규화 길이 4 미만이면 오타 허용 없음', () => {
    // normalize('Bye!') === 'bye' (길이 3), 'byr'는 편집거리 1이지만 오답
    expect(checkAnswer(['Bye!'], 'byr')).toEqual({
      correct: false,
      typo: false,
      expected: 'Bye!',
    });
  });

  test('정규화 길이 4 경계에서는 오타 허용', () => {
    expect(checkAnswer(['nice'], 'nicr')).toEqual({
      correct: true,
      typo: true,
      expected: 'nice',
    });
  });

  test('빈 입력은 오답', () => {
    expect(checkAnswer(WATER, '')).toEqual({
      correct: false,
      typo: false,
      expected: 'I drink water.',
    });
  });

  test('구두점/공백뿐인 입력도 빈 입력으로 오답', () => {
    expect(checkAnswer(WATER, ' ?!. ')).toEqual({
      correct: false,
      typo: false,
      expected: 'I drink water.',
    });
  });

  test('어순이 바뀐 문장은 오답', () => {
    expect(checkAnswer(WATER, 'water I drink').correct).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------
describe('shuffle', () => {
  test('입력을 변형하지 않는 순열을 반환하고, 같은 시드면 결정적', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const snapshot = input.slice();
    const out1 = shuffle(input, mulberry32(seedFrom('shuffle-test')));
    const out2 = shuffle(input, mulberry32(seedFrom('shuffle-test')));
    expect(input).toEqual(snapshot); // 원본 불변
    expect(out1.slice().sort()).toEqual(snapshot.slice().sort()); // 순열
    expect(out1).toEqual(out2); // 결정성
  });
});

// ---------------------------------------------------------------------------
// generateSession — 결정성
// ---------------------------------------------------------------------------
describe('generateSession 결정성', () => {
  const combos = [
    [0, 0, { attempt: 0 }],
    [2, 1, { attempt: 3 }],
    [5, 3, { attempt: 1 }],
    [1, 2, { attempt: 5, ttsAvailable: false }],
    [3, COURSE.units[3].lessonCount, { attempt: 2, isReview: true }],
  ];
  for (const [u, lesson, opts] of combos) {
    test(`unit ${u} lesson ${lesson} opts ${JSON.stringify(opts)} — 같은 인자 두 번 호출 시 deep-equal`, () => {
      const a = generateSession(COURSE, u, lesson, opts);
      const b = generateSession(COURSE, u, lesson, opts);
      expect(a).toEqual(b);
    });
  }
});

// ---------------------------------------------------------------------------
// generateSession — 세션 불변식
// ---------------------------------------------------------------------------
function counts(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

const KNOWN_TYPES = new Set(['select', 'bank', 'type', 'listen', 'match', 'fill']);

// 문제 하나의 유형별 불변식 검증
function validateExercise(ex) {
  expect(KNOWN_TYPES.has(ex.type)).toBe(true);
  switch (ex.type) {
    case 'select':
      expect(ex.correct).toBeGreaterThanOrEqual(0);
      expect(ex.correct).toBeLessThan(ex.options.length);
      expect(ex.options[ex.correct]).toBe(ex.expected);
      break;
    case 'fill': {
      expect(ex.blankIndex).toBeGreaterThanOrEqual(0);
      expect(ex.blankIndex).toBeLessThan(ex.tokens.length);
      expect(ex.correct).toBeGreaterThanOrEqual(0);
      expect(ex.correct).toBeLessThan(ex.options.length);
      expect(ex.options[ex.correct]).toBe(ex.expected);
      expect(ex.expected).toBe(ex.tokens[ex.blankIndex]);
      break;
    }
    case 'bank':
    case 'listen': {
      // 은행에는 정답 토큰이 (중복 개수까지) 전부 들어 있어야 한다
      const bankCounts = counts(ex.bank);
      const missing = [];
      for (const [tok, n] of counts(ex.answerTokens)) {
        if ((bankCounts.get(tok) ?? 0) < n) missing.push(tok);
      }
      expect(missing).toEqual([]);
      // 정답 토큰을 순서대로 이어붙이면 검사기를 통과해야 한다
      expect(checkAnswer(ex.expectedList, joinTokens(ex.answerTokens)).correct).toBe(true);
      break;
    }
    case 'type':
      // 표시용 answer는 허용 답안의 대표(첫 항목)여야 한다
      expect(ex.expectedList[0]).toBe(ex.answer);
      expect(checkAnswer(ex.expectedList, ex.answer).correct).toBe(true);
      break;
    case 'match': {
      expect(ex.pairs).toHaveLength(5);
      const ids = new Set(ex.pairs.map((p) => p.id));
      expect(ids.size).toBe(5); // 짝 맞추기는 id로 매칭하므로 중복 금지
      break;
    }
  }
}

describe('generateSession 불변식 — 일반 레슨', () => {
  for (let u = 0; u < COURSE.units.length; u++) {
    const unit = COURSE.units[u];
    for (let lesson = 0; lesson < unit.lessonCount; lesson++) {
      for (const attempt of [0, 1]) {
        test(`unit ${u} (${unit.id}) lesson ${lesson} attempt ${attempt}: 길이 8 + 유형별 불변식`, () => {
          const session = generateSession(COURSE, u, lesson, { attempt });
          expect(session).toHaveLength(8);
          for (const ex of session) validateExercise(ex);
        });
      }
    }
  }
});

describe('generateSession 불변식 — ttsAvailable:false', () => {
  // listen이 계획에 포함되는 위치(레슨 1, 후반 레슨, 복습)를 포함해 전 유닛 순회
  for (let u = 0; u < COURSE.units.length; u++) {
    const unit = COURSE.units[u];
    for (const lesson of [1, unit.lessonCount - 1]) {
      test(`unit ${u} (${unit.id}) lesson ${lesson}: listen 유형 없음`, () => {
        const session = generateSession(COURSE, u, lesson, { attempt: 0, ttsAvailable: false });
        expect(session).toHaveLength(8);
        expect(session.filter((ex) => ex.type === 'listen')).toEqual([]);
        for (const ex of session) validateExercise(ex);
      });
    }
  }
  test('복습 세션에서도 listen 유형 없음 (unit 2)', () => {
    const session = generateSession(COURSE, 2, COURSE.units[2].lessonCount, {
      attempt: 0,
      ttsAvailable: false,
      isReview: true,
    });
    expect(session).toHaveLength(8);
    expect(session.filter((ex) => ex.type === 'listen')).toEqual([]);
    for (const ex of session) validateExercise(ex);
  });
});

describe('generateSession 불변식 — 복습(isReview:true, unitIndex>0)', () => {
  // 앱은 lessonIndex === unit.lessonCount 로 복습을 호출한다 (views/lesson.js)
  for (let u = 1; u < COURSE.units.length; u++) {
    const unit = COURSE.units[u];
    for (const attempt of [0, 1]) {
      test(`unit ${u} (${unit.id}) review attempt ${attempt}: 길이 8 + 유형별 불변식`, () => {
        const session = generateSession(COURSE, u, unit.lessonCount, { attempt, isReview: true });
        expect(session).toHaveLength(8);
        for (const ex of session) validateExercise(ex);
      });
    }
  }
});
