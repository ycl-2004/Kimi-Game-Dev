const paths: Record<string, string> = {
  cupcake: '<path d="M7 11h10l-1.4 8H8.4L7 11Z"/><path d="M8 11c-2.5-.4-3.1-4.5-.4-5.5C7.9 2.4 11 2.4 12 5c1-2.6 4.1-2.6 4.4.5 2.7 1 2.1 5.1-.4 5.5"/><path d="M10 14v3m4-3v3"/>',
  lighthouse: '<path d="m9 21 1-12h4l1 12M8 21h8M9 9h6l-1-4h-4L9 9Z"/><path d="M12 2v3M7 6 3 4m14 2 4-2M10 13h4m-4.5 4h5"/>',
  volcano: '<path d="m3 20 6-12h6l6 12H3Z"/><path d="m9 8 2 3 2-3M8 4c-2-2 2-3 0-5m5 5c-2-2 2-3 0-5m5 7c-2-2 2-3 0-5"/>',
  berry: '<path d="M8 9c-3 1-4 4-2 7 2 4 6 6 6 6s4-2 6-6c2-3 1-6-2-7H8Z"/><path d="M12 9c-1-3 1-5 4-6m-4 6C9 6 6 6 4 8c2 2 5 3 8 1Zm0 0c3-3 6-3 8-1-2 2-5 3-8 1Z"/><path d="M9 14h.01M15 14h.01M12 18h.01"/>',
  observatory: '<path d="M4 21h16M6 21v-7h12v7M5 14a7 7 0 0 1 14 0H5Z"/><path d="M12 7v7m-2-4 4-2"/><path d="m18 2 .7 1.8 1.8.7-1.8.7L18 7l-.7-1.8-1.8-.7 1.8-.7L18 2Z"/>',
  parcel: '<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4m-8 4v10M8 5l8 4v4"/>',
  fragile: '<path d="M7 5h9v5a4.5 4.5 0 0 1-9 0V5Zm9 1h2a2 2 0 0 1 0 4h-2M6 20h11M8 16h7l1 4H7l1-4Z"/><path d="M4 2 20 22"/>',
  express: '<path d="m5 8 8-4 7 4v9l-8 4-7-4V8Z"/><path d="m5 8 7 4 8-4m-8 4v9M5 11 2 9m3 6-3 1m18-5 2-2M9 3 7 1"/>',
  sound: '<path d="M5 10v4h4l5 4V6l-5 4H5Z"/><path d="M17 9c1.5 1.7 1.5 4.3 0 6m2-9c3 3.3 3 8.7 0 12"/>',
  muted: '<path d="M5 10v4h4l5 4V6l-5 4H5Z"/><path d="m17 10 5 5m0-5-5 5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  feather: '<path d="M20 4c-8-2-14 4-13 11 7 2 13-3 13-11Z"/><path d="M4 21 16 8m-6 7H6m7-4h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name: string, className = ''): string {
  const content = paths[name] ?? paths.parcel;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
}

export function owlPortrait(className = ''): string {
  return `<svg class="owl-portrait ${className}" viewBox="0 0 96 96" aria-hidden="true">
    <path d="M19 43C13 20 29 10 48 10s35 10 29 33c12 9 12 32-1 40-15 10-41 10-56 0C7 75 7 52 19 43Z" fill="#E8B88A" stroke="currentColor" stroke-width="3"/>
    <path d="m20 30-8-15 20 8m44 7 8-15-20 8" fill="#E8B88A" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M25 27c5-12 41-12 46 0l-4 7H29l-4-7Z" fill="#4A90E2" stroke="currentColor" stroke-width="3"/>
    <path d="M30 22c8-6 28-6 36 0l-3-13H34l-4 13Z" fill="#4A90E2" stroke="currentColor" stroke-width="3"/>
    <path d="M43 15h10v9H43z" fill="#FFF6E9" stroke="currentColor" stroke-width="2"/>
    <circle cx="33" cy="49" r="16" fill="#FFF6E9" stroke="currentColor" stroke-width="3"/>
    <circle cx="63" cy="49" r="16" fill="#FFF6E9" stroke="currentColor" stroke-width="3"/>
    <circle cx="35" cy="50" r="5" fill="currentColor"/><circle cx="61" cy="50" r="5" fill="currentColor"/>
    <circle cx="37" cy="48" r="1.5" fill="#FFF6E9"/><circle cx="63" cy="48" r="1.5" fill="#FFF6E9"/>
    <path d="m48 53-7 7 7 5 7-5-7-7Z" fill="#FFD166" stroke="currentColor" stroke-width="2.5"/>
    <path d="M31 72c10 8 24 8 34 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function logoMark(): string {
  return `<svg class="logo-mark" viewBox="0 0 92 76" aria-hidden="true">
    <path d="M12 28 46 9l34 19v35L46 75 12 59V28Z" fill="#FFF6E9" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="m12 28 34 21 34-21M46 49v26" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M21 21 2 12m15 23L0 31m71-10 19-9M75 35l17-4" fill="none" stroke="#FF6B4A" stroke-width="6" stroke-linecap="round"/>
    <path d="m35 16 23 14v12" fill="none" stroke="#FF6B4A" stroke-width="6" stroke-linejoin="round"/>
  </svg>`;
}
