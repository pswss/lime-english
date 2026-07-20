// 인라인 SVG 아이콘 (PAPER & ACID 팔레트)
const svg = (vb, body, cls = '') =>
  `<svg class="icon ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const icons = {
  flame: (on = true) =>
    svg(
      '0 0 24 24',
      `<path fill="${on ? '#5f7d0d' : '#c4c2b0'}" d="M12 2c.6 3.2-1.4 4.8-2.9 6.5C7.5 10.3 6 12.2 6 15a6 6 0 0 0 12 0c0-2.3-1-4.2-2.2-5.9-.5 1.2-1.2 2-2.3 2.4.6-3.3-.2-7-1.5-9.5z"/><path fill="${on ? '#c9f158' : '#e4e1d2'}" d="M12.2 11.6c.3 1.8-.7 2.6-1.5 3.5-.6.7-1.2 1.5-1.2 2.7a3.3 3.3 0 0 0 6.6 0c0-1.2-.5-2.2-1.2-3.1-.3.6-.7 1-1.3 1.3.3-1.7-.5-3.2-1.4-4.4z"/>`
    ),
  gem: () =>
    svg(
      '0 0 24 24',
      `<path fill="#2b47e8" d="M6.4 3h11.2L22 9l-10 12L2 9z"/><path fill="#8b9dff" d="M6.4 3 12 9 2 9zM12 9l5.6-6L22 9z" opacity=".9"/><path fill="#1c30a8" d="M12 21 2 9h20z" opacity=".5"/>`
    ),
  heart: (on = true) =>
    svg(
      '0 0 24 24',
      `<path fill="${on ? '#e2401f' : '#c4c2b0'}" d="M12 21s-8.5-5.3-10-10C1 7.6 3 4.5 6.4 4.5c2.2 0 3.9 1.2 5.6 3.4 1.7-2.2 3.4-3.4 5.6-3.4C21 4.5 23 7.6 22 11c-1.5 4.7-10 10-10 10z"/>`
    ),
  heartBroken: () =>
    svg(
      '0 0 24 24',
      `<path fill="#e2401f" d="M12 21s-8.5-5.3-10-10C1 7.6 3 4.5 6.4 4.5c2.2 0 3.9 1.2 5.6 3.4 1.7-2.2 3.4-3.4 5.6-3.4C21 4.5 23 7.6 22 11c-1.5 4.7-10 10-10 10z"/><path fill="none" stroke="var(--paper, #f2efe3)" stroke-width="1.8" stroke-linejoin="round" d="M12.3 7 10 10.6l3.4 2.2-2.2 4.4"/>`
    ),
  bolt: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6z"/>`),
  freeze: () =>
    svg(
      '0 0 24 24',
      `<path fill="#2b47e8" d="M11 2h2v20h-2zM3.2 6.8l1-1.8L21 15l-1 1.8zM20 5 21 6.8 4.2 16.8l-1-1.8z"/><circle cx="12" cy="12" r="3.2" fill="#8b9dff"/>`
    ),
  star: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"/>`),
  chat: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>`),
  food: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M7 2v8a3 3 0 0 0 2 2.8V22h2V12.8A3 3 0 0 0 13 10V2h-2v7H10V2H8v7H7zm10 0c-2 1.5-3 3.8-3 6.5 0 2 .8 3.3 2 3.9V22h2V2z"/>`),
  plane: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M21 15v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8l-8 5v2l8-2.5V18l-2.5 2v1.5L12 20l4.5 1.5V20L14 18v-5.5z"/>`),
  sun: () =>
    svg('0 0 24 24', `<circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></g>`),
  check: () =>
    svg('0 0 24 24', `<path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="m4 12.5 5.5 5.5L20 6.5"/>`),
  lock: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M6 10V7a6 6 0 0 1 12 0v3h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a1 1 0 0 1 1-1zm2 0h8V7a4 4 0 0 0-8 0z"/>`),
  crown: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="m2 8 5 4 5-8 5 8 5-4-2 12H4z"/><path fill="currentColor" opacity=".55" d="M4 20h16v2H4z"/>`),
  trophy: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M6 3h12v2h3v3a5 5 0 0 1-5 4.6A6 6 0 0 1 13 15v3h3v3H8v-3h3v-3a6 6 0 0 1-3-2.4A5 5 0 0 1 3 8V5h3zm-1 4v1a3 3 0 0 0 1.5 2.6A11 11 0 0 1 6 7zm14 0h-1a11 11 0 0 1-.5 3.6A3 3 0 0 0 19 8z"/>`),
  speaker: () =>
    svg(
      '0 0 24 24',
      `<path fill="currentColor" d="M4 9v6h4l5 4V5L8 9z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>`
    ),
  turtle: () =>
    svg(
      '0 0 24 24',
      `<ellipse cx="11" cy="12" rx="7" ry="5" fill="currentColor"/><circle cx="19.5" cy="10.5" r="2.2" fill="currentColor"/><path fill="currentColor" d="M5 16l-2 3h3l1.5-2zM14 16.5 15 19h3l-1.8-3z"/>`
    ),
  book: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M5 3h6a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H5zm14 0h-5a1 1 0 0 0 0 2h3v13h-3.5c.3.3.5.7.5 1v2h5z" opacity=".95"/>`),
  shop: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M4 7h16l-1 4a4 4 0 0 1-3.4 2H8.4A4 4 0 0 1 5 11zm1 8h14v6H5zM8 7a4 4 0 0 1 8 0h-2a2 2 0 0 0-4 0z"/>`),
  chart: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z"/>`),
  face: () =>
    svg('0 0 24 24', `<circle cx="12" cy="12" r="9" fill="currentColor"/><circle cx="9" cy="10" r="1.5" fill="#f2efe3"/><circle cx="15" cy="10" r="1.5" fill="#f2efe3"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" stroke="#f2efe3" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
  close: () =>
    svg('0 0 24 24', `<path stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>`),
  video: () =>
    svg('0 0 24 24', `<rect x="2" y="6" width="13" height="12" rx="2.5" fill="currentColor"/><path fill="currentColor" d="m16 10 5-3.5v11L16 14z"/>`),
  mic: () =>
    svg('0 0 24 24', `<rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>`),
  micOff: () =>
    svg('0 0 24 24', `<rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" opacity=".5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8M4 3l16 18"/>`),
  phoneDown: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M12 9c-4.6 0-8.7 1.8-11.3 4.6a1.5 1.5 0 0 0 0 2.1l2.2 2.2a1.5 1.5 0 0 0 2.1 0l1.9-1.8a1.5 1.5 0 0 0 .4-1.4l-.4-1.7a13.3 13.3 0 0 1 10.2 0l-.4 1.7a1.5 1.5 0 0 0 .4 1.4l1.9 1.8a1.5 1.5 0 0 0 2.1 0l2.2-2.2a1.5 1.5 0 0 0 0-2.1C20.7 10.8 16.6 9 12 9z"/>`),
  speakerOff: () =>
    svg('0 0 24 24', `<path fill="currentColor" d="M4 9v6h4l5 4V5L8 9z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.5 21 14.5M21 9.5l-5 5"/>`),
};

