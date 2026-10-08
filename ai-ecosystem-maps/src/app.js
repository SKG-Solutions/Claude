(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (q, r = document) => r.querySelector(q);
  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) e.style.setProperty(sk, sv); else e.style[sk] = sv; } }
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  function s(tag, attrs = {}, ...kids) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) e.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const rad = (d) => (d * Math.PI) / 180;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLOR = { create: '#5286FE', find: '#FFFFFF', events: '#9DB6FF', work: '#3B52E8', build: '#D3DEFF' };
  const ON = { create: '#FFFFFF', find: '#05033A', events: '#05033A', work: '#FFFFFF', build: '#05033A' };
  const BR = Object.fromEntries(DATA.branches.map((b) => [b.id, b]));
  const SEC = Object.fromEntries(DATA.sections.map((x) => [x.n, x]));
  const TYPE = DATA.types;

  function typeMark(t, size = 10) {
    const c = '#5286FE';
    const shapes = {
      M: s('path', { d: 'M5 0.4 L9.6 5 L5 9.6 L0.4 5Z', fill: c }),
      A: s('circle', { cx: 5, cy: 5, r: 4.4, fill: c }),
      C: s('rect', { x: 0.9, y: 0.9, width: 8.2, height: 8.2, rx: 1, fill: c }),
      P: s('circle', { cx: 5, cy: 5, r: 3.7, fill: 'none', stroke: c, 'stroke-width': 1.7 }),
      X: s('path', { d: 'M5 0.6 L9.7 9.2 L0.3 9.2Z', fill: c }),
    };
    return s('svg', { width: size, height: size, viewBox: '0 0 10 10', 'aria-hidden': 'true' }, shapes[t]);
  }
  function initials(name) {
    const w = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
    return (w.length > 1 ? w[0][0] + w[1][0] : name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2)).toUpperCase();
  }
  function plate(tool) {
    const src = DATA.logos[tool.logo];
    if (src) return h('span', { class: 'plate' }, h('img', { src, alt: '', draggable: 'false' }));
    return h('span', { class: 'plate missing', title: 'Official logo not yet sourced' }, initials(tool.company || tool.name));
  }

  /* ---------- text measurement ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  const FONT = {
    pill: '500 15px "Plus Jakarta Sans"',
    num: '500 12px "Geist Mono"',
    task: '400 15px "Plus Jakarta Sans"',
    caveat: 'italic 500 13.5px "Plus Jakarta Sans"',
    eyebrow: '500 13px "Geist Mono"',
    glabel: '500 12px "Geist Mono"',
  };
  function tw(text, font, tracking = 0) {
    mctx.font = font;
    return mctx.measureText(text).width + text.length * tracking;
  }
  function wrap(text, font, max) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (tw(t, font) <= max) line = t;
      else {
        if (!line) return null;
        lines.push(line);
        line = w;
        if (tw(w, font) > max) return null;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- section circle layout ---------- */
  const CW = 128, CH = 100, GX = 12, GY = 14, PAD_T = 60, PAD_B = 48, INSET = 30, SIDE = 10;
  const chordAt = (R, y) => { const r = R - INSET; return y * y >= r * r ? 0 : 2 * Math.sqrt(r * r - y * y); };
  const chord = (R, y0, y1) => Math.min(chordAt(R, y0), chordAt(R, y1));

  function attempt(sec, R, offset) {
    const items = [];
    let y = -R + PAD_T + offset;
    const eyebrow = (text) => {
      const w = tw(text.toUpperCase(), FONT.eyebrow, 13 * 0.16);
      if (chord(R, y, y + 16) - 2 * SIDE < w) return false;
      items.push({ k: 'eyebrow', text, y, w });
      y += 16 + 12;
      return true;
    };
    if (!eyebrow(sec.workflow ? 'Workflow' : 'AI can produce')) return null;
    const pills = sec.produces.map((t, i) => {
      const num = sec.workflow ? String(i + 1) : null;
      return { t, num, w: 28 + tw(t, FONT.pill) + (num ? tw(num, FONT.num) + 7 : 0) };
    });
    let i = 0;
    while (i < pills.length) {
      const avail = chord(R, y, y + 30) - 2 * SIDE;
      const row = [];
      let w = 0;
      while (i < pills.length) {
        const add = pills[i].w + (row.length ? 8 : 0);
        if (w + add > avail) break;
        row.push(pills[i]); w += add; i++;
      }
      if (!row.length) return null;
      let x = -w / 2;
      for (const p of row) { items.push({ k: 'pill', ...p, x, y }); x += p.w + 8; }
      y += 38;
    }
    y += 16;
    for (const g of sec.groups) {
      if (g.label) {
        const w = tw(g.label.toUpperCase(), FONT.glabel, 12 * 0.14) + 24;
        if (chord(R, y, y + 16) - 2 * SIDE < w) return null;
        items.push({ k: 'glabel', text: g.label, y, w });
        y += 16 + 12;
      }
      const rest = g.tools.slice();
      while (rest.length) {
        const avail = chord(R, y, y + CH) - 2 * SIDE;
        let n = Math.floor((avail + GX) / (CW + GX));
        if (n < 1) return null;
        n = Math.min(n, rest.length);
        if (rest.length - n === 1 && n >= 3) n -= 1;
        const row = rest.splice(0, n);
        let x = -(n * CW + (n - 1) * GX) / 2;
        for (const t of row) { items.push({ k: 'chip', t, x, y }); x += CW + GX; }
        y += CH + GY;
      }
      y += 10;
    }
    y += 8;
    if (!eyebrow('Try')) return null;
    for (const task of sec.tasks) {
      const lines = wrap(task, FONT.task, Math.min(560, chord(R, y, y + 42) - 2 * SIDE - 24));
      if (!lines) return null;
      for (const ln of lines) {
        if (chord(R, y, y + 21) - 2 * SIDE < tw(ln, FONT.task)) return null;
        items.push({ k: 'task', text: ln, y });
        y += 21;
      }
      y += 7;
    }
    if (sec.caveat) {
      y += 6;
      const lines = wrap(sec.caveat, FONT.caveat, Math.min(540, chord(R, y, y + 38) - 2 * SIDE - 30));
      if (!lines) return null;
      for (const ln of lines) {
        if (chord(R, y, y + 19) - 2 * SIDE < tw(ln, FONT.caveat)) return null;
        items.push({ k: 'caveat', text: ln, y });
        y += 19;
      }
    }
    if (y > R - PAD_B) return null;
    return { R, items, end: y };
  }

  function layoutSection(sec) {
    for (let R = 300; R <= 1400; R += 6) {
      const res = attempt(sec, R, 0);
      if (!res) continue;
      const slack = R - PAD_B - res.end;
      for (let off = Math.floor(slack / 2); off > 0; off -= 4) {
        const centred = attempt(sec, R, off);
        if (centred) return centred;
      }
      return res;
    }
    throw new Error('Section ' + sec.n + ' does not fit');
  }

  /* ---------- packing ---------- */
  // Each branch owns an angular sector around the hub, sized by its number of
  // sections. Sections get a slot on one or two rings inside their sector, then
  // a collision pass settles overlaps. X is stretched so the map runs landscape.
  const RH = 470;
  const ARC = 118;
  const SX = 1.75;
  const LABEL_D = RH + 600;

  function pack(blocks) {
    const byBranch = {};
    for (const bl of blocks) (byBranch[bl.sec.branch] ||= []).push(bl);
    const order = ['create', 'find', 'events', 'work', 'build'];
    const total = blocks.length;
    let a = 104;
    const sector = {};
    for (const b of order) {
      const span = (360 * byBranch[b].length) / total;
      sector[b] = { a0: a, a1: a + span, mid: a + span / 2 };
      a += span;
    }
    const nodes = [{ id: 'hub', x: 0, y: 0, r: RH + 80, m: Infinity }];
    const labels = {};
    for (const b of order) {
      const m = rad(sector[b].mid);
      const pw = Math.max(520, tw(BR[b].label, 'italic 600 92px "Plus Jakarta Sans"') + 130);
      const n = { kind: 'label', b, x: Math.cos(m) * LABEL_D * SX, y: Math.sin(m) * LABEL_D, r: pw / 2 - 40, m: 2 };
      n.tx = n.x; n.ty = n.y;
      labels[b] = n; nodes.push(n);
    }
    const D1 = RH + 1150, D2 = D1 + 980;
    for (const b of order) {
      const list = byBranch[b];
      const { a0, a1 } = sector[b];
      const inner = list.length > 3 ? Math.floor(list.length / 2) : list.length;
      list.forEach((bl, k) => {
        const ring = k < inner ? 0 : 1;
        const idx = ring ? k - inner : k;
        const cnt = ring ? list.length - inner : inner;
        const ang = rad(a0 + ((idx + 0.5) / cnt) * (a1 - a0));
        const d = ring ? D2 : D1;
        const tx = Math.cos(ang) * d * SX, ty = Math.sin(ang) * d;
        nodes.push(Object.assign(bl, { kind: 'sec', b, x: tx, y: ty, tx, ty, r: bl.R + ARC, m: 3 }));
      });
    }
    const GAP = 36;
    const collide = () => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = nodes[i], B = nodes[j];
          let dx = B.x - A.x, dy = B.y - A.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const min = A.r + B.r + GAP;
          if (d >= min) continue;
          const o = min - d; dx /= d; dy /= d;
          const wa = A.m === Infinity ? 0 : B.m === Infinity ? 1 : B.m / (A.m + B.m);
          A.x -= dx * o * wa; A.y -= dy * o * wa;
          B.x += dx * o * (1 - wa); B.y += dy * o * (1 - wa);
        }
      }
    };
    for (let it = 0; it < 900; it++) {
      const k = 0.06 * (1 - it / 900);
      for (const n of nodes) {
        if (n.tx == null) continue;
        n.x += (n.tx - n.x) * k;
        n.y += (n.ty - n.y) * k;
        if (n.kind === 'sec') { n.x -= n.x * 0.004; n.y -= n.y * 0.006; }
      }
      collide();
    }
    for (let it = 0; it < 300; it++) collide();
    return { nodes, labels, byBranch };
  }

  /* ---------- build Map 1 ---------- */
  const world = $('#world');
  const viewport = $('#viewport');
  const chipsByName = new Map();
  const sectionGeom = {};
  const branchGeom = {};
  let WORLD = { w: 0, h: 0 };

  function buildMap1() {
    const blocks = DATA.sections.map((sec) => Object.assign({ sec }, layoutSection(sec)));
    const { labels, byBranch } = pack(blocks);

    let minX = -RH - 80, maxX = RH + 80, minY = -RH - 80, maxY = RH + 80;
    for (const b of blocks) {
      minX = Math.min(minX, b.x - b.r); maxX = Math.max(maxX, b.x + b.r);
      minY = Math.min(minY, b.y - b.r); maxY = Math.max(maxY, b.y + b.r);
    }
    for (const l of Object.values(labels)) {
      minX = Math.min(minX, l.x - 320); maxX = Math.max(maxX, l.x + 320);
    }
    // Title and legend sit in the empty top corners of the cluster, raised
    // only as far as needed to clear every circle.
    const titleEl = titleBlock();
    const legendEl = legend();
    world.append(titleEl, legendEl);
    const discs = [{ x: 0, y: 0, r: RH + 60 }, ...blocks.map((b) => ({ x: b.x, y: b.y, r: b.r })), ...Object.values(labels).map((l) => ({ x: l.x, y: l.y, r: l.r }))];
    const clear = (x, y, w, hh) => discs.every((d) => {
      const cx = Math.max(x, Math.min(d.x, x + w)), cy = Math.max(y, Math.min(d.y, y + hh));
      return Math.hypot(d.x - cx, d.y - cy) > d.r + 40;
    });
    const place = (el, x) => {
      const w = el.offsetWidth, hh = el.offsetHeight;
      let y = minY;
      while (!clear(x, y, w, hh)) y -= 40;
      return { x, y, w, h: hh };
    };
    const tPos = place(titleEl, minX + 20);
    const lPos = place(legendEl, maxX - legendEl.offsetWidth - 20);
    const circlesBottom = maxY;
    minY = Math.min(minY, tPos.y, lPos.y);
    const M = 260, THREAD = 1700;
    const ox = -minX + M, oy = -minY + M;
    const W = maxX - minX + 2 * M, H = circlesBottom - minY + 2 * M + THREAD;
    titleEl.style.left = tPos.x + ox + 'px'; titleEl.style.top = tPos.y + oy + 'px';
    legendEl.style.left = lPos.x + ox + 'px'; legendEl.style.top = lPos.y + oy + 'px';
    WORLD = { w: W, h: H };
    world.style.width = W + 'px';
    world.style.height = H + 'px';

    const links = s('svg', { id: 'links', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    const shapes = s('svg', { id: 'shapes', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    world.append(links, shapes);
    const defs = s('defs', {},
      s('radialGradient', { id: 'hubg', cx: '50%', cy: '78%', r: '75%' },
        s('stop', { offset: '0%', 'stop-color': '#5286FE' }),
        s('stop', { offset: '42%', 'stop-color': '#090C9B' }),
        s('stop', { offset: '100%', 'stop-color': '#05033A' })),
      s('radialGradient', { id: 'glow', cx: '50%', cy: '50%', r: '50%' },
        s('stop', { offset: '0%', 'stop-color': '#5286FE', 'stop-opacity': '0.28' }),
        s('stop', { offset: '100%', 'stop-color': '#5286FE', 'stop-opacity': '0' })));
    shapes.append(defs);

    // hub
    const hx = ox, hy = oy;
    links.append(s('circle', { cx: hx, cy: hy, r: RH * 2.4, fill: 'url(#glow)' }));
    shapes.append(s('circle', { cx: hx, cy: hy, r: RH, fill: 'url(#hubg)', stroke: '#FFFFFF', 'stroke-opacity': 0.5, 'stroke-width': 3 }));
    world.append(h('div', { class: 'hub-text', style: { left: hx - RH + 'px', top: hy - RH + 'px', width: RH * 2 + 'px', height: RH * 2 + 'px' } },
      h('div', { class: 'hub-ai', text: 'AI' }),
      h('div', { class: 'hub-line', html: 'from idea to output<br>to action' }),
      h('div', { class: 'hub-meta', text: `${DATA.branches.length} branches · ${DATA.sections.length} sections · ${DATA.stats.entries} tools` })));

    // branch labels and links
    for (const b of DATA.branches) {
      const l = labels[b.id];
      const lx = l.x + ox, ly = l.y + oy;
      const col = COLOR[b.id];
      const mx = (hx + lx) / 2, my = (hy + ly) / 2;
      links.append(s('path', { d: `M${hx} ${hy} Q${mx} ${my} ${lx} ${ly}`, stroke: col, 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round', 'stroke-opacity': 0.9 }));
      const list = byBranch[b.id];
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const bl of list) {
        const cx = bl.x + ox, cy = bl.y + oy;
        const c1x = lx + (cx - lx) * 0.35, c1y = ly + (cy - ly) * 0.05;
        const c2x = lx + (cx - lx) * 0.65, c2y = cy - (cy - ly) * 0.05;
        links.append(s('path', { d: `M${lx} ${ly} C${c1x} ${c1y} ${c2x} ${c2y} ${cx} ${cy}`, stroke: col, 'stroke-width': 5, fill: 'none', 'stroke-opacity': 0.75 }));
        bx0 = Math.min(bx0, cx - bl.r); by0 = Math.min(by0, cy - bl.r); bx1 = Math.max(bx1, cx + bl.r); by1 = Math.max(by1, cy + bl.r);
      }
      bx0 = Math.min(bx0, lx - 300); bx1 = Math.max(bx1, lx + 300); by0 = Math.min(by0, ly - 110); by1 = Math.max(by1, ly + 110);
      branchGeom[b.id] = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
      const tools = list.reduce((a, bl) => a + bl.sec.groups.reduce((x, g) => x + g.tools.length, 0), 0);
      const pw = Math.max(520, tw(b.label, 'italic 600 92px "Plus Jakarta Sans"') + 130);
      const node = h('div', {
        class: 'branch-node', 'data-branch': b.id,
        style: { left: lx - pw / 2 + 'px', top: ly - 110 + 'px', width: pw + 'px', height: '220px', background: col, color: ON[b.id] },
      }, h('div', { class: 'bn-name', text: b.label }), h('div', { class: 'bn-meta', text: `${list.length} section${list.length > 1 ? 's' : ''} · ${tools} tools` }));
      world.append(node);
    }

    // sections
    for (const bl of blocks) {
      const sec = bl.sec;
      const cx = bl.x + ox, cy = bl.y + oy, R = bl.R;
      const col = COLOR[sec.branch];
      sectionGeom[sec.n] = { cx, cy, R, r: bl.r };
      const g = s('g', { class: 'sec-group', 'data-sec': sec.n });
      g.append(s('circle', { cx, cy, r: R, fill: '#0A0950', stroke: col, 'stroke-width': 5 }));
      // arched title
      const label = `${pad2(sec.n)}  ${sec.title}`;
      let fs = 72;
      const ra = R + 38;
      let span = (tw(label, `italic 600 ${fs}px "Plus Jakarta Sans"`) * 0.97) / ra + 0.08;
      if (span > rad(210)) { fs = Math.floor(fs * rad(210) / span); span = rad(210); }
      const a0 = -Math.PI / 2 - span / 2, a1 = -Math.PI / 2 + span / 2;
      const pid = 'arc' + sec.n;
      g.append(s('path', { id: pid, d: `M${cx + ra * Math.cos(a0)} ${cy + ra * Math.sin(a0)} A${ra} ${ra} 0 ${span > Math.PI ? 1 : 0} 1 ${cx + ra * Math.cos(a1)} ${cy + ra * Math.sin(a1)}`, fill: 'none' }));
      const t = s('text', { 'font-family': '"Plus Jakarta Sans", sans-serif', 'font-style': 'italic', 'font-weight': 600, 'font-size': fs, 'letter-spacing': '-0.03em', fill: '#FFFFFF' });
      const tp = s('textPath', { href: '#' + pid, startOffset: '50%', 'text-anchor': 'middle' });
      tp.append(s('tspan', { fill: col === '#3B52E8' ? '#7F93FF' : col }, pad2(sec.n) + '  '), sec.title);
      t.append(tp);
      g.append(t);
      if (sec.sub) {
        g.append(s('text', { x: cx, y: cy + R + 40, 'text-anchor': 'middle', 'font-family': '"Geist Mono", monospace', 'font-size': 18, 'letter-spacing': '0.18em', fill: col === '#3B52E8' ? '#7F93FF' : col }, sec.sub.toUpperCase()));
      }
      shapes.append(g);

      const box = h('div', { class: 'sec-group', 'data-sec': sec.n, style: { position: 'absolute', left: cx + 'px', top: cy + 'px', width: '0', height: '0' } });
      for (const it of bl.items) {
        if (it.k === 'eyebrow') box.append(h('div', { class: 'eyebrow', style: { left: -it.w / 2 - 20 + 'px', width: it.w + 40 + 'px', top: it.y + 'px' }, text: it.text }));
        else if (it.k === 'glabel') box.append(h('div', { class: 'glabel', style: { left: -it.w / 2 + 'px', width: it.w + 'px', top: it.y + 'px' }, text: it.text }));
        else if (it.k === 'pill') box.append(h('div', { class: 'pill', style: { left: it.x + 'px', top: it.y + 'px', width: it.w + 'px', boxSizing: 'border-box' } }, it.num ? h('b', { text: it.num }) : null, it.t));
        else if (it.k === 'task') box.append(h('div', { class: 'task', style: { left: '-320px', width: '640px', top: it.y + 'px' }, text: it.text }));
        else if (it.k === 'caveat') box.append(h('div', { class: 'caveat', style: { left: '-320px', width: '640px', top: it.y + 'px' }, text: it.text }));
        else if (it.k === 'chip') {
          const tool = it.t;
          const chip = h('button', {
            class: 'chip', type: 'button', style: { left: it.x + 'px', top: it.y + 'px' },
            'aria-label': `${tool.name}, ${tool.company}. ${TYPE[tool.type]}.`,
          }, plate(tool), h('span', { class: 'cname', text: tool.name }), h('span', { class: 'ccomp' }, typeMark(tool.type), tool.company));
          chip._tool = tool; chip._sec = sec.n;
          chip.addEventListener('click', (e) => { e.stopPropagation(); openPop(chip); });
          box.append(chip);
          const key = tool.name.toLowerCase();
          if (!chipsByName.has(key)) chipsByName.set(key, []);
          chipsByName.get(key).push(chip);
          chip._wx = cx + it.x; chip._wy = cy + it.y;
        }
      }
      world.append(box);
    }

    // event-content thread
    buildThread(links, ox, oy, minX, maxX, circlesBottom, M);
  }

  function titleBlock() {
    return h('div', { class: 'title-block', style: { width: '2300px' } },
      h('div', { class: 'tb-eyebrow', text: `Map 1 of 2 · Research date ${DATA.researchDate}` }),
      h('div', { class: 'tb-title', text: 'AI by output and workflow' }),
      h('p', { class: 'tb-lede', text: 'What AI can produce, the tasks it helps with and the tools behind each, from a first idea to a finished output and a real-world action. Built for teams deciding what to try first.' }),
      h('div', { class: 'tb-stats' },
        h('div', {}, h('b', { text: String(DATA.sections.length) }), 'sections'),
        h('div', {}, h('b', { text: String(DATA.stats.entries) }), 'tool entries'),
        h('div', {}, h('b', { text: String(DATA.stats.unique) }), 'distinct tools'),
        h('div', {}, h('b', { text: String(DATA.branches.length) }), 'branches')));
  }

  function legend() {
    const sw = (c, ring) => h('span', { class: 'lg-sw', style: ring ? { border: `5px solid ${c}` } : { background: c } });
    const typeRow = (t, sub) => h('div', { class: 'lg-row' }, (() => { const m = typeMark(t, 26); return m; })(), h('div', {}, TYPE[t], h('small', { text: sub })));
    return h('div', { class: 'legend', style: { width: '2080px' } },
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: '48px' } },
        h('div', {}, h('p', { class: 'lg-h', text: 'Branches' }),
          h('div', { class: 'lg-grid', style: { gridTemplateColumns: '1fr' } },
            DATA.branches.map((b) => h('div', { class: 'lg-row' }, sw(COLOR[b.id], true), h('div', {}, b.label, h('small', { text: b.desc })))))),
        h('div', {}, h('p', { class: 'lg-h', text: 'Tool types' }),
          h('div', { class: 'lg-grid', style: { gridTemplateColumns: '1fr' } },
            typeRow('M', 'A model or model API you build on'),
            typeRow('A', 'Built around AI from the start'),
            typeRow('C', 'Design, video or audio software with AI features'),
            typeRow('P', 'Business software with AI added; features vary by plan, region and module'),
            typeRow('X', 'Connects apps, runs workflows or hosts agents'))),
        h('div', {}, h('p', { class: 'lg-h', text: 'Reading the map' }),
          h('div', { class: 'lg-grid', style: { gridTemplateColumns: '1fr' } },
            h('div', { class: 'lg-row' }, h('span', { class: 'lg-plate' }), h('div', {}, 'Logo', h('small', { text: 'Company artwork on a white plate; pending brand review before external use' }))),
            h('div', { class: 'lg-row' }, h('span', { class: 'lg-plate missing' }), h('div', {}, 'Logo not yet sourced', h('small', { text: 'Initials stand in; listed under Sources and notes' }))),
            h('div', { class: 'lg-row' }, s('svg', { width: 64, height: 20, viewBox: '0 0 64 20' }, s('path', { d: 'M2 10 H62', stroke: '#fff', 'stroke-width': 4, 'stroke-dasharray': '10 7' })), h('div', {}, 'Event-content thread', h('small', { text: 'One event from insight to reuse, along the foot of the map' }))),
            h('div', { class: 'lg-row' }, h('span', { class: 'pill', style: { position: 'static', height: '30px' } }, 'Output'), h('div', {}, 'What AI can produce', h('small', { text: 'Grow and Operate list workflow steps instead' })))))),
      h('p', { class: 'lg-note', text: 'The tool lists are starting points, not rankings. Names and AI features were checked against current product sources; replaced and renamed products are listed under Sources and notes.' }));
  }

  function buildThread(links, ox, oy, minX, maxX, maxY, M) {
    const y0 = oy + maxY + M;
    const x0 = ox + minX + 40, x1 = ox + maxX - 40;
    world.append(h('div', { class: 'thread-title', style: { left: x0 + 'px', top: y0 + 'px', width: '3000px' } },
      h('div', { class: 'tb-eyebrow', text: 'Cross-workflow thread' }),
      h('h3', { text: 'One event, from insight to reuse' }),
      h('p', { text: 'Event content moves across every branch. Each stage links to the sections that do the work. Select a stage to light up its sections.' })));
    const sy = y0 + 560;
    const n = DATA.thread.length;
    const step = (x1 - x0 - 300) / (n - 1);
    const pts = DATA.thread.map((_, i) => x0 + 150 + i * step);
    links.append(s('path', { d: `M${pts[0]} ${sy} H${pts[n - 1]}`, stroke: '#FFFFFF', 'stroke-width': 14, 'stroke-dasharray': '36 22', fill: 'none' }));
    for (let i = 0; i < n - 1; i++) {
      const mx = (pts[i] + pts[i + 1]) / 2;
      links.append(s('path', { d: `M${mx - 26} ${sy - 34} L${mx + 10} ${sy} L${mx - 26} ${sy + 34}`, stroke: '#FFFFFF', 'stroke-width': 12, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
    DATA.thread.forEach((st, i) => {
      const x = pts[i];
      for (const n2 of st.sections) {
        const g = sectionGeom[n2];
        const ex = g.cx, ey = g.cy + g.R;
        const col = COLOR[SEC[n2].branch];
        links.append(s('path', {
          class: 'tlink', 'data-stage': i, d: `M${x} ${sy - 80} C${x} ${sy - 800} ${ex} ${ey + 700} ${ex} ${ey}`,
          stroke: col, 'stroke-width': 3, 'stroke-opacity': 0.16, fill: 'none',
        }));
      }
      const el = h('div', { class: 'stage', 'data-stage': i, tabindex: '0', role: 'button', 'aria-label': `Stage ${i + 1}: ${st.stage}`, style: { left: x - 230 + 'px', top: sy - 80 + 'px', width: '460px' } },
        h('div', { class: 'stage-dot', text: String(i + 1) }),
        h('div', { class: 'stage-name', text: st.stage }),
        h('div', { class: 'stage-secs' }, st.sections.map((n2) => h('span', {}, h('b', { style: { color: COLOR[SEC[n2].branch] === '#3B52E8' ? '#7F93FF' : COLOR[SEC[n2].branch] }, text: pad2(n2) }), SEC[n2].title))));
      el.addEventListener('click', (e) => { e.stopPropagation(); toggleStage(i); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStage(i); } });
      world.append(el);
    });
  }

  let activeStage = null;
  function toggleStage(i) {
    activeStage = activeStage === i ? null : i;
    world.classList.toggle('focus-thread', activeStage !== null);
    const lit = new Set(activeStage === null ? [] : DATA.thread[activeStage].sections.map(String));
    world.querySelectorAll('.sec-group').forEach((g) => g.classList.toggle('lit', lit.has(g.dataset.sec)));
    world.querySelectorAll('.stage').forEach((st) => st.classList.toggle('on', String(activeStage) === st.dataset.stage));
    world.querySelectorAll('path.tlink').forEach((p) => {
      const on = activeStage !== null && p.dataset.stage === String(activeStage);
      p.setAttribute('stroke-opacity', on ? 0.95 : activeStage === null ? 0.16 : 0.05);
      p.setAttribute('stroke-width', on ? 7 : 3);
    });
  }

  /* ---------- pan and zoom ---------- */
  const view = { s: 1, x: 0, y: 0 };
  let minScale = 0.05;
  const apply = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`; };
  function chromeInsets() {
    const bar = $('#bar').getBoundingClientRect().height;
    const tools = $('#maptools').getBoundingClientRect().height;
    return { top: bar + 16, bottom: tools + 32 };
  }
  function target(x0, y0, x1, y1, maxS = 2) {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const ins = chromeInsets();
    const pad = 24;
    const sc = Math.min((vw - 2 * pad) / (x1 - x0), (vh - ins.top - ins.bottom - 2 * pad) / (y1 - y0), maxS);
    return { s: sc, x: (vw - (x1 - x0) * sc) / 2 - x0 * sc, y: ins.top + pad + (vh - ins.top - ins.bottom - 2 * pad - (y1 - y0) * sc) / 2 - y0 * sc };
  }
  let anim = null;
  function animateTo(t) {
    if (anim) cancelAnimationFrame(anim);
    closePop();
    if (reduceMotion) { Object.assign(view, t); apply(); return; }
    const from = { ...view }, t0 = performance.now(), dur = 520;
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = ease(p);
      const ls = Math.log(from.s) + (Math.log(t.s) - Math.log(from.s)) * e;
      view.s = Math.exp(ls);
      view.x = from.x + (t.x - from.x) * e;
      view.y = from.y + (t.y - from.y) * e;
      apply();
      if (p < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }
  let fitted = false;
  function fitAll(instant) {
    if (!viewport.clientWidth) return;
    fitted = true;
    const t = target(0, 0, WORLD.w, WORLD.h);
    minScale = t.s * 0.6;
    if (instant) { Object.assign(view, t); apply(); closePop(); } else animateTo(t);
  }
  function zoomAt(px, py, f) {
    const ns = Math.min(3, Math.max(minScale, view.s * f));
    const k = ns / view.s;
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    view.s = ns;
    apply();
  }
  const toWorld = (px, py) => ({ x: (px - view.x) / view.s, y: (py - view.y) / view.s });
  function focusSection(n) {
    // Fit the circle, but never so far out that tool names drop below ~12px.
    const g = sectionGeom[n];
    const t = target(g.cx - g.r, g.cy - g.r, g.cx + g.r, g.cy + g.r, 1.6);
    if (t.s < 0.86) {
      const vw = viewport.clientWidth, vh = viewport.clientHeight, ins = chromeInsets();
      const sc = 0.86;
      const cy = g.cy - g.R * 0.12;
      animateTo({ s: sc, x: vw / 2 - g.cx * sc, y: ins.top + (vh - ins.top - ins.bottom) / 2 - cy * sc });
    } else animateTo(t);
  }

  const pointers = new Map();
  let drag = null, moved = false, pinch = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
      viewport.setPointerCapture(e.pointerId);
    }
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = viewport.getBoundingClientRect();
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (pinch.s * d / pinch.d) / view.s);
      moved = true;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) > 5) {
        moved = true;
        viewport.classList.add('dragging');
        viewport.setPointerCapture(e.pointerId);
        closePop();
        hideHint();
      }
      if (moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; apply(); }
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) { drag = null; viewport.classList.remove('dragging'); }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('click', (e) => {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
    if (e.target.closest('.chip, .stage')) return;
    closePop();
    const r = viewport.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    const bn = e.target.closest('.branch-node');
    if (bn) { const g = branchGeom[bn.dataset.branch]; animateTo(target(g.x0, g.y0, g.x1, g.y1)); return; }
    for (const [n, g] of Object.entries(sectionGeom)) {
      if (Math.hypot(p.x - g.cx, p.y - g.cy) <= g.R + 70) { focusSection(+n); return; }
    }
    if (activeStage !== null) toggleStage(activeStage);
  }, true);
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    const k = e.ctrlKey ? 0.012 : 0.0016;
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * k));
    closePop();
    hideHint();
  }, { passive: false });
  viewport.addEventListener('keydown', (e) => {
    const c = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
    if (e.key === '+' || e.key === '=') zoomAt(c.x, c.y, 1.25);
    else if (e.key === '-') zoomAt(c.x, c.y, 0.8);
    else if (e.key === '0') fitAll();
    else if (e.key.startsWith('Arrow')) {
      const d = 80;
      view.x += e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0;
      view.y += e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0;
      apply();
    } else return;
    e.preventDefault();
  });
  $('#zoom-in').addEventListener('click', () => closePop() || zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1.4));
  $('#zoom-out').addEventListener('click', () => closePop() || zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 0.7));
  $('#zoom-fit').addEventListener('click', () => fitAll());
  window.addEventListener('resize', () => { if (!document.body.classList.contains('poster') && !$('#map1').hidden) fitAll(true); });
  let hintTimer = null;
  function hideHint() { $('#hint').classList.add('gone'); }

  /* ---------- popover ---------- */
  const pop = $('#pop');
  let popChip = null;
  function openPop(chip) {
    const t = chip._tool;
    if (popChip === chip && !pop.hidden) { closePop(); return; }
    popChip = chip;
    const meta = DATA.logoMeta[t.logo] || {};
    const also = DATA.sections.filter((x) => x.n !== chip._sec && x.groups.some((g) => g.tools.some((y) => y.name === t.name))).map((x) => x.n);
    const sec = SEC[chip._sec];
    const group = sec.groups.find((g) => g.tools.includes(t));
    pop.replaceChildren(
      h('button', { class: 'p-close', type: 'button', 'aria-label': 'Close', onclick: closePop }, '×'),
      plate(t),
      h('h4', { text: t.name }),
      h('div', { class: 'p-co', text: t.company }),
      h('dl', {},
        h('dt', { text: 'Type' }), h('dd', {}, TYPE[t.type] + (group && group.label ? ` · ${group.label.replace(/^Platforms with /, '').replace(/^AI-first tools$/, 'AI-first')}` : '')),
        h('dt', { text: 'Section' }), h('dd', { text: `${pad2(sec.n)} ${sec.title}` }),
        also.length ? [h('dt', { text: 'Also in' }), h('dd', { text: also.map((n) => `${pad2(n)} ${SEC[n].title}`).join('; ') })] : null,
        t.note ? [h('dt', { text: 'Note' }), h('dd', { text: t.note })] : null,
        t.domain ? [h('dt', { text: 'Website' }), h('dd', {}, h('a', { href: 'https://' + t.domain, target: '_blank', rel: 'noopener', text: t.domain }))] : null,
        h('dt', { text: 'Logo' }), h('dd', { text: meta.file ? meta.source : 'Not yet sourced' })));
    pop.hidden = false;
    const r = chip.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.right + 12, y = r.top;
    if (x + pw > window.innerWidth - 12) x = r.left - pw - 12;
    if (x < 12) x = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left));
    y = Math.max(76, Math.min(window.innerHeight - ph - 12, y));
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
  }
  function closePop() { pop.hidden = true; popChip = null; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); if (activeStage !== null) toggleStage(activeStage); } });

  /* ---------- search ---------- */
  function setupSearch() {
    const input = $('#find-input'), list = $('#find-list'), clear = $('#find-clear');
    const names = new Set();
    for (const sec of DATA.sections) for (const g of sec.groups) for (const t of g.tools) { names.add(t.name); names.add(t.company); }
    [...names].sort((a, b) => a.localeCompare(b)).forEach((n) => list.append(h('option', { value: n })));
    const run = () => {
      const q = input.value.trim().toLowerCase();
      world.querySelectorAll('.chip.hit').forEach((c) => c.classList.remove('hit'));
      clear.hidden = !q;
      if (!q) return;
      const all = world.querySelectorAll('.chip');
      let hits = [...all].filter((c) => c._tool.name.toLowerCase() === q || c._tool.company.toLowerCase() === q);
      if (!hits.length) hits = [...all].filter((c) => c._tool.name.toLowerCase().includes(q) || c._tool.company.toLowerCase().includes(q));
      if (!hits.length) { input.setCustomValidity('No tool or company matches'); input.reportValidity(); return; }
      input.setCustomValidity('');
      hits.forEach((c) => c.classList.add('hit'));
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of hits) { x0 = Math.min(x0, c._wx); y0 = Math.min(y0, c._wy); x1 = Math.max(x1, c._wx + CW); y1 = Math.max(y1, c._wy + CH); }
      const padW = 220;
      animateTo(target(x0 - padW, y0 - padW, x1 + padW, y1 + padW, 1.4));
      hideHint();
    };
    $('#find').addEventListener('submit', (e) => { e.preventDefault(); run(); });
    input.addEventListener('change', run);
    input.addEventListener('input', () => input.setCustomValidity(''));
    clear.addEventListener('click', () => { input.value = ''; run(); fitAll(); });
    const jump = $('#jump');
    for (const b of DATA.branches) {
      jump.append(h('button', { type: 'button', onclick: () => { const g = branchGeom[b.id]; animateTo(target(g.x0, g.y0, g.x1, g.y1)); hideHint(); } },
        h('i', { style: { background: COLOR[b.id] } }), b.label));
    }
  }

  /* ---------- Map 2 ---------- */
  function buildMap2() {
    const M2 = DATA.models;
    const tc = { fast: '#5286FE', balanced: '#9DB6FF', deep: '#FFFFFF' };
    const meter = (label, n, c) => h('div', { class: 'meter' }, label, h('span', {}, [1, 2, 3].map((i) => h('i', { class: i <= n ? 'on' : '' }))));
    const goto = (nums) => nums.length ? h('div', { class: 'goto' }, nums.map((n) => h('button', { type: 'button', onclick: () => { show('map1'); setTimeout(() => focusSection(n), 60); } }, h('b', { text: pad2(n) }), SEC[n].title))) : null;
    const page = h('div', { class: 'page' },
      h('div', { class: 'p-eyebrow', text: `Map 2 of 2 · Checked ${DATA.researchDate}` }),
      h('h1', { class: 'p-title', text: 'Choosing a model for the task' }),
      h('p', { class: 'p-lede', text: M2.intro }),
      h('div', { class: 'spectrum', role: 'img', 'aria-label': 'Spectrum from fast and repetitive work to complex, high-judgment work' },
        h('div', { class: 'spec-bar' }),
        h('div', { class: 'spec-ends' }, h('span', { text: 'Fast and repetitive' }), h('span', { text: 'Complex and high-judgment' }))),
      h('div', { class: 'tiers' }, M2.tiers.map((t) => h('article', { class: 'tier', style: { '--tc': tc[t.id] } },
        h('div', {}, h('div', { class: 'tier-k', text: t.kicker }), h('h3', { text: t.name })),
        h('p', { class: 'tier-use', text: t.use }),
        h('div', {}, h('div', { class: 't-label', text: 'Event and business examples' }), h('ul', {}, t.tasks.map((x) => h('li', { text: x })))),
        h('div', {}, h('div', { class: 't-label', text: 'Current models at this tier' }),
          h('div', { class: 'models' }, t.models.map(([logo, co, name, note]) => h('div', { class: 'model' },
            plate({ logo, company: co, name }),
            h('div', {}, h('b', { text: name }), h('small', { text: `${co} · ${note}` })))))),
        h('p', { class: 'brief' }, h('b', { text: 'Brief it: ' }), t.brief),
        h('div', { class: 'meters' }, meter('Speed', t.speed), meter('Cost per task', t.cost))))),
      h('h2', { class: 'p-h', text: 'Five things that move a task along the spectrum' }),
      h('p', { class: 'p-sub', text: 'Start in the middle and adjust. Most real tasks mix tiers: a fast model sorts the pile, a deep model writes the judgment.' }),
      h('div', { class: 'factors' }, M2.factors.map(([name, text, dir]) => h('div', { class: 'factor' },
        h('h4', { text: name }), h('p', { text: text }),
        h('div', { class: 'dir' }, s('svg', { width: 26, height: 12, viewBox: '0 0 26 12', 'aria-hidden': 'true' },
          s('path', { d: dir === 'deep' ? 'M1 6 H23 M18 1.5 L23.5 6 L18 10.5' : 'M25 6 H3 M8 1.5 L2.5 6 L8 10.5', stroke: '#5286FE', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
          dir === 'deep' ? 'Toward deep' : 'Toward fast')))),
      h('h2', { class: 'p-h', text: 'Route the task' }),
      h('p', { class: 'p-sub', text: 'Ask what the task needs before choosing a model. Some needs are met by adding retrieval, a specialist tool or a supervised workflow, not by a bigger model.' }),
      h('div', { class: 'router' },
        h('div', { class: 'router-start', text: 'What does the task need?' }),
        h('div', { class: 'routes' }, M2.routes.map(([need, action, nums, tier], i) => h('div', { class: 'route' },
          h('div', { class: 'route-n', text: String(i + 1) }),
          h('div', {}, h('h4', { text: need }), h('p', { text: action }), goto(nums)))))),
      h('h2', { class: 'p-h', text: 'Watch list' }),
      h('ul', { class: 'watch' }, M2.watch.map((w) => h('li', { text: w }))),
      h('p', { class: 'p-sub', style: { marginTop: '28px' }, text: 'Model names change every few weeks. Anthropic names were checked on its own pages; OpenAI and Google names were checked against dated coverage and Google developer documentation. Sources are listed under Sources and notes.' }));
    $('#map2').append(page);
  }

  /* ---------- notes ---------- */
  function buildNotes() {
    const metas = Object.entries(DATA.logoMeta);
    const missing = metas.filter(([, m]) => !m.file);
    const official = metas.filter(([, m]) => m.status === 'official');
    const library = metas.filter(([, m]) => m.status === 'library');
    const changes = [];
    for (const sec of DATA.sections) {
      for (const [name, why] of sec.replaced || []) changes.push([name, `${pad2(sec.n)} ${sec.title}`, why]);
      for (const g of sec.groups) for (const t of g.tools) if (t.note) changes.push([t.name, `${pad2(sec.n)} ${sec.title}`, t.note]);
    }
    const seen = new Set();
    const uniqueChanges = changes.filter(([a, , c]) => { const k = a + c; if (seen.has(k)) return false; seen.add(k); return true; });
    const groups = {};
    for (const src of DATA.sources) (groups[src.topic] ||= []).push(src);
    const page = h('div', { class: 'page' },
      h('div', { class: 'p-eyebrow', text: `Research date ${DATA.researchDate}` }),
      h('h1', { class: 'p-title', text: 'Sources and notes' }),
      h('p', { class: 'p-lede', text: 'How the inventory was checked, what changed from the starting lists, where every logo came from and which logos still need official files.' }),
      h('div', { class: 'n-grid' },
        h('div', { class: 'n-stat' }, h('b', { text: String(DATA.stats.entries) }), h('span', { text: `tool entries across ${DATA.sections.length} sections; ${DATA.stats.unique} distinct tools` })),
        h('div', { class: 'n-stat' }, h('b', { text: String(official.length + library.length) }), h('span', { text: `brands shown with logo artwork; ${official.length} are official files supplied to RAISE` })),
        h('div', { class: 'n-stat' }, h('b', { text: String(missing.length) }), h('span', { text: 'brands still need an official logo file' }))),
      h('h2', { class: 'p-h', text: 'Method' }),
      h('ul', { class: 'watch' },
        h('li', { text: 'Each starting list was treated as a set of examples. Names, ownership and AI features were checked against company pages, release notes and dated coverage in early October 2026.' }),
        h('li', { text: 'Discontinued products were replaced with current equivalents; every section keeps at least ten tools.' }),
        h('li', { text: 'Sections 14, 20 and 21 separate specialist platforms with embedded AI from AI-first tools. Most event, sales and logistics platforms are not AI-native, and their AI features depend on plan, module and region.' }),
        h('li', { text: 'Company websites and brand portals could not be reached from the research environment. Logos therefore come from official files supplied to RAISE where available and otherwise from open logo libraries that mirror company artwork. Every logo should be checked against the company\'s media kit before external publication.' })),
      h('h2', { class: 'p-h', text: 'Changes and product notes' }),
      h('p', { class: 'p-sub', text: 'Products replaced, renamed or acquired since the starting lists were written, plus notes that change how an entry should be read.' }),
      h('div', { class: 'tbl-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Tool' }), h('th', { text: 'Section' }), h('th', { text: 'Note' }))),
        h('tbody', {}, uniqueChanges.map(([a, b, c]) => h('tr', {}, h('td', { text: a }), h('td', { text: b }), h('td', { text: c })))))),
      h('h2', { class: 'p-h', text: 'Sources' }),
      Object.entries(groups).map(([topic, list]) => [
        h('p', { class: 't-label', style: { marginTop: '22px' }, text: topic }),
        h('div', { class: 'tbl-wrap' }, h('table', {}, h('tbody', {}, list.map((x) => h('tr', {},
          h('td', { text: x.supports }),
          h('td', {}, h('a', { href: x.url, target: '_blank', rel: 'noopener', text: x.title })),
          h('td', {}, h('span', { class: 'tag ' + (x.kind === 'official' ? 'official' : ''), text: x.kind === 'official' ? 'Company source' : 'Dated coverage' })))))))]),
      h('h2', { class: 'p-h', text: 'Logo sources' }),
      h('p', { class: 'p-sub', text: 'Open logo libraries collect company artwork from brand pages and press kits. They are a stand-in until official files are collected; the repository includes a script that pulls each brand\'s own icon from its website.' }),
      h('div', { class: 'tbl-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Brand key' }), h('th', { text: 'Used for' }), h('th', { text: 'Source' }))),
        h('tbody', {}, [...official, ...library].map(([k, m]) => h('tr', {},
          h('td', { text: k }), h('td', { text: m.tools.join(', ') }),
          h('td', {}, m.status === 'official' ? h('span', { class: 'tag official', text: 'Official file' }) : m.source, m.upstream ? [' · upstream ', h('a', { href: m.upstream, target: '_blank', rel: 'noopener', text: 'source' })] : null)))))),
      h('h2', { class: 'p-h', text: `Logos still needed (${missing.length})` }),
      h('p', { class: 'p-sub', text: 'These brands show initials on a dashed plate. Collect the official files from each media kit and drop them into the logos folder.' }),
      h('ul', { class: 'missing-list' }, missing.map(([, m]) => h('li', {}, h('b', { text: m.tools[0] }), m.tools.length > 1 ? ` and ${m.tools.length - 1} more` : '', ` · ${m.company}`))));
    $('#notes').append(page);
  }

  /* ---------- tabs ---------- */
  const views = ['map1', 'map2', 'notes'];
  function show(id) {
    if (!views.includes(id)) id = 'map1';
    for (const v of views) {
      $('#' + v).hidden = v !== id;
      $('#tab-' + v).setAttribute('aria-selected', String(v === id));
    }
    closePop();
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed */ }
    if (id !== 'map1') window.scrollTo(0, 0);
    else if (!fitted && WORLD.w) fitAll(true);
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...document.querySelectorAll('.tab')];
    const i = tabs.indexOf(document.activeElement);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); n.click();
  });

  /* ---------- start ---------- */
  async function start() {
    const fonts = ['500 15px "Plus Jakarta Sans"', '400 15px "Plus Jakarta Sans"', 'italic 600 56px "Plus Jakarta Sans"', 'italic 500 13px "Plus Jakarta Sans"', '600 14px "Plus Jakarta Sans"', '500 13px "Geist Mono"'];
    try {
      await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 3500))]);
    } catch (e) { /* fall back to system fonts */ }
    buildMap1();
    setupSearch();
    buildMap2();
    buildNotes();
    const params = new URLSearchParams(location.search);
    const poster = params.get('poster');
    if (poster) {
      document.body.classList.add('poster');
      if (poster === '1') {
        show('map1');
        Object.assign(view, { s: 1, x: 0, y: 0 }); apply();
        viewport.style.width = WORLD.w + 'px'; viewport.style.height = WORLD.h + 'px';
        document.body.style.width = WORLD.w + 'px';
      } else show(poster === '2' ? 'map2' : 'notes');
      document.body.dataset.ready = 'true';
      return;
    }
    show((location.hash || '#map1').slice(1));
    fitAll(true);
    hintTimer = setTimeout(hideHint, 9000);
    document.body.dataset.ready = 'true';
  }
  window.aiMaps = { focus: (n) => focusSection(n), show: (v) => show(v), fit: () => fitAll(true), view: (x, y, sc) => { Object.assign(view, { x, y, s: sc }); apply(); } };
  start();
})();
