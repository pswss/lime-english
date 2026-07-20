// 프로필 상태 + localStorage 영속화
import { COURSE, DAILY_QUEST_DEFS, LEAGUE_BOTS } from './data.js';
import { mulberry32, seedFrom } from './session.js';

const KEY = 'duo.profile.v1';
export const MAX_HEARTS = 5;
const HEART_REGEN_MS = 30 * 60 * 1000; // 30분마다 하트 1개
const listeners = new Set();

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function defaults() {
  return {
    name: '나',
    avatar: '', // 비어 있으면 뷰에서 icons.face()로 렌더
    xp: 0,
    gems: 500,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    streak: 0,
    lastActiveDay: null,
    streakFreezes: 1,
    freezeUsedDays: [],
    boostUntil: 0,
    progress: { unit: 0, lesson: 0 }, // 다음에 플레이할 위치
    lessonsDone: 0,
    perfectLessons: 0,
    weeklyXp: 0,
    weekStart: currentWeekStart(),
    quests: freshQuests(),
    muted: false,
    callSeconds: 0,
    callExchanges: 0,
    weakPairs: {},
    legendary: {},
    placementDone: false,
    voiceName: null,
  };
}

function freshQuests() {
  return { day: todayStr(), progress: { xp: 0, lessons: 0, perfect: 0 }, claimed: [] };
}

function currentWeekStart() {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 월요일 시작
  d.setDate(d.getDate() - dow);
  return todayStr(d);
}

export let profile = load();

export function toggleMuted() {
  profile.muted = !profile.muted;
  save();
  return profile.muted;
}

function load() {
  let p;
  try {
    p = JSON.parse(localStorage.getItem(KEY)) || defaults();
  } catch {
    p = defaults();
  }
  p = { ...defaults(), ...p };
  applyTime(p);
  return p;
}

// 시간 경과 처리: 하트 재생, 일일 퀘스트 리셋, 주간 리셋, 스트릭 판정
function applyTime(p) {
  // 하트 재생
  if (p.hearts < MAX_HEARTS) {
    const gained = Math.floor((Date.now() - p.heartsUpdatedAt) / HEART_REGEN_MS);
    if (gained > 0) {
      p.hearts = Math.min(MAX_HEARTS, p.hearts + gained);
      p.heartsUpdatedAt = Date.now();
    }
  } else {
    p.heartsUpdatedAt = Date.now();
  }
  // 일일 퀘스트 리셋
  if (p.quests.day !== todayStr()) p.quests = freshQuests();
  // 주간 리그 리셋
  if (p.weekStart !== currentWeekStart()) {
    p.weekStart = currentWeekStart();
    p.weeklyXp = 0;
  }
  // 스트릭: 하루 이상 공백이면 프리즈 소모, 부족하면 초기화
  if (p.lastActiveDay && p.streak > 0) {
    const gap = daysBetween(p.lastActiveDay, todayStr());
    if (gap > 1) {
      const missed = gap - 1;
      if (p.streakFreezes >= missed) {
        p.streakFreezes -= missed;
        p.lastActiveDay = todayStr(new Date(Date.now() - 86400000)); // 어제까지 유지된 걸로
      } else {
        p.streak = 0;
        p.streakFreezes = 0;
      }
    }
  }
  return p;
}

// 열린 탭에서도 시간 경과 반영 (하트 재생·자정 퀘스트/주간 리셋). 상태가 바뀌면 저장 후 true.
export function applyTimeNow() {
  const snap = () =>
    JSON.stringify([profile.hearts, profile.quests.day, profile.weekStart, profile.streak, profile.streakFreezes]);
  const before = snap();
  applyTime(profile);
  if (snap() === before) return false;
  save();
  return true;
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(profile));
  for (const fn of listeners) fn(profile);
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetProfile() {
  profile = defaults();
  save();
}

// ── 레벨 (XP 100당 1레벨) ──
export function levelOf(xp) {
  return Math.floor(xp / 100) + 1;
}

// ── 약점 추적 (간격 반복의 수집 단계) ──
// 키: 문장 en 원문, 값: 틀린 횟수. 복습에서 맞히면 감소.
export function recordMiss(pairEn) {
  if (!pairEn) return;
  profile.weakPairs[pairEn] = (profile.weakPairs[pairEn] || 0) + 1;
  save();
}

export function recordHit(pairEn) {
  if (!pairEn || !profile.weakPairs[pairEn]) return;
  profile.weakPairs[pairEn] -= 1;
  if (profile.weakPairs[pairEn] <= 0) delete profile.weakPairs[pairEn];
  save();
}

export function weakList() {
  return Object.entries(profile.weakPairs)
    .sort((a, b) => b[1] - a[1])
    .map(([en]) => en);
}

// ── 레전더리 (유닛 마스터 티어) ──
// 완료한 유닛의 복습을 무실수로 다시 클리어하면 획득
export function markLegendary(unitId) {
  if (profile.legendary[unitId]) return false;
  profile.legendary[unitId] = true;
  save();
  return true;
}

// ── 배치고사 ──
export function applyPlacement(unitIndex) {
  profile.placementDone = true;
  const cur = profile.progress;
  if (unitIndex > cur.unit) profile.progress = { unit: unitIndex, lesson: 0 };
  save();
}

export function dismissPlacement() {
  profile.placementDone = true;
  save();
}

// ── 하트 ──
export function loseHeart() {
  if (profile.hearts > 0) {
    if (profile.hearts === MAX_HEARTS) profile.heartsUpdatedAt = Date.now();
    profile.hearts -= 1;
    save();
  }
  return profile.hearts;
}

export function refillHearts() {
  profile.hearts = MAX_HEARTS;
  profile.heartsUpdatedAt = Date.now();
  save();
}

// ── XP / 보상 ──
export function boostActive() {
  return Date.now() < profile.boostUntil;
}

export function addXp(amount) {
  const final = boostActive() ? amount * 2 : amount;
  profile.xp += final;
  profile.weeklyXp += final;
  profile.quests.progress.xp += final;
  return final;
}

// 레슨 완료 처리. 반환: 실제 획득 XP
export function recordLessonComplete({ baseXp, perfect, gems }) {
  const gained = addXp(baseXp);
  profile.gems += gems;
  profile.lessonsDone += 1;
  profile.quests.progress.lessons += 1;
  if (perfect) {
    profile.perfectLessons += 1;
    profile.quests.progress.perfect += 1;
  }
  // 스트릭: 오늘 첫 완료면 +1
  if (profile.lastActiveDay !== todayStr()) {
    profile.streak += 1;
    profile.lastActiveDay = todayStr();
  }
  save();
  return gained;
}

// 경로 진행. 완료한 노드가 현재 활성 노드면 전진
export function advanceProgress(unitIndex, lessonIndex) {
  const { unit, lesson } = profile.progress;
  if (unitIndex === unit && lessonIndex === lesson) {
    const u = COURSE.units[unitIndex];
    const total = u.lessonCount + 1; // 마지막은 복습(트로피)
    if (lesson + 1 >= total) {
      if (unit + 1 < COURSE.units.length) {
        profile.progress = { unit: unit + 1, lesson: 0 };
      } else {
        profile.progress = { unit, lesson: total }; // 코스 완주
      }
    } else {
      profile.progress = { unit, lesson: lesson + 1 };
    }
    save();
  }
}

export function nodeState(unitIndex, lessonIndex) {
  const { unit, lesson } = profile.progress;
  if (unitIndex < unit || (unitIndex === unit && lessonIndex < lesson)) return 'done';
  if (unitIndex === unit && lessonIndex === lesson) return 'active';
  return 'locked';
}

export function courseCompleted() {
  const last = COURSE.units.length - 1;
  return profile.progress.unit === last && profile.progress.lesson >= COURSE.units[last].lessonCount + 1;
}

// ── 상점 ──
export function buyItem(item) {
  if (profile.gems < item.price) return { ok: false, reason: '보석이 부족해요' };
  if (item.id === 'streak-freeze' && profile.streakFreezes >= 2)
    return { ok: false, reason: '이미 2개를 보유하고 있어요' };
  if (item.id === 'heart-refill' && profile.hearts >= MAX_HEARTS)
    return { ok: false, reason: '하트가 이미 가득해요' };
  if (item.id === 'double-xp' && boostActive())
    return { ok: false, reason: '부스트가 이미 켜져 있어요' };
  profile.gems -= item.price;
  if (item.id === 'streak-freeze') profile.streakFreezes += 1;
  if (item.id === 'heart-refill') refillHearts();
  if (item.id === 'double-xp') profile.boostUntil = Date.now() + 15 * 60 * 1000;
  save();
  return { ok: true };
}

// ── 일일 퀘스트 ──
export function questStates() {
  return DAILY_QUEST_DEFS.map((q) => {
    const cur = Math.min(profile.quests.progress[q.metric], q.target);
    return {
      ...q,
      current: cur,
      complete: cur >= q.target,
      claimed: profile.quests.claimed.includes(q.id),
    };
  });
}

export function claimQuest(id) {
  const q = questStates().find((x) => x.id === id);
  if (!q || !q.complete || q.claimed) return false;
  profile.quests.claimed.push(id);
  profile.gems += q.reward;
  save();
  return true;
}

// ── 리그 (결정적 봇 시뮬레이션) ──
export function leagueStandings() {
  const rng = mulberry32(seedFrom('league:' + profile.weekStart));
  const hoursElapsed = Math.max(0, (Date.now() - new Date(profile.weekStart).getTime()) / 3600000);
  const bots = LEAGUE_BOTS.map((b) => {
    const pace = 2 + rng() * 12; // 시간당 XP 페이스 (봇마다 고정)
    const jitter = rng() * 30;
    return { ...b, xp: Math.floor(pace * Math.min(hoursElapsed, 100) + jitter), bot: true };
  });
  const me = { name: profile.name, avatar: profile.avatar, xp: profile.weeklyXp, bot: false };
  return [...bots, me].sort((a, b) => b.xp - a.xp);
}
