/* Book behaviour shared by every page: language switch, theme, mobile drawer and
   concept toggletips. Everything a page needs is embedded in the page itself (the
   concept data sits in <script type="application/json" id="bk-data">), because each
   published page is encrypted on its own.

   Language: English text lives in the element, French in data-fr (HTML). Same storage
   key and ?lang= parameter as before; widgets listen to the "langchange" event and use
   window.courseLang / window.courseFmt. */
(function () {
  var KEY = 'sd-lang', THEME = 'sd-theme';
  var doc = document, root = doc.documentElement;
  var all = function (sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); };

  /* ---------- language ---------- */
  var nodes = all('[data-fr]');
  var arias = all('[data-fr-aria]');
  var titleMeta = doc.querySelector('meta[name="title-fr"]');
  var titles = { en: doc.title, fr: titleMeta ? titleMeta.getAttribute('content') : doc.title };
  nodes.forEach(function (n) { n.setAttribute('data-en', n.innerHTML); });
  arias.forEach(function (n) { n.setAttribute('data-en-aria', n.getAttribute('aria-label') || ''); });

  function isLocalPage(h) { return h && !/^[a-z][a-z0-9+.-]*:/i.test(h) && /\.html(\?|#|$)/.test(h); }
  function withLang(href, l) {
    var hash = '', i = href.indexOf('#');
    if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    href = href.replace(/([?&])lang=(en|fr)&?/, '$1').replace(/[?&]$/, '');
    return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + l + hash;
  }
  window.courseFmt = function (x, d) {
    var s = x.toFixed(d);
    return window.courseLang === 'fr' ? s.replace('.', ',') : s;
  };
  function langHash(l) {
    // Pages built from Markdown give their French headings the English id + "-fr".
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    var target = null;
    if (l === 'fr' && !/-fr$/.test(h)) target = doc.getElementById(h + '-fr');
    if (l === 'en' && /-fr$/.test(h)) target = doc.getElementById(h.slice(0, -3));
    if (target) target.scrollIntoView();
  }
  function apply(l) {
    window.courseLang = l;
    root.lang = l;
    doc.title = titles[l];
    nodes.forEach(function (n) { n.innerHTML = n.getAttribute(l === 'fr' ? 'data-fr' : 'data-en'); });
    arias.forEach(function (n) { n.setAttribute('aria-label', n.getAttribute(l === 'fr' ? 'data-fr-aria' : 'data-en-aria')); });
    all('.bk-lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === l)); });
    all('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (isLocalPage(h) && !a.hasAttribute('data-keep-lang')) a.setAttribute('href', withLang(h, l));
    });
    try { localStorage.setItem(KEY, l); } catch (e) {}
    armMarks();
    closePop();
    doc.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }

  /* ---------- theme ---------- */
  var themeBtn = doc.querySelector('.bk-theme');
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_LABEL = {
    en: { auto: 'Theme: automatic', light: 'Theme: light', dark: 'Theme: dark' },
    fr: { auto: 'Thème : automatique', light: 'Thème : clair', dark: 'Thème : sombre' }
  };
  var ICON = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
  };
  function currentTheme() { var t = null; try { t = localStorage.getItem(THEME); } catch (e) {} return THEMES.indexOf(t) >= 0 ? t : 'auto'; }
  function showTheme(t) {
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    if (themeBtn) {
      var l = window.courseLang === 'fr' ? 'fr' : 'en';
      themeBtn.innerHTML = ICON[t];
      themeBtn.setAttribute('aria-label', THEME_LABEL[l][t]);
      themeBtn.setAttribute('title', THEME_LABEL[l][t]);
    }
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var t = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
    try { localStorage.setItem(THEME, t); } catch (e) {}
    showTheme(t);
  });
  doc.addEventListener('langchange', function () { showTheme(currentTheme()); });

  /* ---------- drawer (narrow screens) ---------- */
  var shell = doc.querySelector('.bk');
  var side = doc.getElementById('bk-side');
  var menuBtn = doc.querySelector('.bk-menu');
  var scrim = null;
  function drawerOpen() { return shell && shell.classList.contains('bk-open'); }
  function openDrawer() {
    shell.classList.add('bk-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    scrim = doc.createElement('div');
    scrim.className = 'bk-scrim';
    scrim.addEventListener('click', closeDrawer);
    shell.appendChild(scrim);
    var cur = side.querySelector('[aria-current="page"]') || side.querySelector('a');
    if (cur) cur.focus();
  }
  function closeDrawer(focusBack) {
    if (!drawerOpen()) return;
    shell.classList.remove('bk-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (scrim) { scrim.remove(); scrim = null; }
    if (focusBack !== false) menuBtn.focus();
  }
  if (menuBtn && side) {
    menuBtn.addEventListener('click', function () { drawerOpen() ? closeDrawer() : openDrawer(); });
    side.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', function (m) { if (m.matches) closeDrawer(false); });
  }
  if (side) {
    var cur = side.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView && window.matchMedia('(min-width: 1081px)').matches) {
      var r = cur.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 40) side.scrollTop += r.top - window.innerHeight / 3;
    }
  }

  /* ---------- concept toggletips ---------- */
  var data = { concepts: {} };
  var dataEl = doc.getElementById('bk-data');
  if (dataEl) { try { data = JSON.parse(dataEl.textContent); } catch (e) {} }
  var T = {
    en: { ref: 'Reference', also: 'Also cited in', related: 'Related', close: 'Close', glossary: 'Glossary entry', here: 'defined on this page' },
    fr: { ref: 'Référence', also: 'Cité aussi dans', related: 'Voir aussi', close: 'Fermer', glossary: 'Entrée du glossaire', here: 'défini sur cette page' }
  };
  var pop = doc.createElement('div');
  pop.className = 'bk-pop';
  pop.id = 'bk-pop';
  pop.setAttribute('role', 'dialog');
  pop.hidden = true;
  doc.body.appendChild(pop);
  var owner = null, pinned = false, timer = null, refocusing = false;

  function armMarks() {
    all('.cx').forEach(function (m) {
      m.setAttribute('role', 'button');
      m.setAttribute('tabindex', '0');
      m.setAttribute('aria-expanded', 'false');
      m.setAttribute('aria-controls', 'bk-pop');
      m.setAttribute('aria-haspopup', 'dialog');
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function L(o) { var l = window.courseLang === 'fr' ? 'fr' : 'en'; return o && (o[l] || o.en) || ''; }
  function link(href, text) {
    var h = isLocalPage(href) ? withLang(href, window.courseLang || 'en') : href;
    return '<a href="' + esc(h) + '">' + text + '</a>';
  }
  function fill(id) {
    var c = data.concepts[id];
    if (!c) return false;
    var l = window.courseLang === 'fr' ? 'fr' : 'en', t = T[l];
    var other = l === 'fr' ? c.t.en : c.t.fr;
    var sep = l === 'fr' ? ' : ' : ': ';
    var h = '<button type="button" class="bk-close" aria-label="' + t.close + '">×</button>' +
      '<h2 id="bk-pop-t">' + esc(L(c.t)) + (other && other !== L(c.t) ? ' <small style="font-weight:500;color:var(--muted)">' + esc(other) + '</small>' : '') + '</h2>' +
      '<p id="bk-pop-d">' + L(c.d) + '</p>';
    if (c.ref) {
      h += '<p class="bk-ref">' + t.ref + sep +
        (c.ref.here ? link(c.ref.href, esc(L(c.ref.title))) + ' <span class="bk-st" style="margin:0">' + t.here + '</span>'
                    : link(c.ref.href, esc(L(c.ref.title)))) + '</p>';
    }
    if (c.cited && c.cited.length) {
      h += '<div class="bk-also">' + t.also + '<ul>' + c.cited.slice(0, 6).map(function (p) { return '<li>' + link(p.href, esc(L(p.title))) + '</li>'; }).join('') +
        (c.cited.length > 6 ? '<li>' + link(c.gloss, (l === 'fr' ? 'et ' : 'and ') + (c.cited.length - 6) + (l === 'fr' ? ' autres' : ' more')) + '</li>' : '') + '</ul></div>';
    }
    var rel = (c.rel || []).map(function (r) { return link(r.href, esc(L(r.t))); });
    if (rel.length) h += '<p class="bk-also">' + t.related + sep + rel.join(', ') + '</p>';
    if (c.gloss) h += '<p class="bk-hint">' + link(c.gloss, t.glossary) + '</p>';
    pop.innerHTML = h;
    pop.setAttribute('aria-labelledby', 'bk-pop-t');
    pop.querySelector('.bk-close').addEventListener('click', function () { closePop(true); });
    return true;
  }
  function place(m) {
    var rects = m.getClientRects(), r = rects.length ? rects[0] : m.getBoundingClientRect();
    pop.style.left = '0px'; pop.style.top = '0px';
    var pw = pop.offsetWidth, ph = pop.offsetHeight, vw = doc.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.max(12, Math.min(r.left, vw - pw - 12));
    var top = r.bottom + 8;
    if (top + ph > vh - 8 && r.top - ph - 8 > 8) top = r.top - ph - 8;
    pop.style.left = left + 'px';
    pop.style.top = Math.max(8, top) + 'px';
  }
  function openPop(m, pin) {
    clearTimeout(timer);
    if (owner && owner !== m) closePop();
    if (owner !== m && !fill(m.getAttribute('data-c'))) return;
    owner = m;
    pinned = pinned || !!pin;
    pop.hidden = false;
    m.setAttribute('aria-expanded', 'true');
    m.setAttribute('aria-describedby', 'bk-pop-d');
    place(m);
  }
  function closePop(focusBack) {
    clearTimeout(timer);
    if (!owner) { pop.hidden = true; return; }
    var m = owner;
    owner = null; pinned = false;
    pop.hidden = true;
    m.setAttribute('aria-expanded', 'false');
    m.removeAttribute('aria-describedby');
    if (focusBack && doc.contains(m)) { refocusing = true; m.focus(); refocusing = false; }
  }
  function later(fn, ms) { clearTimeout(timer); timer = setTimeout(fn, ms); }
  function focusables() { return all('a[href],button', pop); }

  doc.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var m = e.target.closest && e.target.closest('.cx');
    if (m) { later(function () { openPop(m, false); }, 180); }
    else if (pop.contains(e.target)) clearTimeout(timer);
  });
  doc.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse' || pinned) return;
    var from = e.target.closest && (e.target.closest('.cx') || (pop.contains(e.target) ? pop : null));
    if (!from) return;
    var to = e.relatedTarget;
    if (to && (pop.contains(to) || (owner && owner.contains(to)))) return;
    later(function () { if (!pinned) closePop(); }, 260);
  });
  doc.addEventListener('focusin', function (e) {
    if (refocusing) return;
    var m = e.target.closest && e.target.closest('.cx');
    if (m && m.matches(':focus-visible')) openPop(m, false);
    else if (owner && !pop.contains(e.target) && e.target !== owner && !pinned) closePop();
  });
  doc.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('.cx');
    if (m) {
      e.preventDefault();
      if (owner === m && pinned) closePop(); else { closePop(); openPop(m, true); }
      return;
    }
    if (owner && !pop.contains(e.target)) closePop();
  });
  doc.addEventListener('keydown', function (e) {
    var m = e.target.closest && e.target.closest('.cx');
    if (m && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openPop(m, true);
      var f = focusables();
      if (f.length > 1) f[1].focus(); else if (f.length) f[0].focus();
      return;
    }
    if (e.key === 'Escape' && owner) { closePop(true); return; }
    if (e.key === 'Tab' && owner && pop.contains(e.target)) {
      var list = focusables();
      var i = list.indexOf(e.target);
      if ((!e.shiftKey && i === list.length - 1) || (e.shiftKey && i === 0)) { e.preventDefault(); closePop(true); }
    }
  });
  window.addEventListener('resize', function () { if (owner) place(owner); });
  window.addEventListener('scroll', function () { if (owner) place(owner); }, { passive: true });

  /* ---------- start ---------- */
  all('.bk-lang button').forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-set')); }); });
  var fromUrl = new URLSearchParams(location.search).get('lang');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var first = fromUrl === 'fr' || fromUrl === 'en' ? fromUrl : (stored === 'fr' ? 'fr' : 'en');
  apply(first);
  langHash(first);
  window.addEventListener('hashchange', function () { langHash(window.courseLang); });
})();
