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
  var holders = all('[data-fr-placeholder]');
  holders.forEach(function (n) { n.setAttribute('data-en-placeholder', n.getAttribute('placeholder') || ''); });
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
    holders.forEach(function (n) { n.setAttribute('placeholder', n.getAttribute(l === 'fr' ? 'data-fr-placeholder' : 'data-en-placeholder')); });
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

  /* ---------- appearance: style (classic, modern, sepia), theme and text size, kept in this browser ---------- */
  var THEME = 'sd-theme', STYLE = 'sd-style', SIZE = 'sd-size';
  var lookBtn = doc.querySelector('.bk-look'), lookPanel = doc.getElementById('bk-look');
  function lookGet(k, d) { var v = null; try { v = localStorage.getItem(k); } catch (e) {} return v || d; }
  function lookSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function applyLook() {
    var t = lookGet(THEME, 'auto'), y = lookGet(STYLE, 'classic'), z = lookGet(SIZE, '1');
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    if (y === 'classic') root.removeAttribute('data-style'); else root.setAttribute('data-style', y);
    root.style.setProperty('--bk-scale', z);
    var now = { theme: t, style: y, size: z };
    all('.bk-seg').forEach(function (g) {
      all('button', g).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === now[g.getAttribute('data-look')])); });
    });
  }
  function closeLook() { if (lookPanel && !lookPanel.hidden) { lookPanel.hidden = true; lookBtn.setAttribute('aria-expanded', 'false'); } }
  if (lookBtn && lookPanel) {
    lookBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      lookPanel.hidden = !lookPanel.hidden;
      lookBtn.setAttribute('aria-expanded', String(!lookPanel.hidden));
    });
    lookPanel.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      var key = { theme: THEME, style: STYLE, size: SIZE }[b.parentNode.getAttribute('data-look')];
      lookSet(key, b.getAttribute('data-v'));
      applyLook();
    });
    doc.addEventListener('click', closeLook);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLook(); });
  }
  applyLook();

  /* ---------- the book's menu: beside the text on wide screens (Contents hides or shows it),
     a card over the page elsewhere ---------- */
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
  var wide = window.matchMedia('(min-width:1280px)');
  function docked() { return wide.matches && root.getAttribute('data-side') !== 'off'; }
  function syncMenuBtn() { if (wide.matches) menuBtn.setAttribute('aria-expanded', String(docked())); }
  if (menuBtn && side) {
    menuBtn.addEventListener('click', function () {
      if (wide.matches) {
        var off = docked();
        if (off) root.setAttribute('data-side', 'off'); else root.removeAttribute('data-side');
        try { localStorage.setItem('sd-side', off ? 'off' : 'on'); } catch (e) {}
        closeDrawer(false); syncMenuBtn(); return;
      }
      drawerOpen() ? closeDrawer() : openDrawer();
    });
    if (wide.addEventListener) wide.addEventListener('change', function () { closeDrawer(false); syncMenuBtn(); });
    syncMenuBtn();
    var curCh = side.querySelector(".bk-cur > a");
    if (docked() && curCh) side.scrollTop = Math.max(0, curCh.offsetTop - side.clientHeight / 3);
    side.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ---------- reading progress: a hairline under the top bar; the margin contents follow the reader ---------- */
  var bar = doc.querySelector('.bk-progress span');
  /* the menu's card for the page being read: how far the reader is */
  var curBar = doc.querySelector('.bk-ch.bk-cur .bk-chp i');
  var tocLinks = all('.bk-prose .toc ol a');
  function onScroll() {
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    var done = h > 0 ? Math.min(100, window.scrollY / h * 100) : 0;
    if (bar) bar.style.width = done + '%';
    if (curBar) curBar.style.width = done + '%';
    root.classList.toggle('bk-scrolled', window.scrollY > 600);
    var cur = null;
    tocLinks.forEach(function (a) {
      if (!a.offsetParent) return;
      var t = doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (t && t.getBoundingClientRect().top < 140) cur = a;
    });
    tocLinks.forEach(function (a) { a.classList.toggle('bk-here', a === cur); });
  }
  /* a section chosen in the margin glides into place (unless the reader asked for less motion) */
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  tocLinks.concat(all('.bk-totop')).forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1)), t = doc.getElementById(id);
      if (a.classList.contains('bk-totop')) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: calm.matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', location.pathname + location.search);
        return;
      }
      if (!t || calm.matches) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', '#' + id);
    });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  doc.addEventListener('langchange', onScroll);

  /* ---------- chapters read: the menu marks the pages this browser has opened ---------- */
  var READ = 'sd-read', read = [];
  try { read = JSON.parse(localStorage.getItem(READ) || '[]'); } catch (e) {}
  var here = doc.querySelector('.bk-ch.bk-cur');
  if (here) {
    var p = here.getAttribute('data-page');
    if (read.indexOf(p) < 0) { read.push(p); try { localStorage.setItem(READ, JSON.stringify(read)); } catch (e) {} }
  }
  all('.bk-ch[data-page]').forEach(function (li) { if (read.indexOf(li.getAttribute('data-page')) >= 0) li.classList.add('bk-read'); });

  /* each part: chapters read out of its chapters, as a count and a hairline */
  all('details.bk-part').forEach(function (part) {
    var chs = all('.bk-chapters > .bk-ch:not(.bk-planned)', part), n = chs.filter(function (li) { return li.classList.contains('bk-read'); }).length;
    var count = part.querySelector('.bk-pcount'), line = part.querySelector('.bk-pbar i');
    if (!chs.length || !n) return;
    part.classList.add('bk-begun');
    if (count) count.textContent = ' · ' + n + '/' + chs.length;
    if (line) line.style.width = (100 * n / chs.length) + '%';
  });
  /* ---------- source notes: a tag ([V], [I]…) opens a note in the margin, level with it ----------
     The note says what the tag means and, when a link sits right next to the tag, which source it
     is; otherwise it points to the page's sources. Without a margin (smaller screens) the note
     opens under the tag. */
  var SN = {
    en: { src: 'Source', all: 'Sources of this page' },
    fr: { src: 'Source', all: 'Sources de la page' }
  };
  var tags = all('sup.bk-src'), note = null, noteFor = null, noteTimer = null;
  function gap(a, b) {
    // the text between two nodes of the same parent, if they are close (", ", " (", "; ")
    var t = '', n = a.nextSibling;
    while (n && n !== b) { t += n.textContent; if (t.length > 4) return false; n = n.nextSibling; }
    return n === b;
  }
  function sourceOf(sup) {
    var p = sup.parentNode, links = all('a[href]', p).filter(function (a) { return !a.closest('.cx') && a.parentNode === p; });
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (sup.compareDocumentPosition(a) & 4 ? gap(sup, a) : gap(a, sup)) return a;
    }
    return null;
  }
  function sourcesHeading(sup) {
    var art = sup.closest('article') || doc;
    return all('h2[id]', art).filter(function (h) { return /^\s*sources\s*$/i.test(h.textContent); })[0] || null;
  }
  tags.forEach(function (sup) {
    var t = sup.getAttribute('title');
    if (!t) return;
    sup.setAttribute('data-t', t);
    sup.removeAttribute('title');
    sup.setAttribute('tabindex', '0');
    sup.setAttribute('aria-label', t);
  });
  function hideNote() {
    clearTimeout(noteTimer);
    if (note) note.hidden = true;
    if (noteFor) noteFor.removeAttribute('aria-describedby');
    root.classList.remove('bk-noting');
    noteFor = null;
  }
  function placeNote(sup) {
    var art = sup.closest('article') || doc, margin = art.querySelector('.toc');
    var r = sup.getBoundingClientRect(), vw = doc.documentElement.clientWidth;
    var wide = margin && margin.offsetParent && getComputedStyle(margin).display !== 'none';
    note.classList.toggle('bk-note-side', !!wide);
    root.classList.toggle('bk-noting', !!wide);   // the margin's contents step aside for the note
    if (wide) {
      var m = margin.getBoundingClientRect();
      note.style.width = m.width + 'px';
      note.style.left = m.left + 'px';
      note.style.top = Math.max(64, r.top - 8) + 'px';
    } else {
      var w = Math.min(300, vw - 24);
      note.style.width = w + 'px';
      note.style.left = Math.max(12, Math.min(r.left - 12, vw - w - 12)) + 'px';
      note.style.top = (r.bottom + 6) + 'px';
    }
  }
  function showNote(sup) {
    clearTimeout(noteTimer);
    if (!note) {
      note = doc.createElement('div');
      note.className = 'bk-sidenote';
      note.id = 'bk-sidenote';
      note.setAttribute('role', 'note');
      note.addEventListener('mouseenter', function () { clearTimeout(noteTimer); });
      note.addEventListener('mouseleave', function () { noteTimer = setTimeout(hideNote, 200); });
      doc.body.appendChild(note);
    }
    var lang = (sup.closest('[lang]') || root).getAttribute('lang') === 'fr' ? 'fr' : 'en', t = SN[lang], sep = lang === 'fr' ? ' : ' : ': ';
    var src = sourceOf(sup), h = '<p><b>' + sup.textContent + '</b> ' + esc(sup.getAttribute('data-t')) + '</p>';
    if (src) {
      var host = '';
      try { host = new URL(src.href).hostname.replace(/^www\./, ''); } catch (e) {}
      h += '<p>' + t.src + sep + '<a href="' + esc(src.href) + '">' + esc(src.textContent) + '</a>' +
        (host && host !== location.hostname ? ' <span class="bk-sn-host">' + esc(host) + '</span>' : '') + '</p>';
    } else {
      var sh = sourcesHeading(sup);
      if (sh) h += '<p><a href="#' + esc(sh.id) + '">' + t.all + ' ↓</a></p>';
    }
    note.innerHTML = h;
    note.hidden = false;
    if (noteFor && noteFor !== sup) noteFor.removeAttribute('aria-describedby');
    noteFor = sup;
    sup.setAttribute('aria-describedby', 'bk-sidenote');
    placeNote(sup);
  }
  if (tags.length) {
    doc.addEventListener('mouseover', function (e) {
      var sup = e.target.closest && e.target.closest('sup.bk-src');
      if (sup && sup !== noteFor) showNote(sup);
    });
    doc.addEventListener('mouseout', function (e) {
      var sup = e.target.closest && e.target.closest('sup.bk-src');
      if (sup && !(note && note.contains(e.relatedTarget))) noteTimer = setTimeout(hideNote, 250);
    });
    doc.addEventListener('focusin', function (e) {
      var sup = e.target.closest && e.target.closest('sup.bk-src');
      if (sup) showNote(sup); else if (note && !note.contains(e.target)) hideNote();
    });
    doc.addEventListener('click', function (e) {
      var sup = e.target.closest && e.target.closest('sup.bk-src');
      if (sup) { showNote(sup); return; }
      if (note && !note.contains(e.target)) hideNote();
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && noteFor) { var s = noteFor; hideNote(); s.focus(); } });
    window.addEventListener('scroll', function () { if (noteFor) placeNote(noteFor); }, { passive: true });
    window.addEventListener('resize', function () { if (noteFor) placeNote(noteFor); });
  }
  /* ---------- concept toggletips ---------- */
  var data = { concepts: {} };
  var dataEl = doc.getElementById('bk-data');
  if (dataEl) { try { data = JSON.parse(dataEl.textContent); } catch (e) {} }
  var T = {
    en: { kind: 'Glossary', other: 'in French', ref: 'Explained in', here: 'on this page', also: 'Also used in', related: 'Related terms', close: 'Close', glossary: 'Open in the glossary', back: 'Back to', more: ['more', 'more'] },
    fr: { kind: 'Glossaire', other: 'en anglais', ref: 'Expliqué dans', here: 'sur cette page', also: 'Utilisé aussi dans', related: 'Termes liés', close: 'Fermer', glossary: 'Voir dans le glossaire', back: 'Retour à', more: ['autre', 'autres'] }
  };
  /* the symbol a definition gives in brackets, such as (α) or (γs) */
  var SYMBOL = /\(([^()\sa-zA-Z0-9]{1,2}[a-z0-9]{0,2})\)/;
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
  var trail = [];  // the concepts the reader came from, through related terms
  function fill(id, from) {
    var c = data.concepts[id];
    if (!c) return false;
    var l = window.courseLang === 'fr' ? 'fr' : 'en', t = T[l];
    var other = l === 'fr' ? c.t.en : c.t.fr;
    if (from === undefined) trail = []; else if (from) trail.push(from);
    var def = L(c.d), sym = def.replace(/<[^>]+>/g, '').match(SYMBOL);
    var h = '<button type="button" class="bk-close" aria-label="' + t.close + '">×</button>';
    if (trail.length) {
      var prev = data.concepts[trail[trail.length - 1]];
      h += '<button type="button" class="bk-back">← ' + t.back + ' ' + esc(L(prev.t)) + '</button>';
    }
    h += '<p class="bk-pop-kind">' + t.kind + '</p>' +
      '<h2 id="bk-pop-t">' + esc(L(c.t)) + (sym ? ' <span class="bk-sym">' + esc(sym[1]) + '</span>' : '') + '</h2>' +
      (other && other !== L(c.t) ? '<p class="bk-pop-other">' + t.other + ' · <i>' + esc(other) + '</i></p>' : '') +
      '<p class="bk-pop-def" id="bk-pop-d">' + def + '</p>';
    if (c.ref) {
      h += '<a class="bk-pop-ref" href="' + esc(isLocalPage(c.ref.href) ? withLang(c.ref.href, l) : c.ref.href) + '">' +
        '<span class="bk-pop-lbl">' + t.ref + (c.ref.here ? ' · ' + t.here : '') + '</span>' +
        '<span class="bk-pop-where">' + esc(L(c.ref.title)) + '</span><span class="bk-pop-go" aria-hidden="true">' + (c.ref.here ? '↓' : '→') + '</span></a>';
    }
    var rel = c.rel || [];
    if (rel.length) {
      h += '<p class="bk-pop-lbl">' + t.related + '</p><div class="bk-chips">' + rel.map(function (r) {
        var d = data.concepts[r.id];
        return d ? '<button type="button" class="bk-chip" data-go="' + esc(r.id) + '" title="' + esc(L(d.d).replace(/<[^>]+>/g, '')) + '">' + esc(L(r.t)) + '</button>'
                 : link(r.href, esc(L(r.t))).replace('<a ', '<a class="bk-chip" ');
      }).join('') + '</div>';
    }
    if (c.cited && c.cited.length) {
      h += '<p class="bk-pop-lbl">' + t.also + '</p><ul class="bk-pop-cited">' + c.cited.slice(0, 4).map(function (p) { return '<li>' + link(p.href, esc(L(p.title))) + '</li>'; }).join('') +
        (c.cited.length > 4 ? '<li>' + link(c.gloss, '+ ' + (c.cited.length - 4) + ' ' + t.more[c.cited.length - 4 > 1 ? 1 : 0]) + '</li>' : '') + '</ul>';
    }
    if (c.gloss) h += '<p class="bk-pop-foot">' + link(c.gloss, t.glossary + ' →') + '</p>';
    pop.innerHTML = h;
    pop.setAttribute('aria-labelledby', 'bk-pop-t');
    pop.querySelector('.bk-close').addEventListener('click', function () { closePop(true); });
    var back = pop.querySelector('.bk-back');
    if (back) back.addEventListener('click', function (e) { e.stopPropagation(); jump(trail.pop(), null); });
    all('.bk-chip[data-go]', pop).forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); jump(b.getAttribute('data-go'), id); });
    });
    return true;
  }
  function jump(id, from) {
    fill(id, from);
    pinned = true;
    if (owner) place(owner);
    var f = pop.querySelector('.bk-back') || pop.querySelector('.bk-close');
    if (f) f.focus();
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

  /* ---------- rich blocks: copy, tabs, diagrams, API contracts ---------- */
  var BASE = (doc.currentScript && doc.currentScript.src || '').replace(/book\.js(\?.*)?$/, '');
  function loadScript(src, done) {
    var s = doc.createElement('script');
    s.src = BASE + src; s.onload = done; doc.head.appendChild(s);
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.bk-copy');
    if (b) {
      var code = b.closest('.bk-code').querySelector('pre');
      var text = Array.prototype.map.call(code.querySelectorAll('code'), function (c) {
        var cl = c.cloneNode(true);
        Array.prototype.forEach.call(cl.querySelectorAll('.linenos'), function (n) { n.remove(); });
        return cl.textContent;
      }).join('\n');
      var label = b.textContent;
      var ok = function () { b.textContent = b.getAttribute('data-copied'); setTimeout(function () { b.textContent = label; }, 1400); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok);
      else { var t = doc.createElement('textarea'); t.value = text; doc.body.appendChild(t); t.select(); try { doc.execCommand('copy'); ok(); } catch (x) {} t.remove(); }
      return;
    }
    var tab = e.target.closest && e.target.closest('.bk-tabs [role=tab]');
    if (tab) {
      var box = tab.closest('.bk-tabs'), tabs = all('[role=tab]', box), panes = all('[role=tabpanel]', box), i = tabs.indexOf(tab);
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); });
      panes.forEach(function (p, k) { p.hidden = k !== i; });
    }
  });
  function dark() {
    var t = root.getAttribute('data-theme');
    return t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  // Colours a diagram may use (classDef, style, linkStyle): the course palette, light → dark.
  // Authors write the light value; the dark theme swaps it. Same table as the platform's
  // diagram/mermaid.ts, which a test keeps in step.
  var PALETTE = {
    '#b85f00': '#f2a23c', '#fff0d9': '#3a2b14', '#0b7556': '#43c79a', '#d9f1e6': '#12332a',
    '#c0392b': '#ff7d6b', '#fde3de': '#3e1d18', '#2457c5': '#7fa8ff', '#e3ebfb': '#1b2842'
  };
  // The book's ink, paper, boxes and hairlines, so diagrams look like the page around them.
  var LOOK = {
    light: { background: '#ffffff', primaryColor: '#f6f7f9', primaryBorderColor: '#c5ccd4', primaryTextColor: '#1b2129',
      lineColor: '#7b8591', textColor: '#1b2129', clusterBkg: '#fbfbfc', clusterBorder: '#c5ccd4', titleColor: '#5a636e',
      edgeLabelBackground: '#ffffff', secondaryColor: '#eef1f4', tertiaryColor: '#ffffff' },
    dark: { background: '#1a1e24', primaryColor: '#20262e', primaryBorderColor: '#3a434f', primaryTextColor: '#e7eaef',
      lineColor: '#6b7684', textColor: '#e7eaef', clusterBkg: '#1d2228', clusterBorder: '#3a434f', titleColor: '#9aa4b1',
      edgeLabelBackground: '#1a1e24', secondaryColor: '#29303a', tertiaryColor: '#1a1e24' }
  };
  function drawDiagrams() {
    var nodes = all('pre.mermaid').filter(function (n) { return n.offsetParent !== null && !n.hasAttribute('data-processed'); });
    if (!nodes.length) return;
    function run() {
      var d = dark(), look = LOOK[d ? 'dark' : 'light'];
      if (d) nodes.forEach(function (n) {
        n.textContent = n.textContent.replace(/#[0-9a-f]{6}\b/gi, function (h) { return PALETTE[h.toLowerCase()] || h; });
      });
      look.fontFamily = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
      look.fontSize = '14px';
      window.mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: look, securityLevel: 'strict',
        flowchart: { padding: 14, nodeSpacing: 36, rankSpacing: 52, curve: 'basis' } });
      window.mermaid.run({ nodes: nodes });
    }
    if (window.mermaid) run(); else loadScript('vendor/mermaid-11.17.2.min.js', run);
  }
  function drawContracts() {
    var nodes = all('.bk-openapi-doc').filter(function (n) { return n.offsetParent !== null && !n.hasAttribute('data-done'); });
    if (!nodes.length) return;
    // Redoc lays out a whole page (fixed menu, own scroll): it runs in a frame of its own.
    nodes.forEach(function (n) {
      n.setAttribute('data-done', '');
      var spec = n.getAttribute('data-spec').replace(/<\//g, '<\\/');
      var f = doc.createElement('iframe');
      f.className = 'bk-openapi-frame';
      f.title = 'OpenAPI';
      f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:Inter,system-ui,sans-serif}</style></head>' +
        '<body><div id="r"></div><script src="' + BASE + 'vendor/redoc-2.5.4.standalone.js"><\/script><script>Redoc.init(' + spec +
        ', {hideDownloadButton: true, nativeScrollbars: true, expandResponses: "200"}, document.getElementById("r"))<\/script></body></html>';
      n.appendChild(f);
    });
  }
  doc.addEventListener('langchange', function () { setTimeout(function () { drawDiagrams(); drawContracts(); }, 0); });

  /* ---------- filterable lists (decision log cards) ---------- */
  all('.bk-filter').forEach(function (bar) {
    var table = doc.getElementById(bar.getAttribute('data-for'));
    if (!table) return;
    var input = bar.querySelector('input'), buttons = all('button', bar), count = bar.querySelector('.bk-filter-n'), status = '';
    function fold(x) { return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function run() {
      var q = fold(input.value.trim()), n = 0, rows = all('tbody tr, .bk-dcard', table);
      rows.forEach(function (tr) {
        var ok = (!status || tr.getAttribute('data-status') === status) && (!q || fold(tr.textContent).indexOf(q) >= 0);
        tr.hidden = !ok; if (ok) n++;
      });
      count.textContent = n + ' / ' + rows.length;
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        status = b.getAttribute('data-status');
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        run();
      });
    });
    input.addEventListener('input', run);
    run();
  });

  /* ---------- widgets: the editor's tap demos, touch by touch ---------- */
  // Same behaviour as the app's tap-demo widget: the drawing holds the steps (g.td-step and its
  // <title>); elements show from their data-step on, until their data-until; legend lines
  // (.td-say) always show. The drawing starts with every step shown.
  var TD = {
    en: { play: 'Play', back: 'Back', next: 'Next touch', all: 'Show all', start: 'Before the first touch.', step: 'Step {k} of {n}' },
    fr: { play: 'Lancer', back: 'Retour', next: 'Toucher suivant', all: 'Tout montrer', start: 'Avant le premier toucher.', step: 'Étape {k} sur {n}' }
  };
  function num(v) { return v === null || v === '' ? null : (isFinite(+v) ? +v : null); }
  all('figure.bk-widget[data-widget="tap-demo"]').forEach(function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out');
    if (!svg || !out) return;
    var steps = all('g.td-step[data-step]', svg).map(function (g) {
      var t = g.querySelector('title');
      return { n: num(g.getAttribute('data-step')) || 0, say: t ? t.textContent : '' };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return a.n - b.n; });
    var last = steps.length, k = last, timer = null;
    if (!last) return;
    var t = TD[(fig.closest('[lang]') || root).getAttribute('lang') === 'fr' ? 'fr' : 'en'];
    out.innerHTML = '<div class="bk-td-bar"><button type="button" class="bk-td-play">' + t.play + '</button>' +
      '<button type="button">' + t.back + '</button><button type="button">' + t.next + '</button>' +
      '<button type="button" class="bk-td-all">' + t.all + '</button></div><p class="bk-td-say" aria-live="polite"></p>';
    var b = all('button', out), say = out.querySelector('.bk-td-say');
    function paint() {
      all('[data-step], [data-until]', svg).forEach(function (el) {
        var step = num(el.getAttribute('data-step')), until = num(el.getAttribute('data-until'));
        var shown = el.classList.contains('td-say') || ((step === null || step <= k) && (until === null || k < until));
        el.style.display = shown ? '' : 'none';
        el.classList.toggle('td-now', step === k);
      });
      var now = steps[k - 1];
      say.textContent = now ? t.step.replace('{k}', k).replace('{n}', last) + ' · ' + now.say : t.start;
      b[0].disabled = timer !== null; b[1].disabled = k === 0; b[2].disabled = k >= last;
    }
    function stop() { if (timer !== null) { clearTimeout(timer); timer = null; } }
    function go(to) { stop(); k = Math.max(0, Math.min(last, to)); paint(); }
    function tick() {
      if (k >= last) { timer = null; paint(); return; }
      k += 1;
      timer = k >= last ? null : setTimeout(tick, 1400);
      paint();
    }
    b[0].addEventListener('click', function () { stop(); k = 0; timer = setTimeout(tick, 1400); paint(); });
    b[1].addEventListener('click', function () { go(k - 1); });
    b[2].addEventListener('click', function () { go(k + 1); });
    b[3].addEventListener('click', function () { go(last); });
    paint();
  });


  /* ---------- widgets: the palette playground (design/palette) ---------- */
  // The drawing paints itself from --pl-* custom properties; the buttons set them on the <svg>
  // and the table gives each colour's contrast on the chosen paper (WCAG relative luminance).
  var PL = {
    grounds: [
      { id: 'stone', en: 'Stone', fr: 'Pierre', ground: '#ECE9E3', paper: '#FBFAF8', line: '#DDD8CF' },
      { id: 'linen', en: 'Linen', fr: 'Lin', ground: '#F4F1EA', paper: '#FFFFFF', line: '#E4DFD4' },
      { id: 'clay', en: 'Clay', fr: 'Argile', ground: '#EFE6DC', paper: '#FCF8F3', line: '#E0D3C4' },
      { id: 'sage', en: 'Sage', fr: 'Sauge', ground: '#E6EAE4', paper: '#FAFBF8', line: '#D5DBD2' },
      { id: 'mist', en: 'Mist', fr: 'Brume', ground: '#E9ECEE', paper: '#FBFCFD', line: '#D8DDE1' },
      { id: 'night', en: 'Night', fr: 'Nuit', ground: '#16181D', paper: '#1F2228', line: '#30343C', dark: true }
    ],
    accents: [
      { id: 'spark', en: 'Spark', fr: 'Étincelle', live: '#FFC400', solar: '#F2A900', battery: ['#B5653A', '#E0A27F'], sel: ['#1E6B5C', '#7FC7B3'], selsoft: '#E3EFEB' },
      { id: 'current', en: 'Live current', fr: 'Courant', live: '#00B8A9', solar: '#F0A500', battery: ['#5148C8', '#A9A3F2'], sel: ['#00796F', '#5FD3C6'], selsoft: '#DDF3F0' },
      { id: 'volt', en: 'Volt', fr: 'Volt', live: '#C8EE00', solar: '#D69A00', battery: ['#6C4BD8', '#B8A6F5'], sel: ['#0F5C46', '#8FD9B9'], selsoft: '#E1EEE8' }
    ],
    text: {
      en: { ground: 'Ground', accent: 'Accent', colour: 'Colour', role: 'Role', contrast: 'Contrast on paper', safe: 'text-safe', fill: 'fill only',
        roles: { ink: 'text, primary button', muted: 'labels', live: 'power now, main action', solar: 'production', battery: 'storage', sel: 'tool and selection', gain: 'gain', loss: 'loss' } },
      fr: { ground: 'Fond', accent: 'Accent', colour: 'Couleur', role: 'Rôle', contrast: 'Contraste sur le papier', safe: 'lisible en texte', fill: 'fond seulement',
        roles: { ink: 'texte, bouton principal', muted: 'libellés', live: 'puissance du moment, action principale', solar: 'production', battery: 'stockage', sel: 'outil et sélection', gain: 'gain', loss: 'perte' } }
    }
  };
  function plLum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function plRatio(a, b) { var x = plLum(a), y = plLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  all('figure.bk-widget[data-widget="palette"]').forEach(function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out');
    if (!svg || !out) return;
    var lang = (fig.closest('[lang]') || root).getAttribute('lang') === 'fr' ? 'fr' : 'en', t = PL.text[lang];
    var g = PL.grounds[0], a = PL.accents[0];
    function buttons(list, cls) {
      return list.map(function (x, i) { return '<button type="button" class="bk-pl-btn ' + cls + '" data-i="' + i + '"' + (cls === 'bk-pl-g' ? ' style="--sw:' + x.ground + ';--sp:' + x.paper + '"' : ' style="--sw:' + x.live + '"') + '>' + x[lang] + '</button>'; }).join('');
    }
    out.innerHTML = '<div class="bk-pl-bar"><span>' + t.ground + '</span>' + buttons(PL.grounds, 'bk-pl-g') + '</div>' +
      '<div class="bk-pl-bar"><span>' + t.accent + '</span>' + buttons(PL.accents, 'bk-pl-a') + '</div>' +
      '<table class="bk-pl-table"><thead><tr><th>' + t.colour + '</th><th>' + t.role + '</th><th>' + t.contrast + '</th></tr></thead><tbody></tbody></table>';
    var body = out.querySelector('tbody');
    function paint() {
      var d = g.dark ? 1 : 0;
      var v = { ground: g.ground, paper: g.paper, line: g.line, ink: d ? '#ECE9E3' : '#17191E', muted: d ? '#A5ABB4' : '#5B6068', live: a.live, solar: a.solar,
        battery: a.battery[d], sel: a.sel[d], selsoft: d ? '#24332F' : a.selsoft, gain: d ? '#6FCF97' : '#2E7D4F', gainsoft: d ? '#1D3326' : '#E3F1E8',
        loss: d ? '#F08A73' : '#B3412C', losssoft: d ? '#3A221D' : '#F6E1DB', btn: d ? '#ECE9E3' : '#17191E', btntext: d ? '#16181D' : '#FBFAF8' };
      Object.keys(v).forEach(function (k) { svg.style.setProperty('--pl-' + k, v[k]); });
      body.innerHTML = ['ink', 'muted', 'live', 'solar', 'battery', 'sel', 'gain', 'loss'].map(function (k) {
        var r = plRatio(v[k], v.paper), ok = r >= 4.5;
        return '<tr><td><span class="bk-pl-sw" style="background:' + v[k] + '"></span><code>' + v[k] + '</code></td><td>' + t.roles[k] + '</td><td>' + r.toFixed(1) + ':1 · ' + (ok ? t.safe : t.fill) + '</td></tr>';
      }).join('');
      all('.bk-pl-g', out).forEach(function (b, i) { b.setAttribute('aria-pressed', PL.grounds[i] === g ? 'true' : 'false'); });
      all('.bk-pl-a', out).forEach(function (b, i) { b.setAttribute('aria-pressed', PL.accents[i] === a ? 'true' : 'false'); });
    }
    all('.bk-pl-g', out).forEach(function (b) { b.addEventListener('click', function () { g = PL.grounds[+b.getAttribute('data-i')]; paint(); }); });
    all('.bk-pl-a', out).forEach(function (b) { b.addEventListener('click', function () { a = PL.accents[+b.getAttribute('data-i')]; paint(); }); });
    paint();
  });
  /* ---------- actions: late due dates, owner filter on the board ---------- */
  var today = new Date().toISOString().slice(0, 10);
  all('.bk-tk-due[data-due]').forEach(function (d) { if (d.getAttribute('data-due') < today) d.classList.add('bk-late'); });
  all('.bk-board-bar').forEach(function (bar) {
    var art = bar.closest('article') || doc, buttons = all('button', bar);
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var o = b.getAttribute('data-owner');
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        all('.bk-card', art).forEach(function (c) { c.hidden = !!o && (' ' + c.getAttribute('data-owners') + ' ').indexOf(' ' + o + ' ') < 0; });
      });
    });
  });

  /* ---------- galleries: a thumbnail opens full size, with previous / next ---------- */
  var LB = { en: ['Close', 'Previous image', 'Next image'], fr: ['Fermer', 'Image précédente', 'Image suivante'] };
  var box = null, shots = [], at = 0;
  function shown(btn) {
    var imgs = all('img', btn);
    return imgs.filter(function (i) { return getComputedStyle(i).display !== 'none'; })[0] || imgs[0];
  }
  function lightbox() {
    if (box) return box;
    box = doc.createElement('dialog');
    box.className = 'bk-lightbox';
    box.innerHTML = '<img alt=""><p><b></b><span></span></p>' +
      '<button type="button" class="bk-lb-close">×</button>' +
      '<button type="button" class="bk-lb-prev">‹</button><button type="button" class="bk-lb-next">›</button>';
    box.querySelector('.bk-lb-close').addEventListener('click', function () { box.close(); });
    box.querySelector('.bk-lb-prev').addEventListener('click', function () { show(at - 1); });
    box.querySelector('.bk-lb-next').addEventListener('click', function () { show(at + 1); });
    // A click on the backdrop (outside the box) closes it.
    box.addEventListener('click', function (e) {
      var r = box.getBoundingClientRect();
      if (e.target === box && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) box.close();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(at - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(at + 1); e.preventDefault(); }
    });
    box.addEventListener('close', function () { if (shots[at]) shots[at].focus(); });
    doc.body.appendChild(box);
    return box;
  }
  function show(i) {
    if (i < 0 || i >= shots.length) return;
    at = i;
    var had = doc.activeElement, btn = shots[i], img = shown(btn), cap = btn.parentNode.querySelector('figcaption');
    var t = LB[window.courseLang === 'fr' ? 'fr' : 'en'];
    var full = box.querySelector('img');
    full.src = img.currentSrc || img.src;
    full.alt = img.alt;
    box.setAttribute('aria-label', cap ? cap.textContent : img.alt);
    box.querySelector('b').textContent = cap ? cap.textContent : img.alt;
    box.querySelector('p span').textContent = (i + 1) + ' / ' + shots.length;
    [['.bk-lb-close', 0], ['.bk-lb-prev', 1], ['.bk-lb-next', 2]].forEach(function (b) {
      var el = box.querySelector(b[0]);
      el.setAttribute('aria-label', t[b[1]]); el.title = t[b[1]];
    });
    box.querySelector('.bk-lb-prev').hidden = i === 0;
    box.querySelector('.bk-lb-next').hidden = i === shots.length - 1;
    if (had && had.hidden && box.contains(had)) box.querySelector('.bk-lb-close').focus();
  }
  doc.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.bk-thumb-open');
    if (!btn) return;
    shots = all('.bk-thumb-open', btn.closest('.bk-gallery'));
    lightbox();
    show(shots.indexOf(btn));
    if (!box.open) box.showModal();
    box.querySelector('.bk-lb-close').focus();
  });

  /* ---------- search: the index is embedded in the search page (and encrypted with it) ----------
     Entries are [lang, path from the site's root, anchor, page title, section title, text]. The
     search page searches its own index; every other page opens a floating bar (the search button,
     Ctrl+K or "/") that reads the index from the search page, loaded once in a hidden frame:
     on the published site that frame is decrypted like any page the reader opens. */
  var sEsc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fold = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var sWords = function (q) { return fold(q.trim()).split(/\s+/).filter(function (w) { return w.length > 1; }); };
  /* a piece of text around the first word, every word marked (accents ignored) */
  var snippet = function (text, words, n) {
    n = n || 220;
    var f = fold(text), i = Math.max(0, f.indexOf(words[0])), from = Math.max(0, i - Math.round(n / 3)), to = Math.min(text.length, from + n);
    var marks = [];
    words.forEach(function (w) { for (var j = f.indexOf(w, from); j >= 0 && j < to; j = f.indexOf(w, j + w.length)) marks.push([j, Math.min(to, j + w.length)]); });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = from ? '…' : '', at = from;
    marks.forEach(function (m) { if (m[0] < at) return; out += sEsc(text.slice(at, m[0])) + '<mark>' + sEsc(text.slice(m[0], m[1])) + '</mark>'; at = m[1]; });
    return out + sEsc(text.slice(at, to)) + (to < text.length ? '…' : '');
  };
  function searchIndex(index) {
    var folded = index.map(function (e) { return fold(e[3] + ' ' + e[4] + ' ' + e[5]); });
    return function (words, lang) {
      var hits = [];
      index.forEach(function (e, i) {
        if (e[0] !== lang || !words.every(function (w) { return folded[i].indexOf(w) >= 0; })) return;
        var page = fold(e[3]), sec = fold(e[4]);
        var score = words.reduce(function (s, w) { return s + (page.indexOf(w) >= 0 ? 3 : 0) + (sec.indexOf(w) >= 0 ? 2 : 0); }, 0) + (e[2] ? 0 : 1);
        hits.push({ e: e, score: score });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      return hits;
    };
  }
  var sRoot = (function () {
    var a = doc.querySelector('.bk-title');
    return a ? new URL(a.getAttribute('href'), location.href).href.replace(/index\.html$/, '') : '';
  })();
  var embedded = window.top !== window;

  var sIndexEl = doc.getElementById('bk-search-index');
  var sInput = doc.getElementById('bk-search-q');
  if (sIndexEl && sInput && !embedded) {
    var pageIndex = [];
    try { pageIndex = JSON.parse(sIndexEl.textContent); } catch (e) {}
    var pageFind = searchIndex(pageIndex);
    var sList = doc.querySelector('.bk-search-results'), sCount = doc.querySelector('.bk-search-n');
    var runSearch = function () {
      var lang = window.courseLang === 'fr' ? 'fr' : 'en', words = sWords(sInput.value);
      sList.innerHTML = '';
      if (!words.length) { sCount.textContent = ''; return; }
      var hits = pageFind(words, lang);
      sCount.textContent = hits.length + (lang === 'fr' ? ' résultat' + (hits.length > 1 ? 's' : '') : ' result' + (hits.length > 1 ? 's' : ''));
      hits.slice(0, 60).forEach(function (h) {
        var e = h.e, href = sRoot + e[1] + '?lang=' + lang + (e[2] ? '#' + e[2] : '');
        var li = doc.createElement('li');
        li.innerHTML = '<a href="' + sEsc(href) + '">' + sEsc(e[3]) + (e[4] ? ' · ' + sEsc(e[4]) : '') + '</a><p>' + snippet(e[5] || e[4], words) + '</p>';
        sList.appendChild(li);
      });
    };
    sInput.value = new URLSearchParams(location.search).get('q') || '';
    sInput.addEventListener('input', runSearch);
    doc.addEventListener('langchange', runSearch);
    setTimeout(function () { sInput.focus(); runSearch(); }, 0);
  }

  /* ---------- the floating search bar ---------- */
  var ST = {
    en: { ph: 'Search the book', loading: 'Loading the index…', none: 'Nothing found for', hint: 'Type a word: a term, a rule, a market, a file name.', all: 'All results on the search page', nav: 'to move', open: 'to open', close: 'to close', fail: 'The index could not be loaded here.' },
    fr: { ph: 'Chercher dans le livre', loading: 'Chargement de l’index…', none: 'Rien trouvé pour', hint: 'Tapez un mot : un terme, une règle, un marché, un nom de fichier.', all: 'Tous les résultats sur la page de recherche', nav: 'pour naviguer', open: 'pour ouvrir', close: 'pour fermer', fail: 'L’index n’a pas pu être chargé ici.' }
  };
  var palette = null, pInput, pList, pFoot, pFind = null, pLoading = false, pFail = false, pSel = 0, pHits = [], pBack = null;
  function pT() { return ST[window.courseLang === 'fr' ? 'fr' : 'en']; }
  function loadIndex(done) {
    if (pFind) return done();
    if (sIndexEl) { try { pFind = searchIndex(JSON.parse(sIndexEl.textContent)); } catch (e) {} return done(); }
    if (pLoading) return;
    pLoading = true;
    var frame = doc.createElement('iframe'), tries = 0;
    frame.src = sRoot + 'appendix/search.html';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;left:-9999px;top:0;visibility:hidden';
    doc.body.appendChild(frame);
    (function poll() {
      var el = null;
      try { el = frame.contentDocument && frame.contentDocument.getElementById('bk-search-index'); } catch (e) {}
      if (el) {
        try { pFind = searchIndex(JSON.parse(el.textContent)); } catch (e) {}
        pLoading = false; frame.remove(); return done();
      }
      if (++tries > 100) { pLoading = false; frame.remove(); pFail = true; return done(); }
      setTimeout(poll, 150);
    })();
  }
  function buildPalette() {
    palette = doc.createElement('div');
    palette.className = 'bk-palette';
    palette.hidden = true;
    palette.innerHTML = '<div class="bk-palette-box" role="dialog" aria-modal="true" aria-label="Search">' +
      '<div class="bk-palette-field">' + (doc.querySelector('.bk-find svg') ? doc.querySelector('.bk-find svg').outerHTML : '') +
      '<input type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="bk-palette-list" aria-autocomplete="list">' +
      '<kbd>esc</kbd></div><ul class="bk-palette-list" id="bk-palette-list" role="listbox"></ul><div class="bk-palette-foot"></div></div>';
    doc.body.appendChild(palette);
    pInput = palette.querySelector('input');
    pList = palette.querySelector('.bk-palette-list');
    pFoot = palette.querySelector('.bk-palette-foot');
    palette.addEventListener('mousedown', function (e) { if (e.target === palette) closePalette(); });
    pInput.addEventListener('input', function () { pSel = 0; renderPalette(); });
    pInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (pHits.length) { pSel = (pSel + (e.key === 'ArrowDown' ? 1 : pHits.length - 1)) % pHits.length; markSel(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var a = pList.querySelector('[aria-selected="true"] a');
        if (a) location.href = a.href; else if (pInput.value.trim()) location.href = allHref();
      } else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'Tab') e.preventDefault();
    });
    pList.addEventListener('mousemove', function (e) {
      var li = e.target.closest('li[data-i]');
      if (li && +li.getAttribute('data-i') !== pSel) { pSel = +li.getAttribute('data-i'); markSel(); }
    });
  }
  function allHref() { return sRoot + 'appendix/search.html?q=' + encodeURIComponent(pInput.value.trim()) + '&lang=' + (window.courseLang === 'fr' ? 'fr' : 'en'); }
  function markSel() {
    all('li[data-i]', pList).forEach(function (li) {
      var on = +li.getAttribute('data-i') === pSel;
      li.setAttribute('aria-selected', String(on));
      if (on) { pInput.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    });
  }
  function renderPalette() {
    var t = pT(), lang = window.courseLang === 'fr' ? 'fr' : 'en', q = pInput.value.trim(), words = sWords(q);
    pInput.placeholder = t.ph;
    pHits = [];
    pFoot.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> ' + t.nav + '</span><span><kbd>↵</kbd> ' + t.open + '</span><span><kbd>esc</kbd> ' + t.close + '</span>';
    if (!words.length) { pList.innerHTML = '<li class="bk-palette-note">' + t.hint + '</li>'; return; }
    if (!pFind) {
      pList.innerHTML = '<li class="bk-palette-note">' + (pFail ? t.fail + ' <a href="' + sEsc(allHref()) + '">' + t.all + ' →</a>' : t.loading) + '</li>';
      return;
    }
    var hits = pFind(words, lang);
    pHits = hits.slice(0, 8);
    if (!pHits.length) { pList.innerHTML = '<li class="bk-palette-note">' + t.none + ' « ' + sEsc(q) + ' ».</li>'; return; }
    pList.innerHTML = pHits.map(function (h, i) {
      var e = h.e, href = sRoot + e[1] + '?lang=' + lang + (e[2] ? '#' + e[2] : '');
      return '<li role="option" id="bk-pal-' + i + '" data-i="' + i + '"><a href="' + sEsc(href) + '" tabindex="-1">' +
        '<span class="bk-pal-t">' + (e[4] ? '<span class="bk-pal-p">' + sEsc(e[3]) + '</span><span class="bk-pal-s">' + sEsc(e[4]) + '</span>' : '<span class="bk-pal-s">' + sEsc(e[3]) + '</span>') + '</span>' +
        (e[5] ? '<span class="bk-pal-x">' + snippet(e[5], words, 140) + '</span>' : '') + '</a></li>';
    }).join('') + (hits.length > pHits.length
      ? '<li class="bk-palette-more"><a href="' + sEsc(allHref()) + '">' + t.all + ' (' + hits.length + ') →</a></li>' : '');
    markSel();
  }
  function openPalette(q) {
    if (sInput && !embedded) { sInput.focus(); sInput.select(); return; }
    if (!palette) buildPalette();
    pBack = doc.activeElement;
    palette.hidden = false;
    root.classList.add('bk-palette-open');
    if (typeof q === 'string') pInput.value = q;
    pSel = 0;
    renderPalette();
    pInput.focus();
    pInput.select();
    loadIndex(function () { if (!palette.hidden) renderPalette(); });
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    root.classList.remove('bk-palette-open');
    if (pBack && pBack.focus) pBack.focus();
  }
  if (!embedded) {
    all('.bk-find').forEach(function (a) { a.addEventListener('click', function (e) { if (sInput) return; e.preventDefault(); openPalette(); }); });
    all('.bk-toc-find').forEach(function (f) {
      var i = f.querySelector('input');
      var go = function (e) { if (e) e.preventDefault(); var q = i ? i.value : ''; if (i) { i.value = ''; i.blur(); } closeDrawer(false); openPalette(q); };
      f.addEventListener('submit', go);
      if (i) i.addEventListener('focus', function () { go(); });
    });
    doc.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); palette && !palette.hidden ? closePalette() : openPalette(); }
      else if (e.key === '/' && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openPalette(); }
    });
    doc.addEventListener('langchange', function () { if (palette && !palette.hidden) renderPalette(); });
  }
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
