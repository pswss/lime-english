// 프로필 + 업적
import { LEAGUE_NAME, COURSE } from '../data.js';
import { icons } from '../icons.js';
import { profile, resetProfile, levelOf, importProfile, todayStr } from '../state.js';
import { escapeHtml as esc } from '../checker.js';
import { render, toast } from '../app.js';

function achievements() {
  const legendaryCount = Object.keys(profile.legendary).length;
  return [
    { icon: icons.flame(true), name: '3일 연속 학습', earned: profile.streak >= 3 },
    { icon: icons.bolt(), name: 'XP 100 달성', earned: profile.xp >= 100 },
    { icon: icons.book(), name: '레슨 10개 완료', earned: profile.lessonsDone >= 10 },
    { icon: icons.check(), name: '완벽한 레슨 1개', earned: profile.perfectLessons >= 1 },
    { icon: icons.trophy(), name: '유닛 1개 정복', earned: profile.progress.unit >= 1 },
    { icon: '★', name: '레전더리 1개', earned: legendaryCount >= 1 },
    { icon: icons.video(), name: '전화 영어 10분', earned: profile.callSeconds >= 600 },
    { icon: icons.chat(), name: '대화 50번 주고받기', earned: profile.callExchanges >= 50 },
    { icon: icons.crown(), name: '코스 완주', earned: profile.progress.unit >= COURSE.units.length - 1 && profile.progress.lesson >= COURSE.units.at(-1).lessonCount + 1 },
  ];
}

export function renderProfile(el) {
  const ach = achievements();
  el.innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar">${profile.avatar ? esc(profile.avatar) : icons.face()}</div>
      <div>
        <div class="page-eyebrow" style="margin-top:0;border:none;padding:0">Learner Profile</div>
        <h1 class="page-title" style="margin:6px 0 8px">${esc(profile.name)}</h1>
        <p style="color:var(--text-sub);font-weight:500">영어 배우는 중 🇺🇸 · 레벨 ${levelOf(profile.xp)}</p>
      </div>
    </div>

    <h3 class="page-eyebrow" style="margin-bottom:14px">Stats — 통계</h3>
    <div class="stat-grid">
      <div class="stat-card">${icons.flame(profile.streak > 0)}<div><div class="v">${profile.streak}</div><div class="k">연속 학습 일수</div></div></div>
      <div class="stat-card">${icons.bolt()}<div><div class="v">${profile.xp}</div><div class="k">총 XP</div></div></div>
      <div class="stat-card">${icons.crown()}<div><div class="v">Lv.${levelOf(profile.xp)}</div><div class="k">레벨 · ${LEAGUE_NAME}</div></div></div>
      <div class="stat-card">${icons.check()}<div><div class="v">${profile.lessonsDone}</div><div class="k">완료한 레슨</div></div></div>
      <div class="stat-card">${icons.star()}<div><div class="v">${profile.perfectLessons}</div><div class="k">완벽한 레슨</div></div></div>
      <div class="stat-card">${icons.freeze()}<div><div class="v">${profile.streakFreezes}</div><div class="k">스트릭 프리즈</div></div></div>
      <div class="stat-card">${icons.video()}<div><div class="v">${Math.round(profile.callSeconds / 60)}분</div><div class="k">전화 영어</div></div></div>
      <div class="stat-card">${icons.chat()}<div><div class="v">${profile.callExchanges}</div><div class="k">주고받은 대화</div></div></div>
      <div class="stat-card">${icons.star()}<div><div class="v">${Object.keys(profile.legendary).length}</div><div class="k">레전더리 유닛</div></div></div>
    </div>

    <h3 class="page-eyebrow" style="margin-bottom:14px">Achievements — 업적</h3>
    <div class="ach-grid">
      ${ach.map((a) => `
        <div class="ach ${a.earned ? 'earned' : ''}">
          <div class="a-icon">${a.icon}</div>
          <div class="a-name">${a.name}</div>
        </div>`).join('')}
    </div>

    <h3 class="page-eyebrow" style="margin:32px 0 14px">Data — 프로필 데이터</h3>
    <p style="color:var(--text-sub);font-size:14px;margin-bottom:12px">다른 기기로 옮기려면 JSON으로 내보낸 뒤, 그 기기에서 가져오세요.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn white" id="exportBtn">프로필 내보내기</button>
      <button class="btn white" id="importBtn">프로필 가져오기</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden />
    </div>

    <div style="margin-top:32px">
      <button class="btn red" id="resetBtn">진행 상황 초기화</button>
    </div>`;

  el.querySelector('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lime-profile-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const fileInput = el.querySelector('#importFile');
  el.querySelector('#importBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch {
      return toast('JSON 파일을 읽을 수 없어요');
    }
    if (!window.confirm('현재 진행 상황을 가져온 프로필로 교체할까요?')) return;
    const r = importProfile(data);
    toast(r.ok ? '프로필을 가져왔어요' : r.reason);
    if (r.ok) render();
  });

  el.querySelector('#resetBtn').addEventListener('click', () => {
    if (window.confirm('정말 모든 진행 상황을 초기화할까요? 되돌릴 수 없어요.')) {
      resetProfile();
      toast('프로필이 초기화되었어요');
      render();
    }
  });
}
