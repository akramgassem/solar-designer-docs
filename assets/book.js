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
  // A contract fills the window on request, so that Redoc's menu and columns have room; the
  // button, or Escape, brings it back into the page.
  function expand(fig, on) {
    var b = fig.querySelector('.bk-expand');
    if (!b.hasAttribute('data-enlarge')) b.setAttribute('data-enlarge', b.getAttribute('aria-label'));
    var label = on ? b.getAttribute('data-shrink') : b.getAttribute('data-enlarge');
    fig.classList.toggle('bk-expanded', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', label);
    b.title = label;
    doc.documentElement.classList.toggle('bk-has-expanded', on);
    if (on) b.focus();
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.bk-expand');
    if (b) { var fig = b.closest('figure'); expand(fig, !fig.classList.contains('bk-expanded')); }
  });
  doc.addEventListener('keydown', function (e) {
    var fig = e.key === 'Escape' && doc.querySelector('figure.bk-expanded');
    if (fig) expand(fig, false);
  });
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

  /* ---------- the site core: walls, anchors, cable routes, rules and categories ---------- */
  // Pure functions shared by the funnels' two screens and the schematic site's test bench
  // (design/site-model): a footprint becomes walls, equipment is anchored to a wall by a distance
  // along it, cables run along the walls the shorter way round, and the capacity summed over a
  // site gives the official categories of each market (raw report on site types, 2026-11-02).
  // Coordinates are metres, x east, z south, y up; a footprint runs clockwise seen from above.
  // fidelity colours: measured, declared by a person, schematic (D-72)
  var SMF = { measured: '#1F6F5C', declared: '#C27C0E', schematic: '#B9BDC2' };
  var SMKWC = 0.44; // kWc per module, 1.13 × 1.72 m
  function smWalls(F, H) {
    var W = [], cum = 0;
    F.forEach(function (a, i) {
      var b = F[(i + 1) % F.length], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      // the footprint runs clockwise seen from above, so the outward normal is (dz, -dx)
      W.push({ a: a, b: b, L: L, dx: dx / L, dz: dz / L, nx: dz / L, nz: -dx / L, p0: cum, h: H[i] });
      cum += L;
    });
    W.per = cum;
    return W;
  }
  function smAt(W, w, s, off, y) { var q = W[w]; return [q.a[0] + q.dx * s + q.nx * off, y, q.a[1] + q.dz * s + q.nz * off]; }
  // a cable from one wall anchor to another, along the walls at height y, the shorter way round
  function smRoute(W, A, B, y, off) {
    var n = W.length, per = W.per, pa = W[A.w].p0 + A.s, pb = W[B.w].p0 + B.s;
    var fwd = ((pb - pa) % per + per) % per, pts = [smAt(W, A.w, A.s, off, y)], w = A.w, left, edge;
    // a corner's point at the offset: the mitre of the two walls, which holds for square, re-entrant
    // and straight corners (two walls in line, as where a garage's wall continues the house's)
    var corner = function (k) { var v = W[k].b, m = W[(k + 1) % n], f = off / (1 + W[k].nx * m.nx + W[k].nz * m.nz); return [v[0] + (W[k].nx + m.nx) * f, y, v[1] + (W[k].nz + m.nz) * f]; };
    if (fwd <= per - fwd) {
      left = fwd; edge = W[w].L - A.s;
      while (left > edge + 1e-6) { pts.push(corner(w)); left -= edge; w = (w + 1) % n; edge = W[w].L; }
    } else {
      left = per - fwd; edge = A.s;
      while (left > edge + 1e-6) { w = (w - 1 + n) % n; pts.push(corner(w)); left -= edge; edge = W[w].L; }
    }
    pts.push(smAt(W, B.w, B.s, off, y));
    return pts;
  }
  function smLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return L; }
  function smVert(pts) { var L = 0; for (var i = 1; i < pts.length; i++) if (pts[i][0] === pts[i - 1][0] && pts[i][2] === pts[i - 1][2]) L += Math.abs(pts[i][1] - pts[i - 1][1]); return L; }
  // the battery zones of AS/NZS 5139 around exits and windows of habitable rooms, on their wall
  function smZones(D) {
    if (D.rule !== 'bat') return [];
    return D.open.filter(function (o) { return o.k === 'door' || o.k === 'win'; }).map(function (o) {
      return { w: o.w, k: o.k, s0: o.s0 - 0.6, s1: o.s1 + 0.6, y0: 0, y1: o.k === 'win' ? 2.1 : 2.7 };
    });
  }
  // the official categories of a site, per market, from its type and the capacity summed over it
  function smCats(kind, s, fr, fmt) {
    var L = function (en, f) { return fr ? f : en; }, k = s.kWc, a = s.kVA;
    var frS = k <= 9 ? L('S21 open window, surplus sale only (≤ 9 kWc)', 'S21 guichet ouvert, vente du surplus seule (≤ 9 kWc)')
      : k <= 100 ? L('S21 open window (P+Q ≤ 100 kWc)', 'S21 guichet ouvert (P+Q ≤ 100 kWc)')
        : k <= 500 ? L('AOS, the CRE’s simplified tender (100–500 kWc)', 'AOS, appel d’offres simplifié de la CRE (100–500 kWc)')
          : L('AO PPE2 Bâtiment tender (> 500 kWc)', 'Appel d’offres PPE2 Bâtiment (> 500 kWc)');
    var frP = kind === 'house' ? L('Roof: prior declaration (DP)', 'Toiture : déclaration préalable') + (s.carport ? L('; carport: ground rules, DP', ' ; carport : règles du sol, DP') : '')
      : kind === 'ci' ? L('Roof: DP; fire file if open to the public or classified', 'Toiture : DP ; dossier incendie si ERP ou ICPE')
        : L('Canopies: ground rules, DP below 3 MWc; loi APER: ', 'Ombrières : règles du sol, DP sous 3 MWc ; loi APER : ') + Math.round(s.cover) + ' % / 50 %';
    var frC = a <= 36 ? L('≤ 36 kVA: simplified', '≤ 36 kVA : simplifié') : a <= 250 ? L('36–250 kVA: technical and financial offer', '36–250 kVA : proposition technique et financière') : L('> 250 kVA: medium voltage', '> 250 kVA : HTA');
    var auS = k <= 100 ? L('Small-scale STCs (≤ 100 kW)', 'STC petit solaire (≤ 100 kW)') : k <= 1000 ? L('Mid-scale STCs or REGO, the owner’s choice', 'STC mid-scale ou REGO, au choix du propriétaire') : 'REGO';
    var auP = kind === 'house' ? L('Roof: exempt with flush rails (state rules)', 'Toiture : exemptée en surimposition (règles de l’État)') + (s.carport ? L('; carport: a new structure', ' ; carport : nouvelle structure') : '')
      : kind === 'ci' ? L('Tilted frames: may exceed the exempt height (state rules)', 'Châssis inclinés : peuvent dépasser la hauteur exemptée (règles de l’État)')
        : L('Canopies: new structures, no category of their own', 'Ombrières : nouvelles structures, sans catégorie propre');
    var auC = a <= 30 ? L('Basic connection (≤ 30 kVA)', 'Raccordement de base (≤ 30 kVA)') : a <= 200 ? L('Negotiated connection (> 30 kVA)', 'Raccordement négocié (> 30 kVA)') : L('Central protection (> 200 kVA, AS/NZS 4777.1)', 'Protection centrale (> 200 kVA, AS/NZS 4777.1)');
    var ukS = k <= 50 ? L('SEG, with MCS (≤ 50 kW)', 'SEG, avec MCS (≤ 50 kW)') : L('SEG through ROO-FIT (> 50 kW)', 'SEG par ROO-FIT (> 50 kW)');
    var ukP = kind === 'house' ? 'Class A' + (s.carport ? L('; carport over 9 m²: planning permission (Class B)', ' ; carport de plus de 9 m² : permis (Class B)') : '')
      : kind === 'ci' ? L('Class J: ≤ 1 m above the roof, 1 m from its edge', 'Class J : ≤ 1 m au-dessus du toit, 1 m de la rive')
        : L('Class OA: non-domestic canopy ≤ 4 m, prior approval', 'Class OA : ombrière non domestique ≤ 4 m, accord préalable');
    var ukC = a / s.ph <= 3.68 ? 'G98' : a >= 1000 ? L('G99 Type B', 'G99 type B') : kind !== 'house' ? 'G99' : L('G99, or G98 with export limited to 3.68 kW per phase', 'G99, ou G98 avec export limité à 3,68 kW par phase');
    return [[L('France', 'France'), frS, frP, frC], [L('Australia', 'Australie'), auS, auP, auC], [L('United Kingdom', 'Royaume-Uni'), ukS, ukP, ukC]];
  }
  // the maquette's look, shared by the funnels' 3D home and the site test bench: grey canvases
  // that each material's colour tints, the cars and the equipment drawn once
  function smTex(T, w, h, paint, rep) {
    var c = doc.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
    var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    if (rep) tx.wrapS = tx.wrapT = T.RepeatWrapping;
    return tx;
  }
  // tile courses, one per texture height: a shadow line under a light lip
  function smCourseTex(T) { return smTex(T, 8, 32, function (g, w, h) { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, h - 4, w, 4); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, h - 6, w, 2); }, true); }
  // a roof membrane welded in 2 m strips
  function smSeamTex(T) { return smTex(T, 64, 64, function (g, w, h) { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, w, 2); }, true); }
  // a contact shadow: a soft dark rectangle whose solid part is 72 / 128 of the texture
  function smAoTex(T) { return smTex(T, 128, 128, function (g) { g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 26; g.shadowOffsetX = 1000; g.fillStyle = '#000'; g.fillRect(-1000 + 28, 28, 72, 72); }); }
  function smBlob(T, tex, w, d, op) {
    var m = new T.Mesh(new T.PlaneGeometry(w * 128 / 72, d * 128 / 72), new T.MeshBasicMaterial({ map: tex, color: '#1E2124', transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.renderOrder = 1; return m;
  }
  // tile-course coordinates for a roof made of triangles: along the eave, then up the slope,
  // whichever horizontal axis the face's slope runs along
  function smCourseUV(T, g) {
    var p = g.attributes.position, uv = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
    for (var i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      var n = b.clone().sub(a).cross(c.clone().sub(a)), alongX = Math.abs(n.z) >= Math.abs(n.x);
      [a, b, c].forEach(function (v) { uv.push(alongX ? v.x / 2 : v.z / 2, alongX ? v.z / 0.31 : v.x / 0.31); });
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); return g;
  }
  // walls darker at their foot, as daylight falls on a maquette
  function smShade(T, g) {
    g.computeBoundingBox(); var p = g.attributes.position, y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, c = [];
    for (var i = 0; i < p.count; i++) { var f = 0.84 + 0.16 * (p.getY(i) - y0) / (y1 - y0 || 1); c.push(f, f, f); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); return g;
  }
  // a box with rounded vertical edges, extruded from its front outline
  function smRBox(T, w, h, d, rr) {
    var s = new T.Shape(), x = w / 2, y = h / 2, q = Math.min(rr, x, y);
    s.moveTo(-x + q, -y); s.lineTo(x - q, -y); s.quadraticCurveTo(x, -y, x, -y + q); s.lineTo(x, y - q); s.quadraticCurveTo(x, y, x - q, y);
    s.lineTo(-x + q, y); s.quadraticCurveTo(-x, y, -x, y - q); s.lineTo(-x, -y + q); s.quadraticCurveTo(-x, -y, -x + q, -y);
    var g = new T.ExtrudeGeometry(s, { depth: d - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -d / 2 + 0.01); return g;
  }
  // a car: a body and a glass cabin extruded from their side profiles, arches, rims, lights.
  // Front to -z, on the ground at y 0; the first mesh is the body
  var smCarG = null;
  function smCar(T, mat, colour) {
    if (!smCarG || smCarG.T !== T) {
      var s = new T.Shape(), L = 4.4;
      s.moveTo(-L / 2, 0.3); s.lineTo(-L / 2, 0.78); s.quadraticCurveTo(-L / 2 + 0.05, 0.96, -L / 2 + 0.45, 0.98);
      s.lineTo(L / 2 - 0.55, 0.98); s.quadraticCurveTo(L / 2, 0.94, L / 2, 0.68); s.lineTo(L / 2, 0.3);
      s.lineTo(1.75, 0.3); s.absarc(1.4, 0.3, 0.38, 0, Math.PI, false); s.lineTo(-1.05, 0.3); s.absarc(-1.4, 0.3, 0.38, 0, Math.PI, false); s.lineTo(-L / 2, 0.3);
      var body = new T.ExtrudeGeometry(s, { depth: 1.66, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 8 });
      body.translate(0, 0, -0.83); body.rotateY(Math.PI / 2);
      var k = new T.Shape();
      k.moveTo(-1.75, 0.96); k.lineTo(-1.4, 1.42); k.quadraticCurveTo(-1.3, 1.46, -1.1, 1.46); k.lineTo(0.55, 1.46); k.quadraticCurveTo(0.7, 1.46, 0.8, 1.4); k.lineTo(1.35, 0.96); k.lineTo(-1.75, 0.96);
      var cabin = new T.ExtrudeGeometry(k, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
      cabin.translate(0, 0, -0.7); cabin.rotateY(Math.PI / 2);
      smCarG = { T: T, body: body, cabin: cabin, wheel: new T.CylinderGeometry(0.33, 0.33, 0.24, 20), rim: new T.CylinderGeometry(0.19, 0.19, 0.25, 12), lamp: new T.BoxGeometry(0.32, 0.08, 0.04),
        glass: mat('#2F3A45', { roughness: 0.15, metalness: 0.3 }), tyre: mat('#2E3136'), rimM: mat('#C7CBCF', { roughness: 0.4, metalness: 0.4 }),
        head: mat('#F4F1E6', { emissive: '#F4F1E6', emissiveIntensity: 0.2 }), tail: mat('#B5473A', { roughness: 0.4 }) };
    }
    var G = smCarG, g = new T.Group(), put = function (geo, m, x, y, z) { var o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
    put(G.body, mat(colour, { roughness: 0.38, metalness: 0.25 })); put(G.cabin, G.glass);
    [[-0.84, -1.4], [0.84, -1.4], [-0.84, 1.4], [0.84, 1.4]].forEach(function (p) {
      put(G.wheel, G.tyre, p[0], 0.33, p[1]).rotation.z = Math.PI / 2;
      put(G.rim, G.rimM, p[0] + (p[0] < 0 ? -0.01 : 0.01), 0.33, p[1]).rotation.z = Math.PI / 2;
    });
    [-0.55, 0.55].forEach(function (lx) { put(G.lamp, G.head, lx, 0.78, -2.25); put(G.lamp, G.tail, lx, 0.82, 2.25); });
    return g;
  }
  // an equipment unit at catalogue size e { W, H, D, c }, front to +z, centred on its body, with what
  // tells one from another: fins and a display, a door seam, a holster and a coiled cable, a fan grille
  function smEquip(T, k, e, mat) {
    var g = new T.Group(), fz = e.D / 2, dark = mat('#3A3F46', { roughness: 0.5 }), seam = mat('#8C877E', { roughness: 0.7 });
    var part = function (geo, m, x, y, z) { var p = new T.Mesh(geo, m); p.position.set(x, y, z); g.add(p); return p; };
    var body = part(k === 'hp' ? new T.BoxGeometry(e.W, e.H, e.D) : smRBox(T, e.W, e.H, e.D, Math.min(0.08, e.W / 5)), mat(e.c, { roughness: 0.55 }), 0, 0, 0);
    if (k === 'inv') {
      for (var f = 0; f < 5; f++) part(new T.BoxGeometry(e.W * 0.8, 0.012, 0.03), seam, 0, -e.H / 2 + 0.12 + f * 0.05, fz + 0.01);
      part(new T.BoxGeometry(e.W * 0.3, e.H * 0.12, 0.012), dark, 0, e.H * 0.22, fz + 0.006);
    }
    if (k === 'bat') {
      part(new T.BoxGeometry(Math.min(0.3, e.W * 0.4), 0.025, 0.012), mat('#7A5BD0', { emissive: '#7A5BD0', emissiveIntensity: 0.7 }), 0, e.H / 2 - 0.25, fz + 0.006);
      part(new T.BoxGeometry(e.W * 0.92, 0.012, 0.012), seam, 0, -e.H / 2 + 0.2, fz + 0.006);
    }
    if (k === 'sb') {
      part(new T.BoxGeometry(0.012, e.H * 0.9, 0.012), seam, e.W > 1 ? 0 : -e.W * 0.1, 0, fz + 0.006);
      part(new T.BoxGeometry(0.03, 0.12, 0.03), dark, e.W > 1 ? 0.08 : e.W * 0.3, 0, fz + 0.015);
    }
    if (k === 'evc') {
      part(new T.BoxGeometry(e.W * 0.5, 0.06, 0.012), mat('#7EC8A0', { emissive: '#7EC8A0', emissiveIntensity: 0.5 }), 0, e.H * 0.28, fz + 0.006);
      part(new T.BoxGeometry(0.07, 0.12, 0.08), dark, e.W / 2 + 0.06, -0.05, 0.02);
      part(new T.TorusGeometry(0.11, 0.018, 6, 18), dark, 0, -e.H / 2 - 0.2, 0.05).rotation.x = Math.PI / 2 - 0.4;
    }
    if (k === 'hp') {
      part(new T.TorusGeometry(0.25, 0.025, 8, 28), seam, -0.15, 0, fz + 0.015);
      part(new T.CircleGeometry(0.24, 28), dark, -0.15, 0, fz + 0.008);
      for (var gb = -2; gb <= 2; gb++) part(new T.BoxGeometry(0.5, 0.012, 0.012), seam, -0.15, gb * 0.09, fz + 0.03);
      for (var v = 0; v < 6; v++) part(new T.BoxGeometry(0.012, e.H * 0.8, 0.012), seam, 0.18 + v * 0.04, 0, fz + 0.006);
      [-e.W / 2 + 0.12, e.W / 2 - 0.12].forEach(function (x) { part(new T.BoxGeometry(0.08, 0.1, e.D + 0.1), dark, x, -e.H / 2 - 0.05, 0); });
    }
    g.userData.body = body;
    return g;
  }
  // a callout over a 3D stage: a dot on the unit, a thin leader rising out of it at about 50°, a short
  // horizontal shoulder, then the label, entirely clear of the unit (drafting: a dot marks a surface).
  // `placed` holds the labels already set this frame: a label that would overlap one climbs a step.
  function smCallout(el, line, dot, ax, ay, side, col, placed) {
    var rise = 22, w = el.offsetWidth || 60, h = el.offsetHeight || 20, sx, sy, ex, box;
    for (var i = 0; i < 6; i++) {
      sx = ax + side * rise * 0.8; sy = ay - rise; ex = sx + side * 8;
      box = side > 0 ? [ex + 2, sy - h / 2, ex + 2 + w, sy + h / 2] : [ex - 2 - w, sy - h / 2, ex - 2, sy + h / 2];
      if (!placed.some(function (b) { return box[0] < b[2] + 4 && box[2] > b[0] - 4 && box[1] < b[3] + 3 && box[3] > b[1] - 3; })) break;
      rise += h + 4;
    }
    placed.push(box);
    line.setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' L' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + sy.toFixed(1));
    line.style.stroke = col; dot.setAttribute('cx', ax.toFixed(1)); dot.setAttribute('cy', ay.toFixed(1)); dot.style.fill = col;
    el.style.left = box[0].toFixed(1) + 'px'; el.style.top = box[1].toFixed(1) + 'px'; el.style.transform = 'none';
  }
  // the SVG layer that holds the leaders, under the labels; one path and one dot per label
  function smLeaders(layer, keys) {
    var ns = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(ns, 'svg'), out = {};
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none');
    keys.forEach(function (k) {
      var p = doc.createElementNS(ns, 'path'), c = doc.createElementNS(ns, 'circle');
      p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', '1.25'); p.setAttribute('stroke-linejoin', 'round');
      c.setAttribute('r', '3.5'); c.setAttribute('stroke', '#FFFFFF'); c.setAttribute('stroke-width', '1.5');
      svg.appendChild(p); svg.appendChild(c); out[k] = { line: p, dot: c, show: function (on) { p.style.display = c.style.display = on ? '' : 'none'; } };
    });
    layer.insertBefore(svg, layer.firstChild);
    return out;
  }
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
      { id: 'frost', en: 'Frost', fr: 'Givre', ground: '#F2F4F8', paper: '#FFFFFF', line: '#DDE1E6' },
      { id: 'night', en: 'Night', fr: 'Nuit', ground: '#16181D', paper: '#1F2228', line: '#30343C', dark: true }
    ],
    accents: [
      { id: 'spark', en: 'Spark', fr: 'Étincelle', live: '#FFC400', solar: '#F2A900', battery: ['#B5653A', '#E0A27F'], sel: ['#1E6B5C', '#7FC7B3'], selsoft: '#E3EFEB' },
      { id: 'current', en: 'Live current', fr: 'Courant', live: '#00B8A9', solar: '#F0A500', battery: ['#5148C8', '#A9A3F2'], sel: ['#00796F', '#5FD3C6'], selsoft: '#DDF3F0' },
      { id: 'signal', en: 'Signal', fr: 'Signal', live: '#0F62FE', solar: '#F1C21B', battery: ['#8A3FFC', '#BE95FF'], sel: ['#0043CE', '#78A9FF'], selsoft: '#EDF5FF' },
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
    // the choice is shared with the funnel prototypes (72-funnels.js), which repaint on "sd-palette"
    var saved = {}; try { saved = JSON.parse(localStorage.getItem('sd-palette') || '{}'); } catch (e) {}
    var g = PL.grounds.filter(function (x) { return x.id === saved.ground; })[0] || PL.grounds[0];
    var a = PL.accents.filter(function (x) { return x.id === saved.accent; })[0] || PL.accents[0];
    function save() { try { localStorage.setItem('sd-palette', JSON.stringify({ ground: g.id, accent: a.id })); } catch (e) {} window.dispatchEvent(new Event('sd-palette')); }
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
    all('.bk-pl-g', out).forEach(function (b) { b.addEventListener('click', function () { g = PL.grounds[+b.getAttribute('data-i')]; paint(); save(); }); });
    all('.bk-pl-a', out).forEach(function (b) { b.addEventListener('click', function () { a = PL.accents[+b.getAttribute('data-i')]; paint(); save(); }); });
    paint();
  });
  /* ---------- widgets: drag the chimney (concepts/05-layout §5.9) ---------- */
  // The drawing is the reference engine's static layout (figs45.py) and carries its inputs as
  // data-* values. When studio-draw's WebAssembly is in the site (mise run wasm), every pointer
  // move recomputes the keep-out, the usable area and the best layout in it; otherwise the
  // static drawing stays and a line says why. Geometry and counts only: no energy figure.
  var DC = {
    en: { live: 'Drag the chimney, or focus it and use the arrow keys. Hold Alt to move it without snapping.',
      static: 'Static drawing from the reference engine: this copy of the book does not include studio-draw’s WebAssembly, so the chimney cannot be moved here.',
      error: 'studio-draw refused the input: ', modules: 'modules', ridge: 'to the ridge', eave: 'to the eave',
      axis: 'snapped to the ridge axis', row: 'keep-out edge snapped to a row edge',
      frame: 'WebAssembly: {t} ms this frame, median {m} ms over the last {n}; loaded and instantiated in {l} ms.',
      api: 'Geometry the studio would send to the API on release (counts only: the API returns every energy and money figure, ADR-001)' },
    fr: { live: 'Faites glisser la cheminée, ou donnez-lui le focus et utilisez les flèches. Maintenez Alt pour la déplacer sans aimantation.',
      static: 'Dessin statique du moteur de référence : cette copie du livre n’inclut pas le WebAssembly de studio-draw, la cheminée ne peut donc pas être déplacée ici.',
      error: 'studio-draw a refusé l’entrée : ', modules: 'modules', ridge: 'jusqu’au faîtage', eave: 'jusqu’à l’égout',
      axis: 'aimantée sur l’axe du faîtage', row: 'bord de la zone d’exclusion aimanté sur un bord de rangée',
      frame: 'WebAssembly : {t} ms pour cette image, médiane {m} ms sur les {n} dernières ; chargé et instancié en {l} ms.',
      api: 'Géométrie que le studio enverrait à l’API au relâchement (des comptes seulement : l’API renvoie chaque chiffre d’énergie et d’argent, ADR-001)' }
  };
  var dcWasm = null;
  function dcLoad() {
    // one load for every widget of the page (the English and the French one)
    if (!dcWasm) {
      var t0 = performance.now();
      dcWasm = import(BASE + 'wasm/studio_draw_wasm.js').then(function (mod) {
        return mod.default({ module_or_path: BASE + 'wasm/studio_draw_wasm_bg.wasm' }).then(function () {
          return { layout: mod.layout, ms: performance.now() - t0 };
        });
      });
    }
    return dcWasm;
  }
  function dcNums(el, name) { return (el.getAttribute('data-' + name) || '').split(',').map(Number); }
  all('figure.bk-widget[data-widget="drag-chimney"]').forEach(function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), g = svg && svg.querySelector('.dc-live');
    if (!g || !out) return;
    var fr = (fig.closest('[lang]') || root).getAttribute('lang') === 'fr', t = DC[fr ? 'fr' : 'en'];
    var face = dcNums(g, 'face'), setbacks = dcNums(g, 'setbacks'), vent = dcNums(g, 'vent'), grid = dcNums(g, 'grid');
    var ch = dcNums(g, 'chimney'), view = dcNums(g, 'view'), S = view[0], OX = view[1], OY = view[2];
    var cu = ch[0], cv = ch[1], W = ch[2], H = ch[3], M = ch[4];
    var us = face.filter(function (x, i) { return i % 3 === 0; }), vs = face.filter(function (x, i) { return i % 3 === 1; });
    var umin = Math.min.apply(null, us), umax = Math.max.apply(null, us), top = Math.max.apply(null, vs);
    // the ridge axis: the middle of the ridge edge (kind 1), else of the face
    var axis = (umin + umax) / 2, nv = face.length / 3;
    for (var i = 0; i < nv; i++) if (face[3 * i + 2] === 1) axis = (face[3 * i] + face[3 * ((i + 1) % nv)]) / 2;
    var chim = g.querySelector('.dc-chim'), area = g.querySelector('.dc-area'), mods = g.querySelector('.dc-mods');
    var guides = g.querySelector('.dc-guides'), count = g.querySelector('.dc-count');
    var times = [], loadMs = 0, rows = [], last = null, held = false;
    out.innerHTML = '<p class="bk-dc-say" aria-live="polite"></p><p class="bk-dc-time"></p><div class="bk-dc-api" hidden><p></p><pre></pre></div>';
    var say = out.querySelector('.bk-dc-say'), time = out.querySelector('.bk-dc-time'), api = out.querySelector('.bk-dc-api');
    say.textContent = '…';

    function x(u) { return OX + u * S; }
    function y(v) { return OY - v * S; }
    function num(v, d) { var s = v.toFixed(d === undefined ? 2 : d); return fr ? s.replace('.', ',') : s; }
    function up() { return top - (cv + H / 2); }
    function obstacles() { return vent.concat([0, cu, cv, W, H, M]); }

    function run(obs) {
      var t0 = performance.now(), res = last && last.layout(new Float64Array(face), new Float64Array(setbacks), new Float64Array(obs), new Float64Array(grid));
      return { res: res, ms: performance.now() - t0 };
    }
    function read(res) {
      var n = res[0], r = res[2], k = 3, m = [], rings = [];
      for (var i = 0; i < n; i++, k += 4) m.push([res[k], res[k + 1], res[k + 2], res[k + 3]]);
      for (var j = 0; j < r; j++) { var p = res[k], ring = []; k += 1; for (var q = 0; q < p; q++, k += 2) ring.push([res[k], res[k + 1]]); rings.push(ring); }
      return { n: n, dy: res[1], modules: m, rings: rings };
    }
    // where the keep-out's edges snap: the row edges of the layout without the chimney
    function rowEdges() {
      var base = read(run(vent).res), seen = {};
      base.modules.forEach(function (m) { seen[m[1].toFixed(4)] = m[1]; seen[m[3].toFixed(4)] = m[3]; });
      return Object.keys(seen).map(function (k) { return seen[k]; });
    }
    function snap(u, v, free) {
      var hit = [], tol = 0.1, reach = H / 2 + M;
      if (!free && Math.abs(u - axis) < tol) { u = axis; hit.push(t.axis); }
      var best = null;
      if (!free) rows.forEach(function (e) {
        [e + reach, e - reach].forEach(function (c) { if (Math.abs(v - c) < tol && (!best || Math.abs(v - c) < Math.abs(v - best.c))) best = { c: c, e: e }; });
      });
      if (best) { v = best.c; hit.push(t.row); }
      return { u: u, v: v, hit: hit, edge: best && best.e, onAxis: !free && u === axis };
    }
    function draw(s) {
      var frame = run(obstacles());
      times.push(frame.ms); if (times.length > 60) times.shift();
      var L = read(frame.res);
      area.innerHTML = '<path class="usable" fill-rule="evenodd" d="' + L.rings.map(function (ring) {
        return 'M' + ring.map(function (p) { return x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1); }).join(' L') + ' Z';
      }).join(' ') + '"/>';
      mods.innerHTML = L.modules.map(function (m) {
        return '<rect class="pv" x="' + x(m[0]).toFixed(1) + '" y="' + y(m[3]).toFixed(1) + '" width="' + ((m[2] - m[0]) * S).toFixed(1) + '" height="' + ((m[3] - m[1]) * S).toFixed(1) + '"/>';
      }).join('');
      chim.setAttribute('x', x(cu - W / 2).toFixed(1)); chim.setAttribute('y', y(cv + H / 2).toFixed(1));
      chim.setAttribute('aria-label', (fr ? 'Cheminée, ' : 'Chimney, ') + num(up(), 2) + ' m ' + t.ridge + ', ' + num(cv - H / 2) + ' m ' + t.eave);
      count.textContent = L.n + ' ' + t.modules;
      // the guides while dragging, and the distances from the chimney to the ridge and the eave
      var dx = x(cu + W / 2 + 0.25), gl = '';
      if (held) gl += '<line class="dc-guide' + (s && s.onAxis ? ' dc-on' : '') + '" x1="' + x(axis) + '" y1="' + y(top) + '" x2="' + x(axis) + '" y2="' + y(0) + '"/>';
      if (held && s && s.edge !== null && s.edge !== undefined) gl += '<line class="dc-guide dc-on" x1="' + x(umin) + '" y1="' + y(s.edge) + '" x2="' + x(umax) + '" y2="' + y(s.edge) + '"/>';
      [[cv + H / 2, top, up(), t.ridge], [0, cv - H / 2, cv - H / 2, t.eave]].forEach(function (d) {
        if (d[2] <= 0) return;
        var ya = y(d[0]), yb = y(d[1]), ym = (ya + yb) / 2, label = num(d[2]) + ' m ' + d[3];
        gl += '<line class="dc-dim" x1="' + dx + '" y1="' + ya + '" x2="' + dx + '" y2="' + yb + '"/>' +
          '<line class="dc-dim" x1="' + (dx - 4) + '" y1="' + ya + '" x2="' + (dx + 4) + '" y2="' + ya + '"/>' +
          '<line class="dc-dim" x1="' + (dx - 4) + '" y1="' + yb + '" x2="' + (dx + 4) + '" y2="' + yb + '"/>' +
          // a plate under the label keeps it legible over the modules
          '<rect class="dc-dimbg" x="' + (dx + 3) + '" y="' + (ym - 9) + '" width="' + (label.length * 6.6 + 6) + '" height="17" rx="3"/>' +
          '<text class="dc-dimtext" x="' + (dx + 6) + '" y="' + (ym + 4) + '">' + label + '</text>';
      });
      guides.innerHTML = gl;
      var sorted = times.slice().sort(function (a, b) { return a - b; });
      time.textContent = t.frame.replace('{t}', num(frame.ms, 2)).replace('{m}', num(sorted[sorted.length >> 1], 2))
        .replace('{n}', times.length).replace('{l}', num(loadMs, 0));
      say.textContent = s && s.hit.length ? t.live + ' · ' + s.hit.join(' · ') : t.live;
      fig.setAttribute('data-count', L.n);
      return L;
    }
    function release(L) {
      var payload = {
        face: { frame: 'unfolded, metres, u along the eave, v up the slope', outline: face.reduce(function (a, x, i) {
          if (i % 3 === 0) a.push({ u: x, v: face[i + 1], edge: ['eave', 'ridge', 'hip', 'valley', 'rake'][face[i + 2]] }); return a; }, []) },
        setbacks: { eave: setbacks[0], ridge: setbacks[1], hip: setbacks[2], valley: setbacks[3], rake: setbacks[4] },
        obstacles: [
          { kind: 'vent', shape: 'disc', centre: { u: vent[1], v: vent[2] }, radius: vent[3], margin: vent[5] },
          { kind: 'chimney', shape: 'rect', centre: { u: +cu.toFixed(3), v: +cv.toFixed(3) }, width: W, height: H, margin: M }],
        layout: { orientation: 'landscape', module: { width: grid[0], height: grid[1] }, gap: grid[2], dy: +L.dy.toFixed(3),
          modules: L.modules.map(function (m) { return [+m[0].toFixed(3), +m[1].toFixed(3)]; }) },
        counts: { modules: L.n, kwp: +(L.n * 0.44).toFixed(2), module_area_m2: +(L.n * grid[0] * grid[1]).toFixed(2) }
      };
      api.hidden = false;
      api.querySelector('p').textContent = t.api;
      api.querySelector('pre').textContent = JSON.stringify(payload, null, 1);
    }
    function moveTo(u, v, free) {
      u = Math.max(umin, Math.min(umax, u)); v = Math.max(0, Math.min(top, v));
      var s = snap(u, v, free);
      cu = s.u; cv = s.v;
      return draw(s);
    }
    function pointer(e) {
      var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      p = p.matrixTransform(svg.getScreenCTM().inverse());
      return { u: (p.x - OX) / S, v: (OY - p.y) / S };
    }

    dcLoad().then(function (w) {
      last = w; loadMs = w.ms;
      try { rows = rowEdges(); draw(null); } catch (err) { say.textContent = t.error + err.message; return; }
      fig.classList.add('bk-dc-ready');
      chim.setAttribute('tabindex', '0');
      chim.setAttribute('role', 'button');
      var grab = null;
      chim.addEventListener('pointerdown', function (e) {
        var p = pointer(e); grab = { du: cu - p.u, dv: cv - p.v }; held = true;
        chim.setPointerCapture(e.pointerId); chim.classList.add('dc-held'); e.preventDefault();
      });
      chim.addEventListener('pointermove', function (e) {
        if (!grab) return;
        var p = pointer(e);
        try { moveTo(p.u + grab.du, p.v + grab.dv, e.altKey); } catch (err) { say.textContent = t.error + err.message; }
      });
      function drop() {
        if (!grab) return;
        grab = null; held = false; chim.classList.remove('dc-held');
        release(draw(null));
      }
      chim.addEventListener('pointerup', drop);
      chim.addEventListener('pointercancel', drop);
      chim.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 0.25 : 0.05, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
        if (!d) return;
        e.preventDefault();
        release(moveTo(cu + d[0], cv + d[1], true));
      });
    }, function () {
      say.textContent = t.static;
      time.textContent = '';
    });
  });

  /* ---------- widgets: the funnel prototypes (design/funnels, design/editor-tools) ---------- */
  // Intention prototypes, not final screens. Each widget draws product screens at their real size
  // (an 1180 × 820 tablet) in their device, scaled to the page, with an Enlarge button; the journey is in 73-journey.js.
  // The screens are those of the Australian product, so they stay in English in both languages;
  // the figure's caption carries the page's language. Every number comes from FN.sim, one small
  // model of a Sydney household, so that figures stay consistent when a switch is flipped.
  // Colours come from the palette chosen on design/palette (localStorage "sd-palette").
  var FN = {};
  FN.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  FN.money = function (x) { return '$' + Math.round(Math.abs(x)).toLocaleString('en-AU'); };
  FN.n = function (x, d) { return Number(x).toLocaleString('en-AU', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  FN.isFr = function (fig) { return (fig.closest('[lang]') || root).getAttribute('lang') === 'fr'; };

  /* palette, shared with the palette widget */
  FN.PAL = 'sd-palette';
  FN.palette = function () { try { var p = JSON.parse(localStorage.getItem(FN.PAL) || '{}'); return { ground: p.ground || 'stone', accent: p.accent || 'spark' }; } catch (e) { return { ground: 'stone', accent: 'spark' }; } };
  FN.tokens = function (p) {
    p = p || FN.palette();
    var G = {
      stone: { ground: '#ECE9E3', paper: '#FBFAF8', line: '#DDD8CF', line2: '#F1EEE9', paper2: '#FFFFFF', canvas: '#E3DFD7', grip: '#CFC9BE', faint: '#B5B0A6', roofN: '#CFC9BF', roofS: '#C2BBB0', roof: '#C8C2B7', roofLine: '#9C958A', ridge: '#8F887C', sky: '#E3DFD7', earth: '#D9D4CA', drive: '#C9C3B8', walls: '#EFEAE1', roof3: '#8F8679' },
      linen: { ground: '#F4F1EA', paper: '#FFFFFF', line: '#E4DFD4', line2: '#F3EFE8', paper2: '#FFFFFF', canvas: '#ECE7DE', grip: '#D6CFC2', faint: '#B9B2A6', roofN: '#D6CFC3', roofS: '#CBC3B6', roof: '#D0C9BC', roofLine: '#A39A8C', ridge: '#958C7E', sky: '#ECE7DE', earth: '#E0DACF', drive: '#D2CBC0', walls: '#F5F1EA', roof3: '#958B7C' },
      clay: { ground: '#EFE6DC', paper: '#FCF8F3', line: '#E0D3C4', line2: '#F3EAE0', paper2: '#FFFFFF', canvas: '#E8DCCF', grip: '#D3C3B2', faint: '#B8AA9A', roofN: '#D9B8A0', roofS: '#CBA990', roof: '#D2B098', roofLine: '#A27E66', ridge: '#93705A', sky: '#E8DCCF', earth: '#DCCDBD', drive: '#CDBFAF', walls: '#F3EAE0', roof3: '#A86E52' },
      sage: { ground: '#E6EAE4', paper: '#FAFBF8', line: '#D5DBD2', line2: '#EDF0EA', paper2: '#FFFFFF', canvas: '#DCE2D9', grip: '#C3CBBF', faint: '#A9B2A6', roofN: '#C9CFC5', roofS: '#BCC3B8', roof: '#C3C9BF', roofLine: '#949C90', ridge: '#879083', sky: '#DCE2D9', earth: '#CFD7CB', drive: '#C2C9BE', walls: '#EEF1EA', roof3: '#7F8A7B' },
      mist: { ground: '#E9ECEE', paper: '#FBFCFD', line: '#D8DDE1', line2: '#EEF1F3', paper2: '#FFFFFF', canvas: '#DFE3E6', grip: '#C5CCD2', faint: '#AAB2B9', roofN: '#C9CED3', roofS: '#BCC2C8', roof: '#C3C9CE', roofLine: '#939BA3', ridge: '#868E96', sky: '#DFE3E6', earth: '#D3D8DC', drive: '#C5CBD0', walls: '#F1F3F5', roof3: '#7C858E' },
      frost: { ground: '#F2F4F8', paper: '#FFFFFF', line: '#DDE1E6', line2: '#EEF1F5', paper2: '#FFFFFF', canvas: '#E8ECF1', grip: '#C1C7CD', faint: '#A2A9B0', ink: '#121619', ink2: '#4D5358', muted: '#697077', roofN: '#D0D6DD', roofS: '#C1C8D0', roof: '#C9CFD6', roofLine: '#97A0AA', ridge: '#88919B', sky: '#E8ECF1', earth: '#DDE2E8', drive: '#CDD3DA', walls: '#FFFFFF', roof3: '#6F7883' },
      night: { ground: '#16181D', paper: '#1F2228', line: '#30343C', line2: '#272A31', paper2: '#262A31', canvas: '#1B1E23', grip: '#3A3F48', faint: '#5B6068', ink: '#ECE9E3', ink2: '#C9CDD3', muted: '#A5ABB4', tip: '#ECE9E3', gain: '#6FCF97', gainSoft: '#1D3326', loss: '#F08A73', lossSoft: '#3A221D', sunText: '#E8B85C', sunSoft: '#3A2F18', roofN: '#50545D', roofS: '#454952', roof: '#4B4F58', roofLine: '#70757F', ridge: '#7E838D', sky: '#2A2E35', earth: '#33373F', drive: '#3B4048', walls: '#C9C4BA', roof3: '#5E5A54' }
    };
    var A = {
      spark: { live: '#FFC400', sun: '#F2A900', sel: ['#1E6B5C', '#7FC7B3'], selSoft: ['#E3EFEB', '#24332F'], battery: ['#B5653A', '#E0A27F'], batterySoft: ['#F3E6DD', '#3A2A20'] },
      current: { live: '#00B8A9', sun: '#F0A500', sel: ['#00796F', '#5FD3C6'], selSoft: ['#DDF3F0', '#1E3532'], battery: ['#5148C8', '#A9A3F2'], batterySoft: ['#E7E6F8', '#2A2948'] },
      signal: { live: '#0F62FE', onLive: '#FFFFFF', sun: '#F1C21B', sel: ['#0043CE', '#78A9FF'], selSoft: ['#EDF5FF', '#1C2B4A'], battery: ['#8A3FFC', '#BE95FF'], batterySoft: ['#F6F2FF', '#2E2147'] },
      volt: { live: '#C8EE00', sun: '#D69A00', sel: ['#0F5C46', '#8FD9B9'], selSoft: ['#E1EEE8', '#203830'], battery: ['#6C4BD8', '#B8A6F5'], batterySoft: ['#ECE7FB', '#2D2648'] }
    };
    var g = G[p.ground] || G.stone, a = A[p.accent] || A.spark, d = p.ground === 'night' ? 1 : 0;
    var t = { ink: '#1D2026', ink2: '#4A4F57', muted: '#6E737B', tip: '#1D2026', gain: '#2E7D4F', gainSoft: '#E3F1E8', loss: '#B3412C', lossSoft: '#F6E1DB', sunText: '#8A5E0A', sunSoft: '#F6EBD3', onLive: '#17191E' };
    Object.keys(g).forEach(function (k) { t[k] = g[k]; });
    t.live = a.live; t.sun = a.sun; if (a.onLive) t.onLive = a.onLive; t.sel = a.sel[d]; t.selSoft = a.selSoft[d]; t.battery = a.battery[d]; t.batterySoft = a.batterySoft[d]; t.dark = !!d;
    return t;
  };
  FN.vars = function (t) { return Object.keys(t).filter(function (k) { return k !== 'dark'; }).map(function (k) { return '--c-' + k + ':' + t[k]; }).join(';'); };

  /* three palette presets from design/palette, offered above the prototypes */
  FN.PRESETS = [{ ground: 'stone', accent: 'spark', en: 'Stone · Spark', fr: 'Pierre · Étincelle', den: 'warm stone, a yellow spark', dfr: 'pierre chaude, étincelle jaune' }, { ground: 'linen', accent: 'current', en: 'Linen · Live current', fr: 'Lin · Courant', den: 'light linen, a teal current', dfr: 'lin clair, courant turquoise' }, { ground: 'frost', accent: 'signal', en: 'Frost · Signal', fr: 'Givre · Signal', den: 'cool white, an electric blue', dfr: 'blanc froid, bleu électrique' }, { ground: 'night', accent: 'volt', en: 'Night · Volt', fr: 'Nuit · Volt', den: 'dark ground, an electric lime', dfr: 'fond sombre, citron électrique' }];
  // a preset's swatches: ground, card, selection, live action, battery
  FN.swatch = function (p) { var t = FN.tokens(p); return '<span class="bk-fw-sw" aria-hidden="true">' + [t.ground, t.paper, t.sel, t.live, t.battery].map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>'; };
  FN.paletteBar = function (fr) {
    return '<span class="bk-fw-pal"><button type="button" class="bk-fw-pal-btn" aria-haspopup="menu" aria-expanded="false"><span class="bk-fw-pal-k">' + (fr ? 'Palette' : 'Palette') + '</span><span class="bk-fw-pal-cur"></span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<span class="bk-fw-pal-menu" role="menu" hidden>' + FN.PRESETS.map(function (p, i) { return '<button type="button" role="menuitemradio" data-pal="' + i + '">' + FN.swatch(p) + '<span class="bk-fw-pal-t"><b>' + p[fr ? 'fr' : 'en'] + '</b><span>' + p[fr ? 'dfr' : 'den'] + '</span></span><svg class="bk-fw-pal-ok" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5 6 10.5 11 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'; }).join('') +
      '<a class="bk-fw-pal-more" href="palette.html">' + (fr ? 'Toutes les palettes ›' : 'All palettes ›') + '</a></span></span>';
  };
  FN.wirePalette = function (out) {
    var btn = out.querySelector('.bk-fw-pal-btn'), menu = out.querySelector('.bk-fw-pal-menu'), items = all('[data-pal]', out), fr = FN.isFr(out);
    function open(v) { menu.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) { var on = items.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0] || items[0]; on.focus(); } }
    function mark() {
      var cur = FN.palette();
      items.forEach(function (b) { var p = FN.PRESETS[+b.getAttribute('data-pal')], on = p.ground === cur.ground && p.accent === cur.accent; b.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) out.querySelector('.bk-fw-pal-cur').innerHTML = FN.swatch(p) + '<span>' + p[fr ? 'fr' : 'en'] + '</span>'; });
      if (!items.some(function (b) { return b.getAttribute('aria-checked') === 'true'; })) out.querySelector('.bk-fw-pal-cur').innerHTML = FN.swatch(cur) + '<span>' + (fr ? 'Personnalisée' : 'Custom') + '</span>';
    }
    btn.addEventListener('click', function () { open(menu.hidden); });
    items.forEach(function (b, i) {
      b.addEventListener('click', function () { var p = FN.PRESETS[+b.getAttribute('data-pal')]; try { localStorage.setItem(FN.PAL, JSON.stringify({ ground: p.ground, accent: p.accent })); } catch (e) {} window.dispatchEvent(new Event('sd-palette')); open(false); btn.focus(); });
      b.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); } });
    });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); open(false); btn.focus(); } });
    doc.addEventListener('click', function (e) { if (!menu.hidden && !out.querySelector('.bk-fw-pal').contains(e.target)) open(false); });
    window.addEventListener('sd-palette', mark); mark();
  };

  /* the device around a screen: tablet first (D-63), the same screen on a desktop, no phone yet */
  // The bezel keeps a fixed size in pixels and the screen scales inside it. Desktop shows the same
  // 1180 × 820 screen on a monitor; the phone layout is not designed, so the phone shows a note
  // and never an invented screen.
  FN.BEZEL = 14; // the tablet's padding in 82-widgets.css, used to size the figure in the page
  FN.DEV = [['tablet', 'Tablet', 'Tablette', '<rect x="1.5" y="3" width="15" height="11" rx="2"/><circle cx="9" cy="5.2" r=".5"/>'], ['desktop', 'Desktop', 'Ordinateur', '<rect x="1.5" y="2" width="15" height="10" rx="1.5"/><path d="M7 15.5h4M9 12v3.5"/>'], ['phone', 'Phone', 'Téléphone', '<rect x="5" y="1.5" width="8" height="15" rx="2"/><path d="M8 4h2"/>']];
  FN.devBar = function (fr) {
    return '<span class="bk-fw-seg bk-fw-dev" role="group" aria-label="' + (fr ? 'Appareil' : 'Device') + '">' + FN.DEV.map(function (d, i) { return '<button type="button" data-dev="' + d[0] + '" aria-pressed="' + (i ? 'false' : 'true') + '" aria-label="' + d[fr ? 2 : 1] + '" title="' + d[fr ? 2 : 1] + '"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' + d[3] + '</svg></button>'; }).join('') + '</span>';
  };
  FN.devBox = function (fr) {
    return '<div class="bk-fw-stage"><div class="bk-dv" data-dev="tablet"><div class="bk-fw"><div class="bk-fw-screen"></div></div><div class="bk-dv-note" hidden><b>' + (fr ? 'Téléphone · pas encore conçu' : 'Phone · not designed yet') + '</b><span>' +
      (fr ? 'Cet écran est conçu d’abord pour la tablette ; sa mise en page pour téléphone n’est pas encore dessinée. Passez à Tablette ou Ordinateur pour utiliser le prototype.' : 'This screen is designed for a tablet first; its phone layout is not drawn yet. Switch to Tablet or Desktop to use the prototype.') + '</span></div></div></div>';
  };
  FN.wireDev = function (out, fit) {
    var btns = all('.bk-fw-dev button', out), dvs = all('.bk-dv', out);
    btns.forEach(function (b) { b.addEventListener('click', function () { btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); dvs.forEach(function (d) { d.setAttribute('data-dev', b.getAttribute('data-dev')); }); fit(); }); });
  };
  // the room a device takes around its screen: padding, and the desktop's stand
  FN.devChrome = function (dv) { var cs = getComputedStyle(dv), n = function (k) { return parseFloat(cs[k]) || 0; }; return { x: n('paddingLeft') + n('paddingRight'), y: n('paddingTop') + n('paddingBottom') + n('marginBottom') }; };
  // the figure's height in the page for a width: the tablet at that width, never above real size
  FN.pageH = function (W, w, h) { return h * Math.min(1, (W - 2 * FN.BEZEL) / w) + 2 * FN.BEZEL; };
  // the largest screen that fits W × H with its device around it
  FN.fitDev = function (dv, W, H) {
    var c = FN.devChrome(dv), box = dv.querySelector('.bk-fw'), screen = box.firstChild, note = dv.querySelector('.bk-dv-note'), phone = dv.getAttribute('data-dev') === 'phone';
    box.hidden = phone; note.hidden = !phone;
    if (phone) { var ph = Math.max(0, Math.min(H - c.y, (W - c.x) / 0.47)); note.style.height = ph + 'px'; note.style.width = (ph * 0.47) + 'px'; return; }
    var w = parseFloat(screen.style.width), h = parseFloat(screen.style.height), s = Math.max(0, Math.min((W - c.x) / w, (H - c.y) / h));
    screen.style.transform = 'scale(' + s + ')'; box.style.width = (w * s) + 'px'; box.style.height = (h * s) + 'px';
  };

  /* Enlarge: the figure fills the screen (the Fullscreen API, or a fixed layer over the page) */
  // A placeholder keeps the figure's place in the page; Esc or Close puts it back.
  FN.enlarger = function (fig, big, fr, fit, onClose) {
    var ph = null, fs = false;
    function isOpen() { return fig.classList.contains('bk-fw-open'); }
    function set(open) {
      if (open === isOpen()) return;
      if (open) {
        var cs = getComputedStyle(fig);
        ph = doc.createElement('div'); ph.className = 'bk-fw-ph'; ph.style.height = fig.offsetHeight + 'px'; ph.style.marginTop = cs.marginTop; ph.style.marginBottom = cs.marginBottom;
        fig.parentNode.insertBefore(ph, fig);
      } else if (ph) { ph.parentNode.removeChild(ph); ph = null; }
      // the page under the layer keeps its width when its scroll bar goes
      root.style.paddingRight = open ? (window.innerWidth - root.clientWidth) + 'px' : '';
      fig.classList.toggle('bk-fw-open', open); root.classList.toggle('bk-fw-lock', open);
      big.textContent = open ? (fr ? 'Fermer' : 'Close') : (fr ? 'Agrandir' : 'Enlarge'); big.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && doc.fullscreenEnabled && fig.requestFullscreen) fig.requestFullscreen().catch(function () {});
      if (!open && doc.fullscreenElement === fig) doc.exitFullscreen().catch(function () {});
      if (!open && onClose) onClose();
      fit(); if (!open) big.focus();
    }
    big.setAttribute('aria-expanded', 'false'); big.title = 'Esc';
    big.addEventListener('click', function () { set(!isOpen()); });
    doc.addEventListener('fullscreenchange', function () { if (doc.fullscreenElement === fig) fs = true; else if (fs) { fs = false; set(false); } });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen() && !e.defaultPrevented) set(false); });
    window.addEventListener('resize', fit);
  };

  /* the frame: a fixed-size screen in its device, scaled to the figure, with Enlarge */
  FN.frame = function (fig, w, h) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), fr = FN.isFr(fig);
    if (svg) svg.style.display = 'none';
    out.innerHTML = '<div class="bk-fw-bar"><span class="bk-fw-say">' + (fr ? 'Prototype d’intention · écran du produit australien, en anglais' : 'Intention prototype · a screen of the Australian product') + '</span>' +
      '<span class="bk-fw-act">' + FN.devBar(fr) + FN.paletteBar(fr) + '<button type="button" class="bk-fw-big">' + (fr ? 'Agrandir' : 'Enlarge') + '</button></span></div>' + FN.devBox(fr);
    var stage = out.querySelector('.bk-fw-stage'), dv = out.querySelector('.bk-dv'), screen = out.querySelector('.bk-fw-screen');
    FN.wirePalette(out);
    screen.style.width = w + 'px'; screen.style.height = h + 'px';
    function fit() {
      var W = stage.clientWidth; if (!W) return;
      if (fig.classList.contains('bk-fw-open')) { stage.style.height = ''; FN.fitDev(dv, W, stage.clientHeight); }
      else { var H = FN.pageH(W, w, h); stage.style.height = H + 'px'; FN.fitDev(dv, W, H); }
    }
    FN.wireDev(out, fit);
    FN.enlarger(fig, out.querySelector('.bk-fw-big'), fr, fit);
    function paint() { screen.setAttribute('style', screen.getAttribute('style').replace(/--c-[^;]*;?/g, '') + ';' + FN.vars(FN.tokens())); fit(); }
    window.addEventListener('sd-palette', paint);
    paint();
    // the screen keeps its scale while the frame is hidden (the other language), then refits
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    return screen;
  };
  // run a widget only once its figure is shown (both languages sit in one page)
  FN.when = function (fig, start) {
    var done = false;
    function go() { if (!done && fig.offsetParent !== null) { done = true; start(); } }
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) go(); }).observe(fig);
    window.addEventListener('langchange', function () { setTimeout(go, 0); });
    setTimeout(go, 0);
  };
  // delegated events: data-a="action" (click), data-in="action" (range input)
  FN.wire = function (el, act) {
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b && el.contains(b) && !b.disabled) act(b.getAttribute('data-a'), b.getAttribute('data-v'), e); });
    // ranges act on release, so that a new render does not cut the gesture
    el.addEventListener('change', function (e) { var b = e.target.closest('[data-in]'); if (b) act(b.getAttribute('data-in'), b.value, e); });
  };

  /* the model: one Sydney household, 15 kWh a day, an evening peak */
  FN.LOAD = [0.42, 0.36, 0.34, 0.34, 0.36, 0.48, 0.82, 1.12, 0.98, 0.72, 0.66, 0.64, 0.62, 0.6, 0.64, 0.82, 1.12, 1.58, 1.82, 1.66, 1.32, 1.0, 0.74, 0.52];
  FN.base = function (perDay) { var s = FN.LOAD.reduce(function (a, b) { return a + b; }, 0); return FN.LOAD.map(function (x) { return x * (perDay || 15) / s; }); };
  FN.tou = function (h) { return (h >= 15 && h < 21) ? 0.52 : ((h >= 22 || h < 7) ? 0.22 : 0.30); };
  FN.PLANS = [
    { name: 'Flat Rate', rate: function () { return 0.36; }, supply: 1.10, fit: 0.05, credit: 0, need: '' },
    { name: 'Simple Saver', rate: function () { return 0.31; }, supply: 1.15, fit: 0.03, credit: 0, need: '' },
    { name: 'Time of Use Saver', rate: FN.tou, supply: 1.05, fit: 0.04, credit: 0, need: '' },
    { name: 'Solar Max', rate: function () { return 0.39; }, supply: 1.20, fit: 0.12, credit: 0, need: 'solar' },
    { name: 'EV Night', rate: function (h) { return h < 6 ? 0.12 : 0.42; }, supply: 1.15, fit: 0.05, credit: 0, need: 'ev' },
    { name: 'VPP Battery', rate: FN.tou, supply: 1.05, fit: 0.06, credit: 250, need: 'battery' }
  ];
  // o: { kwp, cap, ev, hp, plan: 'flat' | 'best', shade (kWp lost) }
  FN.sim = function (o) {
    var load = FN.base(15), kwp = (o.kwp || 0) - (o.shade || 0), solar = (o.kwp || 0) > 0, pv = [], sh = [], ss = 0, h;
    for (h = 0; h < 24; h++) { var v = (h >= 6 && h < 18) ? Math.sin(Math.PI * (h - 6 + 0.5) / 12) : 0; sh.push(v); ss += v; }
    for (h = 0; h < 24; h++) pv.push(kwp * 4.0 * sh[h] / ss);
    var evc = [];
    for (h = 0; h < 24; h++) {
      var c = !!o.ev && (solar ? (h >= 10 && h < 15) : h < 5); evc.push(c); if (c) load[h] += 6.4 / 5;
      if (o.hp && (solar ? (h >= 11 && h < 14) : (h >= 1 && h < 4))) load[h] += 1;
    }
    var cap = o.cap || 0, soc = 0, imp = [], exp = [], socs = [];
    for (var pass = 0; pass < 2; pass++) {
      imp = []; exp = []; socs = [];
      for (h = 0; h < 24; h++) {
        var net = pv[h] - load[h], i = 0, e = 0;
        if (net >= 0) { var ch = cap ? Math.min(net, 5, (cap - soc) / 0.95) : 0; soc += ch * 0.95; e = Math.min(net - ch, 5); }
        else { var d = cap ? Math.min(-net, 5, soc * 0.95) : 0; soc -= d / 0.95; i = -net - d; }
        imp.push(i); exp.push(e); socs.push(cap ? soc / cap : 0);
      }
    }
    var ok = function (p) { return !p.need || (p.need === 'solar' && solar) || (p.need === 'ev' && o.ev) || (p.need === 'battery' && cap > 0); };
    var list = o.plan === 'flat' ? [FN.PLANS[0]] : FN.PLANS.filter(ok), best = null;
    list.forEach(function (p) { var e = 0; for (var h = 0; h < 24; h++) e += imp[h] * p.rate(h) - exp[h] * p.fit; var b = (e + p.supply) * 365 - p.credit; if (!best || b < best.b) best = { p: p, b: b }; });
    var total = best.b + (o.hp ? 0 : 520) + (o.ev ? 0 : 2044);
    return { pv: pv, load: load, imp: imp, exp: exp, socs: socs, evc: evc, plan: best.p.name, power: best.b, total: total };
  };
  FN.TODAY = function () { return FN.sim({ plan: 'flat' }).total; };
  // incentives (design/markets/incentives): STC spot price about A$39.90 in October 2026; Sydney is zone 3 (1.382), 5 deeming years in 2026;
  // battery certificates = usable kWh by tier (100 % to 14 kWh, 60 % to 28, 15 % to 50) × the half-yearly factor (6.8 until 31 Dec 2026, then 5.7)
  FN.STC = 39.9;
  FN.stcSolar = function (kwp) { return Math.floor(kwp * 1.382 * 5); };
  FN.batteryCerts = function (s, factor) { return Math.floor((Math.min(s, 14) + 0.6 * Math.max(0, Math.min(s, 28) - 14) + 0.15 * Math.max(0, Math.min(s, 50) - 28)) * (factor || 6.8)); };
  FN.rebate = function (s, factor) { return FN.batteryCerts(s, factor) * FN.STC; };
  FN.path = function (arr, x0, w, base, max, hgt, close) {
    var s = close ? 'M' + x0 + ' ' + base + ' ' : '';
    for (var h = 0; h < 24; h++) { var x = (x0 + h / 23 * w).toFixed(1), y = (base - arr[h] / max * hgt).toFixed(1); s += (h || close ? 'L' : 'M') + x + ' ' + y + ' '; }
    return close ? s + 'L' + (x0 + w) + ' ' + base + ' Z' : s;
  };
  // the 28 editor icons from tools/figures/editor_icons.py (24-unit grid, 1.5 stroke, .dot solid marks, .dash dashed lines), plus household funnel icons
  FN.ED_ICON = {
    select: '<path d="M6 3.5v15.5l4.2-4 2.8 6 2.6-1.2-2.8-5.9 5.7-.2z"/>',
    vertex: '<path d="M5.5 17.5 9 6.5l9.5 4"/><rect x="3.5" y="15.5" width="4" height="4" rx=".5"/><rect x="7" y="4.5" width="4" height="4" rx=".5"/><rect x="16.5" y="8.5" width="4" height="4" rx=".5" fill="currentColor" stroke="none"/>',
    trace: '<path d="M4.5 19 8.5 8.5l7 4.5 4-8.5"/><circle cx="4.5" cy="19" r="1.75"/><circle cx="8.5" cy="8.5" r="1.75"/><circle cx="15.5" cy="13" r="1.75"/><circle cx="19.5" cy="4.5" r="2" fill="currentColor" stroke="none"/>',
    rect3: '<path d="M4 13.5 12.5 5l6.5 6.5"/><path d="M19 11.5 10.5 20 4 13.5" stroke-dasharray="2 2.5"/><circle cx="4" cy="13.5" r="1.75" fill="currentColor" stroke="none"/><circle cx="12.5" cy="5" r="1.75" fill="currentColor" stroke="none"/><circle cx="19" cy="11.5" r="1.75" fill="currentColor" stroke="none"/>',
    fill: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><rect x="6.5" y="6.5" width="4.75" height="4.75" rx=".5"/><rect x="12.75" y="6.5" width="4.75" height="4.75" rx=".5"/><rect x="6.5" y="12.75" width="4.75" height="4.75" rx=".5"/><path d="M15.1 13v4.2M13 15.1h4.2"/>',
    panel: '<rect x="5.5" y="3" width="13" height="18" rx="1"/><path d="M5.5 9h13M5.5 15h13M12 3v18"/>',
    snap: '<path d="M5 3.5h4.5V12a2.5 2.5 0 0 0 5 0V3.5H19V12a7 7 0 0 1-14 0z"/><path d="M5 7.5h4.5M14.5 7.5H19"/>',
    dyninput: '<path d="M3.5 20.5 11 13"/><circle cx="3.5" cy="20.5" r="1.5"/><rect x="11.5" y="3.5" width="9" height="7" rx="1"/><path d="M14.5 5.5v3"/>',
    chimney: '<path d="M2.5 19.5 12 11l9.5 8.5"/><path d="M14.5 13.2V5.5h4v11.3"/><path d="M13.5 5.5h6"/>',
    skylight: '<rect x="4.5" y="3.5" width="15" height="17" rx="1"/><rect x="7.5" y="6.5" width="9" height="11" rx=".5"/><path d="m9.5 14 5-5"/>',
    antenna: '<path d="M12 21V5M6.5 5h11M8 8.5h8M9.5 12h5M9 21h6"/>',
    box: '<path d="M4 9.5h11v11H4z"/><path d="M4 9.5 8.5 5h11v11L15 20.5M15 9.5 19.5 5"/>',
    cylinder: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v11a7 3 0 0 0 14 0v-11"/>',
    prism: '<path d="M4 9 12 3.5 20 9l-3 11.5H7z"/><path d="M12 3.5v6.5L7 20.5M12 10l5 10.5" stroke-width="1"/>',
    height: '<path d="M12 18V4.5M8.5 8 12 4.5 15.5 8"/><path d="M4.5 20.5h15"/>',
    pan: '<path d="M8.5 13V6.5a1.5 1.5 0 0 1 3 0v4.5M11.5 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14.5 10.5V6.5a1.5 1.5 0 0 1 3 0v6.5a7.5 7.5 0 0 1-7.5 7.5 6.5 6.5 0 0 1-5.4-2.9L3.6 15a1.6 1.6 0 0 1 2.6-1.9L8.5 15"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.3 15.3 5.2 5.2M10.5 8v5M8 10.5h5"/>',
    fit: '<path d="M3.5 8.5v-5h5M15.5 3.5h5v5M20.5 15.5v5h-5M8.5 20.5h-5v-5"/><rect x="8" y="9" width="8" height="6" rx=".5"/>',
    north: '<circle cx="12" cy="12" r="8.5"/><path d="M12 5.5 14.2 12 12 18.5 9.8 12z"/><path d="M12 5.5 14.2 12H9.8z" fill="currentColor" stroke="none"/>',
    dimension: '<path d="M4 6v12M20 6v12M4 12h16"/><path d="M7 9.5 4.5 12 7 14.5M17 9.5l2.5 2.5-2.5 2.5"/>',
    note: '<path d="M12 21s-6.5-5.9-6.5-11a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11z"/><path d="M9.5 8.5h5M9.5 11.5h3.5"/>',
    photo: '<rect x="3" y="7" width="18" height="12.5" rx="1.5"/><path d="m8.5 7 1.5-2.5h4L15.5 7"/><circle cx="12" cy="13.25" r="3.25"/>',
    measure: '<path d="M3 16.5 16.5 3 21 7.5 7.5 21z"/><path d="m7 12.5 2 2M10 9.5l2 2M13 6.5l2 2"/>',
    layers: '<path d="M12 3.5 20.5 8 12 12.5 3.5 8z"/><path d="M3.5 12 12 16.5 20.5 12M3.5 16 12 20.5l8.5-4.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    undo: '<path d="M9 4.5 4.5 9 9 13.5"/><path d="M4.5 9H14a5.5 5.5 0 0 1 0 11h-3"/>',
    redo: '<path d="m15 4.5 4.5 4.5-4.5 4.5"/><path d="M19.5 9H10a5.5 5.5 0 0 0 0 11h3"/>',
    delete: '<path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 14h9l1-14M10 10.5v6.5M14 10.5v6.5"/>'
  };
  // household funnel icons: a line path and a 14 % fill, 1.25 stroke on a 24 grid
  FN.ICON = {
    confirm: ['M5 12.5l4.5 4.5L19 7.5', 'M5 12.5l4.5 4.5L19 7.5z'],
    meter: ['M4.5 16a7.5 7.5 0 1 1 15 0M12 16l3.5-4.5M4.5 16h15M7 19.5h10', 'M4.5 16a7.5 7.5 0 1 1 15 0z'],
    bill: ['M6.5 3.5h8l3 3v14h-11zM14.5 3.5v3h3M9 10h6M9 13h6M9 16h4', 'M6.5 3.5h8l3 3v14h-11z'],
    ask: ['M4.5 6.5h15v9h-8l-4 3.5v-3.5h-3zM9 10.5h6M9 13h3.5', 'M4.5 6.5h15v9h-15z'],
    plan: ['M5 7h11l-3-3M19 17H8l3 3', 'M5 7h11v10H8z'],
    heat: ['M6 4.5h12v15H6zM9 8.5h6M12 11v6M9.5 14l2.5 3 2.5-3', 'M6 4.5h12v15H6z'],
    car: ['M4 15.5l2-5h12l2 5v3H4zM7.5 18.5v1.5M16.5 18.5v1.5M12.5 6l-2 3.5h3l-2 3.5', 'M4 15.5l2-5h12l2 5v3H4z'],
    battery: ['M8 5.5h8v15H8zM10.5 3.5h3v2M10.5 12.5l2-3v2.5h1.5l-2 3V12z', 'M8 5.5h8v15H8z'],
    person: ['M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20.5a7 7 0 0 1 14 0', 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
    away: ['M4 8.5h16v11H4zM9 8.5V6h6v2.5M4 13h16', 'M4 8.5h16v11H4z'],
    some: ['M4 11l8-6.5 8 6.5v8.5H4zM12 19.5v-5', 'M12 4.5l8 6.5v8.5h-8z'],
    home: ['M4 11l8-6.5 8 6.5v8.5H4zM10 19.5v-5h4v5', 'M4 11l8-6.5 8 6.5v8.5H4z'],
    split: ['M3.5 6h17v6h-17zM6 9.5h12M7 15l-1 3M12 15v3.5M17 15l1 3', 'M3.5 6h17v6h-17z'],
    ducted: ['M3.5 5.5h17v4h-17zM6 9.5v3M12 9.5v3M18 9.5v3M5 15.5h3M10.5 15.5h3M16 15.5h3', 'M3.5 5.5h17v4h-17z'],
    flame: ['M12 20.5c-3.5 0-5.5-2.4-5.5-5.3 0-3.2 2.6-4.6 3.4-8 1.8 1.3 2.6 3 2.6 4.6 1-.6 1.6-1.6 1.9-2.6 1.9 1.6 3.1 3.6 3.1 6 0 2.9-2 5.3-5.5 5.3z', 'M12 20.5c-3.5 0-5.5-2.4-5.5-5.3 0-3.2 2.6-4.6 3.4-8 1.8 1.3 2.6 3 2.6 4.6 1-.6 1.6-1.6 1.9-2.6 1.9 1.6 3.1 3.6 3.1 6 0 2.9-2 5.3-5.5 5.3z'],
    none: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM6 18L18 6', ''],
    tank: ['M7.5 3.5h9v17h-9zM7.5 8h9M10 12h4M12 12v4', 'M7.5 3.5h9v17h-9z'],
    solarhw: ['M3.5 13l5-7.5h12l-5 7.5zM6 9.3h12M11 5.5l-5 7.5M15.5 5.5l-5 7.5M8 13v6M15 13v6', 'M3.5 13l5-7.5h12l-5 7.5z'],
    gasstove: ['M4 14.5h16v5H4zM8 14.5c0-1.5 1.2-2 1.2-3.5M12 14.5c0-1.5 1.2-2 1.2-3.5M16 14.5c0-1.5 1.2-2 1.2-3.5', 'M4 14.5h16v5H4z'],
    stove: ['M4 6.5h16v13H4zM9 13a2.5 2.5 0 1 0 0-.01M15 13a2.5 2.5 0 1 0 0-.01', 'M4 6.5h16v13H4z'],
    induction: ['M4 6.5h16v13H4zM9 10.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM15 10.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM9 12.3a.7.7 0 1 1 0 1.4M15 12.3a.7.7 0 1 1 0 1.4', 'M4 6.5h16v13H4z'],
    pool: ['M3.5 15c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 2-1M3.5 19c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1M8 13V5a2 2 0 0 1 4 0M14 13V5a2 2 0 0 1 4 0M8 9h6', ''],
    pump: ['M4 9.5h10v8H4zM14 12h4v3h-4M18 13.5h2.5M9 9.5V6M7 6h4', 'M4 9.5h10v8H4z'],
    pv: ['M3.5 17l4-11h13l-4 11zM5.7 11.5h13M11 6l-4 11M15.5 6l-4 11', 'M3.5 17l4-11h13l-4 11z']
  };
  FN.icon = function (k, color, sz) {
    var s = sz || 24;
    if (FN.ED_ICON[k]) {
      return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" style="color:' + (color || 'currentColor') + ';flex-shrink:0"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + FN.ED_ICON[k] + '</g></svg>';
    }
    var i = FN.ICON[k] || FN.ICON.confirm;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" style="color:' + (color || 'currentColor') + ';flex-shrink:0"><path d="' + i[1] + '" fill="currentColor" opacity="0.14"></path><path d="' + i[0] + '" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  };
  FN.SUN = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="var(--c-sun)"></circle><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="var(--c-sun)" stroke-width="1.25" stroke-linecap="round"></path></svg>';

  /* the roof of every prototype: a 15 × 10 m hip roof at 22°, 40 px a metre in plan */
  FN.FACES = { N: 'M218 156 L818 156 L668 356 L368 356 Z', S: 'M218 556 L818 556 L668 356 L368 356 Z', W: 'M218 156 L368 356 L218 556 Z', E: 'M818 156 L668 356 L818 556 Z' };
  FN.layout = function (variant) {
    var rows = variant === 'landscape' ? [['l', 172, 6], ['l', 218, 5], ['l', 264, 4]] : variant === 'mixed' ? [['p', 172, 9], ['l', 241, 5], ['l', 287, 4]] : [['p', 172, 9], ['p', 241, 7]];
    var out = [];
    rows.forEach(function (r) {
      var w = r[0] === 'p' ? 45 : 70, h = r[0] === 'p' ? 65 : 42, y = r[1], yb = y + h, n = r[2];
      var left = 218 + 0.75 * (yb - 156) + 16, right = 818 - 0.75 * (yb - 156) - 16, x0 = left + (right - left - (n * w + (n - 1) * 4)) / 2;
      for (var i = 0; i < n; i++) out.push({ id: r[0] + y + '-' + i, x: x0 + i * (w + 4), y: y, w: w, h: h });
    });
    return out;
  };

  /* the household's site on the 3D home: equipment on its walls, the cables between, the checks and what the
     installer verifies on site; both screens read these (D-72) */
  // the homes of the 3D scene, each from one description (D-72): the footprint clockwise seen from above
  // (x east, z south, metres) with a height per wall, the blocks that stand on it ([x0, z0, x1, z1, height,
  // roof]: 'main' under the roof type the household picked, 'flat' a schematic flat roof), the doors and
  // windows by wall and distance along it (y0 and y1 when they are not a window's 0.95–2.15 m), where the
  // strings come down (pv), where the household's units go by default (eq) and where they stand before it
  // places them (stand). The walls, the openings, the battery zones, the anchors and the cables all read it.
  FN.HOMES = {
    rect: {
      en: 'Rectangle', fr: 'Rectangle',
      foot: [[-7.5, -5], [7.5, -5], [7.5, 5], [-7.5, 5]], wallH: [3, 3, 3, 3],
      names: ['north', 'east', 'south', 'west'], namesFr: ['nord', 'est', 'sud', 'ouest'],
      bodies: [[-7.5, -5, 7.5, 5, 3, 'main']],
      open: [{ w: 0, s0: 2.4, s1: 4.2, k: 'win' }, { w: 0, s0: 6.4, s1: 8.6, k: 'win' }, { w: 0, s0: 10.8, s1: 12.6, k: 'win' }, { w: 1, s0: 2.75, s1: 4.25, k: 'win' },
        { w: 2, s0: 3.7, s1: 5.7, k: 'win' }, { w: 2, s0: 9.6, s1: 12.4, k: 'door', y0: 0.4, y1: 2.3 }, { w: 3, s0: 2.5, s1: 3.9, k: 'win', y0: 1, y1: 2.1 }, { w: 3, s0: 5.9, s1: 7.3, k: 'win', y0: 1, y1: 2.1 }],
      pv: { w: 0, s: 13.7 },
      eq: { inv: { w: 1, s: 5.4 }, bat: { w: 1, s: 7.0 }, sb: { w: 1, s: 1.2 }, evc: { w: 1, s: 9.3 }, hp: { w: 3, s: 4.7 } },
      stand: { inv: { w: 1, s: 5.9 }, bat: { w: 1, s: 7.2 }, sb: { w: 1, s: 4.3 }, evc: { w: 1, s: 8.6 }, hp: { w: 3, s: 3.5 } }
    },
    // the same house with a 6 × 6 m garage on its south-west corner: an L of seven walls, one of them a
    // re-entrant corner the cables turn round; the garage's flat roof is schematic
    ell: {
      en: 'L with a garage', fr: 'En L avec garage',
      foot: [[-7.5, -5], [7.5, -5], [7.5, 5], [-1.5, 5], [-1.5, 11], [-7.5, 11], [-7.5, 5]], wallH: [3, 3, 3, 2.7, 2.7, 2.7, 3],
      names: ['north', 'east', 'south', 'garage’s east', 'garage’s south', 'garage’s west', 'west'], namesFr: ['nord', 'est', 'sud', 'est du garage', 'sud du garage', 'ouest du garage', 'ouest'],
      bodies: [[-7.5, -5, 7.5, 5, 3, 'main'], [-7.5, 5, -1.5, 11, 2.7, 'flat']],
      open: [{ w: 0, s0: 2.4, s1: 4.2, k: 'win' }, { w: 0, s0: 6.4, s1: 8.6, k: 'win' }, { w: 0, s0: 10.8, s1: 12.6, k: 'win' }, { w: 1, s0: 2.75, s1: 4.25, k: 'win' },
        { w: 2, s0: 3.7, s1: 5.7, k: 'win' }, { w: 2, s0: 6.6, s1: 8.4, k: 'door', y0: 0.4, y1: 2.3 }, { w: 3, s0: 1, s1: 1.9, k: 'door', y0: 0.3, y1: 2.3 },
        { w: 4, s0: 0.6, s1: 5.4, k: 'gdoor', y0: 0.3, y1: 2.4 }, { w: 6, s0: 2.5, s1: 3.9, k: 'win', y0: 1, y1: 2.1 }, { w: 6, s0: 5.9, s1: 7.3, k: 'win', y0: 1, y1: 2.1 }],
      pv: { w: 0, s: 13.7 },
      eq: { inv: { w: 1, s: 5.4 }, bat: { w: 1, s: 7.0 }, sb: { w: 1, s: 1.2 }, evc: { w: 1, s: 9.3 }, hp: { w: 3, s: 3.8 } },
      stand: { inv: { w: 1, s: 5.9 }, bat: { w: 1, s: 7.2 }, sb: { w: 1, s: 4.3 }, evc: { w: 1, s: 8.6 }, hp: { w: 3, s: 3.8 } }
    }
  };
  FN.homeW = {};
  // a home's description and its walls for the site core, from a key or the household's site (S.home)
  FN.home = function (S) {
    var k = typeof S === 'string' ? S : S && S.home;
    if (!FN.HOMES[k]) k = 'rect';
    var D = FN.HOMES[k];
    return { key: k, D: D, W: FN.homeW[k] || (FN.homeW[k] = smWalls(D.foot, D.wallH)) };
  };
  FN.wallName = function (S, w) { return FN.home(S).D.names[w]; };
  FN.EQD = { inv: { n: 'Inverter', W: 0.45, H: 0.55, y0: 1.375 }, bat: { n: 'Battery', W: 0.74, H: 1.12, y0: 0.39 }, sb: { n: 'Switchboard', W: 0.5, H: 0.7, y0: 1.2 }, evc: { n: 'Charger', W: 0.25, H: 0.4, y0: 1.0 }, hp: { n: 'Heat pump', W: 0.96, H: 0.82, y0: 0.1 } };
  FN.CIRC = [['dc', 'Strings', '#E8A800', 'pv', 'inv', 'solar'], ['ac', 'Inverter to board', '#3D4650', 'inv', 'sb', 'solar'], ['bat', 'Battery', '#7A5BD0', 'inv', 'bat', 'bat'], ['ev', 'Charger', '#1F7A55', 'sb', 'evc', 'ev'], ['hp', 'Heat pump', '#2457C5', 'sb', 'hp', 'hp']];
  // where a unit can stand on a wall: on it, 0.2 m clear of each end; none when the wall is too short for it
  FN.eqFit = function (W, k, a) {
    var d = FN.EQD[k], wl = W[a.w];
    if (!wl || wl.L < d.W + 0.4) return null;
    return { w: a.w, s: Math.max(d.W / 2 + 0.2, Math.min(wl.L - d.W / 2 - 0.2, a.s)) };
  };
  // the household's units by default, each on a wall long enough for it (else the middle of the longest)
  FN.EQPOS = function (S) {
    var hm = FN.home(S), W = hm.W, out = {};
    Object.keys(hm.D.eq).forEach(function (k) {
      var j = W.reduce(function (b, wl, i) { return wl.L > W[b].L ? i : b; }, 0);
      out[k] = FN.eqFit(W, k, hm.D.eq[k]) || { w: j, s: W[j].L / 2 };
    });
    return out;
  };
  FN.eqOn = function (S, k) { var M = S.measures; return { inv: M.solar || M.bat, bat: M.bat, sb: M.solar || M.bat || M.ev || M.hp, evc: M.ev, hp: M.hp }[k]; };
  FN.wires = function (S) {
    var hm = FN.home(S), W = hm.W, P = S.eqPos || FN.EQPOS(S), run = 2.4, off = 0.06;
    var tap = function (k) { var d = FN.EQD[k]; return { a: P[k], p: smAt(W, P[k].w, P[k].s, off, Math.min(d.y0 + d.H, run)) }; };
    return FN.CIRC.filter(function (c) { return S.measures[c[5]] && FN.eqOn(S, c[4]); }).map(function (c) {
      var B = tap(c[4]), pts;
      // the strings leave the north face at its east end, down the fascia to the run
      if (c[3] === 'pv') pts = [[6.2, 3.55, -4.7], [6.2, 2.86, -5.37], [6.2, run, -5.37]].concat(smRoute(W, hm.D.pv, B.a, run, off));
      else { var A = tap(c[3]); pts = [A.p].concat(smRoute(W, A.a, B.a, run, off)); }
      pts.push(B.p);
      pts = pts.filter(function (p, i) { return i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) > 1e-6; });
      return { id: c[0], name: c[1], color: c[2], from: c[3], to: c[4], pts: pts, len: smLen(pts), vert: smVert(pts) };
    });
  };
  FN.checks = function (S) {
    var hm = FN.home(S), P = S.eqPos || FN.EQPOS(S), out = [], b = P.bat, d = FN.EQD.bat;
    if (S.measures.bat) {
      var hit = smZones({ rule: 'bat', open: hm.D.open }).filter(function (z) { return z.w === b.w && b.s + d.W / 2 > z.s0 && b.s - d.W / 2 < z.s1; })[0];
      out.push(hit ? { k: 'bat', bad: true, t: 'Battery inside the zone of a ' + (hit.k === 'door' ? 'door' : 'window') + ': AS/NZS 5139 keeps it 600 mm from an exit, 600 mm beside and 900 mm below a window of a habitable room (to verify against the standard).' } : { k: 'bat', t: 'Battery clear of the zones around doors and windows.' });
    }
    if (S.measures.ev) {
      var c = smAt(hm.W, P.evc.w, P.evc.s, 0.1, 1.0), r = Math.hypot(c[0] - 10.05, c[1] - 0.85, c[2] - 3.7) * 1.15;
      out.push(r > 5 ? { k: 'evc', bad: true, t: 'The charger’s 5 m tethered cable does not reach the car (' + r.toFixed(1) + ' m): move it closer to the driveway.' } : { k: 'evc', t: 'Charger cable to the car: about ' + r.toFixed(1) + ' m of 5 m.' });
    }
    return out;
  };
  // what the household declared and the installer confirms on site: the site's type, the zones it added,
  // where each unit goes, the cables' estimate and any check that fails
  // the site's Australian categories from its type and the capacity summed over every zone (D-73): the
  // support scheme, the planning pathway and the network connection, as the raw report read them
  // roofKwp is what the design prices, the zones the installer confirmed included (ok: one flag a zone,
  // the zones' own by default); the zones still to check are added on top
  FN.siteCats = function (S, roofKwp, kVA, ok) {
    var Z = S && S.zones || [], on = function (i) { return ok ? !!ok[i] : !!Z[i].ok; };
    var zn = Z.reduce(function (a, z, i) { return a + (on(i) ? 0 : z.n); }, 0), kwp = roofKwp + zn * SMKWC;
    var kind = !S || !S.site || S.site === 'house' || S.site === 'units' || S.site === 'other' ? 'house' : S.site === 'carpark' ? 'park' : 'ci';
    var carport = !!(S && (S.zones || []).some(function (z) { return z.k === 'carport'; }));
    var c = smCats(kind, { kWc: kwp, kVA: kVA, ph: 1, carport: carport, cover: 0 }, false, function (v) { return v.toFixed(1); })[1];
    return { kwp: kwp, kva: kVA, zones: zn, support: c[1], planning: c[2], connection: c[3] };
  };
  // the household's zones the installer confirmed on site: they join the design and the offer
  FN.zonesOk = function (S, ok) {
    return (S && S.zones || []).filter(function (z, i) { return ok ? !!ok[i] : !!z.ok; });
  };
  FN.ZONENAME = { carport: 'carport', custom: 'custom zone' };
  FN.toVerify = function (S) {
    var r = [], P = S.eqPos || FN.EQPOS(S);
    var SN = { house: 'a house', units: 'an apartment building', business: 'a business site', carpark: 'a car park', other: 'another kind of site' };
    if (S.site) r.push(['Site type', SN[S.site] + ', confirmed by the household']);
    (S.zones || []).forEach(function (z) { r.push([z.k === 'carport' ? 'Carport' : 'Custom zone', z.n + ' modules · ' + (z.ok ? 'confirmed on site, priced ✓' : z.k === 'carport' ? 'a new structure: approval and engineering' : 'checked against no rule yet')]); });
    Object.keys(FN.EQD).forEach(function (k) { if (FN.eqOn(S, k)) r.push([FN.EQD[k].n, FN.wallName(S, P[k].w) + ' wall, ' + P[k].s.toFixed(1) + ' m along it' + (S.ok && S.ok[k] ? ' · confirmed ✓' : '')]); });
    var W = FN.wires(S);
    if (W.length) r.push(['Cables', W.reduce(function (a, w) { return a + w.len; }, 0).toFixed(1) + ' m in all, estimated along the walls']);
    FN.checks(S).filter(function (c) { return c.bad; }).forEach(function (c) { r.push(['To fix', c.t, true]); });
    return r;
  };
  /* the 3D house, shared by the household's next move and the studio's 3D card */
  FN.threeWait = [];
  FN.loadThree = function (done) {
    if (window.THREE) { done(); return; }
    FN.threeWait.push(done);
    if (FN.threeWait.length > 1) return;
    loadScript('vendor/three-0.186.1.min.js', function () {
      var w = FN.threeWait.slice(); FN.threeWait = [];
      w.forEach(function (f) { f(); });
    });
  };
  FN.panelTex = function (T, shaded) {
    var cv = doc.createElement('canvas'); cv.width = 128; cv.height = 192;
    var c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 128, 192);
    g.addColorStop(0, shaded ? '#323E4B' : '#1A2736');
    g.addColorStop(0.55, shaded ? '#3B4856' : '#233447');
    g.addColorStop(1, shaded ? '#2B3642' : '#16212E');
    c.fillStyle = g; c.fillRect(0, 0, 128, 192);
    c.strokeStyle = shaded ? 'rgba(180,195,210,0.18)' : 'rgba(140,175,210,0.22)'; c.lineWidth = 1;
    var i;
    for (i = 1; i < 6; i++) { var x = Math.round(i * 128 / 6) + 0.5; c.beginPath(); c.moveTo(x, 4); c.lineTo(x, 188); c.stroke(); }
    for (i = 1; i < 12; i++) { var y = Math.round(i * 192 / 12) + 0.5; c.beginPath(); c.moveTo(4, y); c.lineTo(124, y); c.stroke(); }
    c.strokeStyle = shaded ? 'rgba(200,212,224,0.28)' : 'rgba(175,205,235,0.34)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(4, 96); c.lineTo(124, 96); c.stroke();
    var tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    return tx;
  };
  FN.groundAlphaTex = function (T) {
    var cv = doc.createElement('canvas'); cv.width = 256; cv.height = 256;
    var c = cv.getContext('2d'), g = c.createRadialGradient(128, 128, 56, 128, 128, 126);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.45, '#E6E6E6'); g.addColorStop(0.78, '#666666'); g.addColorStop(1, '#000000');
    c.fillStyle = '#000000'; c.fillRect(0, 0, 256, 256);
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(cv);
  };
  FN.contactAoTex = function (T, bodies) {
    var cv = doc.createElement('canvas'); cv.width = 256; cv.height = 256;
    var c = cv.getContext('2d'), px = function (x) { return (x + 20) / 40 * 256; }, pz = function (z) { return (z + 16) / 32 * 256; };
    // Multi-pass soft rect for house base + roof overhang ambient occlusion
    var i, pad, a;
    for (i = 0; i < 8; i++) {
      pad = (8 - i) * 0.22; a = 0.026;
      c.fillStyle = 'rgba(29,32,38,' + a + ')';
      (bodies || FN.HOMES.rect.bodies).forEach(function (b) { c.fillRect(px(b[0] - 0.1 - pad), pz(b[1] - 0.1 - pad), (b[2] - b[0] + 0.2 + pad * 2) / 40 * 256, (b[3] - b[1] + 0.2 + pad * 2) / 32 * 256); });
    }
    // Soft radial contact shadow under the tree (-12, -9)
    var tx = px(-12), tz = pz(-9), tr = 2.8 / 40 * 256, tg = c.createRadialGradient(tx, tz, 1, tx, tz, tr);
    tg.addColorStop(0, 'rgba(29,32,38,0.22)'); tg.addColorStop(0.55, 'rgba(29,32,38,0.10)'); tg.addColorStop(1, 'rgba(29,32,38,0)');
    c.fillStyle = tg; c.beginPath(); c.arc(tx, tz, tr, 0, Math.PI * 2); c.fill();
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    return tex;
  };
  FN.three = function (canvas, done) {
    var go = function () {
      var T = window.THREE, r = new T.WebGLRenderer({ canvas: canvas, antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFShadowMap;
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.NeutralToneMapping; r.toneMappingExposure = 1.02;
      var C = FN.tokens(), sc = new T.Scene(); sc.background = new T.Color(C.sky);
      var mat = function (c, o) { var m = { color: c, roughness: 0.85 }; for (var k in (o || {})) m[k] = o[k]; return new T.MeshStandardMaterial(m); };
      var mEdge = new T.LineBasicMaterial({ color: C.roofLine, transparent: true, opacity: 0.55 });
      var mRidge = mat(C.ridge, { roughness: 0.7 });
      var addEdges = function (parent, geom, thresh) {
        var ln = new T.LineSegments(new T.EdgesGeometry(geom, thresh || 22), mEdge);
        parent.add(ln); return ln;
      };
      // Extrude a convex 3D polygon (CCW seen from +y) downwards by vertical thickness th
      var prism = function (pts, th) {
        var out = [], n = pts.length, i, a, b, c;
        for (i = 1; i < n - 1; i++) {
          a = pts[0]; b = pts[i]; c = pts[i + 1];
          out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
          out.push(a[0], a[1] - th, a[2], c[0], c[1] - th, c[2], b[0], b[1] - th, b[2]);
        }
        for (i = 0; i < n; i++) {
          a = pts[i]; b = pts[(i + 1) % n];
          out.push(a[0], a[1], a[2], a[0], a[1] - th, a[2], b[0], b[1] - th, b[2]);
          out.push(a[0], a[1], a[2], b[0], b[1] - th, b[2], b[0], b[1], b[2]);
        }
        return out;
      };
      var beam = function (p1, p2, w, h, material) {
        var dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2], len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var m = new T.Mesh(new T.BoxGeometry(w, h, len + 0.04), material);
        m.position.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2);
        m.lookAt(p2[0], p2[1], p2[2]); m.castShadow = true; m.receiveShadow = true;
        return m;
      };
      var gnd = new T.Mesh(new T.PlaneGeometry(96, 96), mat(C.earth, { alphaMap: FN.groundAlphaTex(T), transparent: true, roughness: 0.95 }));
      gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; sc.add(gnd);
      var drive = new T.Mesh(new T.PlaneGeometry(6, 14), mat(C.drive, { roughness: 0.9 })); drive.rotation.x = -Math.PI / 2; drive.position.set(11, 0.01, 4); drive.receiveShadow = true; sc.add(drive);
      var aoPlane = new T.Mesh(new T.PlaneGeometry(40, 32), new T.MeshBasicMaterial({ map: FN.contactAoTex(T), transparent: true, depthWrite: false }));
      aoPlane.rotation.x = -Math.PI / 2; aoPlane.position.y = 0.018; sc.add(aoPlane);
      // House: plinths, walls and openings from the home's description (H.setHome), gable/skillion wall extensions,
      // roof slabs with overhang + fascia, ridge caps
      // the maquette's look from the site core: walls darker at their foot, tile courses, contact shadows
      var mWall = mat(C.walls, { roughness: 0.88 }), courseTex = smCourseTex(T), seamTex = smSeamTex(T), aoTex = smAoTex(T);
      var homeG = new T.Group(); sc.add(homeG);
      var mWallV = mat(C.walls, { roughness: 0.88, vertexColors: true }), mPlinth = mat(C.drive, { roughness: 0.9 }), mFlat = mat(C.roof3, { roughness: 0.8 });
      var mWin = mat('#4A525D', { roughness: 0.3, metalness: 0.2 }), mSill = mat(C.drive, { roughness: 0.85 }), mGdoor = mat('#9AA0A6', { roughness: 0.6, metalness: 0.2 });
      var gables = new T.Mesh(new T.BufferGeometry(), mWall); gables.castShadow = true; gables.receiveShadow = true; sc.add(gables);
      var mRoof = mat(C.roof3, { roughness: 0.78, map: courseTex });
      var roof = new T.Mesh(new T.BufferGeometry(), mRoof); roof.castShadow = true; roof.receiveShadow = true; sc.add(roof);
      var roofEdges = null, gableEdges = null, ridges = new T.Group(); sc.add(ridges);
      // Faceted architectural tree (polyhedral crown masses + tapered trunk + branches)
      var tree = new T.Group(); tree.position.set(-12, 0, -9);
      var mBark = mat('#6B5543', { roughness: 0.9, flatShading: true }), mLeaf1 = mat('#7A9374', { roughness: 0.82, flatShading: true }), mLeaf2 = mat('#6D8667', { roughness: 0.85, flatShading: true });
      var trunk = new T.Mesh(new T.CylinderGeometry(0.14, 0.28, 2.7, 7), mBark); trunk.position.y = 1.35; trunk.castShadow = true; tree.add(trunk);
      var br1 = new T.Mesh(new T.CylinderGeometry(0.07, 0.12, 1.2, 6), mBark); br1.position.set(0.32, 2.35, 0.15); br1.rotation.z = -0.55; br1.castShadow = true; tree.add(br1);
      var br2 = new T.Mesh(new T.CylinderGeometry(0.06, 0.11, 1.0, 6), mBark); br2.position.set(-0.28, 2.2, -0.2); br2.rotation.z = 0.5; br2.rotation.x = -0.3; br2.castShadow = true; tree.add(br2);
      [[0, 4.3, 0, 2.15, 0.82, 0.2, mLeaf1], [-1.05, 3.75, 0.55, 1.45, 0.85, 0.7, mLeaf2], [1.0, 3.85, -0.45, 1.5, 0.8, 1.1, mLeaf2], [0.25, 5.15, -0.2, 1.35, 0.78, 0.4, mLeaf1]].forEach(function (c) {
        var cg = new T.IcosahedronGeometry(c[3], 1); cg.scale(1, c[4], 0.96);
        var cm = new T.Mesh(cg, c[6]); cm.position.set(c[0], c[1], c[2]); cm.rotation.set(c[5] * 0.4, c[5], c[5] * 0.2);
        cm.castShadow = true; cm.receiveShadow = true; tree.add(cm);
      });
      sc.add(tree);
      // Equipment from the site core, each on its wall: battery, inverter and board on the east wall,
      // the charger by the driveway (it comes with the car), the heat pump's outdoor unit on the west wall
      var unit = function (k, e, x, y, z, ry, parent) {
        var g = smEquip(T, k, e, mat); g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        addEdges(g.userData.body, g.userData.body.geometry, 30);
        g.userData.e = e; g.position.set(x, y, z); g.rotation.y = ry; (parent || sc).add(g); return g;
      };
      var east = Math.PI / 2, west = -Math.PI / 2;
      var EQ3 = {}, bat = EQ3.bat = unit('bat', { W: 0.74, H: 1.12, D: 0.24, c: '#EAE6DF' }, 7.64, 0.95, 2.2, east);
      var inv = EQ3.inv = unit('inv', { W: 0.45, H: 0.55, D: 0.2, c: '#D9D6CF' }, 7.62, 1.65, 0.9, east); inv.visible = false;
      EQ3.sb = unit('sb', { W: 0.5, H: 0.7, D: 0.2, c: '#CFCAC0' }, 7.62, 1.55, -0.7, east);
      var car = smCar(T, mat, '#5E6670'); car.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      var carAo = smBlob(T, aoTex, 2.1, 4.6, 0.42); car.add(carAo);
      // the charger stands on its own wall and shows with the car (see H.place)
      EQ3.evc = unit('evc', { W: 0.25, H: 0.4, D: 0.15, c: '#33373D' }, 7.58, 1.2, 3.6, east); EQ3.evc.visible = false;
      car.position.set(11, 0, 5); sc.add(car);
      // a carport over the driveway, the household's added zone: a slab on four posts, eight modules
      var carport = new T.Group(), mPost = mat('#B8BCC0', { roughness: 0.5, metalness: 0.3 }), cpt = 5 * Math.PI / 180;
      (function () {
        var x0 = 8.2, x1 = 13.8, z0 = 2.4, z1 = 8.2, y = 2.6, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        var slab = new T.Mesh(new T.BoxGeometry(x1 - x0, 0.12, (z1 - z0) / Math.cos(cpt)), mPost); slab.position.set(cx, y, cz); slab.rotation.x = -cpt; carport.add(slab);
        [[x0 + 0.15, z0 + 0.15], [x1 - 0.15, z0 + 0.15], [x0 + 0.15, z1 - 0.15], [x1 - 0.15, z1 - 0.15]].forEach(function (p) { var h = y + (p[1] - cz) * Math.tan(cpt), m = new T.Mesh(new T.BoxGeometry(0.16, h, 0.16), mPost); m.position.set(p[0], h / 2, p[1]); carport.add(m); });
        var mg = new T.BoxGeometry(1.13, 0.04, 1.72), pmc = mat('#FFFFFF', { map: FN.panelTex(T, false), roughness: 0.24, metalness: 0.22 });
        for (var j = 0; j < 2; j++) for (var i = 0; i < 4; i++) { var z = cz - 0.87 + j * 1.74, m = new T.Mesh(mg, pmc); m.position.set(cx - 1.725 + i * 1.15, y + 0.09 + (z - cz) * Math.tan(cpt), z); m.rotation.x = -cpt; carport.add(m); }
        carport.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      })();
      carport.visible = false; sc.add(carport);
      var hp = EQ3.hp = unit('hp', { W: 0.96, H: 0.82, D: 0.42, c: '#D8D2C7' }, -7.86, 0.51, 1.5, west);
      var hpAo = smBlob(T, aoTex, 1.46, 0.92, 0.38); hpAo.position.set(0, -0.51 + 0.035, 0); hp.add(hpAo);
      var chim = new T.Group(); sc.add(chim);
      var panels = new T.Group(); sc.add(panels);
      var hemi = new T.HemisphereLight('#FFFFFF', '#B9B2A6', 0.58 * Math.PI); sc.add(hemi);
      var sun = new T.DirectionalLight('#FFF5E4', 1.05 * Math.PI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4;
      var shc = sun.shadow.camera; shc.left = -22; shc.right = 22; shc.top = 22; shc.bottom = -22; shc.near = 1; shc.far = 110; sun.shadow.bias = -0.0004; sc.add(sun); sc.add(sun.target);
      var cam = new T.PerspectiveCamera(36, 1, 0.5, 300),
          iso = new T.OrthographicCamera(-16, 16, 10, -10, -100, 300),
          top = new T.OrthographicCamera(-20, 20, 13.3, -13.3, 0.5, 200);
      top.position.set(0, 60, 0); top.up.set(0, 0, -1); top.lookAt(0, 0, 0);
      var txSun = FN.panelTex(T, false), txShade = FN.panelTex(T, true);
      var pm = mat('#FFFFFF', { map: txSun, roughness: 0.24, metalness: 0.22 }), pmShade = mat('#FFFFFF', { map: txShade, roughness: 0.35, metalness: 0.15 });
      var mFrame = mat('#8A94A0', { roughness: 0.38, metalness: 0.55 }), mFrameShade = mat('#5F6975', { roughness: 0.45, metalness: 0.4 }), mRail = mat('#39414C', { roughness: 0.5, metalness: 0.5 }), mBallast = mat('#8E969F', { roughness: 0.9 });
      var H = { gnd: gnd, drive: drive, gables: gables, roof: roof, hr: 15, T: T, r: r, scene: sc, cam: cam, iso: iso, top: top, useTop: false, useIso: false, theta: 0.75, radius: 40, zoom: 1, tx: 0, tz: -0.3, space: false, panels: panels, bat: bat, inv: inv, car: car, carport: carport, hp: hp, chim: chim, sun: sun, hemi: hemi, w: 0, h: 0, dead: false };
      var raf = 0;
      H.frame = function () {
        if (H.dead || raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          if (!H.dead && canvas.offsetParent !== null && H.w > 0 && H.h > 0) { EQ3.evc.visible = car.visible; r.render(sc, H.camNow()); if (H.onRender) H.onRender(); }
        });
      };
      // the roof type: the roof slab (with 0.35 m overhang and 0.14 m fascia) and the gable/skillion walls are rebuilt
      H.pitch = 22; H.type = ''; H.vtxKey = ''; var obsG = new T.Group(); sc.add(obsG);
      H.yAt = function (z) { return 3 + (z + 5) * Math.tan(H.pitch * Math.PI / 180); };
      H.setRoof = function (type, vtx) {
        var vk = vtx ? JSON.stringify(vtx) : '';
        if (type === H.type && vk === H.vtxKey || !FN.ROOFS || !FN.ROOFS[type]) return;
        H.type = type; H.vtxKey = vk; H.pitch = FN.ROOFS[type].pitch;
        var t = Math.tan(H.pitch * Math.PI / 180), ov = 0.35, th = 0.14, X = 7.5 + ov, Z = 5 + ov, ye = 3 - ov * t + 0.02, rpos = [], gpos = [];
        var nFace = vtx && vtx.length >= 3 ? vtx.map(function (p) {
          // the plan's east is the scene's +x (the sun rises there): x = (px − 518) / 40, z = (py − 356) / 40
          var vx = (p[0] - 518) / 40, vz = (p[1] - 356) / 40;
          return [vx, 3 + (vz + 5) * t + 0.02, vz];
        }) : null;
        while (ridges.children.length) ridges.remove(ridges.children[0]);
        if (type === 'gable') {
          var yr = 3 + 5 * t + 0.02, wg = 3 + 5 * t;
          rpos = [].concat(
            prism(nFace || [[-X, ye, -Z], [-X, yr, 0], [X, yr, 0], [X, ye, -Z]], th),
            prism([[-X, yr, 0], [-X, ye, Z], [X, ye, Z], [X, yr, 0]], th)
          );
          gpos = [-7.5, 3, -5, -7.5, 3, 5, -7.5, wg, 0, 7.5, 3, -5, 7.5, wg, 0, 7.5, 3, 5];
          ridges.add(beam([-X, yr + 0.01, 0], [X, yr + 0.01, 0], 0.16, 0.06, mRidge));
        } else if (type === 'skillion') {
          var ys = 3 + (10 + ov) * t + 0.02, ws = 3 + 10 * t;
          rpos = prism(nFace || [[-X, ye, -Z], [-X, ys, Z], [X, ys, Z], [X, ye, -Z]], th);
          gpos = [
            -7.5, 3, -5, -7.5, 3, 5, -7.5, ws, 5,
            7.5, 3, -5, 7.5, ws, 5, 7.5, 3, 5,
            -7.5, 3, 5, 7.5, 3, 5, 7.5, ws, 5, -7.5, 3, 5, 7.5, ws, 5, -7.5, ws, 5
          ];
          ridges.add(beam([-X, ys + 0.01, Z], [X, ys + 0.01, Z], 0.15, 0.05, mRidge));
        } else if (type === 'flat') {
          var yf = 3.02;
          rpos = prism([[-X, yf, -Z], [-X, yf, Z], [X, yf, Z], [X, yf, -Z]], th);
          gpos = [];
          // Parapet around flat roof
          var ph = 0.22, pw = 0.18;
          ridges.add(beam([-X, yf + ph / 2, -Z], [X, yf + ph / 2, -Z], pw, ph, mRidge));
          ridges.add(beam([-X, yf + ph / 2, Z], [X, yf + ph / 2, Z], pw, ph, mRidge));
          ridges.add(beam([-X, yf + ph / 2, -Z], [-X, yf + ph / 2, Z], pw, ph, mRidge));
          ridges.add(beam([X, yf + ph / 2, -Z], [X, yf + ph / 2, Z], pw, ph, mRidge));
        } else {
          var yh = 3 + 5 * t + 0.02;
          rpos = [].concat(
            prism(nFace || [[-X, ye, -Z], [-3.75, yh, 0], [3.75, yh, 0], [X, ye, -Z]], th),
            prism([[-3.75, yh, 0], [-X, ye, Z], [X, ye, Z], [3.75, yh, 0]], th),
            prism([[-X, ye, -Z], [-X, ye, Z], [-3.75, yh, 0]], th),
            prism([[X, ye, Z], [X, ye, -Z], [3.75, yh, 0]], th)
          );
          ridges.add(beam([-3.75, yh + 0.01, 0], [3.75, yh + 0.01, 0], 0.16, 0.06, mRidge));
          ridges.add(beam([-X, ye + 0.01, -Z], [-3.75, yh + 0.01, 0], 0.14, 0.05, mRidge));
          ridges.add(beam([X, ye + 0.01, -Z], [3.75, yh + 0.01, 0], 0.14, 0.05, mRidge));
          ridges.add(beam([-X, ye + 0.01, Z], [-3.75, yh + 0.01, 0], 0.14, 0.05, mRidge));
          ridges.add(beam([X, ye + 0.01, Z], [3.75, yh + 0.01, 0], 0.14, 0.05, mRidge));
        }
        var ng = new T.BufferGeometry(); ng.setAttribute('position', new T.Float32BufferAttribute(rpos, 3)); ng.computeVertexNormals(); smCourseUV(T, ng);
        // a flat roof is a membrane in 2 m strips, a pitched one shows its tile courses
        if (type === 'flat') { seamTex.repeat.set(1, 0.31 / 2); mRoof.map = seamTex; } else mRoof.map = courseTex;
        mRoof.needsUpdate = true;
        roof.geometry.dispose(); roof.geometry = ng;
        if (roofEdges) { roof.remove(roofEdges); roofEdges.geometry.dispose(); }
        roofEdges = addEdges(roof, ng, 18);
        var gg = new T.BufferGeometry();
        if (gpos.length) { gg.setAttribute('position', new T.Float32BufferAttribute(gpos, 3)); gg.computeVertexNormals(); }
        gables.geometry.dispose(); gables.geometry = gg; gables.visible = gpos.length > 0;
        if (gableEdges) { gables.remove(gableEdges); gableEdges.geometry.dispose(); gableEdges = null; }
        if (gpos.length) gableEdges = addEdges(gables, gg, 18);
        chim.visible = false; H.frame();
      };
      // Build a detailed chimney mesh (brick shaft, stone crown, flue pot)
      var makeChimney = function (a, b, hh) {
        var g = new T.Group(), shH = hh + 0.45;
        var shaft = new T.Mesh(new T.BoxGeometry(a, shH, b), mat('#8C7462', { roughness: 0.85 }));
        shaft.position.y = shH / 2 - 0.25; shaft.castShadow = true; shaft.receiveShadow = true; addEdges(shaft, shaft.geometry); g.add(shaft);
        var crown = new T.Mesh(new T.BoxGeometry(a + 0.08, 0.08, b + 0.08), mat('#6E5A4B', { roughness: 0.8 }));
        crown.position.y = shH - 0.25 + 0.04; crown.castShadow = true; g.add(crown);
        var pot = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 0.18, 12), mat('#755E4E', { roughness: 0.75 }));
        pot.position.y = shH - 0.25 + 0.16; pot.castShadow = true; g.add(pot);
        return g;
      };
      // obstacles from plan px ({ type, x, y, h }): all 6 trade shapes (chimney, skylight, antenna, box, vent, prism/dormer)
      H.setObstacles = function (list) {
        var key = JSON.stringify([H.type, list || []]);
        if (key === H.obsKey) return;
        H.obsKey = key;
        clear(obsG);
        chim.visible = false;
        (list || []).forEach(function (o) {
          var Ty = FN.OBST[o.type] || FN.OBST.chimney, z = (o.y - 356) / 40, x = (o.x - 518) / 40, y0 = H.yAt(z), hh = Math.max(o.h !== undefined ? o.h : Ty.h, 0.06), m;
          if (o.type === 'antenna') {
            m = new T.Group();
            var baseA = new T.Mesh(new T.ConeGeometry(0.14, 0.12, 10), mat('#5B6068', { roughness: 0.6 }));
            baseA.position.y = 0.04; m.add(baseA);
            var mast = new T.Mesh(new T.CylinderGeometry(0.025, 0.035, hh + 0.3, 10), mat(Ty.fill, { roughness: 0.35, metalness: 0.65 }));
            mast.position.y = (hh + 0.3) / 2 - 0.15; mast.castShadow = true; m.add(mast);
            [-0.25, 0, 0.22].forEach(function (dy, idx) {
              var arm = new T.Mesh(new T.BoxGeometry(0.55 - idx * 0.12, 0.025, 0.025), mat(Ty.line, { roughness: 0.4, metalness: 0.6 }));
              arm.position.y = hh + dy; arm.castShadow = true; m.add(arm);
            });
            m.position.set(x, y0, z);
          } else if (Ty.shape) {
            m = new T.Group();
            var pipe = new T.Mesh(new T.CylinderGeometry(Ty.a * 0.75, Ty.a * 0.75, hh + 0.28, 12), mat(Ty.fill, { roughness: 0.45, metalness: 0.45 }));
            pipe.position.y = (hh + 0.28) / 2 - 0.14; pipe.castShadow = true; m.add(pipe);
            var cap = new T.Mesh(new T.ConeGeometry(Ty.a * 1.25, 0.07, 12), mat(Ty.line, { roughness: 0.4, metalness: 0.5 }));
            cap.position.y = hh + 0.17; cap.castShadow = true; m.add(cap);
            var flash = new T.Mesh(new T.CylinderGeometry(Ty.a * 1.3, Ty.a * 1.6, 0.04, 12), mat('#5B6068', { roughness: 0.6 }));
            flash.rotation.x = -H.pitch * Math.PI / 180; flash.position.y = 0.02; m.add(flash);
            m.position.set(x, y0, z);
          } else if (o.type === 'skylight') {
            m = new T.Group();
            var frm = new T.Mesh(new T.BoxGeometry(Ty.a, 0.07, Ty.b), mat('#4E5864', { roughness: 0.5, metalness: 0.3 }));
            var glz = new T.Mesh(new T.BoxGeometry(Ty.a - 0.10, 0.03, Ty.b - 0.10), mat('#7FA4C4', { roughness: 0.12, metalness: 0.35 }));
            glz.position.y = 0.025; frm.add(glz); addEdges(frm, frm.geometry);
            m.add(frm); m.rotation.x = -H.pitch * Math.PI / 180; m.position.set(x, y0 + 0.04, z);
          } else if (o.type === 'box') {
            m = new T.Group();
            var unit = new T.Mesh(new T.BoxGeometry(Ty.a, hh + 0.18, Ty.b), mat(Ty.fill, { roughness: 0.45, metalness: 0.25 }));
            unit.position.y = (hh + 0.18) / 2 - 0.12; unit.castShadow = true; unit.receiveShadow = true; addEdges(unit, unit.geometry); m.add(unit);
            var fan = new T.Mesh(new T.CylinderGeometry(Math.min(Ty.a, Ty.b) * 0.28, Math.min(Ty.a, Ty.b) * 0.28, 0.03, 16), mat('#323740', { roughness: 0.5 }));
            fan.position.set(-Ty.a * 0.16, hh - 0.05, 0); m.add(fan);
            m.position.set(x, y0, z);
          } else if (o.type === 'prism') {
            m = new T.Group();
            var hw = Ty.a / 2, hd = Ty.b / 2, yBase = -0.22, yWall = hh * 0.45, yPeak = hh;
            var dBody = new T.Mesh(new T.BoxGeometry(Ty.a, yWall - yBase, Ty.b), mat(C.walls, { roughness: 0.85 }));
            dBody.position.y = (yWall + yBase) / 2; dBody.castShadow = true; dBody.receiveShadow = true; addEdges(dBody, dBody.geometry); m.add(dBody);
            var rVerts = [
              // left slope
              -hw - 0.06, yWall, -hd - 0.06,  -hw - 0.06, yWall, hd + 0.06,  0, yPeak, hd + 0.06,
              -hw - 0.06, yWall, -hd - 0.06,  0, yPeak, hd + 0.06,  0, yPeak, -hd - 0.06,
              // right slope
              hw + 0.06, yWall, hd + 0.06,  hw + 0.06, yWall, -hd - 0.06,  0, yPeak, -hd - 0.06,
              hw + 0.06, yWall, hd + 0.06,  0, yPeak, -hd - 0.06,  0, yPeak, hd + 0.06,
              // front & back gable triangles
              -hw, yWall, -hd,  0, yPeak, -hd,  hw, yWall, -hd,
              hw, yWall, hd,  0, yPeak, hd,  -hw, yWall, hd
            ];
            var dGeom = new T.BufferGeometry(); dGeom.setAttribute('position', new T.Float32BufferAttribute(rVerts, 3)); dGeom.computeVertexNormals();
            var dRoof = new T.Mesh(dGeom, mat(Ty.fill, { roughness: 0.72, side: T.DoubleSide }));
            dRoof.castShadow = true; dRoof.receiveShadow = true; addEdges(dRoof, dGeom); m.add(dRoof);
            var dWin = new T.Mesh(new T.BoxGeometry(Ty.a * 0.55, Math.max(0.22, yWall * 0.65), 0.04), mat('#3E4854', { roughness: 0.25, metalness: 0.3 }));
            dWin.position.set(0, yWall * 0.5, -hd - 0.01); m.add(dWin);
            m.position.set(x, y0, z);
          } else {
            m = makeChimney(Ty.a, Ty.b, hh);
            m.position.set(x, y0, z);
          }
          obsG.add(m);
        });
        H.frame();
      };
      // a group's meshes go, and their geometries with them (the materials are shared)
      var clear = function (g) {
        while (g.children.length) { var c = g.children[0]; c.traverse(function (n) { if (n.geometry) n.geometry.dispose(); }); g.remove(c); }
      };
      H.setPanels = function (mods) {
        // the studio places the scene at every render: build the modules again only when they changed
        var key = JSON.stringify([H.type, mods || []]);
        if (key === H.panelsKey) return;
        H.panelsKey = key;
        clear(panels); inv.visible = !!(mods && mods.length);
        var isFlat = H.type === 'flat';
        var tan = Math.tan(H.pitch * Math.PI / 180), cos = Math.cos(H.pitch * Math.PI / 180), ang = -H.pitch * Math.PI / 180;
        var yRoof = 3.02;
        (mods || []).forEach(function (m) {
          var cx = m.x + m.w / 2, cy = m.y + m.h / 2, z = (cy - 356) / 40, x = (cx - 518) / 40;
          var grp = new T.Group();
          if (isFlat) {
            var isEW = m.mode === 'ew10';
            var rackTilt = (m.tilt || 10) * Math.PI / 180;
            if (isEW) {
              // East-West tent pair: slant along East-West, ridge along North-South
              var W = 1.134 - 0.02, L = 1.722 - 0.02;
              var Hridge = W * Math.sin(rackTilt);
              var yC = yRoof + 0.05 + Hridge / 2;
              var isW = m.facing === 'W';
              var frame = new T.Mesh(new T.BoxGeometry(W, 0.038, L), m.shaded ? mFrameShade : mFrame);
              var glass = new T.Mesh(new T.PlaneGeometry(W - 0.05, L - 0.05), m.shaded ? pmShade : pm);
              glass.rotation.x = -Math.PI / 2; glass.position.y = 0.020;
              var r1 = new T.Mesh(new T.BoxGeometry(0.035, 0.028, L), mRail), r2 = new T.Mesh(new T.BoxGeometry(0.035, 0.028, L), mRail);
              r1.position.set(-W * 0.28, -0.032, 0); r2.position.set(W * 0.28, -0.032, 0);
              frame.castShadow = true; frame.receiveShadow = true;
              grp.add(frame); grp.add(glass); grp.add(r1); grp.add(r2);
              grp.position.set(x, yC, z);
              // West module tilts -rackTilt around Z (facing West); East module tilts +rackTilt (facing East)
              grp.rotation.z = isW ? -rackTilt : rackTilt;
              panels.add(grp);

              // Support frame under the module (strictly beneath, resting on the roof deck)
              var xOuter = isW ? (x + W * 0.38 * Math.cos(rackTilt)) : (x - W * 0.38 * Math.cos(rackTilt));
              var xInner = isW ? (x - W * 0.38 * Math.cos(rackTilt)) : (x + W * 0.38 * Math.cos(rackTilt));
              var footH = 0.05, ridgeLegH = footH + Hridge * 0.78;
              [-L * 0.32, L * 0.32].forEach(function (dz) {
                var foot = new T.Mesh(new T.BoxGeometry(0.035, footH, 0.035), mRail);
                foot.position.set(xOuter, yRoof + footH / 2, z + dz);
                var rLeg = new T.Mesh(new T.BoxGeometry(0.035, ridgeLegH, 0.035), mRail);
                rLeg.position.set(xInner, yRoof + ridgeLegH / 2, z + dz);
                var baseRail = new T.Mesh(new T.BoxGeometry(Math.abs(xOuter - xInner) + 0.1, 0.02, 0.035), mRail);
                baseRail.position.set((xOuter + xInner) / 2, yRoof + 0.01, z + dz);
                panels.add(foot); panels.add(rLeg); panels.add(baseRail);
              });
              var ballast = new T.Mesh(new T.BoxGeometry(0.18, 0.07, 0.28), mBallast);
              ballast.position.set(xInner, yRoof + 0.035, z);
              panels.add(ballast);
            } else {
              // Equator rack: portrait modules facing North (low at -z, high at +z)
              var W = 1.134 - 0.02, L = 1.722 - 0.02;
              var Htilt = L * Math.sin(rackTilt);
              var yC = yRoof + 0.05 + Htilt / 2;
              var frame = new T.Mesh(new T.BoxGeometry(W, 0.038, L), m.shaded ? mFrameShade : mFrame);
              var glass = new T.Mesh(new T.PlaneGeometry(W - 0.05, L - 0.05), m.shaded ? pmShade : pm);
              glass.rotation.x = -Math.PI / 2; glass.position.y = 0.020;
              var r1 = new T.Mesh(new T.BoxGeometry(W, 0.028, 0.035), mRail), r2 = new T.Mesh(new T.BoxGeometry(W, 0.028, 0.035), mRail);
              r1.position.set(0, -0.032, -L * 0.28); r2.position.set(0, -0.032, L * 0.28);
              frame.castShadow = true; frame.receiveShadow = true;
              grp.add(frame); grp.add(glass); grp.add(r1); grp.add(r2);
              grp.position.set(x, yC, z);
              grp.rotation.x = -rackTilt;
              panels.add(grp);

              // Triangular support frame underneath the module
              var zFront = z - (L * 0.32) * Math.cos(rackTilt);
              var zRear = z + (L * 0.32) * Math.cos(rackTilt);
              var footH = 0.05, rearLegH = footH + Htilt * 0.78;
              [-W * 0.35, W * 0.35].forEach(function (dx) {
                var fFoot = new T.Mesh(new T.BoxGeometry(0.035, footH, 0.035), mRail);
                fFoot.position.set(x + dx, yRoof + footH / 2, zFront);
                var rLeg = new T.Mesh(new T.BoxGeometry(0.035, rearLegH, 0.035), mRail);
                rLeg.position.set(x + dx, yRoof + rearLegH / 2, zRear);
                var baseRail = new T.Mesh(new T.BoxGeometry(0.03, 0.02, (zRear - zFront) + 0.15), mRail);
                baseRail.position.set(x + dx, yRoof + 0.01, (zFront + zRear) / 2);
                panels.add(fFoot); panels.add(rLeg); panels.add(baseRail);
              });
              var ballast = new T.Mesh(new T.BoxGeometry(0.32, 0.07, 0.22), mBallast);
              ballast.position.set(x, yRoof + 0.035, zRear);
              panels.add(ballast);
            }
          } else {
            // Standard pitched roof: flush modules
            var y = 3 + (z + 5) * tan + 0.075;
            var W = m.w / 40 - 0.02, L = m.h / 40 / cos - 0.02;
            var frame = new T.Mesh(new T.BoxGeometry(W, 0.038, L), m.shaded ? mFrameShade : mFrame);
            var glass = new T.Mesh(new T.PlaneGeometry(W - 0.05, L - 0.05), m.shaded ? pmShade : pm);
            glass.rotation.x = -Math.PI / 2; glass.position.y = 0.020;
            var r1 = new T.Mesh(new T.BoxGeometry(W, 0.028, 0.035), mRail), r2 = new T.Mesh(new T.BoxGeometry(W, 0.028, 0.035), mRail);
            r1.position.set(0, -0.032, -L * 0.28); r2.position.set(0, -0.032, L * 0.28);
            frame.castShadow = true; frame.receiveShadow = true;
            grp.add(frame); grp.add(glass); grp.add(r1); grp.add(r2);
            grp.position.set(x, y, z);
            grp.rotation.x = ang;
            panels.add(grp);
          }
        });
        H.frame();
      };
      H.setChimney = function (on, hgt) {
        while (chim.children.length) chim.remove(chim.children[0]);
        chim.visible = !!on;
        if (on) {
          var ryc = 3 + 1.05 * Math.tan(22 * Math.PI / 180), cm = makeChimney(0.6, 0.6, hgt);
          cm.position.set(0.05, ryc, -3.95); chim.add(cm);
        }
        H.frame();
      };
      H.setHour = function (hr) {
        var up = hr >= 6 && hr <= 18, t = Math.PI * (Math.min(Math.max(hr, 6), 18) - 6) / 12;
        sun.position.set(38 * Math.cos(t), 12 + 40 * Math.sin(t), -22); sun.intensity = (up ? 0.35 + 0.85 * Math.sin(t) : 0.05) * Math.PI; hemi.intensity = (up ? 0.58 : 0.25) * Math.PI;
        aoPlane.material.opacity = up ? 1 : 0.45;
        H.hr = hr; sc.background.set(up ? C.sky : '#3A3D45'); H.frame();
      };
      H.paint = function () { C = FN.tokens(); gnd.material.color.set(C.earth); drive.material.color.set(C.drive); mPlinth.color.set(C.drive); mWall.color.set(C.walls); mWallV.color.set(C.walls); mFlat.color.set(C.roof3); mRoof.color.set(C.roof3); mRidge.color.set(C.ridge); mEdge.color.set(C.roofLine); H.setHour(H.hr); };
      window.addEventListener('sd-palette', function () { if (!H.dead) H.paint(); });
      window.addEventListener('langchange', function () { if (!H.dead) setTimeout(H.frame, 0); });
      H.eq = EQ3;
      // the home from its description (FN.HOMES): a plinth and walls per block, a schematic flat roof over the
      // blocks the roof type does not cover (no straight skeleton yet), the doors and windows on their walls,
      // and the walls for the site core, clockwise from the north wall: equipment is anchored to one of them
      // by a distance along it, and cables run along them (D-72)
      H.home = '';
      H.setHome = function (key) {
        var hm = FN.home(key), B = hm.D.bodies, W = hm.W, ov = 0.25;
        if (hm.key === H.home) return false;
        H.home = hm.key; clear(homeG);
        var shadowed = function (m) { m.castShadow = true; m.receiveShadow = true; homeG.add(m); return m; };
        // a side of a block that meets another block has no overhang: 0 north, 1 east, 2 south, 3 west
        var meets = function (b, side) {
          return B.some(function (c) {
            if (c === b) return false;
            var alongX = c[0] < b[2] && c[2] > b[0], alongZ = c[1] < b[3] && c[3] > b[1];
            return side === 0 ? c[3] === b[1] && alongX : side === 1 ? c[0] === b[2] && alongZ : side === 2 ? c[1] === b[3] && alongX : c[2] === b[0] && alongZ;
          });
        };
        B.forEach(function (b) {
          var w = b[2] - b[0], d = b[3] - b[1], cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
          shadowed(new T.Mesh(new T.BoxGeometry(w + 0.12, 0.28, d + 0.12), mPlinth)).position.set(cx, 0.14, cz);
          var wm = shadowed(new T.Mesh(smShade(T, new T.BoxGeometry(w, b[4] - 0.28, d)), mWallV)); wm.position.set(cx, (b[4] + 0.28) / 2, cz); addEdges(wm, wm.geometry);
          if (b[5] === 'flat') {
            var x0 = b[0] - (meets(b, 3) ? 0 : ov), x1 = b[2] + (meets(b, 1) ? 0 : ov), z0 = b[1] - (meets(b, 0) ? 0 : ov), z1 = b[3] + (meets(b, 2) ? 0 : ov);
            var fr = shadowed(new T.Mesh(new T.BoxGeometry(x1 - x0, 0.14, z1 - z0), mFlat)); fr.position.set((x0 + x1) / 2, b[4] + 0.04 - 0.07, (z0 + z1) / 2); addEdges(fr, fr.geometry);
          }
        });
        // doors and windows a little proud of their wall, a sill under each but a garage door
        hm.D.open.forEach(function (o) {
          var wl = W[o.w], len = o.s1 - o.s0, y0 = o.y0 != null ? o.y0 : 0.95, y1 = o.y1 != null ? o.y1 : 2.15, h = y1 - y0, g = new T.Group();
          g.add(new T.Mesh(new T.BoxGeometry(len, h, 0.06), o.k === 'gdoor' ? mGdoor : mWin));
          if (o.k !== 'gdoor') { var sm = new T.Mesh(new T.BoxGeometry(len + 0.12, 0.06, 0.1), mSill); sm.position.y = -h / 2 - 0.02; g.add(sm); }
          var p = smAt(W, o.w, (o.s0 + o.s1) / 2, 0.01, (y0 + y1) / 2);
          g.position.set(p[0], p[1], p[2]); g.rotation.y = Math.atan2(wl.nx, wl.nz); homeG.add(g);
        });
        aoPlane.material.map.dispose(); aoPlane.material.map = FN.contactAoTex(T, B); aoPlane.material.needsUpdate = true;
        H.wallsL = W;
        Object.keys(hm.D.stand).forEach(function (k) { H.placeEq(k, hm.D.stand[k]); });
        H.frame(); return true;
      };
      H.camNow = function () { return H.useTop ? top : H.useIso ? iso : cam; };
      H.placeEq = function (k, a) {
        var g = EQ3[k], e = g.userData.e, W = H.wallsL, wl = W[a.w], p = smAt(W, a.w, a.s, (e.gap || 0) + e.D / 2 + 0.02, g.position.y);
        g.position.set(p[0], p[1], p[2]); g.rotation.y = Math.atan2(wl.nx, wl.nz); H.frame();
      };
      var cableG = new T.Group(); sc.add(cableG);
      H.setCables = function (list) {
        clear(cableG);
        (list || []).forEach(function (c) {
          var path = new T.CurvePath();
          for (var i = 1; i < c.pts.length; i++) path.add(new T.LineCurve3(new T.Vector3().fromArray(c.pts[i - 1]), new T.Vector3().fromArray(c.pts[i])));
          var m = new T.Mesh(new T.TubeGeometry(path, Math.max(16, Math.ceil(c.len * 8)), 0.05, 8, false), mat(c.color, { roughness: 0.5, emissive: c.color, emissiveIntensity: 0.15 }));
          m.castShadow = true; cableG.add(m);
        });
        H.frame();
      };
      H.size = function (w, h) {
        if (w !== H.w || h !== H.h) {
          H.w = w; H.h = h; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
        }
        H.place();
      };
      H.place = function () {
        var R = H.radius / (H.zoom || 1);
        cam.position.set(H.tx + R * Math.sin(H.theta), R * 0.55, H.tz + R * Math.cos(H.theta)); cam.lookAt(H.tx, 2.3, H.tz);
        var d = 60, ch = d * Math.SQRT2 / Math.sqrt(3), cy = 2.2 + d / Math.sqrt(3);
        iso.position.set(H.tx + ch * Math.sin(H.theta), cy, H.tz + ch * Math.cos(H.theta)); iso.lookAt(H.tx, 2.2, H.tz);
        if (H.w > 0 && H.h > 0) {
          var hh = R * 0.31, hw = hh * (H.w / H.h);
          iso.left = -hw; iso.right = hw; iso.top = hh; iso.bottom = -hh; iso.updateProjectionMatrix();
        }
        H.frame();
      };
      var animRaf = 0;
      H.turnTo = function (target) {
        if (animRaf) cancelAnimationFrame(animRaf);
        var t0 = H.theta, dt = target - t0, s0 = performance.now();
        var step = function (now) {
          if (H.dead) return;
          var p = Math.min(1, (now - s0) / 220), e = 1 - Math.pow(1 - p, 3);
          H.theta = t0 + dt * e; H.place();
          if (p < 1) animRaf = requestAnimationFrame(step); else animRaf = 0;
        };
        animRaf = requestAnimationFrame(step);
      };
      var drag = null, ray = new T.Raycaster(), ptr = new T.Vector2();
      canvas.addEventListener('pointerdown', function (e) {
        if (animRaf) { cancelAnimationFrame(animRaf); animRaf = 0; }
        var pan = H.space || e.button === 1 || e.shiftKey;
        drag = { pan: pan, x: e.clientX, y: e.clientY, t: H.theta, tx: H.tx, tz: H.tz };
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag || H.useTop) return;
        if (drag.pan) {
          var dx = (e.clientX - drag.x) * 0.03 / (H.zoom || 1), dy = (e.clientY - drag.y) * 0.03 / (H.zoom || 1);
          var c = Math.cos(H.theta), s = Math.sin(H.theta);
          H.tx = Math.max(-18, Math.min(18, drag.tx - dx * c - dy * s));
          H.tz = Math.max(-18, Math.min(18, drag.tz + dx * s - dy * c));
        } else {
          H.theta = drag.t - (e.clientX - drag.x) * 0.008;
        }
        H.place();
      });
      canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        H.zoom = Math.max(0.6, Math.min(2.6, (H.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.91)));
        H.place();
      }, { passive: false });
      canvas.addEventListener('pointerup', function (e) {
        if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5 && H.onTap) {
          var rect = canvas.getBoundingClientRect();
          ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          ray.setFromCamera(ptr, H.useTop ? top : H.useIso ? iso : cam);
          var hits = ray.intersectObjects([roof, panels, obsG], true);
          if (hits.length && hits[0].point.y > 2.6) {
            var p3 = hits[0].point;
            H.onTap([518 + p3.x * 40, 356 + p3.z * 40], e);
          }
        }
        drag = null;
      });
      canvas.addEventListener('pointerleave', function () { drag = null; });
      H.setHome('rect'); H.setRoof('hip'); setChimneyDefault(); H.setHour(15); H.place();
      function setChimneyDefault() { chim.visible = false; car.visible = false; hp.visible = false; bat.visible = false; }
      done(H);
    };
    FN.loadThree(go);
  };

  /* screen chrome shared by the tablet prototypes */
  FN.topbar = function (crumbs, mid, right) {
    return '<div style="height:48px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:0 12px;background:var(--c-paper);border-bottom:1px solid var(--c-line)">' +
      '<div class="bk-fw-tb-l" style="display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden;font-size:13px;white-space:nowrap">' + FN.SUN + crumbs.map(function (c, i) { return i < crumbs.length - 1 ? '<span' + (i === crumbs.length - 2 ? ' class="sh"' : '') + ' style="color:var(--c-muted)">' + c + '</span><span style="color:var(--c-faint)">/</span>' : '<b style="font-weight:600">' + c + '</b>'; }).join('') + '</div>' +
      '<div style="display:flex;background:var(--c-ground);border-radius:9px;padding:3px">' + mid + '</div><div class="bk-fw-tb-r" style="display:flex;align-items:center;justify-content:flex-end;gap:6px">' + right + '</div></div>';
  };
  FN.tab = function (label, on, act, v) {
    return '<button type="button"' + (act ? ' data-a="' + act + '" data-v="' + v + '"' : '') + ' style="min-height:36px;padding:0 14px;border:none;border-radius:7px;background:' + (on ? 'var(--c-paper)' : 'transparent') + ';color:' + (on ? 'var(--c-ink)' : 'var(--c-muted)') + ';font:inherit;font-size:13px;font-weight:500;cursor:' + (act ? 'pointer' : 'default') + ';' + (on ? 'box-shadow:0 1px 2px rgba(29,32,38,.12)' : '') + '">' + label + '</button>';
  };
  FN.card = 'background:var(--c-paper);border:1px solid var(--c-line);border-radius:14px';
  FN.kick = 'font-size:11px;color:var(--c-muted);letter-spacing:.04em;text-transform:uppercase';

  /* the installer studio at the Standard level: alone in design/editor-tools, and as the
     installer's screen of the journey (design/funnels), where opts.site is the household's site:
     its inbox shows the site once shared, and its Proposal step sends the offer back. */
  // the installer's catalogue, from its price list (illustrative prices, excluding GST)
  FN.CAT = {
    modules: [{ w: 400, name: '400 W mono, budget', price: 150, warranty: '12 / 25 years' }, { w: 440, name: '440 W mono, tier 1', price: 185, warranty: '25 / 30 years' }, { w: 475, name: '475 W n-type, premium', price: 230, warranty: '25 / 30 years' }],
    inverters: [{ kw: 5, name: '5 kW hybrid', price: 1650 }, { kw: 6, name: '6 kW hybrid', price: 1900 }, { kw: 8, name: '8 kW hybrid', price: 2600 }, { kw: 10, name: '10 kW hybrid', price: 3300 }, { kw: 15, name: '15 kW hybrid, three-phase', price: 4900 }, { kw: 20, name: '20 kW hybrid, three-phase', price: 6400 }],
    // the household's carport: a steel frame on four posts over one bay, with its engineering, bought from a
    // builder and resold at the price list's margin; illustrative like every price here, quoted for real after approval
    structures: { carport: { name: 'Carport structure, steel, one bay, 8 modules', price: 7400 } }
  };
  // the smallest inverter that keeps the panels under the 133 % limit (the largest when none does)
  FN.invFor = function (kwp) {
    var L = FN.CAT.inverters;
    for (var i = 0; i < L.length; i++) if (kwp / L[i].kw <= 1.33) return L[i].kw;
    return L[L.length - 1].kw;
  };
  // the three inverters the studio offers: the one that fits, the size below and the size above
  FN.invChoices = function (kwp) {
    var L = FN.CAT.inverters, i = L.map(function (x) { return x.kw; }).indexOf(FN.invFor(kwp)), a = Math.max(0, Math.min(i - 1, L.length - 3));
    return L.slice(a, a + 3);
  };
  FN.studio = function (el, opts) {
    opts = opts || {};
    var J = !!opts.site, S = opts.site;
    (function () {
      var H = null, t3 = null, tChip = null, tToast = null;
      var HOME = { tools: [12, 60], notes: [1108, 60], read: [84, 60], racks: [84, 136], changes: [826, 132], coach: [84, 590], v3: [768, 556] };
      var st = { level: 1, mode: 1, tool: 'select', selFace: false, preview: false, filled: false, variant: 'portrait', flatMode: J && S.flatMode ? S.flatMode : null, flatRule: J && S.flatRule ? S.flatRule : FN.PACK.rule, typedEdges: true, chimney: false, chimH: '1.00', pad: false, fresh: true, removed: [], bat: 13.5,
        sheet: false, present: false, circ: true, fid: false, imagery: true, shade: true, notesOn: true, hist: [], rhist: [], log: [], touches: [0, 0, 0, 0, 0], task: 0, toast: '', busy: false, chip: null, hover: null, notif: false, settings: false, layers: false, mods: true, mod25d: true, grid: 'dots', zoom: 1, panX: 0, panY: 0, space: false, chOpen: false, snapOn: true,
        pos: JSON.parse(JSON.stringify(HOME)), swapped: false, iso: true, hour3: 9, modW: 440, inv: 6, qs: 'cover', qseen: {}, qnotes: [], qopts: [], roof: J ? (S.roof || 'hip') : 'hip', cx: 520, cy: 198, obs: [], otype: 'chimney', selObs: '', guides: null,
        zok: J ? (S.zones || []).map(function (z) { return !!z.ok; }) : [], pts: [], curPt: null, zones: [], dims: [], pins: [], selPin: '', pinTxt: '', vtx: null, selVtx: 0, dynLen: '', dynAng: '', dynField: 0, lastMeas: null };
      // in the journey the studio starts on its inbox, and the household's draft (16 portrait modules) comes with the site
      if (J) { st.mode = -1; st.filled = true; st.bat = S.measures.bat ? 13.5 : 0; }
      el.innerHTML = '<div class="sd-root" style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden;user-select:none">' +
        '<div class="sd-top"></div><div class="sd-plan" style="position:absolute;left:0;top:48px;width:1180px;height:772px"></div>' +
        '<div class="sd-3d" style="position:absolute;overflow:hidden;background:var(--c-canvas)"><canvas class="sd-canvas" width="1180" height="772" aria-label="The roof in 3D, mirroring the plan: drag to turn" style="width:100%;height:100%;display:block;touch-action:none;cursor:grab"></canvas><div class="sd-3d-ctrl"></div></div>' +
        '<div class="sd-ui"></div></div>';
      var q = function (c) { return el.querySelector(c); };
      function inter(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
      function vertsOf(s) { return s.vtx || FN.ROOFS[s.roof].north.map(function (p) { return p.slice(); }); }
      // the obstacles on the north face (the chimney of the demos, then vents and skylights), in plan px
      function obstaclesOf(s) { return (s.chimney ? [{ id: 'chim', type: 'chimney', x: s.cx, y: s.cy, h: parseFloat(s.chimH) || 1 }] : []).concat(s.obs); }
      // the illustrative winter-morning shade behind a tall obstacle (energy stays with the API, ADR-001)
      function shadows(s) { return obstaclesOf(s).filter(function (o) { return o.h > 0.3; }).map(function (o) { var T = FN.OBST[o.type], hw = (T.shape ? T.a : T.a / 2) * 40; return { x: o.x - hw * 0.9, y: o.y, w: hw * 1.8, h: o.h * 64 }; }); }
      // the layout, from studio-draw (or its fallback): modules, removed by hand or not, shaded or not
      function draw(s) {
        var rackOpt = s.roof === 'flat' ? { mode: rackMode(s), rule: s.flatRule || FN.PACK.rule } : null;
        var res = FN.draw.compute(s.roof, obstaclesOf(s).map(function (o) { return { type: o.type, x: Math.round(o.x), y: Math.round(o.y) }; }), s.variant, rackOpt);
        if (!s.vtx) return res;
        var vp = s.vtx, kept = res.mods.filter(function (m) {
          return FN.draw.inside(vp, m.x + 4, m.y + 4) && FN.draw.inside(vp, m.x + m.w - 4, m.y + 4) && FN.draw.inside(vp, m.x + m.w - 4, m.y + m.h - 4) && FN.draw.inside(vp, m.x + 4, m.y + m.h - 4);
        });
        return { rings: res.rings, mods: kept, n: kept.length, geom: res.geom, ms: res.ms, live: res.live };
      }
      function mods(s) {
        var sh = shadows(s);
        return draw(s).mods.map(function (m) { return { id: m.id, x: m.x, y: m.y, w: m.w, h: m.h, tilt: m.tilt, mode: m.mode, facing: m.facing, blocked: false, removed: s.removed.indexOf(m.id) >= 0, shaded: sh.some(function (b) { return inter(m, b); }) }; });
      }
      // a flat roof's rack variant: the one chosen, else the one with the most energy under the rule (D-70)
      function rackMode(s) { return s.flatMode || FN.draw.rackVariants([], s.flatRule)[0].id; }
      function energy(s) {
        if (!s.filled) return { n: 0, nRoof: 0, nZones: 0, kwp: 0, kwh: 0, save: 0, eff: 0 };
        // on racks, the variant's yield per kWp (chapter 6) instead of FN.sim's own
        var M = mods(s).filter(function (m) { return !m.blocked && !m.removed; }), n = M.length, loss = M.reduce(function (a, m) { return a + (m.shaded ? 0.15 : 0); }, 0), eff = (n - loss) * s.modW / 1000, y = s.roof === 'flat' ? FN.RACKS[rackMode(s)].yield : FN.YIELD;
        // the household's zones the installer confirmed, at the roof's yield per kWp until their own orientation is measured
        var zn = J ? FN.zonesOk(S, s.zok).reduce(function (a, z) { return a + z.n; }, 0) : 0, zk = zn * s.modW / 1000, kwh = eff * y + zk * FN.YIELD;
        return { n: n + zn, nRoof: n, nZones: zn, kwp: (n + zn) * s.modW / 1000, kwh: kwh, eff: eff + zk, save: FN.TODAY() - FN.sim({ plan: 'best', kwp: kwh / FN.YIELD, cap: s.bat, ev: J ? S.measures.ev : true, hp: J && S.measures.hp }).total };
      }
      function touch() { if (st.task < 5) st.touches[st.task]++; }
      function check() {
        var k = st.task, ok = [st.filled, st.chimney && parseFloat(st.chimH) === 1.2 && !st.pad, st.removed.length > 0, st.bat !== 13.5, st.present][k];
        if (ok) st.task++;
      }
      function commit(patch, label, chip) {
        var before = energy(st), next = {}; for (var k in st) next[k] = st[k]; for (k in patch) next[k] = patch[k];
        var after = energy(next), dk = after.kwh - before.kwh, dm = after.save - before.save;
        st.hist.push({ snap: JSON.stringify({ filled: st.filled, variant: st.variant, flatMode: st.flatMode, flatRule: st.flatRule, chimney: st.chimney, chimH: st.chimH, removed: st.removed, bat: st.bat, roof: st.roof, cx: st.cx, cy: st.cy, obs: st.obs, zones: st.zones, dims: st.dims, pins: st.pins, vtx: st.vtx, zok: st.zok }), label: label });
        st.rhist = [];
        st.log.unshift({ label: label, delta: (dk >= 0 ? '+' : '−') + FN.n(Math.abs(dk)) + ' kWh/yr · ' + after.n + ' modules', money: (dm >= 0 ? '+' : '−') + FN.money(dm) + '/yr', color: Math.abs(dm) < 1 ? 'var(--c-muted)' : dm > 0 ? 'var(--c-gain)' : 'var(--c-loss)' });
        st.log = st.log.slice(0, 5);
        for (k in patch) st[k] = patch[k];
        st.chip = chip || null; st.busy = true; touch(); check(); render();
        clearTimeout(t3); t3 = setTimeout(function () { st.busy = false; render(); }, 300);
        clearTimeout(tChip); tChip = setTimeout(function () { st.chip = null; render(); }, 2600);
      }
      var TIPS = {
        select: ['Select', 'V', ['Tap a face, a module or an obstacle.', 'Its card opens on the right; actions above.', 'Tap again on overlaps to cycle.'], '1 touch'],
        vertex: ['Edit vertices', 'A', ['Select a face or tap Sommets · A.', 'Drag a square corner handle or tap mid-edge +.', 'Use the nudge pad (5 cm / 1 cm) to fine-tune.'], '2 touches'],
        trace: ['Trace', 'P', ['Tap each corner; snaps show before you touch.', 'Type a length while placing: 2.4, Tab, angle.', 'Tap the first point to close.'], 'n corners + 2'],
        rect3: ['Rectangle from three points', 'R', ['Tap corner A.', 'Tap corner B: the first edge.', 'Tap the opposite side: it closes.'], '4 touches'],
        fill: ['Fill zone', 'F', ['Tap a face: ghost modules appear.', 'Pick portrait, landscape or mixed.', 'Tap ✓ Keep.'], '3 touches'],
        panel: ['Modules', 'G', ['Tap a module to remove it.', 'Tap a free cell to add one.', 'Each change shows what it gains or costs.'], '2 touches'],
        chimney: ['Obstacle', 'O · 1–6', ['Pick a shape (Chimney, Skylight, Antenna, Box, Cylinder, Polygon).', 'Tap where it stands, or drag its footprint.', 'Type its height: shade and loss update.'], '2 touches + 1 typed'],
        measure: ['Measure', 'M', ['Tap point A.', 'Tap point B.', 'Read plan and true length; keep it as a dimension.'], '3 touches'],
        dimension: ['Dimension', 'D', ['Tap a first vertex.', 'Tap a second vertex.', 'It follows when the face is corrected.'], '3 touches'],
        note: ['Note', 'N', ['Tap a point on the roof.', 'Pick or type a field note.', 'The note stays tied to that point.'], '2 touches + text'],
        photo: ['Photo', 'I', ['Tap a point on the roof.', 'Attach a geotagged survey photo.', 'Time and GPS accuracy are kept.'], '3 touches'],
        layers: ['Layers', 'L', ['Open the layers.', 'Tap an eye to show or hide.', 'Switch the 1 m / 5 m grid (Dots, Lines, Off).'], '2 touches']
      };
      function top() {
        var btn = function (a, label, svg, on, color) { return '<button type="button" data-a="' + a + '" aria-label="' + label + '" style="width:40px;height:40px;border:none;border-radius:8px;background:' + (on ? 'var(--c-line2)' : 'transparent') + ';color:' + (color || 'var(--c-ink)') + ';cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center">' + svg + '</button>'; };
        var ico = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>'; };
        var sep = '<span style="width:1px;height:24px;background:var(--c-line);margin:0 4px"></span>';
        return FN.topbar(J && !S.shared ? ['Sites', 'Inbox'] : ['Sites', '14 Wattle Lane, Marrickville', 'Design v1'], (J ? [['Inbox', -1], ['Roof', 0], ['Layout', 1], ['Equipment', 2], ['Proposal', 3]] : [['Roof', 0], ['Layout', 1], ['Equipment', 2], ['Proposal', 3]]).map(function (x) { return FN.tab(x[0] + (x[1] === -1 && J && S.shared && !S.opened ? ' · 1' : ''), x[1] === st.mode, 'mode', x[1]); }).join(''),
          '<span style="font-size:12px;color:var(--c-gain);display:flex;align-items:center;gap:5px;padding:0 6px"><span style="width:7px;height:7px;border-radius:4px;background:var(--c-gain)"></span>Synced 14:02</span>' + sep +
          btn('undo', 'Undo · ⌘Z', FN.icon('undo', st.hist.length ? 'var(--c-ink)' : 'var(--c-faint)', 20), false) +
          btn('redo', 'Redo · ⇧⌘Z', FN.icon('redo', st.rhist.length ? 'var(--c-ink)' : 'var(--c-faint)', 20), false) + sep +
          btn('notif', 'Notifications, 3 new', ico('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0') + '<span style="position:absolute;top:7px;right:7px;width:15px;height:15px;border-radius:8px;background:var(--c-loss);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">3</span>', st.notif) +
          btn('settings', 'View settings', ico('M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4'), st.settings) + btn('help', 'Help', ico('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2')) +
          '<span style="width:30px;height:30px;border-radius:15px;background:var(--c-ink);color:var(--c-paper);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;margin:0 4px">I1</span><button type="button" data-a="present" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:13px;font-weight:600;cursor:pointer">Present</button>');
      }
      function plan() {
        var R = FN.ROOFS[st.roof], D = draw(st), M = mods(st), O = obstaclesOf(st);
        var o = '<svg width="1180" height="772" viewBox="0 0 1180 772" role="img" aria-label="Top view of the ' + R.en.toLowerCase() + ' roof">' + FN.draw.defs();
        o += '<rect width="1180" height="772" fill="' + (st.imagery ? 'var(--c-canvas)' : 'var(--c-ground)') + '"></rect>';
        // World transform: zoom (wheel / buttons) and pan (Space + drag / middle-click)
        o += '<g transform="translate(' + (-st.panX * st.zoom).toFixed(1) + ' ' + (-st.panY * st.zoom).toFixed(1) + ') scale(' + st.zoom.toFixed(3) + ')">';
        // Layer 1: optional 1 m / 5 m metric grid (dots or lines), driveway, road and site tree
        if (st.grid !== 'off') o += '<rect x="-1200" y="-1200" width="3600" height="3000" fill="url(#sd-grid-' + st.grid + ')"></rect>';
        if (st.imagery) {
          o += '<rect x="858" y="256" width="160" height="434" fill="var(--c-line)" opacity=".42"></rect>' +
            '<path d="M-600 690 H1800 V740 H-600 Z" fill="var(--c-line)" opacity=".55"></path><path d="M-600 715 H1800" stroke="var(--c-paper)" stroke-width="1.5" stroke-dasharray="14 12" opacity=".55"></path>' +
            '<circle cx="136" cy="154" r="56" fill="#1D2026" opacity=".10"></circle><circle cx="130" cy="148" r="54" fill="#7A9374" opacity=".28" stroke="#6D8667" stroke-width="1.2"></circle><circle cx="130" cy="148" r="4" fill="#6B5543" opacity=".55"></circle>';
        }
        o += '<g transform="translate(30 100)">';
        // Layer 2: building overhang cast shadow + wall footprint under the 0.35 m eave overhang
        o += '<rect x="223" y="162" width="602" height="402" rx="3" fill="#1D2026" opacity=".13" pointer-events="none"></rect>';
        // Layer 3: oriented roof faces, directional tile-course hatching, slope arrows and strong ridges/hips
        var vN = vertsOf(st), dN = 'M' + vN.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
        o += Object.keys(R.faces).map(function (k) {
          var sel = k === 'N' && (st.selFace || st.preview || st.tool === 'vertex'), d = k === 'N' ? dN : R.faces[k];
          return '<path data-a="face" data-v="' + k + '" d="' + d + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : k === 'S' ? 'var(--c-roofS)' : 'var(--c-roof)') + '" stroke="' + (sel ? 'var(--c-sel)' : 'var(--c-roofLine)') + '" stroke-width="' + (sel ? 2.2 : 1.1) + '" style="cursor:pointer"></path>' +
            '<path d="' + d + '" fill="url(#sd-hatch-' + (k === 'W' || k === 'E' ? 'v' : 'h') + ')" pointer-events="none"></path>';
        }).join('');
        o += '<rect x="232" y="170" width="572" height="372" fill="none" stroke="var(--c-roofLine)" stroke-width="0.9" stroke-dasharray="4 4" opacity=".45" pointer-events="none"></rect>';
        o += '<text x="244" y="186" font-size="10.5" fill="var(--c-muted)" font-weight="600" pointer-events="none">N · ' + R.pitch + '° ↑</text>' +
          (R.faces.S ? '<text x="244" y="538" font-size="10.5" fill="var(--c-muted)" pointer-events="none">S · ' + R.pitch + '° ↓</text>' : '');
        // Layer 4: usable area contour, winter shade, 2.5D solar modules, obstacles and ridges
        if (st.filled || st.preview || st.drag) o += '<path d="' + FN.draw.path(D.rings) + '" fill="var(--c-sel)" fill-opacity=".05" fill-rule="evenodd" stroke="var(--c-sel)" stroke-dasharray="5 5" pointer-events="none"></path>';
        if (st.shade) shadows(st).forEach(function (b) { o += '<path d="M' + b.x + ' ' + b.y + ' L' + (b.x + b.w) + ' ' + b.y + ' L' + (b.x + b.w - 3) + ' ' + (b.y + b.h) + ' L' + (b.x + 3) + ' ' + (b.y + b.h) + ' Z" fill="#1D2026" opacity=".16" pointer-events="none"></path>'; });
        if ((st.filled || st.preview) && st.mods) M.forEach(function (m) { o += FN.draw.modSvg(m, st.preview && !st.filled, m.shaded && st.shade, st.mod25d); });
        O.forEach(function (ob) { o += FN.draw.shapes(st.roof, ob, st.selObs === ob.id); });
        var cur = st.drag ? O.filter(function (ob) { return ob.id === st.drag.id; })[0] : null;
        if (cur) o += FN.draw.guides(st.roof, cur, st.guides);
        o += FN.draw.ridges(st.roof, st.typedEdges);
        // Layer 5: the household's circuits over the plan (x = (px − 518) / 40, z = (py − 356) / 40), each unit
        // a symbol on its wall, declared until the installer taps it to confirm it on site (D-72)
        if (J && S && S.measures && (st.circ || st.fid)) o += circuitsSvg();
        // Edit vertices handles & live edge lengths on the North face (fig-4.svg: Sommets · A)
        if (st.tool === 'vertex') {
          var cPitchV = Math.cos(R.pitch * Math.PI / 180);
          vN.forEach(function (p, i) {
            var q2 = vN[(i + 1) % vN.length], mx = (p[0] + q2[0]) / 2, my = (p[1] + q2[1]) / 2;
            var eLen = Math.hypot((q2[0] - p[0]) / 40, (q2[1] - p[1]) / 40 / cPitchV);
            o += '<g data-a="vadd" data-v="' + i + '" style="cursor:copy"><circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="6" fill="var(--c-paper)" stroke="var(--c-sel)" stroke-width="1.4"></circle>' +
              '<path d="M' + (mx - 3).toFixed(1) + ' ' + my.toFixed(1) + ' H' + (mx + 3).toFixed(1) + ' M' + mx.toFixed(1) + ' ' + (my - 3).toFixed(1) + ' V' + (my + 3).toFixed(1) + '" stroke="var(--c-sel)" stroke-width="1.3"></path></g>' +
              '<rect x="' + (mx - 24).toFixed(1) + '" y="' + (my - 23).toFixed(1) + '" width="48" height="15" rx="4" fill="var(--c-paper)" stroke="var(--c-line)" pointer-events="none"></rect>' +
              '<text x="' + mx.toFixed(1) + '" y="' + (my - 12.5).toFixed(1) + '" font-size="9.5" font-weight="600" text-anchor="middle" fill="var(--c-ink2)" pointer-events="none">' + eLen.toFixed(2) + ' m</text>';
          });
          vN.forEach(function (p, i) {
            var vsel = st.selVtx === i;
            o += '<rect data-vtx="' + i + '" x="' + (p[0] - 5.5).toFixed(1) + '" y="' + (p[1] - 5.5).toFixed(1) + '" width="11" height="11" rx="2" fill="' + (vsel ? 'var(--c-sel)' : 'var(--c-paper)') + '" stroke="var(--c-sel)" stroke-width="2" style="cursor:move"></rect>';
          });
        }
        // Layer 5: CAD overlays (traced polygons / 3-point rectangles, dimensions & measures, note/photo pins, and live drafting preview)
        st.zones.forEach(function (z) {
          var d = 'M' + z.pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
          var cx = z.pts.reduce(function (a, p) { return a + p[0]; }, 0) / z.pts.length, cy = z.pts.reduce(function (a, p) { return a + p[1]; }, 0) / z.pts.length;
          o += '<g data-a="zdel" data-v="' + z.id + '" style="cursor:pointer"><path d="' + d + '" fill="var(--c-sel)" fill-opacity=".11" stroke="var(--c-sel)" stroke-width="1.8" stroke-dasharray="6 4"></path>' +
            z.pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="var(--c-paper)" stroke="var(--c-sel)" stroke-width="1.6"></circle>'; }).join('') +
            '<rect x="' + (cx - 42).toFixed(1) + '" y="' + (cy - 10).toFixed(1) + '" width="84" height="20" rx="5" fill="var(--c-paper)" stroke="var(--c-sel)" stroke-width="1"></rect>' +
            '<text x="' + cx.toFixed(1) + '" y="' + (cy + 3.5).toFixed(1) + '" font-size="10.5" font-weight="600" text-anchor="middle" fill="var(--c-sel)">' + z.label + ' ×</text></g>';
        });
        var drawDim = function (d, live) {
          var dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * 12, ny = dx / L * 12;
          var ax = d.a[0] + nx, ay = d.a[1] + ny, bx = d.b[0] + nx, by = d.b[1] + ny, mx = (ax + bx) / 2, my = (ay + by) / 2;
          var col = d.kind === 'measure' ? 'var(--c-sun)' : 'var(--c-ink)', txt = d.kind === 'measure' ? d.plan.toFixed(2) + ' m (slope ' + d.slope.toFixed(2) + ' m)' : d.slope.toFixed(2) + ' m';
          var w = d.kind === 'measure' ? 148 : 66;
          return '<g ' + (live ? 'pointer-events="none"' : 'data-a="ddel" data-v="' + d.id + '" style="cursor:pointer"') + '>' +
            '<path d="M' + d.a[0].toFixed(1) + ' ' + d.a[1].toFixed(1) + ' L' + (ax + nx * 0.3).toFixed(1) + ' ' + (ay + ny * 0.3).toFixed(1) + ' M' + d.b[0].toFixed(1) + ' ' + d.b[1].toFixed(1) + ' L' + (bx + nx * 0.3).toFixed(1) + ' ' + (by + ny * 0.3).toFixed(1) + '" stroke="' + col + '" stroke-width="1" opacity=".75"></path>' +
            '<path d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' L' + bx.toFixed(1) + ' ' + by.toFixed(1) + '" stroke="' + col + '" stroke-width="1.5" stroke-dasharray="' + (d.kind === 'measure' ? '4 3' : 'none') + '"></path>' +
            '<circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="2.6" fill="' + col + '"></circle><circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="2.6" fill="' + col + '"></circle>' +
            '<rect x="' + (mx - w / 2).toFixed(1) + '" y="' + (my - 10).toFixed(1) + '" width="' + w + '" height="20" rx="5" fill="var(--c-paper)" stroke="' + col + '" stroke-width="1.1"></rect>' +
            '<text x="' + mx.toFixed(1) + '" y="' + (my + 3.5).toFixed(1) + '" font-size="10.5" font-weight="600" text-anchor="middle" fill="var(--c-ink)">' + txt + (live ? '' : ' ×') + '</text></g>';
        };
        if (st.notesOn) {
          st.dims.forEach(function (d) { o += drawDim(d, false); });
          st.pins.forEach(function (p) {
            var sel = st.selPin === p.id, col = p.kind === 'photo' ? 'var(--c-sel)' : 'var(--c-sun)';
            o += '<g data-a="pin" data-v="' + p.id + '" style="cursor:pointer"><circle cx="' + (p.x + 1.5).toFixed(1) + '" cy="' + (p.y + 2).toFixed(1) + '" r="12" fill="#12161C" opacity=".22"></circle>' +
              '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="12" fill="var(--c-paper)" stroke="' + col + '" stroke-width="' + (sel ? 2.5 : 1.6) + '"></circle>' +
              '<g transform="translate(' + (p.x - 8).toFixed(1) + ' ' + (p.y - 8).toFixed(1) + ') scale(0.67)" stroke="' + col + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              (p.kind === 'photo' ? '<path d="M3 8.5 L3 18.5 L21 18.5 L21 8.5 L16.5 8.5 L15 6 L9 6 L7.5 8.5 Z"></path><circle cx="12" cy="13.5" r="3.2"></circle>' : '<path d="M12 20.5 C12 20.5 18 14.5 18 10 A6 6 0 1 0 6 10 C6 14.5 12 20.5 12 20.5 Z M9.5 9.5 H14.5 M9.5 12 H13"></path>') + '</g></g>';
          });
        }
        if (st.lastMeas && st.tool === 'measure' && !st.pts.length) o += drawDim(st.lastMeas, true);
        if (st.curPt && ['trace', 'rect3', 'measure', 'dimension'].indexOf(st.tool) >= 0) {
          var sp = st.curPt;
          if (sp.kind === 'vertex') o += '<rect x="' + (sp[0] - 5).toFixed(1) + '" y="' + (sp[1] - 5).toFixed(1) + '" width="10" height="10" fill="none" stroke="var(--c-sel)" stroke-width="1.8" pointer-events="none"></rect>';
          else if (sp.kind === 'grid') o += '<path d="M' + (sp[0] - 5).toFixed(1) + ' ' + sp[1].toFixed(1) + ' H' + (sp[0] + 5).toFixed(1) + ' M' + sp[0].toFixed(1) + ' ' + (sp[1] - 5).toFixed(1) + ' V' + (sp[1] + 5).toFixed(1) + '" stroke="var(--c-sel)" stroke-width="1.4" pointer-events="none"></path>';
        }
        if (st.pts.length && st.curPt) {
          var p0 = st.pts[0], pL = st.pts[st.pts.length - 1], cp = st.curPt, cPitch = Math.cos(R.pitch * Math.PI / 180);
          if (st.tool === 'measure' || st.tool === 'dimension') {
            var dPlan = Math.hypot(cp[0] - p0[0], cp[1] - p0[1]) / 40, dSlope = Math.hypot((cp[0] - p0[0]) / 40, (cp[1] - p0[1]) / 40 / cPitch);
            o += drawDim({ a: p0, b: cp, plan: dPlan, slope: dSlope, kind: st.tool }, true);
          } else if (st.tool === 'trace') {
            var allPts = st.pts.concat([cp]);
            o += '<path d="M' + allPts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + '" fill="var(--c-sel)" fill-opacity=".08" stroke="var(--c-sel)" stroke-width="1.6" stroke-dasharray="5 4" pointer-events="none"></path>' +
              st.pts.map(function (p, idx) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (idx === 0 ? 5.5 : 3.5) + '" fill="' + (idx === 0 ? 'var(--c-sel)' : 'var(--c-paper)') + '" stroke="var(--c-sel)" stroke-width="1.6" pointer-events="none"></circle>'; }).join('');
          } else if (st.tool === 'rect3') {
            if (st.pts.length === 1) {
              o += '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' L' + cp[0].toFixed(1) + ' ' + cp[1].toFixed(1) + '" stroke="var(--c-sel)" stroke-width="1.8" stroke-dasharray="5 4" pointer-events="none"></path>' +
                '<circle cx="' + p0[0].toFixed(1) + '" cy="' + p0[1].toFixed(1) + '" r="4" fill="var(--c-sel)" pointer-events="none"></circle>';
            } else if (st.pts.length === 2) {
              var p1 = st.pts[1], ux = p1[0] - p0[0], uy = p1[1] - p0[1], uL = Math.hypot(ux, uy) || 1, nx2 = -uy / uL, ny2 = ux / uL;
              var hDist = (cp[0] - p1[0]) * nx2 + (cp[1] - p1[1]) * ny2, p2 = [p1[0] + nx2 * hDist, p1[1] + ny2 * hDist], p3 = [p0[0] + nx2 * hDist, p0[1] + ny2 * hDist];
              o += '<path d="M' + [p0, p1, p2, p3].map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z" fill="var(--c-sel)" fill-opacity=".12" stroke="var(--c-sel)" stroke-width="1.8" stroke-dasharray="5 4" pointer-events="none"></path>';
            }
          }
          // Dynamic input floating badge near the cursor (fig-6.svg: Saisie / Type value)
          if (st.tool === 'trace' || st.tool === 'rect3') {
            var segLen = (Math.hypot(cp[0] - pL[0], cp[1] - pL[1]) / 40).toFixed(2), segAng = Math.round((Math.atan2(-(cp[1] - pL[1]), cp[0] - pL[0]) * 180 / Math.PI + 360) % 360);
            var showL = st.dynLen !== '' ? st.dynLen : segLen, showA = st.dynAng !== '' ? st.dynAng : '' + segAng;
            o += '<g transform="translate(' + (cp[0] + 14).toFixed(1) + ' ' + (cp[1] - 32).toFixed(1) + ')" pointer-events="none">' +
              '<rect width="128" height="24" rx="6" fill="var(--c-paper)" stroke="var(--c-sel)" stroke-width="1.3"></rect>' +
              '<rect x="4" y="3" width="62" height="18" rx="4" fill="' + (st.dynField === 0 ? 'var(--c-selSoft)' : 'var(--c-paper2)') + '"></rect>' +
              '<text x="35" y="15.5" font-size="10.5" font-weight="600" text-anchor="middle" fill="var(--c-sel)">' + showL + ' m</text>' +
              '<rect x="70" y="3" width="54" height="18" rx="4" fill="' + (st.dynField === 1 ? 'var(--c-selSoft)' : 'var(--c-paper2)') + '"></rect>' +
              '<text x="97" y="15.5" font-size="10.5" font-weight="600" text-anchor="middle" fill="var(--c-ink2)">∠ ' + showA + '°</text></g>';
          }
        }
        o += '</g></g>';
        var gTxt = st.grid === 'off' ? 'grid off' : 'grid 1 m / 5 m (' + st.grid + ')';
        o += '<text x="40" y="760" font-size="11" fill="var(--c-muted)">' + (D.live ? 'studio-draw · WebAssembly · ' + D.ms.toFixed(1) + ' ms · ' + gTxt + ' · wheel: zoom · Space+drag: pan' : 'prototype rows · ' + gTxt + ' · wheel: zoom · Space+drag: pan') + '</text>';
        o += '<g transform="translate(888 708)" pointer-events="none"><path d="M0 12 V17 H120 V12 M40 14 V17 M80 14 V17" fill="none" stroke="var(--c-muted)" stroke-width="1.2"></path><text x="60" y="9" font-size="10" text-anchor="middle" fill="var(--c-muted)">' + (3 / st.zoom).toFixed(1).replace('.0', '') + ' m</text></g>';
        return o + '<g data-a="north" style="cursor:pointer"><title>North · click to frame and align North up</title><circle cx="1050" cy="716" r="20" fill="var(--c-paper)" stroke="var(--c-line)"></circle><path d="M1050 702 L1055 718 L1050 715 L1045 718 Z" fill="var(--c-ink)"></path><text x="1050" y="693" font-size="9.5" font-weight="600" text-anchor="middle" fill="var(--c-muted)">N</text></g></svg>';
      }
      function grip(key, vertical) { return '<div data-grip="' + key + '" title="Drag to move · double tap to dock" style="' + (vertical ? 'width:16px;border-right:1px solid var(--c-line2)' : 'height:16px;width:100%') + ';cursor:grab;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="' + (vertical ? 'width:3px;height:18px' : 'width:18px;height:3px') + ';border-radius:2px;background:var(--c-grip)"></span></div>'; }
      function rail(key, list) {
        var p = st.pos[key];
        return '<div style="position:absolute;left:' + p[0] + 'px;top:' + p[1] + 'px;width:58px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);padding:4px 0 8px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:4" role="toolbar">' + grip(key) + list.map(function (t, i) {
          var on = t === 'layers' ? st.layers : st.tool === t;
          var dis = t === 'panel' && !st.filled;
          var hov = st.hover && st.hover.k === t && !on;
          var barSide = key === 'tools' ? 'right:-6px' : 'left:-6px';
          return '<button type="button" data-a="tool" data-v="' + t + '" data-tip="' + t + '|' + key + '|' + i + '" aria-label="' + TIPS[t][0] + '" aria-pressed="' + on + '" style="position:relative;width:44px;height:44px;border:' + (on ? '1.5px solid var(--c-sel)' : hov ? '1px solid var(--c-line)' : 'none') + ';border-radius:10px;background:' + (on ? 'var(--c-selSoft)' : hov ? 'var(--c-line2)' : 'transparent') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';opacity:' + (dis && !on ? '0.42' : '1') + ';display:flex;align-items:center;justify-content:center;cursor:pointer">' +
            (on ? '<span style="position:absolute;' + barSide + ';top:6px;bottom:6px;width:3px;border-radius:2px;background:var(--c-sel)"></span>' : '') +
            FN.icon(t === 'layers' ? 'layers' : t) + '</button>';
        }).join('') + '</div>';
      }
      function ui() {
        var E = energy(st), o = '', P = st.pos, left = ['select', 'vertex', 'trace', 'rect3', 'fill', 'panel', 'chimney', 'measure'], right = ['dimension', 'note', 'photo', 'layers'];
        if (st.level === 0) { left = ['select', 'fill', 'panel', 'chimney']; right = ['layers']; }
        o += rail('tools', left) + rail('notes', right);
        var c = st.chip; if (c && !st.pad) o += '<div style="position:absolute;left:' + c.x + 'px;top:' + c.y + 'px;' + FN.card + ';padding:7px 10px;font-size:12px;display:flex;gap:8px;z-index:3;pointer-events:none;box-shadow:0 6px 18px rgba(29,32,38,.12)"><span style="width:3px;border-radius:2px;background:' + c.c + '"></span><span><b style="color:' + c.c + '">' + c.t + '</b><br><span style="color:var(--c-ink2)">' + c.b + '</span></span></div>';
        var kp = [['Modules', st.filled ? '' + E.n : '—'], ['Power', st.filled ? E.kwp.toFixed(2) + ' kWp' : '—'], ['Yield', st.filled ? FN.n(E.kwh) + ' kWh/yr' : '—']];
        o += '<div style="position:absolute;left:' + P.read[0] + 'px;top:' + P.read[1] + 'px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);display:flex;align-items:stretch;z-index:4">' + grip('read', true) +
          '<div style="padding:10px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2);min-width:168px"><span style="' + FN.kick + '">Saves a year</span><b style="font-size:22px;font-weight:600;color:' + (st.busy || !st.filled ? 'var(--c-faint)' : 'var(--c-gain)') + '">' + (st.filled ? FN.money(E.save * 0.85) + '–' + FN.money(E.save * 1.1) : '—') + '</b></div>' +
          kp.map(function (k) { return '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2)"><span style="' + FN.kick + '">' + k[0] + '</span><b style="font-size:16px;font-weight:600;color:' + (st.busy ? 'var(--c-faint)' : 'var(--c-ink)') + '">' + k[1] + '</b></div>'; }).join('') +
          '<button type="button" data-a="sheet" style="border:none;background:transparent;padding:10px 14px;display:flex;flex-direction:column;gap:2px;text-align:left;font:inherit;color:var(--c-ink);cursor:pointer"><span style="' + FN.kick + '">Equipment ▸</span><b style="font-size:14px;font-weight:600;color:var(--c-battery)">' + st.modW + ' W · ' + st.inv + ' kW · ' + (st.bat ? st.bat + ' kWh' : 'no battery') + '</b></button><span style="align-self:center;font-size:11px;color:var(--c-muted);padding:0 12px 0 4px;display:flex;gap:6px;align-items:center">' + (st.busy ? '<span style="width:6px;height:6px;border-radius:3px;background:var(--c-live)"></span>computing…' : st.filled ? 'API · 0.3 s' : 'fill a face') + '</span></div>';
        var ctx = [];
        if (st.preview && !st.filled) { ctx = ['portrait', 'landscape', 'mixed'].map(function (v) { return [v.charAt(0).toUpperCase() + v.slice(1), 'variant', v, st.variant === v]; }); ctx.push(['✓ Keep', 'keep', '', 'k']); }
        else if (st.selFace) ctx = [['Edit vertices · A', 'tool', 'vertex', false], ['Setbacks · ' + FN.SETBACK.toFixed(2) + ' m', 'setback', '', false], ['Clear layout', 'clearface', '', false]];
        else if (st.tool === 'vertex') ctx = [['← 5 cm', 'vnudge', '-2,0', false], ['↑ 5 cm', 'vnudge', '0,-2', false], ['↓ 5 cm', 'vnudge', '0,2', false], ['→ 5 cm', 'vnudge', '2,0', false], ['Square 90°', 'vsquare', '', false], ['Reset face', 'vreset', '', false]];
        else if (st.tool === 'chimney') ctx = Object.keys(FN.OBST).map(function (k, idx) {
          var obIco = FN.icon(FN.OBST[k].icon, st.otype === k ? 'var(--c-sel)' : 'var(--c-ink)', 16);
          return ['<span style="display:inline-flex;align-items:center;gap:5px">' + obIco + FN.OBST[k].en + ' <span style="opacity:.6;font-size:11px">' + (idx + 1) + '</span></span>', 'otype', k, st.otype === k];
        });
        else if (st.tool === 'trace') ctx = st.pts.length >= 3 ? [['✓ Close zone (' + st.pts.length + ' pts)', 'zclose', '', 'k'], ['Undo point', 'zundo', '', false], ['Cancel', 'zcancel', '', false]] : [['Undo point', 'zundo', '', false], ['Cancel', 'zcancel', '', false]];
        else if (st.tool === 'measure' && st.lastMeas && !st.pts.length) ctx = [['✓ Keep as dimension (D)', 'mkeep', '', 'k'], ['Clear', 'zcancel', '', false]];
        else if (st.tool === 'rect3' || st.tool === 'measure' || st.tool === 'dimension') { if (st.pts.length) ctx = [['Cancel', 'zcancel', '', false]]; }
        var ctxLabel = st.tool === 'chimney' && !st.preview ? 'Obstacle · tap the north face to place' : st.tool === 'vertex' ? 'Vertices (corner #' + (st.selVtx + 1) + ') · drag handle, tap mid-edge +, or nudge' : st.tool === 'trace' ? 'Trace · tap corners or type length + Enter (' + st.pts.length + ' pts)' : st.tool === 'rect3' ? 'Rectangle 3 pts · ' + ['tap corner A', 'tap corner B (first edge)', 'tap opposite side'][st.pts.length] : st.tool === 'measure' ? 'Measure · ' + (st.pts.length ? 'tap point B to read plan & slope length' : st.lastMeas ? 'plan ' + st.lastMeas.plan.toFixed(2) + ' m · slope ' + st.lastMeas.slope.toFixed(2) + ' m' : 'tap point A on the plan') : st.tool === 'dimension' ? 'Dimension · ' + (st.pts.length ? 'tap second vertex to pin dimension' : 'tap first vertex on the plan') : st.tool === 'note' ? 'Note · tap a point on the roof to pin a field note' : st.tool === 'photo' ? 'Photo · tap a point on the roof to attach a survey photo' : st.tool === 'pan' ? 'Pan · drag the plan to move around (or hold Space)' : 'North face';
        if (ctx.length || ['vertex', 'trace', 'rect3', 'measure', 'dimension', 'note', 'photo', 'pan'].indexOf(st.tool) >= 0) o += '<div style="position:absolute;left:' + P.read[0] + 'px;top:' + (P.read[1] + 70) + 'px;display:flex;align-items:center;gap:4px;' + FN.card + ';padding:4px 8px;box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4"><span style="font-size:12px;color:var(--c-muted);padding:0 6px">' + ctxLabel + '</span>' + ctx.map(function (x) { var k = x[3] === 'k'; return '<button type="button" data-a="' + x[1] + '" data-v="' + x[2] + '" style="min-height:34px;padding:0 10px;border-radius:8px;border:1px solid ' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (k ? 'var(--c-paper)' : x[3] ? 'var(--c-sel)' : x[0].indexOf('Clear') === 0 ? 'var(--c-loss)' : 'var(--c-ink)') + ';font:inherit;font-size:12px;cursor:pointer">' + x[0] + '</button>'; }).join('') + '</div>';
        if (st.hover && !st.layers && !st.settings) { var tp = TIPS[st.hover.k]; o += '<div style="position:absolute;left:' + st.hover.x + 'px;top:' + st.hover.y + 'px;width:260px;background:var(--c-tip);color:var(--c-paper);border-radius:12px;padding:12px;box-shadow:0 10px 28px rgba(29,32,38,.25);display:flex;flex-direction:column;gap:6px;z-index:6;pointer-events:none"><span style="display:flex;justify-content:space-between"><b style="font-size:14px">' + tp[0] + '</b><span style="font-size:11px;border:1px solid currentColor;opacity:.7;border-radius:4px;padding:1px 5px">' + tp[1] + '</span></span>' + tp[2].map(function (s, i) { return '<span style="font-size:12px;line-height:1.45;opacity:.9">' + (i + 1) + ' · ' + s + '</span>'; }).join('') + '<span style="display:flex;justify-content:space-between;font-size:11px;opacity:.75"><span>' + tp[3] + '</span><span>⌥ snaps off</span></span></div>'; }
        var chBody = !st.swapped || st.chOpen;
        o += '<div style="position:absolute;left:' + P.changes[0] + 'px;top:' + P.changes[1] + 'px;width:270px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="changes" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;' + (chBody ? 'border-bottom:1px solid var(--c-line2);' : '') + 'cursor:grab"><b style="font-size:12px;font-weight:600">Changes</b><button type="button" data-a="chopen" style="border:none;background:transparent;padding:0;font:inherit;font-size:11px;color:var(--c-muted);cursor:pointer">' + (st.log.length ? st.log.length + ' recent' : 'none yet') + (st.swapped ? (st.chOpen ? ' ▴' : ' ▾') : '') + '</button></div>' +
          (chBody ? (st.log.length ? st.log.map(function (l) { return '<div style="display:flex;gap:10px;padding:9px 12px;border-bottom:1px solid var(--c-line2);font-size:12px"><span style="width:3px;border-radius:2px;background:' + l.color + '"></span><span style="flex:1"><b style="font-weight:600">' + l.label + '</b><br><span style="color:var(--c-ink2)">' + l.delta + '</span></span><b style="color:' + l.color + ';font-weight:600;white-space:nowrap">' + l.money + '</b></div>'; }).join('') : '<span style="display:block;padding:12px;font-size:12px;color:var(--c-muted);line-height:1.5">Each edit lands here with what it gains or costs. Undo walks back through it.</span>') : '') + '</div>';
        var v = P.v3;
        o += '<div style="position:absolute;left:' + v[0] + 'px;top:' + v[1] + 'px;width:330px;height:252px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.12);z-index:4;overflow:hidden"><div data-grip="v3" style="height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600;white-space:nowrap">' + (st.swapped ? 'Plan · tap ⇄ to edit' : '3D · mirrors the plan') + '</b><span style="display:flex;gap:4px">' +
          [[9, '9 am'], [12, 'noon'], [15, '3 pm']].map(function (x) { var on = st.hour3 === x[0]; return '<button type="button" data-a="hour3" data-v="' + x[0] + '" style="min-height:28px;padding:0 7px;border-radius:6px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:11px;cursor:pointer">' + x[1] + '</button>'; }).join('') +
          '<button type="button" data-a="swap" aria-label="Swap the 3D view and the plan" style="width:32px;height:28px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">⇄</button></span></div>' +
          (st.swapped ? (function () {
            var R3 = FN.ROOFS[st.roof], D3 = draw(st), O3 = obstaclesOf(st), vN3 = vertsOf(st), dN3 = 'M' + vN3.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
            return '<svg data-a="swap" width="330" height="212" viewBox="190 135 660 440" aria-hidden="true" style="background:var(--c-canvas);display:block;cursor:pointer">' + FN.draw.defs() +
              (st.grid !== 'off' ? '<rect x="190" y="135" width="660" height="440" fill="url(#sd-grid-' + st.grid + ')"></rect>' : '') +
              '<rect x="223" y="162" width="602" height="402" rx="3" fill="#1D2026" opacity=".12"></rect>' +
              Object.keys(R3.faces).map(function (k) { var d = k === 'N' ? dN3 : R3.faces[k]; return '<path d="' + d + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : k === 'S' ? 'var(--c-roofS)' : 'var(--c-roof)') + '" stroke="var(--c-roofLine)" stroke-width="1.3"></path><path d="' + d + '" fill="url(#sd-hatch-' + (k === 'W' || k === 'E' ? 'v' : 'h') + ')"></path>'; }).join('') +
              (st.filled || st.preview ? '<path d="' + FN.draw.path(D3.rings) + '" fill="var(--c-sel)" fill-opacity=".05" fill-rule="evenodd" stroke="var(--c-sel)" stroke-dasharray="5 5"></path>' : '') +
              ((st.filled || st.preview) && st.mods ? mods(st).filter(function (m) { return !m.blocked && !m.removed; }).map(function (m) { return FN.draw.modSvg(m, st.preview && !st.filled, m.shaded && st.shade, st.mod25d); }).join('') : '') +
              O3.map(function (ob) { return FN.draw.shapes(st.roof, ob, st.selObs === ob.id); }).join('') +
              st.zones.map(function (z) { return '<path d="M' + z.pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z" fill="var(--c-sel)" fill-opacity=".11" stroke="var(--c-sel)" stroke-width="1.8" stroke-dasharray="6 4"></path>'; }).join('') +
              FN.draw.ridges(st.roof, st.typedEdges) + '</svg>';
          })() : '') + (H ? '' : '<div style="height:212px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--c-ink2)">3D loading…</div>') + '</div>';
        if (st.swapped) o += '<span style="position:absolute;left:92px;bottom:14px;font-size:12px;padding:5px 9px;border-radius:7px;background:var(--c-paper);border:1px solid var(--c-line);color:var(--c-ink2);z-index:3">3D interactive · click the roof to place or edit · ⇄ to swap back</span>';
        // the roof type, as the survey found it: hip, gable or skillion
        o += '<div style="position:absolute;left:380px;top:768px;display:flex;align-items:center;gap:4px;' + FN.card + ';padding:4px;box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4"><span style="font-size:12px;color:var(--c-muted);padding:0 8px">Roof</span>' + Object.keys(FN.ROOFS).map(function (k) { var on = st.roof === k; return '<button type="button" data-a="roof" data-v="' + k + '" aria-pressed="' + on + '" style="min-height:34px;padding:0 12px;border-radius:8px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;font-size:12.5px;cursor:pointer">' + FN.ROOFS[k].en + '</button>'; }).join('') + '</div>';
        // CAD navigation & snap bar on the 2D plan: Pan (H), Zoom (Z), Fit (⇧1), Snaps (S)
        if (!st.swapped) o += '<div style="position:absolute;left:598px;top:768px;display:flex;align-items:center;gap:3px;' + FN.card + ';padding:4px;box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4">' +
          '<button type="button" data-a="tool" data-v="' + (st.tool === 'pan' ? 'select' : 'pan') + '" aria-pressed="' + (st.tool === 'pan' || st.space) + '" title="Pan · H (or hold Space + drag)" style="width:32px;height:34px;border-radius:7px;border:1px solid ' + (st.tool === 'pan' || st.space ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (st.tool === 'pan' || st.space ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (st.tool === 'pan' || st.space ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;align-items:center;justify-content:center;cursor:pointer">' + FN.icon('pan', st.tool === 'pan' || st.space ? 'var(--c-sel)' : 'var(--c-ink)', 17) + '</button>' +
          '<button type="button" data-a="zoom" data-v="-1" aria-label="Zoom out" title="Zoom out · Z (wheel down)" style="width:28px;height:34px;border-radius:7px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:14px;cursor:pointer">−</button>' +
          '<button type="button" data-a="zoom" data-v="0" title="Zoom · Z (wheel at cursor)" style="min-width:60px;height:34px;padding:0 5px;border-radius:7px;border:none;background:transparent;color:var(--c-ink);font:inherit;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:3px;cursor:pointer">' + FN.icon('zoom', 'var(--c-muted)', 14) + Math.round(st.zoom * 100) + '%</button>' +
          '<button type="button" data-a="zoom" data-v="1" aria-label="Zoom in" title="Zoom in · Z (wheel up)" style="width:28px;height:34px;border-radius:7px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:14px;cursor:pointer">+</button>' +
          '<button type="button" data-a="fit" aria-label="Frame roof" title="Fit roof · ⇧1" style="width:32px;height:34px;border-radius:7px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);display:flex;align-items:center;justify-content:center;cursor:pointer">' + FN.icon('fit', 'var(--c-ink)', 17) + '</button>' +
          '<button type="button" data-a="snap" aria-pressed="' + st.snapOn + '" title="Magnetic snaps · S (hold Alt to suspend)" style="width:32px;height:34px;border-radius:7px;border:1px solid ' + (st.snapOn ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (st.snapOn ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (st.snapOn ? 'var(--c-sel)' : 'var(--c-muted)') + ';display:flex;align-items:center;justify-content:center;cursor:pointer">' + FN.icon('snap', st.snapOn ? 'var(--c-sel)' : 'var(--c-muted)', 17) + '</button></div>';
        // the popover of the selected obstacle: what it is, its keep-out, where it sits, what it takes
        var so = !st.drag && st.selObs ? obstaclesOf(st).filter(function (x) { return x.id === st.selObs; })[0] : null;
        if (so && !st.pad) {
          var T = FN.OBST[so.type], w0 = FN.draw.where(st.roof, so.x, so.y), others = obstaclesOf(st).filter(function (x) { return x.id !== so.id; }).map(function (x) { return { type: x.type, x: Math.round(x.x), y: Math.round(x.y) }; });
          var takes = FN.draw.compute(st.roof, others, st.variant).n - draw(st).n, sp = planScreen(so.x, so.y), px = Math.max(84, Math.min(sp[0] + 56, 1180 - 300)), py = Math.max(60, Math.min(sp[1] - 60, 820 - 300));
          var row = function (k, val) { return '<span style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--c-line2)"><span style="color:var(--c-muted);display:inline-flex;align-items:center;gap:4px">' + k + '</span><span style="font-weight:600;display:flex;gap:6px;align-items:center">' + val + '</span></span>'; };
          var btn = function (a, v, t) { return '<button type="button" data-a="' + a + '" data-v="' + v + '" style="min-width:28px;min-height:28px;border-radius:7px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:13px;cursor:pointer">' + t + '</button>'; };
          o += '<div role="dialog" aria-label="' + T.en + '" style="position:absolute;left:' + px + 'px;top:' + py + 'px;width:296px;' + FN.card + ';border-color:var(--c-sel);box-shadow:0 12px 32px rgba(29,32,38,.18);z-index:7;padding:12px 14px;display:flex;flex-direction:column;gap:4px">' +
            '<span style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px">' + FN.icon(T.icon, 'var(--c-sel)', 18) + T.en + '</b>' + btn('oclose', '', '×') + '</span>' +
            (so.id !== 'chim' ? '<span style="display:flex;gap:3px;flex-wrap:wrap;margin:2px 0 4px">' + Object.keys(FN.OBST).filter(function (k) { return k !== 'chimney'; }).map(function (k) { var on = so.type === k; return '<button type="button" data-a="ochange" data-v="' + k + '" style="min-height:26px;padding:0 6px;border-radius:6px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:11px;display:inline-flex;align-items:center;gap:3px;cursor:pointer">' + FN.icon(FN.OBST[k].icon, on ? 'var(--c-sel)' : 'var(--c-ink)', 13) + FN.OBST[k].en + '</button>'; }).join('') + '</span>' : '') +
            row('Size', T.shape ? 'Ø ' + (2 * T.a).toFixed(2) + ' m' : T.a.toFixed(2) + ' × ' + T.b.toFixed(2) + ' m') + row('Keep-out', T.margin.toFixed(2) + ' m, round join') +
            row(FN.icon('height', 'var(--c-muted)', 15) + 'Height above roof', so.id === 'chim' ? btn('pad', '', so.h.toFixed(2) + ' m ✎') : btn('oh', '-0.1', '−') + so.h.toFixed(2) + ' m' + btn('oh', '0.1', '+')) +
            row('To the ridge · to the eave', w0.ridge.toFixed(2) + ' m · ' + w0.eave.toFixed(2) + ' m') + row('Modules it takes', takes > 0 ? '<span style="color:var(--c-loss)">' + takes + '</span>' : '0') +
            '<span style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span style="font-size:11px;color:var(--c-muted)">drag it · Alt: no snap</span><button type="button" data-a="odel" style="min-height:30px;padding:0 10px;border-radius:7px;border:1px solid var(--c-loss);background:var(--c-paper2);color:var(--c-loss);font:inherit;font-size:12px;display:inline-flex;align-items:center;gap:4px;cursor:pointer">' + FN.icon('delete', 'var(--c-loss)', 14) + 'Delete</button></span></div>';
        }
        if (st.pad) o += '<div style="position:absolute;left:600px;top:200px;width:210px;' + FN.card + ';border-color:var(--c-sel);padding:10px;box-shadow:0 10px 28px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:8px;z-index:6"><span style="font-size:12px;color:var(--c-muted)">Chimney height above the roof</span><b style="font-size:22px;font-weight:600;color:var(--c-sel);border-bottom:1.5px solid var(--c-sel)">' + st.chimH + ' m</b><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px">' +
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '✓'].map(function (k) { var ok = k === '✓'; return '<button type="button" data-a="key" data-v="' + k + '" style="min-height:44px;border-radius:8px;border:1px solid var(--c-line);background:' + (ok ? 'var(--c-ink)' : 'var(--c-paper2)') + ';color:' + (ok ? 'var(--c-paper)' : 'var(--c-ink)') + ';font:inherit;font-size:16px;cursor:pointer">' + k + '</button>'; }).join('') + '</div></div>';
        var sp0 = st.selPin ? st.pins.filter(function (p) { return p.id === st.selPin; })[0] : null;
        if (sp0) {
          var psc = planScreen(sp0.x, sp0.y), ppx = Math.max(84, Math.min(psc[0] + 22, 1180 - 290)), ppy = Math.max(60, Math.min(psc[1] - 40, 820 - 250)), wPin = FN.draw.where(st.roof, sp0.x, sp0.y);
          o += '<div role="dialog" aria-label="' + (sp0.kind === 'photo' ? 'Survey photo' : 'Field note') + '" style="position:absolute;left:' + ppx + 'px;top:' + ppy + 'px;width:270px;' + FN.card + ';border-color:' + (sp0.kind === 'photo' ? 'var(--c-sel)' : 'var(--c-sun)') + ';box-shadow:0 12px 32px rgba(29,32,38,.18);z-index:7;padding:12px 14px;display:flex;flex-direction:column;gap:6px">' +
            '<span style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px">' + FN.icon(sp0.kind === 'photo' ? 'photo' : 'note', sp0.kind === 'photo' ? 'var(--c-sel)' : 'var(--c-sun)', 17) + (sp0.kind === 'photo' ? 'Survey photo · ' + sp0.time : 'Field note') + '</b><button type="button" data-a="pclose" style="min-width:26px;min-height:26px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">×</button></span>' +
            (sp0.kind === 'photo' ? '<svg width="242" height="92" viewBox="0 0 242 92" style="border-radius:8px;border:1px solid var(--c-line);background:#D8E4EE"><rect width="242" height="60" fill="#BFD2E2"></rect><polygon points="18,76 88,28 168,28 228,76" fill="#8C7462" stroke="#5E4B3E" stroke-width="1.5"></polygon><rect x="108" y="18" width="22" height="26" fill="#7D6250" stroke="#5E4B3E"></rect><text x="10" y="84" font-size="10" fill="#1D2026" font-weight="600">GPS ±0.4 m · azimuth 12° N · tile check OK</text></svg>' : '') +
            '<span style="font-size:12.5px;color:var(--c-ink);line-height:1.45;background:var(--c-paper2);padding:7px 9px;border-radius:7px;border:1px solid var(--c-line2)">' + sp0.text + '</span>' +
            (sp0.kind === 'note' ? '<div style="display:flex;gap:4px;flex-wrap:wrap">' + ['Rafter spacing 600 mm', 'Tile flashing check', 'Cable entry here', 'Shade after 3:30 pm'].map(function (pr) { return '<button type="button" data-a="pnote" data-v="' + pr + '" style="padding:3px 7px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink2);font:inherit;font-size:11px;cursor:pointer">' + pr + '</button>'; }).join('') + '</div>' : '') +
            '<span style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--c-muted);padding-top:2px"><span>' + wPin.ridge.toFixed(2) + ' m to ridge · ' + wPin.eave.toFixed(2) + ' m to eave</span><button type="button" data-a="pdel" style="padding:3px 9px;border-radius:6px;border:1px solid var(--c-loss);background:var(--c-paper2);color:var(--c-loss);font:inherit;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;cursor:pointer">' + FN.icon('delete', 'var(--c-loss)', 13) + 'Delete</button></span></div>';
        }
        var TD = [['Fill the north face', 3], ['Chimney at 1.20 m', 6], ['Remove a module', 2], ['Try another battery', 2], ['Present', 1]];
        var hints = ['Hover a tool for its tutorial. Fill zone, the north face, ✓ Keep.', 'Obstacle, tap the face, 1 . 2 on the pad, ✓.', 'Modules, then tap any module.', 'Battery ▸ in the reading card, pick a size.', 'Present, top right.', 'Done. Drag any card or bar by its grip; settings reset the layout.'];
        if (!J) o += '<div style="position:absolute;left:' + P.coach[0] + 'px;top:' + P.coach[1] + 'px;width:290px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="coach" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">Demos · touches counted</b><span style="font-size:11px;color:var(--c-muted)">catalogue §6</span></div><div style="padding:6px 8px;display:flex;flex-direction:column;gap:2px">' +
          TD.map(function (t, k) { var cur = k === st.task, dn = k < st.task, u = st.touches[k]; return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 6px;border-radius:6px;background:' + (cur ? 'var(--c-selSoft)' : 'transparent') + '"><span style="color:' + (dn ? 'var(--c-gain)' : 'var(--c-ink)') + ';font-weight:' + (cur ? 600 : 400) + '">' + (dn ? '✓ ' : '') + t[0] + '</span><span style="color:' + (u > t[1] ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + (dn || cur ? u + ' / ' : '') + t[1] + '</span></div>'; }).join('') + '<span style="font-size:11px;color:var(--c-muted);padding:4px 6px">' + hints[Math.min(st.task, 5)] + '</span></div></div>';
        if (st.notif) o += '<div style="position:absolute;right:120px;top:52px;width:320px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;overflow:hidden"><b style="display:block;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--c-line2)">Notifications</b>' + [['Rebate steps down on 1 January', '2 quotes in flight need re-pricing.', 'var(--c-sun)'], ['Survey photos arrived', '12 photos from the phone, attached to this site.', 'var(--c-sel)'], ['Household opened proposal v0', 'Unit 4, 22 Ash Street, yesterday 19:40.', 'var(--c-muted)']].map(function (n) { return '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--c-line2);font-size:12px;line-height:1.45"><span style="width:3px;border-radius:2px;background:' + n[2] + '"></span><span><b style="font-weight:600">' + n[0] + '</b><br><span style="color:var(--c-ink2)">' + n[1] + '</span></span></div>'; }).join('') + '</div>';
        if (st.settings) o += '<div style="position:absolute;right:80px;top:52px;width:280px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;padding:12px;display:flex;flex-direction:column;gap:10px"><b style="font-size:12px;font-weight:600">View settings</b><span style="font-size:12px;color:var(--c-muted)">Disclosure level</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px">' + ['Guided', 'Standard', 'Expert'].map(function (l, k) { return '<button type="button" data-a="level" data-v="' + k + '" style="flex:1;min-height:36px;border:none;border-radius:6px;background:' + (k === st.level ? 'var(--c-paper)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + l + '</button>'; }).join('') + '</div>' + '<button type="button" data-a="reset" style="min-height:40px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:13px;cursor:pointer">Reset panels to the F layout</button></div>';
        if (st.layers) { var ln = P.notes, li = right.indexOf('layers'); o += '<div style="position:absolute;left:' + (ln[0] - 262) + 'px;top:' + Math.max(56, ln[1] + 16 + li * 48 - 8) + 'px;width:250px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;padding:8px;display:flex;flex-direction:column"><b style="font-size:12px;font-weight:600;color:var(--c-muted);padding:6px 8px;display:flex;align-items:center;gap:6px">' + FN.icon('layers', 'var(--c-muted)', 16) + 'Layers · L</b>' +
          [['Imagery · Mar 2026', 'imagery'], ['Circuits · from the household', 'circ'], ['Fidelity', 'fid'], ['Modules', 'mods'], ['Modules · 2.5D relief', 'mod25d'], ['Edge types · Ch. 3', 'typedEdges'], ['Notes & dimensions', 'notesOn'], ['Shade, 9 am in June', 'shade']].map(function (r) { var onL = !!st[r[1]]; return '<button type="button" data-a="layer" data-v="' + r[1] + '" aria-pressed="' + onL + '" style="min-height:38px;display:flex;justify-content:space-between;align-items:center;border:none;border-radius:7px;background:transparent;color:var(--c-ink);font:inherit;font-size:12.5px;padding:0 8px;cursor:pointer"><span style="display:inline-flex;align-items:center;gap:8px;opacity:' + (onL ? 1 : 0.5) + '">' + FN.icon('eye', onL ? 'var(--c-sel)' : 'var(--c-faint)', 17) + r[0] + '</span><span style="font-size:11.5px;color:' + (onL ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (onL ? 'shown' : 'hidden') + '</span></button>'; }).join('') +
          '<div style="border-top:1px solid var(--c-line2);margin-top:4px;padding:8px 8px 4px;display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;color:var(--c-muted)">Grid · 1 m / 5 m</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px">' +
          [['dots', 'Dots'], ['lines', 'Lines'], ['off', 'Off']].map(function (g) { var on = st.grid === g[0]; return '<button type="button" data-a="grid" data-v="' + g[0] + '" aria-pressed="' + on + '" style="flex:1;min-height:30px;border:none;border-radius:6px;background:' + (on ? 'var(--c-paper)' : 'transparent') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;font-size:12px;font-weight:' + (on ? 600 : 400) + ';cursor:pointer">' + g[1] + '</button>'; }).join('') + '</div></div></div>'; }
        if (st.roof === 'flat') {
          var Dflat = draw(st), Gflat = Dflat.geom, curMode = rackMode(st), curRule = st.flatRule || FN.PACK.rule, K = FN.RACKS[curMode];
          var m2 = function (x) { return x.toFixed(2) + ' m'; };
          var gapTxt = Gflat ? (K.mode ? m2(Gflat.gap) + ' aisle' : m2(Gflat.gap)) : '—', pitchTxt = Gflat ? m2(Gflat.pitch) : '—', gcrTxt = Gflat ? Math.round(Gflat.gcr * 100) + ' %' : '—', hTxt = Gflat ? m2(Gflat.height) : '—';
          var ballast = '~' + K.kg + ' kg/module · ~' + FN.n(K.kg * Dflat.n) + ' kg for ' + Dflat.n + ' modules';
          if (Dflat.err) ballast = '—';
          var P_rk = P.racks || [84, 136];
          o += '<div style="position:absolute;left:' + P_rk[0] + 'px;top:' + P_rk[1] + 'px;width:340px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden">' +
            '<div data-grip="racks" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:4px;background:#0e7c86"></span>Tilt frames & racks (D-70)</b><span style="font-size:11px;color:var(--c-muted)">Flat roof · ' + FN.PACK.place + ' ' + Math.abs(FN.PACK.lat).toFixed(1) + '°' + (FN.PACK.lat < 0 ? 'S' : 'N') + '</span></div>' +
            '<div style="padding:10px 12px;display:flex;flex-direction:column;gap:8px">' + (Dflat.err ? '<div role="alert" style="font-size:12px;color:var(--c-loss);line-height:1.4">' + FN.esc(Dflat.err) + '</div>' : '') +
            '<div style="display:flex;flex-direction:column;gap:4px"><span style="' + FN.kick + '">Rack layout & tilt</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px;gap:2px">' +
            Object.keys(FN.RACKS).map(function (k) { return [k, FN.RACKS[k].en]; }).map(function (m) { var onM = curMode === m[0]; return '<button type="button" data-a="flatMode" data-v="' + m[0] + '" style="flex:1;min-height:30px;border:none;border-radius:6px;background:' + (onM ? 'var(--c-paper)' : 'transparent') + ';color:' + (onM ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;font-size:11px;font-weight:' + (onM ? 600 : 400) + ';cursor:pointer;' + (onM ? 'box-shadow:0 1px 3px rgba(29,32,38,.08)' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
            (curMode !== 'ew10' ? '<div style="display:flex;flex-direction:column;gap:4px"><span style="' + FN.kick + '">Winter solstice shade rule</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px;gap:2px">' +
            Object.keys(FN.RULES).map(function (k) { return [k, FN.RULES[k][0]]; }).map(function (ru) { var onR = curRule === ru[0]; return '<button type="button" data-a="flatRule" data-v="' + ru[0] + '" style="flex:1;min-height:28px;border:none;border-radius:6px;background:' + (onR ? 'var(--c-paper)' : 'transparent') + ';color:' + (onR ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;font-size:11px;font-weight:' + (onR ? 600 : 400) + ';cursor:pointer;' + (onR ? 'box-shadow:0 1px 3px rgba(29,32,38,.08)' : '') + '">' + ru[1] + '</button>'; }).join('') + '</div></div>' : '<div style="font-size:11px;color:var(--c-muted);line-height:1.4">East-West tent pairs: shade-free from 7:50 am on winter solstice (Fig. 6.7).</div>') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;padding:6px 0;border-top:1px solid var(--c-line2);border-bottom:1px solid var(--c-line2);font-size:12px">' +
            '<div><span style="color:var(--c-muted)">Gap D:</span> <b style="font-weight:600">' + gapTxt + '</b></div>' +
            '<div><span style="color:var(--c-muted)">Pitch P:</span> <b style="font-weight:600">' + pitchTxt + '</b></div>' +
            '<div><span style="color:var(--c-muted)">GCR:</span> <b style="font-weight:600">' + gcrTxt + '</b></div>' +
            '<div><span style="color:var(--c-muted)">Height H:</span> <b style="font-weight:600">' + hTxt + '</b></div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:2px"><span style="' + FN.kick + '">Estimated ballast [I]</span><span style="font-size:12px;font-weight:600;color:var(--c-ink)">' + ballast + '</span><span style="font-size:11px;color:var(--c-muted)">The frame maker\'s calculator decides, from the tilt, the height and the wind zone (AS/NZS 1170.2).</span></div>' +
            '<div style="font-size:11px;color:var(--c-muted);display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:4px;background:#0e7c86;flex:none"></span>' + (FN.draw.edges('flat') ? FN.draw.edges('flat').filter(function (e) { return e.kind === 'flat'; }).length + ' flat-roof edges, typed by studio-draw' : 'Flat-roof edges') + ' · ' + FN.PACK.flatZone.toFixed(2) + ' m edge zone</div>' +
            '</div></div>';
        }
        if (st.toast) o += '<div style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:9px 14px;border-radius:10px;z-index:8">' + st.toast + '</div>';
        if (st.sheet) {
          // the inverter fits the modules this design prices: the roof's and the zones the installer confirmed
          var sizes = [0, 10, 13.5, 20, 28], siteKwp = E.kwp, ratio = siteKwp / st.inv, okRatio = ratio <= 1.33;
          var pick = function (act, v, on, title, sub, extra) { return '<button type="button" data-a="' + act + '" data-v="' + v + '" aria-pressed="' + on + '" style="min-height:62px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:6px 10px;text-align:left;display:flex;flex-direction:column;gap:2px;font:inherit;cursor:pointer"><b style="font-size:13px;font-weight:600">' + title + '</b><span style="font-size:11.5px;color:var(--c-muted)">' + sub + '</span>' + (extra || '') + '</button>'; };
          o += '<div style="position:absolute;left:84px;right:84px;bottom:12px;' + FN.card + ';border-radius:16px;padding:12px 16px;box-shadow:0 14px 36px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:9px;z-index:7">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:14px;font-weight:600">Equipment · from your catalogue and price list</b><span style="font-size:12px;color:var(--c-muted)">every choice recomputes yield, savings and incentives</span></div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(3,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Modules</span>' + FN.CAT.modules.map(function (m) { return pick('modw', m.w, st.modW === m.w, m.name, '$' + m.price + ' each · warranty ' + m.warranty + ' · ' + (E.n * m.w / 1000).toFixed(2) + ' kWp'); }).join('') + '</div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(3,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Inverter</span>' + FN.invChoices(siteKwp).map(function (x) { var r = siteKwp / x.kw, ok = r <= 1.33; return pick('inv', x.kw, st.inv === x.kw, x.name, '$' + x.price + ' · panels at ' + Math.round(r * 100) + ' %', '<span style="font-size:11px;font-weight:600;color:' + (ok ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (ok ? '✓ under the 133 % limit' : '✗ over the 133 % limit') + '</span>'); }).join('') + '</div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(5,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Battery</span>' + sizes.map(function (z, i) {
              var sv = FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: z, ev: J ? S.measures.ev : true }).total, pv0 = i ? FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: sizes[i - 1], ev: J ? S.measures.ev : true }).total : 0;
              return pick('bat', z, st.bat === z, z ? z + ' kWh' : 'None', z ? 'rebate ' + FN.money(FN.rebate(z)) + ' · saves ' + FN.money(sv) + '/yr' : 'saves ' + FN.money(sv) + '/yr', z ? '<span style="font-size:11px;color:' + (z > 14 ? 'var(--c-loss)' : 'var(--c-muted)') + '">+' + FN.money((sv - pv0) / (z - sizes[i - 1])) + '/yr per kWh</span>' : '');
            }).join('') + '</div>' +
            '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;padding-top:2px"><span style="color:' + (okRatio ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (okRatio ? '✓' : '✗') + ' DC/AC ' + ratio.toFixed(2) + '</span><span style="color:var(--c-gain)">✓ battery and inverter compatible (hybrid)</span><span style="color:var(--c-gain)">✓ CEC-listed</span><span style="color:var(--c-gain)">✓ VPP-capable: rebate eligible</span><span style="color:var(--c-muted)">export limit 5 kW · rebate tiers 14 · 28 · 50 kWh</span></div></div>';
        }
        if (st.sheet) {
          // the site's categories, read on the whole site: the household's zones count with the roof (D-73)
          var SC = FN.siteCats(J ? S : null, E.kwp, st.inv, st.zok), ZS = J ? S.zones || [] : [], nOk = ZS.filter(function (z, i) { return st.zok[i]; }).length;
          o += '<div style="position:absolute;left:84px;right:84px;top:64px;' + FN.card + ';border-radius:12px;padding:8px 14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px;z-index:7">' +
            '<b style="font-size:13px;font-weight:600">Site categories</b><span style="color:var(--c-muted)">' + SC.kwp.toFixed(2) + ' kWp summed over ' + (ZS.length ? 'the roof and ' + (ZS.length > 1 ? ZS.length + ' zones' : 'one zone') : 'the roof') + (nOk ? ' · ' + (nOk === ZS.length ? (nOk > 1 ? 'the zones are' : 'the zone is') : nOk + ' of ' + ZS.length + ' zones') + ' confirmed and priced with the roof' : '') + (SC.zones ? ' · ' + (nOk ? 'the others' : 'the zones') + ' (' + (SC.zones * SMKWC).toFixed(2) + ' kWp) are priced once checked on site and would need a ' + FN.invFor(SC.kwp) + ' kW inverter' : '') + '</span>' +
            [['Support', SC.support], ['Planning', SC.planning], ['Connection', SC.connection]].map(function (r) { return '<span style="display:flex;gap:6px;align-items:baseline;padding:3px 9px;border-radius:999px;background:var(--c-selSoft)"><span style="color:var(--c-muted)">' + r[0] + '</span><b style="font-weight:600;color:var(--c-sel)">' + r[1] + '</b></span>'; }).join('') +
            // each zone the household added, confirmed on site with one tap: it then joins the design and the offer
            (ZS.length ? '<span style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="color:var(--c-muted)">The household’s zones</span>' + ZS.map(function (z, i) { var on = !!st.zok[i], lock = !!S.proposal; return '<button type="button" data-a="zoneOk" data-v="' + i + '" aria-pressed="' + on + '"' + (lock ? ' disabled' : '') + ' style="min-height:30px;padding:0 10px;border-radius:8px;border:1px ' + (on ? 'solid var(--c-gain)' : 'dashed var(--c-sunText)') + ';background:' + (on ? 'var(--c-paper2)' : 'transparent') + ';color:' + (on ? 'var(--c-gain)' : 'var(--c-sunText)') + ';font:inherit;font-size:12px;cursor:' + (lock ? 'default' : 'pointer') + '">' + (z.k === 'carport' ? 'Carport' : 'Custom zone') + ' · ' + z.n + ' modules · ' + (on ? 'confirmed on site ✓' : 'confirm on site') + '</button>'; }).join('') + '</span>' : '') + '</div>';
        }
        if (st.present) {
          var vs = st.roof === 'flat' ? Object.keys(FN.RACKS).map(function (vv) {
            var s2 = {}; for (var k in st) s2[k] = st[k]; s2.flatMode = vv; s2.removed = []; s2.filled = true;
            return { v: vv, e: energy(s2), label: FN.RACKS[vv].en };
          }).sort(function (a5, b5) { return b5.e.save - a5.e.save; }) :
          ['mixed', 'portrait', 'landscape'].map(function (vv) {
            var s2 = {}; for (var k in st) s2[k] = st[k]; s2.variant = vv; s2.removed = []; s2.filled = true;
            return { v: vv, e: energy(s2), label: vv.charAt(0).toUpperCase() + vv.slice(1) };
          }).sort(function (a5, b5) { return b5.e.save - a5.e.save; });
          var curVar = st.roof === 'flat' ? rackMode(st) : st.variant;
          // with options in the proposal, Present shows them, face to face (D-71)
          var PO = J && S.options ? S.options : st.qopts.map(function (x) { return x.P; });
          o += '<div style="position:absolute;inset:0;background:var(--c-ground);display:flex;flex-direction:column;z-index:9"><div style="height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--c-paper);border-bottom:1px solid var(--c-line)"><b style="font-size:14px;font-weight:600">Your home · 14 Wattle Lane</b><span style="display:flex;gap:8px"><button type="button" data-a="unpresent" style="min-height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Back to design</button>' + (J ? (function (g) { return '<button type="button" data-a="mode" data-v="' + g.v + '" style="min-height:36px;padding:0 16px;border-radius:8px;' + gateStyle(g) + ';font:inherit;font-weight:600;cursor:pointer">' + g.l + '</button>'; })(gate(E)) : '') + '</span></div><div style="flex:1;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;padding:20px">' +
            '<div style="' + FN.card + ';border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px">' + (PO.length ? '<span style="font-size:13px;color:var(--c-muted)">The options of this proposal, on your own bill</span>' + PO.map(function (Q, k) { return '<div style="min-height:72px;border-radius:12px;border:1px solid var(--c-line);background:var(--c-paper2);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px"><span><b style="font-size:15px;font-weight:600">Option ' + 'ABC'[k] + ' · ' + FN.money(Q.total) + '</b><br><span style="font-size:12px;color:var(--c-muted)">' + FN.optLabel(Q) + '</span></span><b style="font-size:15px;font-weight:600;color:var(--c-gain);white-space:nowrap">' + FN.money(Q.save * 0.85) + '–' + FN.money(Q.save * 1.1) + '</b></div>'; }).join('') + '<span style="font-size:12px;color:var(--c-muted)">Add or change options in Proposal; the household signs one.</span></div>' : '<span style="font-size:13px;color:var(--c-muted)">Three layouts, ranked on your own bill</span>' + vs.map(function (x) { var on = curVar === x.v; return '<button type="button" data-a="pvariant" data-v="' + x.v + '" style="min-height:72px;border-radius:12px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:10px 14px;text-align:left;display:flex;justify-content:space-between;align-items:center;font:inherit;cursor:pointer"><span><b style="font-size:15px;font-weight:600">' + x.label + ' · ' + x.e.n + ' modules</b><br><span style="font-size:12px;color:var(--c-muted)">' + x.e.kwp.toFixed(2) + ' kWp · ' + FN.n(x.e.kwh) + ' kWh/yr</span></span><b style="font-size:15px;font-weight:600;color:var(--c-gain)">' + FN.money(x.e.save * 0.85) + '–' + FN.money(x.e.save * 1.1) + '</b></button>'; }).join('') + '</div>') +
            '<div style="' + FN.card + ';border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;color:var(--c-muted)">You save, a year</span><b style="font-size:38px;font-weight:600;color:var(--c-gain)">' + (st.filled ? FN.money(E.save * 0.85) + '–' + FN.money(E.save * 1.1) : '—') + '</b><span style="font-size:13px;color:var(--c-ink2)">With ' + E.kwp.toFixed(2) + ' kWp and a ' + (st.bat ? st.bat + ' kWh' : 'no') + ' battery.</span><b style="font-size:13px;font-weight:600;margin-top:8px">What it depends on</b><span style="font-size:13px;color:var(--c-ink2)">Sunshine year to year ±8 % · evening use ±10 % · plan prices · ' + (st.chimney ? mods(st).filter(function (m) { return m.shaded; }).length + ' modules in the chimney’s winter shade' : 'no obstacle drawn') + '</span><span style="font-size:11px;color:var(--c-muted);margin-top:auto">Indicative estimate. The signed proposal freezes these numbers with the engine version.</span></div></div></div>'; }
        if (J && st.mode === -1) o += inbox();
        if (J && st.mode === 3) o += proposal(E);
        return o;
      }
      function inbox() {
        var o = '<div style="position:absolute;inset:48px 0 0 0;background:var(--c-ground);z-index:8;padding:22px 28px;display:flex;flex-direction:column;gap:14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:24px;font-weight:600">Ready to design</b><span style="font-size:13px;color:var(--c-muted)">Sites shared with you by households · within 25 km</span></div>';
        if (!S.shared) return o + '<div style="' + FN.card + ';border-style:dashed;padding:40px;text-align:center;color:var(--c-muted);font-size:15px;line-height:1.6">No site yet.<br>When a household shares its home with you, it lands here with its roof, its needs and its draft.</div></div>';
        var P = S.profile, w = [];
        if (S.measures.bat) w.push('battery'); if (S.measures.ev) w.push('car'); if (S.measures.hp) w.push('heat pump');
        o += '<div style="' + FN.card + ';border-color:var(--c-sel);padding:16px 18px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 190px;gap:16px;align-items:center">' +
          '<span style="display:flex;flex-direction:column;gap:4px"><b style="font-size:17px;font-weight:600">14 Wattle Lane, Marrickville</b><span style="font-size:13px;color:var(--c-muted)">Shared with you by name · consent given ' + S.sharedAt + '</span></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">' + (S.site && S.site !== 'house' ? 'Site' : 'Roof') + '</span><b style="font-weight:600">' + (S.site && S.site !== 'house' ? { units: 'Apartment building', business: 'Business site', carpark: 'Car park', other: 'Another site' }[S.site] + ' · to design' : '3 faces confirmed · LiDAR 0.91') + '</b></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">Needs</span><b style="font-weight:600">15 kWh a day · ' + P.badge + ' (±' + P.unc + ' %)</b></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">Wants</span><b style="font-weight:600">solar' + (w.length ? ' + ' + w.join(' + ') : '') + ' · plan ' + (S.plan || 'Flat Rate') + '</b></span>' +
          '<button type="button" data-a="open" style="min-height:44px;padding:0 16px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:14px;font-weight:600;cursor:pointer">' + (S.signed ? 'Signed ✓' : S.proposal ? 'Proposal sent' : 'Open in studio') + '</button></div>';
        var V = FN.toVerify(S);
        if (V.length) o += '<div style="' + FN.card + ';padding:14px 18px;display:flex;flex-direction:column;gap:6px"><b style="font-size:14px;font-weight:600">To confirm on site</b><span style="font-size:12.5px;color:var(--c-muted)">Declared by the household from our drawing; each one becomes yours once you confirm it in the studio.</span>' +
          '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 24px">' + V.map(function (v) { return '<span style="display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--c-line2)"><span style="color:' + (v[2] ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + v[0] + '</span><b style="font-weight:600;text-align:right;color:' + (v[2] ? 'var(--c-loss)' : 'var(--c-ink)') + '">' + v[1] + '</b></span>'; }).join('') + '</div></div>';
        return o + '<span style="font-size:13px;color:var(--c-muted);line-height:1.5">You see the place and the needs as totals, never the meter readings, and never another installer’s proposal. The household’s draft design comes with the site.</span></div>';
      }
      function gate(E) {
        if (S && S.signed) return { k: 'done', l: 'Signed by the household' + (S.options && S.options.length > 1 ? ', option ' + 'ABC'[S.pick] : '') + ' ✓', v: 3 };
        if (S && S.proposal) return { k: 'done', l: 'Proposal sent ✓', v: 3 };
        if (!st.filled) return { k: 'todo', l: 'Fill a face first ›', v: 1 };
        if (!st.eqSeen) return { k: 'todo', l: 'Check the equipment ›', v: 2 };
        if (E.kwp / st.inv > 1.33) return { k: 'warn', l: 'Inverter too small: fix it ›', v: 2 };
        return { k: 'go', l: 'Make it a proposal ›', v: 3 };
      }
      function gateStyle(g) { return g.k === 'go' ? 'background:var(--c-live);color:var(--c-onLive);border:none' : g.k === 'done' ? 'background:var(--c-selSoft);color:var(--c-sel);border:none' : 'background:var(--c-paper2);color:' + (g.k === 'warn' ? 'var(--c-loss)' : 'var(--c-ink)') + ';border:1px solid ' + (g.k === 'warn' ? 'var(--c-loss)' : 'var(--c-line)'); }
      // the installer's quote, built from the design and reviewed one section at a time before it is sent
      var QNOTES = [['Access', 'side gate 1.1 m, ladder on the west side; dog kept inside on the day'], ['Spare tiles', 'six spare tiles in the garage, to replace any we crack'], ['Visit', 'the household is home on Tuesdays and Thursdays']];
      function quoteData(E) {
        var ms = mods(st).filter(function (m) { return st.filled && !m.blocked && !m.removed; }), notes = [];
        if (st.chimney) notes.push(['Chimney', 'brick, 0.60 × 0.60 m, ' + (parseFloat(st.chimH) || 1).toFixed(2) + ' m above the roof, ' + FN.draw.where(st.roof, st.cx, st.cy).ridge.toFixed(2) + ' m below the ridge; keep-out 0.30 m, round; it shades ' + ms.filter(function (m) { return m.shaded && st.shade; }).length + ' modules on winter mornings', true]);
        st.obs.forEach(function (o) { var T = FN.OBST[o.type], w0 = FN.draw.where(st.roof, o.x, o.y); notes.push([T.en, (T.shape ? 'Ø ' + (2 * T.a).toFixed(2) + ' m' : T.a.toFixed(2) + ' × ' + T.b.toFixed(2) + ' m') + ', ' + o.h.toFixed(2) + ' m high, ' + w0.ridge.toFixed(2) + ' m below the ridge; keep-out ' + T.margin.toFixed(2) + ' m, round', false]); });
        if (st.removed.length) notes.push(['Modules', st.removed.length + ' taken off the layout by hand, to clear a vent or a shaded corner', false]);
        notes.push(['Switchboard', 'circuit breakers with room for two more; no upgrade needed', false], ['Meter', 'smart meter, import and export; the network keeps it', false]);
        st.qnotes.forEach(function (i) { notes.push([QNOTES[i][0], QNOTES[i][1], false]); });
        return FN.offer({ site: S, n: E.n, nRoof: E.nRoof, zok: st.zok.slice(), zones: FN.zonesOk(S, st.zok).map(function (z) { return { k: z.k, n: z.n }; }), kwp: E.kwp, eff: E.eff, kwh: E.kwh, modW: st.modW, inv: st.inv, bat: st.bat, ev: S.measures.ev, hp: S.measures.hp, save: E.save, simKwp: E.kwh / FN.YIELD, rack: st.roof === 'flat' ? rackMode(st) : null, unc: S.profile.unc, badge: S.profile.badge, roof: st.roof, obstacles: obstaclesOf(st), mods: ms.map(function (m) { return { x: m.x, y: m.y, w: m.w, h: m.h }; }), chimney: st.chimney ? (parseFloat(st.chimH) || 1).toFixed(2) : 0, shaded: ms.filter(function (m) { return m.shaded && st.shade; }).length, notes: notes });
      }
      function proposal(E) {
        var P = quoteData(E), u = S.profile.unc, sent = !!S.proposal, i = FN.SECTIONS.map(function (x) { return x[0]; }).indexOf(st.qs), seen = Object.keys(st.qseen).length, N = FN.SECTIONS.length;
        st.qseen[st.qs] = true; seen = Object.keys(st.qseen).length; st.lastOffer = P;
        var o = '<div style="position:absolute;inset:48px 0 0 0;background:var(--c-ground);z-index:8;padding:16px 20px;display:grid;grid-template-columns:220px minmax(0,1fr) 270px;gap:14px">';
        // the sections, as a checklist: where you are, what you have reviewed
        o += '<div style="' + FN.card + ';padding:12px;display:flex;flex-direction:column;gap:3px"><span style="' + FN.kick + '">Quote Q-2026-0148</span><span style="font-size:12px;color:var(--c-ink2);margin-bottom:6px">Reviewed ' + seen + ' of ' + N + '</span><span style="height:4px;border-radius:2px;background:var(--c-line2);margin-bottom:8px"><span style="display:block;height:4px;border-radius:2px;width:' + (seen / N * 100) + '%;background:var(--c-sel)"></span></span>' +
          FN.SECTIONS.map(function (x, k) { var on = x[0] === st.qs, ok = st.qseen[x[0]]; return '<button type="button" data-a="qs" data-v="' + x[0] + '" style="display:flex;align-items:center;gap:8px;min-height:34px;padding:0 8px;border:none;border-radius:8px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12.5px;font-weight:' + (on ? 600 : 400) + ';text-align:left;cursor:pointer"><span style="width:18px;height:18px;flex:none;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10.5px;' + (ok ? 'background:var(--c-sel);color:var(--c-paper)' : 'border:1px solid var(--c-line);color:var(--c-muted)') + '">' + (ok ? '✓' : k + 1) + '</span>' + x[1] + '</button>'; }).join('') + '</div>';
        // one section at a time: its line first, its detail under it
        o += '<div style="' + FN.card + ';padding:14px 18px;display:flex;flex-direction:column;gap:6px;min-height:0"><span style="' + FN.kick + '">' + (i + 1) + ' of ' + N + ' · ' + FN.SECTIONS[i][1] + '</span><b style="font-size:16px;font-weight:600;line-height:1.35">' + FN.quoteLead(st.qs, P) + '</b>' +
          '<div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;padding-right:4px">' + FN.quoteSection(st.qs, P) +
          (st.qs === 'notes' ? '<span style="font-size:12px;color:var(--c-muted);margin-top:10px">Add what the household should know:</span><span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">' + QNOTES.map(function (n, k) { var on = st.qnotes.indexOf(k) >= 0; return '<button type="button" data-a="qnote" data-v="' + k + '" style="min-height:30px;padding:0 10px;border-radius:15px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + (on ? '✓ ' : '+ ') + n[0] + '</button>'; }).join('') + '</span>' : '') + '</div>' +
          '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--c-line2)"><button type="button" data-a="qprev"' + (i ? '' : ' disabled') + ' style="min-height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer;opacity:' + (i ? 1 : 0.4) + '">‹ Back</button>' + (i < N - 1 ? '<button type="button" data-a="qnext" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-weight:600;cursor:pointer">Next: ' + FN.SECTIONS[i + 1][1] + ' ›</button>' : '<span style="font-size:12.5px;color:var(--c-gain);align-self:center">Last section ✓</span>') + '</div></div>';
        // the options the proposal holds: the design as it stands, added; then another layout, equipment or battery (D-71)
        var key = FN.optLabel(P) + '|' + Math.round(P.total), has = st.qopts.some(function (x) { return x.key === key; });
        var qo = sent ? S.options : st.qopts, L = 'ABC';
        var optCard = '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:6px"><span style="display:flex;justify-content:space-between;align-items:baseline"><span style="' + FN.kick + '">Options in this proposal</span><span style="font-size:11.5px;color:var(--c-muted)">' + qo.length + ' of 3</span></span>' +
          qo.map(function (x, k) {
            var Q = x.P || x, signedHere = S.signed && S.pick === k;
            return '<span style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--c-line2)"><b style="width:20px;height:20px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;background:' + (signedHere ? 'var(--c-sel)' : 'var(--c-selSoft)') + ';color:' + (signedHere ? 'var(--c-paper)' : 'var(--c-sel)') + '">' + L[k] + '</b><span style="flex:1;min-width:0;line-height:1.3">' + FN.optLabel(Q) + '<br><span style="color:var(--c-muted)">' + FN.money(Q.total) + (signedHere ? ' · signed ✓' : '') + '</span></span>' + (sent ? '' : '<button type="button" data-a="qdel" data-v="' + k + '" aria-label="Remove option ' + L[k] + '" style="border:none;background:transparent;color:var(--c-muted);font:inherit;font-size:14px;cursor:pointer">×</button>') + '</span>';
          }).join('') +
          (sent ? '' : (has ? '<span style="font-size:11.5px;color:var(--c-gain)">This design is option ' + L[st.qopts.map(function (x) { return x.key; }).indexOf(key)] + '.</span>' : st.qopts.length < 3 ? '<button type="button" data-a="qadd" style="min-height:34px;border-radius:8px;border:1px dashed var(--c-sel);background:var(--c-paper2);color:var(--c-sel);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer">+ Add this design as option ' + L[st.qopts.length] + '</button>' : '<span style="font-size:11.5px;color:var(--c-muted)">Three options at most: remove one to add this design.</span>') +
          '<span style="font-size:11.5px;color:var(--c-muted);line-height:1.4">' + (st.qopts.length ? 'Change the layout, the equipment or the battery, then add the next. The household compares them and signs one.' : 'With none added, the proposal holds this design alone.') + '</span>') + '</div>';
        // what matters to send it: the number, the state, the files
        o += '<div style="display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto">' + optCard + '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:4px"><span style="font-size:12px;color:var(--c-muted)">The household pays</span><b style="font-size:24px;font-weight:600">' + FN.money(P.total) + '</b><span style="font-size:12px;color:var(--c-gain);font-weight:600">saves ' + FN.money(E.save * (1 - u / 100)) + '–' + FN.money(E.save * (1 + u / 100)) + ' a year</span><span style="font-size:11.5px;color:var(--c-muted)">' + P.kwp.toFixed(2) + ' kWp' + (st.bat ? ' + ' + st.bat + ' kWh' : '') + ' · valid 7 days</span></div>' +
          (function (g) { var ok = (g.k === 'go' && seen === N) || g.k === 'done', l = S.signed ? 'Signed by the household' + (S.options && S.options.length > 1 ? ', option ' + 'ABC'[S.pick] : '') + ' ✓' : sent ? 'Sent · on the household’s site' : g.k !== 'go' ? g.l : seen < N ? 'Review every section · ' + seen + ' of ' + N : 'Send to the household'; return '<button type="button" data-a="' + (ok ? 'send' : g.k !== 'go' ? 'mode' : 'qnext') + '" data-v="' + g.v + '" style="min-height:46px;border-radius:10px;' + gateStyle(ok || g.k === 'done' ? g : { k: 'todo' }) + ';font:inherit;font-size:14px;font-weight:600;cursor:pointer">' + l + '</button>' + (ok || sent ? '' : '<span style="font-size:11.5px;color:var(--c-muted);text-align:center;line-height:1.4">' + (g.v === 2 ? 'The household sees every line: check the equipment first.' : g.v === 1 ? 'Fill a face to price the modules.' : 'The household reads it section by section; so do you, once, before it goes.') + '</span>'); })(gate(E)) +
          FN.exportsCard('installer') + '</div></div>';
        return o;
      }
      function circuitsSvg() {
        var px = function (p) { return (518 + p[0] * 40).toFixed(1) + ' ' + (356 + p[2] * 40).toFixed(1); }, o = '', P = S.eqPos || FN.EQPOS(S), ok = S.ok || {}, HW = FN.home(S).W;
        var bad = {}; FN.checks(S).forEach(function (c) { if (c.bad) bad[c.k] = true; });
        // the blocks the roof plan does not show (a garage), schematic, declared by the household with its footprint
        FN.home(S).D.bodies.forEach(function (b) {
          if (b[5] === 'main') return;
          var x = 518 + b[0] * 40, y = 356 + b[1] * 40, w = (b[2] - b[0]) * 40, h = (b[3] - b[1]) * 40;
          o += '<g pointer-events="none"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="var(--c-roof)" fill-opacity=".55" stroke="' + (st.fid ? SMF.declared : 'var(--c-roofLine)') + '" stroke-width="' + (st.fid ? 3 : 1.5) + '" stroke-dasharray="8 5"></rect>' +
            '<text x="' + (x + w / 2) + '" y="' + (y + 28) + '" text-anchor="middle" font-size="12" fill="var(--c-muted)">Garage, flat roof (schematic)</text></g>';
        });
        if (st.circ) FN.wires(S).forEach(function (w) { o += '<path d="M' + w.pts.map(px).join(' L') + '" fill="none" stroke="' + w.color + '" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"></path>'; });
        if (st.fid) o += '<path d="M211 149 H825 V563 H211 Z" fill="none" stroke="' + SMF.measured + '" stroke-width="3" pointer-events="none"></path>';
        Object.keys(FN.EQD).forEach(function (k) {
          if (!FN.eqOn(S, k)) return;
          var d = FN.EQD[k], wl = HW[P[k].w], c = smAt(HW, P[k].w, P[k].s, 0.35, 0), l = smAt(HW, P[k].w, P[k].s, 1.1, 0);
          var cx = 518 + c[0] * 40, cy = 356 + c[2] * 40, rot = Math.atan2(wl.dz, wl.dx) * 180 / Math.PI, conf = !!ok[k];
          var col = bad[k] ? 'var(--c-loss)' : st.fid ? (conf ? SMF.measured : SMF.declared) : '#3D4650';
          o += '<g data-a="eqOk" data-v="' + k + '" style="cursor:pointer"><rect x="' + (cx - d.W * 20) + '" y="' + (cy - 6) + '" width="' + d.W * 40 + '" height="12" rx="2" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + col + '" stroke="#FFFFFF" stroke-width="1.5"' + (conf ? '' : ' stroke-dasharray="3 2"') + '></rect>' +
            '<text x="' + (518 + l[0] * 40) + '" y="' + (356 + l[2] * 40 + 4) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + col + '" stroke="var(--c-paper)" stroke-width="3" paint-order="stroke">' + d.n + (conf ? ' ✓' : '') + '</text></g>';
        });
        if (st.fid) o += '<g pointer-events="none"><rect x="211" y="112" width="320" height="22" rx="6" fill="var(--c-paper)" stroke="var(--c-line)"></rect>' + [[SMF.measured, 'measured or confirmed', 225], [SMF.declared, 'declared by the household', 363]].map(function (q) { return '<rect x="' + q[2] + '" y="118" width="10" height="10" rx="2" fill="' + q[0] + '"></rect><text x="' + (q[2] + 15) + '" y="127" font-size="11" fill="var(--c-ink2)">' + q[1] + '</text>'; }).join('') + '</g>';
        return o;
      }
      function place3d() {
        placeBox3d();
        if (H) { H.setHome(J && S ? S.home : 'rect'); H.setRoof(st.roof, st.vtx);
          H.setPanels(((st.filled || st.preview) && st.mods) ? mods(st).filter(function (m) { return !m.blocked && !m.removed; }).map(function (m) { return { x: m.x, y: m.y, w: m.w, h: m.h, tilt: m.tilt, mode: m.mode, facing: m.facing, shaded: m.shaded && st.shade }; }) : []);
          H.setObstacles(obstaclesOf(st)); H.bat.visible = st.bat > 0;
          // the household's units where it put them, its cables with the Circuits layer, its carport
          if (J && S && S.measures && S.opened) {
            var P3 = S.eqPos || FN.EQPOS(S); Object.keys(P3).forEach(function (k) { H.placeEq(k, P3[k]); });
            H.hp.visible = !!S.measures.hp; H.car.visible = !!S.measures.ev; H.carport.visible = !!S.measures.solar && (S.zones || []).some(function (z) { return z.k === 'carport'; });
            H.setCables(st.circ ? FN.wires(S) : []);
          }
          H.setHour(st.hour3); }
      }
      // the 3D box and its controls, then its size and camera unless only the box moves (a drag)
      function placeBox3d(boxOnly) {
        var b = q('.sd-3d'), c3 = q('.sd-3d-ctrl'), v = st.pos.v3;
        if (st.swapped) b.setAttribute('style', 'position:absolute;left:0;top:48px;width:1180px;height:772px;z-index:2;overflow:hidden;background:var(--c-canvas)');
        else b.setAttribute('style', 'position:absolute;left:' + (v[0] + 1) + 'px;top:' + (v[1] + 41) + 'px;width:328px;height:210px;z-index:5;overflow:hidden;background:var(--c-canvas)');
        if (c3) {
          c3.setAttribute('style', 'position:absolute;' + (st.swapped ? 'left:664px;bottom:10px' : 'right:8px;bottom:8px') + ';display:flex;gap:4px;z-index:3;' + FN.card + ';padding:3px;border-radius:9px;box-shadow:0 4px 14px rgba(29,32,38,.10)');
          c3.innerHTML = '<button type="button" data-a="proj3" title="Switch isometric and perspective" style="min-height:26px;padding:0 8px;border-radius:6px;border:1px solid var(--c-sel);background:var(--c-selSoft);color:var(--c-sel);font:inherit;font-size:11px;font-weight:600;cursor:pointer">' + (st.iso ? 'Iso' : 'Persp') + '</button>' +
            '<button type="button" data-a="turn3" aria-label="Turn 90 degrees" title="Snap 90° around the four isometric corners" style="min-height:26px;padding:0 8px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:11px;cursor:pointer">↻ 90°</button>';
        }
        if (H && !boxOnly) { H.useIso = st.iso && !st.present; H.size(st.swapped ? 1180 : 328, st.swapped ? 772 : 210); H.radius = st.swapped ? 34 : 38; H.place(); }
      }
      function render() { if (J) (S.zones || []).forEach(function (z, i) { z.ok = !!st.zok[i]; }); q('.sd-top').innerHTML = top(); q('.sd-plan').innerHTML = plan(); q('.sd-ui').innerHTML = ui(); place3d(); }
      // dragging bars and cards by their grip, in screen pixels whatever the scale
      var drag = null;
      el.addEventListener('pointerdown', function (e) { var g = e.target.closest('[data-grip]'); if (!g) return; var k = g.getAttribute('data-grip'), s = el.getBoundingClientRect().width / 1180; drag = { k: k, x: e.clientX, y: e.clientY, o: st.pos[k].slice(), s: s }; e.preventDefault(); });
      // a card follows the pointer once a frame; the plan and the scene do not change while it moves
      var dragFrame = 0;
      window.addEventListener('pointermove', function (e) {
        if (!drag) return;
        st.pos[drag.k] = [Math.max(0, Math.min(1120, drag.o[0] + (e.clientX - drag.x) / drag.s)), Math.max(48, Math.min(780, drag.o[1] + (e.clientY - drag.y) / drag.s))];
        if (!dragFrame) dragFrame = requestAnimationFrame(function () { dragFrame = 0; q('.sd-ui').innerHTML = ui(); placeBox3d(true); });
      });
      window.addEventListener('pointerup', function () { drag = null; });
      var vtxDrag = null;
      el.addEventListener('pointerdown', function (e) {
        var vt = e.target.closest('[data-vtx]');
        if (vt) {
          var idx = +vt.getAttribute('data-vtx'), v0 = vertsOf(st);
          st.selVtx = idx;
          vtxDrag = { idx: idx, v0: v0.map(function (p) { return p.slice(); }), moved: false };
          e.preventDefault(); e.stopPropagation();
          render();
          return;
        }
        var t = e.target.closest('[data-obs]'); if (!t) return;
        var id = t.getAttribute('data-obs'), o = obstaclesOf(st).filter(function (x) { return x.id === id; })[0]; if (!o) return;
        st.drag = { id: id, x0: o.x, y0: o.y, moved: false }; st.selObs = id; e.preventDefault(); e.stopPropagation();
      });
      window.addEventListener('pointermove', function (e) {
        if (vtxDrag) {
          var ptV = snapCad(planXY(e), e.altKey || !st.snapOn), vn = vertsOf(st).map(function (p) { return p.slice(); });
          vn[vtxDrag.idx] = [Math.max(160, Math.min(880, ptV[0])), Math.max(120, Math.min(420, ptV[1]))];
          st.vtx = vn; vtxDrag.moved = true;
          q('.sd-plan').innerHTML = plan(); q('.sd-ui').innerHTML = ui(); place3d();
          return;
        }
        if (!st.drag) return;
        var pt = planXY(e), sn = FN.draw.snap(st.roof, pt[0], pt[1], e.altKey || !st.snapOn);
        if (!FN.draw.inside(vertsOf(st), sn.x, sn.y)) return;
        setObs(st.drag.id, sn.x, sn.y); st.guides = sn; st.drag.moved = true;
        q('.sd-plan').innerHTML = plan(); q('.sd-ui').innerHTML = ui(); place3d();
      });
      window.addEventListener('pointerup', function () {
        if (vtxDrag) {
          var vd = vtxDrag; vtxDrag = null;
          if (!vd.moved) return;
          var vNew = st.vtx.map(function (p) { return p.slice(); });
          st.vtx = vd.v0;
          commit({ vtx: vNew }, 'Vertex #' + (vd.idx + 1) + ' adjusted');
          return;
        }
        if (!st.drag) return;
        var d = st.drag, o = obstaclesOf(st).filter(function (x) { return x.id === d.id; })[0]; st.drag = null; st.guides = null;
        if (!d.moved || !o) { render(); return; }
        var nx = o.x, ny = o.y, w0 = FN.draw.where(st.roof, nx, ny), patch = {};
        setObs(d.id, d.x0, d.y0);
        if (d.id === 'chim') { patch.cx = nx; patch.cy = ny; } else patch.obs = st.obs.map(function (x) { return x.id === d.id ? { id: x.id, type: x.type, x: nx, y: ny, h: x.h } : x; });
        commit(patch, FN.OBST[o.type].en + ' moved · ' + w0.ridge.toFixed(2) + ' m to the ridge');
      });
      el.addEventListener('dblclick', function (e) { var g = e.target.closest('[data-grip]'); if (!g) return; var k = g.getAttribute('data-grip'); if (k === 'v3') st.swapped = !st.swapped; else st.pos[k] = HOME[k].slice(); render(); });
      el.addEventListener('pointerover', function (e) { var b = e.target.closest('[data-tip]'); if (!b) return; var p = b.getAttribute('data-tip').split('|'), base = st.pos[p[1]], nx = p[1] === 'notes' ? base[0] - 272 : base[0] + 70, ny = base[1] + 16 + (+p[2]) * 48; if (p[1] === 'tools' && nx < st.pos.read[0] + 640 && ny < st.pos.read[1] + 66) ny = st.pos.read[1] + 68; if (!st.hover || st.hover.k !== p[0]) { st.hover = { k: p[0], x: nx, y: ny }; q('.sd-ui').innerHTML = ui(); } });
      el.addEventListener('pointerout', function (e) { var b = e.target.closest('[data-tip]'); if (b && !b.contains(e.relatedTarget)) { st.hover = null; q('.sd-ui').innerHTML = ui(); } });
      // the plan point under a pointer event, in the plan's px (40 px a metre), inverted for zoom & pan
      function planXY(e) {
        var b = el.getBoundingClientRect(), k = b.width / 1180;
        var sx = (e.clientX - b.left) / k, sy = (e.clientY - b.top) / k - 48;
        return [st.panX + sx / st.zoom - 30, st.panY + sy / st.zoom - 100];
      }
      function planScreen(x, y) {
        return [Math.round((x + 30 - st.panX) * st.zoom), Math.round((y + 100 - st.panY) * st.zoom + 48)];
      }
      // magnetic CAD snap to roof vertices (for Dimension / Trace / Measure) or 0.25 m grid
      function snapCad(pt, free) {
        if (free) { var pFree = [pt[0], pt[1]]; pFree.kind = 'free'; return pFree; }
        var vn = vertsOf(st), verts = vn.concat([[218, 356], [818, 356], [218, 556], [818, 556]]);
        for (var i = 0; i < verts.length; i++) {
          if (Math.hypot(pt[0] - verts[i][0], pt[1] - verts[i][1]) < 14) { var pv = verts[i].slice(); pv.kind = 'vertex'; return pv; }
        }
        var pg = [Math.round(pt[0] / 10) * 10, Math.round(pt[1] / 10) * 10]; pg.kind = 'grid';
        return pg;
      }
      function polyArea(pts) {
        var a = 0;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]);
        return Math.abs(a) / 2 / 1600;
      }
      function toastMsg(msg) {
        st.toast = msg; clearTimeout(tToast);
        tToast = setTimeout(function () { st.toast = ''; render(); }, 1800);
      }
      // CAD wheel zoom (anchored at the cursor) & Space + drag / middle-click pan on the 2D plan
      var pan2 = null, hoverIn = false;
      var KEYMAP = { KeyV: 'select', KeyA: 'vertex', KeyP: 'trace', KeyR: 'rect3', KeyF: 'fill', KeyG: 'panel', KeyO: 'chimney', KeyM: 'measure', KeyD: 'dimension', KeyN: 'note', KeyI: 'photo', KeyL: 'layers', KeyH: 'pan', KeyS: 'snap', KeyZ: 'zoom' };
      var OBKEYS = ['chimney', 'skylight', 'antenna', 'box', 'vent', 'prism'];
      el.addEventListener('pointerenter', function () { hoverIn = true; });
      el.addEventListener('pointerleave', function () { hoverIn = false; st.space = false; if (H) H.space = false; q('.sd-plan').style.cursor = ''; });
      window.addEventListener('keydown', function (e) {
        if (!hoverIn || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
          e.preventDefault();
          if (e.shiftKey) el.querySelector('[data-a="redo"]').click();
          else el.querySelector('[data-a="undo"]').click();
          return;
        }
        if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); st.zoom = 1; st.panX = 0; st.panY = 0; toastMsg('Fitted roof to view · ⇧1'); render(); return; }
        if (e.code === 'Space') { st.space = true; if (H) H.space = true; if (!pan2) q('.sd-plan').style.cursor = 'grab'; e.preventDefault(); return; }
        if (e.code === 'Escape') { st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = ''; st.lastMeas = null; st.selPin = ''; st.selObs = ''; st.preview = false; render(); return; }
        if (e.code === 'Backspace' || e.code === 'Delete') {
          if ((st.tool === 'trace' || st.tool === 'rect3') && st.pts.length) {
            if (st.dynField === 0 && st.dynLen) st.dynLen = st.dynLen.slice(0, -1);
            else if (st.dynField === 1 && st.dynAng) st.dynAng = st.dynAng.slice(0, -1);
            else st.pts.pop();
            e.preventDefault(); render(); return;
          }
          if (st.selObs) { e.preventDefault(); var dl = st.selObs; if (dl === 'chim') commit({ chimney: false, selObs: '' }, 'Chimney removed'); else commit({ obs: st.obs.filter(function (o) { return o.id !== dl; }), selObs: '' }, 'Obstacle removed'); return; }
          if (st.selPin) { e.preventDefault(); commit({ pins: st.pins.filter(function (p) { return p.id !== st.selPin; }), selPin: '' }, 'Annotation removed'); return; }
        }
        // Dynamic input while tracing or drawing a 3-point rectangle (fig-6.svg: Type value)
        if ((st.tool === 'trace' || st.tool === 'rect3') && st.pts.length) {
          if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            if (st.dynField === 0) st.dynLen = (st.dynLen + e.key).slice(0, 5);
            else st.dynAng = (st.dynAng + e.key).slice(0, 4);
            e.preventDefault(); q('.sd-plan').innerHTML = plan(); return;
          }
          if (e.key === 'Tab') { st.dynField = st.dynField ? 0 : 1; e.preventDefault(); q('.sd-plan').innerHTML = plan(); return; }
          if (e.key === 'Enter' && (st.dynLen || st.dynAng)) {
            e.preventDefault();
            var pLast = st.pts[st.pts.length - 1], cp0 = st.curPt || [pLast[0] + 80, pLast[1]];
            var defL = Math.hypot(cp0[0] - pLast[0], cp0[1] - pLast[1]) / 40, defA = Math.atan2(-(cp0[1] - pLast[1]), cp0[0] - pLast[0]);
            var useL = (parseFloat(st.dynLen) || defL) * 40, useA = st.dynAng !== '' ? (parseFloat(st.dynAng) * Math.PI / 180) : defA;
            var nxP = [pLast[0] + Math.cos(useA) * useL, pLast[1] - Math.sin(useA) * useL];
            st.pts.push(nxP); st.dynLen = ''; st.dynAng = ''; st.dynField = 0;
            render(); return;
          }
        }
        // Obstacle shape keys 1-6 when Obstacle tool is active
        if (st.tool === 'chimney' && e.key >= '1' && e.key <= '6') {
          st.otype = OBKEYS[+e.key - 1]; render(); return;
        }
        var tk = KEYMAP[e.code];
        if (tk && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (tk === 'layers') { st.layers = !st.layers; st.settings = false; st.notif = false; }
          else if (tk === 'snap') { st.snapOn = !st.snapOn; toastMsg('Magnetic snaps ' + (st.snapOn ? 'ON · S' : 'OFF · S')); }
          else if (tk === 'zoom') { st.zoom = st.zoom < 1.4 ? 1.5 : 1; st.panX = 0; st.panY = 0; }
          else { st.tool = tk; st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = ''; st.preview = false; st.selFace = false; st.pad = false; }
          st.hover = null; render();
        }
      });
      window.addEventListener('keyup', function (e) {
        if (e.code !== 'Space') return;
        st.space = false; if (H) H.space = false; if (!pan2) q('.sd-plan').style.cursor = st.tool === 'pan' ? 'grab' : '';
      });
      q('.sd-plan').addEventListener('wheel', function (e) {
        e.preventDefault();
        var b = el.getBoundingClientRect(), k = b.width / 1180;
        var sx = (e.clientX - b.left) / k, sy = (e.clientY - b.top) / k - 48;
        var z0 = st.zoom, z1 = Math.max(0.6, Math.min(2.6, Math.round(z0 * (e.deltaY > 0 ? 0.9 : 1.11) * 100) / 100));
        if (z1 === z0) return;
        st.panX = Math.max(-450, Math.min(650, st.panX + sx / z0 - sx / z1));
        st.panY = Math.max(-350, Math.min(500, st.panY + sy / z0 - sy / z1));
        st.zoom = z1;
        q('.sd-plan').innerHTML = plan(); q('.sd-ui').innerHTML = ui();
      }, { passive: false });
      q('.sd-plan').addEventListener('pointerdown', function (e) {
        if (!st.space && st.tool !== 'pan' && e.button !== 1) return;
        var b = el.getBoundingClientRect(), k = b.width / 1180;
        pan2 = { x: e.clientX, y: e.clientY, px: st.panX, py: st.panY, k: k };
        q('.sd-plan').style.cursor = 'grabbing';
        e.preventDefault(); e.stopPropagation();
      }, true);
      q('.sd-plan').addEventListener('pointermove', function (e) {
        if (pan2 || st.drag || vtxDrag) return;
        if (['trace', 'rect3', 'measure', 'dimension'].indexOf(st.tool) < 0) return;
        st.curPt = snapCad(planXY(e), e.altKey || !st.snapOn);
        q('.sd-plan').innerHTML = plan();
      });
      q('.sd-plan').addEventListener('click', function (e) {
        if (pan2 || st.drag || vtxDrag || e.target.closest('[data-obs],[data-vtx],[data-a="zdel"],[data-a="ddel"],[data-a="pin"],[data-a="vadd"],[data-a="north"]')) return;
        if (['trace', 'rect3', 'measure', 'dimension', 'note', 'photo'].indexOf(st.tool) < 0) return;
        var pt = snapCad(planXY(e), e.altKey || !st.snapOn), R = FN.ROOFS[st.roof], cPitch = Math.cos(R.pitch * Math.PI / 180);
        if (st.tool === 'note' || st.tool === 'photo') {
          var pid = 'p' + (st.pins.length + 1) + '-' + Math.round(pt[0]), now = '14:0' + (2 + (st.pins.length % 7));
          var np = { id: pid, kind: st.tool, x: pt[0], y: pt[1], time: now, text: st.tool === 'photo' ? 'North slope tiles & flashing inspected · clear for rail brackets.' : 'Rafter spacing 600 mm · check tile hook clearance.' };
          commit({ pins: st.pins.concat([np]), selPin: pid, notesOn: true }, (st.tool === 'photo' ? 'Survey photo' : 'Field note') + ' pinned');
          return;
        }
        if (st.tool === 'measure' || st.tool === 'dimension') {
          if (!st.pts.length) { st.pts = [pt]; st.curPt = pt; st.lastMeas = null; render(); return; }
          var p0 = st.pts[0], dPlan = Math.hypot(pt[0] - p0[0], pt[1] - p0[1]) / 40, dSlope = Math.hypot((pt[0] - p0[0]) / 40, (pt[1] - p0[1]) / 40 / cPitch);
          if (dPlan < 0.05) return;
          st.pts = []; st.curPt = null;
          if (st.tool === 'measure') {
            st.lastMeas = { id: 'm-' + Math.round(pt[0]), a: p0, b: pt, plan: dPlan, slope: dSlope, kind: 'measure' };
            render(); return;
          }
          var nd = { id: 'd' + (st.dims.length + 1) + '-' + Math.round(pt[0]), a: p0, b: pt, plan: dPlan, slope: dSlope, kind: 'dimension' };
          commit({ dims: st.dims.concat([nd]), notesOn: true }, 'Dimension: ' + dSlope.toFixed(2) + ' m', { t: 'Dimension pinned', b: 'Plan ' + dPlan.toFixed(2) + ' m · slope ' + dSlope.toFixed(2) + ' m', c: 'var(--c-ink)', x: Math.min(920, Math.round((p0[0] + pt[0]) / 2 + 50)), y: Math.round((p0[1] + pt[1]) / 2 + 120) });
          return;
        }
        if (st.tool === 'trace') {
          if (st.pts.length >= 3 && Math.hypot(pt[0] - st.pts[0][0], pt[1] - st.pts[0][1]) < 18) {
            var zp = st.pts.slice(), ar = polyArea(zp) / cPitch, zid = 'z' + (st.zones.length + 1);
            st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = '';
            commit({ zones: st.zones.concat([{ id: zid, pts: zp, label: 'Zone ' + ar.toFixed(1) + ' m²' }]), filled: true }, 'Traced zone · ' + ar.toFixed(1) + ' m²', { t: 'Zone closed (' + zp.length + ' vertices)', b: 'True area ' + ar.toFixed(1) + ' m² · setbacks 0.40 m', c: 'var(--c-sel)', x: 440, y: 240 });
            return;
          }
          st.pts.push(pt); st.curPt = pt; st.dynLen = ''; st.dynAng = ''; render(); return;
        }
        if (st.tool === 'rect3') {
          if (st.pts.length < 2) { st.pts.push(pt); st.curPt = pt; st.dynLen = ''; st.dynAng = ''; render(); return; }
          var r0 = st.pts[0], r1 = st.pts[1], ux = r1[0] - r0[0], uy = r1[1] - r0[1], uL = Math.hypot(ux, uy) || 1, nx2 = -uy / uL, ny2 = ux / uL;
          var hDist = (pt[0] - r1[0]) * nx2 + (pt[1] - r1[1]) * ny2;
          if (Math.abs(hDist) < 6) hDist = 80;
          var r2 = [r1[0] + nx2 * hDist, r1[1] + ny2 * hDist], r3 = [r0[0] + nx2 * hDist, r0[1] + ny2 * hDist];
          var wM = uL / 40, hM = Math.abs(hDist) / 40 / cPitch, zid2 = 'z' + (st.zones.length + 1);
          st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = '';
          commit({ zones: st.zones.concat([{ id: zid2, pts: [r0, r1, r2, r3], label: wM.toFixed(1) + '×' + hM.toFixed(1) + ' m' }]), filled: true }, 'Rectangle ' + wM.toFixed(2) + ' × ' + hM.toFixed(2) + ' m', { t: 'Rectangle 3 pts closed', b: wM.toFixed(2) + ' × ' + hM.toFixed(2) + ' m (' + (wM * hM).toFixed(1) + ' m²)', c: 'var(--c-sel)', x: 440, y: 240 });
        }
      });
      window.addEventListener('pointermove', function (e) {
        if (!pan2) return;
        st.panX = Math.max(-450, Math.min(650, pan2.px - (e.clientX - pan2.x) / (pan2.k * st.zoom)));
        st.panY = Math.max(-350, Math.min(500, pan2.py - (e.clientY - pan2.y) / (pan2.k * st.zoom)));
        q('.sd-plan').innerHTML = plan();
      });
      window.addEventListener('pointerup', function () {
        if (!pan2) return;
        pan2 = null; q('.sd-plan').style.cursor = (st.space || st.tool === 'pan') ? 'grab' : '';
      });
      function setObs(id, x, y) { if (id === 'chim') { st.cx = x; st.cy = y; } else st.obs = st.obs.map(function (o) { return o.id === id ? { id: o.id, type: o.type, x: x, y: y, h: o.h } : o; }); }
      FN.wire(el, function (a, v, e) {
        // with the obstacle tool, a tap on a module places on the face under it
        if (a === 'mod' && st.tool === 'chimney') { a = 'face'; v = 'N'; }
        if (a === 'tool') {
          touch();
          if (v === 'layers') { st.layers = !st.layers; st.settings = false; st.notif = false; }
          else {
            if (v === 'panel' && !st.filled) toastMsg('Fill a face first (F), or click Keep to edit modules');
            st.tool = v; st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = ''; st.preview = false; st.selFace = false; st.pad = false;
            q('.sd-plan').style.cursor = v === 'pan' ? 'grab' : '';
          }
          st.hover = null; check();
        }
        else if (a === 'face') {
          if (['trace', 'rect3', 'measure', 'dimension', 'note', 'photo'].indexOf(st.tool) >= 0) return;
          if (v !== 'N') { st.selObs = ''; render(); return; }
          if (st.tool === 'chimney') { var pt = e && e.clientX !== undefined ? planXY(e) : [520, 198];
            if (!FN.draw.inside(vertsOf(st), pt[0], pt[1])) return;
            if (st.otype === 'chimney') { if (!st.chimney) commit({ chimney: true, pad: true, fresh: true, cx: pt[0], cy: pt[1], selObs: 'chim' }, 'Chimney added', { t: 'Chimney added', b: 'Type its height on the pad', c: 'var(--c-ink)', x: pt[0] + 70, y: pt[1] + 148 }); else { st.selObs = 'chim'; render(); } return; }
            var nid = 'o' + (st.obs.length + 1) + '-' + Math.round(pt[0]); commit({ obs: st.obs.concat([{ id: nid, type: st.otype, x: pt[0], y: pt[1], h: FN.OBST[st.otype].h }]), selObs: nid }, FN.OBST[st.otype].en + ' added', { t: FN.OBST[st.otype].en + ' added', b: 'Keep-out ' + FN.OBST[st.otype].margin.toFixed(2) + ' m, round', c: 'var(--c-ink)', x: pt[0] + 70, y: pt[1] + 148 }); return; }
          st.selObs = ''; touch(); if (st.tool === 'fill') st.preview = true; else if (st.tool === 'select') st.selFace = !st.selFace; check(); }
        else if (a === 'vadd') {
          var vi = +v, vn0 = vertsOf(st).map(function (p) { return p.slice(); }), pA = vn0[vi], pB = vn0[(vi + 1) % vn0.length];
          vn0.splice(vi + 1, 0, [(pA[0] + pB[0]) / 2, (pA[1] + pB[1]) / 2]);
          st.selVtx = vi + 1;
          commit({ vtx: vn0 }, 'Edge split · vertex #' + (vi + 2) + ' added'); return;
        }
        else if (a === 'vnudge') {
          var dxy = v.split(',').map(Number), vn1 = vertsOf(st).map(function (p) { return p.slice(); }), si = st.selVtx % vn1.length;
          vn1[si] = [vn1[si][0] + dxy[0], vn1[si][1] + dxy[1]];
          commit({ vtx: vn1 }, 'Vertex #' + (si + 1) + ' nudged 5 cm'); return;
        }
        else if (a === 'vsquare') {
          var vn2 = vertsOf(st).map(function (p) { return p.slice(); }), si2 = st.selVtx % vn2.length, prev = vn2[(si2 + vn2.length - 1) % vn2.length];
          if (Math.abs(vn2[si2][0] - prev[0]) < Math.abs(vn2[si2][1] - prev[1])) vn2[si2][0] = prev[0]; else vn2[si2][1] = prev[1];
          commit({ vtx: vn2 }, 'Corner #' + (si2 + 1) + ' squared to 90°'); return;
        }
        else if (a === 'vreset') { commit({ vtx: null, selVtx: 0 }, 'North face vertices reset'); return; }
        else if (a === 'zclose') {
          if (st.pts.length < 3) return;
          var zp2 = st.pts.slice(), ar2 = polyArea(zp2) / Math.cos(FN.ROOFS[st.roof].pitch * Math.PI / 180), zid3 = 'z' + (st.zones.length + 1);
          st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = '';
          commit({ zones: st.zones.concat([{ id: zid3, pts: zp2, label: 'Zone ' + ar2.toFixed(1) + ' m²' }]), filled: true }, 'Traced zone · ' + ar2.toFixed(1) + ' m²'); return;
        }
        else if (a === 'zundo') { st.pts.pop(); if (!st.pts.length) st.curPt = null; }
        else if (a === 'zcancel') { st.pts = []; st.curPt = null; st.dynLen = ''; st.dynAng = ''; st.lastMeas = null; }
        else if (a === 'zdel') { commit({ zones: st.zones.filter(function (z) { return z.id !== v; }) }, 'Traced zone removed'); return; }
        else if (a === 'mkeep') {
          if (!st.lastMeas) return;
          var m0 = st.lastMeas, nd2 = { id: 'd' + (st.dims.length + 1), a: m0.a, b: m0.b, plan: m0.plan, slope: m0.slope, kind: 'dimension' };
          st.lastMeas = null;
          commit({ dims: st.dims.concat([nd2]), notesOn: true }, 'Measure kept as dimension · ' + m0.slope.toFixed(2) + ' m'); return;
        }
        else if (a === 'ddel') { commit({ dims: st.dims.filter(function (d) { return d.id !== v; }) }, 'Dimension removed'); return; }
        else if (a === 'pin') { st.selPin = st.selPin === v ? '' : v; }
        else if (a === 'pclose') { st.selPin = ''; }
        else if (a === 'pnote') { st.pins = st.pins.map(function (p) { return p.id === st.selPin ? { id: p.id, kind: p.kind, x: p.x, y: p.y, time: p.time, text: v } : p; }); }
        else if (a === 'pdel') { var dp = st.selPin; commit({ pins: st.pins.filter(function (p) { return p.id !== dp; }), selPin: '' }, 'Annotation removed'); return; }
        else if (a === 'setback') { FN.SETBACK = FN.SETBACK < 0.45 ? 0.5 : 0.4; toastMsg('Eave & hip setbacks: ' + FN.SETBACK.toFixed(2) + ' m'); }
        else if (a === 'clearface') { commit({ filled: false, preview: false, removed: [], zones: [], selFace: false }, 'North face layout cleared'); return; }
        else if (a === 'variant') { touch(); st.variant = v; }
        else if (a === 'otype') st.otype = v;
        else if (a === 'oclose') st.selObs = '';
        else if (a === 'odel') { var dl = st.selObs; if (dl === 'chim') commit({ chimney: false, selObs: '' }, 'Chimney removed'); else commit({ obs: st.obs.filter(function (o) { return o.id !== dl; }), selObs: '' }, 'Obstacle removed'); return; }
        else if (a === 'oh') { st.obs = st.obs.map(function (o) { return o.id === st.selObs ? { id: o.id, type: o.type, x: o.x, y: o.y, h: Math.max(0, Math.round((o.h + +v) * 10) / 10) } : o; }); }
        else if (a === 'ochange') { commit({ obs: st.obs.map(function (o) { return o.id === st.selObs ? { id: o.id, type: v, x: o.x, y: o.y, h: FN.OBST[v].h } : o; }) }, 'Obstacle: ' + FN.OBST[v].en); return; }
        else if (a === 'roof') {
          if (v === st.roof) return;
          commit({ roof: v, removed: [], obs: [], chimney: false, selObs: '', vtx: null }, 'Roof type: ' + FN.ROOFS[v].en, { t: FN.ROOFS[v].en + ' roof', b: FN.ROOFS[v].say, c: 'var(--c-ink)', x: 560, y: 250 });
          if (J) { S.roof = v; if (opts.onChange) opts.onChange(); }
          return;
        }
        else if (a === 'flatMode') {
          commit({ flatMode: v }, 'Rack layout: ' + FN.RACKS[v].en);
          if (J) { S.flatMode = v; if (opts.onChange) opts.onChange(); }
          return;
        }
        else if (a === 'flatRule') {
          commit({ flatRule: v }, 'Solstice window: ' + FN.RULES[v][0]);
          if (J) { S.flatRule = v; if (opts.onChange) opts.onChange(); }
          return;
        }
        else if (a === 'keep') { commit({ filled: true, preview: false }, 'Zone filled · ' + st.variant, { t: 'Zone filled', b: 'Setbacks 0.40 m from eaves and hips', c: 'var(--c-gain)', x: 420, y: 250 }); return; }
        else if (a === 'mod') { if (st.tool !== 'panel' || !st.filled) return; var r = st.removed.slice(), i = r.indexOf(v), was = i >= 0; if (was) r.splice(i, 1); else r.push(v);
          var m = mods(st).filter(function (x) { return x.id === v; })[0]; commit({ removed: r }, was ? 'Module added' : 'Module removed', { t: was ? '+1 module' : '−1 module', b: (was ? '+' : '−') + '0.44 kWp', c: was ? 'var(--c-gain)' : 'var(--c-loss)', x: Math.round(m.x + 30 + m.w + 8), y: m.y + 148 }); return; }
        else if (a === 'pad') { touch(); st.pad = true; st.fresh = true; }
        else if (a === 'key') { if (v === '✓') { var hv = (parseFloat(st.chimH) || 1).toFixed(2); commit({ pad: false, chimH: hv }, 'Chimney height ' + hv + ' m', { t: 'Chimney ' + hv + ' m', b: 'Winter shade recomputed', c: 'var(--c-loss)', x: 560, y: 250 }); return; } touch(); st.chimH = ((st.fresh ? '' : st.chimH) + v).slice(0, 4); st.fresh = false; }
        else if (a === 'sheet') { touch(); st.sheet = !st.sheet; st.mode = 2; st.eqSeen = true; }
        else if (a === 'qs') st.qs = v;
        else if (a === 'qnext' || a === 'qprev') { var ks = FN.SECTIONS.map(function (x) { return x[0]; }), qi = ks.indexOf(st.qs); if (a === 'qnext') { var nx = ks.filter(function (k) { return !st.qseen[k]; })[0]; st.qs = qi < ks.length - 1 ? ks[qi + 1] : nx || st.qs; } else if (qi > 0) st.qs = ks[qi - 1]; }
        else if (a === 'qnote') { var ni = st.qnotes.indexOf(+v); if (ni >= 0) st.qnotes.splice(ni, 1); else st.qnotes.push(+v); }
        else if (a === 'export') { if (st.lastOffer) FN.exportQuote(v, st.lastOffer); return; }
        else if (a === 'bat') { commit({ bat: +v }, 'Battery ' + (+v ? v + ' kWh' : 'removed')); return; }
        else if (a === 'modw') { commit({ modW: +v }, 'Modules ' + v + ' W'); return; }
        else if (a === 'inv') { commit({ inv: +v }, 'Inverter ' + v + ' kW'); return; }
        else if (a === 'mode') { if (J && !S.shared && +v !== -1) return; st.mode = +v; st.present = false; if (+v === 2) st.eqSeen = true; st.sheet = +v === 2; if (J && +v === 1) S.opened = true; }
        else if (a === 'open') { if (!S.opened) { st.roof = S.roof || 'hip'; if (S.roof === 'flat') { st.flatMode = S.flatMode || null; st.flatRule = S.flatRule || FN.PACK.rule; } st.inv = FN.invFor(S.kwp || 7.04); } if (S.proposal) { st.mode = 3; } else { st.mode = 1; if (!S.opened) st.bat = S.measures.bat ? 13.5 : 0; S.opened = true; } if (opts.onChange) opts.onChange(); }
        else if (a === 'send') { if (!S.proposal && st.lastOffer) { S.options = st.qopts.length ? st.qopts.map(function (x) { return x.P; }) : [st.lastOffer]; S.pick = 0; S.proposal = S.options[0]; if (opts.onChange) opts.onChange(); } }
        else if (a === 'qadd') { if (st.lastOffer && st.qopts.length < 3) { var P1 = st.lastOffer; st.qopts.push({ P: P1, key: FN.optLabel(P1) + '|' + Math.round(P1.total) }); } }
        else if (a === 'qdel') { st.qopts.splice(+v, 1); }
        else if (a === 'present') { touch(); st.present = true; st.sheet = false; st.notif = false; st.settings = false; check(); }
        else if (a === 'unpresent') st.present = false;
        else if (a === 'pvariant') {
          if (st.roof === 'flat') { st.flatMode = v; if (J) S.flatMode = v; }
          else st.variant = v;
          st.removed = [];
        }
        else if (a === 'notif') { st.notif = !st.notif; st.settings = false; st.layers = false; }
        else if (a === 'settings') { st.settings = !st.settings; st.notif = false; st.layers = false; }
        else if (a === 'level') st.level = +v;
        else if (a === 'layer') st[v] = !st[v];
        // a zone the household added, confirmed on site: its modules join the design, the inverter is sized on the total
        else if (a === 'zoneOk') {
          if (!J || S.proposal || !S.zones[+v]) return;
          var zk = st.zok.slice(), Zc = S.zones[+v], nx = {}; zk[+v] = !zk[+v]; for (var k3 in st) nx[k3] = st[k3]; nx.zok = zk;
          var Ez = energy(nx), iv = FN.invFor(Ez.kwp), zl = Zc.k === 'carport' ? 'Carport' : 'Custom zone';
          commit({ zok: zk, inv: iv }, zl + (zk[+v] ? ' confirmed on site' : ' back to declared'), { t: zl + (zk[+v] ? ' confirmed on site' : ' back to declared'), b: (zk[+v] ? '+' : '−') + Zc.n + ' modules · ' + Ez.kwp.toFixed(2) + ' kWp · inverter ' + iv + ' kW, sized on the total', c: zk[+v] ? 'var(--c-gain)' : 'var(--c-muted)', x: 440, y: 190 }); return;
        }
        else if (a === 'eqOk') { S.ok = S.ok || {}; S.ok[v] = !S.ok[v]; if (opts.onChange) opts.onChange(); }
        else if (a === 'grid') st.grid = v;
        else if (a === 'fit') { st.zoom = 1; st.panX = 0; st.panY = 0; toastMsg('Fitted roof to view · ⇧1'); }
        else if (a === 'north') { st.zoom = 1; st.panX = 0; st.panY = 0; if (H) H.turnTo(-Math.PI * 0.75); toastMsg('North aligned up · 0°'); }
        else if (a === 'snap') { st.snapOn = !st.snapOn; toastMsg('Magnetic snaps ' + (st.snapOn ? 'ON · S' : 'OFF · S')); }
        else if (a === 'zoom') {
          if (+v === 0) { st.zoom = 1; st.panX = 0; st.panY = 0; }
          else {
            var z0 = st.zoom, z1 = Math.max(0.6, Math.min(2.6, Math.round(z0 * (+v > 0 ? 1.2 : 1 / 1.2) * 100) / 100));
            st.panX = Math.max(-450, Math.min(650, st.panX + 590 / z0 - 590 / z1));
            st.panY = Math.max(-350, Math.min(500, st.panY + 386 / z0 - 386 / z1));
            st.zoom = z1;
          }
        }
        else if (a === 'reset') { st.pos = JSON.parse(JSON.stringify(HOME)); st.zoom = 1; st.panX = 0; st.panY = 0; }
        else if (a === 'hour3') st.hour3 = +v;
        else if (a === 'swap') { st.swapped = !st.swapped; st.chOpen = false; }
        else if (a === 'chopen') st.chOpen = !st.chOpen;
        else if (a === 'proj3') st.iso = !st.iso;
        else if (a === 'turn3') {
          if (H) {
            var q = Math.PI / 2, k = Math.round((H.theta - Math.PI / 4) / q);
            H.turnTo(Math.PI / 4 + (k + 1) * q);
          }
          return;
        }
        else if (a === 'undo') {
          if (!st.hist.length) return;
          var curSnap = JSON.stringify({ filled: st.filled, variant: st.variant, flatMode: st.flatMode, flatRule: st.flatRule, chimney: st.chimney, chimH: st.chimH, removed: st.removed, bat: st.bat, roof: st.roof, cx: st.cx, cy: st.cy, obs: st.obs, zones: st.zones, dims: st.dims, pins: st.pins, vtx: st.vtx, zok: st.zok });
          var last = st.hist.pop(), sn = JSON.parse(last.snap);
          st.rhist.push({ snap: curSnap, label: last.label, logItem: st.log[0] });
          for (var k in sn) st[k] = sn[k];
          st.log.shift(); toastMsg('Undone: ' + last.label); st.chip = null; st.pad = false; st.preview = false;
        }
        else if (a === 'redo') {
          if (!st.rhist.length) return;
          var curSnap2 = JSON.stringify({ filled: st.filled, variant: st.variant, flatMode: st.flatMode, flatRule: st.flatRule, chimney: st.chimney, chimH: st.chimH, removed: st.removed, bat: st.bat, roof: st.roof, cx: st.cx, cy: st.cy, obs: st.obs, zones: st.zones, dims: st.dims, pins: st.pins, vtx: st.vtx, zok: st.zok });
          var nxt = st.rhist.pop(), sn2 = JSON.parse(nxt.snap);
          st.hist.push({ snap: curSnap2, label: nxt.label });
          for (var k2 in sn2) st[k2] = sn2[k2];
          if (nxt.logItem) st.log.unshift(nxt.logItem);
          toastMsg('Redone: ' + nxt.label); st.chip = null; st.pad = false; st.preview = false;
        }
        render();
      });
      render();
      FN.three(q('.sd-canvas'), function (h3) {
        H = h3; H.theta = -Math.PI * 0.75; H.useIso = st.iso;
        H.onTap = function (pt) {
          if (!st.swapped) return;
          if (!FN.draw.inside(vertsOf(st), pt[0], pt[1])) return;
          if (st.tool === 'chimney') {
            if (st.otype === 'chimney') {
              if (!st.chimney) commit({ chimney: true, pad: true, fresh: true, cx: pt[0], cy: pt[1], selObs: 'chim' }, 'Chimney added', { t: 'Chimney added', b: 'Type its height on the pad', c: 'var(--c-ink)', x: 520, y: 240 });
              else { st.selObs = 'chim'; render(); }
              return;
            }
            var nid = 'o' + (st.obs.length + 1) + '-' + Math.round(pt[0]);
            commit({ obs: st.obs.concat([{ id: nid, type: st.otype, x: pt[0], y: pt[1], h: FN.OBST[st.otype].h }]), selObs: nid }, FN.OBST[st.otype].en + ' added', { t: FN.OBST[st.otype].en + ' added', b: 'Keep-out ' + FN.OBST[st.otype].margin.toFixed(2) + ' m, round', c: 'var(--c-ink)', x: 520, y: 240 });
          } else if (st.tool === 'fill') {
            st.selObs = ''; touch(); st.preview = true; check(); render();
          } else if (st.tool === 'panel' && st.filled) {
            var hitM = mods(st).filter(function (m) { return pt[0] >= m.x && pt[0] <= m.x + m.w && pt[1] >= m.y && pt[1] <= m.y + m.h; })[0];
            if (hitM) {
              var r = st.removed.slice(), i = r.indexOf(hitM.id), was = i >= 0;
              if (was) r.splice(i, 1); else r.push(hitM.id);
              commit({ removed: r }, was ? 'Module added' : 'Module removed', { t: was ? '+1 module' : '−1 module', b: (was ? '+' : '−') + '0.44 kWp', c: was ? 'var(--c-gain)' : 'var(--c-loss)', x: 520, y: 240 });
            }
          } else if (st.tool === 'select') {
            var nearO = obstaclesOf(st).filter(function (o) { return Math.hypot(pt[0] - o.x, pt[1] - o.y) < 28; })[0];
            if (nearO) { st.selObs = nearO.id; render(); }
            else { st.selObs = ''; st.selFace = !st.selFace; render(); }
          } else if (st.tool === 'note' || st.tool === 'photo') {
            var pid = 'p' + (st.pins.length + 1) + '-' + Math.round(pt[0]), now = '14:0' + (2 + (st.pins.length % 7));
            var np = { id: pid, kind: st.tool, x: pt[0], y: pt[1], time: now, text: st.tool === 'photo' ? 'North slope tiles & flashing inspected · clear for rail brackets.' : 'Rafter spacing 600 mm · check tile hook clearance.' };
            commit({ pins: st.pins.concat([np]), selPin: pid, notesOn: true }, (st.tool === 'photo' ? 'Survey photo' : 'Field note') + ' pinned');
          }
        };
        render();
      });
      FN.draw.load(function () { render(); });
      if (opts.api) opts.api.render = function () { if (J && !S.shared) st.mode = -1; render(); };
    })();
  };
  all('figure.bk-widget[data-widget="studio"]').forEach(function (fig) {
    FN.when(fig, function () { FN.studio(FN.frame(fig, 1180, 820), {}); });
  });
  /* ---------- widget: the journey, two screens and one site (design/funnels) ---------- */
  // The household's screen and the installer's screen, each in its device, joined by the site
  // they share: the household moves step by step (plan, profile, roof, next move, share), the
  // site lands in the installer's inbox, the installer designs and sends a proposal, and the
  // proposal comes back to the household, who compares and signs. Intention prototype.

  // two screens in one figure, each in its device, with the hand-over between them
  FN.frames = function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), fr = FN.isFr(fig), focus = -1;
    if (svg) svg.style.display = 'none';
    var lab = fr ? ['Écran du ménage', 'Écran de l’installateur'] : ['The household’s screen', 'The installer’s screen'];
    var view = fr ? ['Les deux', 'Ménage', 'Installateur'] : ['Both', 'Household', 'Installer'];
    var pane = function (i) { return '<div class="bk-jn-pane"><p class="bk-jn-lab">' + lab[i] + '</p>' + FN.devBox(fr) + '</div>'; };
    out.innerHTML = '<div class="bk-fw-bar"><span class="bk-fw-say">' + (fr ? 'Prototype d’intention · deux écrans du produit australien, reliés par le site' : 'Intention prototype · two screens of the Australian product, joined by the site') + '</span><span class="bk-fw-act">' +
      '<span class="bk-fw-seg bk-jn-view" role="group" aria-label="' + (fr ? 'Écrans affichés' : 'Screens shown') + '">' + view.map(function (t, i) { return '<button type="button" data-v="' + (i - 1) + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + t + '</button>'; }).join('') + '</span>' +
      FN.devBar(fr) + FN.paletteBar(fr) + '<button type="button" class="bk-fw-big">' + (fr ? 'Agrandir' : 'Enlarge') + '</button></span></div>' +
      '<div class="bk-jn-row">' + pane(0) + '<div class="bk-jn-band"></div>' + pane(1) + '</div>';
    var row = out.querySelector('.bk-jn-row'), band = out.querySelector('.bk-jn-band'), panes = all('.bk-jn-pane', out), stages = all('.bk-fw-stage', out), dvs = all('.bk-dv', out), screens = all('.bk-fw-screen', out), views = all('.bk-jn-view button', out);
    screens.forEach(function (s) { s.style.width = '1180px'; s.style.height = '820px'; });
    FN.wirePalette(out);
    // each stage shrinks to its device, so that labels, screens and band stay together, centred
    function size(i, W, H) { stages[i].style.width = W + 'px'; FN.fitDev(dvs[i], W, H); stages[i].style.height = (dvs[i].offsetHeight + (parseFloat(getComputedStyle(dvs[i]).marginBottom) || 0)) + 'px'; }
    // enlarged: side by side when that gives the larger screens, one above the other otherwise,
    // or one screen alone; every size fills the window without scrolling
    function fit() {
      var open = fig.classList.contains('bk-fw-open'), alone = open && focus >= 0;
      panes.forEach(function (p, i) { p.hidden = alone && i !== focus; });
      band.hidden = alone;
      views.forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-v') === focus ? 'true' : 'false'); });
      if (!open) {
        row.className = 'bk-jn-row';
        panes.forEach(function (p, i) { var W = p.clientWidth; if (!W) return; var H = FN.pageH(W, 1180, 820); stages[i].style.width = ''; stages[i].style.height = H + 'px'; FN.fitDev(dvs[i], W, H); });
        return;
      }
      var k = Math.max(focus, 0), W = row.clientWidth, Hh = row.clientHeight, L = stages[k].getBoundingClientRect().top - panes[k].getBoundingClientRect().top, g = 16;
      if (!W) return;
      if (alone) { row.className = 'bk-jn-row one'; size(focus, W, Hh - L); return; }
      var B = band.offsetHeight + 12, c = FN.devChrome(dvs[0]);
      var side = Math.min(((W - g) / 2 - c.x) / 1180, (Hh - B - L - c.y) / 820), stacked = Math.min((W - c.x) / 1180, ((Hh - B) / 2 - L - c.y) / 820);
      if (side >= stacked) { row.className = 'bk-jn-row side'; size(0, (W - g) / 2, Hh - B - L); size(1, (W - g) / 2, Hh - B - L); }
      else { row.className = 'bk-jn-row stacked'; size(0, W, (Hh - B) / 2 - L); size(1, W, (Hh - B) / 2 - L); }
    }
    FN.wireDev(out, fit);
    FN.enlarger(fig, out.querySelector('.bk-fw-big'), fr, fit, function () { focus = -1; });
    views.forEach(function (b) { b.addEventListener('click', function () { focus = +b.getAttribute('data-v'); fit(); }); });
    function paint() { screens.forEach(function (s) { s.setAttribute('style', s.getAttribute('style').replace(/--c-[^;]*;?/g, '') + ';' + FN.vars(FN.tokens())); }); fit(); }
    window.addEventListener('sd-palette', paint); paint();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(row);
    return { a: screens[0], b: screens[1], band: band, fr: fr };
  };

  /* the household's screen: one app, six steps that carry their data forward */
  FN.household = function (el, S, changed) {
    var STEPS = ['Your energy', 'Your roof', 'Next move', 'Share', 'Proposal'];
    var st = { qs: 'cover', qseen: {}, qopen: false, step: 0, chosen: '', prof: { meter: false, bill: false, ans: {}, q: false, consent: false, busy: '' }, conf: { N: false, W: false, E: false }, tool: 'confirm', preview: false, siteSel: 'house', hour: 15, top: false, next: 1, max: 0, seen: false, bell: false }, H = null, timer = null, tBusy = null;
    el.innerHTML = '<div style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden"><div class="hh-top"></div><div class="hh-prog" style="position:absolute;left:12px;right:12px;top:60px;height:84px"></div><div class="hh-body" style="position:absolute;left:0;right:0;top:144px;bottom:64px"></div>' +
      '<div class="hh-3d" style="position:absolute;left:384px;top:190px;width:784px;height:486px;display:none;overflow:hidden;border-radius:14px 14px 0 0;background:var(--c-canvas)"><canvas class="hh-canvas" width="784" height="486" aria-label="Your home in 3D: drag to turn around it" style="width:784px;height:486px;display:block;touch-action:none;cursor:grab"></canvas></div>' +
      '<div class="hh-note"></div><div class="hh-foot" style="position:absolute;left:0;right:0;bottom:0;height:64px;background:var(--c-paper);border-top:1px solid var(--c-line);display:flex;align-items:center;gap:12px;padding:0 16px"></div></div>';
    var q = function (c) { return el.querySelector(c); };
    var cost = function (name) { var p = FN.PLANS.filter(function (x) { return x.name === name; })[0], d = FN.base(15), e = 0; for (var h = 0; h < 24; h++) e += d[h] * p.rate(h); return (e + p.supply) * 365; };
    function unc() { var P = st.prof, u = 30; [['people', 6], ['home', 4], ['hvac', 4], ['hw', 4], ['cook', 1], ['pool', 2], ['have', 1]].forEach(function (k) { if (P.ans[k[0]] !== undefined) u -= k[1]; }); if (P.bill) u = Math.min(u, 12); if (P.meter) u = 5; return u; }
    function badge() { return st.prof.meter ? 'Measured' : st.prof.bill ? 'From your bills' : 'Estimated'; }
    function filled() { return S.measures.solar; }
    // a flat roof's rack variants, most energy first, and the one the household has (the first until it picks, D-70)
    function racksOf() { return FN.draw.rackVariants([], FN.PACK.rule); }
    function rackOf() { return S.flatMode || racksOf()[0].id; }
    // the north face's layout for the household's roof type, from studio-draw (or its fallback)
    function fillOf() { return S.roof === 'flat' ? FN.draw.compute('flat', [], null, { mode: rackOf(), rule: FN.PACK.rule }) : FN.draw.compute(S.roof || 'hip', [], 'portrait'); }
    // the zones the household adds to its roof: a carport over the driveway, or a custom zone it marks;
    // the capacity is summed over the whole site, which is what the categories read (D-73)
    var ZONES = { carport: { name: 'Carport over the driveway', n: 8, why: 'a new structure: building approval, and its own engineering' }, custom: { name: 'Custom zone', n: 6, why: 'not checked against the rules until an installer confirms it' } };
    function zonesN() { return (S.zones || []).reduce(function (a, z) { return a + z.n; }, 0); }
    function hasZone(k) { return (S.zones || []).some(function (z) { return z.k === k; }); }
    function modsOf() { return (S.measures.solar ? fillOf().n : 0) + zonesN(); }
    function kwpOf() { return S.measures.solar && S.kwp ? S.kwp + zonesN() * SMKWC : fillOf().n * SMKWC; }
    // the kWp FN.sim needs: on racks, each variant's yield per kWp (chapter 6) instead of FN.sim's own
    function simKwp(kwp) { return S.roof === 'flat' ? kwp * FN.RACKS[rackOf()].yield / FN.YIELD : kwp; }
    function opt(m) { return { plan: m.plan ? 'best' : 'flat', kwp: m.solar ? simKwp(kwpOf()) : 0, cap: m.bat ? 13.5 : 0, ev: m.ev, hp: m.hp }; }
    function done(i) { return [!!st.chosen, filled() || handed(), st.max > 2, S.shared, S.signed][i]; }
    // a site that is not a house goes from its type straight to Share, for an installer to design (D-74)
    function handed() { return !!S.site && S.site !== 'house'; }
    function reach(i) { for (var k = 0; k < i; k++) if (!done(k)) return false; return i < 4 || !!S.proposal; }
    function P0() { var P = S.proposal; return P ? P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + ' · ' + FN.money(P.total) : ''; }
    function sync() { S.profile = { badge: badge(), unc: unc() }; S.plan = st.chosen; }
    // step 1 · plan: the horizon of the whole journey, the household's day on each plan, its bill read back, its roof already seen
    var OFFERS = {
      'Flat Rate': { who: 'Retailer A · your retailer', chips: ['36 c/kWh all day', '110 c/day supply'], line: 'Your plan today: every kWh at the same price.', terms: 'no exit fee' },
      'Simple Saver': { who: 'Retailer B', chips: ['31 c/kWh all day', '115 c/day supply'], line: 'Same habits, 5 c less on every kWh.', terms: 'no exit fee · price held 12 months' },
      'Time of Use Saver': { who: 'Retailer C', chips: ['52 c 3–9 pm', '30 c day', '22 c night', '105 c/day supply'], line: 'Your 5–9 pm peak falls in the 52 c hours: it costs more unless you shift it.', terms: 'no exit fee · smart meter needed' }
    };
    // the project card, at the head of every step: where the household is, what it can still gain, and the one
    // next gain, with its effort and its reason in the household's own numbers; a drop-down gives every move
    var SEG = [['plan', 'Plan', 'plan', 0], ['solar', 'Solar', 'pv', 1], ['bat', 'Battery', 'battery', 2], ['ev', 'Electric car', 'car', 2], ['hp', 'Heat pump', 'heat', 2]];
    function scenario() {
      var cur = cost('Flat Rate'), best = Math.min(cost('Simple Saver'), cost('Time of Use Saver'), cur), T = FN.TODAY(), first = cur - (st.chosen ? cost(st.chosen) : best);
      var o = { plan: 'best' }, prev = T - first, out = [{ k: 'plan', d: first, on: !!st.chosen && first > 1 }], add = { solar: { kwp: kwpOf() }, bat: { cap: 13.5 }, ev: { ev: true }, hp: { hp: true } };
      SEG.slice(1).forEach(function (g) { for (var k in add[g[0]]) o[k] = add[g[0]][k]; var t = FN.sim(o).total; out.push({ k: g[0], d: prev - t, on: !!S.measures[g[0]] }); prev = t; });
      var won = out.filter(function (x) { return x.on; }).reduce(function (a, x) { return a + Math.max(x.d, 0); }, 0);
      return { T: T, left: prev, won: won, now: T - won, open: out.filter(function (x) { return !x.on; }).reduce(function (a, x) { return a + Math.max(x.d, 0); }, 0), segs: out };
    }
    function share(a, b) { var d = FN.base(15), t = 0; for (var h = a; h < b; h++) t += d[h]; return t; }
    // the one next gain: the step it belongs to, what it brings, what it costs in effort, and why for this home
    function nextGain(C) {
      var s = st.step, seg = function (k) { return C.segs.filter(function (x) { return x.k === k; })[0]; };
      var bestPlan = ['Simple Saver', 'Time of Use Saver'].sort(function (a, b) { return cost(a) - cost(b); })[0];
      if (!st.chosen) return { t: 'Switch to ' + bestPlan, g: '−' + FN.money(cost('Flat Rate') - cost(bestPlan)) + ' a year', e: '2 minutes, nothing to install', why: 'every kWh costs 5 c less, and nothing changes at home', act: 'plan', v: bestPlan, lab: 'Choose it' };
      if (!known() && s === 0) return { t: 'Add your bill', g: 'your own ranking, ±12 % instead of ±30 %', e: 'one photo', why: 'plans are priced on when you use energy, and only your bill or meter knows', act: 'src', v: 'bill', lab: 'Add a photo' };
      if (!S.measures.solar) return { t: 'Your roof', g: 'about −' + FN.money(seg('solar').d) + ' a year', e: '3 touches', why: Math.round(share(7, 17) / 15 * 100) + ' % of your use falls when the sun shines, and your ' + (S.roof === 'flat' ? 'roof' : 'north face') + ' takes ' + fillOf().n + ' modules', act: s === 1 ? '' : 'go', v: 1, lab: 'Go there ›', here: 'confirm the faces, then fill the north face' };
      var left = ['bat', 'ev', 'hp'].filter(function (k) { return !S.measures[k]; }).map(function (k) { var d = seg(k).d; return { k: k, d: d, pay: d > 0 ? INFO[k][2] / d : 99 }; }).filter(function (m) { return m.pay < 15; }).sort(function (a, b) { return a.pay - b.pay; });
      if (left.length && !S.shared) {
        var m = left[0], why = { bat: share(17, 23).toFixed(1) + ' kWh of your day falls between 5 and 11 pm, after the sun', ev: 'your petrol costs about $2,044 a year, and the car would charge at noon on your own solar', hp: 'your gas hot water costs $520 a year; a heat pump heats it at noon on solar' }[m.k];
        return { t: INFO[m.k][1], g: 'about −' + FN.money(m.d) + ' a year', e: FN.money(INFO[m.k][2]) + (m.k === 'bat' ? ' after the rebate' : '') + ', pays back in about ' + Math.round(m.pay) + ' years', why: why, act: s === 2 ? 'move' : 'go', v: s === 2 ? m.k : 2, lab: s === 2 ? 'Add it' : 'Go there ›' };
      }
      if (!S.shared) return { t: 'Share your project', g: 'a real quote on your own roof', e: 'you choose who sees it', why: 'an installer starts from your roof and your draft, not from a phone call', act: s === 3 ? '' : 'go', v: 3, lab: 'Go there ›', here: 'name who receives it, then share' };
      if (!S.proposal) return { t: 'Installer 1 is designing', g: 'its proposal comes back to step 5', e: 'nothing to do', why: 'it adds what the survey finds, then prices the equipment', act: '', v: 0 };
      if (!S.signed) { var gap = S.proposal.save - (FN.TODAY() - FN.sim(opt(S.measures)).total); return { t: 'Read the proposal', g: '−' + FN.money(S.proposal.save) + ' a year promised', e: (S.options && S.options.length > 1 ? S.options.length + ' options, ' : '') + '9 short sections', why: Math.abs(gap) < 60 ? 'it matches our independent estimate' : 'it differs from our estimate by ' + FN.money(gap) + ', and step 5 says why', act: s === 4 ? '' : 'go', v: 4, lab: 'Open it ›', here: 'read it section by section, then sign' }; }
      return { t: 'Signed', g: '−' + FN.money(S.proposal.save) + ' a year promised', e: 'done', why: 'after installation, this card will put what your meter measures beside what was promised', act: '', v: 0 };
    }
    function progressCard() {
      var C = scenario(), u = unc(), N = nextGain(C), pct = function (v) { return (Math.max(v, 0) / C.T * 100).toFixed(2) + '%'; }, hatch = 'repeating-linear-gradient(135deg,var(--c-selSoft) 0 6px,var(--c-paper2) 6px 10px)';
      var bar = C.segs.map(function (x, i) {
        var g = SEG[i], fl = st.flash === x.k;
        return '<button type="button" data-a="' + (x.on ? 'spend' : 'go') + '" data-v="' + (x.on ? '' : g[3]) + '"' + (x.on || reach(g[3]) ? '' : ' disabled') + ' title="' + g[1] + ': ' + (x.on ? 'decided, ' : 'possible, ') + '−' + FN.money(x.d) + ' a year" style="width:' + pct(x.d) + ';border:none;padding:0;height:100%;border-left:' + (i ? '2px solid var(--c-paper)' : 'none') + ';background:' + (x.on ? 'var(--c-gain)' : hatch) + ';display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;' + (fl ? 'box-shadow:inset 0 0 0 2px var(--c-live)' : '') + '">' + (x.d / C.T > 0.07 ? FN.icon(g[2], x.on ? 'var(--c-paper)' : 'var(--c-sel)') : '') + '</button>';
      }).join('') + '<span style="flex:1;min-width:46px;border-left:2px solid var(--c-paper);background:var(--c-line);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center">' + FN.money(C.left) + '</span>';
      return '<div style="' + FN.card + ';height:100%;box-sizing:border-box;padding:9px 14px;display:flex;flex-direction:column;gap:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13px;white-space:nowrap"><span><span style="' + FN.kick + ';margin-right:8px">Your project</span>' + (known() ? 'You spend' : 'A home like yours spends about') + ' <b>' + FN.money(C.T) + '</b>' + (C.won > 1 ? ' → <b>' + FN.money(C.now) + '</b> a year · <b style="color:var(--c-gain)">already −' + FN.money(C.won) + '</b>' : ' a year') + '</span>' +
        '<button type="button" data-a="spend" aria-expanded="' + !!st.spendOpen + '" style="border:none;background:transparent;padding:0;font:inherit;font-size:12.5px;color:var(--c-ink2);cursor:pointer">still possible: up to <b style="color:var(--c-gain)">−' + FN.money(C.open) + '</b> · ±' + u + ' % <b style="color:var(--c-sel)">' + (st.spendOpen ? 'Hide ▴' : 'Every move ▾') + '</b></button></div>' +
        '<div style="display:flex;height:14px;border-radius:5px;overflow:hidden;border:1px solid var(--c-line)">' + bar + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;font-size:12.5px;min-width:0"><span style="color:var(--c-sel);font-weight:700">➜</span><span title="' + (N.t + ' · ' + N.g + ' · ' + N.e + ' · because ' + N.why).replace(/"/g, '') + '" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>' + N.t + '</b> · <b style="color:var(--c-gain)">' + N.g + '</b> · ' + N.e + ' · <span style="color:var(--c-ink2)">because ' + N.why + '</span></span>' +
        (N.act ? '<button type="button" data-a="' + N.act + '" data-v="' + N.v + '" style="flex:none;min-height:28px;padding:0 12px;border-radius:7px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-size:12px;font-weight:600;cursor:pointer">' + N.lab + '</button>' : N.here ? '<span style="flex:none;font-size:12px;color:var(--c-sel);font-weight:600">on this step: ' + N.here + '</span>' : '') + '</div></div>';
    }
    // the drop-down: every move with its gain, its cost and its payback, what is not worth it, and how it is computed
    function progressPanel() {
      var C = scenario(), u = unc() / 100, cell = 'display:grid;grid-template-columns:24px minmax(0,1.4fr) 90px 130px 110px 90px;gap:10px;align-items:center';
      var tou = cost('Time of Use Saver') - cost('Flat Rate');
      return '<div style="position:absolute;left:12px;right:12px;top:148px;' + FN.card + ';box-shadow:0 14px 34px rgba(29,32,38,.16);z-index:9;padding:12px 16px;display:flex;flex-direction:column;gap:3px">' +
        '<div style="' + cell + ';font-size:11px;color:var(--c-muted);padding-bottom:4px;border-bottom:1px solid var(--c-line)"><span></span><span>Move · where it is decided</span><span>State</span><span>Gain a year</span><span>Cost</span><span>Pays back</span></div>' +
        C.segs.map(function (x, i) { var g = SEG[i], c = x.k === 'plan' ? 0 : INFO[x.k][2], pay = x.k === 'plan' ? 'at once' : x.d > 0 ? Math.round(c / x.d) + ' years' : '—';
          return '<button type="button" data-a="go" data-v="' + g[3] + '"' + (reach(g[3]) ? '' : ' disabled') + ' style="' + cell + ';min-height:34px;border:none;border-bottom:1px solid var(--c-line2);background:transparent;color:var(--c-ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;padding:0">' + FN.icon(g[2], x.on ? 'var(--c-gain)' : 'var(--c-muted)') + '<span><b style="font-weight:600">' + (x.k === 'plan' ? (st.chosen || 'A better plan') : INFO[x.k][1]) + '</b> <span style="color:var(--c-muted)">· step ' + (g[3] + 1) + ', ' + STEPS[g[3]] + '</span></span><span style="color:' + (x.on ? 'var(--c-gain)' : 'var(--c-ink2)') + '">' + (x.on ? '✓ decided' : 'possible') + '</span><b style="font-weight:600;color:' + (x.d < 0 ? 'var(--c-loss)' : 'var(--c-gain)') + '">' + (x.d < 0 ? '+' + FN.money(-x.d) : '−' + FN.money(x.d * (1 - u)) + '–' + FN.money(x.d * (1 + u))) + '</b><span>' + (c ? FN.money(c) + (x.k === 'bat' ? ' after rebate' : x.k === 'solar' ? ' after STCs' : '') : 'nothing') + '</span><span style="color:var(--c-ink2)">' + pay + '</span></button>'; }).join('') +
        (tou > 1 ? '<div style="font-size:12px;color:var(--c-loss);padding:6px 0 2px">Not worth it for you: Time of Use Saver, +' + FN.money(tou) + ' a year, because your peak falls in its 52 c hours.</div>' : '') +
        '<div style="display:flex;justify-content:space-between;gap:12px;font-size:11.5px;color:var(--c-muted);padding-top:6px"><span><b style="color:var(--c-ink2)">How it is computed</b> · ' + (st.prof.meter ? 'your meter, 12 months' : st.prof.bill ? 'your bill' : 'a typical home in 2204') + ', ±' + unc() + ' % · each move on top of the ones before · open-energy (prototype) · 31 Oct 2026</span><span>Left to pay on power, gas and fuel: <b style="color:var(--c-ink)">' + FN.money(C.left) + ' a year</b></span></div></div>';
    }
    function dayOn(name) {
      var p = FN.PLANS.filter(function (x) { return x.name === name; })[0], d = FN.base(15), W = 560, X0 = 34, base = 168, sc = 120 / 2.6, bw = W / 24 - 3, h, o = '';
      var band = function (r) { return r < 0.25 ? 'var(--c-gain)' : r < 0.4 ? 'var(--c-muted)' : 'var(--c-loss)'; };
      var peak = 0, all = 0, peakCost = 0; for (h = 0; h < 24; h++) { all += d[h]; if (h >= 17 && h < 21) { peak += d[h]; peakCost += d[h] * p.rate(h) * 365; } }
      o += '<svg width="100%" height="214" viewBox="0 0 600 214" preserveAspectRatio="xMinYMid meet" role="img" aria-label="Your day hour by hour, coloured by the price of each hour on ' + name + '">';
      o += '<rect x="' + (X0 + 17 * W / 24 - 1.5) + '" y="22" width="' + (4 * W / 24) + '" height="' + (base - 20) + '" rx="6" fill="var(--c-sunSoft)" opacity=".8"></rect><text x="' + (X0 + 19 * W / 24) + '" y="36" font-size="11" font-weight="600" text-anchor="middle" fill="var(--c-sunText)">your peak</text>';
      for (h = 0; h < 24; h++) { var r = p.rate(h), hgt = d[h] * sc; o += '<rect x="' + (X0 + h * W / 24).toFixed(1) + '" y="' + (base - hgt).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2" fill="' + band(r) + '" opacity=".85"><title>' + h + ':00 · ' + d[h].toFixed(2) + ' kWh at ' + Math.round(r * 100) + ' c</title></rect>'; }
      // the price strip: one segment per run of the same rate
      var s = 0; for (h = 1; h <= 24; h++) if (h === 24 || p.rate(h) !== p.rate(s)) { var x1 = X0 + s * W / 24, x2 = X0 + h * W / 24 - 3; o += '<rect x="' + x1.toFixed(1) + '" y="' + (base + 6) + '" width="' + (x2 - x1).toFixed(1) + '" height="18" rx="4" fill="' + band(p.rate(s)) + '" opacity=".16"></rect>' + (x2 - x1 > 30 ? '<text x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (base + 19) + '" font-size="11" font-weight="600" text-anchor="middle" fill="var(--c-ink)">' + Math.round(p.rate(s) * 100) + ' c</text>' : ''); s = h; }
      ['0h', '6h', '12h', '18h', '24h'].forEach(function (l, i) { o += '<text x="' + (X0 + i * W / 4 - (i === 4 ? 18 : 0)) + '" y="' + (base + 40) + '" font-size="10" fill="var(--c-muted)">' + l + '</text>'; });
      o += '<text x="0" y="' + (base - 2 * sc + 4) + '" font-size="10" fill="var(--c-muted)">2 kWh</text><path d="M' + X0 + ' ' + (base - 2 * sc) + ' H' + (X0 + W) + '" stroke="var(--c-line2)"></path></svg>';
      var legend = [['var(--c-gain)', 'cheap hours'], ['var(--c-muted)', 'standard'], ['var(--c-loss)', 'dear hours']].map(function (l) { return '<span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:' + l[0] + ';opacity:.85"></span>' + l[1] + '</span>'; }).join('');
      return { svg: o, legend: legend, share: Math.round(peak / all * 100), peakCost: peakCost };
    }
    // the profile's pieces: a home composed with icons, and a day explained by its uses
    var GROUPS = [
      ['people', 'Who lives here', 6, [['1', 1, 'person'], ['2', 2, 'person'], ['3', 3, 'person'], ['4', 4, 'person'], ['5+', 5, 'person']]],
      ['home', 'Daytime at home', 4, [['Away weekdays', 'away', 'away'], ['Some days', 'some', 'some'], ['Most days', 'most', 'home']]],
      ['hvac', 'Heating and cooling', 4, [['Split AC', 'split', 'split'], ['Ducted AC', 'ducted', 'ducted'], ['Gas heater', 'gas', 'flame'], ['None', 'none', 'none']]],
      ['hw', 'Hot water', 4, [['Gas', 'gas', 'flame'], ['Electric tank', 'elec', 'tank'], ['Heat pump', 'hp', 'heat'], ['Solar', 'solar', 'solarhw']]],
      ['cook', 'Cooking', 1, [['Gas', 'gas', 'gasstove'], ['Electric', 'elec', 'stove'], ['Induction', 'ind', 'induction']]],
      ['pool', 'Pool', 2, [['No pool', 'no', 'none'], ['Pump', 'pump', 'pump'], ['Heated', 'heated', 'pool']]],
      ['have', 'Already installed', 1, [['Nothing yet', 'none', 'none'], ['Solar PV', 'pv', 'pv'], ['Battery', 'bat', 'battery'], ['Electric car', 'ev', 'car']]]
    ];
    var USES = [['base', 'Always on', '#8C8F96', 'fridge, standby, network'], ['living', 'Living', '#B9A88F', 'lights, screens, appliances'], ['cook', 'Cooking', '#D9822B', 'oven and cooktop'], ['hw', 'Hot water', '#4F86C6', 'tank or heat pump'], ['hvac', 'Heating and cooling', '#3FA796', 'air conditioning'], ['pool', 'Pool', '#7A6BC6', 'pump, heating'], ['ev', 'Car', '#C8559A', 'charging']];
    // the day by use, from the answers (defaults stand for an unanswered group), scaled to the bill or the meter
    function uses(season) {
      var A = st.prof.ans, ppl = A.people || 3, h, U = {};
      USES.forEach(function (u) { U[u[0]] = []; for (h = 0; h < 24; h++) U[u[0]].push(0); });
      var pres = A.home === 'most' ? 1 : A.home === 'away' ? 0.35 : 0.6;
      for (h = 0; h < 24; h++) {
        U.base[h] = 0.2;
        var liv = (h >= 6 && h < 9) ? 0.35 : (h >= 17 && h < 23) ? 0.55 : (h >= 9 && h < 17) ? 0.22 * pres : 0.05;
        U.living[h] = liv * (0.55 + 0.15 * ppl);
        if (A.cook !== 'gas' && (h === 7 || h === 12 || h === 18)) U.cook[h] = (h === 18 ? 0.8 : 0.25) * (A.cook === 'ind' ? 0.85 : 1);
        if (A.hw === 'elec' && h < 5) U.hw[h] = 0.8 * (0.6 + 0.13 * ppl);
        if (A.hw === 'hp' && h >= 11 && h < 14) U.hw[h] = 0.45;
        if (A.hw === 'solar' && h >= 17 && h < 19) U.hw[h] = 0.15;
        var ac = A.hvac === undefined ? 'split' : A.hvac, k = ac === 'ducted' ? 1.8 : ac === 'split' ? 1 : ac === 'gas' ? 0.15 : 0;
        if (season !== 'winter' && h >= 15 && h < 22) U.hvac[h] = 0.35 * k * (season === 'summer' ? 1.6 : 0.8);
        if (season !== 'summer' && ((h >= 6 && h < 9) || (h >= 17 && h < 22))) U.hvac[h] += 0.3 * k * (season === 'winter' ? 1.6 : 0.6);
        if (A.pool === 'pump' && h >= 10 && h < 16) U.pool[h] = 0.6;
        if (A.pool === 'heated' && h >= 10 && h < 16) U.pool[h] = 1.4;
        if (A.have === 'ev' && h < 4) U.ev[h] = 1.6;
      }
      var tot = 0; USES.forEach(function (u) { tot += U[u[0]].reduce(function (a, b) { return a + b; }, 0); });
      if (st.prof.bill || st.prof.meter) { var f = 15 * (season === 'summer' ? 1.08 : season === 'winter' ? 1.2 : 1) / tot; USES.forEach(function (u) { U[u[0]] = U[u[0]].map(function (v) { return v * f; }); }); tot = 15 * f / f * (season === 'summer' ? 1.08 : season === 'winter' ? 1.2 : 1); }
      return { U: U, tot: tot };
    }
    function tile(g, o) {
      var on = st.prof.ans[g[0]] === o[1];
      return '<button type="button" data-a="ans" data-v="' + g[0] + '|' + o[1] + '" aria-pressed="' + on + '" title="' + o[0] + '" style="width:' + (g[0] === 'people' ? 52 : 74) + 'px;height:56px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit;cursor:pointer;padding:0 2px">' + FN.icon(o[2]) + '<span style="font-size:10.5px;line-height:1.1;text-align:center">' + o[0] + '</span></button>';
    }
    // step 1 · your energy: the plans and the profile on one screen. Without data, plans are ranked for a typical
    // home of the postcode and said so; each piece of data the household adds (bill, meter, its home) narrows the
    // range everywhere at once, and the ask sits where its value shows: at the head of the plans.
    var SHORT = { people: 'People', home: 'Daytime', hvac: 'Heat, cool', hw: 'Hot water', cook: 'Cooking', pool: 'Pool', have: 'Installed' };
    function known() { return st.prof.meter || st.prof.bill; }
    function useChart(season) {
      var D = uses(season), U = D.U, u = unc(), W = 560, X0 = 34, base = 176, h, acc = [], max = 0;
      for (h = 0; h < 24; h++) { acc.push(0); max = Math.max(max, USES.reduce(function (t, us) { return t + U[us[0]][h]; }, 0) * (1 + u / 100)); }
      max = Math.max(2.2, max * 1.2); var sc = 150 / max, x = function (hh) { return X0 + hh / 23 * W; }, layers = '';
      USES.forEach(function (us) {
        var arr = U[us[0]], top = [], bot = [];
        if (arr.reduce(function (a, b) { return a + b; }, 0) < 0.01) return;
        for (h = 0; h < 24; h++) { bot.unshift(x(h).toFixed(1) + ' ' + (base - acc[h] * sc).toFixed(1)); acc[h] += arr[h]; top.push(x(h).toFixed(1) + ' ' + (base - acc[h] * sc).toFixed(1)); }
        layers += '<path d="M' + top.join(' L') + ' L' + bot.join(' L') + ' Z" fill="' + us[2] + '" opacity=".82"></path>';
      });
      var up = [], lo = []; for (h = 0; h < 24; h++) { up.push(x(h).toFixed(1) + ' ' + (base - acc[h] * (1 + u / 100) * sc).toFixed(1)); lo.push(x(h).toFixed(1) + ' ' + (base - acc[h] * (1 - u / 100) * sc).toFixed(1)); }
      var tot = acc.reduce(function (a, b) { return a + b; }, 0), sun = 0, eve = 0, pk = 0; for (h = 7; h < 17; h++) sun += acc[h]; for (h = 17; h < 23; h++) eve += acc[h]; for (h = 1; h < 24; h++) if (acc[h] > acc[pk]) pk = h;
      var o = '<svg width="100%" height="214" viewBox="0 0 600 214" preserveAspectRatio="xMinYMid meet" role="img" aria-label="Your average day stacked by use, with the sunny hours and the confidence band">' +
        '<rect x="' + x(7) + '" y="18" width="' + (x(17) - x(7)) + '" height="' + (base - 18) + '" fill="var(--c-sunSoft)" opacity=".7"></rect><text x="' + ((x(7) + x(17)) / 2) + '" y="32" font-size="11" fill="var(--c-sunText)" text-anchor="middle" font-weight="600">when the sun shines · ' + Math.round(sun / tot * 100) + ' % of your use</text>' +
        layers + '<path d="M' + up.join(' L') + '" fill="none" stroke="var(--c-ink)" stroke-dasharray="3 3" opacity=".5"></path><path d="M' + lo.join(' L') + '" fill="none" stroke="var(--c-ink)" stroke-dasharray="3 3" opacity=".5"></path>' +
        '<text x="' + (x(pk) + 6) + '" y="' + (base - acc[pk] * sc - 10) + '" font-size="11" fill="var(--c-ink)" text-anchor="end" font-weight="600">' + pk + ':00 peak · ' + acc[pk].toFixed(1) + ' kW</text>' +
        '<path d="M' + X0 + ' ' + base + ' H' + (X0 + W) + '" stroke="var(--c-line)"></path>' + ['0h', '6h', '12h', '18h', '24h'].map(function (l, i) { return '<text x="' + (X0 + i * W / 4 - (i === 4 ? 18 : 0)) + '" y="' + (base + 16) + '" font-size="10" fill="var(--c-muted)">' + l + '</text>'; }).join('') + '</svg>';
      var legend = USES.map(function (us) { var v = U[us[0]].reduce(function (a, b) { return a + b; }, 0); return v < 0.01 ? '' : '<span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:' + us[2] + '"></span>' + us[1] + ' ' + v.toFixed(1) + '</span>'; }).join('');
      return { svg: o, legend: legend, means: '<b style="color:var(--c-ink)">' + Math.round(sun / tot * 100) + ' % of your ' + tot.toFixed(1) + ' kWh a day falls when panels produce</b>; ' + eve.toFixed(1) + ' kWh between 5 and 11 pm, the part a battery can carry.' };
    }
    function stepEnergy() {
      var P = st.prof, u = unc(), K = known(), cur = cost('Flat Rate'), plans = ['Flat Rate', 'Simple Saver', 'Time of Use Saver'].map(function (n) { return { n: n, c: cost(n) }; }).sort(function (a, b) { return a.c - b.c; });
      var show = st.chosen || plans[0].n, lens = st.lens || 'price', nAns = Object.keys(P.ans).length;
      var o = '<div style="position:absolute;inset:12px;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:12px">';
      // left: the day, read by price or by use; under it, the home, one question at a time
      var D = lens === 'price' ? dayOn(show) : useChart(st.season || 'year');
      var seg = function (k, l) { var on = lens === k; return '<button type="button" data-a="lens" data-v="' + k + '" style="min-height:28px;padding:0 10px;border:none;border-radius:6px;background:' + (on ? 'var(--c-paper)' : 'transparent') + ';color:' + (on ? 'var(--c-ink)' : 'var(--c-muted)') + ';font:inherit;font-size:12px;font-weight:' + (on ? 600 : 400) + ';cursor:pointer;' + (on ? 'box-shadow:0 1px 2px rgba(29,32,38,.12)' : '') + '">' + l + '</button>'; };
      o += '<div style="display:flex;flex-direction:column;gap:12px;min-height:0"><div style="' + FN.card + ';padding:12px 16px;display:flex;flex-direction:column;gap:4px;flex:1;min-height:0">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-size:15px;font-weight:600">Your day</b><span style="display:flex;gap:8px;align-items:center">' + (lens === 'use' ? [['year', 'Year'], ['summer', 'Summer'], ['winter', 'Winter']].map(function (v) { var on = (st.season || 'year') === v[0]; return '<button type="button" data-a="season" data-v="' + v[0] + '" style="border:none;background:transparent;color:' + (on ? 'var(--c-ink)' : 'var(--c-muted)') + ';font:inherit;font-size:12px;font-weight:' + (on ? 600 : 400) + ';cursor:pointer;padding:0 2px">' + v[1] + '</button>'; }).join('') : '<span style="font-size:12px;color:var(--c-ink2)">on ' + show + '</span>') +
        '<span style="display:flex;background:var(--c-ground);border-radius:8px;padding:2px">' + seg('price', 'By price') + seg('use', 'By use') + '</span></span></div>' +
        D.svg + '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--c-ink2)">' + D.legend + '</div>' +
        '<span style="font-size:12.5px;line-height:1.45;color:var(--c-ink2);margin-top:auto">' + (lens === 'price' ? '<b style="color:var(--c-ink)">' + D.share + ' % of ' + (K ? 'your' : 'a typical') + ' use falls between 5 and 9 pm</b>: on this plan those hours cost ' + FN.money(D.peakCost) + ' a year.' : D.means) + '</span></div>';
      // the home: seven pills, one open at a time
      var G = GROUPS.filter(function (g) { return g[0] === st.openG; })[0];
      o += '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;font-weight:600">Your home</b><span style="font-size:11.5px;color:var(--c-muted)">' + nAns + ' of 7 · each answer narrows your range · no kWh to type</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">' + GROUPS.map(function (g) {
          var a = P.ans[g[0]], opt = g[3].filter(function (x) { return x[1] === a; })[0], on = st.openG === g[0];
          return '<button type="button" data-a="openG" data-v="' + g[0] + '" aria-expanded="' + on + '" style="height:58px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : opt ? 'var(--c-line)' : 'var(--c-line)') + ';border-style:' + (opt || on ? 'solid' : 'dashed') + ';background:' + (on ? 'var(--c-selSoft)' : opt ? 'var(--c-paper2)' : 'transparent') + ';color:var(--c-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;cursor:pointer;padding:0 3px">' + FN.icon(opt ? opt[2] : g[3][0][2], opt ? 'var(--c-sel)' : 'var(--c-muted)') + '<span style="font-size:10px;color:var(--c-muted);line-height:1.1">' + SHORT[g[0]] + '</span><b style="font-size:10.5px;font-weight:600;line-height:1.1;color:' + (opt ? 'var(--c-ink)' : 'var(--c-faint)') + '">' + (opt ? opt[0] : '?') + '</b></button>';
        }).join('') + '</div>' +
        (G ? '<div style="display:flex;align-items:center;gap:8px;padding-top:2px"><span style="width:110px;font-size:12px;line-height:1.3"><b style="font-weight:600">' + G[1] + '</b><br><span style="color:var(--c-gain);font-size:11px">narrows ' + G[2] + ' pts</span></span><span style="display:flex;gap:6px;flex-wrap:wrap">' + G[3].map(function (x) { return tile(G, x); }).join('') + '</span></div>' : '<span style="font-size:12px;color:var(--c-ink2)">' + (nAns ? 'Tap another to refine the shape of your day.' : 'Tap one: it tells the shape of your day, which time-of-use plans depend on.') + '</span>') + '</div></div>';
      // right: the data ladder at the head of the plans, then the plans, one open at a time
      var step = function (n, ic, t, sub, ok, act, lab) { return '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:10px;border:1px solid ' + (ok ? 'var(--c-gain)' : 'var(--c-line)') + ';background:' + (ok ? 'var(--c-gainSoft)' : 'var(--c-paper2)') + '"><span style="display:flex;align-items:center;gap:6px">' + FN.icon(ic, ok ? 'var(--c-gain)' : 'var(--c-ink2)') + '<b style="font-size:12.5px;font-weight:600">' + t + '</b>' + (ok ? '<span style="margin-left:auto;color:var(--c-gain);font-weight:600">✓</span>' : '') + '</span><span style="font-size:11px;color:var(--c-ink2);line-height:1.3">' + sub + '</span>' + (act ? '<button type="button" data-a="src" data-v="' + act + '" style="align-self:flex-start;min-height:28px;padding:0 10px;border-radius:7px;border:' + (act === 'bill' ? 'none' : '1px solid var(--c-ink)') + ';background:' + (act === 'bill' ? 'var(--c-live)' : 'var(--c-paper)') + ';color:' + (act === 'bill' ? 'var(--c-onLive)' : 'var(--c-ink)') + ';font:inherit;font-size:11.5px;font-weight:600;cursor:pointer">' + lab + '</button>' : '') + '</div>'; };
      var basis = P.meter ? 'Ranked on your meter, 12 months · ±' + u + ' %' : P.bill ? 'Ranked on your bill · ±' + u + ' %' : 'Ranked for a typical home in 2204 · ±' + u + ' %';
      o += '<div style="' + FN.card + ';padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-height:0"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px;font-weight:600">Plans for you</b><span style="font-size:11.5px;color:var(--c-muted)">the more you share, the more it is yours</span></div>' +
        '<div style="display:flex;gap:6px">' + step(1, 'home', 'Postcode', '2204 · from your address', true, '', '') + step(2, 'bill', 'Your bill', P.bill ? 'read · your own ranking' : 'one photo · your own ranking', P.bill || P.meter, P.bill || P.meter ? '' : 'bill', 'Add a photo') + step(3, 'meter', 'Smart meter', P.meter ? '12 months measured' : 'the most precise', P.meter, P.meter ? '' : 'meter', 'Connect') + '</div>' +
        (P.bill && !P.meter ? '<span style="display:flex;gap:5px;flex-wrap:wrap;font-size:11px">' + ['Flat Rate · Retailer A', '1,380 kWh in 92 days', '36 c/kWh', '110 c/day', '$598 a quarter'].map(function (c) { return '<span style="background:var(--c-selSoft);border-radius:4px;padding:1px 6px">' + c + '</span>'; }).join('') + '<span style="color:var(--c-muted)">read from your bill</span></span>' : '') +
        '<span style="' + FN.kick + ';margin-top:2px">' + basis + '</span>' +
        plans.map(function (p) {
          var d = cur - p.c, on = p.n === show, O = OFFERS[p.n], tou = p.n === 'Time of Use Saver', guess = tou && !K && nAns < 3;
          var tag = d > 1 ? '<span style="color:var(--c-gain)">saves ' + FN.money(d * (1 - u / 100)) + '–' + FN.money(d * (1 + u / 100)) + '</span>' : d < -1 ? '<span style="color:var(--c-loss)">costs ' + FN.money(-d) + ' more</span>' : '<span style="color:var(--c-muted)">' + (K ? 'your plan today' : 'the usual plan') + '</span>';
          return '<button type="button" data-a="plan" data-v="' + p.n + '" aria-pressed="' + (st.chosen === p.n) + '" style="border-radius:12px;border:1px solid ' + (st.chosen === p.n ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (st.chosen === p.n ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:' + (on ? '10px 14px' : '8px 14px') + ';text-align:left;display:flex;flex-direction:column;gap:5px;font:inherit;cursor:pointer">' +
            '<span style="width:100%;display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="display:flex;align-items:baseline;gap:8px;min-width:0"><b style="font-size:14.5px;font-weight:600">' + p.n + '</b><span style="font-size:11px;color:var(--c-muted)">' + O.who.replace(' · your retailer', K ? ' · your retailer' : '') + '</span></span><span style="display:flex;align-items:baseline;gap:10px;font-size:12px;font-weight:600">' + tag + '<b style="font-size:15px">' + FN.money(p.c) + '</b></span></span>' +
            (on ? '<span style="display:flex;gap:5px;flex-wrap:wrap">' + O.chips.map(function (c) { return '<span style="font-size:11px;padding:2px 7px;border-radius:999px;background:var(--c-paper);border:1px solid var(--c-line2)">' + c + '</span>'; }).join('') + '</span><span style="font-size:12px;color:var(--c-ink2);line-height:1.4">' + O.line + ' <span style="color:var(--c-muted)">' + O.terms + '</span></span>' : '') +
            (guess ? '<span style="font-size:11.5px;color:var(--c-sunText)">Depends on the shape of your day: add your bill or tap your home to be sure.</span>' : '') +
            (st.chosen === p.n && d > 1 ? '<span style="font-size:12px;font-weight:600;color:var(--c-sel)">Chosen ✓ · we switch it when you say, at no cost</span>' : '') + '</button>';
        }).join('') +
        '<div style="border:1px dashed var(--c-line);border-radius:10px;padding:7px 12px;font-size:11.5px;color:var(--c-muted);display:flex;gap:8px;align-items:center">' + FN.icon('pv', 'var(--c-muted)') + FN.icon('battery', 'var(--c-muted)') + FN.icon('car', 'var(--c-muted)') + '<span>3 plans hidden: they need solar, a battery or an electric car.</span></div>' +
        '<span style="font-size:11px;color:var(--c-muted);line-height:1.45;margin-top:auto">No email before your first number. Nobody calls you unless you ask. A $40 commission is shown on every plan, the same for all, and never changes the order.</span></div></div>';
      if (P.consent) o += '<div style="position:absolute;inset:0;background:rgba(29,32,38,.32);display:flex;align-items:center;justify-content:center"><div style="width:460px;' + FN.card + ';padding:20px;display:flex;flex-direction:column;gap:12px"><b style="font-size:18px;font-weight:600">Connect your meter</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">With your consent, open-energy reads 12 months of half-hourly readings for the meter on your bill. Solar Designer receives totals and an average day only.</span><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-a="noconsent" style="min-height:42px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Not now</button><button type="button" data-a="consent" style="min-height:42px;padding:0 16px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-weight:600;cursor:pointer">Allow 12 months</button></div></div></div>';
      if (P.busy) o += '<div style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:9px 14px;border-radius:10px">' + P.busy + '</div>';
      return o;
    }
    // step 2 · roof
    // the roof type, asked in pictures: the 3D home and the fill follow it
    function roofPick() {
      var pic = {
        hip: 'M4 22 L14 10 H26 L36 22 Z',
        gable: 'M4 22 L8 10 H32 L36 22 Z M8 10 V22 M32 10 V22',
        skillion: 'M4 22 V14 L36 8 V22 Z',
        flat: 'M4 18 H36 V22 H4 Z'
      };
      return '<span style="font-size:12px;color:var(--c-muted)">What does your roof look like?</span><span style="display:flex;gap:6px;margin-bottom:4px">' + Object.keys(FN.ROOFS).map(function (k) { var on = (S.roof || 'hip') === k; return '<button type="button" data-a="roof" data-v="' + k + '" aria-pressed="' + on + '" style="flex:1;min-height:58px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit;font-size:11.5px;cursor:pointer"><svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true"><path d="' + pic[k] + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg>' + FN.ROOFS[k].en + '</button>'; }).join('') + '</span>' + homePick();
    }
    // its footprint seen from above: the walls, doors and windows of the 3D home, the units' walls and the
    // cables follow it; the roof type covers the house, a garage keeps a schematic flat roof
    function homePick() {
      var pic = { rect: 'M6 6 H34 V20 H6 Z', ell: 'M6 4 H34 V14 H20 V22 H6 Z' };
      return '<span style="font-size:12px;color:var(--c-muted)">And seen from above?</span><span style="display:flex;gap:6px;margin-bottom:4px">' + Object.keys(FN.HOMES).map(function (k) { var on = (S.home || 'rect') === k; return '<button type="button" data-a="home" data-v="' + k + '" aria-pressed="' + on + '" style="flex:1;min-height:44px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:11.5px;cursor:pointer"><svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true"><path d="' + pic[k] + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg>' + FN.HOMES[k].en + '</button>'; }).join('') + '</span>';
    }
    // step 2 begins with the site: its type, proposed from the address's land use, confirmed by the household
    // on our drawing of the lot (D-73); only a house goes on to its roof (D-74)
    var SITES = [
      ['house', 'House', 'A home on its own lot', 'M6 22 V13 L20 5 L34 13 V22 Z M16 22 V16 H24 V22'],
      ['units', 'Apartment or units', 'A building with several homes', 'M8 22 V6 H32 V22 Z M13 10 H17 M23 10 H27 M13 15 H17 M23 15 H27 M18 22 V19 H22 V22'],
      ['business', 'Shop, office or farm', 'A business site', 'M4 22 V12 L12 8 V12 L20 8 V12 L28 8 V12 L36 8 V22 Z'],
      ['carpark', 'Car park', 'Canopies over the bays', 'M4 10 L36 7 M6 9.8 V22 M34 7.2 V22 M10 17 H18 V21 H10 Z M22 17 H30 V21 H22 Z'],
      ['other', 'Something else', 'A shed, a pool house, land', 'M8 22 V12 L20 6 L32 12 V22 Z M20 14 V16 M20 18.5 V19']
    ];
    var HAND = {
      units: 'A building with several homes: the roof is shared and the body corporate approves. An installer surveys it and designs it with you.',
      business: 'A business site takes larger systems: from 100 kW they earn mid-scale certificates or REGO, the owner’s choice, and a connection above 30 kVA is negotiated with the network. An installer designs it.',
      carpark: 'Canopies are new structures, each with its engineering and approval. An installer designs them.',
      other: 'Tell the installer what it is: they draw it with you, a custom zone if no type fits.'
    };
    function siteOf(k) { return SITES.filter(function (x) { return x[0] === k; })[0]; }
    function lotSvg(hi) {
      // our drawing of the lot, not a photo: the boundary from the cadastre, the roof from LiDAR, the street
      return '<svg width="100%" height="100%" viewBox="150 60 740 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your site from our drawing">' + FN.draw.defs() +
        '<rect x="150" y="60" width="740" height="560" fill="url(#sd-grid-dots)"></rect><rect x="150" y="560" width="740" height="60" fill="var(--c-line)" opacity=".7"></rect>' +
        '<rect x="200" y="96" width="650" height="456" fill="' + (hi ? 'var(--c-selSoft)' : 'var(--c-paper)') + '" stroke="var(--c-sel)" stroke-width="2" stroke-dasharray="10 6"></rect>' +
        '<rect x="610" y="380" width="70" height="172" fill="var(--c-line)" opacity=".9"></rect><rect x="356" y="381" width="26" height="171" fill="var(--c-line)" opacity=".9"></rect>' +
        '<g transform="translate(262 146) scale(.6) translate(-223 -162)"><rect x="223" y="162" width="602" height="402" rx="3" fill="#1D2026" opacity=".14"></rect></g>' +
        '<g transform="translate(250 134) scale(.6) translate(-223 -162)">' + Object.keys(FN.ROOFS.hip.faces).map(function (k) { return '<path d="' + FN.ROOFS.hip.faces[k] + '" fill="var(--c-roof)" stroke="var(--c-roofLine)" stroke-width="1.8"></path><path d="' + FN.ROOFS.hip.faces[k] + '" fill="url(#sd-hatch-' + (k === 'W' || k === 'E' ? 'v' : 'h') + ')"></path>'; }).join('') + '</g>' +
        '<circle cx="780" cy="190" r="34" fill="#9DAE93" opacity=".9"></circle><circle cx="790" cy="200" r="34" fill="#1D2026" opacity=".08"></circle>' +
        '<text x="520" y="596" text-anchor="middle" font-size="16" fill="var(--c-ink2)">Wattle Lane</text></svg>';
    }
    function sitePick() {
      var sel = st.siteSel, o = '<div style="position:absolute;left:12px;top:12px;bottom:12px;right:352px;' + FN.card + ';overflow:hidden;background:var(--c-canvas)">' + lotSvg(true) +
        '<span style="position:absolute;left:12px;top:12px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;background:var(--c-paper);color:var(--c-gain);border:1px solid var(--c-line)">14 Wattle Lane · lot from the cadastre · our drawing, not a photo</span></div>';
      o += '<div style="position:absolute;right:12px;top:12px;bottom:12px;width:328px;' + FN.card + ';padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto"><b style="font-size:16px;font-weight:600">What is this site?</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">From your address, the planning map says residential: a house on its own lot. Confirm it, or tell us what it is.</span>' +
        '<span style="display:flex;flex-direction:column;gap:6px">' + SITES.map(function (x) {
          var on = sel === x[0];
          return '<button type="button" data-a="siteSel" data-v="' + x[0] + '" aria-pressed="' + on + '" style="display:flex;align-items:center;gap:10px;text-align:left;min-height:52px;padding:6px 10px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;cursor:pointer"><svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true"><path d="' + x[3] + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg><span style="display:flex;flex-direction:column;gap:1px"><b style="font-size:13px;font-weight:600">' + x[1] + (x[0] === 'house' ? ' <span style="font-weight:500;font-size:11px;color:var(--c-gain)">· from your address</span>' : '') + '</b><span style="font-size:11.5px;color:var(--c-muted)">' + x[2] + '</span></span></button>';
        }).join('') + '</span>' +
        '<button type="button" data-a="siteOk" style="min-height:46px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:14px;font-weight:600;cursor:pointer">Confirm: ' + siteOf(sel)[1].toLowerCase() + '</button>' +
        '<span style="font-size:12px;color:var(--c-muted);margin-top:auto">The type sets what follows: a house goes on to its roof, any other site to an installer. It goes into the place layer of your site.</span></div>';
      return o;
    }
    function siteHand() {
      var x = siteOf(S.site), o = '<div style="position:absolute;left:12px;top:12px;bottom:12px;right:352px;' + FN.card + ';overflow:hidden;background:var(--c-canvas)">' + lotSvg(false) +
        '<span style="position:absolute;left:12px;top:12px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;background:var(--c-paper);color:var(--c-sel);border:1px solid var(--c-line)">' + x[1] + ' · confirmed by you</span></div>';
      o += '<div style="position:absolute;right:12px;top:12px;bottom:12px;width:328px;' + FN.card + ';padding:16px;display:flex;flex-direction:column;gap:10px"><b style="font-size:16px;font-weight:600">An installer designs this site</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">' + HAND[S.site] + '</span>' +
        '<span style="font-size:13px;color:var(--c-ink2);line-height:1.5">Your plan and your needs go with it, as totals; the installer sends its proposal back here.</span>' +
        '<button type="button" data-a="handover" style="min-height:46px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:14px;font-weight:600;cursor:pointer">Share with an installer</button>' +
        '<button type="button" data-a="siteRe" style="min-height:42px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Change the type</button></div>';
      return o;
    }
    // the site's zones once the roof is filled, the capacity summed over them and the category it gives
    function zonesBlock() {
      var kw = kwpOf(), cat = smCats('house', { kWc: kw, kVA: FN.invFor(kw), ph: 1, carport: hasZone('carport'), cover: 0 }, false, function (v) { return v.toFixed(1); })[1];
      var row = function (name, n, tag, tagC, act) {
        return '<span style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span style="flex:1"><b style="font-weight:600">' + name + '</b><br><span style="font-size:11.5px;color:' + tagC + '">' + tag + '</span></span>' + act + '<b style="font-weight:600;white-space:nowrap">' + n + ' · ' + (n * SMKWC).toFixed(2) + ' kWp</b></span>';
      };
      var btn = function (a, v, t) { return '<button type="button" data-a="' + a + '" data-v="' + v + '" style="min-width:28px;min-height:28px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:13px;cursor:pointer">' + t + '</button>'; };
      var o = '<span style="font-size:12px;color:var(--c-muted);margin-top:4px">Zones on your site</span>' +
        row(S.roof === 'flat' ? 'Flat roof' : 'North face', fillOf().n, 'measured from LiDAR, confirmed by you', 'var(--c-gain)', '') +
        (S.zones || []).map(function (z, i) { var Z = ZONES[z.k]; return row(Z.name, z.n, Z.why, 'var(--c-sunText)', (z.k === 'custom' ? btn('zoneN', i + '|-1', '−') + btn('zoneN', i + '|1', '+') : '') + btn('zoneDel', i, '×')); }).join('') +
        '<span style="display:flex;gap:6px">' + Object.keys(ZONES).filter(function (k) { return k === 'custom' || !hasZone(k); }).map(function (k) { return '<button type="button" data-a="zoneAdd" data-v="' + k + '" style="flex:1;min-height:36px;border-radius:8px;border:1px dashed var(--c-sel);background:transparent;color:var(--c-sel);font:inherit;font-size:12px;cursor:pointer">+ ' + (k === 'custom' ? 'Custom zone' : 'Carport') + '</button>'; }).join('') + '</span>' +
        '<span style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;border-radius:8px;background:var(--c-selSoft);font-size:13px"><span>Site total, every zone<br><span style="font-size:11.5px;color:var(--c-sel)">' + cat[1] + '</span></span><b style="font-weight:600;white-space:nowrap">' + modsOf() + ' · ' + kw.toFixed(2) + ' kWp</b></span>';
      return o;
    }
    function stepRoof() {
      if (!S.site) return sitePick();
      if (handed()) return siteHand();
      var isFlat = (S.roof === 'flat');
      var R = FN.ROOFS[S.roof || 'hip'], all3 = R.pv.every(function (k) { return st.conf[k]; }), F0 = fillOf(), mods = F0.mods, f = filled();
      // the blocks beside the roof's (a garage) in plan, 40 px a metre; the drawing grows to show them
      var HB = FN.home(S).D.bodies, vbH = Math.max(480, 356 + 40 * Math.max.apply(null, HB.map(function (b) { return b[3]; })) + 34 - 110);
      var garages = HB.filter(function (b) { return b[5] !== 'main'; }).map(function (b) { var x = 518 + b[0] * 40, y = 356 + b[1] * 40, w = (b[2] - b[0]) * 40, h = (b[3] - b[1]) * 40; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="var(--c-roof)" stroke="var(--c-roofLine)" stroke-width="1.1" stroke-dasharray="8 5"></rect><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 5) + '" text-anchor="middle" font-size="15" fill="var(--c-muted)">Garage · flat roof</text>'; }).join('');
      var o = '<div style="position:absolute;left:12px;top:12px;bottom:12px;width:80px;' + FN.card + ';display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:6px" role="toolbar">' + [['confirm', 'Confirm', false], ['fill', 'Fill zone', !all3]].map(function (t) { var on = st.tool === t[0]; return '<button type="button" data-a="tool" data-v="' + t[0] + '"' + (t[2] ? ' disabled' : '') + ' style="width:64px;min-height:64px;border:none;border-radius:10px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:' + (t[2] ? 'var(--c-faint)' : on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;flex-direction:column;align-items:center;gap:4px;justify-content:center;font:inherit;cursor:pointer">' + FN.icon(t[0]) + '<span style="font-size:11px">' + t[1] + '</span></button>'; }).join('') + '</div>';
      o += '<div style="position:absolute;left:104px;top:12px;bottom:12px;right:352px;' + FN.card + ';overflow:hidden;background:var(--c-canvas)"><svg width="100%" height="100%" viewBox="150 110 740 ' + vbH + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your roof from our drawing">' + FN.draw.defs() + '<rect x="150" y="110" width="740" height="' + vbH + '" fill="url(#sd-grid-dots)"></rect><rect x="223" y="162" width="602" height="402" rx="3" fill="#1D2026" opacity=".13"></rect>' + garages + Object.keys(R.faces).map(function (k) { var pv = R.pv.indexOf(k) >= 0, c = pv && st.conf[k], hi = pv && !c; return '<path data-a="face" data-v="' + k + '" d="' + R.faces[k] + '" fill="' + (c ? (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') : k === 'S' ? 'var(--c-roofS)' : 'var(--c-selSoft)') + '" stroke="' + (hi ? 'var(--c-sel)' : 'var(--c-roofLine)') + '" stroke-width="' + (hi ? 2.5 : 1.1) + '" style="cursor:pointer"></path><path d="' + R.faces[k] + '" fill="url(#sd-hatch-' + (k === 'W' || k === 'E' ? 'v' : 'h') + ')" pointer-events="none"></path>'; }).join('') +
        ((f || st.preview) ? mods.map(function (m) { return FN.draw.modSvg(m, !f, false, true); }).join('') : '') + FN.draw.ridges(S.roof || 'hip') + '</svg>' +
        '<span style="position:absolute;left:12px;top:12px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;background:var(--c-paper);color:var(--c-gain);border:1px solid var(--c-line)">LiDAR-measured · 0.91 · our drawing, not a photo</span>' +
        (st.preview && !f ? '<div style="position:absolute;left:50%;top:12px;transform:translateX(-50%);' + FN.card + ';padding:6px;display:flex;gap:6px;align-items:center"><span style="font-size:13px;color:var(--c-muted);padding:0 8px">' + F0.n + ' modules · ' + (F0.n * 0.44).toFixed(2) + ' kWp · ' + FN.n(F0.n * 0.44 * 1460) + ' kWh/yr</span><button type="button" data-a="keep" style="min-height:42px;padding:0 14px;border-radius:8px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-size:13px;font-weight:600;cursor:pointer">✓ Keep</button></div>' : '') + '</div>';

      var sideHeader = !all3 ? 'Is this your roof?' : !f ? (isFlat ? 'Choose rack variant' : 'Fill your roof') : 'Your roof is ready';
      var sideText = !all3 ? (R.pv.length > 1 ? 'Tap each face to confirm it: north, west and east. The south face gets no panels.' : 'Tap the roof to confirm it: modules stand on tilted racks.') : !f ? (isFlat ? 'Your roof takes modules on tilted racks, no angle to choose: the layout with the most energy is selected. Compare, then Fill zone and ✓ Keep.' : 'Fill zone, the north face, then ✓ Keep: three touches.') : (F0.n + (isFlat ? ' modules on tilted racks, ' + FN.PACK.flatZone.toFixed(2) + ' m inside the roof\'s edges' : ' modules on the north face after 0.40 m setbacks from the edges') + '. Next: what solar, a battery, a car or a heat pump would change.');

      // the variants as cards, money first: each laid out by studio-draw, the one with the most energy preselected (D-70)
      var rackCards = '';
      if (isFlat && all3) {
        var V = racksOf(), top = V[0], cur = rackOf(), u = unc(), o0 = opt(S.measures);
        o0.kwp = 0;
        var without = FN.sim(o0).total;
        var why = function (v) {
          if (v === top) return 'The most energy on your roof: ' + v.n + ' modules' + (FN.RACKS[v.id].mode ? ' in back-to-back pairs, a 30 cm aisle between them.' : ', rows ' + v.geom.gap.toFixed(2) + ' m apart so none shades the next in winter.');
          var per = Math.round((v.yield / top.yield - 1) * 100), more = v.n - top.n;
          if (more > 0) return more + ' more modules fit, but each makes ' + -per + ' % less: less energy in all.';
          return (per > 0 ? per + ' % more per module, but ' : per < 0 ? -per + ' % less per module, and ' : '') + (more < 0 ? -more + ' fewer modules fit' + (v.geom && v.geom.gap > 1 ? ': steeper rows need ' + v.geom.gap.toFixed(2) + ' m between them.' : '.') : 'as many modules.');
        };
        rackCards = '<div style="display:flex;flex-direction:column;gap:6px;margin:4px 0">' + V.map(function (v) {
          var sel = cur === v.id, o1 = opt(S.measures);
          o1.kwp = v.simKwp;
          var d = without - FN.sim(o1).total;
          return '<button type="button" data-a="rackMode" data-v="' + v.id + '" aria-pressed="' + sel + '" style="text-align:left;padding:8px 10px;border-radius:8px;border:1px solid ' + (sel ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (sel ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';font:inherit;cursor:pointer">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:12.5px;color:var(--c-ink)">' + v.label + (v === top ? ' · <span style="color:var(--c-gain)">the most energy</span>' : '') + '</b><span style="font-size:12px;font-weight:600;color:var(--c-gain);white-space:nowrap">saves ' + FN.money(d * (1 - u / 100)) + '–' + FN.money(d * (1 + u / 100)) + '/yr</span></div>' +
            '<div style="font-size:11.5px;color:var(--c-muted);margin-top:2px">' + v.n + ' modules · ' + v.kwp.toFixed(2) + ' kWp · ' + (v.kwh / 1000).toFixed(1) + ' MWh/yr</div>' +
            '<div style="font-size:11px;color:var(--c-ink2);margin-top:2px">' + why(v) + '</div></button>';
        }).join('') + '</div>';
      }

      o += '<div style="position:absolute;right:12px;top:12px;bottom:12px;width:328px;' + FN.card + ';padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto"><b style="font-size:16px;font-weight:600">' + sideHeader + '</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">' + sideText + '</span>' +
        (f ? zonesBlock() : '') + roofPick() + rackCards + (!isFlat ? R.pv.map(function (k) { return '<span style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span>' + { N: 'North', W: 'West', E: 'East' }[k] + ' · ' + R.pitch + '°</span><b style="color:' + (st.conf[k] ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (st.conf[k] ? 'confirmed' : 'to confirm') + '</b></span>'; }).join('') : '') + '<span style="font-size:12px;color:var(--c-muted);margin-top:auto">Faces fitted from open LiDAR by our API when the site was created; your confirmation goes into the place layer of your site.</span></div>';
      return o;
    }
    // what the household gets, and the incentives that come with it (design/markets/incentives)
    function equipment(M) {
      var r = [];
      if (M.solar) r.push(['pv', 'Solar panels', modsOf() + ' × 440 W monocrystalline · ' + kwpOf().toFixed(2) + ' kWp', '25-year warranty', S.roof === 'flat' ? 'on tilted racks, ' + FN.RACKS[rackOf()].en : 'fits the north face after 0.40 m setbacks']);
      if (M.solar || M.bat) { var kv = kwpOf(), iv = FN.invFor(kv); r.push(['plan', 'Hybrid inverter', iv + ' kW, battery-ready', '10 years', 'panels at ' + Math.round(kv / iv * 100) + ' % of the inverter, under the 133 % limit']); }
      if (M.bat) r.push(['battery', 'Home battery', '13.5 kWh lithium iron phosphate, VPP-ready', '10 years', 'carries most of your evening']);
      if (M.ev) r.push(['car', 'Car charger', '7 kW single phase, charges on solar', '3 years', '40 km a day, charged at noon']);
      if (M.hp) r.push(['heat', 'Heat-pump water heater', '270 L', '7 years', 'replaces gas; runs at midday']);
      return r;
    }
    function incentives(M) {
      var r = [];
      if (M.solar) { var n = FN.stcSolar(kwpOf()); r.push(['Solar certificates (STCs)', 'floor(' + kwpOf().toFixed(2) + ' kW × 1.382 zone × 5 years) = ' + n + ' STCs × $39.90', n * FN.STC, 'deeming years fall each year: 5 in 2026', true]); }
      if (M.bat) { var b = FN.batteryCerts(13.5, 6.8), b2 = FN.batteryCerts(13.5, 5.7); r.push(['Cheaper Home Batteries', '13.5 kWh × 6.8 STC/kWh = ' + b + ' STCs × $39.90', b * FN.STC, '6.8 until 31 Dec 2026, then 5.7: −' + FN.money((b - b2) * FN.STC), true]); }
      if (M.hp) r.push(['Heat-pump water heater', 'certificates may apply', 0, 'amount to check with the installer', false]);
      if (M.ev) r.push(['Solar Sharer', 'three free midday hours to charge', 0, 'NSW, from 1 Jul 2026, if your retailer offers it', false]);
      return r;
    }
    // step 3 · next move (the 3D home)
    var ORDER = ['plan', 'solar', 'hp', 'ev', 'bat'], INFO = { plan: ['plan', 'Plan switch', 0], solar: ['fill', 'Solar', 0], hp: ['heat', 'Heat-pump hot water', 3200], ev: ['car', 'Electric car charger', 1400], bat: ['battery', 'Battery 13.5 kWh', 11500 - FN.rebate(13.5)] };
    function stepNext() {
      INFO.solar[1] = 'Solar ' + kwpOf().toFixed(2) + ' kWp'; INFO.solar[2] = kwpOf() * 900;
      var M = S.measures, today = FN.TODAY(), acc = {}, prev = today, delta = {}, u = unc();
      ORDER.forEach(function (k) { acc[k] = false; }); ORDER.forEach(function (k) { if (M[k]) { acc[k] = true; var t = FN.sim(opt(acc)).total; delta[k] = t - prev; prev = t; } });
      var solo = function (k) { var a3 = {}, b3 = {}; ORDER.forEach(function (x) { a3[x] = M[x]; b3[x] = M[x]; }); a3[k] = true; b3[k] = false; return FN.sim(opt(b3)).total - FN.sim(opt(a3)).total; };
      var rank = ['hp', 'ev', 'bat'].map(function (k) { var s = solo(k); return { k: k, s: s, pay: s > 0 ? INFO[k][2] / s : 99 }; }).sort(function (a, b) { return a.pay - b.pay; });
      var o = '';
      o += '<div style="position:absolute;left:12px;top:12px;width:360px;bottom:12px;display:flex;flex-direction:column;gap:8px"><span style="' + FN.kick + ';padding:0 4px">Your moves · ranked by payback</span>' + [{ k: 'plan', s: 0, pay: 0 }, { k: 'solar', s: 0, pay: 0 }].concat(rank).map(function (m) {
        var on = M[m.k], I = INFO[m.k], fixed = m.k === 'plan' || m.k === 'solar', e = on && delta[m.k] !== undefined ? -delta[m.k] : m.s;
        return '<div style="' + FN.card + ';border-color:' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';padding:9px 12px;display:flex;gap:10px;align-items:center">' + FN.icon(I[0], on ? 'var(--c-sel)' : 'var(--c-ink2)') + '<div style="display:flex;flex-direction:column;gap:2px;flex:1"><b style="font-size:14px;font-weight:600">' + I[1] + '</b><span style="font-size:12px;color:var(--c-ink2)">' + (m.k === 'plan' ? (S.plan || 'Flat Rate') + ' · step 1' : m.k === 'solar' ? (S.measures.solar ? modsOf() : fillOf().n) + ' × 440 W · ' + FN.invFor(kwpOf()) + ' kW inverter · ' + FN.money(I[2]) : { hp: '270 L', ev: '7 kW', bat: '13.5 kWh LFP' }[m.k] + ' · ' + FN.money(I[2]) + ' · ' + (m.pay < 99 ? 'pays back ~' + m.pay.toFixed(1) + ' yrs' : 'needs solar')) + '</span>' + (m.k === 'solar' ? '<span style="font-size:11px;color:var(--c-sel)">after −' + FN.money(FN.stcSolar(kwpOf()) * FN.STC) + ' certificates</span>' : m.k === 'bat' ? '<span style="font-size:11px;color:var(--c-sel)">after −' + FN.money(FN.rebate(13.5)) + ' rebate · factor drops 1 Jan</span>' : '') + '<b style="font-size:12px;font-weight:600;color:' + (e >= 0 ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (e >= 0 ? 'saves ' : 'costs ') + FN.money(e) + ' a year' + (on ? '' : ' if added') + '</b></div>' +
          (fixed ? '<b style="font-size:12px;color:var(--c-sel)">in</b>' : '<button type="button" data-a="move" data-v="' + m.k + '" style="min-width:62px;min-height:38px;border-radius:19px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-live)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-live)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-onLive)') + ';font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + (on ? 'Added' : 'Add') + '</button>') + '</div>';
      }).join('') + '</div>';
      var R = FN.sim(opt(M)), h = st.hour;
      var EQ = st.view4 === 'eq';
      o += '<div style="position:absolute;left:384px;top:12px;right:12px;bottom:12px;' + FN.card + ';overflow:hidden"><div style="position:absolute;left:12px;top:12px;z-index:2;display:flex;background:var(--c-paper);border:1px solid var(--c-line);border-radius:9px;padding:3px">' + [['3d', 'Your home in 3D'], ['eq', 'Equipment & incentives']].map(function (c) { var on = (c[0] === 'eq') === EQ; return '<button type="button" data-a="view4" data-v="' + c[0] + '" style="min-height:32px;padding:0 12px;border:none;border-radius:7px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;font-weight:' + (on ? 600 : 400) + ';cursor:pointer">' + c[1] + '</button>'; }).join('') + '</div>' +
        (EQ ? eqPanel(M) : '<div style="position:absolute;right:12px;top:12px;z-index:2;display:flex;background:var(--c-paper);border:1px solid var(--c-line);border-radius:9px;padding:3px">' + [['3d', '3D · show'], ['top', 'Top · plan']].map(function (c) { var on = (c[0] === 'top') === st.top; return '<button type="button" data-a="cam" data-v="' + c[0] + '" style="min-height:32px;padding:0 10px;border:none;border-radius:7px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + c[1] + '</button>'; }).join('') + '</div>') +
'<div style="position:absolute;left:0;right:0;bottom:0;height:60px;border-top:1px solid var(--c-line2);display:flex;align-items:center;gap:14px;padding:0 14px;background:var(--c-paper)"><button type="button" data-a="play" aria-label="Play the day" style="min-width:40px;min-height:40px;border-radius:20px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">' + (timer ? '❚❚' : '▶') + '</button><b style="font-size:13px;min-width:44px">' + (h < 10 ? '0' : '') + h + ':00</b><input type="range" min="0" max="23" value="' + h + '" data-in="hour" aria-label="Hour of the day" style="width:180px;accent-color:var(--c-sel)"><span style="font-size:13px">Panels <b style="color:var(--c-sunText)">' + R.pv[h].toFixed(1) + ' kW</b></span><span style="font-size:13px">Home <b>' + R.load[h].toFixed(1) + ' kW</b></span><span style="font-size:13px">Battery <b style="color:var(--c-battery)">' + (M.bat ? Math.round(R.socs[h] * 100) + '%' : '—') + '</b></span></div>' + (H ? '' : '<div style="position:absolute;inset:0 0 60px 0;display:flex;align-items:center;justify-content:center;color:var(--c-ink2);font-size:14px">3D loading…</div>') + '</div>';
      return o;
    }
    function eqPanel(M) {
      var E = equipment(M), I = incentives(M), tot = I.reduce(function (a, r) { return a + r[2]; }, 0);
      var o = '<div style="position:absolute;inset:56px 14px 70px 14px;display:flex;flex-direction:column;gap:8px;overflow:auto">';
      o += '<b style="font-size:13px;font-weight:600">What goes on and in your home</b>' + (E.length ? E.map(function (r) { return '<div style="display:grid;grid-template-columns:28px 160px minmax(0,1fr) 110px;gap:10px;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--c-line2)">' + FN.icon(r[0], 'var(--c-sel)') + '<b style="font-weight:600">' + r[1] + '</b><span>' + r[2] + '<br><span style="color:var(--c-muted);font-size:11.5px">' + r[4] + '</span></span><span style="color:var(--c-ink2);text-align:right">' + r[3] + '</span></div>'; }).join('') : '<span style="font-size:12px;color:var(--c-muted)">Add a move to see its equipment.</span>');
      o += '<b style="font-size:13px;font-weight:600;margin-top:6px;display:flex;justify-content:space-between"><span>Incentives you can get</span><span style="color:var(--c-gain)">−' + FN.money(tot) + ' off the price</span></b>' + (I.length ? I.map(function (r) { return '<div style="display:grid;grid-template-columns:170px minmax(0,1fr) 90px;gap:10px;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--c-line2)"><b style="font-weight:600">' + r[0] + '</b><span>' + r[1] + '<br><span style="color:' + (r[4] ? 'var(--c-sunText)' : 'var(--c-muted)') + ';font-size:11.5px">' + r[3] + '</span></span><b style="text-align:right;font-weight:600;color:' + (r[2] ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (r[2] ? '−' + FN.money(r[2]) : 'to check') + '</b></div>'; }).join('') : '<span style="font-size:12px;color:var(--c-muted)">None yet.</span>');
      if (M.bat) o += '<div style="background:var(--c-sunSoft);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.45"><b>Timing matters.</b> The battery factor steps down every 1 January and 1 July: installed after 31 Dec 2026, this battery gets ' + FN.batteryCerts(13.5, 5.7) + ' certificates instead of ' + FN.batteryCerts(13.5, 6.8) + '. Eligible: 5–100 kWh, VPP-capable, one per meter.</div>';
      return o + '<span style="font-size:11px;color:var(--c-muted)">Certificates are usually deducted from the price by the installer. Australian rules of October 2026, spot price $39.90; illustrative.</span></div>';
    }
    // step 4 · share
    function stepShare() {
      var M = S.measures, w = ['solar ' + kwpOf().toFixed(2) + ' kWp']; if (M.bat) w.push('battery'); if (M.ev) w.push('car charger'); if (M.hp) w.push('heat pump');
      var o = '<div style="position:absolute;inset:12px;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:16px"><div style="' + FN.card + ';padding:20px;display:flex;flex-direction:column;gap:12px"><b style="font-size:22px;font-weight:600">Who installs it?</b>' +
        [['An installer I choose', 'You pick; they receive your home after you consent.'], ['Let Solar Designer propose', 'Matched on area and skills. You see who before they see you.'], ['Keep it for now', 'Saved in My home.']].map(function (n, i) { return '<button type="button" data-a="who" data-v="' + i + '" style="min-height:68px;border-radius:12px;border:1px solid ' + (st.next === i ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (st.next === i ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);text-align:left;padding:10px 14px;display:flex;flex-direction:column;gap:3px;font:inherit;cursor:pointer"><b style="font-size:15px;font-weight:600">' + n[0] + '</b><span style="font-size:13px;color:var(--c-muted)">' + n[1] + '</span></button>'; }).join('') + '</div>';
      o += '<div style="' + FN.card + ';border-color:var(--c-sel);padding:18px;display:flex;flex-direction:column;gap:10px;overflow-y:auto"><b style="font-size:16px;font-weight:600">Before anyone sees your home</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5"><b>Installer 1</b> (9 km, batteries) would receive:</span>' +
        [handed() ? ['Your site', siteOf(S.site)[1].toLowerCase() + ', confirmed by you, for the installer to design'] : ['Your roof', (S.roof === 'flat' ? 'flat roof confirmed, ' + FN.RACKS[rackOf()].en + ' racks' : FN.ROOFS[S.roof || 'hip'].pv.length + (FN.ROOFS[S.roof || 'hip'].pv.length > 1 ? ' faces' : ' face') + ' confirmed') + ', our drawing'], ['Your needs', '15 kWh a day, as totals · ' + badge()], ['Your draft', w.join(' · ')], ['Never', 'your meter readings, another installer’s proposal, a phone call you did not ask for']].map(function (r) { return '<span style="display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span style="color:var(--c-muted)">' + r[0] + '</span><b style="font-weight:600;text-align:right">' + r[1] + '</b></span>'; }).join('') +
        (function () { var V = FN.toVerify(S); return V.length ? '<span style="font-size:12px;color:var(--c-muted);margin-top:4px">Declared by you, confirmed by the installer on site</span>' + V.map(function (v) { return '<span style="display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:2px 0;border-bottom:1px solid var(--c-line2)"><span style="color:' + (v[2] ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + v[0] + '</span><span style="text-align:right;color:' + (v[2] ? 'var(--c-loss)' : 'var(--c-ink)') + '">' + v[1] + '</span></span>'; }).join('') : ''; })() +
        '<button type="button" data-a="share" style="margin-top:auto;min-height:48px;border-radius:10px;border:none;background:' + (S.shared ? 'var(--c-selSoft)' : 'var(--c-live)') + ';color:' + (S.shared ? 'var(--c-sel)' : 'var(--c-onLive)') + ';font:inherit;font-size:15px;font-weight:600;cursor:pointer">' + (S.shared ? 'Shared with Installer 1 ✓ · see the installer’s screen' : 'Share my home with Installer 1') + '</button></div></div>';
      return o;
    }
    // step 5 · the proposal, compared with our estimate
    // what the household can check in the proposal, against the same rules
    function checks(P) {
      var stc = FN.stcSolar(P.kwp), bc = P.bat ? FN.batteryCerts(P.bat) : 0, bc2 = P.bat ? FN.batteryCerts(P.bat, 5.7) : 0;
      var row = function (ok, k, v) { return '<div style="display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;font-size:12.5px;line-height:1.45;padding:5px 0;border-bottom:1px solid var(--c-line2)"><b style="color:' + (ok ? 'var(--c-gain)' : 'var(--c-sunText)') + '">' + (ok ? '✓' : '!') + '</b><span><b style="font-weight:600">' + k + '</b> · ' + v + '</span></div>'; };
      var r = '<b style="font-size:13px;font-weight:600;margin-top:6px">What we checked</b>';
      r += row(P.stc === stc, 'Solar certificates', P.stc + ' deducted; the rule gives floor(' + P.kwp.toFixed(2) + ' kWp × 1.382 × 5) = ' + stc + '.');
      if (P.bat) r += row(P.bc === bc, 'Battery certificates', P.bc + ' deducted, for ' + P.bat + ' kWh at factor 6.8.') + row(false, 'Install before 31 Dec 2026', 'from 1 January the factor drops to 5.7: ' + bc2 + ' certificates, ' + FN.money((bc - bc2) * FN.STC) + ' more to pay.');
      r += row(true, 'Equipment', (P.modW || 440) + ' W modules ' + ((P.modW || 440) === 440 ? 'as in your draft' : 'instead of 440 W in your draft') + '; ' + (P.inv || 6) + ' kW hybrid inverter, panels at ' + Math.round(P.kwp / (P.inv || 6) * 100) + ' % of it (limit 133 %); all CEC-listed.');
      return r;
    }
    function stepProposal() {
      var P = S.proposal, u = unc(), ours = FN.TODAY() - FN.sim(opt(S.measures)).total;
      if (!P) return '<div style="position:absolute;inset:12px;' + FN.card + ';border-style:dashed;display:flex;align-items:center;justify-content:center;color:var(--c-muted);font-size:15px">Waiting for Installer 1’s proposal: it designs on the installer’s screen.</div>';
      var gap = P.save - ours;
      var o = '<div style="position:absolute;inset:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">';
      // first the three numbers and the right to cancel; the quote itself one short section at a time; signing at the end
      var N = FN.SECTIONS.length, ks = FN.SECTIONS.map(function (x) { return x[0]; }), qi = ks.indexOf(st.qs);
      if (st.qopen) st.qseen[st.qs] = true;
      var seenN = Object.keys(st.qseen).length, allRead = seenN === N;
      var signBtn = '<button type="button" data-a="' + (allRead || S.signed ? 'sign' : 'qopen') + '" style="min-height:46px;border-radius:10px;border:' + (allRead || S.signed ? 'none' : '1px solid var(--c-line)') + ';background:' + (S.signed ? 'var(--c-selSoft)' : allRead ? 'var(--c-live)' : 'var(--c-paper2)') + ';color:' + (S.signed ? 'var(--c-sel)' : allRead ? 'var(--c-onLive)' : 'var(--c-ink)') + ';font:inherit;font-size:15px;font-weight:600;cursor:pointer">' + (S.signed ? 'Signed ✓ · frozen with its engine version' : allRead ? 'Sign' : seenN ? 'Read on to sign · ' + seenN + ' of ' + N : 'Read the quote: ' + N + ' short sections ›') + '</button>';
      o += '<div style="' + FN.card + ';border-color:var(--c-sel);padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-height:0">';
      if (!st.qopen) {
        // several options: side by side first, money first; the household reads and signs the one it picks (D-71)
        var OP = S.options || [P], L = 'ABC';
        if (OP.length > 1) o += '<span style="font-size:13px;color:var(--c-sel);font-weight:600">Installer 1 · ' + OP.length + ' options · pick one to read and sign</span><div role="radiogroup" aria-label="Options" style="display:grid;grid-template-columns:repeat(' + OP.length + ',minmax(0,1fr));gap:6px">' + OP.map(function (Q, k) {
          var on = (S.pick || 0) === k, lock = S.signed && !on;
          return '<button type="button" role="radio" aria-checked="' + on + '" data-a="qopt" data-v="' + k + '"' + (S.signed ? ' disabled' : '') + ' style="text-align:left;padding:8px 10px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;cursor:' + (S.signed ? 'default' : 'pointer') + ';opacity:' + (lock ? 0.5 : 1) + '"><b style="font-size:12px;color:var(--c-sel)">Option ' + L[k] + '</b><b style="display:block;font-size:15px;font-weight:600">' + FN.money(Q.total) + '</b><span style="display:block;font-size:11.5px;color:var(--c-gain);font-weight:600">saves ' + FN.money(Q.save * (1 - u / 100)) + '–' + FN.money(Q.save * (1 + u / 100)) + '/yr</span><span style="display:block;font-size:11px;color:var(--c-muted);line-height:1.3;margin-top:2px">' + FN.optLabel(Q) + '</span></button>';
        }).join('') + '</div>';
        o += '<span style="font-size:13px;color:var(--c-sel);font-weight:600">Installer 1 · proposal · Q-2026-0148' + (OP.length > 1 ? ' · option ' + L[S.pick || 0] : '') + '</span><b style="font-size:22px;font-weight:600">' + P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + '</b>' +
          [['You pay, after certificates', FN.money(P.total)], ['Savings, on your bill', FN.money(P.save * (1 - u / 100)) + '–' + FN.money(P.save * (1 + u / 100)) + ' a year'], ['Valid until', '7 Nov 2026']].map(function (r) { return '<span style="display:flex;justify-content:space-between;font-size:14px;padding:7px 0;border-bottom:1px solid var(--c-line2)"><span style="color:var(--c-muted)">' + r[0] + '</span><b style="font-weight:600">' + r[1] + '</b></span>'; }).join('') +
          '<div style="border:2px solid var(--c-sel);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;background:var(--c-selSoft);margin-top:4px"><b>Your right to cancel.</b> If you did not ask to be contacted, you can cancel within 10 business days of signing, without penalty. No payment and no work in that time.</div>' +
          '<span style="font-size:12.5px;color:var(--c-ink2);line-height:1.5;margin-top:4px">The quote holds ' + N + ' short sections: ' + FN.SECTIONS.map(function (x) { return x[1].toLowerCase(); }).join(', ') + '. Each opens with one line; the detail is under it.</span>' +
          '<div style="margin-top:auto;display:flex;flex-direction:column;gap:6px">' + signBtn + '</div>';
      } else {
        o += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:var(--c-sel);font-weight:600">Installer 1 · Q-2026-0148</span><button type="button" data-a="qclose" style="border:none;background:transparent;color:var(--c-muted);font:inherit;font-size:12px;cursor:pointer">Summary ›</button></div>' +
          '<div style="display:flex;gap:3px" role="list" aria-label="Sections read">' + ks.map(function (k, j) { return '<button type="button" data-a="qs" data-v="' + k + '" title="' + FN.SECTIONS[j][1] + '" aria-label="' + FN.SECTIONS[j][1] + '" style="flex:1;height:6px;border:none;border-radius:3px;padding:0;cursor:pointer;background:' + (j === qi ? 'var(--c-sel)' : st.qseen[k] ? 'var(--c-gain)' : 'var(--c-line2)') + ';opacity:' + (j === qi ? 1 : st.qseen[k] ? 0.55 : 1) + '"></button>'; }).join('') + '</div>' +
          '<span style="' + FN.kick + '">' + (qi + 1) + ' of ' + N + ' · ' + FN.SECTIONS[qi][1] + '</span><b style="font-size:15px;font-weight:600;line-height:1.35">' + FN.quoteLead(st.qs, P) + '</b>' +
          '<div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;padding-right:4px">' + FN.quoteSection(st.qs, P) + '</div>' +
          '<div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid var(--c-line2)"><button type="button" data-a="qprev" style="min-height:42px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">‹</button>' +
          (qi < N - 1 ? '<button type="button" data-a="qnext" style="flex:1;min-height:42px;border-radius:10px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-weight:600;cursor:pointer">Next: ' + FN.SECTIONS[qi + 1][1] + ' ›</button>' : '<div style="flex:1;display:flex;flex-direction:column">' + signBtn + '</div>') + '</div>';
      }
      o += '</div>';
      o += '<div style="' + FN.card + ';padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto"><span style="font-size:13px;color:var(--c-gain);font-weight:600">Our independent estimate</span><b style="font-size:22px;font-weight:600">' + FN.money(ours * (1 - u / 100)) + '–' + FN.money(ours * (1 + u / 100)) + ' a year</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">Same engine, same bill, same roof as the proposal. ' + (Math.abs(gap) < 60 ? 'The proposal matches it.' : gap > 0 ? 'The proposal saves ' + FN.money(gap) + ' more a year: it changed the system (' + (P.bat ? P.bat + ' kWh battery' : 'no battery') + ', ' + P.n + ' modules).' : 'The proposal saves ' + FN.money(gap) + ' less a year: ' + (P.n < 16 ? 'fewer modules (' + P.n + '), shade from the chimney' : 'a smaller battery or none') + '.') + '</span>' + checks(P) + FN.exportsCard('household') + '<span style="font-size:12px;color:var(--c-muted);margin-top:auto">If another installer had sent a proposal, it would sit here too; installers never see each other’s.</span></div></div>';
      return o;
    }
    function render() {
      sync();
      var s = st.step;
      q('.hh-top').innerHTML = FN.topbar(['My home', '14 Wattle Lane'], STEPS.map(function (l, i) { var ok = done(i) && i !== s, can = reach(i); return '<button type="button" data-a="go" data-v="' + i + '"' + (can ? '' : ' disabled') + ' style="min-height:36px;padding:0 12px;border:none;border-radius:7px;background:' + (i === s ? 'var(--c-paper)' : 'transparent') + ';color:' + (i === s ? 'var(--c-ink)' : can ? (ok ? 'var(--c-gain)' : 'var(--c-ink2)') : 'var(--c-faint)') + ';font:inherit;font-size:13px;font-weight:500;cursor:' + (can ? 'pointer' : 'default') + ';' + (i === s ? 'box-shadow:0 1px 2px rgba(29,32,38,.12)' : '') + '">' + (ok ? '✓ ' : (i + 1) + ' ') + l + (i === 5 && S.proposal && !S.signed ? ' · 1' : '') + '</button>'; }).join(''), '<span style="font-size:12px;color:var(--c-muted)">' + badge() + ' profile · ±' + unc() + ' %</span>' +
        '<button type="button" data-a="bell" aria-label="Notifications' + (S.proposal && !st.seen ? ', 1 new' : '') + '" style="width:40px;height:40px;border:none;border-radius:8px;background:' + (st.bell ? 'var(--c-line2)' : 'transparent') + ';color:var(--c-ink);cursor:pointer;position:relative"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"></path></svg>' + (S.proposal && !st.seen ? '<span style="position:absolute;top:7px;right:7px;width:15px;height:15px;border-radius:8px;background:var(--c-loss);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">1</span>' : '') + '</button>');
      // the proposal arrives: a banner until the household opens it, and the bell's list
      var note = '';
      if (S.proposal && !st.seen && st.step !== 4) note = '<div style="position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:12px;background:var(--c-tip);color:var(--c-paper);border-radius:12px;padding:10px 10px 10px 16px;box-shadow:0 10px 28px rgba(29,32,38,.25);font-size:14px"><span><b>Installer 1 sent you a proposal</b> · ' + P0() + '</span><button type="button" data-a="go" data-v="5" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:13px;font-weight:600;cursor:pointer">See it</button></div>';
      if (st.bell) note += '<div style="position:absolute;right:12px;top:52px;width:320px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:9;overflow:hidden"><b style="display:block;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--c-line2)">Notifications</b>' +
        (S.proposal ? '<button type="button" data-a="go" data-v="4" style="display:flex;gap:10px;width:100%;text-align:left;padding:10px 12px;border:none;border-bottom:1px solid var(--c-line2);background:' + (st.seen ? 'transparent' : 'var(--c-selSoft)') + ';color:var(--c-ink);font:inherit;font-size:12px;line-height:1.45;cursor:pointer"><span style="width:3px;border-radius:2px;background:var(--c-live)"></span><span><b style="font-weight:600">Installer 1 sent you a proposal</b><br><span style="color:var(--c-ink2)">' + P0() + ' · compare it with our estimate</span></span></button>' : '') +
        (S.shared ? '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--c-line2);font-size:12px;line-height:1.45"><span style="width:3px;border-radius:2px;background:var(--c-sel)"></span><span><b style="font-weight:600">Installer 1 received your home</b><br><span style="color:var(--c-ink2)">roof, needs as totals and your draft</span></span></div>' : '') +
        (!S.proposal && !S.shared ? '<span style="display:block;padding:12px;font-size:12px;color:var(--c-muted)">Nothing yet. You will hear here when an installer answers.</span>' : '') + '</div>';
      if (st.spendOpen) note += progressPanel();
      q('.hh-prog').innerHTML = progressCard();
      q('.hh-note').innerHTML = note;
      q('.hh-body').innerHTML = [stepEnergy, stepRoof, stepNext, stepShare, stepProposal][s]();
      var canNext = (s === 2 ? filled() : s === 1 ? filled() : done(s)) && s < 4 && (s === 2 || reach(s + 1));
      var need = ['Pick a plan to go on', !S.site ? 'Confirm the site first' : handed() ? 'Share it below' : 'Confirm the faces, then fill', 'Next', 'Share to go on', ''][s];
      q('.hh-foot').innerHTML = '<button type="button" data-a="back"' + (s ? '' : ' disabled') + ' style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:' + (s ? 'var(--c-ink)' : 'var(--c-faint)') + ';font:inherit;cursor:pointer">Back</button><span style="flex:1;font-size:13px;color:var(--c-ink2)">' + ['Pick the plan you take; your bill makes the ranking yours.', !S.site ? 'Confirm what this site is; a house goes on to its roof.' : handed() ? 'An installer designs this site: share it with one.' : (FN.ROOFS[S.roof || 'hip'].pv.length > 1 ? 'Confirm the three faces, then fill the north face.' : S.roof === 'flat' ? 'Confirm the roof, compare the rack layouts, then fill it.' : 'Confirm the north face, then fill it.'), 'Add what you want; each move shows its effect on top of the others.', 'Name who receives your home, then share.', S.proposal ? 'Read the proposal, then sign.' : 'The installer works on its own screen.'][s] + '</span>' +
        (s < 4 ? '<button type="button" data-a="next"' + (canNext ? '' : ' disabled') + ' style="min-width:170px;min-height:44px;padding:0 18px;border-radius:10px;border:none;background:' + (canNext ? 'var(--c-live)' : 'var(--c-line)') + ';color:' + (canNext ? 'var(--c-onLive)' : 'var(--c-ink2)') + ';font:inherit;font-size:14px;font-weight:600;cursor:' + (canNext ? 'pointer' : 'default') + '">' + (canNext ? 'Next · ' + STEPS[s + 1] : need) + '</button>' : '');
      var box = q('.hh-3d'); box.style.display = s === 2 && st.view4 !== 'eq' ? 'block' : 'none'; box.style.top = '157px'; box.style.left = '385px'; box.style.width = '782px'; box.style.height = '526px';
      if (H) { H.size(782, 526); if (H.setHome(S.home)) Object.keys(S.eqPos).forEach(function (k) { H.placeEq(k, S.eqPos[k]); }); H.setRoof(S.roof || 'hip'); H.setPanels(S.measures.solar ? (S.layout || []) : []); H.bat.visible = S.measures.bat; H.car.visible = S.measures.ev; H.hp.visible = S.measures.hp; H.carport.visible = S.measures.solar && hasZone('carport'); H.setHour(st.hour); equipUpdate(); H.useTop = st.top; }
    }
    FN.wire(el, function (a, v) {
      var P = st.prof;
      if (a === 'bell') { st.bell = !st.bell; render(); return; }
      if (a === 'spend') { st.spendOpen = !st.spendOpen; render(); return; }
      var fk = a === 'plan' ? 'plan' : a === 'keep' ? 'solar' : a === 'move' ? v : '';
      if (fk) { st.flash = fk; clearTimeout(st.ft); st.ft = setTimeout(function () { st.flash = ''; render(); }, 1300); }
      if (a === 'go') { st.step = +v; st.bell = false; st.spendOpen = false; if (+v === 4 && S.proposal) st.seen = true; }
      else if (a === 'next') { st.step++; st.max = Math.max(st.max, st.step); }
      else if (a === 'back') st.step = Math.max(0, st.step - 1);
      else if (a === 'plan') { st.chosen = v; S.measures.plan = v !== 'Flat Rate'; st.lens = 'price'; }
      else if (a === 'lens') st.lens = v;
      else if (a === 'openG') { st.openG = st.openG === v ? '' : v; st.lens = 'use'; }
      else if (a === 'src') { if (v === 'meter') P.consent = true; else if (v === 'bill') { P.busy = 'Reading your bill…'; clearTimeout(tBusy); tBusy = setTimeout(function () { P.busy = ''; P.bill = true; render(); changed(); }, 700); } else P.q = true; }
      else if (a === 'consent') { P.consent = false; P.busy = 'open-energy is reading 12 months of your meter…'; clearTimeout(tBusy); tBusy = setTimeout(function () { P.busy = ''; P.meter = true; render(); changed(); }, 900); }
      else if (a === 'noconsent') P.consent = false;
      else if (a === 'ans') { var p = v.split('|'); P.ans[p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; st.lens = 'use'; var nx = GROUPS.filter(function (g) { return P.ans[g[0]] === undefined; })[0]; st.openG = nx ? nx[0] : ''; }
      else if (a === 'season') st.season = v;
      else if (a === 'face') { if (FN.ROOFS[S.roof].pv.indexOf(v) >= 0 && !st.conf[v]) st.conf[v] = true; else if (st.tool === 'fill' && v === 'N' && !filled()) st.preview = true; }
      else if (a === 'rackMode') { S.flatMode = v; if (filled()) { var F = fillOf(); S.layout = F.mods; S.kwp = F.n * 0.44; } }
      else if (a === 'roof') { if (v !== S.roof) { S.roof = v; st.conf = {}; st.preview = false; S.measures.solar = false; S.layout = null; S.kwp = 0; st.tool = 'confirm'; S.flatMode = null; S.zones = []; } }
      else if (a === 'home') { if (v !== (S.home || 'rect')) { S.home = v; S.eqPos = FN.EQPOS(S); S.ok = {}; } }
      else if (a === 'tool') { st.tool = v; st.preview = false; }
      else if (a === 'siteSel') st.siteSel = v;
      else if (a === 'zoneAdd') { S.zones = (S.zones || []).concat([{ k: v, n: ZONES[v].n }]); }
      else if (a === 'zoneDel') { S.zones = S.zones.filter(function (z, i) { return i !== +v; }); }
      else if (a === 'zoneN') { var zp = v.split('|'), zz = S.zones[+zp[0]]; zz.n = Math.max(2, Math.min(40, zz.n + (+zp[1]))); }
      else if (a === 'siteOk') S.site = st.siteSel;
      else if (a === 'siteRe') { S.site = ''; st.siteSel = 'house'; }
      else if (a === 'handover') { st.step = 3; st.max = Math.max(st.max, 3); }
      else if (a === 'keep') { var F0 = fillOf(); S.measures.solar = true; S.layout = F0.mods; S.kwp = F0.n * 0.44; st.preview = false; }
      else if (a === 'move') S.measures[v] = !S.measures[v];
      else if (a === 'cam') st.top = v === 'top';
      else if (a === 'view4') st.view4 = v;
      else if (a === 'hour') st.hour = +v;
      else if (a === 'play') { if (timer) { clearInterval(timer); timer = null; } else timer = setInterval(function () { st.hour = (st.hour + 1) % 24; render(); }, 650); }
      else if (a === 'who') st.next = +v;
      else if (a === 'share') { if (!S.shared) { S.shared = true; S.sharedAt = 'today'; } }
      else if (a === 'sign') { if (S.proposal) { S.signed = true; S.pick = S.pick || 0; } }
      else if (a === 'qopt') { if (S.options && !S.signed) { S.pick = +v; S.proposal = S.options[S.pick]; } }
      else if (a === 'qopen') { st.qopen = true; var ks = FN.SECTIONS.map(function (x) { return x[0]; }); st.qs = ks.filter(function (k) { return !st.qseen[k]; })[0] || st.qs; }
      else if (a === 'qclose') st.qopen = false;
      else if (a === 'qs') { st.qopen = true; st.qs = v; }
      else if (a === 'qnext' || a === 'qprev') { var ks2 = FN.SECTIONS.map(function (x) { return x[0]; }), j = ks2.indexOf(st.qs); st.qs = ks2[Math.max(0, Math.min(ks2.length - 1, j + (a === 'qnext' ? 1 : -1)))]; }
      else if (a === 'export') { if (S.proposal) FN.exportQuote(v, S.proposal); return; }
      render(); changed();
    });
    render();
    // step 3 · the equipment on the walls of the 3D home: each label is a handle that slides its unit along
    // the walls; cables follow the walls the shorter way round, their lengths estimated (D-72), and the
    // rules are drawn as checks: AS/NZS 5139's battery zones, the charger's 5 m tethered cable
    var EQD = FN.EQD;
    function eqOn(k) { return FN.eqOn(S, k); }
    function wires() { return FN.wires(S); }
    function checks() { return FN.checks(S); }
    var lay = null, card = null, chips = {}, leads = {}, drag = null, v3 = null;
    function equipLayer() {
      var bx = q('.hh-3d');
      lay = doc.createElement('div'); lay.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:500 12px/1.2 Inter,system-ui,sans-serif';
      card = doc.createElement('div'); card.style.cssText = 'position:absolute;left:12px;top:52px;width:228px;pointer-events:auto;' + FN.card + ';padding:8px 10px;font-size:11px;line-height:1.4';
      bx.appendChild(lay); bx.appendChild(card);
      Object.keys(EQD).forEach(function (k) {
        var c = doc.createElement('button'); c.type = 'button'; c.textContent = EQD[k].n;
        c.setAttribute('aria-label', EQD[k].n + ': drag along the walls, or use the arrow keys');
        c.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;padding:3px 8px;border-radius:999px;border:1px solid var(--c-line);background:var(--c-paper);color:var(--c-ink);font:inherit;pointer-events:auto;cursor:grab;touch-action:none;box-shadow:0 1px 3px rgba(20,24,30,.16)';
        c.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); c.setPointerCapture(ev.pointerId); drag = k; c.style.cursor = 'grabbing'; });
        c.addEventListener('pointermove', function (ev) { if (drag === k) slideTo(k, ev); });
        c.addEventListener('pointerup', function () { drag = null; c.style.cursor = 'grab'; });
        c.addEventListener('keydown', function (ev) { var dv = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key]; if (!dv) return; ev.preventDefault(); moveEq(k, S.eqPos[k].w, S.eqPos[k].s + dv * (ev.shiftKey ? 0.5 : 0.1)); });
        chips[k] = c; lay.appendChild(c);
      });
      leads = smLeaders(lay, Object.keys(EQD));
      H.onRender = placeChips;
    }
    function moveEq(k, w, s) {
      var a = FN.eqFit(H.wallsL, k, { w: w, s: s }); if (!a) return;
      S.eqPos[k] = { w: a.w, s: Math.round(a.s * 20) / 20 };
      H.placeEq(k, S.eqPos[k]); equipUpdate();
    }
    function slideTo(k, ev) {
      var T = H.T, cv = q('.hh-canvas'), rc = cv.getBoundingClientRect(), d = EQD[k];
      var ray = new T.Raycaster(), hit = new T.Vector3();
      ray.setFromCamera(new T.Vector2((ev.clientX - rc.left) / rc.width * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1), H.camNow());
      if (!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -(d.y0 + d.H / 2)), hit)) return;
      var best = null;
      H.wallsL.forEach(function (wl, i) {
        var t = (hit.x - wl.a[0]) * wl.dx + (hit.z - wl.a[1]) * wl.dz, tc = Math.max(0, Math.min(wl.L, t)), dd = Math.hypot(hit.x - (wl.a[0] + wl.dx * tc), hit.z - (wl.a[1] + wl.dz * tc));
        if (!best || dd < best.d) best = { w: i, s: tc, d: dd };
      });
      if (best) moveEq(k, best.w, best.s);
    }
    function placeChips() {
      if (!lay) return;
      var T = H.T, cam = H.camNow(), cv = q('.hh-canvas'), look = new T.Vector3(), placed = [], todo = []; cam.getWorldDirection(look); v3 = v3 || new T.Vector3();
      var bad = {}; checks().forEach(function (c) { if (c.bad) bad[c.k] = true; });
      var px = function (p) { v3.set(p[0], p[1], p[2]).project(cam); return [(v3.x + 1) / 2 * cv.clientWidth, (1 - v3.y) / 2 * cv.clientHeight]; };
      Object.keys(chips).forEach(function (k) {
        var c = chips[k], L = leads[k], P = S.eqPos[k], d = EQD[k], wl = H.wallsL[P.w], show = st.step === 2 && st.view4 !== 'eq' && !st.top && eqOn(k) && (wl.nx * look.x + wl.nz * look.z < 0.05 || drag === k);
        c.style.display = show ? '' : 'none'; L.show(show); if (!show) return;
        // the dot on the unit's face; the label goes out on the side the wall faces on screen
        var y = d.y0 + d.H * 0.6, a = px(smAt(H.wallsL, P.w, P.s, k === 'hp' ? 0.45 : 0.25, y)), n = px(smAt(H.wallsL, P.w, P.s, 2, y));
        todo.push({ k: k, a: a, side: n[0] >= a[0] ? 1 : -1 });
      });
      // the highest units first, so the labels below climb past them rather than across them
      todo.sort(function (p, q2) { return p.a[1] - q2.a[1]; }).forEach(function (t) {
        var c = chips[t.k], col = bad[t.k] ? 'var(--c-loss)' : drag === t.k ? 'var(--c-sel)' : 'var(--c-ink)';
        smCallout(c, leads[t.k].line, leads[t.k].dot, t.a[0], t.a[1], t.side, col, placed);
        c.style.background = bad[t.k] ? 'var(--c-loss)' : 'var(--c-paper)'; c.style.color = bad[t.k] ? '#FFFFFF' : 'var(--c-ink)';
      });
    }
    function equipUpdate() {
      if (!H || !lay) return;
      var W = wires(), C = checks(), on = st.step === 2 && st.view4 !== 'eq' && W.length > 0;
      H.setCables(st.step === 2 ? W : []);
      card.style.display = on ? '' : 'none';
      if (on) card.innerHTML = '<b style="font-weight:600;font-size:12px">Cables, estimated along the walls</b>' +
        W.map(function (w) { return '<span style="display:flex;justify-content:space-between;gap:8px"><span><i style="display:inline-block;width:12px;height:4px;border-radius:2px;vertical-align:2px;margin-right:6px;background:' + w.color + '"></i>' + w.name + '</span><b style="font-weight:600">' + w.len.toFixed(1) + ' m</b></span>'; }).join('') +
        '<span style="display:flex;justify-content:space-between;border-top:1px solid var(--c-line2);margin-top:3px;padding-top:3px"><span>Total</span><b style="font-weight:600">' + W.reduce(function (a, w) { return a + w.len; }, 0).toFixed(1) + ' m</b></span>' +
        C.map(function (c) { return '<span style="display:block;margin-top:4px;color:' + (c.bad ? 'var(--c-loss)' : 'var(--c-ink2)') + '">' + c.t + '</span>'; }).join('') +
        '<span style="display:block;margin-top:4px;color:var(--c-muted);font-size:11px">Drag a label along the walls; the installer confirms on site.</span>';
      placeChips();
    }
    FN.three(q('.hh-canvas'), function (h3) { H = h3; H.radius = 40; H.place(); Object.keys(S.eqPos).forEach(function (k) { H.placeEq(k, S.eqPos[k]); }); equipLayer(); render(); });
    FN.draw.load(function () { render(); changed(); });
    return { render: render };
  };

  all('figure.bk-widget[data-widget="journey"]').forEach(function (fig) {
    FN.when(fig, function () {
      var F = FN.frames(fig), S = { plan: '', profile: { badge: 'Estimated', unc: 30 }, measures: { plan: false, solar: false, hp: false, ev: false, bat: false }, shared: false, opened: false, sharedAt: '', proposal: null, signed: false, roof: 'hip', home: 'rect', kwp: 0, layout: null, site: '', zones: [], eqPos: FN.EQPOS('rect') };
      var hh = null, ins = {};
      function band() {
        var fr = F.fr, t = S.signed ? (fr ? '↑ Proposition signée · le site garde la trace du système à poser' : '↑ Proposal signed · the site keeps a record of the system to install')
          : S.proposal ? (fr ? '↑ Proposition envoyée · elle arrive sur le site du ménage, étape 5' : '↑ Proposal sent · it lands on the household’s site, step 5')
          : S.shared ? (fr ? '↓ Site partagé · il arrive dans la boîte de l’installateur' : '↓ Site shared · it lands in the installer’s inbox')
          : (fr ? 'Le ménage avance étape par étape ; à l’étape 4, il partage son site avec l’installateur.' : 'The household moves step by step; at step 4 it shares its site with the installer.');
        F.band.innerHTML = '<span class="' + (S.shared ? 'on' : '') + '">' + t + '</span>';
      }
      function changed() { band(); if (ins.render) ins.render(); if (hh) hh.render(); }
      hh = FN.household(F.a, S, function () { band(); if (ins.render) ins.render(); });
      FN.studio(F.b, { site: S, api: ins, onChange: function () { band(); hh.render(); } });
      band();
    });
  });
  /* ---------- the quote: one document, read by both screens of the journey (design/funnels) ---------- */
  // The installer builds it in the studio's Proposal tab, the household reads and signs it at step 5.
  // Its sections follow what an Australian quote must carry (design/funnels, the quote): the
  // cooling-off rights on the front page, itemised products with their specifications and
  // warranties, the layout, the single-line diagram, the expected output and its limits, the
  // certificate deductions and separate solar and battery paybacks. Parties, numbers and products
  // are placeholders. The exports are real files built from the same data.

  // illustrative datasheets, keyed by the catalogue's wattages
  FN.SPEC = {
    400: { model: 'MONO-400 · 108 half-cells', voc: 37.1, vmp: 31.0, isc: 13.7, eff: '20.5 %', warranty: '12-year product, 25-year performance (84 %)' },
    440: { model: 'MONO-440 · 108 half-cells', voc: 39.6, vmp: 33.2, isc: 14.0, eff: '22.0 %', warranty: '25-year product, 30-year performance (87 %)' },
    475: { model: 'NTYPE-475 · 120 half-cells', voc: 42.4, vmp: 35.5, isc: 14.2, eff: '23.0 %', warranty: '25-year product, 30-year performance (89 %)' }
  };
  FN.SECTIONS = [['cover', 'Cover and your rights'], ['system', 'System and layout'], ['measures', 'Roof plan and measurements'], ['notes', 'Installer’s notes'], ['equipment', 'Equipment'], ['wiring', 'Wiring'], ['savings', 'Performance and savings'], ['price', 'Price and incentives'], ['terms', 'Warranties and terms']];
  var MONTH = [1.24, 1.14, 1.02, 0.86, 0.72, 0.64, 0.70, 0.86, 1.02, 1.14, 1.22, 1.27];

  // the offer from a design: lines, costs, certificates and the figures every section needs
  FN.offer = function (d) {
    var mod = FN.CAT.modules.filter(function (m) { return m.w === d.modW; })[0], inv = FN.CAT.inverters.filter(function (x) { return x.kw === d.inv; })[0];
    // d.n counts every module priced: the roof's (d.nRoof) and those of the zones the installer confirmed (d.zones)
    var zs = d.zones || [], nRoof = d.nRoof != null ? d.nRoof : d.n, cp = zs.some(function (z) { return z.k === 'carport'; });
    var c = { modules: d.n * mod.price * 1.18, inverter: inv.price * 1.18, battery: d.bat ? (1100 + 790 * d.bat) * 1.18 : 0, charger: d.ev ? 1400 * 1.18 : 0, install: (1800 + 60 * d.n) * 1.18, carport: cp ? FN.CAT.structures.carport.price * 1.18 : 0 };
    var stc = FN.stcSolar(d.kwp), bc = d.bat ? FN.batteryCerts(d.bat) : 0;
    var lines = zs.length ? [[nRoof + ' × ' + mod.name + ', on the roof', 'price list', nRoof * mod.price * 1.18]].concat(zs.map(function (z) { return [z.n + ' × ' + mod.name + ', on the ' + FN.ZONENAME[z.k], 'price list', z.n * mod.price * 1.18]; })) : [[d.n + ' × ' + mod.name, 'price list', c.modules]];
    if (cp) lines.push([FN.CAT.structures.carport.name, 'price list', c.carport]);
    lines.push([inv.name + ' inverter', 'price list', c.inverter]);
    if (d.bat) lines.push([d.bat + ' kWh battery, LFP, VPP-ready', 'price list', c.battery]);
    if (d.ev) lines.push(['Car charger, 7 kW', 'price list', c.charger]);
    lines.push(['Installation and design', 'price list', c.install], [stc + ' solar certificates (STC)', 'open-energy', -stc * FN.STC]);
    if (d.bat) lines.push([bc + ' battery certificates', 'open-energy', -FN.rebate(d.bat)]);
    // on racks, FN.sim gets the kWp that gives the variant's own yield (chapter 6)
    var kw = d.simKwp != null ? d.simKwp : d.eff;
    var o = { plan: 'best', kwp: kw, ev: d.ev, hp: d.hp }, solo = FN.sim(o), withB = d.bat ? FN.sim({ plan: 'best', kwp: kw, ev: d.ev, hp: d.hp, cap: d.bat }) : solo;
    var self = function (r) { var pv = 0, ex = 0; for (var h = 0; h < 24; h++) { pv += r.pv[h]; ex += r.exp[h]; } return pv ? (pv - ex) / pv : 0; };
    var solarSave = FN.TODAY() - solo.total - (d.ev ? 2044 : 0) - (d.hp ? 520 : 0), batSave = d.bat ? solo.total - withB.total : 0;
    var p = {}; for (var k in d) p[k] = d[k];
    p.nRoof = nRoof; p.zones = zs; p.mod = mod; p.invP = inv; p.cost = c; p.stc = stc; p.bc = bc; p.lines = lines; p.total = lines.reduce(function (a, l) { return a + l[2]; }, 0);
    p.self0 = self(solo); p.self1 = self(withB); p.solarSave = solarSave; p.batSave = batSave;
    p.payS = (c.modules + c.carport + c.inverter + c.install - stc * FN.STC) / Math.max(solarSave, 1); p.payB = d.bat ? (c.battery - FN.rebate(d.bat)) / Math.max(batSave, 1) : 0;
    return p;
  };

  // an option of a proposal in a few words: the rack layout on a flat roof, the modules, the battery (D-71)
  FN.optLabel = function (P) {
    return (P.rack && FN.RACKS[P.rack] ? FN.RACKS[P.rack].en + ' · ' : '') + P.n + ' × ' + P.modW + ' W · ' + P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : ', no battery');
  };
  // the site behind a proposal: its type, the zones the household added, its categories, and the cable runs
  // estimated along the walls from where the units stand, measured again on site before the work (D-72, D-73)
  FN.offerSite = function (P) {
    var S = P.site; if (!S || !S.measures) return null;
    var names = { house: 'House', units: 'Apartment building', business: 'Business site', carpark: 'Car park', other: 'Other site' };
    return { type: names[S.site || 'house'], zones: S.zones || [], cats: FN.siteCats(S, P.kwp, P.inv, P.zok), wires: FN.wires(S), ok: S.ok || {}, pos: S.eqPos || FN.EQPOS(S), names: FN.home(S).D.names };
  };
  FN.cableLen = function (P, id) { var X = FN.offerSite(P), w = X && X.wires.filter(function (w) { return w.id === id; })[0]; return w ? w.len : null; };
  // strings, checked hot and cold against the inverter's window (80 V start, 600 V maximum): the roof alone
  // is split over the two MPPT inputs; with the zones the installer confirmed, the roof keeps input 1 and the
  // zones, at another tilt, share input 2. A group longer than a string can be is cut into equal strings in parallel
  FN.strings = function (P) {
    var s = FN.SPEC[P.modW], cold = s.voc * (1 + 0.0026 * 25), hot = s.vmp * (1 - 0.0034 * 45), max = Math.floor(600 / cold), isc = s.isc * 1.25;
    var zs = P.zones || [], nRoof = P.nRoof != null ? P.nRoof : P.n, list = [];
    var cut = function (n, from, inp) { var k = Math.max(1, Math.ceil(n / max)), b = Math.floor(n / k), r = n % k; for (var i = 0; i < k; i++) list.push({ input: typeof inp === 'function' ? inp(i) : inp, from: from, n: b + (i < r ? 1 : 0) }); };
    if (!zs.length) { var k0 = Math.max(2, Math.ceil(nRoof / max)), b0 = Math.floor(nRoof / k0), r0 = nRoof % k0; for (var i0 = 0; i0 < k0; i0++) list.push({ input: i0 % 2 + 1, from: 'roof', n: b0 + (i0 < r0 ? 1 : 0) }); }
    else { cut(nRoof, 'roof', 1); zs.forEach(function (z) { cut(z.n, FN.ZONENAME[z.k], 2); }); }
    list.forEach(function (x, i) { x.id = i + 1; x.voc = x.n * cold; x.vmp = x.n * hot; x.ok = x.voc < 600 && x.vmp > 80; });
    var inputs = [1, 2].map(function (k) { var L = list.filter(function (x) { return x.input === k; }), ns = L.map(function (x) { return x.n; }); return { input: k, strings: L.length, isc: L.length * isc, matched: ns.every(function (n) { return n === ns[0]; }) }; });
    return { list: list, inputs: inputs, max: max, cold: cold, hot: hot, isc: isc, vocMax: Math.max.apply(null, list.map(function (x) { return x.voc; })), vmpMin: Math.min.apply(null, list.map(function (x) { return x.vmp; })), split: list.length > 2, matched: inputs.every(function (x) { return x.matched; }), ok: list.every(function (x) { return x.ok; }) };
  };

  // the single-line diagram, AS/NZS 5033 on the DC side, AS/NZS 4777.1 at the grid, AS/NZS 5139 for the battery
  FN.sld = function (P, ink, line, soft) {
    ink = ink || '#1D2026'; line = line || '#9C958A'; soft = soft || '#F3F1EC';
    var S = FN.strings(P), box = function (x, y, w, h, t, sub) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + soft + '" stroke="' + ink + '"></rect><text x="' + (x + w / 2) + '" y="' + (y + h / 2 - (sub ? 3 : -4)) + '" font-size="12" font-weight="600" text-anchor="middle" fill="' + ink + '">' + t + '</text>' + (sub ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 12) + '" font-size="10" text-anchor="middle" fill="' + ink + '" opacity=".75">' + sub + '</text>' : ''); };
    var wire = function (d, lab, lx, ly) { return '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="1.6"></path>' + (lab ? '<text x="' + lx + '" y="' + ly + '" font-size="9.5" fill="' + ink + '" opacity=".7">' + lab + '</text>' : ''); };
    // one box a string, stacked on the left, each wired to its MPPT input (1 above, 2 below)
    var N = S.list.length, bh = N > 2 ? 34 : 46, step = N > 2 ? 42 : 64, ty = Math.max(170, 20 + (N - 1) * step + bh + 22), H = Math.max(300, ty + 30);
    var o = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 640 ' + H + '" font-family="Inter, system-ui, sans-serif" style="flex-shrink:0" role="img" aria-label="Single-line diagram of the system">';
    var L = function (id) { var v = FN.cableLen(P, id); return v ? ' · ≈ ' + v.toFixed(1) + ' m' : ''; };
    S.list.forEach(function (x, i) { var y = 20 + i * step; o += box(10, y, 150, bh, 'String ' + x.id + ' · input ' + x.input, x.n + ' × ' + P.modW + ' W · ' + x.from + ' · ' + Math.round(x.voc) + ' V') + wire('M160 ' + (y + bh / 2) + ' H190 V' + (x.input === 1 ? 64 : 86) + ' H210', i ? '' : 'DC 4 mm²' + L('dc'), 164, y + bh / 2 - 6); });
    o += box(210, 52, 80, 46, 'DC isolator', '2-pole · 600 V') + wire('M290 75 H330', '', 0, 0);
    o += box(330, 40, 120, 70, P.inv + ' kW hybrid', '2 MPPT · AS/NZS 4777.2') + (P.bat ? wire('M390 110 V160', 'DC battery cable' + L('bat'), 396, 140) + box(330, 160, 120, 46, P.bat + ' kWh battery', 'LFP · AS/NZS 5139') : '');
    o += wire('M450 75 H480', 'AC 6 mm²' + L('ac'), 452, 69) + box(480, 52, 70, 46, 'AC isolator', '') + wire('M550 75 H570 V150', '', 0, 0);
    o += box(500, 150, 130, 50, 'Main switchboard', 'solar main switch · RCBO') + (P.ev ? wire('M500 190 H470 V250', L('ev') ? 'charger' + L('ev') : '', 404, 236) + box(400, 250, 120, 40, 'Car charger', '7 kW · own RCBO') : '');
    o += wire('M565 200 V230', '', 0, 0) + box(530, 230, 70, 34, 'Meter', 'import / export') + wire('M565 264 V284 H620', 'grid · export limit 5 kW', 540, 296);
    o += '<text x="10" y="' + ty + '" font-size="10" fill="' + ink + '" opacity=".75">Cold Voc ' + Math.round(S.vocMax) + ' V ' + (S.vocMax < 600 ? '&lt;' : '&gt;') + ' 600 V · hot Vmp ' + Math.round(S.vmpMin) + ' V ' + (S.vmpMin > 80 ? '&gt;' : '&lt;') + ' 80 V · ' + (S.ok ? 'strings fit' : 'check the strings') + (S.matched ? '' : ' · unequal strings share an input') + '</text>';
    o += '<text x="10" y="' + (ty + 16) + '" font-size="10" fill="' + ink + '" opacity=".75">Voltage rise 0.9 % · earthing per AS/NZS 3000 · labels per AS/NZS 5033</text>';
    return o + '</svg>';
  };

  // where the modules stand, in a few words: the roof, then each zone the installer confirmed
  FN.whereMods = function (P) {
    var zs = P.zones || []; if (!zs.length) return P.n + ' modules on the north face';
    return P.n + ' modules: ' + P.nRoof + ' on the north face, ' + zs.map(function (z) { return z.n + ' on the ' + FN.ZONENAME[z.k]; }).join(', ');
  };
  // what each section says in one line: read first, the detail under it
  FN.quoteLead = function (key, P) {
    var u = (P.unc || 12) / 100;
    return { cover: 'You can cancel within 10 business days. ' + P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + ' for ' + FN.money(P.total) + '.',
      system: FN.whereMods(P) + '; ' + Math.round(P.kwp / P.inv * 100) + ' % of a ' + P.inv + ' kW inverter.',
      measures: 'Measured on site: a 15.00 × 10.00 m ' + FN.ROOFS[P.roof || 'hip'].en.toLowerCase() + ' roof at ' + FN.ROOFS[P.roof || 'hip'].pitch + '°; the array takes ' + FN.arrayBox(P).w.toFixed(2) + ' × ' + FN.arrayBox(P).h.toFixed(2) + ' m.',
      notes: (P.notes || []).length + ' things the installer saw on site and what was done about them.',
      equipment: 'Every product itemised, CEC-listed, with its warranty.',
      wiring: (function (S) { return ['', 'One string', 'Two strings', 'Three strings', 'Four strings', 'Five strings', 'Six strings'][S.list.length] || S.list.length + ' strings'; })(FN.strings(P)) + (FN.strings(P).ok ? ', inside the inverter\'s voltage window, hot and cold.' : ': one falls outside the inverter\'s voltage window, to fix before the work.'),
      savings: Math.round(P.kwh).toLocaleString('en-AU') + ' kWh a year; ' + FN.money(P.save * (1 - u)) + '–' + FN.money(P.save * (1 + u)) + ' off your bills.',
      price: FN.money(P.total) + ' after ' + FN.money(P.stc * FN.STC + (P.bat ? FN.rebate(P.bat) : 0)) + ' of certificates, GST included.',
      terms: 'Warranties, timeline, paperwork, and who to call.' }[key];
  };
  // the array's extent on the plan, in metres (the plan draws 40 px a metre)
  FN.arrayBox = function (P) {
    var m = P.mods || []; if (!m.length) return { w: 0, h: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
    var x0 = Math.min.apply(null, m.map(function (r) { return r.x; })), x1 = Math.max.apply(null, m.map(function (r) { return r.x + r.w; })), y0 = Math.min.apply(null, m.map(function (r) { return r.y; })), y1 = Math.max.apply(null, m.map(function (r) { return r.y + r.h; }));
    return { w: (x1 - x0) / 40, h: (y1 - y0) / 40 / Math.cos(22 * Math.PI / 180), x0: x0, y0: y0, x1: x1, y1: y1 };
  };
  // the measurement plan: the roof as measured, with its dimension lines and the array
  FN.measurePlan = function (P) {
    var A = FN.arrayBox(P), dim = function (x1, y1, x2, y2, t, tx, ty, rot) { return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="var(--c-ink)" stroke-width="1.2" marker-start="url(#qa)" marker-end="url(#qa)"></path><text x="' + tx + '" y="' + ty + '" font-size="15" text-anchor="middle" fill="var(--c-ink)"' + (rot ? ' transform="rotate(-90 ' + tx + ' ' + ty + ')"' : '') + '>' + t + '</text>'; };
    var o = '<svg width="100%" height="230" viewBox="120 90 800 540" role="img" aria-label="Roof plan with its measurements"><defs><marker id="qa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="var(--c-ink)"></path></marker></defs>';
    var R = FN.ROOFS[P.roof || 'hip'], obs = P.obstacles || [], c = Math.cos(R.pitch * Math.PI / 180), rings = FN.draw.compute(P.roof || 'hip', obs.map(function (x) { return { type: x.type, x: Math.round(x.x), y: Math.round(x.y) }; }), 'portrait').rings;
    o += Object.keys(R.faces).map(function (k) { return '<path d="' + R.faces[k] + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') + '" stroke="var(--c-roofLine)"></path>'; }).join('');
    o += '<path d="' + FN.draw.path(rings) + '" fill="none" fill-rule="evenodd" stroke="var(--c-sel)" stroke-dasharray="6 5"></path>';
    o += (P.mods || []).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" fill="#2B3A4A" opacity=".55"></rect>'; }).join('');
    obs.forEach(function (x) { o += FN.draw.shapes(P.roof || 'hip', x, false); var Tq = FN.OBST[x.type]; o += '<text x="' + (x.x + 26) + '" y="' + (x.y + 5) + '" font-size="13" fill="var(--c-ink)">' + Tq.en.toLowerCase() + (x.h > 0.2 ? ', ' + x.h.toFixed(2) + ' m high' : '') + '</text>'; });
    o += dim(218, 120, 818, 120, '15.00 m eave', 518, 110) + dim(R.ridge[0], R.ridge[1] + 24, R.ridge[2], R.ridge[3] + 24, (R.pv.length > 1 || R.depth < 10 ? 'ridge ' : 'high edge ') + R.ridgeLen.toFixed(2) + ' m', (R.ridge[0] + R.ridge[2]) / 2, R.ridge[1] + 44) + dim(860, 156, 860, R.ridge[1], R.depth.toFixed(2) + ' m plan · ' + (R.depth / c).toFixed(2) + ' m on the slope', 885, (156 + R.ridge[1]) / 2, true) + dim(150, 156, 150, 556, '10.00 m', 135, 356, true);
    if (A.w) o += dim(A.x0, A.y1 + 30, A.x1, A.y1 + 30, 'array ' + A.w.toFixed(2) + ' m', (A.x0 + A.x1) / 2, A.y1 + 52);
    o += '<text x="234" y="166" font-size="13" fill="var(--c-sel)">0.40 m setback</text><text x="518" y="610" font-size="14" text-anchor="middle" fill="var(--c-muted)">N ↑ · eave height 3.0 m · pitch ' + R.pitch + '° · tape and inclinometer, 30 Oct 2026</text>';
    return o + '</svg>';
  };

  // one section of the quote, as HTML in the screen's colours
  FN.quoteSection = function (key, P) {
    var row = function (k, v, strong) { return '<div style="display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr);gap:12px;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--c-line2)"><span style="color:var(--c-muted)">' + k + '</span><span style="' + (strong ? 'font-weight:600' : '') + '">' + v + '</span></div>'; };
    var h = function (t) { return '<b style="font-size:13px;font-weight:600;margin-top:8px">' + t + '</b>'; };
    var spec = FN.SPEC[P.modW], u = (P.unc || 12) / 100, o = '';
    if (key === 'cover') {
      o += '<div style="border:2px solid var(--c-sel);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;background:var(--c-selSoft)"><b>Your right to cancel.</b> If you did not ask us to contact you, this is an unsolicited agreement: you can cancel it within 10 business days of signing, for any reason and without penalty. We will not take payment or start work in that time.</div>';
      o += h('Quote') + row('Number', 'Q-2026-0148 · 31 Oct 2026') + row('Valid until', '7 Nov 2026 · prices and certificate values of the day') + row('For', 'The household · 14 Wattle Lane, Marrickville NSW 2204') + row('Meter', 'NMI 4103 •••• ••• · network Ausgrid');
      o += h('Who you deal with') + row('Retailer', 'Installer 1 Pty Ltd · ABN 00 000 000 000 · NETCC Approved Seller') + row('Designer', 'SAA-accredited · accreditation S-0000000 · signs the design statement') + row('Installer', 'SAA-accredited · licensed electrician · issues the safety certificate') + row('Contact', 'one named person for the whole job · 1300 000 000');
      o += h('In one line') + row('System', P.kwp.toFixed(2) + ' kWp solar' + (P.bat ? ' + ' + P.bat + ' kWh battery' : '') + (P.ev ? ' + car charger' : ''), true) + row('Price after certificates', FN.money(P.total) + ', GST included', true) + row('Savings, on your bill', FN.money(P.save * (1 - u)) + '–' + FN.money(P.save * (1 + u)) + ' a year');
    } else if (key === 'system') {
      o += '<svg width="100%" height="200" viewBox="150 120 740 470" role="img" aria-label="Layout of the modules on your roof">' + Object.keys(FN.ROOFS[P.roof || 'hip'].faces).map(function (k) { return '<path d="' + FN.ROOFS[P.roof || 'hip'].faces[k] + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') + '" stroke="var(--c-roofLine)"></path>'; }).join('') + (P.mods || []).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="#2B3A4A" stroke="#55667A"></rect>'; }).join('') + '<text x="518" y="580" font-size="16" text-anchor="middle" fill="var(--c-muted)">N ↑ · our drawing from LiDAR, checked on site 30 Oct 2026</text></svg>';
      var zsP = P.zones || [];
      o += row('Array', (zsP.length ? P.nRoof + ' × ' + P.modW + ' W = ' + (P.nRoof * P.modW / 1000).toFixed(2) + ' kWp' : P.n + ' × ' + P.modW + ' W = ' + P.kwp.toFixed(2) + ' kWp') + ', north face, ' + FN.ROOFS[P.roof || 'hip'].pitch + '° tilt, azimuth 0°', true);
      zsP.forEach(function (z) { o += row(z.k === 'carport' ? 'Carport' : 'Custom zone', z.n + ' × ' + P.modW + ' W = ' + (z.n * P.modW / 1000).toFixed(2) + ' kWp, ' + (z.k === 'carport' ? 'on a new steel carport over the driveway, 5° pitch' : 'where you marked it') + '; confirmed on site, its tilt and azimuth measured before the work', true); });
      if (zsP.length) o += row('In all', P.n + ' modules, ' + P.kwp.toFixed(2) + ' kWp; the zones counted at the roof\'s yield per kWp until measured');
      o += row('Roof', 'concrete tile, single storey · setbacks 0.40 m from every edge') + row('Mounting', 'rail kit for wind region A, terrain category 3, per AS/NZS 1170.2') + row('Shade', P.shaded ? P.shaded + ' modules shaded by the chimney in winter mornings' : 'no shading object on the north face') + row('Inverter sizing', 'panels at ' + Math.round(P.kwp / P.inv * 100) + ' % of the inverter (limit 133 %)') + row('Export limit', '5 kW, set by the network at pre-approval');
      var X = FN.offerSite(P);
      if (X) {
        o += h('Your site') + row('Site', X.type.toLowerCase() + ', confirmed by you' + (X.zones.length ? '; ' + X.zones.map(function (z, i) { return (z.k === 'carport' ? 'a carport' : 'a custom zone') + ' of ' + z.n + ' modules, ' + ((P.zok ? P.zok[i] : z.ok) ? 'confirmed on site and priced here' : 'priced once checked on site'); }).join('; ') : ''));
        o += row('Capacity on the site', X.cats.kwp.toFixed(2) + ' kWp summed over the roof and every zone · ' + X.cats.kva + ' kVA inverter') + row('Certificates', X.cats.support) + row('Planning', X.cats.planning) + row('Network connection', X.cats.connection);
      }
    } else if (key === 'measures') {
      var A = FN.arrayBox(P);
      o += FN.measurePlan(P) + row('Roof', (function (R) { return R.en.toLowerCase() + ' roof, 15.00 × 10.00 m outside the gutters, ' + R.say + ', eave 3.0 m above the ground'; })(FN.ROOFS[P.roof || 'hip'])) + row('North face', (function (R) { var c = Math.cos(R.pitch * Math.PI / 180); return (P.roof || 'hip') === 'hip' ? 'trapezoid 15.00 m at the eave, 7.50 m at the ridge, ' + (R.depth / c).toFixed(2) + ' m along the slope at ' + R.pitch + '°' : 'rectangle 15.00 m at the eave, ' + (R.depth / c).toFixed(2) + ' m along the slope at ' + R.pitch + '°'; })(FN.ROOFS[P.roof || 'hip'])) + row('Array', A.w.toFixed(2) + ' × ' + A.h.toFixed(2) + ' m on the slope, inside the 0.40 m setbacks') + row('Checked against', 'the LiDAR faces (fit 0.91): within 6 cm on every edge');
    } else if (key === 'notes') {
      o += (P.notes || []).map(function (n) { return '<div style="display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--c-line2)"><b style="color:' + (n[2] ? 'var(--c-sunText)' : 'var(--c-sel)') + '">' + (n[2] ? '!' : '•') + '</b><span><b style="font-weight:600">' + n[0] + '</b> · ' + n[1] + '</span></div>'; }).join('') || '<span style="font-size:12.5px;color:var(--c-muted)">No note yet.</span>';
    } else if (key === 'equipment') {
      var it = [['Solar modules', P.n + ' × ' + spec.model, P.modW + ' W, ' + spec.eff + ' efficient, Voc ' + spec.voc + ' V, Isc ' + spec.isc + ' A', spec.warranty],
        ['Inverter', P.invP.name + ' · HYB-' + P.inv + 'K', '2 MPPT inputs, 80–550 V, max 600 V DC; AS/NZS 4777.2, CSIP-AUS ready', '10-year product'],
        P.bat ? ['Battery', 'LFP ' + P.bat + ' kWh · BAT-' + P.bat, 'usable ' + P.bat + ' kWh, 5 kW, AS/NZS 5139, VPP-capable', '10 years or 70 % capacity'] : null,
        P.ev ? ['Car charger', 'EVC-7 · single phase', '7 kW, solar-follow mode, own RCBO', '3-year product'] : null,
        ['Mounting', 'RAIL-A tile kit', 'certified for wind region A, AS/NZS 1170.2' + ((P.zones || []).some(function (z) { return z.k === 'custom'; }) ? '; the custom zone\'s mounting chosen once its surface is checked' : ''), '15-year product'],
        (P.zones || []).some(function (z) { return z.k === 'carport'; }) ? ['Carport', 'CARPORT-1 · steel frame, one bay', 'four posts, 5° pitch, rails for 8 modules; engineered for wind region A, AS/NZS 1170.2', 'builder\'s structural warranty', 'building approval and engineering to come'] : null,
        ['Protection', 'DC isolator, AC isolator, solar main switch', 'per AS/NZS 5033 and AS/NZS 3000', 'covered by workmanship']].filter(Boolean);
      o += it.map(function (r) { return '<div style="display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:10px;font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--c-line2)"><b style="font-weight:600">' + r[0] + '</b><span>' + r[1] + '<br><span style="color:var(--c-muted);font-size:11.5px">' + r[2] + '</span></span><span style="font-size:11.5px;color:var(--c-ink2)">' + r[3] + '<br>' + (r[4] ? '<span style="color:var(--c-sunText)">' + r[4] + '</span>' : '<span style="color:var(--c-gain)">✓ CEC-listed, not expired</span>') + '</span></div>'; }).join('');
      o += '<span style="font-size:11.5px;color:var(--c-muted);margin-top:6px">Brands and models are placeholders in this prototype; the real quote names each manufacturer and its Australian warranty contact.</span>';
    } else if (key === 'wiring') {
      var s = FN.strings(P);
      o += FN.sld(P, 'var(--c-ink)', 'var(--c-line)', 'var(--c-paper2)');
      o += row('Strings', s.list.map(function (x) { return x.n; }).join(' + ') + ' modules on two MPPT inputs' + (s.split ? '; at most ' + s.max + ' modules a string stay under 600 V cold, so ' + ((P.zones || []).length ? 'the roof keeps input 1 and the zones, at another tilt, share input 2' : 'the roof is cut into equal strings in parallel') : ''), true);
      o += s.list.map(function (x) { return row('String ' + x.id + ' · input ' + x.input, x.n + ' × ' + P.modW + ' W on the ' + (x.from === 'roof' ? 'north face' : x.from) + ' · ' + Math.round(x.voc) + ' V cold, ' + Math.round(x.vmp) + ' V hot ' + (x.ok ? '✓' : '✗ outside 80–600 V')); }).join('');
      o += row('Cold open-circuit voltage', Math.round(s.vocMax) + ' V at 0 °C on the longest string, ' + (s.vocMax < 600 ? 'under the 600 V maximum ✓' : 'over the 600 V maximum ✗')) + row('Hot operating voltage', Math.round(s.vmpMin) + ' V at 70 °C cell on the shortest string, ' + (s.vmpMin > 80 ? 'above the 80 V start ✓' : 'under the 80 V start ✗'));
      o += row('DC current', s.isc.toFixed(1) + ' A design current per string; ' + s.inputs.map(function (x) { return 'input ' + x.input + ' ' + x.strings + (x.strings > 1 ? ' strings in parallel, ' : ' string, ') + x.isc.toFixed(1) + ' A'; }).join('; ') + '; 4 mm² solar cable') + (s.matched ? '' : row('Matching', 'strings of different lengths share an input: the installer evens them out or fits optimisers on site')) + row('AC side', '6 mm² to the switchboard, voltage rise 0.9 % (limit 2 %)') + row('Standards', 'AS/NZS 5033 (DC), AS/NZS 4777.1 (grid connection), AS/NZS 5139 (battery), AS/NZS 3000 (wiring rules)');
      var XW = FN.offerSite(P);
      if (XW && XW.wires.length) o += h('Cable runs') + XW.wires.map(function (w) { return row(w.name, '≈ ' + w.len.toFixed(1) + ' m, of which ' + w.vert.toFixed(1) + ' m vertical; ' + FN.EQD[w.to].n.toLowerCase() + ' on the ' + XW.names[XW.pos[w.to].w] + ' wall' + (XW.ok[w.to] ? ', confirmed on site' : '')); }).join('') + row('Total', '≈ ' + XW.wires.reduce(function (a, w) { return a + w.len; }, 0).toFixed(1) + ' m, estimated along the walls from where the units stand; measured again before the work', true);
    } else if (key === 'savings') {
      var max = 1.3, bars = MONTH.map(function (f, i) { var v = P.kwh / 365 * f, hh = f / max * 80; return '<rect x="' + (30 + i * 46) + '" y="' + (96 - hh) + '" width="30" height="' + hh + '" rx="3" fill="var(--c-sun)" opacity=".8"></rect><text x="' + (45 + i * 46) + '" y="' + (90 - hh) + '" font-size="10" text-anchor="middle" fill="var(--c-ink)">' + v.toFixed(0) + '</text><text x="' + (45 + i * 46) + '" y="112" font-size="10" text-anchor="middle" fill="var(--c-muted)">' + 'JFMAMJJASOND'[i] + '</text>'; }).join('');
      o += '<span style="font-size:12px;color:var(--c-muted)">Average daily kWh by month, as the SAA design gives it</span><svg width="100%" height="118" viewBox="0 0 590 118">' + bars + '</svg>';
      o += row('Yearly output', Math.round(P.kwh).toLocaleString('en-AU') + ' kWh, after losses', true) + row('Used in your home', Math.round(P.self0 * 100) + ' % of the solar without battery' + (P.bat ? ', ' + Math.round(P.self1 * 100) + ' % with it' : '')) + row('Savings, on your bill', FN.money(P.save * (1 - u)) + '–' + FN.money(P.save * (1 + u)) + ' a year', true) + row('Solar payback', P.payS.toFixed(1) + ' years, on its own') + (P.bat ? row('Battery payback', P.payB.toFixed(1) + ' years, counted apart from the solar') : '') + row('Assumptions', 'your ' + (P.badge || 'estimated').toLowerCase() + ' profile, ±' + (P.unc || 12) + ' %; your new plan; sunshine varies ±8 % year to year; the car charger is left out of the paybacks') + row('Limitations', 'an estimate, not a guarantee: output depends on weather, shade, tariffs and how you use energy');
    } else if (key === 'price') {
      o += P.lines.map(function (l) { return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 100px 100px;gap:10px;font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span>' + l[0] + '</span><span style="color:var(--c-muted)">' + l[1] + '</span><b style="text-align:right;font-weight:600;color:' + (l[2] < 0 ? 'var(--c-gain)' : 'var(--c-ink)') + '">' + (l[2] < 0 ? '−' : '') + FN.money(l[2]) + '</b></div>'; }).join('');
      o += '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;padding:8px 0">You pay, GST included<span>' + FN.money(P.total) + '</span></div>';
      if ((P.zones || []).length) o += row('Your zones', P.zones.map(function (z) { return z.n + ' modules on the ' + FN.ZONENAME[z.k]; }).join(', ') + ', confirmed on site and priced at the roof\'s module price, installation counted per module');
      if (P.cost.carport) o += row('Carport structure', 'from our price list, like every line here: a steel single-bay frame with its engineering, from a builder at our usual margin; an illustrative figure in this prototype, confirmed once the council approves the structure');
      o += row('Solar certificates', 'floor(' + P.kwp.toFixed(2) + ' kWp × 1.382 zone rating × 5 deeming years) = ' + P.stc + ' STCs × $39.90') + (P.bat ? row('Battery certificates', P.bat + ' kWh by tier (full to 14 kWh, 60 % to 28) × factor 6.8 = ' + P.bc + ' × $39.90; factor 5.7 from 1 Jan 2027, so install before then') : '') + row('Who claims', 'we claim the certificates as your agent and take them off the price; you assign them when you sign') + row('Payment', '10 % deposit after the cooling-off period, the rest on commissioning; no payment before the network pre-approval') + row('Extra costs', 'none expected: the switchboard was checked on site and needs no upgrade; any change is quoted and agreed in writing before work');
    } else if (key === 'terms') {
      o += h('Warranties') + row('Modules', spec.warranty) + row('Inverter', '10-year product') + (P.bat ? row('Battery', '10 years or 70 % of its capacity') : '') + row('Workmanship', '10 years, from us, on top of the product warranties') + row('Claims', 'call us first; we handle the manufacturer, who has an Australian contact');
      o += h('How it happens') + row('Network', 'we apply for pre-approval (about 5–10 business days) and arrange the meter') + row('Installation', 'one day on site, by an SAA-accredited installer') + row('Paperwork', 'electrical safety certificate, design and installer statements to the CER, handover manual') + row('Your data', 'your site and this quote stay in your account; you choose who sees them') + row('Disputes', 'NETCC complaint process, then the energy ombudsman of your state');
    }
    return o;
  };

  // files: built in the browser from the same data, in standard formats
  FN.download = function (name, type, text) { var a = doc.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  FN.exportQuote = function (kind, P) {
    if (kind === 'bom') { var rows = [['item', 'model', 'quantity', 'unit', 'price_aud_incl_gst']], sp = FN.SPEC[P.modW]; rows.push(['solar module', sp.model, P.n, 'each', (P.cost.modules / P.n).toFixed(2)]); if (P.cost.carport) rows.push(['carport structure', 'CARPORT-1 · steel, one bay (illustrative price)', 1, 'each', P.cost.carport.toFixed(2)]); rows.push(['hybrid inverter', 'HYB-' + P.inv + 'K', 1, 'each', P.cost.inverter.toFixed(2)]); if (P.bat) rows.push(['battery', 'BAT-' + P.bat, 1, 'each', P.cost.battery.toFixed(2)]); if (P.ev) rows.push(['car charger', 'EVC-7', 1, 'each', P.cost.charger.toFixed(2)]); var XB = FN.offerSite(P); if (XB) XB.wires.forEach(function (w) { rows.push(['cable run · ' + w.name.toLowerCase(), 'estimated along the walls', w.len.toFixed(1), 'm', 'in installation']); }); rows.push(['installation and design', '', 1, 'job', P.cost.install.toFixed(2)], ['solar certificates (STC)', '', P.stc, 'certificate', (-FN.STC).toFixed(2)]); if (P.bat) rows.push(['battery certificates', '', P.bc, 'certificate', (-FN.STC).toFixed(2)]); FN.download('Q-2026-0148-bom.csv', 'text/csv', rows.map(function (r) { return r.map(function (c) { return /[",]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n') + '\n'); }
    if (kind === 'sld') FN.download('Q-2026-0148-single-line.svg', 'image/svg+xml', FN.sld(P));
    if (kind === 'json') FN.download('Q-2026-0148.json', 'application/json', JSON.stringify({ quote: 'Q-2026-0148', date: '2026-10-31', validUntil: '2026-11-07', site: (function () { var X = FN.offerSite(P), o = { address: '14 Wattle Lane, Marrickville NSW 2204', network: 'Ausgrid' }; if (X) { o.type = X.type; o.zones = X.zones; o.categories = { kwp: +X.cats.kwp.toFixed(2), support: X.cats.support, planning: X.cats.planning, connection: X.cats.connection }; o.equipment = X.pos; o.cables = X.wires.map(function (w) { return { circuit: w.id, m: +w.len.toFixed(1), vertical: +w.vert.toFixed(1), estimated: true }; }); } return o; })(), design: { modules: { count: P.n, watts: P.modW, kwp: +P.kwp.toFixed(2), tilt: 22, azimuth: 0, roof: P.nRoof != null ? P.nRoof : P.n, zones: (P.zones || []).map(function (z) { return { zone: z.k, count: z.n, confirmedOnSite: true }; }) }, structures: P.cost.carport ? [{ item: 'carport', aud: +P.cost.carport.toFixed(2), illustrative: true }] : [], inverterKw: P.inv, batteryKwh: P.bat, carCharger: !!P.ev, strings: FN.strings(P) }, yieldKwh: Math.round(P.kwh), lines: P.lines.map(function (l) { return { item: l[0], source: l[1], aud: +l[2].toFixed(2) }; }), totalAud: +P.total.toFixed(2), certificates: { stc: P.stc, battery: P.bc, spotAud: FN.STC }, engine: 'open-energy (prototype)' }, null, 2));
    if (kind === 'print') { var w = window.open('', '_blank'); if (!w) return; var t = FN.tokens(), css = ':root{' + FN.vars(t) + '}body{font:13px/1.45 Inter,system-ui,sans-serif;color:#1D2026;max-width:760px;margin:24px auto;padding:0 16px}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}div,span{box-sizing:border-box}'; w.document.write('<!doctype html><meta charset="utf-8"><title>Quote Q-2026-0148</title><style>' + css + '</style><h1 style="font-size:20px">Quote Q-2026-0148 · 14 Wattle Lane</h1>' + FN.SECTIONS.map(function (s) { return '<h2>' + s[1] + '</h2><div style="display:flex;flex-direction:column">' + FN.quoteSection(s[0], P) + '</div>'; }).join('')); w.document.close(); w.focus(); w.print(); }
  };
  // the exports card, shared by both screens
  FN.exportsCard = function (who) {
    var b = function (k, t, f) { return '<button type="button" data-a="export" data-v="' + k + '" style="display:flex;justify-content:space-between;align-items:center;min-height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:12.5px;cursor:pointer"><span>' + t + '</span><span style="font-size:11px;color:var(--c-muted)">' + f + '</span></button>'; };
    return '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:6px"><b style="font-size:13px;font-weight:600">Files</b>' + b('print', 'Quote, to print or save', 'PDF') + b('sld', 'Single-line diagram', 'SVG') + (who === 'installer' ? b('bom', 'Bill of materials', 'CSV') + b('json', 'Design and quote data', 'JSON') + '<span style="font-size:11px;color:var(--c-muted);line-height:1.4">From the API later: PDF/A with the data embedded, the diagram in DXF, the certificate claim for the REC Registry, the network application.</span>' : '') + '</div>';
  };
  /* ---------- the studio's drawing: roof types, obstacles and studio-draw (design/funnels, design/editor-tools) ---------- */
  // The prototypes draw the plan at 40 px a metre, north up, the north face's eave on y = 156. studio-draw
  // works in the face's own plane (u along the eave, v up the slope, metres): FN.draw converts both ways,
  // calls the WebAssembly when the site has it (mise run wasm) and falls back to a small JavaScript fill
  // otherwise. Geometry and counts only (ADR-001): the shade drawn behind tall obstacles is illustrative.

  // roof types: their faces in plan, the north face as studio-draw sees it (edge kinds: 0 eave, 1 ridge,
  // 2 hip, 4 rake, 6 flat-roof edge), its pitch, how heights rise (to a ridge, or one plane rising to the
  // south) for the edge typing, and how the 3D scene builds it
  FN.ROOFS = {
    hip: { en: 'Hip', fr: 'Croupe', pitch: 22, depth: 5, ridgeLen: 7.5, faces: { N: 'M218 156 L818 156 L668 356 L368 356 Z', S: 'M218 556 L818 556 L668 356 L368 356 Z', W: 'M218 156 L368 356 L218 556 Z', E: 'M818 156 L668 356 L818 556 Z' },
      north: [[218, 156, 0], [818, 156, 2], [668, 356, 1], [368, 356, 2]], ridge: [368, 356, 668, 356], pv: ['N', 'W', 'E'], say: 'four faces, three that can take panels' },
    gable: { en: 'Gable', fr: 'Deux pans', pitch: 22, depth: 5, ridgeLen: 15, faces: { N: 'M218 156 L818 156 L818 356 L218 356 Z', S: 'M218 556 L818 556 L818 356 L218 356 Z' },
      north: [[218, 156, 0], [818, 156, 4], [818, 356, 1], [218, 356, 4]], ridge: [218, 356, 818, 356], pv: ['N'], say: 'two faces and two gable ends, the north face takes the panels' },
    skillion: { en: 'Skillion', fr: 'Monopente', pitch: 10, depth: 10, ridgeLen: 15, faces: { N: 'M218 156 L818 156 L818 556 L218 556 Z' },
      north: [[218, 156, 0], [818, 156, 4], [818, 556, 1], [218, 556, 4]], ridge: [218, 556, 818, 556], rise: 'slope', pv: ['N'], say: 'one face rising to the south, low eave on the north' },
    flat: { en: 'Flat', fr: 'Plat', pitch: 1, depth: 10, ridgeLen: 15, faces: { N: 'M218 156 L818 156 L818 556 L218 556 Z' },
      north: [[218, 156, 6], [818, 156, 6], [818, 556, 6], [218, 556, 6]], ridge: [218, 556, 818, 556], rise: 'slope', pv: ['N'], say: 'a flat roof with a 1° fall: modules stand on tilted racks' }
  };
  // obstacle types: shape (0 rectangle a × b, 1 disc of radius a, 2 dormer polygon), keep-out margin (round join, §4.6), height above the roof
  FN.OBST = {
    chimney: { en: 'Chimney', icon: 'chimney', shape: 0, a: 0.60, b: 0.60, margin: 0.30, h: 1.00, fill: '#8C7462', line: '#5E4B3E' },
    skylight: { en: 'Skylight', icon: 'skylight', shape: 0, a: 0.78, b: 1.18, margin: 0.30, h: 0.15, fill: '#BFD4E6', line: '#5E7A93' },
    antenna: { en: 'Antenna', icon: 'antenna', shape: 1, a: 0.08, b: 0, margin: 0.30, h: 2.50, fill: '#6F7780', line: '#3F454C' },
    box: { en: 'Box (AC)', icon: 'box', shape: 0, a: 1.00, b: 0.70, margin: 0.30, h: 0.80, fill: '#B6BBC2', line: '#616870' },
    vent: { en: 'Cylinder (vent)', icon: 'cylinder', shape: 1, a: 0.10, b: 0, margin: 0.20, h: 0.60, fill: '#9AA1A9', line: '#5B6068' },
    prism: { en: 'Polygon (dormer)', icon: 'prism', shape: 0, a: 1.20, b: 1.10, margin: 0.30, h: 1.50, fill: '#A99C8E', line: '#6A5F54' }
  };
  FN.SETBACK = 0.4;
  // the market pack the prototypes stand in: Australia. Its shading rule sizes the racks' row gap (D-70)
  FN.PACK = { place: 'Adelaide', lat: -34.93, rule: '9-15', flatZone: 0.5 };
  // FN.sim's yield: 4.0 kWh per kWp a day
  FN.YIELD = 1460;
  // the rack variants of a flat roof (chapter 6, §6.6): tilt, studio-draw's mode, PVGIS yield on the Adelaide
  // roof in kWh/kWp, and an illustrative ballast per module [I] (the frame maker's calculator decides, §6.9)
  FN.RACKS = {
    eq10: { en: 'Equator 10°', tilt: 10, mode: 0, yield: 1504, kg: 35 },
    eq20: { en: 'Equator 20°', tilt: 20, mode: 0, yield: 1570, kg: 62 },
    ew10: { en: 'East–west 10°', tilt: 10, mode: 1, yield: 1393, kg: 23 }
  };
  FN.RULES = { '9-15': ['9 am–3 pm', 0], '10-14': ['10 am–2 pm', 1], noon: ['Solar noon', 2] };
  FN.MOD = { portrait: [1.134, 1.722], landscape: [1.722, 1.134] };

  FN.draw = { fn: null, fnEdges: null, fnRacks: null, ms: 0, live: false, wait: [] };
  FN.draw.load = function (done) {
    if (FN.draw.fn) { if (done) done(); return; }
    if (done) FN.draw.wait.push(done);
    if (FN.draw.loading) return;
    FN.draw.loading = true;
    var t0 = performance.now();
    import(BASE + 'wasm/studio_draw_wasm.js').then(function (mod) {
      return mod.default({ module_or_path: BASE + 'wasm/studio_draw_wasm_bg.wasm' }).then(function () {
        FN.draw.fn = mod.layout;
        FN.draw.fnEdges = mod.classify_edges;
        FN.draw.fnRacks = mod.layout_flat_racks;
        FN.draw.live = true; FN.draw.ms = performance.now() - t0; FN.draw.cache = {};
      });
    }).catch(function () { FN.draw.live = false; }).then(function () { var w = FN.draw.wait; FN.draw.wait = []; w.forEach(function (f) { f(); }); });
  };

  // plan px <-> the face's own plane, for a roof type
  FN.draw.toFace = function (R, x, y) { return [(x - 218) / 40, (y - 156) / 40 / Math.cos(R.pitch * Math.PI / 180)]; };
  FN.draw.toPlan = function (R, u, v) { return [218 + u * 40, 156 + v * 40 * Math.cos(R.pitch * Math.PI / 180)]; };
  // where a point sits on the face: distances along the slope to the eave and to the ridge (or high edge), and inside or not
  FN.draw.where = function (type, x, y) {
    var R = FN.ROOFS[type], p = FN.draw.toFace(R, x, y), top = R.depth / Math.cos(R.pitch * Math.PI / 180);
    return { u: p[0], v: p[1], eave: p[1], ridge: top - p[1], inside: FN.draw.inside(R.north, x, y) };
  };
  FN.draw.inside = function (poly, x, y) {
    var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
    return c;
  };

  // the layout of the north face: modules as plan rectangles, the usable area's rings, the count. A flat roof
  // takes rack options ({ mode, rule }) instead of a variant. Results are kept by their inputs: the variant
  // cards ask for three layouts at every render
  FN.draw.compute = function (type, obstacles, variant, rackOpt) {
    var R = FN.ROOFS[type] || FN.ROOFS.hip, flat = type === 'flat', key = JSON.stringify([type, obstacles, flat ? rackOpt : variant, !!FN.draw.fn]);
    var C = FN.draw.cache || (FN.draw.cache = {});
    if (C[key]) return C[key];
    if (Object.keys(C).length > 64) C = FN.draw.cache = {};
    return (C[key] = flat ? FN.draw.computeFlat(R, obstacles, rackOpt || {}) : FN.draw.fn ? FN.draw.wasm(R, obstacles, variant) : FN.draw.js(R, type, obstacles, variant));
  };
  // the three rack variants of a flat roof, each laid out by studio-draw under the rule, most energy first:
  // modules, kWp, kWh a year from the chapter 6 yields, and the kWp FN.sim needs to give that energy
  FN.draw.rackVariants = function (obstacles, rule) {
    return Object.keys(FN.RACKS).map(function (id) {
      var K = FN.RACKS[id], d = FN.draw.compute('flat', obstacles || [], null, { mode: id, rule: rule || FN.PACK.rule }), kwp = d.n * 0.44;
      return { id: id, label: K.en, n: d.n, kwp: kwp, kwh: kwp * K.yield, simKwp: kwp * K.yield / FN.YIELD, geom: d.geom, err: d.err, yield: K.yield };
    }).sort(function (a, b) { return b.kwh - a.kwh; });
  };

  // racks on the flat roof (chapter 6): studio-draw lays them out from the sun under the pack's rule; without
  // the WebAssembly, rows of the chapter's Adelaide 9 am–3 pm geometry fill the same usable area
  FN.draw.computeFlat = function (R, obstacles, opt) {
    var id = FN.RACKS[opt.mode] ? opt.mode : 'eq10', K = FN.RACKS[id], rule = FN.RULES[opt.rule] ? opt.rule : FN.PACK.rule;
    var face = [], obs = [], z = FN.PACK.flatZone, t0 = performance.now();
    R.north.forEach(function (p) { var f = FN.draw.toFace(R, p[0], p[1]); face.push(f[0], f[1], p[2]); });
    obstacles.forEach(function (o) { var T = FN.OBST[o.type] || FN.OBST.chimney, c = FN.draw.toFace(R, o.x, o.y); obs.push(T.shape, c[0], c[1], T.a, T.b, T.margin); });
    var mod = function (u0, v0, u1, v1, i) {
      var a = FN.draw.toPlan(R, u0, v0), b = FN.draw.toPlan(R, u1, v1);
      return { id: u0.toFixed(2) + ',' + v0.toFixed(2), x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]), tilt: K.tilt, mode: id, facing: K.mode ? (i % 2 ? 'E' : 'W') : 'N' };
    };
    if (FN.draw.fnRacks) {
      var r;
      try {
        r = FN.draw.fnRacks(new Float64Array(face), new Float64Array([z, z, z, z, z]), new Float64Array(obs),
          new Float64Array([1.722, 1.134, 0.02, FN.PACK.lat, K.mode, K.tilt, K.mode ? 0.30 : FN.RULES[rule][1]]));
      } catch (e) { return { mods: [], rings: [], n: 0, err: String(e.message || e), ms: performance.now() - t0, live: true, variant: id }; }
      var n = r[0], k = 8, mods = [], rings = [];
      for (var i = 0; i < n; i++, k += 4) mods.push(mod(r[k], r[k + 1], r[k + 2], r[k + 3], i));
      for (var j = 0; j < r[2]; j++) { var nk = r[k++], ring = []; for (var q = 0; q < nk; q++, k += 2) ring.push(FN.draw.toPlan(R, r[k], r[k + 1])); rings.push(ring); }
      return { mods: mods, rings: rings, n: n, geom: { height: r[3], depth: r[4], gap: r[5], pitch: r[6], gcr: r[7] }, ms: performance.now() - t0, live: true, variant: id };
    }
    // fallback: the chapter's rows (depth, gap) on the rectangle inside the edge zone, minus what an obstacle's keep-out box touches
    var G = { eq10: [1.696, 0.687], eq20: [1.618, 1.351], ew10: [2.284, 0.30] }[id], c = Math.cos(R.pitch * Math.PI / 180);
    var u1 = (R.north[1][0] - 218) / 40 - z, v1 = (R.north[2][1] - 156) / 40 / c - z, pitch = G[0] + G[1], half = 1.134 * Math.cos(K.tilt * Math.PI / 180), out = [], cnt = 0;
    var keep = obstacles.map(function (o) { var T = FN.OBST[o.type] || FN.OBST.chimney, p = FN.draw.toFace(R, o.x, o.y), hw = (T.shape ? T.a : T.a / 2) + T.margin, hh = (T.shape ? T.a : T.b / 2) + T.margin; return [p[0] - hw, p[1] - hh, p[0] + hw, p[1] + hh]; });
    var free = function (b) { return !keep.some(function (q) { return b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]; }); };
    if (K.mode) {
      for (var u = z; u + G[0] <= u1 + 1e-9; u += pitch) for (var v = z; v + 1.722 <= v1 + 1e-9; v += 1.742) {
        if (free([u, v, u + G[0], v + 1.722])) { out.push(mod(u, v, u + half, v + 1.722, cnt++)); out.push(mod(u + G[0] - half, v, u + G[0], v + 1.722, cnt++)); }
      }
    } else {
      for (var v2 = z; v2 + G[0] <= v1 + 1e-9; v2 += pitch) for (var u2 = z; u2 + 1.134 <= u1 + 1e-9; u2 += 1.154) {
        if (free([u2, v2, u2 + 1.134, v2 + G[0]])) out.push(mod(u2, v2, u2 + 1.134, v2 + G[0], cnt++));
      }
    }
    var ring = [FN.draw.toPlan(R, z, z), FN.draw.toPlan(R, u1, z), FN.draw.toPlan(R, u1, v1), FN.draw.toPlan(R, z, v1)];
    var h = (K.mode ? 1.134 : 1.722) * Math.sin(K.tilt * Math.PI / 180);
    return { mods: out, rings: [ring], n: out.length, geom: { height: h, depth: G[0], gap: G[1], pitch: pitch, gcr: (K.mode ? 2.268 : 1.722) / pitch }, ms: 0, live: false, variant: id };
  };
  FN.draw.wasm = function (R, obstacles, variant) {
    var face = [], obs = [], t0 = performance.now(), best = null;
    R.north.forEach(function (p) { var f = FN.draw.toFace(R, p[0], p[1]); face.push(f[0], f[1], p[2]); });
    obstacles.forEach(function (o) { var T = FN.OBST[o.type], c = FN.draw.toFace(R, o.x, o.y); obs.push(T.shape, c[0], c[1], T.a, T.b, T.margin); });
    var sb = [FN.SETBACK, FN.SETBACK, FN.SETBACK, FN.SETBACK, FN.SETBACK];
    (variant === 'mixed' ? ['portrait', 'landscape'] : [variant === 'landscape' ? 'landscape' : 'portrait']).forEach(function (vv) {
      var m = FN.MOD[vv], r;
      try { r = FN.draw.fn(new Float64Array(face), new Float64Array(sb), new Float64Array(obs), new Float64Array([m[0], m[1], 0.02, 0, 0.02])); } catch (e) { return; }
      if (!best || r[0] > best.r[0]) best = { r: r, vv: vv };
    });
    if (!best) return { mods: [], rings: [], n: 0, ms: performance.now() - t0, live: true };
    var r = best.r, n = r[0], k = 3, mods = [], rings = [];
    for (var i = 0; i < n; i++, k += 4) {
      var a = FN.draw.toPlan(R, r[k], r[k + 1]), b = FN.draw.toPlan(R, r[k + 2], r[k + 3]);
      mods.push({ id: r[k].toFixed(2) + ',' + r[k + 1].toFixed(2), x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]) });
    }
    for (var j = 0; j < r[2]; j++) { var nk = r[k++], ring = []; for (var q = 0; q < nk; q++, k += 2) ring.push(FN.draw.toPlan(R, r[k], r[k + 1])); rings.push(ring); }
    return { mods: mods, rings: rings, n: n, ms: performance.now() - t0, live: true, variant: best.vv };
  };
  // the fallback when the WebAssembly is absent: the prototype's own rows on the hip roof, a plain row fill
  // on the rectangular faces, minus the modules a keep-out box touches
  FN.draw.js = function (R, type, obstacles, variant) {
    var keep = obstacles.map(function (o) { var T = FN.OBST[o.type], hw = ((T.shape ? T.a : T.a / 2) + T.margin) * 40, hh = ((T.shape ? T.a : T.b / 2) + T.margin) * 40 * Math.cos(R.pitch * Math.PI / 180); return { x: o.x - hw, y: o.y - hh, w: 2 * hw, h: 2 * hh }; });
    var hit = function (m) { return keep.some(function (b) { return m.x < b.x + b.w && m.x + m.w > b.x && m.y < b.y + b.h && m.y + m.h > b.y; }); };
    var mods, s = FN.SETBACK * 40, c = Math.cos(R.pitch * Math.PI / 180);
    if (type === 'hip') mods = FN.layout(variant);
    else {
      var md = FN.MOD[variant === 'landscape' ? 'landscape' : 'portrait'], w = md[0] * 40, h = md[1] * 40 * c, y0 = 156 + s * c, y1 = R.north[2][1] - s * c, x0 = 218 + s, x1 = 818 - s, n = Math.floor((x1 - x0 + 0.8) / (w + 0.8));
      mods = []; for (var y = y0; y + h <= y1; y += h + 0.8) for (var i = 0; i < n; i++) mods.push({ id: 'r' + Math.round(y) + '-' + i, x: x0 + i * (w + 0.8), y: y, w: w, h: h });
    }
    mods = mods.filter(function (m) { return !hit(m); });
    var ring = type === 'hip' ? [[234, 172], [802, 172], [656, 340], [380, 340]] : [[218 + s, 156 + s * c], [818 - s, 156 + s * c], [818 - s, R.north[2][1] - s * c], [218 + s, R.north[2][1] - s * c]];
    return { mods: mods, rings: [ring], n: mods.length, ms: 0, live: false };
  };
  FN.draw.path = function (rings) { return rings.map(function (r) { return 'M' + r.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z'; }).join(' '); };
  // shared SVG defs for the 2D plan: 1 m / 5 m metric grids (dots and lines), roof slope hatches, and 2.5D PV module gradients/cells
  FN.draw.defs = function () {
    return '<defs>' +
      '<pattern id="sd-dots1" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="var(--c-roofLine)" opacity=".38"></circle></pattern>' +
      '<pattern id="sd-grid-dots" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="url(#sd-dots1)"></rect><path d="M0 0 H5 M0 0 V5 M200 0 H195 M0 200 V195" fill="none" stroke="var(--c-roofLine)" stroke-width="1.1" opacity=".65"></path><circle cx="0" cy="0" r="1.8" fill="var(--c-roofLine)" opacity=".6"></circle></pattern>' +
      '<pattern id="sd-lines1" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="var(--c-line)" stroke-width="0.65" opacity=".6"></path></pattern>' +
      '<pattern id="sd-grid-lines" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="url(#sd-lines1)"></rect><path d="M200 0 H0 V200" fill="none" stroke="var(--c-roofLine)" stroke-width="0.95" opacity=".5"></path></pattern>' +
      '<pattern id="sd-hatch-h" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 H12" stroke="var(--c-roofLine)" stroke-width="0.6" opacity=".22"></path></pattern>' +
      '<pattern id="sd-hatch-v" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 0 V12" stroke="var(--c-roofLine)" stroke-width="0.6" opacity=".22"></path></pattern>' +
      '<linearGradient id="sd-pv-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1A2736"></stop><stop offset="55%" stop-color="#243548"></stop><stop offset="100%" stop-color="#15202D"></stop></linearGradient>' +
      '<linearGradient id="sd-pv-shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#35414E"></stop><stop offset="55%" stop-color="#3E4C5B"></stop><stop offset="100%" stop-color="#2D3843"></stop></linearGradient>' +
      '<pattern id="sd-cells" width="9" height="10.8" patternUnits="userSpaceOnUse"><path d="M9 0 H0 V10.8" fill="none" stroke="rgba(165,198,230,0.20)" stroke-width="0.55"></path></pattern>' +
      '<style>' +
      '.sd-edge{pointer-events:stroke;stroke-linecap:round}' +
      '.sd-edge.k-eave{stroke:#0b7556}' +
      '.sd-edge.k-ridge{stroke:#d47214}' +
      '.sd-edge.k-hip{stroke:#2f6be3}' +
      '.sd-edge.k-valley{stroke:#7836b8}' +
      '.sd-edge.k-rake{stroke:#b83220}' +
      '.sd-edge.k-skillion-top{stroke:#475467}' +
      '.sd-edge.k-flat{stroke:#0e7c86;stroke-dasharray:7 4}' +
      '@media (prefers-color-scheme:dark){' +
      ':root:not([data-theme="light"]) .sd-edge.k-eave{stroke:#43c79a}' +
      ':root:not([data-theme="light"]) .sd-edge.k-ridge{stroke:#f2a23c}' +
      ':root:not([data-theme="light"]) .sd-edge.k-hip{stroke:#7fa8ff}' +
      ':root:not([data-theme="light"]) .sd-edge.k-valley{stroke:#c39bf0}' +
      ':root:not([data-theme="light"]) .sd-edge.k-rake{stroke:#ff7d6b}' +
      ':root:not([data-theme="light"]) .sd-edge.k-skillion-top{stroke:#6b7a90}' +
      ':root:not([data-theme="light"]) .sd-edge.k-flat{stroke:#4fc3cc}' +
      '}' +
      ':root[data-theme="dark"] .sd-edge.k-eave{stroke:#43c79a}' +
      ':root[data-theme="dark"] .sd-edge.k-ridge{stroke:#f2a23c}' +
      ':root[data-theme="dark"] .sd-edge.k-hip{stroke:#7fa8ff}' +
      ':root[data-theme="dark"] .sd-edge.k-valley{stroke:#c39bf0}' +
      ':root[data-theme="dark"] .sd-edge.k-rake{stroke:#ff7d6b}' +
      ':root[data-theme="dark"] .sd-edge.k-skillion-top{stroke:#6b7a90}' +
      ':root[data-theme="dark"] .sd-edge.k-flat{stroke:#4fc3cc}' +
      '</style>' +
      '</defs>';
  };
  // a vertex's height for the edge typing: hip and gable eaves at 0 and the ridge at the top; a skillion or a
  // flat roof is one plane rising to the south
  FN.draw.height = function (R, x, y) {
    var t = Math.tan(R.pitch * Math.PI / 180), g = R.ridge;
    if (R.rise === 'slope') return (y - 156) / 40 * t;
    return g && y === g[1] && x >= g[0] && x <= g[2] ? R.depth * t : 0;
  };
  // the roof's edges typed by studio-draw from its faces' geometry (chapter 3, D-69): nothing is typed by hand.
  // Plan metres east and north, z up; null without the WebAssembly
  FN.draw.KINDS = ['eave', 'ridge', 'hip', 'valley', 'rake', 'skillion-top', 'flat'];
  FN.draw.edges = function (type) {
    if (!FN.draw.fnEdges) return null;
    var C = FN.draw.edgeCache || (FN.draw.edgeCache = {});
    if (C[type]) return C[type];
    var R = FN.ROOFS[type] || FN.ROOFS.hip, flat = [];
    Object.keys(R.faces).forEach(function (k) {
      var pts = R.faces[k].match(/-?[0-9.]+ -?[0-9.]+/g).map(function (p) { return p.split(' ').map(Number); });
      flat.push(pts.length);
      pts.forEach(function (p) { flat.push(p[0] / 40, -p[1] / 40, FN.draw.height(R, p[0], p[1])); });
    });
    var r, out = [];
    try { r = FN.draw.fnEdges(new Float64Array(flat)); } catch (e) { return null; }
    for (var i = 0, k = 1; i < r[0]; i++, k += 8) out.push({ x1: r[k] * 40, y1: -r[k + 1] * 40, x2: r[k + 3] * 40, y2: -r[k + 4] * 40, kind: FN.draw.KINDS[r[k + 6]] });
    return (C[type] = out);
  };
  // the roof's lines in the plan: typed and coloured by kind (the Edge types layer), otherwise the ridge and hips
  FN.draw.ridges = function (type, typed) {
    var R = FN.ROOFS[type] || FN.ROOFS.hip, E = typed === false ? null : FN.draw.edges(type), s = '';
    if (E) return E.map(function (e) { return '<line class="sd-edge k-' + e.kind + '" x1="' + e.x1.toFixed(1) + '" y1="' + e.y1.toFixed(1) + '" x2="' + e.x2.toFixed(1) + '" y2="' + e.y2.toFixed(1) + '" stroke-width="' + ({ ridge: 3, hip: 2.5, flat: 2.8 }[e.kind] || 2.3) + '"></line>'; }).join('');
    if (type === 'hip') s += '<path d="M218 156 L368 356 M818 156 L668 356 M218 556 L368 356 M818 556 L668 356" stroke="var(--c-ridge)" stroke-width="2.2" stroke-linecap="round" pointer-events="none"></path>';
    if (type !== 'flat') s += '<path d="M' + R.ridge[0] + ' ' + R.ridge[1] + ' L' + R.ridge[2] + ' ' + R.ridge[3] + '" stroke="var(--c-ridge)" stroke-width="2.8" stroke-linecap="round" pointer-events="none"></path>';
    return s;
  };
  // 2.5D or flat module rendering in the 2D plan
  FN.draw.modSvg = function (m, ghost, shaded, relief) {
    var x = m.x, y = m.y, w = m.w, h = m.h;
    if (m.removed || ghost || !relief) {
      return '<rect data-a="mod" data-v="' + m.id + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + (m.removed ? 'none' : ghost ? 'var(--c-selSoft)' : shaded ? '#46525E' : '#2B3A4A') + '" stroke="' + (m.removed ? 'var(--c-loss)' : ghost ? 'var(--c-sel)' : '#55667A') + '" stroke-dasharray="' + (m.removed || ghost ? '4 3' : 'none') + '" style="cursor:pointer"></rect>';
    }
    var ix = (x + 1.5).toFixed(1), iy = (y + 1.5).toFixed(1), iw = Math.max(2, w - 3).toFixed(1), ih = Math.max(2, h - 3).toFixed(1);
    var bus = h >= w ? 'M' + (x + 2).toFixed(1) + ' ' + (y + h / 2).toFixed(1) + ' H' + (x + w - 2).toFixed(1) : 'M' + (x + w / 2).toFixed(1) + ' ' + (y + 2).toFixed(1) + ' V' + (y + h - 2).toFixed(1);
    return '<g data-a="mod" data-v="' + m.id + '" style="cursor:pointer">' +
      '<rect x="' + (x + 2.2).toFixed(1) + '" y="' + (y + 2.6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.8" fill="#12161C" opacity=".26"></rect>' +
      '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.6" fill="' + (shaded ? '#636E7B' : '#8A94A0') + '" stroke="#36404C" stroke-width="0.7"></rect>' +
      '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" rx="0.8" fill="url(#' + (shaded ? 'sd-pv-shade' : 'sd-pv-sun') + ')"></rect>' +
      '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" fill="url(#sd-cells)"></rect>' +
      '<path d="' + bus + '" stroke="rgba(185,215,242,0.34)" stroke-width="0.9"></path>' +
      '<path d="M' + (x + 1).toFixed(1) + ' ' + (y + h - 1.5).toFixed(1) + ' V' + (y + 1).toFixed(1) + ' H' + (x + w - 1.5).toFixed(1) + '" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="0.7"></path>' +
      '</g>';
  };
  // the obstacle's body and keep-out, in plan px (with 2.5D cartographic shadow and architectural detail)
  FN.draw.shapes = function (type, o, sel) {
    var R = FN.ROOFS[type], T = FN.OBST[o.type] || FN.OBST.chimney, c = Math.cos(R.pitch * Math.PI / 180), m = T.margin * 40, s = '';
    if (T.shape) {
      var r = Math.max(T.a * 40, 4.5), ry = Math.max(T.a * 40 * c, 4.2);
      s += '<ellipse cx="' + o.x + '" cy="' + o.y + '" rx="' + (T.a * 40 + m) + '" ry="' + ((T.a * 40 + m) * c) + '" fill="none" stroke="var(--c-loss)" stroke-dasharray="3 4"></ellipse>' +
        '<g data-obs="' + o.id + '" style="cursor:grab">' +
        '<ellipse cx="' + (o.x + 2) + '" cy="' + (o.y + 2.5) + '" rx="' + (r + 1.5) + '" ry="' + (ry + 1.5) + '" fill="#12161C" opacity=".24"></ellipse>' +
        '<ellipse cx="' + o.x + '" cy="' + o.y + '" rx="' + (r + 2) + '" ry="' + (ry + 1.8) + '" fill="#6A7078" stroke="' + (sel ? 'var(--c-sel)' : T.line) + '" stroke-width="' + (sel ? 2.2 : 0.9) + '"></ellipse>' +
        '<ellipse cx="' + o.x + '" cy="' + o.y + '" rx="' + r + '" ry="' + ry + '" fill="' + T.fill + '"></ellipse>' +
        (o.type === 'antenna'
          ? '<path d="M' + (o.x - 6) + ' ' + o.y + ' H' + (o.x + 6) + ' M' + o.x + ' ' + (o.y - 6) + ' V' + (o.y + 6) + '" stroke="#1D2026" stroke-width="1.2"></path>'
          : '<ellipse cx="' + o.x + '" cy="' + o.y + '" rx="' + (r * 0.45) + '" ry="' + (ry * 0.45) + '" fill="#3A4047"></ellipse>') +
        '</g>';
    } else {
      var hw = T.a * 20, hh = T.b * 20 * c, x0 = o.x - hw, y0 = o.y - hh, w = 2 * hw, h = 2 * hh;
      s += '<rect x="' + (x0 - m) + '" y="' + (y0 - m * c) + '" width="' + (w + 2 * m) + '" height="' + (h + 2 * m * c) + '" rx="' + m + '" ry="' + (m * c) + '" fill="none" stroke="var(--c-loss)" stroke-dasharray="3 4"></rect>' +
        '<g data-obs="' + o.id + '" style="cursor:grab">' +
        '<rect x="' + (x0 + 2.5) + '" y="' + (y0 + 3) + '" width="' + w + '" height="' + h + '" rx="1.5" fill="#12161C" opacity=".24"></rect>';
      if (o.type === 'prism') {
        var pts = (x0 + 3) + ',' + (y0 + h) + ' ' + o.x + ',' + y0 + ' ' + (x0 + w - 3) + ',' + (y0 + h);
        s += '<polygon points="' + pts + '" fill="' + T.fill + '" stroke="' + (sel ? 'var(--c-sel)' : T.line) + '" stroke-width="' + (sel ? 2.5 : 1.1) + '"></polygon>' +
          '<path d="M' + o.x + ' ' + y0 + ' V' + (y0 + h) + '" stroke="' + T.line + '" stroke-width="0.9"></path>';
      } else {
        s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" rx="1.2" fill="' + T.fill + '" stroke="' + (sel ? 'var(--c-sel)' : T.line) + '" stroke-width="' + (sel ? 2.5 : 1.1) + '"></rect>' +
          (o.type === 'skylight'
            ? '<rect x="' + (x0 + 2.2) + '" y="' + (y0 + 2.2) + '" width="' + Math.max(2, w - 4.4) + '" height="' + Math.max(2, h - 4.4) + '" fill="#8AB2D4" stroke="#5E7A93" stroke-width="0.7"></rect><path d="M' + o.x + ' ' + (y0 + 2.2) + ' V' + (y0 + h - 2.2) + '" stroke="#5E7A93" stroke-width="0.7"></path>'
            : o.type === 'box'
              ? '<circle cx="' + (x0 + w * 0.34) + '" cy="' + o.y + '" r="' + (Math.min(hw, hh) * 0.55) + '" fill="none" stroke="' + T.line + '" stroke-width="0.9"></circle><path d="M' + (x0 + w * 0.66) + ' ' + (y0 + 3) + ' V' + (y0 + h - 3) + '" stroke="' + T.line + '" stroke-width="0.8"></path>'
              : '<rect x="' + (x0 + 2.2) + '" y="' + (y0 + 2.2) + '" width="' + Math.max(2, w - 4.4) + '" height="' + Math.max(2, h - 4.4) + '" fill="none" stroke="#6E5A4B" stroke-width="0.8"></rect><circle cx="' + o.x + '" cy="' + o.y + '" r="' + Math.min(hw, hh) * 0.42 + '" fill="#47392F" stroke="#6E5A4B" stroke-width="1"></circle>');
      }
      s += '</g>';
    }
    return s;
  };
  // snapping while an obstacle moves: the ridge axis, then 0.05 m steps from the ridge and the eave
  FN.draw.snap = function (type, x, y, free) {
    var R = FN.ROOFS[type], c = Math.cos(R.pitch * Math.PI / 180), g = [], ax = (R.ridge[0] + R.ridge[2]) / 2;
    if (!free) {
      if (Math.abs(x - ax) < 10) { x = ax; g.push('axis'); }
      var w = FN.draw.where(type, x, y), stepv = Math.round(w.ridge / 0.05) * 0.05, top = R.depth / c;
      y = FN.draw.toPlan(R, 0, top - stepv)[1]; g.push('step');
    }
    return { x: x, y: y, guides: g, ax: ax };
  };
  // guides and dimension lines for the obstacle being placed: to the ridge and to the eave, along the slope
  FN.draw.guides = function (type, o, snap) {
    var R = FN.ROOFS[type], w = FN.draw.where(type, o.x, o.y), s = '', top = R.ridge[1], eave = 156, amber = 'var(--c-sun)';
    if (snap && snap.guides.indexOf('axis') >= 0) s += '<path d="M' + snap.ax + ' ' + (eave - 30) + ' V' + (top + 30) + '" stroke="' + amber + '" stroke-width="1.5" stroke-dasharray="6 4"></path><text x="' + (snap.ax + 6) + '" y="' + (eave - 18) + '" font-size="12" fill="var(--c-sunText)" font-weight="600">ridge axis</text>';
    var dim = function (y1, y2, t) { var xx = o.x + 46; return '<path d="M' + xx + ' ' + y1 + ' V' + y2 + '" stroke="var(--c-ink)" stroke-width="1.2"></path><path d="M' + (xx - 5) + ' ' + y1 + ' H' + (xx + 5) + ' M' + (xx - 5) + ' ' + y2 + ' H' + (xx + 5) + '" stroke="var(--c-ink)" stroke-width="1.2"></path><rect x="' + (xx + 6) + '" y="' + ((y1 + y2) / 2 - 10) + '" width="74" height="18" rx="4" fill="var(--c-paper)" stroke="var(--c-line)"></rect><text x="' + (xx + 43) + '" y="' + ((y1 + y2) / 2 + 3) + '" font-size="11.5" text-anchor="middle" fill="var(--c-ink)" font-weight="600">' + t + '</text>'; };
    s += dim(top, o.y, w.ridge.toFixed(2) + ' m ↑') + dim(o.y, eave, w.eave.toFixed(2) + ' m ↓');
    return s;
  };
  /* ---------- widgets: the schematic site (design/site-model) ---------- */
  // The site as the studio would draw it around the measured roof, for three site types: a house,
  // a commercial building with a flat roof, and a car park with canopies. Each object carries its
  // fidelity (measured, declared, schematic) and the Fidelity button paints the scene by it.
  // Equipment is anchored to a wall (wall, distance along it), so it follows when the footprint
  // is corrected; cables run along the walls and their lengths are the output. The capacity is
  // summed over every zone of the site and gives the official categories of each market, as the
  // raw report on site types read them on 2026-11-02. Sizes are illustrative; the battery zones
  // follow AS/NZS 5139 as secondary sources read it, to verify against the standard.
  var SMT = {
    en: { site: 'Site type', house: 'House', ci: 'Commercial roof', park: 'Car park',
      plan: 'Plan', iso: 'Isometric', turn: 'Turn 90°', fid: 'Fidelity',
      layers: 'Layers', mods: 'Modules', dims: 'Dimensions', bg: 'Ground', plain: 'Plain', dots: 'Dots', lines: 'Lines',
      rbat: 'Battery zones', redge: 'Roof edge 1 m', raper: 'Coverage', carport: 'Carport', canopy3: 'Third canopy',
      flow: 'Energy flow', off: 'Off', noon: 'Midday', eve: 'Evening',
      measured: 'Measured', declared: 'Declared', schematic: 'Schematic',
      leg: {
        house: ['roof faces, footprint, eave height, lot boundary: from LiDAR, survey or cadastre, dimensioned with their tolerance',
          'garage, doors, equipment: placed by the installer or the household, dimensioned, its cable lengths estimated',
          'windows, carport, car, tree, street: generated to make the site readable, never dimensioned'],
        ci: ['footprint, roof height, parapet, roof units, lot boundary: from LiDAR or survey',
          'module rows, loading doors, equipment: placed by the installer, cable lengths estimated',
          'windows, cars, trucks’ yard, trees: generated to make the site readable'],
        park: ['car park surface, lot boundary: from the cadastre and imagery',
          'canopies, technical room, equipment: designed and placed by the installer, cable lengths estimated',
          'bay lines, cars, trees: generated to make the site readable'] },
      inv: 'Inverter', bat: 'Battery', sb: 'Switchboard', evc: 'Charger', hp: 'Heat pump', pv: 'Array',
      cDc: 'Strings', cBat: 'Battery', cAc: 'Inverter to board', cEv: 'Charger', cHp: 'Heat pump',
      th: ['Circuit', 'From → to', 'Length', 'Vertical'], est: 'route estimated along the walls',
      batOk: 'Battery: outside the zones drawn around doors and windows.',
      batBad: 'Battery: inside the zone of {o}. AS/NZS 5139 keeps a battery 600 mm from an exit, and 600 mm beside and 900 mm below a window of a habitable room (as secondary sources read it, to verify).',
      door: 'a door', win: 'a window',
      reach: 'Tethered cable from the charger to the car inlet: about {d} m of {m} m.', reachBad: 'The charger’s {m} m tethered cable does not reach the car inlet ({d} m): move the charger.',
      hpDist: 'Heat pump: {d} m from the nearest boundary (the input of a noise check, MCS 020 in the United Kingdom).',
      edge: 'Roof edge: no module within 1 m of the parapet (Class J in England; the wind edge zones of AS/NZS 1170.2 in Australia).',
      aper: 'Car park of {a} m²: the canopies cover {p} %. France’s loi APER asks for half of an outdoor car park over 1,500 m².',
      hint: 'Drag an equipment label along the walls, or focus it and use the arrow keys; the selected equipment shows its cable lengths on the stage. Cables, lengths, checks and categories follow.',
      total: 'Total', zNorth: 'north face', zCarport: 'carport', zFlat: 'flat roof', zCanopy: 'canopies',
      mods: '{list}: {n} modules, {k} kWc summed over the site',
      cats: 'Official categories for this site', catTh: ['Market', 'Support', 'Planning', 'Connection'],
      catNote: 'Rules as the raw report read them on 2 November 2026, illustrative. The capacity is summed over every zone of the site: a carport or a third canopy can move the site into the next category.',
      mFR: 'France', mAU: 'Australia', mUK: 'United Kingdom' },
    fr: { site: 'Type de site', house: 'Maison', ci: 'Toiture tertiaire', park: 'Parking',
      plan: 'Plan', iso: 'Isométrique', turn: 'Pivoter de 90°', fid: 'Fidélité',
      layers: 'Calques', mods: 'Modules', dims: 'Cotes', bg: 'Sol', plain: 'Uni', dots: 'Points', lines: 'Lignes',
      rbat: 'Zones batterie', redge: 'Rive 1 m', raper: 'Couverture', carport: 'Carport', canopy3: 'Troisième ombrière',
      flow: 'Flux d’énergie', off: 'Arrêt', noon: 'Midi', eve: 'Soir',
      measured: 'Mesuré', declared: 'Déclaré', schematic: 'Schématique',
      leg: {
        house: ['pans de toit, emprise, hauteur d’égout, limite de parcelle : du LiDAR, d’un relevé ou du cadastre, cotés avec leur tolérance',
          'garage, portes, équipements : placés par l’installateur ou le ménage, cotés, leurs longueurs de câble estimées',
          'fenêtres, carport, voiture, arbre, rue : générés pour rendre le site lisible, jamais cotés'],
        ci: ['emprise, hauteur de toiture, acrotère, équipements de toiture, limite de parcelle : du LiDAR ou d’un relevé',
          'rangées de modules, portes de quai, équipements : placés par l’installateur, longueurs de câble estimées',
          'fenêtres, voitures, cour, arbres : générés pour rendre le site lisible'],
        park: ['surface du parking, limite de parcelle : du cadastre et de l’imagerie',
          'ombrières, local technique, équipements : conçus et placés par l’installateur, longueurs de câble estimées',
          'marquage des places, voitures, arbres : générés pour rendre le site lisible'] },
      inv: 'Onduleur', bat: 'Batterie', sb: 'Tableau', evc: 'Borne', hp: 'Pompe à chaleur', pv: 'Champ',
      cDc: 'Strings', cBat: 'Batterie', cAc: 'Onduleur vers tableau', cEv: 'Borne', cHp: 'Pompe à chaleur',
      th: ['Circuit', 'De → à', 'Longueur', 'Vertical'], est: 'tracé estimé le long des murs',
      batOk: 'Batterie : hors des zones dessinées autour des portes et fenêtres.',
      batBad: 'Batterie : dans la zone {o}. L’AS/NZS 5139 tient une batterie à 600 mm d’une issue, et à 600 mm sur le côté et 900 mm sous une fenêtre de pièce habitable (selon des sources secondaires, à vérifier).',
      door: 'd’une porte', win: 'd’une fenêtre',
      reach: 'Câble attaché de la borne à la prise de la voiture : environ {d} m sur {m} m.', reachBad: 'Le câble attaché de {m} m de la borne n’atteint pas la prise de la voiture ({d} m) : déplacez la borne.',
      hpDist: 'Pompe à chaleur : à {d} m de la limite la plus proche (l’entrée d’un contrôle de bruit, MCS 020 au Royaume-Uni).',
      edge: 'Rive : aucun module à moins de 1 m de l’acrotère (Class J en Angleterre ; zones de rive au vent de l’AS/NZS 1170.2 en Australie).',
      aper: 'Parking de {a} m² : les ombrières en couvrent {p} %. La loi APER demande la moitié d’un parking extérieur de plus de 1 500 m².',
      hint: 'Faites glisser l’étiquette d’un équipement le long des murs, ou donnez-lui le focus et utilisez les flèches ; l’équipement choisi montre ses longueurs de câble sur la scène. Câbles, longueurs, contrôles et catégories suivent.',
      total: 'Total', zNorth: 'pan nord', zCarport: 'carport', zFlat: 'toit plat', zCanopy: 'ombrières',
      mods: '{list} : {n} modules, {k} kWc additionnés sur le site',
      cats: 'Catégories officielles de ce site', catTh: ['Marché', 'Soutien', 'Urbanisme', 'Raccordement'],
      catNote: 'Règles telles que le rapport brut les a lues le 2 novembre 2026, à titre d’illustration. La puissance s’additionne sur toutes les zones du site : un carport ou une troisième ombrière peut faire passer le site dans la catégorie suivante.',
      mFR: 'France', mAU: 'Australie', mUK: 'Royaume-Uni' }
  };
  // fidelity colours (Fidelity view) and the maquette palette (normal view)
  var SMC = { ground: '#E3DFD7', lot: '#DCE0D3', drive: '#CFCAC0', asphalt: '#C4C0B8', street: '#B7B3AB', walls: '#F1EDE6', plinth: '#CFC8BC',
    roof: '#9A9184', garageRoof: '#A79F92', flatRoof: '#C9C5BC', parapet: '#E2DED6', fascia: '#E9E5DD', glass: '#5D6B78', door: '#8C7B68', frame: '#FBFAF7',
    ink: '#2B2F35', carport: '#C9C4BA', steel: '#B8BCC0', car: '#C9CDD2', tyre: '#2E3136', trunk: '#7A6A58', leaf: '#9DAE93', line: '#F7F5F0',
    dc: '#E8A800', ac: '#3D4650', bat: '#7A5BD0', ev: '#1F7A55', hpc: '#2457C5', zone: '#C8452E' };
  var SMCARS = ['#C9CDD2', '#8E979F', '#E9E7E2', '#5F6B78', '#B8AFA3', '#3F4650'];
  // the three sites, in metres in the local frame: x east, z south, y up; north is -z
  var SMS = {
    house: {
      roof: 'hip', pitch: 22, eave: 3, over: 0.35, garageEave: 2.7, garagePitch: 15, run: 2.4, off: 0.06,
      dims: [[-7.5, -5, 7.5, -5, 0, -1], [-7.5, 5, -7.5, -5, -1, 0]],
      lot: [-11, -16, 15.5, 14.5], iso: { t: [3.5, 1.4, 0.8], h: 10.5 }, shadow: 24, ph: 1, rule: 'bat', tog: 'carport',
      foot: [[-7.5, -5], [7.5, -5], [7.5, -1], [13.5, -1], [13.5, 6], [7.5, 6], [7.5, 5], [-7.5, 5]],
      wallH: [3, 3, 2.7, 2.7, 2.7, 2.7, 3, 3],
      bodies: [[-7.5, -5, 7.5, 5, 3, 'measured'], [7.5, -1, 13.5, 6, 2.7, 'declared']],
      flats: [[8.1, 6, 13.4, 14.5, 'drive'], [-0.6, 5, 0.8, 14.5, 'drive']], street: true,
      // openings: wall, from s0 to s1 along it; kind door (an exit), win (habitable room), gdoor (garage door)
      open: [
        { w: 0, s0: 1.5, s1: 3.3, k: 'win' }, { w: 0, s0: 5, s1: 7.5, k: 'win' }, { w: 0, s0: 9.5, s1: 11.3, k: 'win' }, { w: 0, s0: 12.6, s1: 13.5, k: 'door' },
        { w: 3, s0: 0.8, s1: 1.7, k: 'door' }, { w: 4, s0: 0.5, s1: 5.3, k: 'gdoor' },
        { w: 6, s0: 2.6, s1: 4.4, k: 'win' }, { w: 6, s0: 6.9, s1: 7.9, k: 'door' }, { w: 6, s0: 9.6, s1: 11.4, k: 'win' }, { w: 6, s0: 12.2, s1: 14, k: 'win' },
        { w: 7, s0: 2, s1: 3.6, k: 'win' }
      ],
      canopies: [{ x0: 8.1, z0: 7.2, x1: 13.4, z1: 12.6, y: 2.55, tilt: 5, fid: 'schematic', tog: true, name: 'zCarport', posts: 'corners' }],
      cars: [{ x: 10.75, z: 9.9 }], trees: [[-8.6, 10.5]],
      equip: {
        inv: { w: 3, s: 2.6, W: 0.45, H: 0.55, D: 0.2, y0: 1.3, c: '#D9D6CF' },
        bat: { w: 3, s: 5.8, W: 0.75, H: 1.15, D: 0.15, y0: 0.15, c: '#F4F2EE' },
        sb: { w: 6, s: 1.4, W: 0.5, H: 0.7, D: 0.2, y0: 1.2, c: '#CFCAC0' },
        evc: { w: 4, s: 5.7, W: 0.25, H: 0.4, D: 0.15, y0: 1.0, c: '#33373D', cable: 5 },
        hp: { w: 7, s: 8.5, W: 0.9, H: 0.7, D: 0.35, y0: 0, gap: 0.15, c: '#E7E4DD' }
      },
      circuits: [
        { id: 'dc', a: 'pv', b: 'inv', c: 'dc', t: 'cDc' }, { id: 'bat', a: 'inv', b: 'bat', c: 'bat', t: 'cBat' },
        { id: 'ac', a: 'inv', b: 'sb', c: 'ac', t: 'cAc' }, { id: 'ev', a: 'sb', b: 'evc', c: 'ev', t: 'cEv' },
        { id: 'hp', a: 'sb', b: 'hp', c: 'hpc', t: 'cHp' }
      ],
      flow: { noon: { dc: 1, bat: 1, ac: 1, ev: 1, hp: 1 }, eve: { dc: 0, bat: -1, ac: 1, ev: 1, hp: 1 } }
    },
    ci: {
      roof: 'flat', eave: 7, parapet: 0.6, run: 3.2, off: 0.08, tilt: 10, edge: 1,
      dims: [[-20, -12, 20, -12, 0, -1], [-20, 12, -20, -12, -1, 0]],
      lot: [-27, -19, 27, 27], iso: { t: [0, 2.5, 4], h: 21 }, shadow: 40, ph: 3, rule: 'edge',
      foot: [[-20, -12], [20, -12], [20, 12], [-20, 12]], wallH: [7, 7, 7, 7],
      bodies: [[-20, -12, 20, 12, 7, 'measured']],
      flats: [[-24, 12, 24, 25, 'asphalt'], [20, -8, 26, 12, 'asphalt']], street: true, bays: [{ x0: -18, x1: 16, z0: 15, z1: 20, n: 13 }],
      // roof units from LiDAR: keep-out boxes that the rows go around
      units: [[-11, -3, 3.2, 1.6, 2.2], [9, 4, 2.4, 1.4, 2.4], [-2, 6.5, 1.6, 0.6, 1.6]],
      open: [
        { w: 2, s0: 3, s1: 9, k: 'win', y0: 1, y1: 2.4 }, { w: 2, s0: 11, s1: 17, k: 'win', y0: 1, y1: 2.4 }, { w: 2, s0: 19, s1: 21, k: 'door' },
        { w: 2, s0: 23, s1: 29, k: 'win', y0: 1, y1: 2.4 }, { w: 2, s0: 31, s1: 37, k: 'win', y0: 1, y1: 2.4 },
        { w: 1, s0: 13, s1: 17, k: 'gdoor', y1: 4.5 }, { w: 1, s0: 18.5, s1: 22.5, k: 'gdoor', y1: 4.5 }, { w: 1, s0: 10.6, s1: 11.6, k: 'door' }
      ],
      canopies: [], cars: [{ x: 15.25, z: 17.5 }], trees: [[-24, 16], [-24, 21], [23.5, 22]],
      trucks: [[23, 15]],
      equip: {
        inv: { w: 1, s: 3.5, W: 0.9, H: 1.1, D: 0.3, y0: 1.0, c: '#D9D6CF' },
        sb: { w: 1, s: 8.5, W: 1.4, H: 2.1, D: 0.5, y0: 0, c: '#CFCAC0' },
        bat: { w: 2, s: 2.5, W: 2.2, H: 2.2, D: 1.1, y0: 0, gap: 1, c: '#F4F2EE' },
        evc: { w: 2, s: 4.6, W: 0.3, H: 0.5, D: 0.18, y0: 1.0, c: '#33373D', cable: 5 }
      },
      circuits: [
        { id: 'dc', a: 'pv', b: 'inv', c: 'dc', t: 'cDc' }, { id: 'bat', a: 'inv', b: 'bat', c: 'bat', t: 'cBat' },
        { id: 'ac', a: 'inv', b: 'sb', c: 'ac', t: 'cAc' }, { id: 'ev', a: 'sb', b: 'evc', c: 'ev', t: 'cEv' }
      ],
      flow: { noon: { dc: 1, bat: 1, ac: 1, ev: 1 }, eve: { dc: 0, bat: -1, ac: 1, ev: 1 } }
    },
    park: {
      roof: 'flat', eave: 3, parapet: 0.3, run: 2.4, off: 0.06,
      dims: [[-28, -17, 28, -17, 0, -1], [-28, 17, -28, -17, -1, 0]],
      lot: [-31, -20, 40, 20], iso: { t: [4, 1, 0], h: 22 }, shadow: 44, ph: 3, rule: 'aper', tog: 'canopy3',
      foot: [[29, -4], [37, -4], [37, 3], [29, 3]], wallH: [3, 3, 3, 3],
      bodies: [[29, -4, 37, 3, 3, 'declared']],
      surface: [-28, -17, 28, 17], street: false,
      bays: [{ x0: -25, x1: 25, z0: -17, z1: -12, n: 20 }, { x0: -25, x1: 25, z0: -6, z1: -1, n: 20 }, { x0: -25, x1: 25, z0: -1, z1: 4, n: 20 }, { x0: -25, x1: 25, z0: 10, z1: 15, n: 20 }],
      open: [{ w: 2, s0: 3, s1: 4, k: 'door' }],
      canopies: [
        { x0: -25, z0: -16.8, x1: 25, z1: -9.2, y: 2.9, tilt: 5, fid: 'declared', name: 'zCanopy', posts: 'rows' },
        { x0: -25, z0: -2.3, x1: 25, z1: 5.3, y: 2.9, tilt: 5, fid: 'declared', name: 'zCanopy', posts: 'rows' },
        { x0: -25, z0: 8.6, x1: 25, z1: 16.2, y: 2.9, tilt: 5, fid: 'declared', name: 'zCanopy', posts: 'rows', tog: true }
      ],
      cars: [{ x: 26.6, z: 1.8 }], carFill: 0.55, trees: [[-30, -18], [-30, 18], [32, 15], [36, -15]],
      equip: {
        inv: { w: 0, s: 3, W: 0.9, H: 1.1, D: 0.3, y0: 0.9, c: '#D9D6CF' },
        sb: { w: 1, s: 3.5, W: 1.4, H: 2.1, D: 0.5, y0: 0, c: '#CFCAC0' },
        bat: { w: 2, s: 5.6, W: 2.2, H: 2.2, D: 1.1, y0: 0, gap: 0.6, c: '#F4F2EE' },
        evc: { w: 3, s: 1.1, W: 0.3, H: 0.5, D: 0.18, y0: 1.0, c: '#33373D', cable: 5 }
      },
      circuits: [
        { id: 'dc', a: 'pv', b: 'inv', c: 'dc', t: 'cDc' }, { id: 'bat', a: 'inv', b: 'bat', c: 'bat', t: 'cBat' },
        { id: 'ac', a: 'inv', b: 'sb', c: 'ac', t: 'cAc' }, { id: 'ev', a: 'sb', b: 'evc', c: 'ev', t: 'cEv' }
      ],
      flow: { noon: { dc: 1, bat: 1, ac: 1, ev: 1 }, eve: { dc: 0, bat: -1, ac: 1, ev: 1 } }
    }
  };
  var smQ = null;
  function smThree(done) {
    // one load of three.js for every widget of the page, whoever asks first
    if (window.THREE) { done(); return; }
    if (!smQ) { smQ = []; loadScript('vendor/three-0.186.1.min.js', function () { var q = smQ; smQ = null; q.forEach(function (f) { f(); }); }); }
    smQ.push(done);
  }
  // the house's north face: portrait modules from 0.3 m above the wall line with 0.4 m off the hips
  function smHipModules(D) {
    var t = Math.tan(D.pitch * Math.PI / 180), c = Math.cos(D.pitch * Math.PI / 180), dep = 1.72 * c, out = [];
    for (var d0 = 0.3; d0 + dep <= 5 - 0.4; d0 += dep + 0.02) {
      var half = 7.5 - (d0 + dep) - 0.4, n = Math.floor((2 * half + 0.02) / 1.15);
      for (var i = 0; i < n; i++) {
        var x = -n * 1.15 / 2 + 0.575 + i * 1.15, dm = d0 + dep / 2;
        out.push({ x: x, z: -5 + dm, y: D.eave + dm * t + 0.08 });
      }
    }
    return out;
  }
  // a flat roof: rows tilted to the north, kept off the parapet by the edge setback and off the roof units
  function smFlatModules(D) {
    var F = D.bodies[0], tl = D.tilt * Math.PI / 180, dep = 1.72 * Math.cos(tl), pitch = 2.6, e = D.edge, out = [], rows = [];
    var x0 = F[0] + e, x1 = F[2] - e, z0 = F[1] + e, z1 = F[3] - e, n = Math.floor((x1 - x0 + 0.02) / 1.15);
    for (var z = z0; z + dep <= z1; z += pitch) {
      var row = [];
      for (var i = 0; i < n; i++) {
        var x = (x0 + x1) / 2 - n * 1.15 / 2 + 0.575 + i * 1.15, zc = z + dep / 2;
        var hit = D.units.some(function (u) { return Math.abs(x - u[0]) < u[2] / 2 + 0.575 + 0.5 && Math.abs(zc - u[1]) < u[3] / 2 + dep / 2 + 0.5; });
        if (!hit) { var m = { x: x, z: zc, y: D.eave + 0.3 + dep / 2 * Math.tan(tl) }; out.push(m); row.push(m); }
      }
      if (row.length) rows.push(row);
    }
    out.rows = rows;
    return out;
  }
  function smCanopyModules(c) {
    var t = Math.tan(c.tilt * Math.PI / 180), w = c.x1 - c.x0, d = c.z1 - c.z0, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, out = [];
    var n = Math.floor((w - 0.3) / 1.15), rows = Math.floor((d - 0.3) / (1.72 * Math.cos(c.tilt * Math.PI / 180) + 0.02));
    for (var j = 0; j < rows; j++) for (var i = 0; i < n; i++) {
      var x = cx - n * 1.15 / 2 + 0.575 + i * 1.15, z = cz - rows * 1.74 / 2 + 0.87 + j * 1.74;
      out.push({ x: x, z: z, y: c.y + 0.09 + (z - cz) * t });
    }
    return out;
  }
  all('figure.bk-widget[data-widget="site-model"]').forEach(function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out');
    if (!svg || !out) return;
    var started = false;
    var start = function () { if (started || fig.offsetParent === null) return; started = true; smThree(function () { smMount(fig, svg, out, 'house'); }); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); start(); } }); }, { rootMargin: '200px' });
      io.observe(fig);
    } else start();
  });
  function smMount(fig, svg, out, kind) {
    var T = window.THREE, D = SMS[kind], fr = (fig.closest('[lang]') || root).getAttribute('lang') === 'fr', t = SMT[fr ? 'fr' : 'en'];
    var W = smWalls(D.foot, D.wallH), Z = smZones(D);
    var st = { view: 'iso', az: Math.PI * 0.75, fid: false, rules: false, tog: true, flow: 'noon', sel: 'bat', mods: true, dims: true, bg: 'dots' };
    var deg = Math.PI / 180, dead = false;
    var fmt = function (v) { return v.toFixed(1).replace('.', fr ? ',' : '.'); };

    // the stage: the canvas, a layer of labels over it, the controls under it
    var wrap = doc.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:460px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:' + SMC.ground + ';touch-action:none';
    var canvas = doc.createElement('canvas'); canvas.style.cssText = 'display:block;width:100%;height:100%';
    var layer = doc.createElement('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:500 11.5px/1.2 Inter,system-ui,sans-serif';
    wrap.appendChild(canvas); wrap.appendChild(layer);
    svg.style.display = 'none'; fig.insertBefore(wrap, out);

    var r = new T.WebGLRenderer({ canvas: canvas, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.NeutralToneMapping; r.toneMappingExposure = 1.02;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFShadowMap;
    var sc = new T.Scene(); sc.background = new T.Color(SMC.ground);
    var hemi = new T.HemisphereLight('#FFFFFF', '#B9B2A6', 1.5 * Math.PI / 2); sc.add(hemi);
    var sun = new T.DirectionalLight('#FFF4DF', 2.2); sun.castShadow = true; sun.shadow.mapSize.set(D.shadow > 30 ? 4096 : 2048, D.shadow > 30 ? 4096 : 2048);
    var shc = sun.shadow.camera, sh = D.shadow; shc.left = -sh; shc.right = sh; shc.top = sh; shc.bottom = -sh; shc.near = 1; shc.far = 160; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
    sc.add(sun); sc.add(sun.target);
    var mid = [(D.lot[0] + D.lot[2]) / 2, (D.lot[1] + D.lot[3]) / 2];

    // every object is registered with its fidelity: the Fidelity view swaps its material
    var reg = [], fidMat = {}, edgeMat = {};
    Object.keys(SMF).forEach(function (k) {
      fidMat[k] = new T.MeshStandardMaterial({ color: SMF[k], roughness: 0.9, transparent: k === 'schematic', opacity: k === 'schematic' ? 0.55 : 1 });
      edgeMat[k] = new T.LineBasicMaterial({ color: k === 'measured' ? '#2B2F35' : k === 'declared' ? '#6F6A62' : '#A9A59E', transparent: true, opacity: k === 'schematic' ? 0.35 : 0.9 });
    });
    var mat = function (c, x) { var m = { color: c, roughness: 0.85 }; for (var k in (x || {})) m[k] = x[k]; return new T.MeshStandardMaterial(m); };
    var add = function (mesh, fid, parent, edges) {
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.mat = mesh.material; mesh.userData.fid = fid;
      reg.push(mesh); (parent || sc).add(mesh);
      if (edges !== false) { var e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 25), edgeMat[fid]); e.raycast = function () {}; mesh.add(e); }
      return mesh;
    };
    var box = function (w, h, d) { return new T.BoxGeometry(w, h, d); };
    var canvasTex = function (w, h, paint, rep) { return smTex(T, w, h, paint, rep); };
    var courseTex = smCourseTex(T), seamTex = smSeamTex(T);
    // the metric grid of D-68, 1 m minor and 5 m major, as dots or lines: one texture holds 5 m
    var gridTex = function (kind) {
      return canvasTex(320, 320, function (g, w) {
        g.clearRect(0, 0, w, w); g.fillStyle = g.strokeStyle = SMC.ink;
        for (var i = 0; i < 5; i++) for (var j = 0; j < 5; j++) {
          var x = i * 64 + 0.5, y = j * 64 + 0.5, major = i === 0 && j === 0;
          if (kind === 'dots') { g.globalAlpha = major ? 0.55 : 0.42; if (major) { g.fillRect(x - 6, y - 1, 12, 2); g.fillRect(x - 1, y - 6, 2, 12); } else { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } }
        }
        if (kind === 'lines') {
          for (var k = 0; k < 5; k++) { g.globalAlpha = k ? 0.1 : 0.24; g.fillRect(k * 64, 0, k ? 1 : 2, w); g.fillRect(0, k * 64, w, k ? 1 : 2); }
        }
      }, true);
    };
    var shade = function (g) { return smShade(T, g); }, aoTex = smAoTex(T);
    var aoG = new T.Group(); sc.add(aoG);
    var blob = function (x, z, w, d, op, ry, parent) {
      var m = smBlob(T, aoTex, w, d, op); m.rotation.set(-Math.PI / 2, ry || 0, 0, 'YXZ'); m.position.set(x, 0.035, z); (parent || aoG).add(m); return m;
    };
    var rbox = function (w, h, d, rr) { return smRBox(T, w, h, d, rr); };

    // ground: a wide plane fading out, the lot, the paved areas, the street
    var fade = doc.createElement('canvas'); fade.width = fade.height = 256;
    var fg = fade.getContext('2d'), grd = fg.createRadialGradient(128, 128, 40, 128, 128, 128);
    grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#000'); fg.fillStyle = grd; fg.fillRect(0, 0, 256, 256);
    var gs = Math.max(D.lot[2] - D.lot[0], D.lot[3] - D.lot[1]) * 3.2;
    var gnd = new T.Mesh(new T.PlaneGeometry(gs, gs), mat(SMC.ground, { alphaMap: new T.CanvasTexture(fade), transparent: true, roughness: 1 }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(mid[0], -0.02, mid[1]); gnd.receiveShadow = true; sc.add(gnd);
    var flat = function (x0, z0, x1, z1, c, y, fid, parent) {
      var m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), mat(c, { roughness: 1 }));
      m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      add(m, fid, parent, false); m.castShadow = false; return m;
    };
    flat(D.lot[0], D.lot[1], D.lot[2], D.lot[3], SMC.lot, 0, 'schematic');
    (D.flats || []).forEach(function (f) { flat(f[0], f[1], f[2], f[3], SMC[f[4]], 0.01, 'schematic'); });
    if (D.surface) flat(D.surface[0], D.surface[1], D.surface[2], D.surface[3], SMC.asphalt, 0.01, 'measured');
    if (D.street) flat(D.lot[0] - 20, D.lot[3] + 0.2, D.lot[2] + 20, D.lot[3] + 7.5, SMC.street, -0.01, 'schematic');
    // bay lines, painted: one thin strip per bay side
    var lineMat = mat(SMC.line, { roughness: 1 });
    (D.bays || []).forEach(function (b) {
      var bw = (b.x1 - b.x0) / b.n;
      for (var i = 0; i <= b.n; i++) { var m = add(new T.Mesh(new T.PlaneGeometry(0.1, b.z1 - b.z0), lineMat), 'schematic', null, false); m.rotation.x = -Math.PI / 2; m.position.set(b.x0 + i * bw, 0.02, (b.z0 + b.z1) / 2); m.castShadow = false; }
    });
    // the lot boundary from the cadastre: a dashed line
    var lb = [[D.lot[0], D.lot[1]], [D.lot[2], D.lot[1]], [D.lot[2], D.lot[3]], [D.lot[0], D.lot[3]], [D.lot[0], D.lot[1]]].map(function (p) { return new T.Vector3(p[0], 0.03, p[1]); });
    var lbl = new T.Line(new T.BufferGeometry().setFromPoints(lb), new T.LineDashedMaterial({ color: SMF.measured, dashSize: 0.6, gapSize: 0.35 }));
    lbl.computeLineDistances(); sc.add(lbl);
    // the metric grid over the ground, fading with it; whole metres fall on its lines
    var gsz = Math.ceil(gs / 2 / 10) * 20, gc = [Math.round(mid[0] / 5) * 5, Math.round(mid[1] / 5) * 5];
    var grids = { dots: gridTex('dots'), lines: gridTex('lines') };
    Object.keys(grids).forEach(function (k) { grids[k].repeat.set(gsz / 5, gsz / 5); });
    var gridM = new T.Mesh(new T.PlaneGeometry(gsz, gsz), new T.MeshBasicMaterial({ map: grids.dots, alphaMap: gnd.material.alphaMap, transparent: true, depthWrite: false }));
    gridM.rotation.x = -Math.PI / 2; gridM.position.set(gc[0], 0.03, gc[1]); gridM.renderOrder = 2; sc.add(gridM);

    // the buildings extruded from their footprints, a plinth, the openings
    D.bodies.forEach(function (b) {
      blob((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0] + 1.2, b[3] - b[1] + 1.2, 0.32);
      add(new T.Mesh(shade(box(b[2] - b[0], b[4], b[3] - b[1])), mat(SMC.walls, { vertexColors: true })), b[5]).position.set((b[0] + b[2]) / 2, b[4] / 2, (b[1] + b[3]) / 2);
      add(new T.Mesh(box(b[2] - b[0] + 0.06, 0.32, b[3] - b[1] + 0.06), mat(SMC.plinth)), b[5], null, false).position.set((b[0] + b[2]) / 2, 0.16, (b[1] + b[3]) / 2);
    });
    D.open.forEach(function (q) {
      var wl = W[q.w], len = q.s1 - q.s0, y0 = q.y0 != null ? q.y0 : q.k === 'win' ? 0.9 : 0, y1 = q.y1 || (q.k === 'gdoor' ? 2.3 : 2.1), h = y1 - y0;
      var fid = q.k === 'win' ? 'schematic' : 'declared', g = new T.Group();
      var fill = add(new T.Mesh(box(len, h, 0.04), mat(q.k === 'win' ? SMC.glass : SMC.door, { roughness: q.k === 'win' ? 0.3 : 0.8 })), fid, g);
      fill.castShadow = false;
      if (q.k === 'win') { var sill = add(new T.Mesh(box(len + 0.16, 0.05, 0.12), mat(SMC.frame)), fid, g, false); sill.position.set(0, -h / 2 - 0.02, 0.04); }
      var p = smAt(W, q.w, (q.s0 + q.s1) / 2, 0.02, y0 + h / 2);
      g.position.set(p[0], p[1], p[2]); g.rotation.y = Math.atan2(wl.nx, wl.nz); sc.add(g);
    });

    // modules: a texture with the frame and the half-cut cells, one instanced mesh per zone
    var mc = doc.createElement('canvas'); mc.width = 113; mc.height = 172;
    var mg = mc.getContext('2d'); mg.fillStyle = '#E6E8EA'; mg.fillRect(0, 0, 113, 172); mg.fillStyle = '#26364A'; mg.fillRect(3, 3, 107, 166);
    mg.strokeStyle = 'rgba(160,180,205,.45)'; mg.lineWidth = 1;
    for (var ci = 1; ci < 6; ci++) { mg.beginPath(); mg.moveTo(3 + ci * 107 / 6, 3); mg.lineTo(3 + ci * 107 / 6, 169); mg.stroke(); }
    for (var cj = 1; cj < 20; cj++) { mg.beginPath(); mg.moveTo(3, 3 + cj * 166 / 20); mg.lineTo(110, 3 + cj * 166 / 20); mg.stroke(); }
    var mtex = new T.CanvasTexture(mc); mtex.colorSpace = T.SRGBColorSpace; mtex.anisotropy = 4;
    var modMat = new T.MeshStandardMaterial({ map: mtex, roughness: 0.35, metalness: 0.1 }), modGeo = box(1.13, 0.04, 1.72);
    // the box's top face carries the texture upright; its sides take the frame colour
    var modL = [];
    var instanced = function (list, tilt, fid, parent) {
      var im = new T.InstancedMesh(modGeo, modMat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -tilt * deg), one = new T.Vector3(1, 1, 1);
      list.forEach(function (p, i) { im.setMatrixAt(i, m4.compose(new T.Vector3(p.x, p.y, p.z), q, one)); });
      im.castShadow = true; im.receiveShadow = true; im.userData.mat = modMat; im.userData.fid = fid; reg.push(im); modL.push(im); (parent || sc).add(im); return im;
    };
    // the zones of the site with their modules: the capacity is their sum
    var zones = [], togG = new T.Group(), PV, ye = 0, tp = 0, Z0 = 0;
    sc.add(togG);

    if (D.roof === 'hip') {
      // the measured roof: a hip over the house, with its overhang and a fascia
      var o = D.over; tp = Math.tan(D.pitch * deg);
      var yr = D.eave + 5 * tp, X0 = -7.5 - o, X1 = 7.5 + o, Z1 = 5 + o; ye = D.eave - o * tp; Z0 = -5 - o;
      var hipV = [[X0, ye, Z0], [X1, ye, Z0], [2.5, yr, 0], [-2.5, yr, 0], [X0, ye, Z1], [X1, ye, Z1]];
      var roofGeo = function (pos) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
      // faces with their tile courses: parallel to the eave, 0.31 m apart in plan
      var faces = function (list) {
        var pos = [], uv = [];
        list.forEach(function (f) { f[2].forEach(function (i) { var v = f[0][i]; pos.push(v[0], v[1], v[2]); uv.push(f[1] === 'x' ? v[0] / 2 : v[2] / 2, f[1] === 'x' ? v[2] / 0.31 : v[0] / 0.31); }); });
        var g = roofGeo(pos); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); return g;
      };
      var roofMat = mat(SMC.roof, { side: T.DoubleSide, map: courseTex }), gRoofMat = mat(SMC.garageRoof, { side: T.DoubleSide, map: courseTex });
      add(new T.Mesh(faces([[hipV, 'x', [0, 2, 1, 0, 3, 2]], [hipV, 'x', [4, 5, 2, 4, 2, 3]], [hipV, 'z', [0, 4, 3]], [hipV, 'z', [1, 2, 5]]]), roofMat), 'measured');
      // a ridge and hip caps: three strokes, as the plan draws them
      var capMat = mat('#7E766B', { roughness: 0.7 });
      [[hipV[2], hipV[3]], [hipV[0], hipV[3]], [hipV[4], hipV[3]], [hipV[1], hipV[2]], [hipV[5], hipV[2]]].forEach(function (s) {
        var a = new T.Vector3().fromArray(s[0]), b = new T.Vector3().fromArray(s[1]), cap = add(new T.Mesh(new T.CylinderGeometry(0.07, 0.07, a.distanceTo(b), 6), capMat), 'measured', null, false);
        cap.position.copy(a).add(b).multiplyScalar(0.5); cap.position.y += 0.03; cap.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      });
      [[X1 - X0, Z0, 0], [X1 - X0, Z1, 0], [Z1 - Z0, X0, 1], [Z1 - Z0, X1, 1]].forEach(function (f) {
        var m = add(new T.Mesh(box(f[2] ? 0.04 : f[0], 0.14, f[2] ? f[0] : 0.04), mat(SMC.fascia)), 'measured', null, false);
        if (f[2]) m.position.set(f[1], ye - 0.07, 0); else m.position.set(0, ye - 0.07, f[1]);
      });
      // the declared garage roof: a gable along the garage, 15°
      var gt = Math.tan(D.garagePitch * deg), go = 0.3, gye = D.garageEave - go * gt, gyr = D.garageEave + 3 * gt;
      var gV = [[7.5 - go, gye, -1 - go], [10.5, gyr, -1 - go], [13.5 + go, gye, -1 - go], [7.5 - go, gye, 6 + go], [10.5, gyr, 6 + go], [13.5 + go, gye, 6 + go]];
      add(new T.Mesh(faces([[gV, 'z', [0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]]]), gRoofMat), 'declared');
      var gr = add(new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 7 + 2 * go, 6), capMat), 'declared', null, false); gr.rotation.x = Math.PI / 2; gr.position.set(10.5, gyr + 0.03, 2.5);
      var gable = roofGeo([7.5, D.garageEave, -1, 10.5, gyr, -1, 13.5, D.garageEave, -1, 7.5, D.garageEave, 6, 13.5, D.garageEave, 6, 10.5, gyr, 6]);
      add(new T.Mesh(gable, mat(SMC.walls, { side: T.DoubleSide })), 'declared', null, false);
      PV = smHipModules(D); instanced(PV, D.pitch, 'declared');
      zones.push({ name: 'zNorth', n: PV.length });
    } else {
      // flat roofs: a membrane and a parapet on every body
      D.bodies.forEach(function (b) {
        var w = b[2] - b[0], d = b[3] - b[1], cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2, p = D.parapet, th = 0.25;
        var mb = flat(b[0], b[1], b[2], b[3], SMC.flatRoof, b[4] + 0.01, b[5]), sx = seamTex.clone();
        sx.repeat.set(w / 2, d / 2); sx.needsUpdate = true; mb.material.map = sx; mb.receiveShadow = true;
        [[w, th, cx, b[1] + th / 2], [w, th, cx, b[3] - th / 2], [th, d, b[0] + th / 2, cz], [th, d, b[2] - th / 2, cz]].forEach(function (q) {
          add(new T.Mesh(box(q[0], p, q[1]), mat(SMC.parapet)), b[5], null, false).position.set(q[2], b[4] + p / 2, q[3]);
        });
      });
      (D.units || []).forEach(function (u) { add(new T.Mesh(box(u[2], 1.2, u[3]), mat('#D6D3CC', { roughness: 0.6 })), 'measured').position.set(u[0], D.eave + 0.6, u[1]); });
      if (kind === 'ci') {
        PV = smFlatModules(D); instanced(PV, D.tilt, 'declared');
        // a ballast frame under each row
        PV.rows.forEach(function (row) {
          var xa = row[0].x - 0.6, xb = row[row.length - 1].x + 0.6;
          var fr = add(new T.Mesh(box(xb - xa, 0.12, 1.5), mat(SMC.steel, { roughness: 0.5 })), 'declared', null, false); fr.position.set((xa + xb) / 2, D.eave + 0.07, row[0].z); modL.push(fr);
        });
        zones.push({ name: 'zFlat', n: PV.length });
      } else PV = [];
    }

    // canopies and carports: a tilted slab on posts, with its own modules
    var canopyArea = 0, CPm0 = null;
    D.canopies.forEach(function (c) {
      var g = new T.Group(), w = c.x1 - c.x0, d = c.z1 - c.z0, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, ct = Math.tan(c.tilt * deg);
      var slab = add(new T.Mesh(box(w, 0.12, d / Math.cos(c.tilt * deg)), mat(c.fid === 'declared' ? SMC.steel : SMC.carport)), c.fid, g);
      slab.position.set(cx, c.y, cz); slab.rotation.x = -c.tilt * deg;
      var posts = c.posts === 'corners' ? [[c.x0 + 0.15, c.z0 + 0.15], [c.x1 - 0.15, c.z0 + 0.15], [c.x0 + 0.15, c.z1 - 0.15], [c.x1 - 0.15, c.z1 - 0.15]] : [];
      if (c.posts === 'rows') for (var px = c.x0 + 2.5; px < c.x1; px += 7.5) posts.push([px, cz - 0.6]);
      posts.forEach(function (p) {
        var h = c.y + (p[1] - cz) * ct, post = add(new T.Mesh(box(0.2, h, 0.2), mat(c.fid === 'declared' ? SMC.steel : SMC.carport)), c.fid, g);
        post.position.set(p[0], h / 2, p[1]); blob(p[0], p[1], 0.7, 0.7, 0.35, 0, g);
      });
      var mods = smCanopyModules(c); instanced(mods, c.tilt, c.fid, g);
      if (!CPm0) CPm0 = { c: c, mods: mods };
      zones.push({ name: c.name, n: mods.length, tog: !!c.tog, area: w * d });
      (c.tog ? togG : sc).add(g);
    });
    if (!PV.length && CPm0) PV = CPm0.mods;

    // cars from the site core, every mesh registered as schematic; the first one is the charging car
    var tyreMat = mat(SMC.tyre), glassMat = mat('#2F3A45', { roughness: 0.15, metalness: 0.3 });
    var own = function (g, fid, edged) { var ms = []; g.traverse(function (o) { if (o.isMesh) ms.push(o); }); ms.forEach(function (o) { var p = o.parent; p.remove(o); add(o, fid, p, edged === o); }); return g; };
    var car = function (x, z, ci, fl) {
      var g = smCar(T, mat, SMCARS[ci % SMCARS.length]); own(g, 'schematic', g.children[0]);
      blob(0, 0, 2.1, 4.6, 0.42, 0, g);
      if (fl) g.rotation.y = Math.PI;
      g.position.set(x, 0, z); sc.add(g);
    };
    D.cars.forEach(function (c) { car(c.x, c.z, 0); });
    // the other bays, filled by a fixed pattern so the drawing does not change between visits
    (D.bays || []).forEach(function (b, bi) {
      var bw = (b.x1 - b.x0) / b.n;
      for (var i = 0; i < b.n; i++) {
        var x = b.x0 + (i + 0.5) * bw, z = (b.z0 + b.z1) / 2, taken = D.cars.some(function (c) { return Math.abs(c.x - x) < 1 && Math.abs(c.z - z) < 2.6; });
        if (!taken && ((i * 7 + bi * 3) % 10) / 10 < (D.carFill || 0.45)) car(x, z, i + bi, (b.z0 + b.z1) / 2 < 0 !== (bi % 2 === 1));
      }
    });
    // a box truck at the loading doors
    (D.trucks || []).forEach(function (p) {
      var g = new T.Group();
      add(new T.Mesh(rbox(2.4, 2.7, 6.2, 0.08), mat('#ECEAE5', { roughness: 0.6 })), 'schematic', g).position.set(0, 1.95, 0.8);
      add(new T.Mesh(rbox(2.3, 2.0, 1.9, 0.25), mat('#5F6B78', { roughness: 0.45 })), 'schematic', g).position.set(0, 1.45, -3.3);
      add(new T.Mesh(box(2.1, 0.7, 0.05), glassMat), 'schematic', g, false).position.set(0, 2.0, -4.26);
      [[-1, -3], [1, -3], [-1, 2.6], [1, 2.6]].forEach(function (q) { var wh = add(new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.3, 20), tyreMat), 'schematic', g, false); wh.rotation.z = Math.PI / 2; wh.position.set(q[0], 0.45, q[1]); });
      blob(0, -0.2, 2.8, 8.6, 0.42, 0, g);
      g.rotation.y = Math.PI / 2; g.position.set(p[0], 0, p[1]); sc.add(g);
    });
    // trees: three faceted crowns on a trunk, two greens
    var leafA = mat(SMC.leaf, { flatShading: true }), leafB = mat('#8A9E80', { flatShading: true });
    D.trees.forEach(function (p, ti) {
      var tr = new T.Group(); add(new T.Mesh(new T.CylinderGeometry(0.16, 0.24, 2.6, 7), mat(SMC.trunk)), 'schematic', tr, false).position.y = 1.3;
      [[0, 3.7, 0, 1.7], [0.9, 3.2, 0.5, 1.2], [-0.8, 3.3, -0.4, 1.25]].forEach(function (c, i) {
        add(new T.Mesh(new T.IcosahedronGeometry(c[3], 0), (i + ti) % 2 ? leafB : leafA), 'schematic', tr, false).position.set(c[0], c[1], c[2]);
      });
      blob(0, 0, 3.2, 3.2, 0.28, 0, tr);
      tr.rotation.y = ti * 1.3; tr.position.set(p[0], 0, p[1]); sc.add(tr);
    });

    // equipment, anchored to a wall: the site core's catalogue-sized unit, standing off the wall
    var EQ = {};
    Object.keys(D.equip).forEach(function (k) {
      var e = D.equip[k], g = smEquip(T, k, e, mat), b = g.userData.body; own(g, 'declared', b);
      if (e.y0 < 0.2) { var bl = blob(0, 0, e.W + 0.5, e.D + 0.5, 0.38, 0, g); bl.position.y = -e.H / 2 - e.y0 + 0.035; }
      b.userData.eq = k; sc.add(g); EQ[k] = { e: e, g: g, a: { w: e.w, s: e.s } };
    });
    var placeEq = function (k) {
      var q = EQ[k], e = q.e, wl = W[q.a.w], off = (e.gap || 0) + e.D / 2, p = smAt(W, q.a.w, q.a.s, off, e.y0 + e.H / 2 + (k === 'hp' ? 0.1 : 0));
      q.g.position.set(p[0], p[1], p[2]); q.g.rotation.y = Math.atan2(wl.nx, wl.nz);
      if (planEq[k]) { var m = smAt(W, q.a.w, q.a.s, off, 0); planEq[k].position.set(m[0], 0, m[2]); planEq[k].rotation.y = q.g.rotation.y; }
    };

    // the plan's own layer, drawn over the roofs: the walls dashed under the eaves, the equipment
    // as symbols, the measured dimensions; the cables go over the roofs too (see paint)
    var planG = new T.Group(), planEq = {}, dimL = []; planG.visible = false; sc.add(planG);
    var over = function (o, ro) { o.renderOrder = ro || 6; o.material.depthTest = false; o.material.transparent = true; planG.add(o); return o; };
    var fp = D.foot.concat([D.foot[0]]).map(function (p) { return new T.Vector3(p[0], 0.1, p[1]); });
    var fl = over(new T.Line(new T.BufferGeometry().setFromPoints(fp), new T.LineDashedMaterial({ color: SMC.ink, dashSize: 0.45, gapSize: 0.25, opacity: 0.75 }))); fl.computeLineDistances();
    var eqCol = { inv: SMC.ac, bat: SMC.bat, sb: '#6F6A62', evc: SMC.ev, hp: SMC.hpc };
    Object.keys(EQ).forEach(function (k) {
      var e = EQ[k].e, g = new T.Group(), d = Math.max(e.D, 0.3), m = over(new T.Mesh(new T.PlaneGeometry(e.W, d), new T.MeshBasicMaterial({ color: eqCol[k] })), 7);
      m.rotation.x = -Math.PI / 2; planG.remove(m); g.add(m);
      var ol = over(new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: '#FFFFFF' })), 8); planG.remove(ol); ol.rotation.x = -Math.PI / 2; g.add(ol);
      planEq[k] = g; planG.add(g);
    });
    // dimensions of the measured outline: extension lines, a dimension line, oblique ticks
    var dimMat = new T.LineBasicMaterial({ color: SMF.measured });
    (D.dims || []).forEach(function (q) {
      var a = [q[0], q[1]], b = [q[2], q[3]], n = [q[4], q[5]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], o = 2, v = [];
      var P = function (p, k, j) { return new T.Vector3(p[0] + n[0] * k + u[0] * (j || 0), 0.1, p[1] + n[1] * k + u[1] * (j || 0)); };
      var tk = function (p) { var c = P(p, o); v.push(new T.Vector3(c.x - (u[0] + n[0]) * 0.25, 0.1, c.z - (u[1] + n[1]) * 0.25), new T.Vector3(c.x + (u[0] + n[0]) * 0.25, 0.1, c.z + (u[1] + n[1]) * 0.25)); };
      v.push(P(a, 0.3), P(a, o + 0.3), P(b, 0.3), P(b, o + 0.3), P(a, o), P(b, o)); tk(a); tk(b);
      over(new T.LineSegments(new T.BufferGeometry().setFromPoints(v), dimMat), 9);
      var c = P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], o + 0.55);
      dimL.push({ at: [c.x, 0.1, c.z], L: L });
    });

    // the rule of the site, shown with its button: battery zones, the roof edge, or the car park surface
    var zoneG = new T.Group(), zMat = new T.MeshBasicMaterial({ color: SMC.zone, transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide });
    Z.forEach(function (z) {
      var wl = W[z.w], s0 = Math.max(0, z.s0), s1 = Math.min(wl.L, z.s1), len = s1 - s0, mz = (s0 + s1) / 2, ry = Math.atan2(wl.nx, wl.nz);
      var a = new T.Mesh(new T.PlaneGeometry(len, z.y1 - z.y0), zMat), p = smAt(W, z.w, mz, 0.05, (z.y0 + z.y1) / 2);
      a.position.set(p[0], p[1], p[2]); a.rotation.y = ry; zoneG.add(a);
      var gb = new T.Mesh(new T.PlaneGeometry(len, 0.6), zMat), q = smAt(W, z.w, mz, 0.32, 0.03);
      gb.rotation.set(-Math.PI / 2, ry, 0, 'YXZ'); gb.position.set(q[0], q[1], q[2]); zoneG.add(gb);
    });
    var band = function (x0, z0, x1, z1, y) { var m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), zMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); zoneG.add(m); };
    if (D.rule === 'edge') {
      var B = D.bodies[0], e = D.edge, y = D.eave + 0.03;
      band(B[0], B[1], B[2], B[1] + e, y); band(B[0], B[3] - e, B[2], B[3], y); band(B[0], B[1] + e, B[0] + e, B[3] - e, y); band(B[2] - e, B[1] + e, B[2], B[3] - e, y);
    }
    if (D.rule === 'aper') {
      var S = D.surface, ol = [[S[0], S[1]], [S[2], S[1]], [S[2], S[3]], [S[0], S[3]], [S[0], S[1]]].map(function (p) { return new T.Vector3(p[0], 0.06, p[1]); });
      var sl = new T.Line(new T.BufferGeometry().setFromPoints(ol), new T.LineDashedMaterial({ color: SMC.zone, dashSize: 0.8, gapSize: 0.4 })); sl.computeLineDistances(); zoneG.add(sl);
      D.canopies.forEach(function (c) { var m = new T.Mesh(new T.PlaneGeometry(c.x1 - c.x0, c.z1 - c.z0), new T.MeshBasicMaterial({ color: SMF.declared, transparent: true, opacity: 0.25, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set((c.x0 + c.x1) / 2, 0.05, (c.z0 + c.z1) / 2); m.userData.tog = !!c.tog; zoneG.add(m); });
    }
    zoneG.visible = false; sc.add(zoneG);

    // cables: a tube per circuit, plain or striped when the energy flows, the stripes moving with it
    var CB = {}, cableG = new T.Group(); sc.add(cableG);
    D.circuits.forEach(function (c) {
      var cv = doc.createElement('canvas'); cv.width = 48; cv.height = 4; var cg = cv.getContext('2d');
      cg.fillStyle = SMC[c.c]; cg.fillRect(0, 0, 48, 4); cg.fillStyle = 'rgba(255,255,255,.75)'; cg.fillRect(0, 0, 14, 4);
      var tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = T.RepeatWrapping;
      CB[c.id] = { c: c, tex: tx, plain: new T.MeshStandardMaterial({ color: SMC[c.c], roughness: 0.5, transparent: true }), flow: new T.MeshStandardMaterial({ map: tx, roughness: 0.5, emissive: SMC[c.c], emissiveIntensity: 0.25, transparent: true }), mesh: null, pts: null, len: 0 };
    });
    var lead = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: SMC.ev, transparent: true })); sc.add(lead);
    var hpLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: SMC.ink, dashSize: 0.25, gapSize: 0.15, transparent: true })); sc.add(hpLine);
    // where each circuit leaves an equipment: above it for wall units, at its back for floor units
    var tap = function (k) {
      var q = EQ[k], e = q.e;
      return k === 'hp' ? { a: q.a, p: smAt(W, q.a.w, q.a.s, D.off, 0.5) } : { a: q.a, p: smAt(W, q.a.w, q.a.s, D.off, Math.min(e.y0 + e.H, D.run)) };
    };
    // the strings' way from the array to a wall, at the run height
    var dcStart = function () {
      var off = D.off, pts, a;
      if (kind === 'house') {
        // from the array's lowest east corner down the slope to the eave, then down the fascia to the run
        var last = PV.reduce(function (m, p) { return p.z < m.z || (p.z === m.z && p.x > m.x) ? p : m; }, PV[0]);
        var xr = last.x + 0.5, zr = last.z - 0.75;
        pts = [[xr, D.eave + (zr + 5) * tp + 0.1, zr], [xr, ye, Z0 - 0.02], [xr, D.run, Z0 - 0.02]]; a = { w: 0, s: xr + 7.5 };
      } else if (kind === 'ci') {
        // from the east end of the first row over the parapet, then down the east wall
        var row = PV.rows[0], m = row[row.length - 1], xe = D.bodies[0][2];
        pts = [[m.x + 0.6, D.eave + 0.2, m.z], [xe - 0.3, D.eave + 0.2, m.z], [xe - 0.3, D.eave + D.parapet + 0.08, m.z], [xe + off, D.eave + D.parapet + 0.08, m.z], [xe + off, D.run, m.z]];
        a = { w: 1, s: m.z - D.bodies[0][1] };
      } else {
        // from the middle canopy's east end down a post, in a trench to the technical room, up its west wall
        var c = D.canopies[1], cz = (c.z0 + c.z1) / 2, xw = D.foot[0][0];
        pts = [[c.x1 - 0.4, c.y + 0.1, cz], [c.x1 + 0.1, c.y, cz], [c.x1 + 0.1, 0.05, cz], [xw - off, 0.05, cz], [xw - off, D.run, cz]];
        a = { w: 3, s: D.foot[3][1] - cz };
      }
      return { pts: pts, a: a };
    };
    var routeOf = function (c) {
      var Bq = tap(c.b), pts;
      if (c.a === 'pv') { var s0 = dcStart(); pts = s0.pts.concat(smRoute(W, s0.a, Bq.a, D.run, D.off)); }
      else { var A = tap(c.a); pts = [A.p].concat(smRoute(W, A.a, Bq.a, D.run, D.off)); }
      pts.push(Bq.p);
      // drop repeated points (a run that starts at the anchor's own height)
      return pts.filter(function (p, i) { return i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) > 1e-6; });
    };
    var inlet = function () { var c = D.cars[0]; return [c.x - 0.95, 0.85, c.z - 1.3]; };
    var buildCables = function () {
      D.circuits.forEach(function (c) {
        var cb = CB[c.id], pts = routeOf(c), path = new T.CurvePath();
        for (var i = 1; i < pts.length; i++) path.add(new T.LineCurve3(new T.Vector3().fromArray(pts[i - 1]), new T.Vector3().fromArray(pts[i])));
        cb.pts = pts; cb.len = smLen(pts); cb.vert = smVert(pts);
        if (cb.mesh) { cableG.remove(cb.mesh); cb.mesh.geometry.dispose(); }
        cb.mesh = new T.Mesh(new T.TubeGeometry(path, Math.max(16, Math.ceil(cb.len * 10)), kind === 'house' ? 0.08 : 0.12, 8, false), st.flow !== 'off' && D.flow[st.flow][c.id] ? cb.flow : cb.plain);
        cb.mesh.castShadow = true; cb.tex.repeat.set(cb.len / 0.6, 1); cableG.add(cb.mesh);
      });
      // the charger's tethered cable to the car inlet
      var ch = EQ.evc, cp0 = smAt(W, ch.a.w, ch.a.s, 0.1, ch.e.y0), inl = inlet();
      var md = [(cp0[0] + inl[0]) / 2, Math.min(cp0[1], inl[1]) - 0.4, (cp0[2] + inl[2]) / 2];
      var curve = new T.QuadraticBezierCurve3(new T.Vector3().fromArray(cp0), new T.Vector3().fromArray(md), new T.Vector3().fromArray(inl));
      lead.geometry.dispose(); lead.geometry = new T.BufferGeometry().setFromPoints(curve.getPoints(24)); st.reach = curve.getLength();
      // the heat pump's distance to the boundary
      if (EQ.hp) {
        var h = EQ.hp, he = h.e, front = smAt(W, h.a.w, h.a.s, (he.gap || 0) + he.D, 0.04), L = D.lot;
        var cand = [[L[0], front[2]], [L[2], front[2]], [front[0], L[1]], [front[0], L[3]]].map(function (p) { return { p: p, d: Math.hypot(p[0] - front[0], p[1] - front[2]) }; }).sort(function (a, b) { return a.d - b.d; })[0];
        hpLine.geometry.dispose(); hpLine.geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(front[0], 0.04, front[2]), new T.Vector3(cand.p[0], 0.04, cand.p[1])]); hpLine.computeLineDistances();
        st.hp = { d: cand.d, at: [(front[0] + cand.p[0]) / 2, 0.05, (front[2] + cand.p[1]) / 2] };
      }
      // the battery against the zones of its wall
      var b = EQ.bat, be = b.e;
      st.batIn = Z.filter(function (z) { return z.w === b.a.w && b.a.s + be.W / 2 > z.s0 && b.a.s - be.W / 2 < z.s1 && be.y0 < z.y1 && be.y0 + be.H > z.y0; })[0] || null;
    };

    // cameras: the plan looks straight down, north up; the isometric looks down 35.264° from a corner
    var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.5, 600), target = new T.Vector3().fromArray(D.iso.t);
    var frame = function () {
      var w = wrap.clientWidth || 600, h = wrap.clientHeight || 460, asp = w / h;
      r.setSize(w, h, false);
      if (st.view === 'plan') {
        var hw = (D.lot[2] - D.lot[0]) / 2 + 1.5, hh = (D.lot[3] - D.lot[1]) / 2 + 1.5;
        if (hw / hh > asp) hh = hw / asp; else hw = hh * asp;
        cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
        cam.up.set(0, 0, -1); cam.position.set(mid[0], 120, mid[1]); cam.lookAt(mid[0], 0, mid[1]);
      } else {
        var e = Math.atan(1 / Math.SQRT2), hh2 = asp < 1 ? D.iso.h * 1.24 / asp : D.iso.h;
        cam.left = -hh2 * asp; cam.right = hh2 * asp; cam.top = hh2; cam.bottom = -hh2;
        cam.up.set(0, 1, 0); cam.position.set(target.x + 150 * Math.sin(st.az) * Math.cos(e), target.y + 150 * Math.sin(e), target.z + 150 * Math.cos(st.az) * Math.cos(e)); cam.lookAt(target);
      }
      cam.updateProjectionMatrix();
    };
    var light = function () {
      var k = D.shadow / 24;
      if (st.flow === 'eve') { sun.position.set(mid[0] - 34 * k, 7 * k, mid[1] - 8 * k); sun.intensity = 1.3; hemi.intensity = 1.6; sc.background.set('#D9D3CA'); }
      else { sun.position.set(mid[0] + 10 * k, 34 * k, mid[1] - 22 * k); sun.intensity = 2.2; hemi.intensity = 1.5 * Math.PI / 2; sc.background.set(SMC.ground); }
      sun.target.position.set(mid[0], 0, mid[1]);
    };
    var paint = function () {
      reg.forEach(function (m) { m.material = st.fid && !m.isInstancedMesh ? fidMat[m.userData.fid] : m.userData.mat; });
      var plan = st.view === 'plan';
      planG.visible = plan; modL.forEach(function (m) { m.visible = st.mods; });
      gridM.visible = st.bg !== 'plain'; if (st.bg !== 'plain') gridM.material.map = grids[st.bg];
      // on the plan the circuits are an overlay: drawn over the eaves that hide them in 3D
      Object.keys(CB).forEach(function (id) { [CB[id].plain, CB[id].flow].forEach(function (m) { m.depthTest = !plan; }); if (CB[id].mesh) CB[id].mesh.renderOrder = plan ? 5 : 0; });
      lead.material.depthTest = hpLine.material.depthTest = !plan; lead.renderOrder = hpLine.renderOrder = plan ? 5 : 0;
      zoneG.visible = st.rules; togG.visible = st.tog;
      zoneG.children.forEach(function (m) { if (m.userData.tog) m.visible = st.tog; });
    };

    // labels over the canvas: the equipment (draggable), the cable lengths, the checks
    var chip = function (txt, bg, fg, can) {
      var c = doc.createElement(can ? 'button' : 'span');
      c.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;padding:3px 7px;border-radius:999px;border:1px solid rgba(0,0,0,.1);box-shadow:0 1px 3px rgba(20,24,30,.14);background:' + bg + ';color:' + fg + ';font:inherit;' + (can ? 'pointer-events:auto;cursor:grab;touch-action:none' : '');
      c.textContent = txt; layer.appendChild(c); return c;
    };
    var labels = {};
    Object.keys(EQ).forEach(function (k) {
      var c = chip(t[k], '#FFFFFF', SMC.ink, true); c.setAttribute('aria-label', t[k] + ' · ' + t.hint); labels[k] = c;
      c.addEventListener('pointerdown', function (ev) { ev.preventDefault(); c.setPointerCapture(ev.pointerId); st.drag = k; st.sel = k; c.style.cursor = 'grabbing'; refresh(); });
      c.addEventListener('pointermove', function (ev) { if (st.drag === k) dragTo(k, ev); });
      c.addEventListener('pointerup', function () { st.drag = null; c.style.cursor = 'grab'; refresh(); });
      c.addEventListener('keydown', function (ev) {
        var dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key];
        if (!dir) return; ev.preventDefault(); st.sel = k; slide(k, EQ[k].a.w, EQ[k].a.s + dir * (ev.shiftKey ? 0.5 : 0.1));
      });
      c.addEventListener('focus', function () { st.sel = k; refresh(); });
    });
    var leads = smLeaders(layer, Object.keys(EQ));
    var lenChips = {};
    D.circuits.forEach(function (c) { lenChips[c.id] = chip('', SMC[c.c], '#FFFFFF', false); });
    dimL.forEach(function (d) { d.el = chip(fmt(d.L) + ' m', '#FFFFFF', SMF.measured, false); d.el.style.fontWeight = '600'; });
    var hpChip = chip('', '#FFFFFF', SMC.ink, false), reachChip = chip('', '#FFFFFF', SMC.ev, false);
    var v3 = new T.Vector3(), look = new T.Vector3();
    var project = function (p, el) {
      v3.set(p[0], p[1], p[2]).project(cam);
      var vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      el.style.display = vis ? '' : 'none';
      el.style.left = ((v3.x + 1) / 2 * wrap.clientWidth).toFixed(1) + 'px'; el.style.top = ((1 - v3.y) / 2 * wrap.clientHeight).toFixed(1) + 'px';
    };
    // a wall turned away from the camera hides its equipment: so does its label
    var facing = function (w) { return W[w].nx * look.x + W[w].nz * look.z < 0.05; };
    var near = function (c) { return c.a === st.sel || c.b === st.sel; };
    var placeLabels = function () {
      cam.getWorldDirection(look);
      // callouts: a dot on the unit, a leader out on the side its wall faces, the label clear of the unit
      var placed = [], todo = [], px = function (p) { v3.set(p[0], p[1], p[2]).project(cam); return [(v3.x + 1) / 2 * wrap.clientWidth, (1 - v3.y) / 2 * wrap.clientHeight, v3.z < 1]; };
      Object.keys(EQ).forEach(function (k) {
        var q = EQ[k], e = q.e, y = e.y0 + e.H * 0.6, show = facing(q.a.w) || st.drag === k;
        labels[k].style.display = show ? '' : 'none'; leads[k].show(show); if (!show) return;
        var a = px(smAt(W, q.a.w, q.a.s, (e.gap || 0) + e.D, y)), n = px(smAt(W, q.a.w, q.a.s, (e.gap || 0) + e.D + 2, y));
        todo.push({ k: k, a: a, side: n[0] >= a[0] ? 1 : -1 });
      });
      todo.sort(function (p, q2) { return p.a[1] - q2.a[1]; }).forEach(function (t) {
        var bad = t.k === 'bat' && st.batIn, col = bad ? SMC.zone : SMC.ink;
        smCallout(labels[t.k], leads[t.k].line, leads[t.k].dot, t.a[0], t.a[1], t.side, col, placed);
        labels[t.k].style.background = bad ? SMC.zone : st.sel === t.k ? SMC.ink : '#FFFFFF';
        labels[t.k].style.color = bad || st.sel === t.k ? '#FFFFFF' : SMC.ink;
      });
      D.circuits.forEach(function (c) {
        var cb = CB[c.id], pts = cb.pts, half = cb.len / 2, acc = 0, at = pts[0];
        for (var i = 1; i < pts.length; i++) {
          var seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
          if (acc + seg >= half) { var f = (half - acc) / seg; at = [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1]), pts[i - 1][2] + f * (pts[i][2] - pts[i - 1][2])]; break; }
          acc += seg;
        }
        lenChips[c.id].textContent = '≈ ' + fmt(cb.len) + ' m'; project(at, lenChips[c.id]);
        if (!near(c)) lenChips[c.id].style.display = 'none';
      });
      if (st.hp) { hpChip.textContent = fmt(st.hp.d) + ' m'; project(st.hp.at, hpChip); }
      if (st.sel !== 'hp' || !st.hp) hpChip.style.display = 'none';
      reachChip.textContent = fmt(st.reach) + ' / ' + D.equip.evc.cable + ' m'; reachChip.style.color = st.reach > D.equip.evc.cable ? SMC.zone : SMC.ev;
      var ch = EQ.evc; project(smAt(W, ch.a.w, ch.a.s, 1.6, 0.6), reachChip);
      if (st.sel !== 'evc') reachChip.style.display = 'none';
      dimL.forEach(function (d) { project(d.at, d.el); if (st.view !== 'plan' || !st.dims) d.el.style.display = 'none'; });
    };

    // dragging: the pointer meets the plane at the equipment's height, then the nearest wall takes it
    var ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3();
    var dragTo = function (k, ev) {
      var rc = canvas.getBoundingClientRect(), e = EQ[k].e;
      ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, cam); plane.constant = -(e.y0 + e.H / 2);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      var best = null;
      W.forEach(function (wl, i) {
        if (wl.L < e.W + 0.2) return;
        var s = (hit.x - wl.a[0]) * wl.dx + (hit.z - wl.a[1]) * wl.dz, sc2 = Math.max(e.W / 2 + 0.1, Math.min(wl.L - e.W / 2 - 0.1, s));
        var px = wl.a[0] + wl.dx * sc2, pz = wl.a[1] + wl.dz * sc2, d = Math.hypot(hit.x - px, hit.z - pz);
        if (!best || d < best.d) best = { w: i, s: sc2, d: d };
      });
      if (best) slide(k, best.w, best.s);
    };
    var slide = function (k, w, s) {
      var e = EQ[k].e, wl = W[w];
      if (wl.L < e.W + 0.2) return;
      EQ[k].a = { w: w, s: Math.round(Math.max(e.W / 2 + 0.1, Math.min(wl.L - e.W / 2 - 0.1, s)) * 20) / 20 };
      placeEq(k); refresh();
    };

    // controls and the reading under the stage; a fresh panel per site, so its listeners go with it
    var rk = { bat: 'rbat', edge: 'redge', aper: 'raper' }[D.rule];
    var panel = doc.createElement('div');
    panel.innerHTML = '<div class="bk-td-bar" role="group" aria-label="' + t.site + '"><span style="align-self:center;font-size:13px;color:var(--muted)">' + t.site + '</span>' +
      ['house', 'ci', 'park'].map(function (k) { return '<button type="button" data-a="site" data-v="' + k + '">' + t[k] + '</button>'; }).join('') + '</div>' +
      '<div class="bk-td-bar" role="group">' +
      '<button type="button" data-a="view" data-v="plan">' + t.plan + '</button><button type="button" data-a="view" data-v="iso">' + t.iso + '</button>' +
      '<button type="button" data-a="turn">↻ ' + t.turn + '</button></div>' +
      '<div class="bk-td-bar" role="group" aria-label="' + t.layers + '"><span style="align-self:center;font-size:13px;color:var(--muted)">' + t.layers + '</span>' +
      '<button type="button" data-a="mods">' + t.mods + '</button><button type="button" data-a="dims">' + t.dims + '</button>' +
      '<button type="button" data-a="fid">' + t.fid + '</button><button type="button" data-a="rules">' + t[rk] + '</button>' +
      (D.tog ? '<button type="button" data-a="tog">' + t[D.tog] + '</button>' : '') + '</div>' +
      '<div class="bk-td-bar" role="group" aria-label="' + t.bg + '"><span style="align-self:center;font-size:13px;color:var(--muted)">' + t.bg + '</span>' +
      ['plain', 'dots', 'lines'].map(function (g) { return '<button type="button" data-a="bg" data-v="' + g + '">' + t[g] + '</button>'; }).join('') + '</div>' +
      '<div class="bk-td-bar" role="group" aria-label="' + t.flow + '"><span style="align-self:center;font-size:13px;color:var(--muted)">' + t.flow + '</span>' +
      ['off', 'noon', 'eve'].map(function (f) { return '<button type="button" data-a="flow" data-v="' + f + '">' + t[f] + '</button>'; }).join('') + '</div>' +
      '<div class="sm-legend" style="display:grid;gap:4px;margin:12px 0;font-size:13px"></div><div class="sm-read" style="font-size:13px"></div>' +
      '<div class="sm-cats" style="font-size:13px;margin-top:14px"></div>' +
      '<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">' + t.hint + '</p>';
    out.innerHTML = ''; out.appendChild(panel);
    var legend = panel.querySelector('.sm-legend'), read = panel.querySelector('.sm-read'), cats = panel.querySelector('.sm-cats');
    legend.innerHTML = ['measured', 'declared', 'schematic'].map(function (k, i) {
      return '<span><span style="display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:6px;background:' + SMF[k] + '"></span><b style="font-weight:600">' + t[k] + '</b> · ' + t.leg[kind][i] + '</span>';
    }).join('');
    var io2 = null, ro = null;
    panel.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
      if (a === 'site') {
        if (v === kind) return;
        // another site: the stage is torn down and built again from that site's data
        dead = true; if (io2) io2.disconnect(); if (ro) ro.disconnect();
        r.dispose(); r.forceContextLoss(); wrap.remove();
        smMount(fig, svg, out, v);
        var nb = out.querySelector('button[data-a="site"][data-v="' + v + '"]'); if (nb) nb.focus();
        return;
      }
      if (a === 'view') st.view = v;
      if (a === 'turn') { st.view = 'iso'; st.az += Math.PI / 2; }
      if (a === 'fid') st.fid = !st.fid;
      if (a === 'rules') st.rules = !st.rules;
      if (a === 'tog') st.tog = !st.tog;
      if (a === 'mods') st.mods = !st.mods;
      if (a === 'dims') st.dims = !st.dims;
      if (a === 'bg') st.bg = v;
      if (a === 'flow') st.flow = v;
      frame(); refresh();
    });
    var reading = function () {
      var rows = D.circuits.map(function (c) {
        var cb = CB[c.id];
        return '<tr><td style="padding:3px 8px 3px 0"><span style="display:inline-block;width:14px;height:4px;border-radius:2px;vertical-align:3px;margin-right:6px;background:' + SMC[c.c] + '"></span>' + t[c.t] + '</td><td style="padding:3px 8px">' + t[c.a] + ' → ' + t[c.b] + '</td><td style="padding:3px 8px;text-align:right">' + fmt(cb.len) + ' m</td><td style="padding:3px 0 3px 8px;text-align:right">' + fmt(cb.vert) + ' m</td></tr>';
      }).join('');
      var total = D.circuits.reduce(function (s, c) { return s + CB[c.id].len; }, 0);
      var p = function (txt, bad) { return '<p style="margin:4px 0 0;color:' + (bad ? SMC.zone : 'var(--muted)') + '">' + txt + '</p>'; };
      var checks = '';
      if (D.rule === 'bat') checks += st.batIn ? p(t.batBad.replace('{o}', st.batIn.k === 'door' ? t.door : t.win), true) : p(t.batOk);
      if (D.rule === 'edge') checks += p(t.edge);
      // the capacity, summed over every zone that is on
      var on = zones.filter(function (z) { return !z.tog || st.tog; }), n = on.reduce(function (s, z) { return s + z.n; }, 0), kWc = n * SMKWC;
      var cover = 0, parkArea = 0;
      if (D.surface) {
        parkArea = (D.surface[2] - D.surface[0]) * (D.surface[3] - D.surface[1]);
        cover = on.filter(function (z) { return z.area; }).reduce(function (s, z) { return s + z.area; }, 0) / parkArea * 100;
        checks += p(t.aper.replace('{a}', Math.round(parkArea).toLocaleString(fr ? 'fr-FR' : 'en-GB')).replace('{p}', Math.round(cover)), cover < 50);
      }
      checks += p((st.reach > D.equip.evc.cable ? t.reachBad : t.reach).replace('{d}', fmt(st.reach)).replace('{m}', D.equip.evc.cable), st.reach > D.equip.evc.cable);
      if (st.hp) checks += p(t.hpDist.replace('{d}', fmt(st.hp.d)));
      var groups = {}; on.forEach(function (z) { groups[z.name] = (groups[z.name] || 0) + z.n; });
      var gk = Object.keys(groups), list = gk.length > 1 ? gk.map(function (k) { return t[k] + ' ' + groups[k]; }).join(' · ') : t[gk[0]];
      checks += p(t.mods.replace('{list}', list.charAt(0).toUpperCase() + list.slice(1)).replace('{n}', n).replace('{k}', fmt(kWc)));
      read.innerHTML = '<table style="border-collapse:collapse;width:100%;max-width:620px"><thead><tr style="color:var(--muted);text-align:left">' + t.th.map(function (h, i) { return '<th style="font-weight:500;padding:3px ' + (i ? 8 : 0) + 'px;' + (i > 1 ? 'text-align:right' : '') + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows +
        '<tr style="border-top:1px solid var(--line)"><td style="padding:3px 0" colspan="2"><b style="font-weight:600">' + t.total + '</b> · ' + t.est + '</td><td style="padding:3px 8px;text-align:right"><b style="font-weight:600">' + fmt(total) + ' m</b></td><td></td></tr></tbody></table>' + checks;
      // the official categories: an inverter declared at about 1.3 kWc per kVA
      var kVA = Math.max(3, Math.round(kWc / 1.3 * 2) / 2), cr = smCats(kind, { kWc: kWc, kVA: kVA, ph: D.ph, carport: kind === 'house' && st.tog, cover: cover }, fr, fmt);
      cats.innerHTML = '<p style="margin:0 0 6px"><b style="font-weight:600">' + t.cats + '</b> · ' + fmt(kWc) + ' kWc · ' + fmt(kVA) + ' kVA · ' + (D.ph === 1 ? (fr ? 'monophasé' : 'single-phase') : (fr ? 'triphasé' : 'three-phase')) + '</p>' +
        '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:560px"><thead><tr style="color:var(--muted);text-align:left">' + t.catTh.map(function (h) { return '<th style="font-weight:500;padding:3px 8px 3px 0">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        cr.map(function (row) { return '<tr style="border-top:1px solid var(--line);vertical-align:top">' + row.map(function (c, i) { return '<td style="padding:4px 8px 4px 0">' + (i ? c : '<b style="font-weight:600">' + c + '</b>') + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div><p style="margin:6px 0 0;color:var(--muted);font-size:12.5px">' + t.catNote + '</p>';
      all('button[data-a]', panel).forEach(function (b) {
        var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
        var on2 = (a === 'site' && kind === v) || (a === 'view' && st.view === v) || (a === 'fid' && st.fid) || (a === 'rules' && st.rules) || (a === 'tog' && st.tog) || (a === 'flow' && st.flow === v) || (a === 'mods' && st.mods) || (a === 'dims' && st.dims) || (a === 'bg' && st.bg === v);
        if (a !== 'turn') b.setAttribute('aria-pressed', on2 ? 'true' : 'false');
        b.style.background = on2 ? 'var(--fg)' : ''; b.style.color = on2 ? 'var(--paper)' : ''; b.style.borderColor = on2 ? 'var(--fg)' : '';
      });
    };

    // drawing on demand; a loop only while the energy flows and the stage is on screen
    var queued = false, visible = true, last = 0;
    var draw = function (now) {
      queued = false; if (dead) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (st.flow !== 'off') D.circuits.forEach(function (c) { var dir = D.flow[st.flow][c.id]; if (dir) CB[c.id].tex.offset.x -= dir * dt * 1.4; });
      r.render(sc, cam); placeLabels();
      if (st.flow !== 'off' && visible) ask(); else last = 0;
    };
    var ask = function () { if (!queued && !dead) { queued = true; requestAnimationFrame(draw); } };
    var refresh = function () {
      buildCables(); light(); paint(); reading();
      D.circuits.forEach(function (c) { var cb = CB[c.id]; cb.mesh.material = st.flow !== 'off' && D.flow[st.flow][c.id] ? cb.flow : cb.plain; });
      ask();
    };
    if ('IntersectionObserver' in window) { io2 = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) ask(); }); io2.observe(wrap); }
    if ('ResizeObserver' in window) { ro = new ResizeObserver(function () { var hh = wrap.clientWidth < 520 ? '360px' : '460px'; if (wrap.style.height !== hh) wrap.style.height = hh; frame(); ask(); }); ro.observe(wrap); }
    Object.keys(EQ).forEach(placeEq);
    frame(); refresh();
  }
  /* ---------- widgets: the concept chapters' "Your turn" figures ---------- */
  // map-distortion (0), sun-path (1), pitch-azimuth (2), roof-edges (3), setbacks (4),
  // flat-racks (6), orientation (7), ransac (8). Each ```widget block gives a figure with the
  // engine's drawing (src="…", only its <style> for most), its data (data="…json") and an empty
  // output; this file adds the controls and draws in a <g> of the drawing, so its <style> stays.
  // A page carries the English and the French article: everything is looked up inside the
  // figure, and the figure's language is its article's.
  var CW_N = 0;
  function cwWidget(name, build) {
    all('figure.bk-widget[data-widget="' + name + '"]').forEach(function (fig) {
      var out = fig.querySelector('.bk-widget-out');
      if (!out || out.childNodes.length) return;
      var fr = (fig.closest('[lang]') || root).getAttribute('lang') === 'fr';
      var data = null, dataEl = fig.querySelector('script.bk-widget-data');
      if (dataEl) try { data = JSON.parse(dataEl.textContent); } catch (e) {}
      var live = fig.querySelector('.bk-widget-live');
      if (live) live.parentNode.removeChild(live);
      var svg = null;
      Array.prototype.forEach.call(fig.children, function (c) { if (!svg && c.tagName.toLowerCase() === 'svg') svg = c; });
      var uid = 'cw' + (++CW_N) + (fr ? '-fr' : '');
      var w = {
        fig: fig, out: out, fr: fr, data: data, svg: svg, uid: uid,
        t: function (en, f) { return fr ? f : en; },
        F: function (x, n) { var s = x.toFixed(n); return fr ? s.replace('.', ',') : s; },
        $: function (k) { return out.querySelector('[data-k="' + k + '"]'); },
        val: function (k) { return +out.querySelector('[data-k="' + k + '"]').value; },
        set: function (k, s) { out.querySelector('[data-k="' + k + '"]').textContent = s; },
        slider: function (k, en, f, min, max, step, v) {
          var id = uid + '-' + k;
          return '<div><label for="' + id + '"><span>' + w.t(en, f) + '</span><output data-k="' + k + 'v"></output></label>' +
            '<input id="' + id + '" data-k="' + k + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"></div>';
        },
        controls: function (list) { return '<div class="bk-cw-controls">' + list.join('') + '</div>'; },
        readout: function (rows) {
          return '<div class="bk-cw-readout">' + rows.map(function (r) {
            return '<span>' + w.t(r[1], r[2]) + '</span><span data-k="' + r[0] + '"></span>';
          }).join('') + '</div>';
        },
        // the engine's drawing goes where the markup says <i data-slot></i>; a <g> takes the live part
        mount: function (html) {
          out.innerHTML = html;
          var slot = out.querySelector('[data-slot]');
          if (slot && svg) { slot.parentNode.replaceChild(svg, slot); svg.removeAttribute('style'); }
          else if (slot) slot.parentNode.removeChild(slot);
        },
        layer: function (s) {
          s = s || svg;
          var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          s.appendChild(g);
          return g;
        },
        on: function (keys, fn) { keys.forEach(function (k) { w.$(k).addEventListener('input', fn); }); }
      };
      fig.classList.add('bk-cw');
      build(w);
    });
  }
  function cwSvg(viewBox, label, inner, cls) {
    return '<svg class="bk-cw-svg' + (cls ? ' ' + cls : '') + '" viewBox="' + viewBox + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + (inner || '') + '</svg>';
  }

  /* 0.10 the map distortion: Web Mercator's scale factor, float32, grid convergence */
  cwWidget('map-distortion', function (w) {
    if (!w.svg) return;
    w.mount(w.controls([
      w.slider('lat', 'Latitude', 'Latitude', -70, 70, 0.1, -34.9),
      w.slider('dl', 'Distance from the zone’s central meridian', 'Écart au méridien central de la zone', -3, 3, 0.1, -2.4)
    ]) + '<div class="bk-cw-wgrid"><i data-slot></i>' + w.readout([
      ['k', 'Web Mercator factor k', 'Facteur Web Mercator k'],
      ['l', '12.6 m eave measured in 3857', 'Égout de 12,6 m mesuré en 3857'],
      ['a', '105.8 m² area measured in 3857', 'Surface de 105,8 m² mesurée en 3857'],
      ['f', 'float32 step on the 3857 y coordinate', 'Pas float32 sur la coordonnée y 3857'],
      ['c', 'Grid convergence (TM)', 'Convergence du quadrillage (MT)']
    ]) + '</div>');
    var g = w.layer(), F = w.F;
    var f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    function step(v) { f32[0] = Math.abs(v); var a = f32[0]; u32[0] += 1; return f32[0] - a; }
    function draw() {
      var lat = w.val('lat'), dl = w.val('dl');
      var k = 1 / Math.cos(lat * Math.PI / 180);
      var y = 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
      var conv = dl * Math.sin(lat * Math.PI / 180);
      var s = 5, base = 185, x0 = 20;
      g.innerHTML = '<rect class="mercft" x="' + x0 + '" y="' + (base - 8.4 * k * s) + '" width="' + (12.6 * k * s) + '" height="' + (8.4 * k * s) + '"/>' +
        '<rect class="trueft" x="' + x0 + '" y="' + (base - 8.4 * s) + '" width="' + (12.6 * s) + '" height="' + (8.4 * s) + '"/>';
      w.set('latv', F(lat, 1) + '°');
      w.set('dlv', F(dl, 1) + '°');
      w.set('k', F(k, 3));
      w.set('l', F(12.6 * k, 2) + ' m');
      w.set('a', F(105.84 * k * k, 1) + ' m²');
      var st = step(y);
      w.set('f', st >= 0.01 ? F(st, 2) + ' m' : F(st * 1000, 2) + ' mm');
      w.set('c', F(conv, 2) + '°');
    }
    w.on(['lat', 'dl'], draw);
    draw();
  });

  /* 1.x the sun path: date and solar time, the sun on its day's path, a pole's shadow */
  cwWidget('sun-path', function (w) {
    var site = w.data || { lat: -34.93, lon: 138.6, tz: 9.5 }, fr = w.fr, F = w.F;
    var R = Math.PI / 180, MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var MON = fr ? ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    w.mount(w.controls([
      w.slider('d', 'Date', 'Date', 1, 365, 1, 172),
      w.slider('h', 'Solar time', 'Heure solaire', 5, 19.5, 0.25, 9)
    ]) + cwSvg('0 0 640 260', w.t('Sun-path diagram with the current sun position', 'Diagramme de course solaire avec la position actuelle du soleil'), '<g data-k="path"></g>') +
      '<div class="bk-cw-wgrid">' + cwSvg('0 0 300 200', w.t('Shadow of a 1 metre pole, north up', 'Ombre d’un poteau de 1 m, nord en haut'), '<g data-k="shadow"></g>') + w.readout([
      ['el', 'Elevation', 'Hauteur'], ['az', 'Azimuth', 'Azimut'], ['sh', 'Shadow of a 1 m pole', 'Ombre d’un poteau de 1 m'],
      ['clock', 'Clock time', 'Heure à la montre'], ['len', 'Day length', 'Durée du jour']
    ]) + '</div>');
    function g(n) { return 2 * Math.PI / 365 * (n - 1); }
    function decl(n) { var x = g(n); return (0.006918 - 0.399912 * Math.cos(x) + 0.070257 * Math.sin(x) - 0.006758 * Math.cos(2 * x) + 0.000907 * Math.sin(2 * x) - 0.002697 * Math.cos(3 * x) + 0.00148 * Math.sin(3 * x)) / R; }
    function eot(n) { var x = g(n); return 229.18 * (0.000075 + 0.001868 * Math.cos(x) - 0.032077 * Math.sin(x) - 0.014615 * Math.cos(2 * x) - 0.040849 * Math.sin(2 * x)); }
    function pos(n, t) {
      var p = site.lat * R, d = decl(n) * R, h = 15 * (t - 12) * R;
      var el = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h));
      var az = Math.atan2(-Math.sin(h) * Math.cos(d), Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(h));
      return [el / R, ((az / R) + 360) % 360];
    }
    function dst(n) { return n >= 277 || n < 95; }
    function dayLen(n) { var x = -Math.tan(site.lat * R) * Math.tan(decl(n) * R); return x <= -1 ? 24 : x >= 1 ? 0 : 2 * Math.acos(x) / R / 15; }
    function hm(h, m) { return fr ? h + ' h ' + (m < 10 ? '0' : '') + m : h + ':' + (m < 10 ? '0' : '') + m; }
    var X0 = 50, X1 = 610, Y0 = 230, Y1 = 20;
    function xy(el, az) { var a = ((az + 180) % 360) - 180; return [X0 + (a + 135) / 270 * (X1 - X0), Y0 - el / 90 * (Y0 - Y1)]; }
    function path(n) {
      var pts = [];
      for (var k = 0; k <= 288; k++) { var p = pos(n, k / 12); if (p[0] >= 0) { var q = xy(p[0], p[1]); if (q[0] >= X0 && q[0] <= X1) pts.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); } }
      return pts.join(' ');
    }
    var base = '';
    [0, 30, 60, 90].forEach(function (e) { var y = xy(e, 0)[1]; base += '<line class="grid" x1="' + X0 + '" y1="' + y + '" x2="' + X1 + '" y2="' + y + '"/><text class="s" x="' + (X0 - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + e + '°</text>'; });
    [[270, fr ? 'O' : 'W'], [0, 'N'], [90, 'E']].forEach(function (a) { base += '<text class="t" x="' + xy(0, a[0])[0] + '" y="' + (Y0 + 18) + '" text-anchor="middle">' + a[1] + '</text>'; });
    [[172, 'curve main'], [79, 'curve ew'], [355, 'curve cell']].forEach(function (c) { base += '<polyline class="' + c[1] + '" points="' + path(c[0]) + '" style="opacity:.55"/>'; });
    var gPath = w.$('path'), gShadow = w.$('shadow');
    function draw() {
      var n = w.val('d'), t = w.val('h');
      var m = 0, d = n; while (d > MD[m]) { d -= MD[m]; m++; }
      w.set('dv', d + ' ' + MON[m]);
      var hh = Math.floor(t);
      w.set('hv', hm(hh, Math.round((t - hh) * 60)));
      var s = pos(n, t), out = base + '<polyline class="curve now" points="' + path(n) + '"/>';
      if (s[0] > 0) { var q = xy(s[0], s[1]); out += '<circle class="sun" cx="' + q[0] + '" cy="' + q[1] + '" r="9"/>'; }
      gPath.innerHTML = out;
      var sh = '<circle class="pole" cx="150" cy="100" r="4"/><text class="t" x="285" y="20" text-anchor="end">N ↑</text>';
      if (s[0] > 0.5) {
        var L = 1 / Math.tan(s[0] * R), a = (s[1] + 180) * R, sc = 28, Lc = Math.min(L, 3.4);
        sh += '<line class="shadowl" x1="150" y1="100" x2="' + (150 + Lc * sc * Math.sin(a)) + '" y2="' + (100 - Lc * sc * Math.cos(a)) + '"/>';
        w.set('sh', F(L, 2) + ' m');
      } else w.set('sh', w.t('night', 'nuit'));
      gShadow.innerHTML = sh;
      w.set('el', F(s[0], 1) + '°');
      w.set('az', F(s[1], 1) + '°');
      var clock = t + (site.tz * 15 - site.lon) / 15 - eot(n) / 60 + (dst(n) ? 1 : 0);
      var ch = Math.floor(clock), cm = Math.round((clock - ch) * 60); if (cm === 60) { ch++; cm = 0; }
      w.set('clock', hm(ch, cm) + (dst(n) ? ' ACDT' : ' ACST'));
      w.set('len', F(dayLen(n), 1) + ' h');
    }
    w.on(['d', 'h'], draw);
    draw();
  });

  /* 2.x pitch and azimuth: the face's section and its compass, the pitch in every notation */
  cwWidget('pitch-azimuth', function (w) {
    var F = w.F, mk = w.uid + '-arrow';
    w.mount(w.controls([
      w.slider('p', 'Pitch', 'Pente', 0, 60, 1, 22),
      w.slider('a', 'Azimuth', 'Azimut', 0, 359, 1, 4)
    ]) + '<div class="bk-cw-wgrid bk-cw-even">' +
      cwSvg('0 0 380 230', w.t('Live cross-section of the face', 'Coupe du pan en direct'),
        '<line class="ground" x1="20" y1="200" x2="360" y2="200"/>' +
        '<polygon class="tri" points="40,200 320,200 320,87"/>' +
        '<text class="sf" x="180" y="220" text-anchor="middle">' + w.t('run 4.20 m', 'course 4,20 m') + '</text>' +
        '<text class="sf rise" x="328" y="150"></text><text class="la slope" x="60" y="60"></text>') +
      cwSvg('0 0 220 230', w.t('Live compass', 'Boussole en direct'),
        '<defs><marker id="' + mk + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="ahb"/></marker></defs>' +
        '<g transform="translate(110 115)"><circle class="dial" r="80"/>' +
        '<text class="t" x="0" y="-88" text-anchor="middle">N</text><text class="t" x="88" y="5">E</text><text class="t" x="0" y="100" text-anchor="middle">S</text><text class="t" x="-88" y="5" text-anchor="end">' + w.t('W', 'O') + '</text>' +
        '<line class="vec arrow" x1="0" y1="0" x2="0" y2="-70" marker-end="url(#' + mk + ')"/></g>') +
      '</div>' + w.readout([
      ['r1', 'Pitch in %', 'Pente en %'], ['r2', 'Pitch as x/12', 'Pente en x/12'], ['r3', 'Pitch “1 in k”', 'Pente « 1 pour k »'],
      ['r4', 'Plan → true factor', 'Facteur plan → vrai'], ['r5', 'PVGIS aspect', 'Aspect PVGIS']
    ]) + '<span class="bk-cw-flag" data-k="flag" aria-live="polite"></span>');
    var tri = w.out.querySelector('.tri'), riseT = w.out.querySelector('.rise'), slopeT = w.out.querySelector('.slope'), arrow = w.out.querySelector('.arrow');
    function draw() {
      // same formulas as engines/roof_plane.py
      var p = w.val('p'), a = w.val('a'), r = p * Math.PI / 180, t = Math.tan(r);
      w.set('pv', p + '°');
      w.set('av', a + '°');
      var run = 4.2, rise = run * t, px = 280 / run, top = Math.max(200 - rise * px, 12);
      tri.setAttribute('points', '40,200 320,200 320,' + top.toFixed(1));
      riseT.textContent = F(rise, 2) + ' m';
      riseT.setAttribute('y', ((200 + top) / 2).toFixed(0));
      slopeT.textContent = w.t('true length ', 'vraie longueur ') + F(run / Math.cos(r), 2) + ' m';
      var ar = a * Math.PI / 180;
      arrow.setAttribute('x2', (70 * Math.sin(ar)).toFixed(1));
      arrow.setAttribute('y2', (-70 * Math.cos(ar)).toFixed(1));
      arrow.style.opacity = p < 2 ? 0.25 : 1;
      w.set('r1', F(100 * t, 1) + ' %');
      w.set('r2', F(12 * t, 2) + ' / 12');
      w.set('r3', p === 0 ? '—' : w.t('1 in ', '1 pour ') + F(1 / t, 2));
      w.set('r4', '× ' + F(1 / Math.cos(r), 3));
      var asp = ((a - 180) % 360 + 360) % 360; if (asp > 180) asp -= 360;
      w.set('r5', p < 2 ? '—' : F(asp, 0) + '°');
      w.set('flag', p < 2 ? w.t('Flat roof: azimuth undefined', 'Toit plat : azimut non défini')
        : a <= 45 || a >= 315 ? w.t('Faces north: ideal in Australia', 'Regarde le nord : idéal en Australie')
          : a >= 135 && a <= 225 ? w.t('Faces south: ideal in the UK and France', 'Regarde le sud : idéal au Royaume-Uni et en France')
            : w.t('Faces east or west: flatter daily output', 'Regarde l’est ou l’ouest : production plus étalée'));
    }
    w.on(['p', 'a'], draw);
    draw();
  });

  /* 3.x the roof's edges: pick one, the three questions name it */
  cwWidget('roof-edges', function (w) {
    if (!w.svg) return;
    var NAMES = w.fr ? { eave: 'égout', ridge: 'faîtage', hip: 'arêtier', valley: 'noue', rake: 'rive' }
      : { eave: 'eave', ridge: 'ridge', hip: 'hip', valley: 'valley', rake: 'rake' };
    w.mount('<div class="bk-cw-wgrid"><i data-slot></i><div class="bk-cw-answer" data-k="ans" aria-live="polite">' + w.t('Pick an edge.', 'Choisissez une arête.') + '</div></div>');
    var ans = w.$('ans'), F = w.F, hits = Array.prototype.slice.call(w.svg.querySelectorAll('.hit'));
    function show(d) {
      var q1 = d.faces === 1 ? w.t('1 face → boundary edge', '1 pan → arête de bordure') : w.t('2 faces → internal edge', '2 pans → arête intérieure');
      var q2 = 'Δz = ' + F(d.dz, 2) + ' m → ' + (d.dz < 0.02 ? w.t('horizontal', 'horizontale') : w.t('sloped', 'en pente'));
      var q3 = d.convex === null ? w.t('not applicable (boundary)', 'sans objet (bordure)') : d.convex ? w.t('convex', 'saillante') : w.t('concave', 'rentrante');
      ans.innerHTML = '<ol class="bk-cw-steps"><li>' + q1 + '</li><li>' + q2 + '</li><li>' + q3 + '</li></ol><b>' + w.t('Type: ', 'Type : ') +
        (NAMES[d.kind] || d.kind) + '</b> · ' + w.t('true length ', 'longueur vraie ') + F(d.len, 2) + ' m';
    }
    hits.forEach(function (h) {
      function pick() {
        hits.forEach(function (o) { o.classList.remove('on'); });
        h.classList.add('on');
        try { show(JSON.parse(h.getAttribute('data-edge'))); } catch (e) {}
      }
      h.addEventListener('click', pick);
      h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  });

  /* 4.x setbacks: the usable area left by the eave, hip, ridge and vent margins */
  cwWidget('setbacks', function (w) {
    if (!w.svg) return;
    var F = w.F;
    w.mount(w.controls([
      w.slider('e', 'Eave', 'Égout', 0, 100, 1, 20), w.slider('h', 'Hips', 'Arêtiers', 0, 100, 1, 50),
      w.slider('r', 'Ridge', 'Faîtage', 0, 100, 1, 30), w.slider('o', 'Vent margin', 'Marge ventilation', 0, 100, 1, 30)
    ]) + '<div class="bk-cw-btns">' +
      '<button type="button" data-preset="20,50,30,30">' + w.t('Example AU', 'AU d’exemple') + '</button>' +
      '<button type="button" data-preset="40,40,40,30">' + w.t('UK 400 mm', 'Royaume-Uni 400 mm') + '</button>' +
      '<button type="button" data-preset="90,90,90,30">' + w.t('France, 0.9 m pathway', 'France, cheminement 0,9 m') + '</button></div>' +
      '<i data-slot></i>' + w.readout([['ua', 'Usable area', 'Zone posable'], ['up', 'Share of the face', 'Part du pan']]));
    // same geometry as engines/limits_layout.py: north face unfolded, true size (metres)
    var SLOPE = 4.2 / Math.cos(22 * Math.PI / 180);
    var FACE = [[0, 0], [12.6, 0], [8.4, SLOPE], [4.2, SLOPE]], EDGE_OF = ['e', 'h', 'r', 'h'], VENT = [8.0, 1.6, 0.175];
    var S = 40, OX = 60, OY = 236, g = w.layer();
    function P(p) { return (OX + p[0] * S).toFixed(1) + ',' + (OY - p[1] * S).toFixed(1); }
    function clip(poly, a, b, d) { // keep the part at distance >= d to the left of a->b (interior side)
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      function s(p) { return (p[0] - a[0]) * nx + (p[1] - a[1]) * ny - d; }
      var out = [];
      for (var i = 0; i < poly.length; i++) {
        var p = poly[i], q = poly[(i + 1) % poly.length], sp = s(p), sq = s(q);
        if (sp >= 0) out.push(p);
        if ((sp >= 0) !== (sq >= 0)) { var t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      }
      return out;
    }
    function inside(poly, x, y) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var a = poly[i], b = poly[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
      }
      return c;
    }
    function val(k) { return w.val(k) / 100; }
    function draw() {
      var poly = FACE.slice();
      for (var i = 0; i < 4; i++) poly = clip(poly, FACE[i], FACE[(i + 1) % 4], val(EDGE_OF[i]));
      var r = VENT[2] + val('o'), area = 0, step = 0.02;
      if (poly.length > 2) {
        for (var x = 0; x < 12.6; x += step) for (var y = 0; y < SLOPE; y += step) {
          var cx = x + step / 2, cy = y + step / 2;
          if (inside(poly, cx, cy) && Math.hypot(cx - VENT[0], cy - VENT[1]) > r) area += step * step;
        }
      }
      g.innerHTML = '<polygon class="face" points="' + FACE.map(P).join(' ') + '"/>' +
        (poly.length > 2 ? '<polygon class="usable" points="' + poly.map(P).join(' ') + '"/>' : '') +
        '<circle class="cutzone" cx="' + (OX + VENT[0] * S) + '" cy="' + (OY - VENT[1] * S) + '" r="' + (r * S) + '"/>' +
        '<circle class="chim" cx="' + (OX + VENT[0] * S) + '" cy="' + (OY - VENT[1] * S) + '" r="' + (VENT[2] * S) + '"/>';
      ['e', 'h', 'r', 'o'].forEach(function (k) { w.set(k + 'v', F(val(k), 2) + ' m'); });
      w.set('ua', F(area, 1) + ' m²');
      w.set('up', F(area / 38.05 * 100, 0) + ' %');
    }
    w.on(['e', 'h', 'r', 'o'], draw);
    all('[data-preset]', w.out).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-preset').split(',');
        ['e', 'h', 'r', 'o'].forEach(function (k, i) { w.$(k).value = v[i]; });
        draw();
      });
    });
    draw();
  });

  /* 6.x flat racks: city, design window, orientation and tilt give the row gap and the energy */
  cwWidget('flat-racks', function (w) {
    var D = w.data; if (!D || !w.svg) return;
    var F = w.F, rad = Math.PI / 180, st = { city: 'adelaide', rule: '9-15', orient: 'P' };
    function seg(key, opts) {
      return '<div class="bk-cw-btns" role="group" data-group="' + key + '">' + opts.map(function (o) {
        return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (st[key] === o[0]) + '">' + w.t(o[1], o[2]) + '</button>';
      }).join('') + '</div>';
    }
    w.mount(seg('city', [['adelaide', 'Adelaide', 'Adélaïde'], ['lyon', 'Lyon', 'Lyon'], ['london', 'London', 'Londres']]) +
      '<div class="bk-cw-btnline">' + seg('rule', [['9-15', '9:00–15:00', '9 h–15 h'], ['10-14', '10:00–14:00', '10 h–14 h'], ['12-12', 'noon', 'midi']]) +
      seg('orient', [['P', 'Portrait', 'Portrait'], ['L', 'Landscape', 'Paysage']]) + '</div>' +
      w.controls([w.slider('tilt', 'Tilt β', 'Inclinaison β', 0, 40, 1, 20)]) +
      '<div class="bk-cw-wgrid"><i data-slot></i>' + w.readout([
      ['pa', 'Critical profile angle', 'Angle de profil critique'], ['d', 'Gap D', 'Écart D'], ['p', 'Pitch P', 'Pas P'], ['g', 'GCR', 'GCR'],
      ['n', 'Rows × modules (11 × 7 m)', 'Rangées × modules (11 × 7 m)'], ['y', 'kWh/kWp (PVGIS)', 'kWh/kWc (PVGIS)'], ['e', 'Annual roof energy', 'Énergie annuelle du toit']
    ]) + '</div>');
    var g = w.layer();
    function sun(lat, dec, t) {
      var p = lat * rad, d = dec * rad, h = 15 * (t - 12) * rad;
      var el = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h));
      var az = Math.atan2(-Math.sin(h) * Math.cos(d), Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(h));
      return [el / rad, ((az / rad) + 360) % 360];
    }
    function designProfile(lat, a, b) {
      var dec = lat >= 0 ? -23.44 : 23.44, n = lat < 0 ? 0 : 180, worst = 90;
      for (var t = a; t <= b + 1e-9; t += 1 / 12) {
        var s = sun(lat, dec, t), gm = (s[1] - n) * rad;
        if (s[0] <= 0 || Math.cos(gm) <= 0) return null;
        worst = Math.min(worst, Math.atan(Math.tan(s[0] * rad) / Math.cos(gm)) / rad);
      }
      return worst;
    }
    function yieldAt(city, tilt) {
      var t = D.pvgis[city], lo = Math.floor(tilt / 5) * 5, hi = Math.min(40, lo + 5), f = (tilt - lo) / 5;
      var a = t['eq' + lo], b = t['eq' + hi];
      return hi === lo ? a : a + (b - a) * f;
    }
    function draw() {
      var tilt = w.val('tilt'), lat = D.cities[st.city];
      var win = st.rule.split('-').map(Number), pa = designProfile(lat, win[0], win[1]);
      var L = st.orient === 'P' ? D.mod[0] : D.mod[1], across = st.orient === 'P' ? D.mod[1] : D.mod[0];
      var H = L * Math.sin(tilt * rad), dep = L * Math.cos(tilt * rad);
      var gap = tilt > 0 ? H / Math.tan(pa * rad) : 0, P = dep + gap;
      var rows = dep > D.roof[1] ? 0 : 1 + Math.floor((D.roof[1] - dep + 1e-9) / P);
      var per = Math.floor((D.roof[0] + D.gap + 1e-9) / (across + D.gap)), mods = rows * per;
      var ey = yieldAt(st.city, tilt), mwh = mods * D.kwp * ey / 1000;
      w.set('tiltv', tilt + '°');
      w.set('pa', F(pa, 1) + '°');
      w.set('d', F(gap, 2) + ' m');
      w.set('p', F(P, 2) + ' m');
      w.set('g', F(L / P, 2));
      w.set('n', rows + ' × ' + per + ' = ' + mods);
      w.set('y', String(Math.round(ey)));
      w.set('e', F(mwh, 1) + ' MWh');
      var s = Math.min(150, 520 / (2 * P + dep + 0.2)), base = 190, x0 = 20, out = '<line class="ground" x1="10" y1="' + base + '" x2="550" y2="' + base + '"/>';
      for (var i = 0; i < 3; i++) {
        var a = x0 + i * P * s, x1 = a + dep * s, y1 = base - H * s;
        if (i < 2 && gap > 0) {
          out += '<polygon class="shade" points="' + x1 + ',' + y1 + ' ' + x1 + ',' + base + ' ' + (x1 + gap * s) + ',' + base + '"/>';
          out += '<line class="ray" x1="' + (x1 - 30) + '" y1="' + (y1 - 30 * H / gap) + '" x2="' + (x1 + gap * s) + '" y2="' + base + '"/>';
        }
        out += '<line class="leg" x1="' + x1 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + base + '"/>';
        out += '<line class="mod" x1="' + a + '" y1="' + base + '" x2="' + x1 + '" y2="' + y1 + '"/>';
      }
      out += '<text class="la" x="' + (x0 + (dep + gap / 2) * s) + '" y="' + (base + 20) + '" text-anchor="middle">D = ' + F(gap, 2) + ' m</text>';
      g.innerHTML = out;
    }
    all('[data-group]', w.out).forEach(function (el) {
      var key = el.getAttribute('data-group');
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        st[key] = b.getAttribute('data-v');
        all('button', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw();
      });
    });
    w.on(['tilt'], draw);
    draw();
  });

  /* 7.14 orientation: tilt, azimuth and module count read off the PVGIS grid of Fig. 7.10 */
  cwWidget('orientation', function (w) {
    var D = w.data; if (!D || !w.svg) return;
    var F = w.F, kw = w.t('kWp', 'kWc');
    w.mount(w.controls([
      w.slider('t', 'Tilt β (= face pitch)', 'Inclinaison β (= pente du pan)', 0, 60, 1, 22),
      w.slider('a', 'Azimuth γ (0 = north)', 'Azimut γ (0 = nord)', 0, 359, 1, 0),
      w.slider('m', '440 W modules', 'Modules de 440 W', 1, 30, 1, 8)
    ]) + '<div class="bk-cw-wgrid"><i data-slot></i>' + w.readout([
      ['e', 'Annual production', 'Production annuelle'], ['y', 'Specific yield', 'Productible'],
      ['p', 'Compared with the optimum', 'Par rapport à l’optimum'], ['o', 'Orientation', 'Orientation']
    ]) + '</div>');
    var best = 0; D.y.forEach(function (r) { r.forEach(function (v) { best = Math.max(best, v); }); });
    function at(t, a) {
      var ti = Math.min(D.tilts.length - 2, Math.floor(t / 5)), ft = (t - ti * 5) / 5;
      var aa = ((a % 360) + 360) % 360, ai = Math.floor(aa / 15) % 24, fa = (aa - ai * 15) / 15, aj = (ai + 1) % 24;
      function row(i) { return D.y[i][ai] * (1 - fa) + D.y[i][aj] * fa; }
      return row(ti) * (1 - ft) + row(ti + 1) * ft;
    }
    // columns from south through north back to south
    var order = [], k; for (k = 12; k < 24; k++) order.push(k); for (k = 0; k <= 12; k++) order.push(k);
    var X0 = 50, Y0 = 10, cw = 21, ch = 14, base = '';
    D.tilts.forEach(function (t, i) {
      order.forEach(function (kk, j) {
        var v = D.y[i][kk % 24] / best;
        base += '<rect class="hm" x="' + (X0 + j * cw) + '" y="' + (Y0 + i * ch) + '" width="' + cw + '" height="' + ch + '" style="fill-opacity:' + Math.max(0.06, (v - 0.55) / 0.45).toFixed(2) + '"/>';
      });
      if (i % 2 === 0) base += '<text class="s" x="' + (X0 - 6) + '" y="' + (Y0 + i * ch + 11) + '" text-anchor="end">' + t + '°</text>';
    });
    var compass = { 0: 'N', 6: 'E', 12: 'S', 18: w.t('W', 'O') };
    order.forEach(function (kk, j) {
      var c = compass[kk % 24];
      if (c) base += '<text class="t" x="' + (X0 + j * cw + cw / 2) + '" y="' + (Y0 + D.tilts.length * ch + 16) + '" text-anchor="middle">' + c + '</text>';
    });
    var DIRS = w.fr ? ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest']
      : ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    var g = w.layer();
    function draw() {
      var t = w.val('t'), a = w.val('a'), m = w.val('m'), y = at(t, a), kwp = m * 0.44;
      w.set('tv', t + '°');
      w.set('av', a + '°');
      w.set('mv', m + ' (' + F(kwp, 2) + ' ' + kw + ')');
      w.set('e', Math.round(y * kwp).toLocaleString(w.fr ? 'fr-FR' : 'en-AU') + ' kWh');
      w.set('y', Math.round(y) + ' kWh/' + kw);
      w.set('p', Math.round(y / best * 100) + w.t('%', ' %'));
      w.set('o', DIRS[Math.round(a / 45) % 8] + ', ' + t + '°');
      var col = ((a - 180 + 360) % 360) / 15, mx = X0 + col * cw + cw / 2, my = Y0 + (t / 5) * ch + ch / 2;
      g.innerHTML = base + '<circle class="mark" cx="' + mx + '" cy="' + my + '" r="7" style="fill:none;stroke:var(--fg);stroke-width:2.5"/>';
    }
    w.on(['t', 'a', 'm'], draw);
    draw();
  });

  /* 8.12 RANSAC on a section: draw samples, count the votes, see the threshold give way */
  cwWidget('ransac', function (w) {
    if (!w.svg) return;
    var F = w.F, clipId = w.uid + '-clip';
    w.mount(w.controls([
      w.slider('noise', 'Noise (1 σ)', 'Bruit (1 σ)', 1, 25, 1, 3),
      w.slider('th', 'Inlier threshold', 'Seuil inlier', 2, 40, 1, 5)
    ]) + '<div class="bk-cw-btns">' +
      '<button type="button" class="primary" data-k="one">' + w.t('Draw one sample', 'Tirer un échantillon') + '</button>' +
      '<button type="button" data-k="hundred">' + w.t('Run 100 draws', 'Lancer 100 tirages') + '</button>' +
      '<button type="button" data-k="reset">' + w.t('Start over', 'Recommencer') + '</button></div>' +
      '<i data-slot></i>' + w.readout([
      ['n', 'Draws so far', 'Tirages effectués'], ['last', 'Inliers, last draw', 'Inliers du dernier tirage'], ['best', 'Best: inliers / slope', 'Meilleur plan : inliers / pente']
    ]));
    var g = w.layer();
    var T = Math.tan(22 * Math.PI / 180), X0 = 40, OY = 215, SX = 52, SZ = 40;
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var pts = [], best = null, last = null, n = 0, R = rng(11);
    function build() {
      var noise = w.val('noise') / 100, r = rng(5), i;
      pts = [];
      for (i = 0; i < 70; i++) { var x = 0.1 + 10.8 * r(); pts.push([x, 3 + T * Math.min(x, 11 - x) + noise * gauss(r)]); }
      for (i = 0; i < 14; i++) pts.push([8.6 + 2.2 * r(), 4.6 + 1.2 * r()]); // tree points
      best = null; last = null; n = 0; R = rng(11);
    }
    function inliers(a, b) {
      var th = w.val('th') / 100, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), out = [];
      if (L < 1e-6) return out;
      pts.forEach(function (p, i) { if (Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / L < th) out.push(i); });
      return out;
    }
    function sample() {
      var i = Math.floor(R() * pts.length), j = Math.floor(R() * pts.length);
      if (i === j) j = (j + 1) % pts.length;
      n++;
      last = { a: pts[i], b: pts[j], inl: inliers(pts[i], pts[j]) };
      if (!best || last.inl.length > best.inl.length) best = last;
    }
    function P(p) { return [X0 + p[0] * SX, OY - (p[1] - 1.6) * SZ]; }
    function line(a, b, cls) {
      var dx = b[0] - a[0]; if (Math.abs(dx) < 1e-6) dx = 1e-6;
      var m = (b[1] - a[1]) / dx, q0 = P([-0.3, a[1] + m * (-0.3 - a[0])]), q1 = P([11.3, a[1] + m * (11.3 - a[0])]);
      return '<line class="' + cls + '" x1="' + q0[0] + '" y1="' + q0[1] + '" x2="' + q1[0] + '" y2="' + q1[1] + '"/>';
    }
    function render() {
      var out = '<clipPath id="' + clipId + '"><rect x="20" y="0" width="610" height="215"/></clipPath><g clip-path="url(#' + clipId + ')">';
      var inb = {}; if (best) best.inl.forEach(function (k) { inb[k] = 1; });
      if (best) out += line(best.a, best.b, 'isect');
      if (last && last !== best) out += line(last.a, last.b, 'ray');
      pts.forEach(function (p, k) { var q = P(p); out += '<circle class="' + (inb[k] ? 'pt-in' : (k >= 70 ? 'pt-v' : 'pt-out')) + '" cx="' + q[0] + '" cy="' + q[1] + '" r="3.4"/>'; });
      if (last) [last.a, last.b].forEach(function (p) { var q = P(p); out += '<circle class="pick" cx="' + q[0] + '" cy="' + q[1] + '" r="6"/>'; });
      out += '</g><line class="ground" x1="20" y1="' + (OY + 4) + '" x2="630" y2="' + (OY + 4) + '"/>';
      g.innerHTML = out;
      w.set('n', String(n));
      w.set('last', last ? String(last.inl.length) : '–');
      if (best) {
        var s = Math.abs(Math.atan((best.b[1] - best.a[1]) / ((best.b[0] - best.a[0]) || 1e-6)) * 180 / Math.PI);
        w.set('best', best.inl.length + ' / ' + F(s, 1) + '°');
      } else w.set('best', '–');
      w.set('noisev', w.val('noise') + ' cm');
      w.set('thv', w.val('th') + ' cm');
    }
    w.$('one').addEventListener('click', function () { sample(); render(); });
    w.$('hundred').addEventListener('click', function () { for (var k = 0; k < 100; k++) sample(); render(); });
    w.$('reset').addEventListener('click', function () { build(); render(); });
    w.on(['noise'], function () { build(); render(); });
    w.on(['th'], function () {
      if (best) best.inl = inliers(best.a, best.b);
      if (last && last !== best) last.inl = inliers(last.a, last.b);
      render();
    });
    build(); render();
  });

  /* ---------- chapters 9 to 13: the engines' results, looked up (engines/widgets9_13.py) ---------- */
  function cwSeg(w, key, opts, on) {
    return '<div class="bk-cw-btns" role="group" data-group="' + key + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === on) + '">' + w.t(o[1], o[2]) + '</button>';
    }).join('') + '</div>';
  }
  function cwGroups(w, st, draw) {
    all('[data-group]', w.out).forEach(function (el) {
      var key = el.getAttribute('data-group');
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        st[key] = b.getAttribute('data-v');
        all('button', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw();
      });
    });
  }
  function cwPct(w, x, d) { return w.F(x * 100, d === undefined ? 0 : d) + w.t('%', ' %'); }
  function cwInt(w, x) { return Math.round(x).toLocaleString(w.fr ? 'fr-FR' : 'en-AU'); }
  // a day of half-hours on an axis: 0-24 h across, 0-ymax kW up
  function cwDayAxes(w, ymax, unit) {
    var ox = 50, oy = 250, cw = 600, ch = 220, s = '';
    for (var v = 0; v <= ymax; v += ymax > 8 ? 2 : 1) s += '<line class="grid" x1="' + ox + '" y1="' + (oy - v / ymax * ch) + '" x2="' + (ox + cw) + '" y2="' + (oy - v / ymax * ch) + '"/><text class="s" x="' + (ox - 6) + '" y="' + (oy - v / ymax * ch + 4) + '" text-anchor="end">' + v + '</text>';
    for (var h = 0; h <= 24; h += 3) s += '<text class="s" x="' + (ox + h / 24 * cw) + '" y="' + (oy + 16) + '" text-anchor="middle">' + (w.fr ? h + ' h' : h + 'h') + '</text>';
    s += '<text class="s" x="' + (ox - 40) + '" y="14">' + unit + '</text>';
    return { svg: s, X: function (k) { return ox + k / 48 * cw; }, Y: function (v) { return oy - Math.min(v, ymax) / ymax * ch; }, oy: oy };
  }
  function cwStep(d, s) {
    var p = [];
    s.forEach(function (v, k) { p.push(d.X(k).toFixed(1) + ',' + d.Y(v).toFixed(1), d.X(k + 1).toFixed(1) + ',' + d.Y(v).toFixed(1)); });
    return p.join(' ');
  }
  function cwKey(items) {
    var x = 60, s = '';
    items.forEach(function (it) {
      s += it[0] === 'line' ? '<line class="' + it[1] + '" x1="' + x + '" y1="282" x2="' + (x + 18) + '" y2="282"/>'
        : '<rect class="' + it[1] + '" x="' + x + '" y="276" width="14" height="12"/>';
      s += '<text class="s" x="' + (x + 22) + '" y="286">' + it[2] + '</text>';
      x += 30 + it[2].length * 6.2;
    });
    return s;
  }

  /* 9.x shade on the face: week and solar hour, each module's share in the shade */
  cwWidget('shade-face', function (w) {
    var D = w.data; if (!D) return;
    var F = w.F, S = 44, OX = 30, OY = 240;
    var MON = w.fr ? ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function P(u, v) { return (OX + u * S).toFixed(1) + ',' + (OY - v * S).toFixed(1); }
    w.mount(w.controls([
      w.slider('wk', 'Week', 'Semaine', 0, 52, 1, 25),
      w.slider('h', 'Solar hour', 'Heure solaire', D.h0, D.h0 + 14, 1, 10)
    ]) + '<div class="bk-cw-wgrid">' + cwSvg('0 0 620 290', w.t('North face with its 8 modules, each coloured by its share in the shade', 'Pan nord et ses 8 modules, chacun coloré selon sa part à l’ombre'), '<g data-k="face"></g>') +
      w.readout([
        ['m', 'Module', 'Module'], ['now', 'In the shade this hour', 'À l’ombre à cette heure'],
        ['beam', 'Beam lost over the year (tree / chimney)', 'Direct perdu sur l’année (arbre / cheminée)'],
        ['lin', 'Annual loss, lit area only', 'Perte annuelle, surface éclairée seule'],
        ['dio', 'Annual loss, bypass diodes', 'Perte annuelle, diodes de dérivation'],
        ['nod', 'Annual loss, no diode', 'Perte annuelle, sans diode']
      ]) + '</div><p class="bk-cw-note">' + w.t('Tap a module. The 8 modules together, by wiring: ', 'Touchez un module. Les 8 modules ensemble, selon le câblage : ') +
      '<span data-k="arch"></span></p>');
    var sel = 3, g = w.$('face');
    var a = D.arch;
    w.set('arch', [[w.t('ideal', 'idéal'), a.ideal], [w.t('optimisers or micro-inverters', 'optimiseurs ou micro-onduleurs'), a.mlpe],
      [w.t('2 strings of 4', '2 chaînes de 4'), a.two_mppt], [w.t('1 string of 8', '1 chaîne de 8'), a.one_string]]
      .map(function (x) { return x[0] + ' ' + cwPct(w, x[1], 1); }).join(' · ') + w.t(' (chapter 7 lump sum: ', ' (forfait du chapitre 7 : ') + D.lump + w.t('%)', ' %)'));
    function draw() {
      var wk = w.val('wk'), h = w.val('h'), day = new Date(2026, 0, 1 + wk * 7 + 3);
      w.set('wkv', w.t('around ', 'vers le ') + day.getDate() + ' ' + MON[day.getMonth()]);
      w.set('hv', w.fr ? h + ' h' : h + ':00');
      var out = '<polygon class="roofp" points="' + D.face.map(function (p) { return P(p[0], p[1]); }).join(' ') + '"/>';
      out += '<text class="s" x="' + (OX + 6.3 * S) + '" y="' + (OY + 16) + '" text-anchor="middle">' + w.t('eave (north)', 'égout (nord)') + '</text>';
      out += '<text class="s" x="' + (OX + 6.3 * S) + '" y="' + (OY - D.face[2][1] * S - 8) + '" text-anchor="middle">' + w.t('ridge', 'faîtage') + '</text>';
      D.mods.forEach(function (m, i) {
        var v = D.shade[i][wk][h - D.h0], x = OX + m[0] * S, y = OY - (m[1] + m[3]) * S;
        out += '<rect class="modp' + (i === sel ? ' on' : '') + '" data-i="' + i + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (m[2] * S).toFixed(1) + '" height="' + (m[3] * S).toFixed(1) + '"/>';
        if (v > 0) out += '<rect class="shd" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (m[2] * S).toFixed(1) + '" height="' + (m[3] * S).toFixed(1) + '" style="fill-opacity:' + (0.15 + 0.7 * v / 100).toFixed(2) + '"/>';
        out += '<text class="t" x="' + (x + m[2] * S / 2).toFixed(1) + '" y="' + (y + m[3] * S / 2 + 4).toFixed(1) + '" text-anchor="middle">' + (i + 1) + (v < 0 ? '' : ' · ' + v + w.t('%', ' %')) + '</text>';
      });
      var c = D.chimney, hu = c[3] / 2, hv = c[2] / 2;
      out += '<polygon class="chimp" points="' + [P(c[0] - hu, c[1] - hv), P(c[0] + hu, c[1] - hv), P(c[0] + hu, c[1] + hv), P(c[0] - hu, c[1] + hv)].join(' ') + '"/>';
      out += '<circle class="treep" cx="' + (OX + 11.6 * S) + '" cy="' + (OY + 30) + '" r="12"/><text class="s" x="' + (OX + 11.6 * S - 18) + '" y="' + (OY + 34) + '" text-anchor="end">' + w.t('tree, north-east', 'arbre, nord-est') + '</text>';
      g.innerHTML = out;
      var L = D.loss[sel], v = D.shade[sel][wk][h - D.h0];
      w.set('m', String(sel + 1));
      w.set('now', v < 0 ? w.t('sun behind the face', 'soleil derrière le pan') : v + w.t('%', ' %'));
      w.set('beam', cwPct(w, L.beam, 1) + ' (' + cwPct(w, L.tree, 1) + ' / ' + cwPct(w, L.chimney, 1) + ')');
      w.set('lin', cwPct(w, L.linear, 1));
      w.set('dio', cwPct(w, L.diodes, 1));
      w.set('nod', cwPct(w, L.nodiode, 1));
    }
    g.addEventListener('click', function (e) { var r = e.target.closest('[data-i]'); if (r) { sel = +r.getAttribute('data-i'); draw(); } });
    w.on(['wk', 'h'], draw);
    draw();
  });

  /* 10.x the voltage window: modules in series, strings in parallel, the site's temperatures */
  cwWidget('string-window', function (w) {
    var D = w.data; if (!D) return;
    var M = D.module, I = D.inverter, F = w.F, st = { site: 'adelaide', cold: 'rule' };
    function at(v, c, t) { return v * (1 + c / 100 * (t - 25)); }
    w.mount(cwSeg(w, 'site', [['adelaide', 'Adelaide', 'Adélaïde'], ['lyon', 'Lyon', 'Lyon'], ['london', 'London', 'Londres']], 'adelaide') +
      cwSeg(w, 'cold', [['rule', 'Cold: the market’s design temperature', 'Froid : température de calcul du marché'], ['tmy', 'Cold: the typical year’s coldest hour', 'Froid : heure la plus froide de l’année type']], 'rule') +
      w.controls([w.slider('n', 'Modules in series', 'Modules en série', 1, 16, 1, 8), w.slider('p', 'Strings in parallel on the input', 'Chaînes en parallèle sur l’entrée', 1, 3, 1, 1)]) +
      '<div class="bk-cw-wgrid">' + cwSvg('0 0 420 300', w.t('The string’s voltage range against the inverter’s limits', 'Plage de tension de la chaîne face aux limites de l’onduleur'), '<g data-k="win"></g>') +
      w.readout([
        ['tc', 'Cold, hot (cell)', 'Froid, chaud (cellule)'], ['voc', 'Voc on the coldest hour', 'Voc à l’heure la plus froide'],
        ['vmpc', 'Vmp on the coldest hour', 'Vmp à l’heure la plus froide'], ['vmph', 'Vmp on the hottest hour', 'Vmp à l’heure la plus chaude'],
        ['isc', 'Design Isc on the input', 'Isc de calcul sur l’entrée'], ['range', 'Series range at this site', 'Plage en série sur ce site']
      ]) + '</div><span class="bk-cw-flag" data-k="flag" aria-live="polite"></span>');
    var g = w.$('win');
    function draw() {
      var s = D.sites[st.site], n = w.val('n'), p = w.val('p');
      var tc = st.cold === 'rule' ? s.cold : s.tmin, th = s.hot;
      var voc = at(M.voc, M.beta_voc, tc), vmpc = at(M.vmp, M.beta_vmp, tc), vmph = at(M.vmp, M.beta_vmp, th);
      var isc = at(M.isc, M.alpha_isc, th) * D.isc_factor * p;
      var nmax = Math.min(Math.floor(I.vdc_max / voc), Math.floor(I.mppt_max / vmpc));
      var nmin = Math.ceil(Math.max(I.mppt_min, I.v_start) / vmph), nfull = Math.ceil(I.full_min / vmph);
      w.set('nv', String(n));
      w.set('pv', String(p));
      w.set('tc', F(tc, 1) + ' °C, ' + F(th, 1) + ' °C' + (st.cold === 'rule' && !s.rule ? w.t(' (no rule: typical year)', ' (pas de règle : année type)') : ''));
      w.set('voc', F(n * voc, 0) + ' V / ' + I.vdc_max + ' V');
      w.set('vmpc', F(n * vmpc, 0) + ' V / ' + I.mppt_max + ' V');
      w.set('vmph', F(n * vmph, 0) + ' V / ' + I.full_min + ' V');
      w.set('isc', F(isc, 1) + ' A / ' + I.isc_max + ' A');
      w.set('range', nmin + '–' + nmax + w.t(' modules (full power from ', ' modules (pleine puissance dès ') + nfull + ')');
      var Y = function (v) { return 270 - v / 700 * 250; }, x0 = 70, x1 = 400, out = '';
      out += '<rect class="bandp" x="' + x0 + '" y="' + Y(I.full_max) + '" width="' + (x1 - x0) + '" height="' + (Y(I.full_min) - Y(I.full_max)) + '"/>';
      for (var v = 0; v <= 700; v += 100) out += '<line class="grid" x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '"/><text class="s" x="' + (x0 - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + ' V</text>';
      [[I.vdc_max, 'lim', w.t('max DC ', 'DC max ') + I.vdc_max + ' V'], [I.mppt_max, 'lim2', 'MPPT max'], [I.mppt_min, 'lim2', 'MPPT min']].forEach(function (l) {
        out += '<line class="' + l[1] + '" x1="' + x0 + '" y1="' + Y(l[0]) + '" x2="' + x1 + '" y2="' + Y(l[0]) + '"/><text class="s" x="' + (x1 - 2) + '" y="' + (Y(l[0]) - 4) + '" text-anchor="end">' + l[2] + '</text>';
      });
      out += '<text class="s" x="' + (x0 + 4) + '" y="' + (Y(I.full_max) + 14) + '">' + w.t('full power ', 'pleine puissance ') + I.full_min + '–' + I.full_max + ' V</text>';
      var ok = n * voc <= I.vdc_max && n * vmpc <= I.mppt_max && n * vmph >= Math.max(I.mppt_min, I.v_start), bx = 235;
      out += '<line class="' + (ok ? 'okb' : 'nob') + '" x1="' + bx + '" y1="' + Y(n * vmph) + '" x2="' + bx + '" y2="' + Y(Math.min(n * voc, 700)) + '"/>';
      out += '<line class="tickp" x1="' + (bx - 10) + '" y1="' + Y(Math.min(n * M.voc, 700)) + '" x2="' + (bx + 10) + '" y2="' + Y(Math.min(n * M.voc, 700)) + '"/>';
      out += '<text class="s" x="' + (bx + 14) + '" y="' + (Y(Math.min(n * voc, 700)) + 4) + '">Voc ' + F(tc, 0) + ' °C</text>';
      out += '<text class="s" x="' + (bx + 14) + '" y="' + (Y(Math.min(n * M.voc, 700)) + 4) + '">' + w.t('Voc at 25 °C (datasheet)', 'Voc à 25 °C (fiche)') + '</text>';
      out += '<text class="s" x="' + (bx + 14) + '" y="' + (Y(n * vmph) + 4) + '">Vmp ' + F(th, 0) + ' °C</text>';
      g.innerHTML = out;
      var why = [];
      if (n * voc > I.vdc_max) why.push(w.t('the cold Voc passes the inverter’s maximum: refused', 'le Voc à froid dépasse le maximum de l’onduleur : refusé'));
      else if (n * vmpc > I.mppt_max) why.push(w.t('the cold Vmp leaves the MPPT range', 'le Vmp à froid sort de la plage MPPT'));
      if (n * vmph < Math.max(I.mppt_min, I.v_start)) why.push(w.t('too few modules: the inverter will not start on a hot day', 'trop peu de modules : l’onduleur ne démarre pas par forte chaleur'));
      else if (n * vmph < I.full_min) why.push(w.t('below full power on hot days', 'sous la pleine puissance par forte chaleur'));
      if (isc > I.isc_max) why.push(w.t('the input’s current is exceeded', 'le courant de l’entrée est dépassé'));
      if (n * M.voc <= I.vdc_max && n * voc > I.vdc_max) why.push(w.t('a check on datasheet values would have passed it', 'un contrôle sur les valeurs de la fiche l’aurait accepté'));
      w.set('flag', why.length ? why.join(' · ') : w.t('Inside the window', 'Dans la fenêtre'));
      w.$('flag').classList.toggle('bad', !ok || isc > I.isc_max);
    }
    cwGroups(w, st, draw);
    w.on(['n', 'p'], draw);
    draw();
  });

  /* 11.x a battery for the day: the engine's self-consumption dispatch, half-hour by half-hour */
  cwWidget('battery-day', function (w) {
    var D = w.data; if (!D) return;
    var F = w.F, st = { day: 'jan' }, B = D.battery, eta = Math.sqrt(B.round_trip), dt = D.dt;
    w.mount(cwSeg(w, 'day', [['jan', '15 January', '15 janvier'], ['jun', '21 June', '21 juin']], 'jan') +
      w.controls([w.slider('kwh', 'Usable capacity', 'Capacité utile', 0, 30, 1, 10)]) +
      cwSvg('0 0 700 296', w.t('One day, half-hourly: where the load’s energy comes from, and the energy stored', 'Une journée, par demi-heure : d’où vient l’énergie consommée, et l’énergie stockée'), '<g data-k="day"></g>') +
      '<div class="bk-cw-cols">' + w.readout([
        ['imp0', 'Bought from the grid this day, no battery', 'Acheté au réseau ce jour, sans batterie'],
        ['imp1', 'Bought from the grid this day, with it', 'Acheté au réseau ce jour, avec'],
        ['out', 'Delivered by the battery', 'Fourni par la batterie'], ['e', 'Stored at midnight, start → end', 'Stocké à minuit, début → fin']
      ]) + w.readout([
        ['save', 'Savings, year 1 (ToU tariff)', 'Économies, année 1 (tarif heures pleines/creuses)'], ['efc', 'Full cycles a year', 'Cycles complets par an'],
        ['yimp', 'Grid purchases over the year', 'Achats au réseau sur l’année'], ['reb', 'Federal rebate (at 40 AUD per STC)', 'Aide fédérale (à 40 AUD le STC)']
      ]) + '</div>');
    var g = w.$('day');
    function rebate(k) {
      var s = 0; D.stc.bands.forEach(function (b) { s += Math.max(0, Math.min(k, b[1]) - b[0]) * b[2]; });
      return Math.floor(s * D.stc.factor) * D.stc.price;
    }
    function draw() {
      var kwh = w.val('kwh'), i = D.sizes.indexOf(kwh), day = D.days[st.day], cmax = Math.max(B.kw_min, kwh / 3) * dt;
      var e = D.e0[st.day][i], e0 = e, imp0 = 0, imp1 = 0, outE = 0, rows = [];
      for (var k = 0; k < 48; k++) {
        var pv = day.pv[k], lo = day.load[k], s = pv - lo - B.standby_kw * dt, c = 0, d = 0;
        if (kwh > 0 && s > 0) { c = Math.max(0, Math.min(s, cmax, (kwh - e) / eta)); e += c * eta; }
        else if (kwh > 0) { d = Math.max(0, Math.min(-s, cmax, e * eta)); e -= d / eta; }
        var stb = kwh > 0 ? B.standby_kw * dt : 0, net = lo + stb - pv + c - d;
        imp0 += Math.max(lo - pv, 0); imp1 += Math.max(net, 0); outE += d;
        rows.push({ pv: pv / dt, load: lo / dt, direct: Math.min(lo, pv) / dt, batt: Math.min(d, lo) / dt, e: e });
      }
      var A = cwDayAxes(w, 6, 'kW'), out = A.svg;
      rows.forEach(function (r, k) {
        var x = A.X(k), wd = A.X(k + 1) - x, y0 = A.oy;
        var parts = [[r.direct, 'f-sc'], [r.batt, 'f-bt'], [Math.max(r.load - r.direct - r.batt, 0), 'f-gr']];
        parts.forEach(function (p) { if (p[0] > 0) { var y = A.Y(p[0]) - (A.oy - y0); out += '<rect class="' + p[1] + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + wd.toFixed(1) + '" height="' + (y0 - y).toFixed(1) + '"/>'; y0 = y; } });
      });
      out += '<polyline class="k-pv" points="' + cwStep(A, rows.map(function (r) { return r.pv; })) + '"/>';
      if (kwh > 0) out += '<polyline class="k-soc" points="' + rows.map(function (r, k) { return A.X(k + 1).toFixed(1) + ',' + (A.oy - r.e / 30 * 220).toFixed(1); }).join(' ') + '"/>' +
        '<text class="s" x="655" y="34">30 kWh</text>';
      out += cwKey([['rect', 'f-sc', w.t('PV, used at once', 'PV, consommé aussitôt')], ['rect', 'f-bt', w.t('battery', 'batterie')], ['rect', 'f-gr', w.t('grid', 'réseau')],
        ['line', 'k-pv', 'PV'], ['line', 'k-soc', w.t('stored (right scale)', 'stocké (échelle de droite)')]]);
      g.innerHTML = out;
      var y = D.years[i];
      w.set('kwhv', kwh + ' kWh');
      w.set('imp0', F(imp0, 1) + ' kWh');
      w.set('imp1', F(imp1, 1) + ' kWh');
      w.set('out', F(outE, 1) + ' kWh');
      w.set('e', F(e0, 1) + ' → ' + F(e, 1) + ' kWh');
      w.set('save', cwInt(w, y.save) + ' AUD');
      w.set('efc', cwInt(w, y.efc));
      w.set('yimp', cwInt(w, y.imp) + ' kWh');
      w.set('reb', cwInt(w, rebate(kwh)) + ' AUD');
    }
    cwGroups(w, st, draw);
    w.on(['kwh'], draw);
    draw();
  });

  /* 12.x PV size and export limit: a day's split, and the year's two ratios */
  cwWidget('self-consumption', function (w) {
    var D = w.data; if (!D) return;
    var F = w.F, st = { day: 'jan', lim: 'none' }, dt = D.dt;
    w.mount(cwSeg(w, 'day', [['jan', '15 January', '15 janvier'], ['jun', '21 June', '21 juin']], 'jan') +
      cwSeg(w, 'lim', [['none', 'No export limit', 'Sans limite d’injection'], ['5', '5 kW', '5 kW'], ['3', '3 kW', '3 kW'], ['1.5', '1.5 kW', '1,5 kW'], ['0', 'Zero export', 'Injection nulle']], 'none') +
      w.controls([w.slider('kwp', 'PV size', 'Puissance PV', 0.5, 12, 0.5, D.house_kwp >= 6.5 ? 6.5 : D.house_kwp)]) +
      cwSvg('0 0 700 296', w.t('One day, half-hourly: PV used on site, exported and curtailed', 'Une journée, par demi-heure : PV consommé sur place, injecté et écrêté'), '<g data-k="day"></g>') +
      '<div class="bk-cw-cols">' + w.readout([
        ['dsc', 'This day: used on site', 'Ce jour : consommé sur place'], ['dex', 'This day: exported', 'Ce jour : injecté'], ['dcu', 'This day: curtailed', 'Ce jour : écrêté']
      ]) + w.readout([
        ['sc', 'Year: self-consumption', 'Année : autoconsommation'], ['ss', 'Year: self-sufficiency', 'Année : autoproduction'],
        ['cu', 'Year: PV curtailed', 'Année : PV écrêté'], ['pvy', 'Year: PV produced', 'Année : PV produit']
      ]) + '</div>');
    var g = w.$('day');
    function draw() {
      var kwp = w.val('kwp'), day = D.days[st.day], lim = st.lim === 'none' ? Infinity : +st.lim;
      var A = cwDayAxes(w, 10, 'kW'), out = A.svg, sc = 0, ex = 0, cu = 0, pvs = [];
      for (var k = 0; k < 48; k++) {
        var p = day.pv[k] * kwp / dt, lo = day.load[k] / dt, d = Math.min(p, lo), x = Math.min(p - d, lim), c = p - d - x;
        sc += d * dt; ex += x * dt; cu += c * dt; pvs.push(p);
        var X0 = A.X(k), wd = A.X(k + 1) - X0;
        [[0, d, 'f-sc'], [d, d + x, 'f-ex'], [d + x, p, 'f-cu']].forEach(function (b) {
          if (b[1] > b[0] + 1e-9) out += '<rect class="' + b[2] + '" x="' + X0.toFixed(1) + '" y="' + A.Y(b[1]).toFixed(1) + '" width="' + wd.toFixed(1) + '" height="' + (A.Y(b[0]) - A.Y(b[1])).toFixed(1) + '"/>';
        });
      }
      out += '<polyline class="k-load" points="' + cwStep(A, day.load.map(function (v) { return v / dt; })) + '"/>';
      if (lim !== Infinity) out += '<text class="s" x="655" y="' + (A.Y(10) - 4) + '" text-anchor="end">' + w.t('export limit ', 'limite d’injection ') + F(lim, 1) + ' kW' + w.t(', above the load', ', au-dessus de la consommation') + '</text>';
      out += cwKey([['rect', 'f-sc', w.t('used on site', 'consommé sur place')], ['rect', 'f-ex', w.t('exported', 'injecté')], ['rect', 'f-cu', w.t('curtailed', 'écrêté')], ['line', 'k-load', w.t('load', 'consommation')]]);
      g.innerHTML = out;
      var r = D.sweep[st.lim][D.kwps.indexOf(kwp)];
      w.set('kwpv', F(kwp, 1) + ' ' + w.t('kWp', 'kWc'));
      w.set('dsc', F(sc, 1) + ' kWh');
      w.set('dex', F(ex, 1) + ' kWh');
      w.set('dcu', F(cu, 1) + ' kWh');
      w.set('sc', cwPct(w, r[0]));
      w.set('ss', cwPct(w, r[1]));
      w.set('cu', cwPct(w, r[2]));
      w.set('pvy', cwInt(w, r[3]) + ' kWh');
    }
    cwGroups(w, st, draw);
    w.on(['kwp'], draw);
    draw();
  });

  /* 13.x a heat pump and an EV: the months' loads against PV, and the year's ratios */
  cwWidget('electrification', function (w) {
    var D = w.data; if (!D) return;
    var F = w.F, st = { hp: 'off', ev: 'none' }, M = D.months;
    w.mount(cwSeg(w, 'hp', [['off', 'No heat pump', 'Sans pompe à chaleur'], ['on', 'Heat pump', 'Pompe à chaleur']], 'off') +
      cwSeg(w, 'ev', [['none', 'No EV', 'Sans VE'], ['night', 'EV charged at 22:00', 'VE chargé à 22 h'], ['midday', 'EV charged at 11:00', 'VE chargé à 11 h'], ['solar', 'EV on PV surplus', 'VE sur le surplus PV']], 'none') +
      cwSvg('0 0 700 296', w.t('Monthly loads against the PV production', 'Consommations mensuelles face à la production PV'), '<g data-k="m"></g>') +
      '<div class="bk-cw-cols">' + w.readout([
        ['load', 'Load over the year', 'Consommation sur l’année'], ['imp', 'Bought from the grid', 'Acheté au réseau'],
        ['ss', 'Self-sufficiency', 'Autoproduction'], ['sc', 'Self-consumption', 'Autoconsommation']
      ]) + w.readout([['evc', 'EV charged from PV', 'VE chargé par le PV'], ['hpc', 'Heat pump covered by PV', 'Pompe à chaleur couverte par le PV']]) + '</div>');
    var g = w.$('m'), ML = w.fr ? 'JFMAMJJASOND' : 'JFMAMJJASOND';
    function draw() {
      var hp = st.hp === 'on', ev = st.ev === 'none' ? null : M[(hp ? 'hp_' : '') + 'ev_' + st.ev];
      var tot = M.base.map(function (b, i) { return b + (hp ? M.hp[i] : 0) + (ev ? ev[i] : 0); });
      var ymax = Math.ceil(Math.max.apply(null, tot.concat(M.pv)) / 200) * 200;
      var ox = 60, oy = 250, cw = 600, ch = 220, bw = cw / 12, Y = function (v) { return oy - v / ymax * ch; }, out = '';
      for (var v = 0; v <= ymax; v += 200) out += '<line class="grid" x1="' + ox + '" y1="' + Y(v) + '" x2="' + (ox + cw) + '" y2="' + Y(v) + '"/><text class="s" x="' + (ox - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
      out += '<text class="s" x="4" y="14">' + w.t('kWh per month', 'kWh par mois') + '</text>';
      var pts = [];
      M.base.forEach(function (b, i) {
        var x = ox + i * bw + bw * 0.2, y0 = 0;
        [[b, 'f-gr'], [hp ? M.hp[i] : 0, 'f-ex'], [ev ? ev[i] : 0, 'f-bt']].forEach(function (p) {
          if (p[0] > 0) out += '<rect class="' + p[1] + '" x="' + x.toFixed(1) + '" y="' + Y(y0 + p[0]).toFixed(1) + '" width="' + (bw * 0.6).toFixed(1) + '" height="' + (Y(y0) - Y(y0 + p[0])).toFixed(1) + '"/>';
          y0 += p[0];
        });
        out += '<text class="s" x="' + (ox + (i + 0.5) * bw) + '" y="' + (oy + 16) + '" text-anchor="middle">' + ML[i] + '</text>';
        pts.push((ox + (i + 0.5) * bw).toFixed(1) + ',' + Y(M.pv[i]).toFixed(1));
      });
      out += '<polyline class="k-pv" points="' + pts.join(' ') + '"/>';
      out += cwKey([['rect', 'f-gr', w.t('household', 'foyer')], ['rect', 'f-ex', w.t('heat pump', 'pompe à chaleur')], ['rect', 'f-bt', w.t('EV', 'VE')], ['line', 'k-pv', 'PV ' + F(D.pv_kwp, 1) + ' ' + w.t('kWp', 'kWc')]]);
      g.innerHTML = out;
      var c = D.cases[(hp ? 'hp' : 'base') + '_' + st.ev];
      w.set('load', cwInt(w, c.load) + ' kWh');
      w.set('imp', cwInt(w, c.imp) + ' kWh');
      w.set('ss', cwPct(w, c.ss));
      w.set('sc', cwPct(w, c.sc));
      w.set('evc', c.ev_cov === null ? '—' : cwPct(w, c.ev_cov));
      w.set('hpc', c.hp_cov === null ? '—' : cwPct(w, c.hp_cov));
    }
    cwGroups(w, st, draw);
    draw();
  });

  /* ---------- architecture views: LikeC4's web component (```likec4, blocks.py) ---------- */
  // The bundle (assets/c4/likec4.js, from `mise run c4`) holds the model and defines
  // <likec4-view>; a click opens LikeC4's browser: zoom, search, focus, the other views.
  // Published, it is inlined in the encrypted page (tools/publish.mjs), never a file of its own.
  function c4Scheme(v) {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') v.setAttribute('color-scheme', t); else v.removeAttribute('color-scheme');
  }
  function drawC4() {
    var boxes = all('.bk-likec4-view').filter(function (n) { return n.offsetParent !== null && !n.hasAttribute('data-done'); });
    if (!boxes.length) return;
    function run() {
      boxes.forEach(function (n) {
        n.setAttribute('data-done', '');
        var v = doc.createElement('likec4-view');
        v.setAttribute('view-id', n.getAttribute('data-view'));
        v.setAttribute('browser', 'true');
        c4Scheme(v);
        n.replaceChildren(v);
      });
    }
    if (window.customElements.get('likec4-view')) return run();
    var s = doc.createElement('script');
    s.src = BASE + 'c4/likec4.js'; s.onload = run;  // not built: the note stays
    doc.head.appendChild(s);
  }
  new MutationObserver(function () { all('likec4-view').forEach(c4Scheme); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  doc.addEventListener('langchange', function () { setTimeout(drawC4, 0); });
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
