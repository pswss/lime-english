// 코스 데이터 애그리게이터 — CEFR A1 → C1, 7개 섹션 × 6유닛 = 42유닛
// 콘텐츠는 js/course/section*.js 에 분리 (섹션별 큐레이션)
import { units as s1 } from './course/section1.js';
import { units as s2 } from './course/section2.js';
import { units as s3 } from './course/section3.js';
import { units as s4 } from './course/section4.js';
import { units as s5 } from './course/section5.js';
import { units as s6 } from './course/section6.js';
import { units as s7 } from './course/section7.js';

export const SECTIONS = [
  { id: 'sec1', cefr: 'A1', title: '첫걸음', desc: '기본 문장과 일상 표현', units: s1 },
  { id: 'sec2', cefr: 'A1+', title: '생활 영어', desc: '쇼핑·시간·날씨·길찾기', units: s2 },
  { id: 'sec3', cefr: 'A2', title: '표현의 확장', desc: '과거·미래·감정 말하기', units: s3 },
  { id: 'sec4', cefr: 'B1', title: '소통의 기술', desc: '의견·경험·조언 나누기', units: s4 },
  { id: 'sec5', cefr: 'B1+', title: '실전 영어', desc: '가정법·관용구·비즈니스', units: s5 },
  { id: 'sec6', cefr: 'B2', title: '회화 마스터', desc: '구어체·뉘앙스·스토리텔링', units: s6 },
  { id: 'sec7', cefr: 'C1', title: '고급 담화', desc: '추상 토론과 원어민 뉘앙스', units: s7 },
];

export const COURSE = {
  id: 'en-ko',
  title: '영어',
  flag: '🇺🇸',
  units: SECTIONS.flatMap((s) => s.units),
};

// 섹션 경계: 각 섹션의 첫 유닛 인덱스 (배치고사·경로 렌더링용)
export const SECTION_STARTS = SECTIONS.reduce((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].units.length);
  return acc;
}, []);

export function sectionOfUnit(unitIndex) {
  let si = 0;
  for (let i = 0; i < SECTION_STARTS.length; i++) {
    if (unitIndex >= SECTION_STARTS[i]) si = i;
  }
  return si;
}

// 리더보드 봇 (결정적 시뮬레이션용)
export const LEAGUE_BOTS = [
  { name: '하늘색고래', avatar: '🐳' },
  { name: 'EnglishMaster99', avatar: '🦊' },
  { name: '수민', avatar: '🐰' },
  { name: 'Taco Cat', avatar: '🐱' },
  { name: '새벽공부단', avatar: '🌙' },
  { name: 'Jinny', avatar: '🐨' },
  { name: '아이스아메리카노', avatar: '🐧' },
  { name: 'polyglot_kim', avatar: '🦁' },
  { name: '달빛토끼', avatar: '🐹' },
];

export const LEAGUE_NAME = '루비 리그';

export const SHOP_ITEMS = [
  {
    id: 'streak-freeze',
    name: '스트릭 프리즈',
    desc: '하루를 쉬어도 스트릭이 유지돼요. (최대 2개 보유)',
    price: 200,
    icon: 'freeze',
  },
  {
    id: 'heart-refill',
    name: '하트 리필',
    desc: '하트를 5개로 모두 채워요.',
    price: 350,
    icon: 'heart',
  },
  {
    id: 'double-xp',
    name: '더블 XP 부스트',
    desc: '15분 동안 얻는 XP가 2배가 돼요.',
    price: 150,
    icon: 'bolt',
  },
];

export const DAILY_QUEST_DEFS = [
  { id: 'xp30', title: 'XP 30 획득하기', target: 30, metric: 'xp', reward: 50 },
  { id: 'lesson2', title: '레슨 2개 완료하기', target: 2, metric: 'lessons', reward: 40 },
  { id: 'perfect1', title: '완벽한 레슨 1개 완료하기', target: 1, metric: 'perfect', reward: 60 },
];
