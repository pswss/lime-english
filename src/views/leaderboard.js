// 리더보드 (주간 리그)
import { LEAGUE_NAME } from '../data.js';
import { icons } from '../icons.js';
import { leagueStandings } from '../state.js';

export function renderLeaderboard(el) {
  const standings = leagueStandings();
  const n = standings.length;
  const rows = standings
    .map((s, i) => {
      const rank = i + 1;
      const demote = rank > n - 2;
      let zone = '';
      if (rank === 4) zone = `<div class="lb-zone up">${icons.crown()} 승급 구간</div>`;
      if (rank === n - 1) zone = `<div class="lb-zone down">강등 구간</div>`;
      return `
        ${zone}
        <div class="lb-row ${s.bot ? '' : 'me'}">
          <span class="rank ${demote ? 'demote' : ''}">${rank}</span>
          <span class="avatar">${s.avatar || icons.face()}</span>
          <span class="name">${s.name}${s.bot ? '' : ' (나)'}</span>
          <span class="xp">${s.xp} XP</span>
        </div>`;
    })
    .join('');

  const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
  el.innerHTML = `
    <div class="page-eyebrow">Weekly League — 상위 3명 승급</div>
    <h1 class="page-title">${LEAGUE_NAME}</h1>
    <p class="page-sub">이번 주가 <b style="color:var(--moss)">${daysLeft}일</b> 남았어요. 순위를 지키세요.</p>
    <div class="card" style="padding:6px 0">${rows}</div>`;
}
