// 앱 부트스트랩 + 해시 라우터 + 상단바/내비게이션
import { icons } from './icons.js';
import { setVoice } from './audio.js';
import { profile, onChange, boostActive, MAX_HEARTS, toggleMuted, applyTimeNow } from './state.js';
import { renderPath, renderRail } from './views/path.js';
import { renderCall } from './views/call.js';
import { renderShop } from './views/shop.js';
import { renderLeaderboard } from './views/leaderboard.js';
import { renderProfile } from './views/profile.js';

const ROUTES = [
  { id: 'learn', label: '배우기', icon: 'book', render: renderPath },
  { id: 'call', label: '회화', icon: 'video', render: renderCall },
  { id: 'leaderboard', label: '리더보드', icon: 'chart', render: renderLeaderboard },
  { id: 'shop', label: '상점', icon: 'shop', render: renderShop },
  { id: 'profile', label: '프로필', icon: 'face', render: renderProfile },
];

const $ = (sel) => document.querySelector(sel);

function currentRoute() {
  const id = location.hash.replace('#/', '') || 'learn';
  return ROUTES.find((r) => r.id === id) || ROUTES[0];
}

function navItems(route) {
  return ROUTES.map(
    (r, i) => `
    <a class="nav-item ${r.id === route.id ? 'active' : ''}" href="#/${r.id}" data-route="${r.id}">
      <span class="idx">0${i + 1}</span>${icons[r.icon]()}<span>${r.label}</span>
    </a>`
  ).join('');
}

function renderNav() {
  const route = currentRoute();
  $('#sidebar').innerHTML = `
    <div class="logo">
      <div class="word"><span>LIME<em>.</em></span></div>
      <div class="tag">라임 스터디 클럽 — 매일 조금씩</div>
    </div>
    ${navItems(route)}
    <div class="sidebar-foot">EN ← KO course<br/>A1 – C1 · Paper &amp; Acid</div>`;
  $('#bottomnav').innerHTML = navItems(route);
}

export function renderTopbar() {
  const boost = boostActive();
  $('#topbar').innerHTML = `
    <div class="stats">
      <span class="stat flag" title="영어 코스">🇺🇸</span>
      <span class="stat flame ${profile.streak > 0 ? '' : 'off'}" title="연속 학습">${icons.flame(profile.streak > 0)}${profile.streak}일</span>
      <span class="stat gems" title="보석">${icons.gem()}${profile.gems}</span>
      <span class="stat hearts" title="하트">${icons.heart(profile.hearts > 0)}${profile.hearts}/${MAX_HEARTS}</span>
      ${boost ? `<span class="stat boost" title="더블 XP 부스트 활성화">${icons.bolt()}2x</span>` : ''}
      <button class="stat mute ${profile.muted ? 'off' : ''}" id="muteBtn" title="효과음 ${profile.muted ? '켜기' : '끄기'}">
        ${profile.muted ? icons.speakerOff() : icons.speaker()}
      </button>
    </div>`;
  $('#muteBtn').onclick = () => {
    toggleMuted();
    renderTopbar();
  };
}

export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

let lastRoute = null; // 라우트 전환에만 등장 애니메이션 재생 (퀘스트 수령 등 재렌더 시 재생 방지)
export function render() {
  const route = currentRoute();
  renderNav();
  renderTopbar();
  route.render($('#view'));
  renderRail($('#rail'), route.id);
  if (route.id !== lastRoute) {
    lastRoute = route.id;
    $('#view').getAnimations().forEach((a) => { a.cancel(); a.play(); });
  }
}

if (profile.voiceName) setVoice(profile.voiceName);
window.addEventListener('hashchange', render);
onChange(() => renderTopbar());
render();

// 탭을 열어둔 채로도 하트 회복·자정/주간 리셋 반영
const timeTick = () => { if (applyTimeNow()) render(); };
setInterval(timeTick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) timeTick(); });
