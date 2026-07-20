import { afterEach, describe, expect, test } from 'bun:test';
import { createLlmEngine } from '../src/llm-engine.js';

const originalFetch = globalThis.fetch;
const originalPrompt = globalThis.prompt;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.prompt = originalPrompt;
});

describe('LLM call authentication', () => {
  test('401 prompts once and retries with HTTP Basic credentials', async () => {
    const requests = [];
    const prompts = ['learner', 'not-a-real-password'];
    globalThis.prompt = () => prompts.shift();
    globalThis.fetch = async (_, options) => {
      requests.push(options);
      if (requests.length === 1) return { status: 401, ok: false };
      return {
        status: 200,
        ok: true,
        json: async () => ({
          verdict: 'match',
          reaction: 'Nice!',
          say: 'How are you?',
          ko: '잘 지내요?',
          replies: ["I'm good."],
        }),
      };
    };

    const engine = createLlmEngine({
      title: 'Free talk',
      desc: 'Chat',
      topics: [{ exchanges: [{ say: 'Hi!', ko: '안녕!', replies: ['Hello!'] }] }],
    });
    engine.first();
    const reply = await engine.answer('Hello!');

    expect(requests).toHaveLength(2);
    expect(requests[0].headers.Authorization).toBeUndefined();
    expect(requests[1].headers.Authorization).toBe(
      `Basic ${btoa('learner:not-a-real-password')}`,
    );
    expect(reply.next.say).toBe('How are you?');
  });
});
