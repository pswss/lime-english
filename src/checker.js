// 답안 검사 (순수 함수 — 테스트 대상)

// 소문자화, 구두점 제거, 공백 정리
export function normalize(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[.,!?;:"()\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 레벤슈타인 거리 (오타 허용 판정용)
export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// 타이핑/단어은행 답안 검사.
// expected: 허용 답안 문자열 배열, given: 사용자 입력
// 반환: { correct, typo, expected } — typo=true면 정답 처리하되 "오타" 안내
export function checkAnswer(expectedList, given) {
  const g = normalize(given);
  if (!g) return { correct: false, typo: false, expected: expectedList[0] };
  for (const e of expectedList) {
    if (normalize(e) === g) return { correct: true, typo: false, expected: e };
  }
  // 오타 허용: 정규화 길이 4 이상이고 편집거리가 1인 경우
  for (const e of expectedList) {
    const ne = normalize(e);
    if (ne.length >= 4 && levenshtein(ne, g) === 1) {
      return { correct: true, typo: true, expected: e };
    }
  }
  return { correct: false, typo: false, expected: expectedList[0] };
}

// HTML 이스케이프 — 사용자 입력·LLM 응답을 innerHTML에 보간할 때는 반드시 통과시킬 것
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// 단어은행 토큰 배열을 문장으로 결합
export function joinTokens(tokens) {
  return tokens.join(' ');
}

// 문장을 단어은행 토큰으로 분해 (구두점 제거)
export function tokenize(sentence) {
  return normalizePreservingCase(sentence).split(' ').filter(Boolean);
}

function normalizePreservingCase(s) {
  return s
    .replace(/['’]/g, "'")
    .replace(/[.,!?;:"\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
