// 배우기 화면: CEFR 섹션 → 유닛 → 레슨 경로 + 오른쪽 레일
import { COURSE, SECTIONS, SECTION_STARTS, LEAGUE_NAME } from '../data.js';
import { icons } from '../icons.js';
import {
  profile, nodeState, questStates, claimQuest, leagueStandings, courseCompleted,
  weakList, dismissPlacement,
} from '../state.js';
import { startLesson, startWeakReview, startPlacement } from './lesson.js';
import { renderTopbar, render } from '../app.js';
import { sfx } from '../audio.js';

// 경로의 좌우 굽이 패턴
const OFFSETS = [0, -48, -78, -48, 0, 48, 78, 48];

let openPop = null; // {unitIndex, nodeIndex}

const MARQUEE = '<em>LIME</em> 라임 · 매일 조금씩 <em>KEEP THE STREAK</em> 꾸준함이 실력 <em>A1 → C1</em> <em>TALK TO NATIVES</em> · ';

function unitHtml(unit, ui) {
  const total = unit.lessonCount + 1;
  let doneCount = 0;
  const nodes = [];
  for (let li = 0; li < total; li++) {
    const st = nodeState(ui, li);
    if (st === 'done') doneCount += 1;
    const isTrophy = li === total - 1;
    const offset = OFFSETS[li % OFFSETS.length];
    const iconName = isTrophy ? 'trophy' : st === 'done' ? 'check' : st === 'locked' ? 'lock' : unit.icon;
    const showTip = st === 'active' && !(openPop && openPop.unitIndex === ui && openPop.nodeIndex === li);
    const pop =
      openPop && openPop.unitIndex === ui && openPop.nodeIndex === li
        ? nodePop(unit, ui, li, st, isTrophy)
        : '';
    nodes.push(`
      <div class="node-row" style="transform:translateX(${offset}px)">
        ${showTip ? `<div class="start-tip">시작 · Start</div>` : ''}
        <button class="node ${st} ${isTrophy ? 'trophy' : ''}"
          data-unit="${ui}" data-node="${li}" aria-label="${unit.title} 레슨 ${li + 1}">
          ${icons[iconName] ? icons[iconName]() : icons.star()}
        </button>
        ${pop}
      </div>`);
  }
  const idx = String(ui + 1).padStart(2, '0');
  const legendary = profile.legendary[unit.id];
  return `
    <div class="unit-banner ${doneCount === total ? 'done-unit' : ''} ${legendary ? 'legendary' : ''}">
      <div class="u-idx">${idx}</div>
      <div class="u-body">
        <div class="u-sub">Unit ${idx} — ${unit.subtitle}</div>
        <div class="u-title">${unit.title}${legendary ? ' <span class="lg-star">★</span>' : ''}</div>
      </div>
      <div class="u-meta">${unit.lessonCount} lessons + review<br/><b>${doneCount}/${total} clear${legendary ? ' · legendary' : ''}</b></div>
    </div>
    <div class="path">${nodes.join('')}</div>`;
}

export function renderPath(el) {
  const placement =
    !profile.placementDone && profile.progress.unit === 0 && profile.progress.lesson === 0
      ? `<div class="placement-card">
          <div>
            <div class="u-sub">Placement Test — 배치고사</div>
            <h4>이미 영어를 좀 하시나요?</h4>
            <p>${SECTIONS.length}개 섹션 레벨 테스트로 딱 맞는 시작점을 찾아 드려요.</p>
          </div>
          <div class="pc-actions">
            <button class="btn" id="placementBtn">레벨 테스트 보기</button>
            <button class="btn ghost" id="placementSkip">처음부터 할게요</button>
          </div>
        </div>`
      : '';

  const sectionsHtml = SECTIONS.map((sec, si) => {
    const start = SECTION_STARTS[si];
    const unitsOfSec = sec.units.map((u, i) => unitHtml(u, start + i)).join('');
    const doneUnits = sec.units.filter((u, i) => {
      const ui = start + i;
      return nodeState(ui, u.lessonCount) === 'done';
    }).length;
    return `
      <section>
        <div class="section-head">
          <div class="sec-cefr">${sec.cefr}</div>
          <div class="sec-body">
            <div class="u-sub">Section ${String(si + 1).padStart(2, '0')} · ${sec.units.length} units</div>
            <div class="sec-title">${sec.title}</div>
            <div class="sec-desc">${sec.desc}</div>
          </div>
          <div class="sec-progress">${doneUnits}<span>/${sec.units.length}</span></div>
        </div>
        ${unitsOfSec}
      </section>`;
  }).join('');

  const done = courseCompleted()
    ? `<div class="course-end"><p>C1 코스를 완주했어요! 복습과 전화 영어로 실력을 유지하세요.</p></div>`
    : '';

  const marquee = `<div class="marquee"><div class="marquee-track">${MARQUEE.repeat(4)}</div></div>`;
  el.innerHTML = marquee + placement + sectionsHtml + done;

  document.getElementById('placementBtn')?.addEventListener('click', () => startPlacement());
  document.getElementById('placementSkip')?.addEventListener('click', () => {
    dismissPlacement();
    render();
  });

  el.querySelectorAll('.node').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ui = +btn.dataset.unit;
      const li = +btn.dataset.node;
      sfx.select();
      if (openPop && openPop.unitIndex === ui && openPop.nodeIndex === li) openPop = null;
      else openPop = { unitIndex: ui, nodeIndex: li };
      renderPath(el);
    });
  });

  el.querySelectorAll('[data-start]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [ui, li] = btn.dataset.start.split(':').map(Number);
      openPop = null;
      startLesson(ui, li);
    });
  });

  // 첫 진입 시 활성 노드로 스크롤 (42유닛 경로 사용성)
  if (!el.dataset.scrolled) {
    el.dataset.scrolled = '1';
    const active = el.querySelector('.node.active');
    if (active && profile.progress.unit > 0) {
      setTimeout(() => active.scrollIntoView({ block: 'center', behavior: 'instant' }), 60);
    }
  }

  document.addEventListener('click', closePopOnce, { once: true });
  function closePopOnce() {
    if (openPop) {
      openPop = null;
      if (document.contains(el)) renderPath(el);
    }
  }
}

function nodePop(unit, ui, li, st, isTrophy) {
  if (st === 'locked') {
    return `<div class="node-pop gray">
      <h4>${isTrophy ? '유닛 복습' : `레슨 ${li + 1}`}</h4>
      <p>이전 레슨을 모두 완료하면 잠금이 해제돼요!</p>
      <button class="btn" disabled>잠김 ${icons.lock()}</button>
    </div>`;
  }
  const label = isTrophy ? `${unit.title} 복습` : `${unit.title} · 레슨 ${li + 1}/${unit.lessonCount}`;
  const xp = st === 'done' ? 5 : 10;
  const action = st === 'done' ? '복습하기' : '시작하기';
  const legendaryHint =
    isTrophy && st === 'done' && !profile.legendary[unit.id]
      ? '무실수로 클리어하면 레전더리 ★ 획득!'
      : isTrophy ? '배운 내용을 총정리하고 트로피를 지켜요.' : unit.subtitle;
  return `<div class="node-pop">
    <h4>${label}</h4>
    <p>${legendaryHint}</p>
    <button class="btn" data-start="${ui}:${li}">${action} +${xp} XP</button>
  </div>`;
}

// ── 오른쪽 레일 ──
export function renderRail(el, routeId) {
  if (!el) return;
  if (routeId !== 'learn') {
    el.innerHTML = '';
    return;
  }
  const standings = leagueStandings();
  const myRank = standings.findIndex((s) => !s.bot) + 1;
  const top3 = standings.slice(0, 3);
  const quests = questStates();
  const weak = weakList();

  el.innerHTML = `
    ${weak.length ? `
    <div class="card weak-card">
      <h3>약점 복습 <span class="weak-count">${weak.length}</span></h3>
      <p class="weak-desc">자주 틀린 문장을 모아 다시 연습해요. 간격 반복이 기억을 만들어요.</p>
      <button class="q-claim" id="weakBtn">복습 시작 +8 XP</button>
    </div>` : ''}
    <div class="card">
      <h3>${LEAGUE_NAME} <a href="#/leaderboard">전체 보기</a></h3>
      ${top3
        .map(
          (s, i) => `
        <div class="lb-row ${s.bot ? '' : 'me'}">
          <span class="rank">${i + 1}</span>
          <span class="avatar">${s.avatar || icons.face()}</span>
          <span class="name">${s.name}</span>
          <span class="xp">${s.xp} XP</span>
        </div>`
        )
        .join('')}
      <div style="padding:10px 8px;color:var(--text-sub);font-size:13px">
        내 순위: <b style="color:var(--cobalt)">${myRank}위</b> · 이번 주 ${profile.weeklyXp} XP
      </div>
    </div>
    <div class="card">
      <h3>일일 퀘스트</h3>
      ${quests
        .map(
          (q) => `
        <div class="quest ${q.complete ? 'complete' : ''}">
          <div class="q-top">
            <span>${q.title}</span>
            <span class="q-reward">${icons.gem()}${q.reward}</span>
          </div>
          <div class="qbar"><div style="width:${(q.current / q.target) * 100}%"></div></div>
          ${q.complete
            ? `<button class="q-claim ${q.claimed ? 'claimed' : ''}" data-quest="${q.id}">
                 ${q.claimed ? '받기 완료 ✓' : '보상 받기'}
               </button>`
            : `<div style="text-align:right;font-size:12px;color:var(--text-faint);margin-top:5px">${q.current} / ${q.target}</div>`}
        </div>`
        )
        .join('')}
    </div>
    <div class="card motto">
      <div class="motto-big">매일<br/>조금씩</div>
      <p>42개 유닛 · A1부터 C1까지<br/>꾸준함이 실력이 돼요</p>
    </div>`;

  el.querySelector('#weakBtn')?.addEventListener('click', () => startWeakReview(weak));

  el.querySelectorAll('[data-quest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (claimQuest(btn.dataset.quest)) {
        sfx.claim();
        renderTopbar();
        render();
      }
    });
  });
}
