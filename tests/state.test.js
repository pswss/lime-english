// state.js 단위 테스트: 프로필 안전망 + 날짜 산술 (스트릭/프리즈/주간/하트/퀘스트/상점)
// state.js는 모듈 로드 시 localStorage에서 load()를 실행하므로,
// 셤(shim)을 먼저 깔고 파손 데이터를 심은 뒤 동적 import 한다.
import { describe, test, expect, setSystemTime, afterAll } from 'bun:test';

const store = new Map();
let failNextSet = false;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    if (failNextSet) {
      failNextSet = false;
      throw new Error('QuotaExceededError');
    }
    store.set(k, String(v));
  },
  removeItem: (k) => store.delete(k),
};

const KEY = 'duo.profile.v1';
const CORRUPT_RAW = '{"xp": 120, "gems": <<corrupt>>';
store.set(KEY, CORRUPT_RAW);

const state = await import('../src/state.js');
const { profile } = state; // live binding 아님(구조 분해) — 항상 state.profile 사용
const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

afterAll(() => setSystemTime());

// ---------------------------------------------------------------------------
// 안전망: 파손 로드 백업 + 저장 실패 알림
// ---------------------------------------------------------------------------
describe('프로필 안전망', () => {
  test('파손된 JSON 로드 시 원본을 백업 키로 보존하고 defaults로 초기화', () => {
    const backupKey = `${KEY}.corrupt-${state.todayStr()}`;
    expect(store.get(backupKey)).toBe(CORRUPT_RAW);
    expect(state.profile.xp).toBe(0); // defaults
    expect(state.pendingToasts.length).toBe(1);
    state.pendingToasts.length = 0;
  });

  test('save() setItem 실패 시 throw 없이 세션당 1회만 알림 큐에 쌓임', () => {
    failNextSet = true;
    expect(() => state.save()).not.toThrow();
    expect(state.pendingToasts.length).toBe(1);
    failNextSet = true;
    state.save(); // 두 번째 실패는 중복 알림 없음
    expect(state.pendingToasts.length).toBe(1);
    state.pendingToasts.length = 0;
    state.save(); // 정상 저장 복구
    expect(JSON.parse(store.get(KEY)).xp).toBe(state.profile.xp);
  });
});

// ---------------------------------------------------------------------------
// 프로필 가져오기 (스키마 검증)
// ---------------------------------------------------------------------------
describe('importProfile', () => {
  test('잘못된 입력은 거부하고 기존 프로필을 유지', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    state.profile.xp = 42;
    state.save();
    for (const bad of [null, [], 'x', 7, {}, { xp: 'many' }, { xp: 1, gems: 1, hearts: 1, streak: 1, lessonsDone: 1, heartsUpdatedAt: 1 }]) {
      expect(state.importProfile(bad).ok).toBe(false);
    }
    expect(state.profile.xp).toBe(42); // 미교체
  });

  test('내보낸 프로필 라운드트립 + 누락 필드는 defaults로 채움', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    state.profile.xp = 321;
    state.profile.name = '테스트';
    const exported = JSON.parse(JSON.stringify(state.profile));
    delete exported.voiceName; // 구버전 내보내기 가정
    state.resetProfile();
    const r = state.importProfile(exported);
    expect(r.ok).toBe(true);
    expect(state.profile.xp).toBe(321);
    expect(state.profile.name).toBe('테스트');
    expect(state.profile.voiceName).toBe(null); // defaults 병합
    expect(JSON.parse(store.get(KEY)).xp).toBe(321); // 저장까지 완료
  });
});

// ---------------------------------------------------------------------------
// 스트릭: 자정 경계 증가/유지, 프리즈 소모, 부족 시 초기화
// ---------------------------------------------------------------------------
describe('스트릭 날짜 산술', () => {
  test('오늘 첫 레슨 완료만 +1 (같은 날 중복 없음), 자정 넘기면 다시 +1', () => {
    setSystemTime(new Date(2026, 6, 1, 12, 0)); // 7/1 정오
    state.resetProfile();
    state.recordLessonComplete({ baseXp: 10, perfect: false, gems: 5 });
    expect(state.profile.streak).toBe(1);
    state.recordLessonComplete({ baseXp: 10, perfect: false, gems: 5 });
    expect(state.profile.streak).toBe(1); // 같은 날
    setSystemTime(new Date(2026, 6, 2, 0, 5)); // 다음 날 자정 직후
    state.applyTimeNow();
    expect(state.profile.streak).toBe(1); // gap 1은 유지
    state.recordLessonComplete({ baseXp: 10, perfect: false, gems: 5 });
    expect(state.profile.streak).toBe(2);
  });

  test('이틀 공백 = 하루 결석 → 프리즈 1개 소모하고 스트릭 유지', () => {
    setSystemTime(new Date(2026, 6, 1, 12, 0));
    state.resetProfile();
    state.profile.streak = 5;
    state.profile.lastActiveDay = '2026-07-01';
    state.profile.streakFreezes = 1;
    setSystemTime(new Date(2026, 6, 3, 9, 0)); // 7/3 (7/2 결석)
    state.applyTimeNow();
    expect(state.profile.streak).toBe(5);
    expect(state.profile.streakFreezes).toBe(0);
    expect(state.profile.lastActiveDay).toBe('2026-07-02'); // 어제까지 유지된 걸로
  });

  test('결석 일수가 프리즈보다 많으면 스트릭·프리즈 모두 초기화', () => {
    setSystemTime(new Date(2026, 6, 1, 12, 0));
    state.resetProfile();
    state.profile.streak = 9;
    state.profile.lastActiveDay = '2026-07-01';
    state.profile.streakFreezes = 1;
    setSystemTime(new Date(2026, 6, 4, 9, 0)); // 결석 2일, 프리즈 1개
    state.applyTimeNow();
    expect(state.profile.streak).toBe(0);
    expect(state.profile.streakFreezes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 주간 리셋 경계 (로컬 자정 기준 월요일)
// ---------------------------------------------------------------------------
describe('주간 리셋 경계', () => {
  test('일요일 23:59까지는 유지, 월요일 00:01에 weekStart 갱신 + weeklyXp 리셋', () => {
    setSystemTime(new Date(2026, 6, 22, 12, 0)); // 2026-07-22 수요일
    state.resetProfile();
    expect(state.profile.weekStart).toBe('2026-07-20'); // 그 주 월요일
    state.profile.weeklyXp = 77;
    setSystemTime(new Date(2026, 6, 26, 23, 59)); // 일요일 밤
    state.applyTimeNow();
    expect(state.profile.weekStart).toBe('2026-07-20');
    expect(state.profile.weeklyXp).toBe(77);
    setSystemTime(new Date(2026, 6, 27, 0, 1)); // 월요일 00:01 (로컬)
    state.applyTimeNow();
    expect(state.profile.weekStart).toBe('2026-07-27');
    expect(state.profile.weeklyXp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 하트 재생
// ---------------------------------------------------------------------------
describe('하트 재생', () => {
  test('30분당 1개, MAX에서 클램프', () => {
    const t0 = new Date(2026, 6, 10, 12, 0).getTime();
    setSystemTime(new Date(t0));
    state.resetProfile();
    state.profile.hearts = 2;
    state.profile.heartsUpdatedAt = t0;
    setSystemTime(new Date(t0 + 65 * MIN)); // 2개 재생
    state.applyTimeNow();
    expect(state.profile.hearts).toBe(4);
    state.profile.hearts = 1;
    state.profile.heartsUpdatedAt = Date.now();
    setSystemTime(new Date(t0 + 65 * MIN + 10 * HOUR)); // 충분히 경과
    state.applyTimeNow();
    expect(state.profile.hearts).toBe(state.MAX_HEARTS);
  });

  test('가득이면 타임스탬프만 갱신, loseHeart는 가득에서 깎일 때 타이머 시작', () => {
    const t0 = new Date(2026, 6, 10, 12, 0).getTime();
    setSystemTime(new Date(t0));
    state.resetProfile();
    state.profile.heartsUpdatedAt = t0 - 3 * HOUR;
    state.applyTimeNow();
    expect(state.profile.heartsUpdatedAt).toBe(t0); // 가득 → now로 리셋
    setSystemTime(new Date(t0 + 10 * MIN));
    state.loseHeart();
    expect(state.profile.hearts).toBe(4);
    expect(state.profile.heartsUpdatedAt).toBe(t0 + 10 * MIN);
  });

});

describe('하트 재생 — 나머지 보존', () => {
  test('나머지 시간 보존: 59분 경과로 1개 재생돼도 남은 29분은 다음 하트로 이어짐', () => {
    const t0 = new Date(2026, 6, 10, 12, 0).getTime();
    setSystemTime(new Date(t0));
    state.resetProfile();
    state.profile.hearts = 3;
    state.profile.heartsUpdatedAt = t0;
    setSystemTime(new Date(t0 + 59 * MIN));
    state.applyTimeNow();
    expect(state.profile.hearts).toBe(4);
    expect(state.profile.heartsUpdatedAt).toBe(t0 + 30 * MIN); // = now 로 리셋하면 29분 증발
    setSystemTime(new Date(t0 + 61 * MIN)); // 총 61분 = 하트 2개분
    state.applyTimeNow();
    expect(state.profile.hearts).toBe(5);
  });

  test('MAX 도달 시에는 타임스탬프를 now로 리셋 (미래 시각 방지)', () => {
    const t0 = new Date(2026, 6, 10, 12, 0).getTime();
    setSystemTime(new Date(t0));
    state.resetProfile();
    state.profile.hearts = 4;
    state.profile.heartsUpdatedAt = t0;
    setSystemTime(new Date(t0 + 100 * MIN)); // 3개분 경과, 1개만 필요
    state.applyTimeNow();
    expect(state.profile.hearts).toBe(5);
    expect(state.profile.heartsUpdatedAt).toBe(t0 + 100 * MIN);
  });
});

// ---------------------------------------------------------------------------
// 일일 퀘스트 롤오버 + 수령
// ---------------------------------------------------------------------------
describe('일일 퀘스트', () => {
  test('자정이 지나면 진행도·수령 내역이 리셋된다', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    state.profile.quests.progress.xp = 50;
    state.profile.quests.claimed.push('xp30');
    setSystemTime(new Date(2026, 6, 11, 0, 2));
    state.applyTimeNow();
    expect(state.profile.quests.day).toBe('2026-07-11');
    expect(state.profile.quests.progress.xp).toBe(0);
    expect(state.profile.quests.claimed).toEqual([]);
  });

  test('완료한 퀘스트만 1회 수령 가능, 보상 보석 지급', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    expect(state.claimQuest('xp30')).toBe(false); // 미완료
    state.profile.quests.progress.xp = 30;
    const gems = state.profile.gems;
    expect(state.claimQuest('xp30')).toBe(true);
    expect(state.profile.gems).toBe(gems + 50);
    expect(state.claimQuest('xp30')).toBe(false); // 중복 수령 금지
  });
});

// ---------------------------------------------------------------------------
// 상점 + 부스트
// ---------------------------------------------------------------------------
describe('상점', () => {
  const item = (id) => ({ 'streak-freeze': { id, price: 200 }, 'heart-refill': { id, price: 350 }, 'double-xp': { id, price: 150 } })[id];

  test('보석 부족/보유 한도/중복 구매 거부', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    state.profile.gems = 10;
    expect(state.buyItem(item('streak-freeze')).ok).toBe(false); // 보석 부족
    state.profile.gems = 1000;
    state.profile.streakFreezes = 2;
    expect(state.buyItem(item('streak-freeze')).ok).toBe(false); // 최대 2개
    expect(state.buyItem(item('heart-refill')).ok).toBe(false); // 하트 가득
    expect(state.buyItem(item('double-xp')).ok).toBe(true);
    expect(state.buyItem(item('double-xp')).ok).toBe(false); // 부스트 중복
  });

  test('구매 성공 시 보석 차감 + 효과 적용, 부스트는 XP 2배 후 만료', () => {
    setSystemTime(new Date(2026, 6, 10, 12, 0));
    state.resetProfile();
    state.profile.gems = 1000;
    state.profile.hearts = 1;
    expect(state.buyItem(item('heart-refill')).ok).toBe(true);
    expect(state.profile.hearts).toBe(state.MAX_HEARTS);
    expect(state.profile.gems).toBe(650);
    expect(state.buyItem(item('double-xp')).ok).toBe(true);
    expect(state.addXp(10)).toBe(20); // 부스트 활성
    setSystemTime(new Date(2026, 6, 10, 12, 20)); // 15분 부스트 만료
    expect(state.addXp(10)).toBe(10);
  });
});
