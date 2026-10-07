/* The 25th Hour · show engine.
   You shouldn't need to edit this file: words, numbers, places and media all live in cues.js. */
(() => {
'use strict';

const SHOW = window.SHOW, WORLD = window.WORLD;
const W = 1920, H = 1080;
const IS_PRESENTER = location.hash === '#presenter';
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ── helpers ──────────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = {
  linear: t => t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outQuint: t => 1 - Math.pow(1 - t, 5),
};
const parseClock = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
const parseAt = s => { if (s == null) return 0; const [m, sec] = String(s).split(':').map(Number); return m * 60 + (sec || 0); };
const fmtClock = min => { const m = Math.max(0, Math.floor(min + 1e-6)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const fmtDur = sec => { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hex = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sayHTML = s => esc(s).replace(/\(([^)]+)\)/g, '<em>($1)</em>');
const RAD = Math.PI / 180;

/* ── the run sheet ────────────────────────────────────────────────────── */
const CUES = SHOW.cues.filter(c => c.type !== 'handoff' || String(SHOW.handoff || '').trim());
const BEATS = [];
CUES.forEach((c, i) => {
  if (!BEATS.length || BEATS[BEATS.length - 1].name !== c.beat) BEATS.push({ name: c.beat, first: i, n: BEATS.length + 1 });
  c._i = i;
  c._beat = BEATS.length;
  c._clock = parseClock(c.clock);
  c._at = parseAt(c.at);
});
const placeOf = c => (c.venue ? SHOW.venue : (c.lat != null ? { lat: c.lat, lon: c.lon } : null));
const placeName = c => (c.venue ? SHOW.venue.place : c.place) || c.beat;

// Where the talk should be versus where it is. Shared by the script strip and the presenter view.
function schedule(elapsed, i) {
  const cur = CUES[i], nx = CUES[i + 1];
  if (i < 0) return { state: '', label: 'Standby', text: 'Talk length 25:00' };
  if (!nx) return elapsed > 1500 ? { state: 'late', label: 'Over time', text: `${fmtDur(elapsed - 1500)} past 25:00` } : { state: 'ok', label: 'Last cue', text: `Finish at 25:00 · ${fmtDur(1500 - elapsed)} left` };
  const d = nx._at - elapsed;
  if (d >= 0) {
    const early = cur && elapsed < cur._at - 30;
    return { state: early ? 'early' : 'ok', label: early ? `${fmtDur(cur._at - elapsed)} ahead` : 'On time', text: `Next cue due at ${fmtDur(nx._at)} · in ${fmtDur(d)}` };
  }
  return { state: d < -20 ? 'late' : 'ok', label: d < -20 ? `${fmtDur(-d)} behind` : 'On time', text: `Next cue was due at ${fmtDur(nx._at)} · ${fmtDur(-d)} over` };
}

// What's missing for a cue, given a lookup of which media files were found.
function mediaNotes(cue, found) {
  const out = [];
  if (cue.image && !found(cue.image)) out.push(`Photo not added yet: ${cue.imageNote ? cue.imageNote + ' → ' : ''}${cue.image}. The zoomed map shows instead.`);
  if (cue.src && !found(cue.src)) {
    if (cue.type === 'film') out.push(`Film not added yet: ${cue.src}. ${cue.builtin ? 'The built-in version plays.' : 'A placeholder plays.'}`);
    else out.push(`Optional video not added: ${cue.src}.`);
  }
  return out;
}

if (IS_PRESENTER) {
  document.documentElement.classList.add('is-presenter');
  presenterMain();
  return;
}

/* ── state ────────────────────────────────────────────────────────────── */
const stage = $('#stage'), worldL = $('#world'), mapC = $('#map'), fxC = $('#fx');
const mapX = mapC.getContext('2d'), fxX = fxC.getContext('2d');
const mediaL = $('#media'), contentL = $('#content'), filmL = $('#film'), clockEl = $('#clock'), clockSub = $('#clockSub');
const standbyL = $('#standby'), blackoutL = $('#blackout'), notesL = $('#notes'), helpL = $('#help'), toastL = $('#toast');
const clockChars = [...clockEl.querySelectorAll('.ch')];

const PPD = W / 360;                              // pixels per degree at zoom 1
const WORLD_VIEW = { lon: 0, lat: 25, k: 1 };
const view = { ...WORLD_VIEW };
const mapState = { mode: 'live', rivers: 0, clockMin: 0 };
const clock = { t: 0, override: null, mode: 'corner', busy: false };
const INK_LIGHT = [242, 240, 234], INK_DARK = [21, 22, 27];
const PIN_NIGHT = [255, 195, 92], PIN_DAY = [222, 84, 24];
const look = { bg: [0, 0, 0], ink: INK_LIGHT.slice(), inkT: 0, inkTarget: 0, pin: PIN_NIGHT.slice(), override: [0, 0, 0] };
const pins = [];
const sparks = [];
const cityOn = new Float32Array(WORLD.cities.length).fill(1);
const LO_IDX = CUES.findIndex(c => c.builtin === 'lightsout');
const BUILTIN_DUR = { rewind: 53, nightshift: 105, lightsout: 60 };

let scale = 1, backing = 1, mapDirty = true;
let idx = -1, token = 0, startedAt = 0, film = null, filmGen = 0, skipArmedAt = 0;
let focus = null, sparkRate = 0, sparkAcc = 0;
let blackout = false, notesOn = false, helpOn = false, driftOn = SHOW.drift !== false;
let presenterWin = null, resetArmedAt = 0, digitBuf = '', digitTimer = 0;

/* ── stage fit ────────────────────────────────────────────────────────── */
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  scale = s;
  stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  backing = clamp(s * (window.devicePixelRatio || 1), 0.5, 2);
  for (const c of [mapC, fxC]) { c.width = Math.round(W * backing); c.height = Math.round(H * backing); }
  mapDirty = true;
}

/* ── land, sun and colour ─────────────────────────────────────────────── */
const LW = WORLD.w, LH = WORLD.h;
const landBits = (() => { const b = atob(WORLD.land), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; })();
const isLand = (i, j) => { const k = j * LW + i; return (landBits[k >> 3] >> (k & 7)) & 1; };
const LAT_MIN = -57, LAT_MAX = 83;
function buildRows(step) {
  const rows = [];
  for (let j = 0; j < LH; j += step) {
    const lat = 90 - (j + step / 2) * 0.5;
    if (lat < LAT_MIN || lat > LAT_MAX) continue;
    const lons = [];
    for (let i = 0; i < LW; i += step) {
      let n = 0;
      for (let y = 0; y < step; y++) for (let x = 0; x < step; x++) n += isLand(i + x, j + y);
      if (n * 2 >= step * step) lons.push(-180 + (i + step / 2) * 0.5);
    }
    if (lons.length) rows.push({ lat, s: Math.sin(lat * RAD), c: Math.cos(lat * RAD), lons: Float32Array.from(lons) });
  }
  return rows;
}
const FINE = buildRows(1), COARSE = buildRows(2);

// Solar declination for the talk date, and where the sun is overhead for a given show-clock time.
const DECL = (() => {
  const d = new Date((SHOW.talkDate || '2026-10-07') + 'T12:00:00Z');
  const n = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  return -23.44 * Math.cos((2 * Math.PI / 365) * (n + 10)) * RAD;
})();
const sunLonAt = min => -15 * (min / 60 - (SHOW.clockUtcOffset || 0) - 12);

// The light: the background follows the sun through the day.
const SUN = [
  [0, '#0B1630'], [3, '#0C1A36'], [4.5, '#17223F'], [5.5, '#343E58'], [6.4, '#6F7686'], [7.2, '#B4B8C0'],
  [8, '#E4E4DF'], [9, '#F4F3EE'], [12, '#F6F4ED'], [13, '#F4EEDD'], [14, '#F0E1BB'], [15.5, '#E8C47C'],
  [16.5, '#E0A658'], [17.3, '#D3853F'], [18, '#B9562A'], [18.7, '#7E3527'], [19.4, '#3A1D28'], [20.3, '#18111B'],
  [21.5, '#0B090E'], [23, '#050407'], [24, '#000000'],
].map(([h, c]) => [h, hex(c)]);
function sunAt(h) {
  if (h <= SUN[0][0]) return SUN[0][1];
  for (let n = 1; n < SUN.length; n++) if (h <= SUN[n][0]) { const [h0, c0] = SUN[n - 1], [h1, c1] = SUN[n]; return mixRGB(c0, c1, (h - h0) / (h1 - h0)); }
  return SUN[SUN.length - 1][1];
}
let cssKey = '', lastMapInk = -1;
function updateLook(dt) {
  const target = look.override || sunAt(clock.t / 60);
  look.bg = mixRGB(look.bg, target, 1 - Math.exp(-dt / 200));
  const L = lum(look.bg);
  if (look.inkTarget === 0 && L > 0.4) look.inkTarget = 1;
  else if (look.inkTarget === 1 && L < 0.3) look.inkTarget = 0;
  const step = dt / 450;
  look.inkT += clamp(look.inkTarget - look.inkT, -step, step);
  look.ink = mixRGB(INK_LIGHT, INK_DARK, look.inkT);
  look.pin = mixRGB(PIN_NIGHT, PIN_DAY, look.inkT);
  const key = look.bg.map(Math.round).join() + '|' + look.inkT.toFixed(3);
  if (key === cssKey) return;
  cssKey = key;
  const st = stage.style;
  st.setProperty('--bg', rgb(look.bg));
  st.setProperty('--ink', rgb(look.ink));
  st.setProperty('--ink-2', rgb(look.ink, 0.66));
  st.setProperty('--ink-3', rgb(look.ink, 0.34));
  st.setProperty('--pin', rgb(look.pin));
  st.background = rgb(look.bg);
  if (Math.abs(look.inkT - lastMapInk) > 0.01) { lastMapInk = look.inkT; mapDirty = true; }
}

/* ── the map ──────────────────────────────────────────────────────────── */
function setView(v) { view.lon = v.lon; view.lat = v.lat; view.k = v.k; mapDirty = true; }
const near = (a, b) => Math.abs(a.lon - b.lon) < 0.05 && Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.k - b.k) < 0.01;
const proj = (lon, lat, v = view) => [W / 2 + (lon - v.lon) * PPD * v.k, H / 2 + (v.lat - lat) * PPD * v.k];
// A close-up that puts the place at the right of the screen, leaving the left for the card.
function zoomView(lat, lon, k = 4) { const p = PPD * k; return { lon: lon - (1330 - W / 2) / p, lat: lat + (500 - H / 2) / p, k }; }

const SHADE_S = 0.25, shadeC = document.createElement('canvas');
shadeC.width = W * SHADE_S; shadeC.height = H * SHADE_S;
const shadeX = shadeC.getContext('2d');
const TWILIGHT = [0, -4, -8, -12].map(d => d * RAD);
// Screen points along the line where the sun sits at altitude h. Night is on the winter-pole side of it.
function terminator(h, ls, p) {
  const sd = Math.sin(DECL), cd = Math.cos(DECL), sh = Math.sin(h), pts = [];
  const northNight = DECL < 0, wrap = f => ((((f + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  for (let x = -60; x <= W + 60; x += 20) {
    const lon = view.lon + (x - W / 2) / p;
    const A = sd, B = cd * Math.cos(lon * RAD - ls), R = Math.hypot(A, B);
    let lat;
    if (sh >= R) lat = northNight ? -90 : 90;            // the whole meridian is darker than h
    else if (sh <= -R) lat = northNight ? 90 : -90;      // none of it is
    else {
      const al = Math.atan2(B, A), as = Math.asin(sh / R);
      const c = [wrap(as - al), wrap(Math.PI - as - al)].filter(f => f >= -Math.PI / 2 - 1e-9 && f <= Math.PI / 2 + 1e-9);
      lat = c.length ? (northNight ? Math.max(...c) : Math.min(...c)) / RAD : (northNight ? 90 : -90);
    }
    pts.push(x, H / 2 + (view.lat - lat) * p);
  }
  return pts;
}

function drawMap() {
  const ctx = mapX;
  ctx.setTransform(backing, 0, 0, backing, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const k = view.k, p = PPD * k;
  const lonL = view.lon - W / 2 / p - 1, lonR = view.lon + W / 2 / p + 1;
  const latT = view.lat + H / 2 / p + 1, latB = view.lat - H / 2 / p - 1;
  const zf = smooth(1.45, 2.6, k);
  const night = mapState.mode === 'night';
  const ls = sunLonAt(mapState.clockMin) * RAD, sd = Math.sin(DECL), cd = Math.cos(DECL);
  const dark = look.inkT, ink = look.ink;
  const aDay = lerp(0.52, 0.36, dark), aNight = lerp(0.2, 0.15, dark), aZoom = lerp(0.46, 0.32, dark);

  // the night side: soft twilight bands, drawn small and scaled up, fading out towards the poles
  if (!night && zf < 0.98) {
    const fa = 1 - zf, yAt = lat => H / 2 + (view.lat - lat) * p;
    const edge = DECL < 0 ? -60 : H + 60;
    const sx = shadeX;
    sx.setTransform(SHADE_S, 0, 0, SHADE_S, 0, 0); sx.clearRect(0, 0, W, H);
    sx.globalCompositeOperation = 'source-over';
    sx.fillStyle = `rgba(0,0,0,${(lerp(0.32, 0.06, dark) * fa) / TWILIGHT.length})`;
    for (const h of TWILIGHT) {
      const pts = terminator(h, ls, p);
      sx.beginPath(); sx.moveTo(-60, edge);
      for (let n = 0; n < pts.length; n += 2) sx.lineTo(pts[n], pts[n + 1]);
      sx.lineTo(W + 60, edge); sx.closePath(); sx.fill();
    }
    const fade = sx.createLinearGradient(0, yAt(84), 0, yAt(-62));
    const stop = lat => clamp((yAt(lat) - yAt(84)) / (yAt(-62) - yAt(84)), 0, 1);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(stop(62), 'rgba(0,0,0,1)');
    fade.addColorStop(stop(-42), 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    sx.globalCompositeOperation = 'destination-in'; sx.fillStyle = fade; sx.fillRect(0, 0, W, H);
    sx.globalCompositeOperation = 'source-over';
    ctx.drawImage(shadeC, 0, 0, W, H);
    // the day/night line itself
    const pts = terminator(0, ls, p), lg = ctx.createLinearGradient(0, yAt(80), 0, yAt(-58));
    lg.addColorStop(0, rgb(ink, 0)); lg.addColorStop(stop(60) * 0.9, rgb(ink, 0.18 * fa)); lg.addColorStop(0.85, rgb(ink, 0.18 * fa)); lg.addColorStop(1, rgb(ink, 0));
    ctx.beginPath();
    for (let n = 0; n < pts.length; n += 2) n ? ctx.lineTo(pts[n], pts[n + 1]) : ctx.moveTo(pts[n], pts[n + 1]);
    ctx.strokeStyle = lg; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // land as dots, bucketed by brightness so each bucket is one fill
  const NB = 10, AMAX = 0.6, paths = [];
  for (let b = 0; b < NB; b++) paths.push(new Path2D());
  const layer = (rows, spacing, fac) => {
    if (fac < 0.02) return;
    const r = Math.max(0.7, spacing * p * 0.24), round = r > 1.7;
    for (const row of rows) {
      if (row.lat > latT || row.lat < latB) continue;
      const y = H / 2 + (view.lat - row.lat) * p, lons = row.lons;
      for (let n = 0; n < lons.length; n++) {
        const lon = lons[n];
        if (lon < lonL || lon > lonR) continue;
        let a = aNight;
        if (!night) a = lerp(aNight, aDay, smooth(-0.1, 0.07, row.s * sd + row.c * cd * Math.cos(lon * RAD - ls)));
        a = lerp(a, aZoom, zf) * fac;
        const b = Math.min(NB - 1, Math.round((a / AMAX) * (NB - 1)));
        if (b <= 0) continue;
        const x = W / 2 + (lon - view.lon) * p, path = paths[b];
        if (round) { path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); } else path.rect(x - r, y - r, r * 2, r * 2);
      }
    }
  };
  layer(COARSE, 1, 1 - zf);
  layer(FINE, 0.5, zf);
  for (let b = 1; b < NB; b++) { ctx.fillStyle = rgb(ink, (b / (NB - 1)) * AMAX); ctx.fill(paths[b]); }

  // rivers glow faintly in Lights Out
  if (mapState.rivers > 0.01) {
    const ra = mapState.rivers, sk = Math.sqrt(k);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pts of Object.values(WORLD.rivers)) {
      const xy = pts.map(([lo, la]) => proj(lo, la));
      ctx.beginPath(); ctx.moveTo(xy[0][0], xy[0][1]);
      for (let n = 1; n < xy.length - 1; n++) ctx.quadraticCurveTo(xy[n][0], xy[n][1], (xy[n][0] + xy[n + 1][0]) / 2, (xy[n][1] + xy[n + 1][1]) / 2);
      ctx.lineTo(xy[xy.length - 1][0], xy[xy.length - 1][1]);
      ctx.strokeStyle = `rgba(80,170,255,${0.08 * ra})`; ctx.lineWidth = 20 * sk; ctx.stroke();
      ctx.strokeStyle = `rgba(110,195,255,${0.16 * ra})`; ctx.lineWidth = 7 * sk; ctx.stroke();
      ctx.strokeStyle = `rgba(160,220,255,${0.38 * ra})`; ctx.lineWidth = 1.6 * sk; ctx.stroke();
    }
    ctx.restore();
  }
}

function glowSprite(c, size = 64, core = 0.18) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, rgb(c, 1)); gr.addColorStop(core, rgb(c, 0.55)); gr.addColorStop(0.5, rgb(c, 0.14)); gr.addColorStop(1, rgb(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return cv;
}
const SPR_CITY = glowSprite([255, 206, 138]), SPR_PIN_N = glowSprite(PIN_NIGHT), SPR_PIN_D = glowSprite(PIN_DAY);
function pinGlow(ctx, x, y, R, a) {
  ctx.globalAlpha = a * (1 - look.inkT); ctx.drawImage(SPR_PIN_N, x - R, y - R, R * 2, R * 2);
  ctx.globalAlpha = a * look.inkT; ctx.drawImage(SPR_PIN_D, x - R, y - R, R * 2, R * 2);
  ctx.globalAlpha = 1;
}
const CITY_BAG = []; WORLD.cities.forEach((c, i) => { for (let n = 0; n < c[3] * c[3]; n++) CITY_BAG.push(i); });

function spawnSparks(dt, now) {
  if (sparkRate <= 0) { sparkAcc = 0; return; }
  sparkAcc += (sparkRate * dt) / 1000;
  while (sparkAcc >= 1) {
    sparkAcc -= 1;
    const c = WORLD.cities[CITY_BAG[(Math.random() * CITY_BAG.length) | 0]];
    sparks.push({ lat: c[1] + (Math.random() - 0.5) * 4, lon: c[2] + (Math.random() - 0.5) * 4, born: now, life: 900 + Math.random() * 1100, s: 0.6 + Math.random() * 0.7 });
  }
}

function drawFx(now) {
  const ctx = fxX;
  ctx.setTransform(backing, 0, 0, backing, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const k = view.k, p = PPD * k, zf = smooth(1.45, 2.6, k), sk = Math.sqrt(k);
  const P = (lon, lat) => [W / 2 + (lon - view.lon) * p, H / 2 + (view.lat - lat) * p];
  const night = mapState.mode === 'night';
  const ls = sunLonAt(clock.t) * RAD, sd = Math.sin(DECL), cd = Math.cos(DECL);

  // city lights, only on the night side
  const cityA = (1 - zf) * (1 - look.inkT * 0.9);
  if (cityA > 0.02) {
    const cs = WORLD.cities;
    for (let n = 0; n < cs.length; n++) {
      const on = cityOn[n];
      if (on < 0.01) continue;
      const la = cs[n][1], lo = cs[n][2];
      let nf = 1;
      if (!night) nf = 1 - smooth(-0.12, 0.04, Math.sin(la * RAD) * sd + Math.cos(la * RAD) * cd * Math.cos(lo * RAD - ls));
      const a = on * nf * cityA;
      if (a < 0.02) continue;
      const [x, y] = P(lo, la);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const r = (4 + cs[n][3] * 4) * sk;
      ctx.globalAlpha = a * 0.85; ctx.drawImage(SPR_CITY, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  // sparks: people asking, scrolling, making cartoons of their dogs
  for (let n = sparks.length - 1; n >= 0; n--) {
    const s = sparks[n], u = (now - s.born) / s.life;
    if (u >= 1) { sparks.splice(n, 1); continue; }
    const [x, y] = P(s.lon, s.lat);
    pinGlow(ctx, x, y, 12 * s.s * sk, Math.sin(Math.PI * u) * 0.9 * (1 - zf));
  }

  // pins: every story of the day stays on the map
  const pr = lerp(1, 1.7, zf);
  for (const pin of pins) {
    const [x, y] = P(pin.lon, pin.lat);
    if (x < -90 || x > W + 90 || y < -90 || y > H + 90) continue;
    const age = now - pin.born, small = pin.kind === 'small';
    const sc = ease.out(clamp(age / 450, 0, 1));
    pinGlow(ctx, x, y, (small ? 15 : 26) * pr * sc, 0.95);
    ctx.fillStyle = rgb(look.pin);
    ctx.beginPath(); ctx.arc(x, y, (small ? 2.6 : 4.4) * pr * sc, 0, Math.PI * 2); ctx.fill();
    if (!small) { ctx.fillStyle = rgb([255, 250, 238], 0.9 * (1 - look.inkT)); ctx.beginPath(); ctx.arc(x, y, 1.7 * pr * sc, 0, Math.PI * 2); ctx.fill(); }
    if (age < 1800) {
      const u = age / 1800;
      ctx.strokeStyle = rgb(look.pin, 0.85 * (1 - u)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, lerp(6, small ? 40 : 84, ease.out(u)) * pr, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // the current place: a slow pulse and its label
  if (focus && focus.dropped) {
    const [x, y] = P(focus.lon, focus.lat);
    if (!REDUCED) {
      const u = ((now - focus.dropped) % 2600) / 2600;
      ctx.strokeStyle = rgb(look.pin, 0.5 * (1 - u)); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, lerp(8, 46, ease.out(u)) * pr, 0, Math.PI * 2); ctx.stroke();
    }
    const la = clamp(1 - zf / 0.5, 0, 1) * focus.labelA;
    if (la > 0.01 && focus.label) {
      ctx.font = '500 22px "Azeret Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      const right = x > W - 520;
      ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgb(look.ink, 0.92 * la);
      ctx.fillText(focus.label, x + (right ? -26 : 26), y);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
  }
}

/* ── pins ─────────────────────────────────────────────────────────────── */
function pinsFor(cue) {
  const out = [], pl = placeOf(cue);
  if (pl) out.push({ lat: pl.lat, lon: pl.lon, kind: 'story' });
  for (const q of cue.pins || []) out.push({ lat: q[0], lon: q[1], kind: 'small' });
  return out;
}
// Make the map hold every pin from the cues before i (and cue i too, if `upto` includes it).
function syncPins(upto) {
  for (let n = pins.length - 1; n >= 0; n--) if (pins[n].cue > upto) pins.splice(n, 1);
  for (let j = 0; j <= upto; j++) {
    if (pins.some(q => q.cue === j)) continue;
    pinsFor(CUES[j]).forEach(q => pins.push({ ...q, cue: j, born: -1e9 }));
  }
}
function dropPins(cue) {
  if (pins.some(q => q.cue === cue._i)) return 0;
  const list = pinsFor(cue), now = performance.now();
  list.forEach((q, n) => {
    const delay = q.kind === 'small' ? 120 * n : 0;
    pins.push({ ...q, cue: cue._i, born: now + delay });
    setTimeout(() => Sound.blip(q.kind === 'small' ? 0.45 : 1), delay);
  });
  return list.length;
}

/* ── tweens ───────────────────────────────────────────────────────────── */
const tweens = new Set();
function tween(dur, fn, tok, easing = ease.inOut, raw = false) {
  return new Promise(res => {
    if (REDUCED && !raw) dur *= 0.5;
    if (dur <= 0) { fn(1); res(true); return; }
    tweens.add({ t0: performance.now(), dur, fn, tok, easing, res });
  });
}
function runTweens(now) {
  for (const tw of [...tweens]) {
    if (tw.tok != null && tw.tok !== token) { tweens.delete(tw); tw.res(false); continue; }
    const p = clamp((now - tw.t0) / tw.dur, 0, 1);
    try { tw.fn(tw.easing(p)); } catch (e) { console.error(e); }
    if (p >= 1) { tweens.delete(tw); tw.res(true); }
  }
}
const sleep = (ms, tok) => new Promise(res => setTimeout(() => res(tok === token), REDUCED ? ms * 0.5 : ms));
const allOk = (jobs, tok) => Promise.all(jobs).then(r => r.every(Boolean) && tok === token);
function timeline(durS, fn, tok) { let last = 0; return tween(durS * 1000, p => { const s = p * durS; fn(s, s - last); last = s; }, tok, ease.linear, true); }

function viewTo(t, dur, tok, anchor) {
  const a = { ...view };
  if (near(a, t)) { setView(t); return Promise.resolve(true); }
  const an = anchor || (t.k >= a.k ? t : a);
  const s0 = proj(an.lon, an.lat, a), s1 = proj(an.lon, an.lat, t);
  const la = Math.log(a.k), lb = Math.log(t.k);
  return tween(dur, e => {
    const k = Math.exp(lerp(la, lb, e)), p = PPD * k;
    view.k = k;
    view.lon = an.lon - (lerp(s0[0], s1[0], e) - W / 2) / p;
    view.lat = an.lat + (lerp(s0[1], s1[1], e) - H / 2) / p;
    mapDirty = true;
  }, tok);
}

/* ── the clock ────────────────────────────────────────────────────────── */
let clockW = 1100, clockH = 400, clockText = '';
const CORNER = { x: 92, y: 40, s: 0.5 };
function measureClock() { clockW = clockEl.offsetWidth || clockW; clockH = clockEl.offsetHeight || clockH; }
function clockXform(mode) {
  return mode === 'hero'
    ? `translate(${Math.round((W - clockW) / 2)}px, ${Math.round((H - clockH) / 2 - 60)}px) scale(1)`
    : `translate(${CORNER.x}px, ${CORNER.y}px) scale(${CORNER.s})`;
}
function setClockMode(mode, instant) {
  clock.mode = mode;
  if (instant) { clockEl.style.transition = 'none'; clockEl.style.transform = clockXform(mode); void clockEl.offsetWidth; clockEl.style.transition = ''; }
  else clockEl.style.transform = clockXform(mode);
}
const showClock = on => clockEl.classList.toggle('hidden', !on);
function setClockText(s) {
  if (s === clockText) return;
  clockText = s;
  for (let n = 0; n < 5; n++) { const ch = s[n] || ''; if (clockChars[n].textContent !== ch) clockChars[n].textContent = ch; }
}
function flipChar(n) { const c = clockChars[n]; c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip'); }
function showSub(text, cls = '') { clockSub.className = cls; clockSub.textContent = text; void clockSub.offsetWidth; clockSub.classList.add('in'); }
const hideSub = () => clockSub.classList.remove('in');

// Roll the clock forward to a time, with a soft tick every ten minutes and a firmer one on landing.
function clockRoll(to, tok) {
  const from = clock.t, hours = (to - from) / 60;
  const dur = clamp(1100 + hours * 380, 900, 3200);
  let ten = Math.floor(from / 10);
  const lastTen = Math.floor(to / 10);
  clock.busy = true;
  return tween(dur, e => {
    clock.t = lerp(from, to, e);
    const t = Math.floor(clock.t / 10);
    if (t !== ten) { ten = t; if (t !== lastTen) Sound.tick(clock.t % 60 < 10 ? 0.7 : 0.3); }
  }, tok).then(ok => { clock.busy = false; if (ok) Sound.tick(1); return ok; });
}

/* ── sound (all synthesised, nothing to load) ─────────────────────────── */
const Sound = (() => {
  let ctx = null, master = null, noise = null, muted = false;
  const live = new Set();
  const vol = () => (muted ? 0 : 0.9 * (SHOW.volume ?? 0.8));
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = vol(); master.connect(ctx.destination);
      const len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  const ready = () => ctx && ctx.state === 'running' && !muted;
  function env(param, t, peak, attack, decay) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tick(level = 1) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3400; bp.Q.value = 1.6;
    const g = ctx.createGain(); env(g.gain, t, 0.5 * level, 0.001, 0.035);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + 0.06);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(1150, t + 0.03);
    const og = ctx.createGain(); env(og.gain, t, 0.13 * level, 0.001, 0.045);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.07);
  }
  function bigTick() {
    if (!ready()) return;
    tick(1.5);
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.5);
    const g = ctx.createGain(); env(g.gain, t, 0.45, 0.004, 0.6);
    const dl = ctx.createDelay(); dl.delayTime.value = 0.31;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(g); g.connect(master); g.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    o.start(t); o.stop(t + 0.8);
  }
  function blip(level = 1) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(990, t + 0.09);
    const g = ctx.createGain(); env(g.gain, t, 0.06 * level, 0.01, 0.22);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
  }
  function lamp() {
    if (!ready()) return;
    tick(0.8);
    const t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); env(g.gain, t, 0.35, 0.002, 0.08);
    src.connect(lp); lp.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + 0.12);
  }
  function whoosh(dur = 1) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(5200, t + dur * 0.8);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
  }
  // Tape rewind: filtered noise plus a fluttering motor whine, both following the speed.
  function whir() {
    if (!ready()) return null;
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.value = 500;
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 80;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const sg = ctx.createGain(); sg.gain.value = 0.05;
    const fl = ctx.createOscillator(); fl.frequency.value = 9; const fg = ctx.createGain(); fg.gain.value = 5;
    const g = ctx.createGain(); g.gain.value = 0;
    fl.connect(fg); fg.connect(saw.frequency);
    src.connect(bp); bp.connect(g); saw.connect(lp); lp.connect(sg); sg.connect(g); g.connect(master);
    src.start(); saw.start(); fl.start();
    const h = {
      set(s) { const n = ctx.currentTime; g.gain.setTargetAtTime(0.03 + 0.2 * s, n, 0.08); bp.frequency.setTargetAtTime(380 + 2800 * s, n, 0.08); saw.frequency.setTargetAtTime(55 + 320 * s, n, 0.08); },
      stop(fade = 0.6) {
        if (!live.has(h)) return; live.delete(h);
        const n = ctx.currentTime;
        saw.frequency.setTargetAtTime(30, n, fade / 3); bp.frequency.setTargetAtTime(150, n, fade / 3); g.gain.setTargetAtTime(0, n, fade / 3);
        setTimeout(() => { try { src.stop(); saw.stop(); fl.stop(); } catch (e) { /* already stopped */ } }, fade * 1000 + 400);
      },
    };
    live.add(h);
    return h;
  }
  // A low, quiet pad for Lights Out.
  function pad() {
    if (!ready()) return null;
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const os = [110, 164.81, 220.6, 277.18].map((f, n) => { const o = ctx.createOscillator(); o.type = n ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (n - 1.5) * 4; o.connect(lp); o.start(); return o; });
    lp.connect(g); g.connect(master);
    const h = {
      stop(fade = 2) {
        if (!live.has(h)) return; live.delete(h);
        const n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, fade / 4);
        setTimeout(() => os.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } }), fade * 1000 + 600);
      },
    };
    live.add(h);
    return h;
  }
  return {
    init, tick, bigTick, blip, lamp, whoosh, whir, pad,
    stopAll() { [...live].forEach(h => h.stop(0.3)); },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(vol(), ctx.currentTime, 0.05); },
    get muted() { return muted; },
  };
})();

/* ── media files: find out what's there ───────────────────────────────── */
const media = {};
const mediaOK = p => !!(p && media[p] && media[p].ok);
function probeImage(p) {
  if (media[p]) return media[p].p;
  const m = media[p] = { ok: null };
  m.p = new Promise(res => { const img = new Image(); img.onload = () => { m.ok = true; res(); }; img.onerror = () => { m.ok = false; res(); }; img.src = p; });
  return m.p;
}
function probeVideo(p) {
  if (media[p]) return media[p].p;
  const m = media[p] = { ok: null };
  m.p = new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.playsInline = true;
    const done = ok => { if (m.ok !== null) return; m.ok = ok; if (ok) { m.el = v; m.duration = v.duration; } res(); };
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    setTimeout(() => done(false), 5000);
    v.src = p;
  });
  return m.p;
}
function probeAll() {
  const jobs = [];
  for (const c of CUES) { if (c.image) jobs.push(probeImage(c.image)); if (c.src) jobs.push(probeVideo(c.src)); }
  return Promise.all(jobs);
}
function mediaCount() {
  const all = Object.keys(media);
  return { found: all.filter(p => media[p].ok).length, total: all.length };
}

/* ── content: cards, numbers, slides ──────────────────────────────────── */
const kickerHTML = c => `<div class="kicker"><span>${esc(c.clock)}</span><i></i><span>${esc(placeName(c))}</span></div>`;
const numSize = (s, max, width) => Math.min(max, Math.floor(width / (Math.max(1, String(s).length) * 0.62)));

function statHTML(c) {
  const v = +c.value || 0, comp = [].concat(c.compare ?? []).map(Number);
  const ghosts = comp.map(x => `<div class="ghost" style="left:${x}%"><span>${x}%</span></div>`).join('');
  const gap = comp.length === 1 && comp[0] > v ? `<div class="gap" style="left:${v}%;width:${comp[0] - v}%"><span>The gap</span></div>` : '';
  return `<div class="stat reveal">${kickerHTML(c)}<div class="num" data-count>${esc(c.number)}</div><p class="line">${esc(c.line)}</p></div>
    <div class="scale"><div class="track"></div>${gap}${ghosts}<div class="fill" style="--w:${v}%"></div><span class="tick">0</span><span class="tick end">100%</span></div>`;
}
function ladderHTML(c) {
  const R = [['Chat', 'The Answerer'], ['Tools', 'The Fixer'], ['Workflows', 'The Routine'], ['Agents', 'The Operator'], ['Teams of agents', 'The Crew']];
  const rungs = R.map((r, i) => `<div class="rung r${i} ${i < 2 ? 'live' : 'climb'}" style="left:${120 + i * 344}px;height:${170 + i * 115}px"><span class="rname">${r[0]}</span><span class="rtag">${r[1]}</span></div>`).join('');
  return `<div class="ladder reveal${c.step === 2 ? ' two' : ''}">${kickerHTML(c)}
    <p class="lline">Stop giving it instructions. Start giving it goals.</p>
    <div class="rungs">${rungs}</div>
    <div class="brace b1" style="left:120px;width:${344 + 320}px"><span>Where we all live</span></div>
    <div class="brace b2" style="left:${120 + 2 * 344}px;width:${2 * 344 + 320}px"><span>Where the world is climbing</span></div></div>`;
}
function contentHTML(c) {
  switch (c.type) {
    case 'card': case 'live':
      return `<div class="card reveal">${kickerHTML(c)}<div class="num" style="font-size:${numSize(c.number, 200, 1560)}px">${esc(c.number)}</div>${c.line ? `<p class="line">${esc(c.line)}</p>` : ''}</div>`;
    case 'map': return `<div class="mapcap reveal">${kickerHTML(c)}</div>`;
    case 'number': return `<div class="bignum reveal">${kickerHTML(c)}<div class="num" data-count style="font-size:${numSize(c.number, 196, 1640)}px">${esc(c.number)}</div><p class="line">${esc(c.line)}</p></div>`;
    case 'stat': return statHTML(c);
    case 'ladder': return ladderHTML(c);
    default: return '';
  }
}
function countUp(e, tok, dur = 1600) {
  const target = e.textContent, m = target.match(/[\d,]+/);
  if (!m) return;
  const n = parseInt(m[0].replace(/,/g, ''), 10), commas = m[0].includes(',');
  const pre = target.slice(0, m.index), post = target.slice(m.index + m[0].length);
  const fmt = v => pre + (commas ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v))) + post;
  e.textContent = fmt(0);
  tween(dur, p => { e.textContent = fmt(n * p); }, tok, ease.outQuint).then(ok => { if (!ok) e.textContent = target; });
}
function showContent(c, anim, tok) {
  const html = contentHTML(c);
  if (!html) return;
  const item = el('div', 'content-item', html);
  contentL.appendChild(item);
  const parts = item.querySelectorAll('.reveal, .scale');
  if (anim) {
    requestAnimationFrame(() => requestAnimationFrame(() => parts.forEach(r => r.classList.add('in'))));
    item.querySelectorAll('[data-count]').forEach(e => countUp(e, tok));
  } else parts.forEach(r => r.classList.add('in', 'instant'));
}
function clearContent(instant) {
  for (const c of [...contentL.children]) {
    if (instant) { c.remove(); continue; }
    c.classList.add('out'); setTimeout(() => c.remove(), 400);
  }
}
function showMedia(c, anim) {
  let node = null;
  if (c.image && mediaOK(c.image)) { node = new Image(); node.src = c.image; node.alt = ''; }
  else if (c.type === 'live' && c.src && mediaOK(c.src)) {
    node = document.createElement('video');
    node.src = c.src; node.muted = c.muted !== false; node.loop = c.loop !== false; node.playsInline = true;
    node.play().catch(() => {});
  }
  if (!node) return;
  const item = el('div', 'media-item');
  item.appendChild(node); mediaL.appendChild(item);
  if (anim) requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('in'))); else item.classList.add('in');
}
function hideMedia(instant) {
  for (const m of [...mediaL.children]) {
    const v = m.querySelector('video'); if (v) v.pause();
    if (instant) m.remove(); else { m.classList.remove('in'); setTimeout(() => m.remove(), 1000); }
  }
}
function setWorld(a, instant, slow) {
  worldL.classList.toggle('slow', !!slow);
  if (instant) { worldL.style.transition = 'none'; worldL.style.opacity = a; void worldL.offsetWidth; worldL.style.transition = ''; }
  else worldL.style.opacity = a;
}
const worldAlpha = c => ({ card: c.zoom === false ? 0.85 : 1, live: 1, map: 1, number: 0.62, stat: 0.18, ladder: 0.12, hero: c.mapFinal ? 1 : 0.55 }[c.type] ?? 1);

// After Lights Out the cities stay dark and the map stays in night mode.
function setNightState(i, anim, tok) {
  const after = LO_IDX >= 0 && i > LO_IDX;
  mapState.mode = after || (LO_IDX >= 0 && i === LO_IDX) ? 'night' : 'live';
  mapDirty = true;
  const cityT = after ? 0 : 1, riverT = after ? 0.22 : 0;
  if (!anim) { cityOn.fill(cityT); mapState.rivers = riverT; return; }
  const c0 = Float32Array.from(cityOn), r0 = mapState.rivers;
  tween(1500, e => { for (let n = 0; n < cityOn.length; n++) cityOn[n] = lerp(c0[n], cityT, e); mapState.rivers = lerp(r0, riverT, e); mapDirty = true; }, tok);
}

/* ── moving between cues ──────────────────────────────────────────────── */
function go(i, anim) {
  i = clamp(i, -1, CUES.length - 1);
  const tok = ++token;
  idx = i;
  stopFilm(); Sound.stopAll();
  sparkRate = 0; skipArmedAt = 0;
  clock.override = null; clock.busy = false;
  clockEl.classList.remove('brand');
  saveState();
  if (i < 0) enterStandby();
  else {
    if (!startedAt) { startedAt = Date.now(); keepAwake(); }
    standbyL.classList.add('gone');
    const cue = CUES[i];
    if (anim) syncPins(i - 1); else applyStatic(i);
    enter(cue, tok, anim).catch(e => console.error(e));
    preload(i + 1);
  }
  renderNotes(); markHelp(); sendState();
}
const next = () => {
  if (helpOn) { toggleHelp(false); return; }
  if (film && CUES[idx] && CUES[idx].type === 'film') {
    const now = performance.now();
    if (now - skipArmedAt < 2500) { skipFilm(); return; }
    skipArmedAt = now;
    if (!presenterLive()) toast('Film playing · press again to skip it');
    sendState();
    return;
  }
  if (idx >= CUES.length - 1) { if (!presenterLive()) toast('That’s the end of the show'); return; }
  go(idx + 1, true);
};
const prev = () => { if (helpOn) { toggleHelp(false); return; } if (idx >= 0) go(idx - 1, false); };
const jumpTo = i => go(i, false);

// Everything that defines a cue's look, set instantly (used for Back and jumps).
function applyStatic(i) {
  const cue = CUES[i];
  syncPins(i);
  setNightState(i, false);
  clock.t = cue._clock;
  look.override = null;
  clearContent(true); hideMedia(true); hideSub();
  const pl = placeOf(cue), zoom = pl && (cue.type === 'card' || cue.type === 'live') && cue.zoom !== false;
  setView(zoom ? zoomView(pl.lat, pl.lon, typeof cue.zoom === 'number' ? cue.zoom : 4) : WORLD_VIEW);
  setWorld(cue.type === 'film' ? 0.92 : worldAlpha(cue), true);
  setClockMode(cue.type === 'hero' || cue.type === 'rollover' || cue.type === 'handoff' ? 'hero' : 'corner', true);
  showClock(cue.type !== 'film');
  focus = pl ? { lat: pl.lat, lon: pl.lon, label: `${cue.clock} · ${placeName(cue)}`.toUpperCase(), labelA: 1, dropped: performance.now() } : null;
}

async function enter(cue, tok, anim) {
  const T = cue.type;
  if (T === 'film') return playFilm(cue, tok);
  if (T === 'rollover') return enterRollover(cue, tok, anim);
  if (T === 'handoff') return enterHandoff(cue, tok);
  if (anim && T === 'ladder' && cue.step === 2) {
    const lad = contentL.querySelector('.content-item:not(.out) .ladder');
    if (lad) { lad.classList.add('two'); Sound.blip(0.7); return; }
  }
  clearContent(!anim); hideMedia(!anim);
  look.override = null;
  if (anim) setNightState(cue._i, true, tok);
  showClock(true); clockEl.classList.add('running');
  if (T === 'hero') return enterHero(cue, tok, anim);

  setClockMode('corner', !anim); hideSub();
  const pl = placeOf(cue);
  const zoom = pl && (T === 'card' || T === 'live') && cue.zoom !== false;
  const target = zoom ? zoomView(pl.lat, pl.lon, typeof cue.zoom === 'number' ? cue.zoom : 4) : WORLD_VIEW;
  setWorld(worldAlpha(cue), !anim);

  if (anim) {
    const prevFocus = focus;
    focus = pl ? { lat: pl.lat, lon: pl.lon, label: `${cue.clock} · ${placeName(cue)}`.toUpperCase(), labelA: 0, dropped: 0 } : null;
    const jobs = [];
    if (!near(view, target) && view.k > 1.05) jobs.push(viewTo(WORLD_VIEW, 1000, tok, prevFocus || { lon: view.lon, lat: view.lat }));
    else if (!zoom && !near(view, WORLD_VIEW)) jobs.push(viewTo(WORLD_VIEW, 1000, tok));
    const tc = Math.max(cue._clock, clock.t);
    if (tc > clock.t + 0.5) jobs.push(clockRoll(tc, tok)); else clock.t = tc;
    if (!(await allOk(jobs, tok))) return;
    if (dropPins(cue)) {
      if (focus) { focus.labelA = 1; focus.dropped = performance.now(); }
      if (!(await sleep(zoom ? 850 : 450, tok))) return;
    } else if (focus && !focus.dropped) { focus.labelA = 1; focus.dropped = performance.now(); }
    if (zoom && !near(view, target)) { if (!(await viewTo(target, 1350, tok, pl))) return; }
  }
  showContent(cue, anim, tok);
  showMedia(cue, anim);
  sparkRate = T === 'number' ? 20 : cue.sparks ? (T === 'card' ? 14 : 9) : 0;
}

function enterHero(cue, tok, anim) {
  setClockMode('hero', !anim);
  clockEl.classList.toggle('running', cue._clock < 1440);
  clock.t = cue._clock;
  focus = null;
  setWorld(worldAlpha(cue), !anim, !!cue.mapFinal);
  if (anim) viewTo(WORLD_VIEW, 1800, tok); else setView(WORLD_VIEW);
  if (cue.sub) showSub(cue.sub === 'today' ? SHOW.dateLine : cue.sub); else hideSub();
}

async function enterRollover(cue, tok, anim) {
  clearContent(!anim); hideMedia(!anim); hideSub();
  focus = null;
  showClock(true); setClockMode('hero', !anim);
  clockEl.classList.remove('running');
  setNightState(cue._i, false);
  if (!anim) {
    clock.t = 1500; clock.override = '25:00';
    clockEl.classList.add('brand'); setWorld(0, true); look.override = [0, 0, 0];
    return;
  }
  clock.t = 1440; clock.override = '24:00';
  if (!(await sleep(1600, tok))) return;
  Sound.bigTick();
  clock.override = '25:00'; clock.t = 1500; flipChar(1);
  clockEl.classList.add('brand');
  setWorld(0, false, true);
  look.override = [0, 0, 0];
}
async function enterHandoff(cue, tok) {
  await enterRollover(cue, tok, false);
  showSub(SHOW.handoff, 'say');
}

function enterStandby() {
  clearContent(true); hideMedia(true); hideSub(); showClock(false);
  setWorld(0, true);
  look.override = [0, 0, 0];
  pins.length = 0; sparks.length = 0; focus = null;
  setNightState(0, false);
  clock.t = 0; setView(WORLD_VIEW); setClockMode('corner', true);
  standbyL.classList.remove('gone');
}

/* ── films ────────────────────────────────────────────────────────────── */
function preload(i) {
  const c = CUES[i];
  if (c && c.src && media[c.src] && media[c.src].el) media[c.src].el.preload = 'auto';
}
async function playFilm(cue, tok) {
  clearContent(false); hideMedia(false); hideSub();
  sparkRate = 0;
  const gen = ++filmGen;
  const m = cue.src ? media[cue.src] : null;
  if (m && m.ok === null) await Promise.race([m.p, new Promise(r => setTimeout(r, 1200))]);
  if (tok !== token || gen !== filmGen) return;
  film = { cue, t0: performance.now(), duration: 0, kind: '' };
  filmL.innerHTML = '';
  if (m && m.ok) {
    const v = m.el;
    film.kind = 'video'; film.video = v; film.duration = v.duration || cue.duration || 0;
    v.preload = 'auto'; v.loop = false; v.muted = false; v.controls = false;
    try { v.currentTime = 0; } catch (e) { /* not seekable yet */ }
    filmL.appendChild(v); filmL.className = 'layer on video';
    showClock(false);
    v.onended = () => filmFinished(cue, tok);
    try { await v.play(); }
    catch (e) { v.muted = true; v.play().catch(() => {}); toast('The browser blocked sound: click the page once, then go back and forward'); }
    sendState();
    return;
  }
  film.kind = cue.builtin || 'placeholder';
  film.duration = cue.builtin ? BUILTIN_DUR[cue.builtin] : cue.duration || 30;
  filmL.className = 'layer on';
  sendState();
  let ok = false;
  try {
    if (cue.builtin === 'rewind') ok = await filmRewind(tok);
    else if (cue.builtin === 'nightshift') ok = await filmNightShift(tok);
    else if (cue.builtin === 'lightsout') ok = await filmLightsOut(tok);
    else ok = await filmPlaceholder(cue, tok);
  } catch (e) { console.error(e); }
  if (ok) filmFinished(cue, tok);
}
function stopFilm() {
  if (film && film.video) { film.video.pause(); film.video.onended = null; }
  film = null;
  if (filmL.classList.contains('on')) {
    filmL.className = 'layer';
    const g = filmGen;
    setTimeout(() => { if (g === filmGen && !film) filmL.innerHTML = ''; }, 800);
  } else filmL.innerHTML = '';
}
function skipFilm() {
  if (!film) return;
  const cue = film.cue, tok = ++token;
  Sound.stopAll();
  filmFinished(cue, tok);
}
// When a film ends: go straight on if the next cue follows on its own, otherwise rest on the clock and the map.
function filmFinished(cue, tok) {
  if (tok !== token) return;
  const nx = CUES[cue._i + 1];
  if (nx && nx.auto) { go(cue._i + 1, true); return; }
  stopFilm();
  look.override = null; clock.override = null;
  clock.t = Math.max(clock.t, cue._clock);
  showClock(true); setClockMode('corner'); clockEl.classList.add('running');
  setWorld(0.92);
  viewTo(WORLD_VIEW, 1200, tok, focus || undefined);
  renderNotes(); sendState();
}

const MON = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortDate = ms => { const d = new Date(ms); return `${MON[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`; };
const longDate = ms => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const onceSet = () => { const s = new Set(); return (k, f) => { if (!s.has(k)) { s.add(k); f(); } }; };
const spinClock = days => fmtClock((((-days * 1440) % 1440) + 1440) % 1440);

/* Film 1 · Rewind: four years back to an empty chat box, then forward to 00:00 today. */
async function filmRewind(tok) {
  const R = SHOW.rewind || {}, DAY = 864e5;
  const today = Date.parse((SHOW.talkDate || '2026-10-07') + 'T00:00:00Z');
  const launch = Date.parse((R.launch || '2022-11-30') + 'T00:00:00Z');
  const total = Math.round((today - launch) / DAY);
  const hl = (R.headlines || [])
    .map(h => ({ ...h, days: (today - Date.parse(h.date + 'T00:00:00Z')) / DAY }))
    .filter(h => h.days > 0 && h.days < total)
    .sort((a, b) => a.days - b.days);

  look.override = [4, 5, 9];
  setWorld(0, true);
  setClockMode('hero', true); showClock(true); clockEl.classList.remove('running');
  clock.override = '00:00';
  showSub(shortDate(today));
  filmL.innerHTML = '<div class="rw"><div class="rw-heads"></div><div class="rw-chat"><div class="rw-box"><span class="rw-caret"></span><span class="rw-ph">Message</span></div><div class="rw-date"></div></div></div>';
  const headsEl = filmL.querySelector('.rw-heads'), chat = filmL.querySelector('.rw-chat');
  chat.querySelector('.rw-date').textContent = longDate(launch);
  const SLOTS = [[150, 110], [1010, 806], [1030, 130], [150, 820], [590, 96], [1060, 820], [140, 150], [1000, 120], [180, 806], [1020, 830]];
  const heads = hl.map((h, n) => {
    const e = el('div', 'rw-head', `<span class="rw-tag">${esc(h.tag)}</span><span class="rw-text">${esc(h.text)}</span>`);
    const [x, y] = SLOTS[n % SLOTS.length];
    e.style.left = x + 'px'; e.style.top = y + 'px';
    e._dx = x < 700 ? -90 : x > 900 ? 90 : 0;
    headsEl.appendChild(e);
    return e;
  });
  // days-ago as a function of film time: headlines get even screen time, the last stretch slows down
  const A = 4.2, B = 37, STOP = 41.5;
  const kf = [[0, 0], [1.4, 0]];
  hl.forEach((h, m) => kf.push([hl.length > 1 ? A + ((B - A) * m) / (hl.length - 1) : A, h.days]));
  kf.push([STOP, total]);
  const daysAt = s => {
    if (s <= kf[1][0]) return 0;
    for (let m = 2; m < kf.length; m++) if (s <= kf[m][0]) {
      const [s0, d0] = kf[m - 1], [s1, d1] = kf[m];
      let u = (s - s0) / (s1 - s0);
      if (m === 2) u = ease.in(u) * 0.6 + u * 0.4;
      if (m === kf.length - 1) u = ease.out(u);
      return lerp(d0, d1, u);
    }
    return total;
  };
  const peaks = hl.map((h, m) => kf[m + 2][0]);
  const whir = Sound.whir(), once = onceSet();
  let prevD = 0;
  const ok = await timeline(53, (s, dt) => {
    if (s < STOP) {
      const d = daysAt(s);
      if (whir && dt > 0) whir.set(clamp((d - prevD) / dt / 150, 0, 1));
      prevD = d;
      clock.override = spinClock(d);
      clockSub.textContent = shortDate(today - d * DAY);
      heads.forEach((e, m) => {
        const u = (s - (peaks[m] - 1.9)) / 3.6;
        if (u <= 0 || u >= 1) { if (e.style.opacity !== '0') e.style.opacity = 0; return; }
        e.style.opacity = Math.pow(Math.sin(Math.PI * u), 0.7);
        e.style.transform = `translateX(${(1 - u) * e._dx}px) scale(${lerp(1.16, 0.86, u)})`;
        e.style.filter = `blur(${(Math.abs(u - 0.5) * 7).toFixed(1)}px)`;
      });
      return;
    }
    once('stop', () => { if (whir) whir.stop(1.4); clock.override = '00:00'; clockSub.textContent = shortDate(launch); heads.forEach(e => { e.style.opacity = 0; }); });
    if (s > 43) once('chat', () => { showClock(false); hideSub(); chat.classList.add('in'); });
    if (s > 48.6) once('ff', () => { chat.classList.add('fast'); chat.classList.remove('in'); Sound.whoosh(2); showClock(true); clockSub.classList.add('in'); });
    if (s > 48.9 && s < 51.3) { const d = total * (1 - ease.inOut((s - 48.9) / 2.4)); clock.override = spinClock(d); clockSub.textContent = shortDate(today - d * DAY); }
    if (s >= 51.3) once('land', () => { clock.override = '00:00'; clockSub.textContent = shortDate(today); Sound.tick(1.3); });
  }, tok);
  if (whir) whir.stop(0.3);
  return ok;
}

/* Film 2 · The Night Shift: an animatic until the real film lands. */
function nightShiftSVG() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let sky = '';
  for (let x = 116; x < 1810;) {
    const w = 50 + rnd() * 110, h = 70 + rnd() * 230;
    sky += `<rect x="${x | 0}" y="${(610 - h) | 0}" width="${w | 0}" height="${h | 0}" fill="#0A0F1F"/>`;
    for (let wy = 610 - h + 14; wy < 598; wy += 22) for (let wx = x + 10; wx < x + w - 10; wx += 18) if (rnd() < 0.16) sky += `<rect x="${wx | 0}" y="${wy | 0}" width="6" height="9" fill="#F5D38E" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
    x += w + 6;
  }
  const mull = Array.from({ length: 8 }, (_, n) => `<rect x="${106 + n * 240}" y="70" width="20" height="540" fill="#05070E"/>`).join('');
  const desks = [330, 645, 960, 1275, 1590].map((cx, i) => `
    <g class="ns-desk" data-i="${i}">
      <polygon class="ns-cone" points="${cx + 50},622 ${cx + 98},628 ${cx + 175},762 ${cx - 125},762" fill="url(#nsCone)"/>
      <ellipse class="ns-cone" cx="${cx + 20}" cy="764" rx="160" ry="9" fill="#FFD58A" fill-opacity=".35"/>
      <rect x="${cx - 140}" y="760" width="280" height="12" rx="2" fill="#1C2233"/>
      <rect x="${cx - 128}" y="772" width="8" height="80" fill="#151A28"/><rect x="${cx + 120}" y="772" width="8" height="80" fill="#151A28"/>
      <rect x="${cx - 100}" y="638" width="172" height="108" rx="8" fill="#141A2A"/>
      <rect class="ns-screen" x="${cx - 94}" y="644" width="160" height="96" rx="5"/>
      <rect x="${cx - 20}" y="746" width="12" height="14" fill="#141A2A"/>
      <text class="ns-mon" x="${cx - 82}" y="682"></text>
      <path d="M${cx + 112} 754 L${cx + 128} 668 L${cx + 84} 610" stroke="#2A3148" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="${cx + 96}" y="752" width="34" height="8" rx="3" fill="#2A3148"/>
      <polygon points="${cx + 46},622 ${cx + 62},594 ${cx + 102},602 ${cx + 98},628" fill="#2A3148"/>
      <circle class="ns-bulb" cx="${cx + 73}" cy="624" r="7"/>
    </g>`).join('');
  return `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="nsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1430"/><stop offset="1" stop-color="#16203F"/></linearGradient>
      <linearGradient id="nsDawnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FB5D8"/><stop offset=".65" stop-color="#F2C98F"/><stop offset="1" stop-color="#F7B27A"/></linearGradient>
      <clipPath id="nsWin"><rect x="106" y="70" width="1700" height="540"/></clipPath>
      <radialGradient id="nsCone" cx=".62" cy="0" r="1.15"><stop offset="0" stop-color="#FFD58A" stop-opacity=".55"/><stop offset=".7" stop-color="#FFD58A" stop-opacity=".08"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="#05070E"/>
    <rect x="106" y="70" width="1700" height="540" fill="url(#nsSky)"/>
    <rect class="ns-dawn" x="106" y="70" width="1700" height="540" fill="url(#nsDawnG)" opacity="0"/>
    <g clip-path="url(#nsWin)">${sky}</g>${mull}
    <rect x="106" y="290" width="1700" height="14" fill="#05070E"/>
    <rect y="852" width="1920" height="228" fill="#070A12"/>
    ${desks}
    <rect class="ns-paper" x="-14" y="-18" width="28" height="36" rx="3" fill="#FFE9BF" opacity="0"/>
    <rect class="ns-morning" width="1920" height="1080" fill="#F3E5C9" opacity="0"/>
  </svg>`;
}
async function filmNightShift(tok) {
  const NS = SHOW.nightShift || { team: [], end: ['', ''] };
  showClock(false); setWorld(0);
  filmL.innerHTML = `<div class="ns">${nightShiftSVG()}<div class="ns-copy out"><div class="ns-tag"></div><div class="ns-name"></div><div class="ns-desc"></div></div><div class="ns-end"><div></div><div></div></div><div class="ns-fade"></div></div>`;
  const q = s => filmL.querySelector(s);
  const copy = q('.ns-copy'), tagE = q('.ns-tag'), nameE = q('.ns-name'), descE = q('.ns-desc');
  const desks = [...filmL.querySelectorAll('.ns-desk')], mons = desks.map(d => d.querySelector('.ns-mon'));
  const dawn = q('.ns-dawn'), morning = q('.ns-morning'), paper = q('.ns-paper'), fade = q('.ns-fade');
  const endEls = [...filmL.querySelectorAll('.ns-end div')];
  endEls.forEach((e, n) => { e.textContent = (NS.end || [])[n] || ''; });
  const X = [330, 645, 960, 1275, 1590];
  const setCopy = (t, n, d) => { tagE.textContent = t; nameE.textContent = n; descE.textContent = d; };
  const monCache = ['', '', '', '', ''];
  const setMon = (i, a, b = '') => {
    const key = a + '|' + b;
    if (monCache[i] === key) return;
    monCache[i] = key;
    mons[i].innerHTML = `<tspan x="${X[i] - 82}" dy="0">${esc(a)}</tspan><tspan x="${X[i] - 82}" dy="30">${esc(b)}</tspan>`;
  };
  const start = i => 6 + 17 * i;
  const CREW = ['RESEARCH', 'WRITE', 'CHECK', 'MANAGE'];
  const once = onceSet();
  let hop = -1, doneCount = 0;
  return timeline(105, s => {
    if (s > 0.6) once('intro', () => { setCopy('02:00', NS.intro || '', ''); copy.classList.remove('out'); });
    if (s > 4.6) once('introOut', () => copy.classList.add('out'));
    (NS.team || []).forEach((m, i) => {
      const t0 = start(i);
      if (s > t0) once('lamp' + i, () => { desks[i].classList.add('on'); Sound.lamp(); setCopy(m.tag, m.name, m.desc); copy.classList.remove('out'); });
      if (s > t0 + 15.8 && i < 4) once('out' + i, () => copy.classList.add('out'));
    });
    const crew = s > start(4) + 0.5 && s < 91;
    // what each monitor shows
    if (s > start(0) && !crew && s < 91) setMon(0, 'ASK ME', s % 1.1 < 0.55 ? 'ANYTHING_' : 'ANYTHING');
    if (s > start(1) && !crew && s < 91) setMon(1, 'INBOX  FILES', 'CRM    WEB');
    if (s > start(2) && !crew && s < 91) { const a = Math.floor(s * 2.5) % 5; setMon(2, '1 2 3 4 5', ' '.repeat(a * 2) + '^'); }
    if (s > start(3) && !crew && s < 91) { const P = ['PLAN', 'PLAN ✓ DO', 'PLAN ✓ DO ✓', 'CHECK ✓', 'AGAIN ↻']; setMon(3, 'GOAL ●', P[Math.floor((s - start(3)) / 1.6) % P.length]); }
    if (crew) {
      for (let i = 0; i < 4; i++) setMon(i, CREW[i], i === hop ? '● WORKING' : '');
      setMon(4, 'DONE', String(doneCount));
      // a sheet of work passes desk to desk; each desk's lamp flickers as it arrives
      const t = (s - start(4) - 0.5) / 1.3, h = Math.floor(t), u = t - h, from = h % 5, to = (h + 1) % 5;
      if (h !== hop) {
        hop = h;
        if (from === 4 && h > 0) doneCount++;
        const d = desks[to]; d.classList.remove('on'); setTimeout(() => d.classList.add('on'), 110);
      }
      const x = lerp(X[from] - 12, X[to] - 12, ease.inOut(u)), y = 680 - Math.sin(Math.PI * u) * 130;
      paper.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(u * 24 - 12).toFixed(1)})`);
      paper.setAttribute('opacity', '0.95');
    }
    if (s > 91) once('dawn', () => { copy.classList.add('out'); paper.setAttribute('opacity', '0'); });
    dawn.setAttribute('opacity', smooth(89, 96, s).toFixed(3));
    morning.setAttribute('opacity', (smooth(92, 97, s) * 0.94).toFixed(3));
    for (let i = 0; i < 5; i++) if (s > 92 + i * 0.6) once('off' + i, () => desks[i].classList.remove('on'));
    if (s > 96.2) once('end1', () => endEls[0].classList.add('in'));
    if (s > 98.8) once('end2', () => endEls[1].classList.add('in'));
    if (s > 104.2) once('fade', () => { fade.style.opacity = 1; });
  }, tok);
}

/* Film 4 · Lights Out: the night map, cities going dark from east to west, ending on 24:00. */
async function filmLightsOut(tok) {
  mapState.mode = 'night'; mapDirty = true;
  focus = null;
  showClock(true); setClockMode('corner'); clockEl.classList.add('running');
  setWorld(1);
  const lines = SHOW.lightsOut || [];
  filmL.innerHTML = lines.map((t, n) => `<p class="lo-line" data-n="${n}">${esc(t)}</p>`).join('');
  const lineEls = [...filmL.querySelectorAll('.lo-line')];
  const cs = WORLD.cities, order = cs.map((c, i) => ({ i, lon: c[2] })).sort((a, b) => b.lon - a.lon);
  const outAt = new Float32Array(cs.length);
  order.forEach((o, n) => { outAt[o.i] = 6 + (n / Math.max(1, order.length - 1)) * 46 + ((o.i * 7919) % 100) / 100 * 1.2; });
  const c0 = Float32Array.from(cityOn);
  const v0 = { ...view }, vA = { lon: 48, lat: 24, k: 1.32 }, vB = { lon: -42, lat: 22, k: 1.18 };
  const t0 = clock.t, start = 22 * 60, end = 24 * 60;
  const pad = Sound.pad();
  const ok = await timeline(60, s => {
    const e = ease.inOut(clamp((s - 2.5) / 55, 0, 1)), ein = ease.inOut(clamp(s / 2.5, 0, 1));
    const vx = { lon: lerp(vA.lon, vB.lon, e), lat: lerp(vA.lat, vB.lat, e), k: lerp(vA.k, vB.k, e) };
    setView(s < 2.5 ? { lon: lerp(v0.lon, vx.lon, ein), lat: lerp(v0.lat, vx.lat, ein), k: lerp(v0.k, vx.k, ein) } : vx);
    clock.t = s < 2 ? lerp(Math.min(t0, start), start, s / 2) : s < 54 ? lerp(start, end, (s - 2) / 52) : end;
    for (let n = 0; n < cs.length; n++) cityOn[n] = Math.min(lerp(c0[n], 1, clamp(s / 1.5, 0, 1)), clamp(1 - (s - outAt[n]) / 0.9, 0, 1));
    mapState.rivers = smooth(3, 12, s) * (1 - 0.6 * smooth(50, 57, s));
    if (lineEls[0]) lineEls[0].style.opacity = smooth(8, 10.5, s) * (1 - smooth(20.5, 23, s));
    if (lineEls[1]) lineEls[1].style.opacity = smooth(25.5, 28, s) * (1 - smooth(38, 40.5, s));
  }, tok);
  if (pad) pad.stop(2.5);
  return ok;
}

/* Placeholders, until the real clips land. */
function filmPlaceholder(cue, tok) {
  showClock(false); setWorld(0);
  const dur = cue.duration || 30, tag = `Placeholder · drop the film at ${cue.src || 'films/'}`;
  if (cue.placeholder === 'call') return phCall(cue, dur, tag, tok);
  if (cue.placeholder === 'scroll') return phScroll(cue, dur, tag, tok);
  filmL.innerHTML = `<div class="ph"><div class="ph-title">${esc(cue.title)}</div><div class="ph-time" style="left:0;right:0;top:560px;text-align:center"><span>0:00</span></div><div class="ph-tag">${esc(tag)}</div></div>`;
  const t = filmL.querySelector('.ph-time span');
  return timeline(dur, s => { t.textContent = `${fmtDur(s)} / ${fmtDur(dur)}`; }, tok);
}
function phCall(cue, dur, tag, tok) {
  filmL.innerHTML = `<div class="ph"><div class="ph-call-name">${esc(cue.phTitle || 'Daisy')}</div><div class="ph-call-sub">${esc(cue.phSub || 'On a call with a scammer')}</div><canvas class="ph-wave" width="1200" height="240"></canvas><div class="ph-call-time">00:00</div><div class="ph-tag">${esc(tag)}</div></div>`;
  const cv = filmL.querySelector('canvas'), g = cv.getContext('2d'), time = filmL.querySelector('.ph-call-time');
  return timeline(dur, s => {
    time.textContent = fmtClock(s);
    g.clearRect(0, 0, 1200, 240);
    g.fillStyle = 'rgba(255,195,92,.9)';
    const talk = 0.35 + 0.65 * Math.abs(Math.sin(s * 0.9) * Math.sin(s * 0.37 + 1));
    for (let n = 0; n < 60; n++) {
      const h = 8 + talk * 200 * Math.abs(Math.sin(n * 0.45 + s * 6.2) * Math.cos(n * 0.13 - s * 2.1));
      g.fillRect(n * 20 + 4, 120 - h / 2, 10, h);
    }
  }, tok);
}
function phScroll(cue, dur, tag, tok) {
  const clips = cue.clips || [], per = dur / Math.max(1, clips.length);
  const GR = { Funny: 'linear-gradient(160deg,#FFD36E,#FF9668)', Clever: 'linear-gradient(160deg,#9AD8FF,#7A8CFF)', Moving: 'linear-gradient(160deg,#E9C2FF,#FF8FB0)' };
  let lastSec = '', order = '';
  clips.forEach((c, n) => { if (c[0] !== lastSec) { order += `<div class="sec">${esc(c[0])}</div>`; lastSec = c[0]; } order += `<div data-n="${n}">${esc(c[1])}</div>`; });
  filmL.innerHTML = `<div class="ph"><div class="ph-order">${order}</div><div class="ph-phone">${clips.map((c, n) => `<div class="ph-clip" data-n="${n}" style="background:${GR[c[0]] || GR.Funny};transform:translateY(${n * 100}%)"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join('')}</div><div class="ph-time"><span>0:00</span><small>of ${fmtDur(dur)}</small></div><div class="ph-tag">${esc(tag)}</div></div>`;
  const clipEls = [...filmL.querySelectorAll('.ph-clip')], rows = [...filmL.querySelectorAll('.ph-order [data-n]')], t = filmL.querySelector('.ph-time span');
  let cur = -1;
  return timeline(dur, s => {
    t.textContent = fmtDur(s);
    const c = Math.min(clips.length - 1, Math.floor(s / per));
    if (c === cur) return;
    cur = c;
    clipEls.forEach((e, n) => { e.style.transform = `translateY(${(n - c) * 100}%)`; });
    rows.forEach((r, n) => r.classList.toggle('now', n === c));
  }, tok);
}

/* ── overlays: script strip, keys, toast ──────────────────────────────── */
function renderNotes() {
  if (!notesOn) return;
  const cue = CUES[idx], nx = CUES[idx + 1];
  if (!cue) {
    notesL.innerHTML = `<div><div class="nt-k">Standby</div><p class="nt-say">Press → to roll Film 1. No intro, no hello.</p></div><div class="nt-side"><div class="nt-time" id="ntTime">0:00</div><div class="nt-due" id="ntDue"></div><div class="nt-next">First: <b>${esc(CUES[0].title)}</b></div></div>`;
  } else {
    const miss = mediaNotes(cue, mediaOK).map(m => `<p class="nt-media">${esc(m)}</p>`).join('');
    notesL.innerHTML = `<div style="min-width:0">
      <div class="nt-k">Beat ${cue._beat} of ${BEATS.length} · <b>${esc(cue.beat)}</b> · ${esc(cue.title)}</div>
      ${cue.say ? `<p class="nt-say">${sayHTML(cue.say)}</p>` : ''}
      ${cue.note ? `<p class="nt-note">${esc(cue.note)}</p>` : ''}
      ${cue.todo ? `<p class="nt-todo">To do: ${esc(cue.todo)}</p>` : ''}${miss}
    </div>
    <div class="nt-side"><div class="nt-time" id="ntTime">0:00</div><div class="nt-due" id="ntDue"></div><div class="nt-next">${nx ? `Next: <b>${esc(nx.title)}</b> · ${esc(nx.clock)}` : 'Last cue'}</div></div>`;
  }
  updateNotesTimer();
}
function updateNotesTimer() {
  if (!notesOn) return;
  const e = startedAt ? (Date.now() - startedAt) / 1000 : 0, sc = schedule(e, idx);
  const t = $('#ntTime'), d = $('#ntDue');
  if (t) t.textContent = fmtDur(e);
  if (d) d.textContent = `${sc.label} · ${sc.text}`;
}
function toggleNotes(on = !notesOn) { notesOn = on; notesL.classList.toggle('on', on); renderNotes(); }

function renderHelp() {
  const keys = [
    ['→  Space  PgDn', 'Next cue (a click works too)'], ['←  PgUp', 'Back one cue'], ['B  or  .', 'Black screen'],
    ['F', 'Full screen'], ['P', 'Presenter view in its own window'], ['S', 'Script strip, for rehearsal'],
    ['M', 'Mute the clock sounds'], ['D', 'Clock creep between clicks, on or off'], ['7  Enter', 'Jump to beat 7'],
    ['R  R', 'Back to the start and reset the timer'], ['?', 'This panel'],
  ];
  helpL.innerHTML = `<div><h2>Keys</h2><div class="keys">${keys.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div><div class="help-media" id="helpMedia"></div></div>
    <div><h2>Jump to a beat</h2><div class="jump">${BEATS.map(b => `<button type="button" data-cue="${b.first}"><span>${b.n}</span><span>${esc(b.name)}</span><span>${fmtDur(CUES[b.first]._at)}</span></button>`).join('')}</div></div>`;
  helpL.querySelectorAll('[data-cue]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleHelp(false); Sound.init(); jumpTo(+b.dataset.cue); }));
  renderHelpMedia();
}
function renderHelpMedia() {
  const h = $('#helpMedia');
  if (!h) return;
  const { found, total } = mediaCount();
  h.textContent = `Media: ${found} of ${total} photos and films added. Missing ones fall back to the map, the built-in films or placeholders.`;
}
function markHelp() { helpL.querySelectorAll('[data-cue]').forEach(b => b.classList.toggle('now', idx >= 0 && CUES[idx]._beat === +CUES[+b.dataset.cue]._beat)); }
function toggleHelp(on = !helpOn) { helpOn = on; helpL.classList.toggle('on', on); if (on) { renderHelpMedia(); markHelp(); } }

let toastTimer = 0;
function toast(msg) { toastL.textContent = msg; toastL.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastL.classList.remove('on'), 2600); }

function setBlackout(on = !blackout) { blackout = on; blackoutL.classList.toggle('on', on); sendState(); }
function toggleMute() { Sound.setMuted(!Sound.muted); if (!presenterLive()) toast(Sound.muted ? 'Clock sounds off' : 'Clock sounds on'); sendState(); }
function toggleDrift() { driftOn = !driftOn; if (!presenterLive()) toast(driftOn ? 'Clock creeps forward between clicks' : 'Clock holds still between clicks'); sendState(); }
function reset() {
  const now = performance.now();
  if (now - resetArmedAt > 2000) { resetArmedAt = now; toast('Press R again to go back to the start'); return; }
  resetArmedAt = 0; startedAt = 0; go(-1, false); toast('Back to the start. Timer reset.');
}

/* ── presenter window link ────────────────────────────────────────────── */
const presenterLive = () => !!(presenterWin && !presenterWin.closed);
function openPresenter() {
  let w = null;
  try { w = window.open(location.href.split('#')[0] + '#presenter', 'the-25th-hour-presenter', 'popup=yes,width=1280,height=820'); } catch (e) { w = null; }
  if (w) { presenterWin = w; toast('Presenter view opened. Drag it to your laptop screen.'); }
  else toast('This viewer blocks new windows. Press S for the script strip instead.');
}
function stateMsg() {
  const fe = film ? (film.video ? film.video.currentTime : (performance.now() - film.t0) / 1000) : 0;
  const found = {};
  for (const p of Object.keys(media)) found[p] = !!media[p].ok;
  return {
    app: '25h', type: 'state', idx, elapsed: startedAt ? (Date.now() - startedAt) / 1000 : 0, clock: clockText,
    film: film ? { title: film.cue.title, elapsed: fe, duration: film.duration || 0, kind: film.kind } : null,
    skipArmed: performance.now() - skipArmedAt < 2500, blackout, muted: Sound.muted, drift: driftOn, found,
  };
}
function sendState() {
  if (!presenterLive()) { presenterWin = null; return; }
  try { presenterWin.postMessage(stateMsg(), '*'); } catch (e) { /* window went away */ }
}
function command(cmd, arg) {
  Sound.init();
  if (cmd === 'next') next();
  else if (cmd === 'prev') prev();
  else if (cmd === 'goto') jumpTo(+arg);
  else if (cmd === 'blackout') setBlackout();
  else if (cmd === 'mute') toggleMute();
  else if (cmd === 'drift') toggleDrift();
  else if (cmd === 'skip') skipFilm();
}
addEventListener('message', e => {
  const d = e.data;
  if (!d || d.app !== '25h') return;
  if (e.origin !== location.origin && location.protocol !== 'file:') return;
  if (d.type === 'hello') { presenterWin = e.source; sendState(); }
  else if (d.type === 'cmd') command(d.cmd, d.arg);
});

/* ── keys, clicks, screen ─────────────────────────────────────────────── */
function handleKey(k, e) {
  if (/^[0-9]$/.test(k)) {
    digitBuf = (digitBuf + k).slice(-2);
    toast(`Jump to beat ${digitBuf}: press Enter`);
    clearTimeout(digitTimer); digitTimer = setTimeout(() => { digitBuf = ''; }, 3000);
    return true;
  }
  switch (k) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'n': case 'N': next(); return true;
    case 'Enter':
      if (digitBuf) { const b = BEATS[+digitBuf - 1]; digitBuf = ''; if (b) jumpTo(b.first); else toast('No beat with that number'); }
      else next();
      return true;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': prev(); return true;
    case 'b': case 'B': case '.': setBlackout(); return true;
    case 'f': case 'F': case 'F5': toggleFullscreen(); return true;
    case 'Escape': if (helpOn) toggleHelp(false); else if (notesOn) toggleNotes(false); return !!e && !document.fullscreenElement;
    case 'p': case 'P': openPresenter(); return true;
    case 's': case 'S': toggleNotes(); return true;
    case 'm': case 'M': toggleMute(); return true;
    case 'd': case 'D': toggleDrift(); return true;
    case 'r': case 'R': reset(); return true;
    case '?': case 'h': case 'H': toggleHelp(); return true;
    case 'Home': jumpTo(0); return true;
    default: return false;
  }
}
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  Sound.init();
  if (handleKey(e.key, e)) e.preventDefault();
});
stage.addEventListener('click', e => {
  if (e.target.closest('[data-noadvance]')) return;
  Sound.init(); next();
});
let idleTimer = 0;
addEventListener('mousemove', () => { stage.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => stage.classList.add('idle'), 2500); });
function toggleFullscreen() {
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  if (r && r.catch) r.catch(() => toast('Full screen isn’t available here'));
}
document.addEventListener('fullscreenchange', () => stage.classList.toggle('fs', !!document.fullscreenElement));
let wakeLock = null;
async function keepAwake() { try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && startedAt) keepAwake(); });

// If the page reloads mid-talk (a stray F5, a crash), pick up where it was.
function saveState() { try { sessionStorage.setItem('the25thhour', JSON.stringify({ idx, startedAt, at: Date.now() })); } catch (e) { /* storage off */ } }
function loadState() { try { const s = JSON.parse(sessionStorage.getItem('the25thhour') || 'null'); if (s && Date.now() - s.at < 6 * 3600e3) return s; } catch (e) { /* storage off */ } return null; }

/* ── the frame loop ───────────────────────────────────────────────────── */
const DRIFT_CAP = CUES.map((c, i) => { for (let j = i + 1; j < CUES.length; j++) if (CUES[j]._clock > c._clock) return CUES[j]._clock - 1; return null; });
function drift(dt) {
  if (!driftOn || idx < 0 || clock.busy || clock.override) return;
  const c = CUES[idx];
  if (c._clock >= 1440 || c.type === 'rollover' || c.type === 'handoff' || (c.type === 'film' && film)) return;
  const cap = DRIFT_CAP[idx];
  if (cap == null || clock.t >= cap) return;
  clock.t = Math.min(cap, clock.t + dt / 1000);
}
let lastFrame = performance.now(), lastMapMin = -1, lastSend = 0;
function frame() {
  const now = performance.now(), dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  runTweens(now);
  drift(dt);
  updateLook(dt);
  setClockText(clock.override || fmtClock(clock.t));
  const mm = Math.floor(clock.t);
  if (mm !== lastMapMin) { lastMapMin = mm; mapState.clockMin = clock.t; mapDirty = true; }
  if (mapDirty) { drawMap(); mapDirty = false; }
  spawnSparks(dt, now);
  drawFx(now);
  if (now - lastSend > 250) { lastSend = now; sendState(); updateNotesTimer(); }
  requestAnimationFrame(frame);
}

/* ── start ────────────────────────────────────────────────────────────── */
function init() {
  stage.style.setProperty('--brand', SHOW.brandColour || '#9B8CFF');
  $('#sbDate').textContent = SHOW.dateLine || '';
  document.title = SHOW.title || document.title;
  fit();
  addEventListener('resize', fit);
  renderHelp();
  measureClock(); setClockMode('corner', true);
  const fontsIn = () => { measureClock(); setClockMode(clock.mode, true); mapDirty = true; };
  if (document.fonts) {
    Promise.all([document.fonts.load('300 400px "Azeret Mono"'), document.fonts.load('500 22px "Azeret Mono"'), document.fonts.load('600 40px "Schibsted Grotesk"')]).then(fontsIn, fontsIn);
    document.fonts.ready.then(fontsIn);
  }
  probeAll().then(() => { renderNotes(); renderHelpMedia(); sendState(); });
  const s = loadState();
  if (s && s.idx >= 0 && s.idx < CUES.length) {
    startedAt = s.startedAt || 0;
    const c = CUES[s.idx];
    if (c.type === 'film') { idx = s.idx; standbyL.classList.add('gone'); applyStatic(s.idx); showClock(true); look.override = null; }
    else go(s.idx, false);
    toast(`Picked up at cue ${s.idx + 1}, ${c.title}. Press R twice to start over.`);
  } else go(-1, false);
  requestAnimationFrame(frame);
  // a small handle for rehearsal tools and tests
  window.the25thHour = { go: (i, anim = false) => { Sound.init(); go(i, anim); }, next, prev, state: () => ({ idx, clock: clockText, film: film && film.kind }), cues: CUES };
}
init();

/* ── presenter view (index.html#presenter) ────────────────────────────── */
function presenterMain() {
  document.title = 'Presenter · ' + (SHOW.title || 'The 25th Hour');
  const root = document.getElementById('presenter');
  let list = '', beat = 0;
  CUES.forEach((c, i) => {
    const first = c._beat !== beat; beat = c._beat;
    list += `<button type="button" data-cue="${i}" class="${first ? 'beat' : ''}"><span class="t">${fmtDur(c._at)}</span><span>${first ? `<b>${esc(c.beat)}</b> · ` : ''}${esc(c.title)}</span><span class="c">${esc(c.clock)}</span></button>`;
  });
  root.innerHTML = `
    <div class="pv-top">
      <div class="pv-time"><small>Talk time</small><span id="pvTime">0:00</span></div>
      <div><span class="pv-pill" id="pvPill">Standby</span><div class="pv-due" id="pvDue">Talk length 25:00</div></div>
      <div class="pv-screen"><small>On screen</small><span id="pvClock">--:--</span></div>
    </div>
    <div class="pv-main">
      <div id="pvCur"></div>
      <div class="pv-film" id="pvFilm"><span id="pvFilmT"></span><div class="pv-bar"><i id="pvFilmBar"></i></div><span id="pvFilmSkip"></span></div>
      <div class="pv-next" id="pvNext"></div>
    </div>
    <div class="pv-list" id="pvList">${list}</div>
    <div class="pv-bottom">
      <button type="button" data-cmd="prev">← Back</button>
      <button type="button" class="primary" data-cmd="next">Next →</button>
      <button type="button" data-cmd="blackout" id="pvBlack">Black screen</button>
      <button type="button" data-cmd="mute" id="pvMute">Mute ticks</button>
      <button type="button" data-cmd="drift" id="pvDrift">Clock creep</button>
      <span class="pv-status" id="pvStatus">Looking for the show window…</span>
    </div>`;
  const q = s => document.getElementById(s);
  const send = (cmd, arg) => { if (window.opener && !window.opener.closed) window.opener.postMessage({ app: '25h', type: 'cmd', cmd, arg }, '*'); };
  root.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => send(b.dataset.cmd)));
  root.querySelectorAll('[data-cue]').forEach(b => b.addEventListener('click', () => send('goto', b.dataset.cue)));
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const map = { ArrowRight: 'next', ArrowDown: 'next', PageDown: 'next', ' ': 'next', Enter: 'next', ArrowLeft: 'prev', ArrowUp: 'prev', PageUp: 'prev', b: 'blackout', B: 'blackout', '.': 'blackout', m: 'mute', M: 'mute', d: 'drift', D: 'drift' };
    if (map[e.key]) { e.preventDefault(); send(map[e.key]); }
    if (e.key === 'F5') e.preventDefault();
  });
  let lastIdx = -2, lastSeen = 0, found = {};
  const cueBlock = (c, nextUp) => {
    if (!c) return `<div class="pv-k">${nextUp ? 'Next' : 'Standby'}</div><p class="pv-title">${nextUp ? 'End of the show' : 'Lights down'}</p>${nextUp ? '' : '<p class="pv-say">No intro, no hello. Press Next to roll Film 1.</p>'}`;
    const warn = nextUp ? [] : [...(c.todo ? ['To do: ' + c.todo] : []), ...mediaNotes(c, p => !!found[p])];
    return `<div class="pv-k">${nextUp ? 'Next · ' : ''}Beat ${c._beat} of ${BEATS.length} · <b>${esc(c.beat)}</b> · on screen ${esc(c.clock)} · due ${fmtDur(c._at)}</div>
      <p class="pv-title">${esc(c.title)}</p>
      ${c.say ? `<p class="pv-say">${sayHTML(c.say)}</p>` : ''}
      ${c.note && !nextUp ? `<p class="pv-note">${esc(c.note)}</p>` : ''}
      ${warn.map(w => `<p class="pv-warn">${esc(w)}</p>`).join('')}`;
  };
  addEventListener('message', e => {
    const st = e.data;
    if (!st || st.app !== '25h' || st.type !== 'state') return;
    lastSeen = Date.now();
    found = st.found || {};
    q('pvTime').textContent = fmtDur(st.elapsed);
    const sc = schedule(st.elapsed, st.idx);
    const pill = q('pvPill'); pill.textContent = sc.label; pill.className = 'pv-pill ' + sc.state;
    q('pvDue').textContent = sc.text;
    q('pvClock').textContent = st.clock || '--:--';
    if (st.idx !== lastIdx) {
      lastIdx = st.idx;
      q('pvCur').innerHTML = cueBlock(CUES[st.idx], false);
      q('pvNext').innerHTML = cueBlock(CUES[st.idx + 1], true);
      root.querySelectorAll('[data-cue]').forEach(b => {
        const on = +b.dataset.cue === st.idx;
        b.classList.toggle('now', on);
        if (on) b.scrollIntoView({ block: 'nearest' });
      });
      root.querySelectorAll('[data-cue]').forEach(b => { const c = CUES[+b.dataset.cue]; b.querySelector('.c').classList.toggle('miss', [c.image, c.src].some(p => p && found[p] === false && !(c.builtin && p === c.src))); });
    }
    const f = q('pvFilm');
    f.classList.toggle('on', !!st.film);
    if (st.film) {
      const left = Math.max(0, st.film.duration - st.film.elapsed);
      q('pvFilmT').textContent = `${st.film.title} · ${fmtDur(left)} left`;
      q('pvFilmBar').style.width = (st.film.duration ? clamp(st.film.elapsed / st.film.duration, 0, 1) * 100 : 0) + '%';
      q('pvFilmSkip').textContent = st.skipArmed ? 'Press Next again to skip' : '';
    }
    q('pvBlack').classList.toggle('on', st.blackout);
    q('pvMute').classList.toggle('on', st.muted);
    q('pvDrift').classList.toggle('on', st.drift);
    const n = Object.keys(found).length, ok = Object.values(found).filter(Boolean).length;
    q('pvStatus').textContent = `Connected · ${ok} of ${n} photos and films added`;
  });
  const hello = () => {
    if (window.opener && !window.opener.closed) window.opener.postMessage({ app: '25h', type: 'hello' }, '*');
    if (Date.now() - lastSeen > 3000) q('pvStatus').textContent = window.opener ? 'Looking for the show window…' : 'Open this from the show window: press P there.';
  };
  hello(); setInterval(hello, 1000);
}
})();
