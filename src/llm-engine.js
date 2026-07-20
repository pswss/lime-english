// LLM 대화 엔진 — 서버 /call/reply(Codex CLI) 경유.
// 계약은 call.js의 createScriptedEngine과 동일: first() → exchange, answer(text) → 결과.
// answer()는 async — call.js의 onUser가 await로 처리한다.
// 서버/LLM 오류 시 통화가 죽지 않도록 같은 교환을 유지한 채 재시도 멘트를 반환한다.

let callAuthorization = '';

function basicAuthorization(user, password) {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

async function postReply(body) {
  const request = () => fetch('/call/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(callAuthorization ? { Authorization: callAuthorization } : {}),
    },
    body,
  });
  let response = await request();
  if (response.status !== 401 || typeof globalThis.prompt !== 'function') return response;

  const user = globalThis.prompt('LIME 통화 사용자 이름');
  if (user === null) return response;
  const password = globalThis.prompt('LIME 통화 비밀번호');
  if (password === null) return response;
  callAuthorization = basicAuthorization(user, password);
  response = await request();
  if (response.status === 401) callAuthorization = '';
  return response;
}

export function createLlmEngine(scenario) {
  // 오프너는 시나리오의 스크립트 첫 교환 재사용 (ko·replies 확보, LLM 호출 0회)
  const opening = scenario.topics[0]?.exchanges?.[0] || {
    say: "Hi! It's so good to see you. How's your day going?",
    ko: '안녕하세요! 만나서 반가워요. 오늘 하루 어때요?',
    replies: ["It's going great!", 'Pretty busy, actually.'],
  };
  const history = [];
  let current = null;

  return {
    first() {
      current = { say: opening.say, ko: opening.ko, replies: [...(opening.replies || [])] };
      history.push({ who: 'emma', text: current.say });
      return { ...current };
    },
    async answer(text) {
      history.push({ who: 'me', text });
      try {
        const res = await postReply(JSON.stringify({
          scenario: `${scenario.title} — ${scenario.desc}`,
          history: history.slice(0, -1),
          user: text,
        }));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        current = {
          say: data.say,
          ko: data.ko,
          replies: data.replies?.length ? data.replies : ['Yes!', 'Not really.'],
        };
        history.push({ who: 'emma', text: current.say });
        return {
          verdict: data.verdict === 'recast' ? 'recast' : 'match',
          reaction: data.reaction || '',
          model: data.model || undefined,
          next: { ...current },
        };
      } catch {
        // 연결 문제 연출로 흡수 — 같은 질문 유지
        history.pop(); // 실패한 사용자 발화는 이력에서 제거 (재시도 대비)
        return {
          verdict: 'moveon',
          reaction: "Sorry, the connection glitched for a second — could you say that again?",
          next: { ...current },
        };
      }
    },
  };
}
