// The product's logo, drawn and animated: a square S of one stroke, coloured in curved diagonal
// bands, and an electron that turns between its two hollows. No dependency; an ES module.
//
//   <script type="module" src="s-logo.js"></script>
//   <s-logo variant="logo" size="96" state="busy"></s-logo>
//
// Attributes
//   variant  logo (default) | icon | text   logo: full S with its birth; icon: 16–24 px, lighter
//            stroke; text: the height of the capitals of the text around it, on the baseline
//   size     pixels, for logo (default 64) and icon (default 16)
//   state    static (default) | busy | done | demo
//            busy: the S is born from circles (logo only), then the electron turns until done;
//            done: the electron reaches its nest, then the logo comes undone (logo) or rests
//            (icon, text), and the element fires "s-logo-end"; demo: the whole cycle, repeated
//   tone     auto (default, follows the page's theme) | light | dark | mono (one colour, the
//            text colour: for coloured surfaces such as a primary button)
//   accent   current (default) | spark | signal | volt: the tones of the palette's accent;
//            wait: greys, for a wait that should not draw the eye
//   name     the product's name beside the symbol: "solar switch", the last word in Manrope 700
//            and the words before it in 400 (the page loads the font), the i dotted with an
//            electron; size stays the symbol's size
//   layout   row (default) | column: the name beside the symbol, or under it
//   label    the text alternative (default "Loading" in busy, the name or "Logo" otherwise)
//   no-intro the logo variant goes straight to the turning electron
//
// The same drawing as a string, for a static file or a server: logoSVG({size, variant, tone, accent});
// tone may also be four colours of your own, from the top band to the bottom one.

// four bands from the top, for a light and a dark paper: the tones of each accent of the palette
// (book: design/palette), and a grey one for waiting
const TONES = {
  current: { light: ['#004144', '#005D5D', '#007D79', '#00B8A9'], dark: ['#009D9A', '#00B8A9', '#3DDBD9', '#9EF0F0'] },
  spark: { light: ['#5C3D00', '#8A5A00', '#B87F00', '#FFC400'], dark: ['#B87F00', '#E0A200', '#FFC400', '#FFE08A'] },
  signal: { light: ['#001D6C', '#002D9C', '#0043CE', '#0F62FE'], dark: ['#0F62FE', '#4589FF', '#78A9FF', '#A6C8FF'] },
  volt: { light: ['#2F4200', '#4A6500', '#6E9400', '#C8EE00'], dark: ['#6E9400', '#9BC400', '#C8EE00', '#E4F77F'] },
  wait: { light: ['#2B2E33', '#4A4F57', '#6B717A', '#9AA0A8'], dark: ['#6B717A', '#8D939B', '#B4B9C0', '#DDE0E4'] }
};
// the construction, in fractions of the stroke (see the book's logo page)
const SPEC = {
  seat: 0.11,          // the middle bar raised: hollows of 89 % (top) and 111 % (bottom) of the stroke
  soft: 0.75,          // the two bends, from a quarter-round corner (0) to a half circle (1)
  gap: 0.12,           // the gap around the electron, in hollows
  slope: 0.8,          // the bands: about 39°
  curve: -0.07,        // their bow, in heights of the S
  joint: 0.245,        // the gap between bands, in strokes (logo variant only)
  flow: 9000           // one full slide of the bands, ms
};
// the name: its type, and its place beside the symbol, in fractions of the symbol's size
const NAME = { font: '{w} {px}px Manrope, system-ui, sans-serif', strong: 700, light: 400, track: -0.02,
  row: { ascender: 1 / 1.25, gap: 0.4 }, column: { size: 0.42, sizeTwo: 0.3, gap: 0.16 } };
const T = { half: 1100, empty: 300, intro: 3220, outro: 3220, tail: 400, loops: 2 };

const f = n => Math.round(n * 1000) / 1000;
const cl = x => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const io = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const C2 = 0.6 * 1.525;
const back = t => t < 0.5 ? (Math.pow(2 * t, 2) * ((C2 + 1) * 2 * t - C2)) / 2 : (Math.pow(2 * t - 2, 2) * ((C2 + 1) * (t * 2 - 2) + C2) + 2) / 2;
const outBack = t => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// Stroke w and hollow c in whole device pixels, so that every straight edge falls on the pixel grid.
function grid(variant, px, cap) {
  if (variant === 'text') {
    const S = Math.max(5, Math.round(cap)), w = Math.max(1, Math.round(S * 0.14)), c = Math.max(1, Math.floor((S - 3 * w) / 2)), H = 3 * w + 2 * c;
    return { S, w, c, ox: Math.floor((S - H) / 2), oy: S - H };
  }
  if (variant === 'icon') {
    const S = Math.round(px), pad = Math.round(S / 8), inner = S - 2 * pad, w = Math.max(1, Math.round(inner * 0.17)), c = Math.max(1, Math.floor((inner - 3 * w) / 2)), H = 3 * w + 2 * c;
    return { S, w, c, ox: Math.floor((S - H) / 2), oy: Math.floor((S - H) / 2) };
  }
  const S = Math.round(px), n = Math.floor(S / 5), o = Math.floor((S - 5 * n) / 2);
  return { S, w: n, c: n, ox: o, oy: o };
}

function outline(w, ct, cb, ins, ox, oy) {
  const c = (ct + cb) / 2, H = 3 * w + 2 * c, W = H, Wt = W - ins, rt = ct / 2, rb = cb / 2, q = w / 2;
  const y2 = w + ct, y3 = 2 * w + ct, y4 = 2 * w + ct + cb;
  const rot = q + SPEC.soft * (rt + w - q), rob = q + SPEC.soft * (rb + w - q);
  const P = (x, y) => `${f(ox + x)} ${f(oy + y)}`, A = (r, x, y, s) => `A${f(r)} ${f(r)} 0 0 ${s} ${P(x, y)}`, L = (x, y) => `L${P(x, y)}`;
  return `M${P(rot, 0)}` + L(Wt - q, 0) + A(q, Wt, q, 1) + A(q, Wt - q, w, 1) + L(w + rt, w) + A(rt, w + rt, y2, 0) +
    L(W - rob, y2) + A(rob, W, y2 + rob, 1) + L(W, H - rob) + A(rob, W - rob, H, 1) + L(q, H) + A(q, 0, H - q, 1) + A(q, q, y4, 1) +
    L(W - w - rb, y4) + A(rb, W - w - rb, y3, 0) + L(rot, y3) + A(rot, 0, y3 - rot, 1) + L(0, rot) + A(rot, rot, 0, 1) + 'Z';
}

function geometry(variant, px, cap) {
  const { S, w, c, ox, oy } = grid(variant, px, cap);
  const ct = Math.round(c * (1 - SPEC.seat)), cb = 2 * c - ct, ins = Math.round(w * SPEC.seat * 2);
  const H = 3 * w + 2 * c, W = H, rt = ct / 2, rb = cb / 2, q = w / 2, y2 = w + ct, y3 = 2 * w + ct;
  const dx = w + c, R = 0.42 * dx, L1 = dx - R, L2 = Math.PI * R / 2;
  const pts = a => a.map(p => [ox + p[0], oy + p[1]]);
  const spine = pts([[W - ins - q, q], [q, q], [q, y2 + q], [W - q, y2 + q], [W - q, H - q], [q, H - q]]);
  const s0 = (w + c) / 2, beads = [];
  let acc = 0, maxSp = 0;
  for (let i = 0; i < spine.length - 1; i++) {
    const a = spine[i], b = spine[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(l / s0)), sp = l / m;
    maxSp = Math.max(maxSp, sp);
    for (let j = i === 0 ? 0 : 1; j <= m; j++) beads.push({ p: [a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m], d: acc + sp * j });
    acc += l;
  }
  return {
    variant, S, w, c, H, ox, oy, rt, rb, g: Math.max(c * SPEC.gap, 0.5), path: outline(w, ct, cb, ins, ox, oy),
    ax: ox + w + rt, ay: oy + w + rt, dx, dy: dx, R, L1, L2, LH: L1 + L2 + (dx - R), k: w / 20, s: s0, LS: acc, beads, spine,
    rs: Math.min(0.22 * Math.max(w, maxSp), 0.45 * w), rf: 0.85 * Math.max(w, maxSp),
    entry: pts([[q, H - q], [q, y3 + rb], [W - w - rb, y3 + rb]]), LE: (H - q - (y3 + rb)) + (W - w - rb - q),
    bars: [oy + q, oy + y2 + q, oy + H - q], joint: variant === 'logo' ? SPEC.joint * w : 0
  };
}

function along(pl, d) {
  for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pl.length - 2) { const t = l ? cl(d / l) : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    d -= l;
  }
}
// one leg of the loop, from the top nest to the bottom one, rounded at its corner
function leg(q, G) {
  const d = q * G.LH;
  if (d < G.L1) return [d, 0];
  if (d < G.L1 + G.L2) { const t = (d - G.L1) / G.R; return [G.dx - G.R + G.R * Math.sin(t), G.R - G.R * Math.cos(t)]; }
  return [G.dx, G.R + (d - G.L1 - G.L2)];
}
// the loop starts and ends in the bottom nest
function loop(ms, G) {
  const t = ((ms + T.half) % (2 * T.half) + 2 * T.half) % (2 * T.half), side = t < T.half ? 0 : 1, p = leg(back((t % T.half) / T.half), G);
  return side === 0 ? [G.ax + p[0], G.ay + p[1]] : [G.ax + G.dx - p[0], G.ay + G.dy - p[1]];
}
const REST = G => [G.ax + G.dx, G.ay + G.dy];

// The birth: an electron lights at the top end, lays charges along the S, the charges fuse into
// the stroke, the electron enters through the bottom opening. Played backwards, it is the end.
function birth(ti, G) {
  const br = G.beads.map(() => 0);
  if (ti < 220) return { e: along(G.spine, 0), es: outBack(cl(ti / 220)), br, solid: false };
  if (ti < 1570) {
    const p = ti < 1320 ? io((ti - 220) / 1100) * G.LS : G.LS, pe = ti < 1320 ? p : G.LS + 1.5 * G.s * ((ti - 1320) / 250);
    G.beads.forEach((b, i) => { br[i] = G.rs * outBack(cl((pe - b.d) / (1.5 * G.s))); });
    return { e: along(G.spine, p), es: 1, br, solid: false };
  }
  if (ti < 2520) {
    G.beads.forEach((b, i) => { br[i] = G.rs + (G.rf - G.rs) * io(cl((ti - 1570 - i * 35) / 380)); });
    return { e: along(G.spine, G.LS), es: 1, br, solid: false };
  }
  return { e: along(G.entry, (ti < T.intro ? io((ti - 2520) / 700) : 1) * G.LE), es: 1, br, solid: true };
}
const EMPTY = G => ({ e: REST(G), es: 0, br: G.beads.map(() => 0), solid: false });

function bandsMarkup(G, cols, phi) {
  const m = SPEC.slope, kv = SPEC.curve, S = G.S, W = G.H, x0 = G.ox, y0 = G.oy;
  const yOf = (x, b) => m * x + b + kv * W * Math.sin(Math.PI * cl((x - x0) / W));
  const lo = y0 - m * (x0 + W) - Math.max(0, kv) * W, hi = y0 + W - m * x0 + Math.max(0, -kv) * W, dl = (hi - lo) / 4, shift = phi * (hi - lo);
  const xs = []; for (let i = 0; i <= 20; i++) xs.push(-1 + (S + 2) * i / 20);
  let fill = '', cuts = '';
  // only the bands that can reach the S at this slide: the slide shifts them down by phi of the span
  for (let k = -Math.ceil(phi * 4) - 1; k < 5; k++) {
    const b1 = lo + k * dl + shift, b2 = b1 + dl, top = xs.map(x => `${f(x)} ${f(yOf(x, b1))}`);
    fill += `<polygon points="${top.join(' ')} ${xs.slice().reverse().map(x => `${f(x)} ${f(yOf(x, b2))}`).join(' ')}" fill="${cols[((k % 4) + 4) % 4]}"/>`;
    if (G.joint > 0) cuts += `<polyline points="${top.join(' ')}" fill="none" stroke="#000" stroke-width="${f(G.joint)}"/>`;
  }
  return { fill, cuts };
}

function colours(tone, accent) {
  if (Array.isArray(tone)) return tone;
  if (tone === 'mono') return ['currentColor', 'currentColor', 'currentColor', 'currentColor'];
  return (TONES[accent] || TONES.current)[tone === 'dark' ? 'dark' : 'light'];
}

// The drawing with the electron resting in the bottom nest; the element updates it in place.
function markup(G, tone, accent, id, label) {
  const S = G.S, box = `x="0" y="0" width="${S}" height="${S}"`, b = bandsMarkup(G, colours(tone, accent), 0), e = REST(G), r = G.rb - G.g;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${label}">` +
    `<defs><mask id="${id}s" maskUnits="userSpaceOnUse" ${box}><path d="${G.path}" fill="#fff"/></mask>` +
    `<mask id="${id}c" maskUnits="userSpaceOnUse" ${box}><g mask="url(#${id}s)" fill="#fff"><rect class="solid" ${box}/>` +
    (G.variant === 'logo' ? `<g class="beads" style="display:none">${G.beads.map(x => `<circle cx="${f(x.p[0])}" cy="${f(x.p[1])}" r="0"/>`).join('')}</g>` : '') +
    `</g><g class="cuts">${b.cuts}</g><circle class="h1" cx="${f(e[0])}" cy="${f(e[1])}" r="${f(G.rb)}" fill="#000"/><circle class="h2" cx="${f(e[0])}" cy="${f(e[1])}" r="${f(G.rb)}" fill="#000"/></mask></defs>` +
    `<g mask="url(#${id}c)"><g class="bands">${b.fill}</g></g>` +
    `<ellipse class="dot" cx="0" cy="0" rx="${f(r)}" ry="${f(r)}" transform="translate(${f(e[0])} ${f(e[1])})" fill="currentColor"/></svg>`;
}

export function logoSVG({ size = 256, variant = 'logo', tone = 'light', accent = 'current', label = 'Logo', id = 'slogo' } = {}) {
  return markup(geometry(variant, size, size), tone, accent, id, label);
}
export { geometry as logoGeometry, SPEC as logoSpec, TONES as logoTones };

// The name as SVG text, measured on a canvas: the words before the last one lighter, and a round
// electron, in ink, in place of the dot of the last word's i.
function wordmark(name, layout, size) {
  const ctx = document.createElement('canvas').getContext('2d'), font = (w, px) => NAME.font.replace('{w}', w).replace('{px}', px);
  const words = name.trim().split(/\s+/), last = words.pop(), lead = words.join(' ');
  ctx.font = font(NAME.strong, 100);
  const ratio = ctx.measureText('h').actualBoundingBoxAscent / 100 || 0.72;
  const fs = layout === 'column' ? size * (lead ? NAME.column.sizeTwo : NAME.column.size) : size * NAME.row.ascender / ratio, ls = NAME.track * fs;
  ctx.letterSpacing = `${ls}px`;
  let x0 = 0, head = '';
  if (lead) {
    ctx.font = font(NAME.light, fs);
    const space = ctx.measureText(' ').width * 0.9;
    x0 = ctx.measureText(lead).width + space;
    head = `<tspan style="font-weight:${NAME.light}">${lead}</tspan><tspan dx="${f(space)}">`;
  }
  ctx.font = font(NAME.strong, fs);
  const asc = ctx.measureText('h').actualBoundingBoxAscent, xh = ctx.measureText('x').actualBoundingBoxAscent;
  const l = ctx.measureText('l'), stem = l.actualBoundingBoxRight + l.actualBoundingBoxLeft;
  const at = last.indexOf('i'), tail = at < 0 ? last : last.slice(0, at) + 'ı' + last.slice(at + 1);
  const W = Math.ceil(x0 + ctx.measureText(tail).width - ls), pad = Math.ceil(fs * 0.1), H = Math.ceil(asc + 2 * pad);
  let dot = '';
  if (at >= 0) {
    const r = stem * 0.62, cx = x0 + ctx.measureText(tail.slice(0, at)).width + (ctx.measureText('ı').width - ls) / 2;
    dot = `<circle cx="${f(cx)}" cy="${f(pad + asc - xh - stem * 0.55 - r)}" r="${f(r)}" fill="currentColor"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="display:block;overflow:visible">` +
    `<text x="0" y="${f(pad + asc)}" fill="currentColor" style="font:${font(NAME.strong, f(fs))};letter-spacing:${f(ls)}px">${lead ? head + tail + '</tspan>' : tail}</text>${dot}</svg>`;
}

const motionOff = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let uid = 0;
const live = new Set();
let ticking = false;
function tick(now) {
  live.forEach(el => el._frame(now));
  ticking = live.size > 0;
  if (ticking) requestAnimationFrame(tick);
}

if (typeof HTMLElement !== 'undefined' && typeof customElements !== 'undefined' && !customElements.get('s-logo')) {
  customElements.define('s-logo', class extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size', 'state', 'tone', 'accent', 'label', 'name', 'layout']; }
    connectedCallback() {
      this.style.display = 'inline-block';
      this._id = 'slogo' + (uid++) + '-';
      this._dark = matchMedia('(prefers-color-scheme: dark)');
      this._onTheme = () => this._paint();
      this._dark.addEventListener('change', this._onTheme);
      this._watch = new MutationObserver(this._onTheme);
      this._watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this._build();
      this._enter(this.getAttribute('state') || 'static');
      // the name is measured again once its font has arrived
      if (this.getAttribute('name') && document.fonts) Promise.all([NAME.strong, NAME.light].map(w => document.fonts.load(NAME.font.replace('{w}', w).replace('{px}', 100)))).then(() => this._word(), () => {});
    }
    disconnectedCallback() { live.delete(this); this._dark.removeEventListener('change', this._onTheme); this._watch.disconnect(); }
    attributeChangedCallback(name, was, now) {
      if (!this._G || was === now) return;
      if (name === 'state') this._enter(now || 'static');
      else if (name === 'tone' || name === 'accent') this._paint();
      else { this._build(); this._enter(this.getAttribute('state') || 'static'); }
    }
    _tone() {
      const t = this.getAttribute('tone') || 'auto';
      if (t !== 'auto') return t;
      const forced = (this.closest('[data-theme]') || document.documentElement).getAttribute('data-theme');
      return forced === 'dark' || (forced !== 'light' && this._dark.matches) ? 'dark' : 'light';
    }
    _build() {
      const dpr = window.devicePixelRatio || 1, variant = this.getAttribute('variant') || 'logo';
      let cap = 0;
      if (variant === 'text') {
        const cs = getComputedStyle(this.parentElement || this), ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        cap = ctx.measureText('H').actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.7;
      }
      const px = (+this.getAttribute('size') || (variant === 'icon' ? 16 : 64)) * dpr;
      const G = this._G = geometry(variant, px, cap * dpr);
      const mark = markup(G, this._tone(), this.getAttribute('accent'), this._id, this._label()), name = this.getAttribute('name');
      if (name) {
        const col = this.getAttribute('layout') === 'column', css = G.S / dpr;
        this.innerHTML = `<span style="display:inline-flex;align-items:center;flex-direction:${col ? 'column' : 'row'};gap:${f(css * (col ? NAME.column.gap : NAME.row.gap))}px">${mark}<span class="sl-word"></span></span>`;
      } else this.innerHTML = mark;
      const svg = this.querySelector('svg');
      svg.setAttribute('width', f(G.S / dpr)); svg.setAttribute('height', f(G.S / dpr));
      svg.style.display = 'block';
      this.style.verticalAlign = variant === 'text' ? 'baseline' : 'middle';
      if (variant === 'text') this.style.margin = '0 0.12em';
      const q = s => svg.querySelector(s);
      this._el = { svg, h1: q('.h1'), h2: q('.h2'), dot: q('.dot'), solid: q('.solid'), beads: q('.beads'), bands: q('.bands'), cuts: q('.cuts') };
      this._el.bead = this._el.beads ? [...this._el.beads.children] : [];
      this._word();
    }
    _word() {
      const box = this.querySelector('.sl-word'), name = this.getAttribute('name');
      if (box && name) box.innerHTML = wordmark(name, this.getAttribute('layout'), this._G.S / (window.devicePixelRatio || 1));
    }
    _label() { return this.getAttribute('label') || (this.getAttribute('state') === 'busy' ? 'Loading' : this.getAttribute('name') || 'Logo'); }
    _paint() {
      const b = bandsMarkup(this._G, colours(this._tone(), this.getAttribute('accent')), this._phi || 0);
      this._el.bands.innerHTML = b.fill; this._el.cuts.innerHTML = b.cuts;
    }
    _enter(state) {
      const now = performance.now(), G = this._G;
      this._el.svg.setAttribute('aria-label', this._label());
      this.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
      if (state === 'done') {
        if (this._state !== 'busy') { this._state = 'static'; this.dispatchEvent(new Event('s-logo-end')); return; }
        const tb = now - this._since, lead = this._intro ? T.intro : 0;
        this._endAt = this._since + (tb < lead ? lead : lead + Math.ceil((tb - lead) / (2 * T.half)) * 2 * T.half);
      } else {
        this._since = now; this._endAt = null;
        this._intro = state === 'busy' && G.variant === 'logo' && !this.hasAttribute('no-intro');
      }
      this._state = state;
      if (state === 'static' || motionOff()) { live.delete(this); this._phi = 0; this._paint(); this._draw(this._still()); if (state === 'done') this._finish(); return; }
      live.add(this);
      if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    }
    _still() { return { e: REST(this._G), es: 1, br: [], solid: true }; }
    _finish() { this._state = 'static'; live.delete(this); this.dispatchEvent(new Event('s-logo-end')); }
    _at(now) {
      const G = this._G, logo = G.variant === 'logo';
      if (this._state === 'demo') {
        const cyc = T.empty + T.intro + T.loops * 2 * T.half + T.outro + T.tail;
        let t = ((now - this._since) % cyc + cyc) % cyc;
        if (t < T.empty) return EMPTY(G); t -= T.empty;
        if (t < T.intro) return birth(t, G); t -= T.intro;
        if (t < T.loops * 2 * T.half) return { e: loop(t, G), es: 1, br: [], solid: true }; t -= T.loops * 2 * T.half;
        if (t < T.outro) return birth(T.outro - t, G);
        return EMPTY(G);
      }
      if (this._state === 'done' && now >= this._endAt) {
        if (!logo) return null;
        const t = now - this._endAt;
        return t < T.outro ? birth(T.outro - t, G) : null;
      }
      const t = now - this._since, lead = this._intro ? T.intro : 0;
      return t < lead ? birth(t, G) : { e: loop(t - lead, G), es: 1, br: [], solid: true };
    }
    _frame(now) {
      const s = this._at(now);
      if (!s) { if (this._G.variant === 'logo') this._draw(EMPTY(this._G)); else this._draw(this._still()); this._finish(); return; }
      const nx = this._at(now + 8) || s, tr = this._at(now - 110) || s;
      s.v = Math.hypot(nx.e[0] - s.e[0], nx.e[1] - s.e[1]) / 8 / this._G.k;
      s.ang = s.v > 1e-4 ? Math.atan2(nx.e[1] - s.e[1], nx.e[0] - s.e[0]) * 180 / Math.PI : 90;
      s.tr = tr.e;
      if (this._G.variant === 'logo') { this._phi = ((now - this._since) / SPEC.flow) % 1; this._paint(); }
      this._draw(s);
    }
    _draw(s) {
      const G = this._G, E = this._el, v = s.v || 0, tr = s.tr || s.e;
      const rAt = y => G.rt + (G.rb - G.rt) * cl((y - G.ay) / G.dy);
      const near = y => Math.max(...G.bars.map(by => sm(0, 1, 1 - Math.min(1, Math.abs(y - by) / (G.w / 2 + rAt(y))))));
      const mv = Math.min(1, v * 8), on = s.es > 0;
      E.solid.style.display = s.solid ? '' : 'none';
      if (E.beads) { E.beads.style.display = s.solid ? 'none' : ''; if (!s.solid) E.bead.forEach((c, i) => c.setAttribute('r', f(Math.max(0, s.br[i] || 0)))); }
      E.h1.setAttribute('cx', f(s.e[0])); E.h1.setAttribute('cy', f(s.e[1])); E.h1.setAttribute('r', f(on ? rAt(s.e[1]) + (1.2 * mv + 3 * near(s.e[1])) * G.k : 0));
      E.h2.setAttribute('cx', f(tr[0])); E.h2.setAttribute('cy', f(tr[1])); E.h2.setAttribute('r', f(on ? rAt(tr[1]) + (0.66 * mv + 1.8 * near(tr[1])) * G.k : 0));
      const r = rAt(s.e[1]) - G.g, sx = 1 + Math.min(0.16, v * 1.1), k = Math.max(0, s.es);
      E.dot.setAttribute('rx', f(r)); E.dot.setAttribute('ry', f(r));
      E.dot.setAttribute('transform', `translate(${f(s.e[0])} ${f(s.e[1])}) rotate(${f(s.ang || 90)}) scale(${f(sx * k)} ${f(k / sx)})`);
    }
  });
}
