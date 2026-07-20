// 상점
import { SHOP_ITEMS } from '../data.js';
import { icons } from '../icons.js';
import { profile, buyItem, boostActive, MAX_HEARTS } from '../state.js';
import { sfx } from '../audio.js';
import { render, toast } from '../app.js';

function ownedInfo(item) {
  if (item.id === 'streak-freeze') return `보유: ${profile.streakFreezes} / 2`;
  if (item.id === 'heart-refill') return `현재 하트: ${profile.hearts} / ${MAX_HEARTS}`;
  if (item.id === 'double-xp') {
    if (!boostActive()) return '';
    const min = Math.ceil((profile.boostUntil - Date.now()) / 60000);
    return `활성화됨 · ${min}분 남음`;
  }
  return '';
}

export function renderShop(el) {
  el.innerHTML = `
    <div class="page-eyebrow">Gem Shop</div>
    <h1 class="page-title">상점</h1>
    <p class="page-sub">보유 보석: <b style="color:var(--cobalt)">${icons.gem()} ${profile.gems}</b></p>
    ${SHOP_ITEMS.map(
      (item) => `
      <div class="shop-item">
        <div class="s-icon">${icons[item.icon]()}</div>
        <div class="s-body">
          <h4>${item.name}</h4>
          <p>${item.desc}</p>
          ${ownedInfo(item) ? `<div class="owned">${ownedInfo(item)}</div>` : ''}
        </div>
        <button class="btn blue price-btn" data-buy="${item.id}">${icons.gem()} ${item.price}</button>
      </div>`
    ).join('')}
    <div class="card" style="display:flex;gap:18px;align-items:center;margin-top:24px">
      <div class="s-icon" style="width:62px;height:62px;border-radius:50%;background:var(--lime-tint);border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icons.gem()}</div>
      <div>
        <h4 style="font-family:var(--display);font-weight:800;font-size:18px;margin-bottom:4px">보석이 더 필요한가요?</h4>
        <p style="color:var(--text-sub);font-size:14px">레슨을 완료하고 일일 퀘스트 보상을 받으면 보석을 모을 수 있어요.</p>
      </div>
    </div>`;

  el.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = SHOP_ITEMS.find((s) => s.id === btn.dataset.buy);
      const r = buyItem(item);
      if (r.ok) {
        sfx.buy();
        toast(`${item.name} 구매 완료!`);
        render();
      } else {
        toast(r.reason);
      }
    });
  });
}
