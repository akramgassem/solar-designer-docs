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
  /* ---------- widgets: the funnel prototypes (design/funnels, design/editor-tools) ---------- */
  // Intention prototypes, not final screens. Each widget draws a product screen at its real size
  // (a 390 × 844 phone or an 1180 × 820 tablet), scaled to the page, with an Enlarge button.
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
  FN.tokens = function () {
    var p = FN.palette();
    var G = {
      stone: { ground: '#ECE9E3', paper: '#FBFAF8', line: '#DDD8CF', line2: '#F1EEE9', paper2: '#FFFFFF', canvas: '#E3DFD7', grip: '#CFC9BE', faint: '#B5B0A6' },
      linen: { ground: '#F4F1EA', paper: '#FFFFFF', line: '#E4DFD4', line2: '#F3EFE8', paper2: '#FFFFFF', canvas: '#ECE7DE', grip: '#D6CFC2', faint: '#B9B2A6' },
      clay: { ground: '#EFE6DC', paper: '#FCF8F3', line: '#E0D3C4', line2: '#F3EAE0', paper2: '#FFFFFF', canvas: '#E8DCCF', grip: '#D3C3B2', faint: '#B8AA9A' },
      sage: { ground: '#E6EAE4', paper: '#FAFBF8', line: '#D5DBD2', line2: '#EDF0EA', paper2: '#FFFFFF', canvas: '#DCE2D9', grip: '#C3CBBF', faint: '#A9B2A6' },
      mist: { ground: '#E9ECEE', paper: '#FBFCFD', line: '#D8DDE1', line2: '#EEF1F3', paper2: '#FFFFFF', canvas: '#DFE3E6', grip: '#C5CCD2', faint: '#AAB2B9' },
      night: { ground: '#16181D', paper: '#1F2228', line: '#30343C', line2: '#272A31', paper2: '#262A31', canvas: '#1B1E23', grip: '#3A3F48', faint: '#5B6068', ink: '#ECE9E3', ink2: '#C9CDD3', muted: '#A5ABB4', tip: '#30343C', gain: '#6FCF97', gainSoft: '#1D3326', loss: '#F08A73', lossSoft: '#3A221D', sunText: '#E8B85C', sunSoft: '#3A2F18' }
    };
    var A = {
      spark: { live: '#FFC400', sun: '#F2A900', sel: ['#1E6B5C', '#7FC7B3'], selSoft: ['#E3EFEB', '#24332F'], battery: ['#B5653A', '#E0A27F'], batterySoft: ['#F3E6DD', '#3A2A20'] },
      current: { live: '#00B8A9', sun: '#F0A500', sel: ['#00796F', '#5FD3C6'], selSoft: ['#DDF3F0', '#1E3532'], battery: ['#5148C8', '#A9A3F2'], batterySoft: ['#E7E6F8', '#2A2948'] },
      volt: { live: '#C8EE00', sun: '#D69A00', sel: ['#0F5C46', '#8FD9B9'], selSoft: ['#E1EEE8', '#203830'], battery: ['#6C4BD8', '#B8A6F5'], batterySoft: ['#ECE7FB', '#2D2648'] }
    };
    var g = G[p.ground] || G.stone, a = A[p.accent] || A.spark, d = p.ground === 'night' ? 1 : 0;
    var t = { ink: '#1D2026', ink2: '#4A4F57', muted: '#6E737B', tip: '#1D2026', gain: '#2E7D4F', gainSoft: '#E3F1E8', loss: '#B3412C', lossSoft: '#F6E1DB', sunText: '#8A5E0A', sunSoft: '#F6EBD3', onLive: '#17191E' };
    Object.keys(g).forEach(function (k) { t[k] = g[k]; });
    t.live = a.live; t.sun = a.sun; t.sel = a.sel[d]; t.selSoft = a.selSoft[d]; t.battery = a.battery[d]; t.batterySoft = a.batterySoft[d]; t.dark = !!d;
    return t;
  };
  FN.vars = function (t) { return Object.keys(t).filter(function (k) { return k !== 'dark'; }).map(function (k) { return '--c-' + k + ':' + t[k]; }).join(';'); };

  /* the frame: a fixed-size screen scaled to the figure, with an Enlarge toggle */
  FN.frame = function (fig, w, h) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), fr = FN.isFr(fig);
    if (svg) svg.style.display = 'none';
    out.innerHTML = '<div class="bk-fw-bar"><span>' + (fr ? 'Prototype d’intention · écran du produit australien, en anglais' : 'Intention prototype · a screen of the Australian product') + '</span>' +
      '<button type="button" class="bk-fw-big">' + (fr ? 'Agrandir' : 'Enlarge') + '</button></div><div class="bk-fw"><div class="bk-fw-screen"></div></div>';
    var box = out.querySelector('.bk-fw'), screen = out.querySelector('.bk-fw-screen'), big = out.querySelector('.bk-fw-big');
    screen.style.width = w + 'px'; screen.style.height = h + 'px';
    function fit() {
      var avail = fig.classList.contains('bk-fw-open') ? Math.min(window.innerWidth - 32, (window.innerHeight - 90) * w / h) : box.clientWidth;
      var s = Math.min(1, avail / w); screen.style.transform = 'scale(' + s + ')'; box.style.height = (h * s) + 'px';
      if (fig.classList.contains('bk-fw-open')) box.style.width = (w * s) + 'px'; else box.style.width = '';
    }
    big.addEventListener('click', function () {
      var open = fig.classList.toggle('bk-fw-open');
      big.textContent = open ? (fr ? 'Réduire' : 'Close') : (fr ? 'Agrandir' : 'Enlarge'); fit();
    });
    window.addEventListener('resize', fit);
    function paint() { screen.setAttribute('style', screen.getAttribute('style').replace(/--c-[^;]*;?/g, '') + ';' + FN.vars(FN.tokens())); fit(); }
    window.addEventListener('sd-palette', paint);
    paint();
    // the screen keeps its scale while the frame is hidden (the other language), then refits
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
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
  FN.rebate = function (s) { var r = 6.8 * 38; return r * (Math.min(s, 14) + 0.6 * Math.max(0, Math.min(s, 28) - 14) + 0.15 * Math.max(0, Math.min(s, 50) - 28)); };
  FN.path = function (arr, x0, w, base, max, hgt, close) {
    var s = close ? 'M' + x0 + ' ' + base + ' ' : '';
    for (var h = 0; h < 24; h++) { var x = (x0 + h / 23 * w).toFixed(1), y = (base - arr[h] / max * hgt).toFixed(1); s += (h || close ? 'L' : 'M') + x + ' ' + y + ' '; }
    return close ? s + 'L' + (x0 + w) + ' ' + base + ' Z' : s;
  };
  // icons: a line path and a 14 % fill, 1.25 stroke on a 24 grid
  FN.ICON = {
    select: ['M6.5 3.5l10.5 7-4.6 1.2 2.6 5.4-2 .9-2.6-5.4-3.9 3z', 'M6.5 3.5l10.5 7-4.6 1.2-2.6.9-3.9 3z'],
    trace: ['M5 18.5l3.5-10 6.5 5 4-8', 'M5 18.5l3.5-10 6.5 5z'],
    rect3: ['M5 15.5l9-9 5 5-9 9z', 'M5 15.5l9-9 5 5-9 9z'],
    fill: ['M3.5 18.5h17l-4-12h-9zM8.8 10.5h6.4M7.5 14.5h9M10.5 6.5l-1 12M13.5 6.5l1 12', 'M3.5 18.5h17l-4-12h-9z'],
    panel: ['M7 3.5h10v17H7zM7 9.2h10M7 14.8h10M12 3.5v17', 'M7 3.5h10v17H7z'],
    chimney: ['M3 19.5l9-6.5 9 6.5M14.5 7.5h3v8.2M14.5 7.5v6.3M13.8 7.5h4.4', 'M14.5 7.5h3v8.2l-3-2.2z'],
    measure: ['M4 16.5L16.5 4 20 7.5 7.5 20zM8 12.5l1.6 1.6M10.5 10l1 1M13 7.5l1.6 1.6', 'M4 16.5L16.5 4 20 7.5 7.5 20z'],
    dimension: ['M4.5 7v10M19.5 7v10M4.5 12h15M7.5 10l-3 2 3 2M16.5 10l3 2-3 2', 'M4.5 9.5h15v5h-15z'],
    note: ['M5.5 4.5h13v11l-4 4h-9zM14.5 19.5v-4h4M8.5 9h7M8.5 12.5h4', 'M5.5 4.5h13v11l-4 4h-9z'],
    photo: ['M3.5 8h4l1.8-2.5h5.4L16.5 8h4v11h-17zM12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z', 'M3.5 8h17v11h-17z'],
    layers: ['M12 4.5l8.5 4.5-8.5 4.5L3.5 9zM3.5 13l8.5 4.5 8.5-4.5', 'M12 4.5l8.5 4.5-8.5 4.5L3.5 9z'],
    confirm: ['M5 12.5l4.5 4.5L19 7.5', 'M5 12.5l4.5 4.5L19 7.5z'],
    meter: ['M4.5 16a7.5 7.5 0 1 1 15 0M12 16l3.5-4.5M4.5 16h15M7 19.5h10', 'M4.5 16a7.5 7.5 0 1 1 15 0z'],
    bill: ['M6.5 3.5h8l3 3v14h-11zM14.5 3.5v3h3M9 10h6M9 13h6M9 16h4', 'M6.5 3.5h8l3 3v14h-11z'],
    ask: ['M4.5 6.5h15v9h-8l-4 3.5v-3.5h-3zM9 10.5h6M9 13h3.5', 'M4.5 6.5h15v9h-15z'],
    plan: ['M5 7h11l-3-3M19 17H8l3 3', 'M5 7h11v10H8z'],
    heat: ['M6 4.5h12v15H6zM9 8.5h6M12 11v6M9.5 14l2.5 3 2.5-3', 'M6 4.5h12v15H6z'],
    car: ['M4 15.5l2-5h12l2 5v3H4zM7.5 18.5v1.5M16.5 18.5v1.5M12.5 6l-2 3.5h3l-2 3.5', 'M4 15.5l2-5h12l2 5v3H4z'],
    battery: ['M8 5.5h8v15H8zM10.5 3.5h3v2M10.5 12.5l2-3v2.5h1.5l-2 3V12z', 'M8 5.5h8v15H8z']
  };
  FN.icon = function (k, color) {
    var i = FN.ICON[k] || FN.ICON.select;
    return '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style="color:' + (color || 'currentColor') + '"><path d="' + i[1] + '" fill="currentColor" opacity="0.14"></path><path d="' + i[0] + '" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
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

  /* the 3D house, shared by the next-move widget and the studio's 3D card */
  FN.three = function (canvas, done) {
    var go = function () {
      var T = window.THREE, r = new T.WebGLRenderer({ canvas: canvas, antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.outputEncoding = T.sRGBEncoding;
      var sc = new T.Scene(); sc.background = new T.Color('#E3DFD7');
      var mat = function (c, o) { var m = { color: c, roughness: 0.85 }; for (var k in (o || {})) m[k] = o[k]; return new T.MeshStandardMaterial(m); };
      var gnd = new T.Mesh(new T.PlaneGeometry(80, 80), mat('#D9D4CA')); gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; sc.add(gnd);
      var drive = new T.Mesh(new T.PlaneGeometry(6, 14), mat('#C9C3B8')); drive.rotation.x = -Math.PI / 2; drive.position.set(11, 0.01, 4); drive.receiveShadow = true; sc.add(drive);
      var walls = new T.Mesh(new T.BoxGeometry(15, 3, 10), mat('#EFEAE1')); walls.position.y = 1.5; walls.castShadow = true; walls.receiveShadow = true; sc.add(walls);
      var ry = 3 + 5 * Math.tan(22 * Math.PI / 180), v = [[-7.5, 3, -5], [7.5, 3, -5], [3.75, ry, 0], [-3.75, ry, 0], [-7.5, 3, 5], [7.5, 3, 5]];
      var tri = function (a, b, d) { return v[a].concat(v[b], v[d]); };
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([].concat(tri(0, 2, 1), tri(0, 3, 2), tri(4, 5, 2), tri(4, 2, 3), tri(0, 4, 3), tri(1, 2, 5)), 3)); g.computeVertexNormals();
      var roof = new T.Mesh(g, mat('#8F8679', { side: T.DoubleSide })); roof.castShadow = true; roof.receiveShadow = true; sc.add(roof);
      var trunk = new T.Mesh(new T.CylinderGeometry(0.25, 0.35, 3, 8), mat('#6B5543')); trunk.position.set(-12, 1.5, -9); trunk.castShadow = true; sc.add(trunk);
      var crown = new T.Mesh(new T.SphereGeometry(2.6, 16, 12), mat('#7A9374')); crown.position.set(-12, 4.6, -9); crown.castShadow = true; sc.add(crown);
      var bat = new T.Mesh(new T.BoxGeometry(0.25, 1.1, 0.75), mat('#5B5F97')); bat.position.set(7.65, 0.8, 2.2); bat.castShadow = true; sc.add(bat);
      var car = new T.Group(), body = new T.Mesh(new T.BoxGeometry(1.8, 0.8, 4.4), mat('#6E737B', { roughness: 0.4, metalness: 0.4 })), cab = new T.Mesh(new T.BoxGeometry(1.6, 0.6, 2.2), mat('#4A4F57', { roughness: 0.3 }));
      body.position.y = 0.6; cab.position.set(0, 1.25, -0.2); car.add(body); car.add(cab); car.position.set(11, 0, 5); car.traverse(function (o) { o.castShadow = true; }); sc.add(car);
      var hp = new T.Mesh(new T.BoxGeometry(0.9, 0.8, 0.4), mat('#CFC9BE')); hp.position.set(-7.9, 0.4, 1.5); hp.castShadow = true; sc.add(hp);
      var chim = new T.Mesh(new T.BoxGeometry(0.6, 1, 0.6), mat('#8C7462')); chim.castShadow = true; sc.add(chim);
      var panels = new T.Group(); sc.add(panels);
      var hemi = new T.HemisphereLight('#FFFFFF', '#B9B2A6', 0.55); sc.add(hemi);
      var sun = new T.DirectionalLight('#FFF4DF', 1.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      var shc = sun.shadow.camera; shc.left = -25; shc.right = 25; shc.top = 25; shc.bottom = -25; shc.near = 1; shc.far = 120; sun.shadow.bias = -0.0005; sc.add(sun); sc.add(sun.target);
      var cam = new T.PerspectiveCamera(36, 1, 0.5, 300), top = new T.OrthographicCamera(-20, 20, 13.3, -13.3, 0.5, 200);
      top.position.set(0, 60, 0); top.up.set(0, 0, -1); top.lookAt(0, 0, 0);
      var pm = mat('#22303D', { roughness: 0.35, metalness: 0.3 }), pmShade = mat('#3A4552', { roughness: 0.4, metalness: 0.2 });
      var H = { T: T, r: r, scene: sc, cam: cam, top: top, useTop: false, theta: 0.75, radius: 40, panels: panels, bat: bat, car: car, hp: hp, chim: chim, sun: sun, hemi: hemi, w: 0, h: 0, dead: false };
      // set the panels from plan rectangles (FN.layout coordinates) or the default 16
      H.setPanels = function (mods) {
        while (panels.children.length) panels.remove(panels.children[0]);
        var tan = Math.tan(22 * Math.PI / 180), cos = Math.cos(22 * Math.PI / 180);
        (mods || []).forEach(function (m) {
          var cx = m.x + m.w / 2, cy = m.y + m.h / 2, z = (cy - 356) / 40, x = (cx - 518) / 40, y = 3 + (z + 5) * tan + 0.06;
          var p = new T.Mesh(new T.BoxGeometry(m.w / 40 - 0.02, 0.05, m.h / 40 / cos - 0.02), m.shaded ? pmShade : pm);
          p.position.set(x, y, z); p.rotation.x = -22 * Math.PI / 180; p.castShadow = true; panels.add(p);
        });
      };
      H.setChimney = function (on, hgt) { var ryc = 3 + 1.05 * Math.tan(22 * Math.PI / 180); chim.visible = !!on; chim.scale.set(1, hgt + 0.5, 1); chim.position.set(0.05, ryc - 0.25 + (hgt + 0.5) / 2, -3.95); };
      H.setHour = function (hr) {
        var up = hr >= 6 && hr <= 18, t = Math.PI * (Math.min(Math.max(hr, 6), 18) - 6) / 12;
        sun.position.set(40 * Math.cos(t), 6 + 38 * Math.sin(t), -26); sun.intensity = up ? 0.35 + 0.9 * Math.sin(t) : 0.05; hemi.intensity = up ? 0.55 : 0.25;
        sc.background.set(up ? '#E3DFD7' : '#3A3D45');
      };
      H.size = function (w, h) { if (w === H.w && h === H.h) return; H.w = w; H.h = h; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      H.place = function () { cam.position.set(H.radius * Math.sin(H.theta), H.radius * 0.55, H.radius * Math.cos(H.theta)); cam.lookAt(0, 2.5, -0.5); };
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, t: H.theta }; });
      canvas.addEventListener('pointermove', function (e) { if (!drag || H.useTop) return; H.theta = drag.t - (e.clientX - drag.x) * 0.008; H.place(); });
      ['pointerup', 'pointerleave'].forEach(function (n) { canvas.addEventListener(n, function () { drag = null; }); });
      setChimneyDefault(); H.setHour(15); H.place();
      function setChimneyDefault() { chim.visible = false; car.visible = false; hp.visible = false; bat.visible = false; }
      (function loop() { if (H.dead) return; if (canvas.offsetParent !== null) r.render(sc, H.useTop ? top : cam); requestAnimationFrame(loop); })();
      done(H);
    };
    if (window.THREE) go(); else loadScript('vendor/three-0.149.0.min.js', go);
  };

  /* funnel 1 · switch plan, on a phone */
  all('figure.bk-widget[data-widget="funnel-switch"]').forEach(function (fig) {
    FN.when(fig, function () {
      var el = FN.frame(fig, 390, 844), st = { step: 0, chosen: 'Simple Saver', done: false };
      var cost = function (name) { var p = FN.PLANS.filter(function (x) { return x.name === name; })[0], d = FN.base(15), e = 0; for (var h = 0; h < 24; h++) e += d[h] * p.rate(h); return (e + p.supply) * 365; };
      function day() {
        var d = FN.base(15);
        return '<svg width="100%" height="96" viewBox="0 0 320 96" role="img" aria-label="Average day, peaking between 6 and 8 pm"><path d="' + FN.path(d, 0, 320, 84, 1.9, 76, true) + '" fill="var(--c-selSoft)"></path><path d="' + FN.path(d, 0, 320, 84, 1.9, 76) + '" fill="none" stroke="var(--c-ink)" stroke-width="1.75"></path>' +
          '<text x="0" y="95" font-size="10" fill="var(--c-muted)">0h</text><text x="150" y="95" font-size="10" fill="var(--c-muted)">12h</text><text x="300" y="95" font-size="10" fill="var(--c-muted)">24h</text></svg>';
      }
      function render() {
        var cur = cost('Flat Rate'), s = st.step, h = '';
        var plans = ['Flat Rate', 'Simple Saver', 'Time of Use Saver'].map(function (n) { return { n: n, c: cost(n) }; }).sort(function (a, b) { return a.c - b.c; });
        var dots = [0, 1, 2, 3].map(function (i) { return '<span style="flex:1;height:4px;border-radius:2px;background:' + (i <= s ? 'var(--c-live)' : 'var(--c-line)') + '"></span>'; }).join('');
        h += '<div style="width:390px;height:844px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);display:flex;flex-direction:column;overflow:hidden">';
        h += '<div style="display:flex;align-items:center;gap:8px;padding:18px 20px 10px;background:var(--c-paper);border-bottom:1px solid var(--c-line)">' + FN.SUN + '<b style="font-weight:600;font-size:15px">Solar Designer</b><span style="flex:1"></span><span style="font-size:12px;color:var(--c-muted)">My home</span></div>';
        h += '<div style="display:flex;gap:6px;padding:12px 20px">' + dots + '</div><div style="flex:1;overflow:auto;padding:4px 20px 20px;display:flex;flex-direction:column;gap:14px">';
        if (s === 0) {
          h += '<h3 style="margin:6px 0 0;font-size:28px;line-height:1.15;font-weight:600">Pay less, from this month.</h3><p style="margin:0;font-size:15px;line-height:1.55;color:var(--c-ink2)">Show us your bill once. We compare every plan you can actually take, and keep what you give us in your home’s file.</p>';
          [['Snap your bill', 'Photo or PDF · we read it for you', '2 min', true], ['Meter number (NMI)', '12 months of real readings', '1 min'], ['No bill at hand', 'Five questions, a rougher estimate', '3 min']].forEach(function (o) {
            h += '<button type="button" data-a="go" data-v="1" style="min-height:64px;border-radius:14px;border:1px solid ' + (o[3] ? 'var(--c-ink)' : 'var(--c-line)') + ';background:var(--c-paper);color:var(--c-ink);padding:12px 16px;text-align:left;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font:inherit"><span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:16px;font-weight:600">' + o[0] + '</b><span style="font-size:13px;color:var(--c-muted)">' + o[1] + '</span></span><b style="font-size:13px;font-weight:600;color:var(--c-muted)">' + o[2] + '</b></button>';
          });
          h += '<p style="margin:0;font-size:13px;color:var(--c-muted)">No email, no phone number before your first result. Nobody calls you unless you ask.</p>';
        } else if (s === 1) {
          h += '<span style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sel);font-weight:600">Your bill, read</span><span style="font-size:15px;color:var(--c-ink2)">You pay today, a year</span><span style="font-size:42px;font-weight:600">' + FN.money(cur) + '</span><span style="font-size:14px;color:var(--c-muted)">' + FN.money(cur / 12) + ' a month · Flat Rate plan · 5,475 kWh a year</span>';
          h += '<div style="background:var(--c-paper);border:1px solid var(--c-line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;font-weight:600">Your average day · 15 kWh</span>' + day() + '<span style="font-size:13px;color:var(--c-muted)">Most of it between 5 and 9 pm. That decides which plan wins.</span></div>';
          h += '<div style="background:var(--c-selSoft);border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.4">Saved to <b>My home</b>: your needs. The raw bill stays only if you attach it.</div>';
          h += '<button type="button" data-a="go" data-v="2" style="min-height:52px;border-radius:26px;border:none;background:var(--c-live);color:var(--c-onLive);font-family:inherit;font-size:16px;font-weight:600;cursor:pointer">See the plans you can take</button>';
        } else if (s === 2) {
          h += '<span style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sel);font-weight:600">Plans you can take</span><span style="font-size:14px;color:var(--c-ink2)">Ranked on your own yearly cost, from your real day. Today: ' + FN.money(cur) + '.</span>';
          plans.forEach(function (p) {
            var diff = cur - p.c, tag = diff > 1 ? 'saves ' + FN.money(diff) : (diff < -1 ? 'costs ' + FN.money(diff) + ' more' : 'your plan today'), col = diff > 1 ? 'var(--c-gain)' : (diff < -1 ? 'var(--c-loss)' : 'var(--c-muted)');
            h += '<button type="button" data-a="pick" data-v="' + p.n + '" style="min-height:76px;border-radius:14px;border:1px solid ' + (p.n === st.chosen ? 'var(--c-ink)' : 'var(--c-line)') + ';background:var(--c-paper);color:var(--c-ink);padding:12px 14px;text-align:left;display:flex;flex-direction:column;gap:6px;cursor:pointer;font:inherit"><span style="display:flex;justify-content:space-between;width:100%"><b style="font-size:16px;font-weight:600">' + p.n + '</b><b style="font-size:17px;font-weight:600">' + FN.money(p.c) + '</b></span><span style="font-size:13px;color:' + col + ';font-weight:600">' + tag + '</span></button>';
          });
          h += '<div style="border:1px dashed var(--c-line);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--c-muted);line-height:1.5">3 plans hidden because you cannot take them: they need solar, a battery or an electric car. They come back if your home changes.</div><span style="font-size:12px;color:var(--c-muted);line-height:1.5">We may be paid by the retailer when you switch ($45 a switch, the same for every plan). It never changes the order.</span>';
        } else {
          var sv = cur - cost(st.chosen);
          h += '<span style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sel);font-weight:600">Switch to ' + st.chosen + '</span><span style="font-size:15px;color:var(--c-ink2)">You save, a year</span><span style="font-size:38px;font-weight:600;color:var(--c-gain)">' + FN.money(sv * 0.8) + '–' + FN.money(sv * 1.15) + '</span><span style="font-size:14px;color:var(--c-muted)">Most likely ' + FN.money(sv) + '. Depends on how much you use in the evening.</span>';
          h += '<div style="background:var(--c-paper);border:1px solid var(--c-line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;font-size:14px"><span style="display:flex;justify-content:space-between"><span style="color:var(--c-muted)">New yearly cost</span><b>' + FN.money(cost(st.chosen)) + '</b></span><span style="display:flex;justify-content:space-between"><span style="color:var(--c-muted)">Exit fee</span><b>$0</b></span><span style="display:flex;justify-content:space-between"><span style="color:var(--c-muted)">Cooling-off period</span><b>10 business days</b></span></div>';
          h += st.done ? '<div style="background:var(--c-selSoft);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px"><b style="font-size:16px">Done. Your home is saved.</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">Next: your energy profile, then what solar, a battery, a car or a heat pump would change. Your needs are already in.</span></div>'
            : '<button type="button" data-a="done" style="min-height:52px;border-radius:26px;border:none;background:var(--c-live);color:var(--c-onLive);font-family:inherit;font-size:16px;font-weight:600;cursor:pointer">Switch now</button>';
        }
        h += '</div><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px 18px;border-top:1px solid var(--c-line);background:var(--c-paper)"><button type="button" data-a="back" style="min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--c-line);background:transparent;color:var(--c-ink2);font:inherit;cursor:pointer">Back</button><span style="font-size:12px;color:var(--c-muted)">Illustrative · one model</span></div></div>';
        el.innerHTML = h;
      }
      FN.wire(el, function (a, v) {
        if (a === 'go') st.step = +v; else if (a === 'pick') { st.chosen = v; st.step = 3; st.done = false; }
        else if (a === 'done') st.done = true; else if (a === 'back') { st.step = Math.max(0, st.step - 1); st.done = false; }
        render();
      });
      render();
    });
  });

  /* screen chrome shared by the tablet prototypes */
  FN.topbar = function (crumbs, mid, right) {
    return '<div style="height:48px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;padding:0 12px;background:var(--c-paper);border-bottom:1px solid var(--c-line)">' +
      '<div style="display:flex;align-items:center;gap:10px;min-width:0;font-size:13px;white-space:nowrap">' + FN.SUN + crumbs.map(function (c, i) { return i < crumbs.length - 1 ? '<span style="color:var(--c-muted)">' + c + '</span><span style="color:var(--c-faint)">/</span>' : '<b style="font-weight:600">' + c + '</b>'; }).join('') + '</div>' +
      '<div style="display:flex;background:var(--c-ground);border-radius:9px;padding:3px">' + mid + '</div><div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">' + right + '</div></div>';
  };
  FN.tab = function (label, on, act, v) {
    return '<button type="button"' + (act ? ' data-a="' + act + '" data-v="' + v + '"' : '') + ' style="min-height:36px;padding:0 14px;border:none;border-radius:7px;background:' + (on ? 'var(--c-paper)' : 'transparent') + ';color:' + (on ? 'var(--c-ink)' : 'var(--c-muted)') + ';font:inherit;font-size:13px;font-weight:500;cursor:' + (act ? 'pointer' : 'default') + ';' + (on ? 'box-shadow:0 1px 2px rgba(29,32,38,.12)' : '') + '">' + label + '</button>';
  };
  FN.card = 'background:var(--c-paper);border:1px solid var(--c-line);border-radius:14px';
  FN.kick = 'font-size:11px;color:var(--c-muted);letter-spacing:.04em;text-transform:uppercase';

  /* the energy profile: sources, confidence, the questions that narrow the range */
  all('figure.bk-widget[data-widget="energy-profile"]').forEach(function (fig) {
    FN.when(fig, function () {
      var el = FN.frame(fig, 1180, 820), st = { meter: false, bill: false, ans: {}, q: false, consent: false, busy: '', season: 'year', weekend: false, plans: {} }, timer = null;
      var Q = [
        { k: 'people', gain: 6, text: 'How many people live here?', why: 'Sets the size of your usage.', opts: [['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5 or more', 5]] },
        { k: 'hvac', gain: 4, text: 'How do you heat and cool?', why: 'Air conditioning moves your evenings and your seasons.', opts: [['Split-system air conditioning', 'ac'], ['Gas heater, no cooling', 'gas'], ['Neither', 'none']] },
        { k: 'hw', gain: 4, text: 'What heats your water?', why: 'Electric hot water can be a third of a bill, at night.', opts: [['Gas', 'gas'], ['Electric tank', 'elec'], ['Heat pump or solar', 'hp']] },
        { k: 'home', gain: 4, text: 'Is someone home during the day?', why: 'Daytime use is what solar covers best.', opts: [['Most weekdays', 'most'], ['Some days', 'some'], ['Rarely', 'away']] },
        { k: 'pool', gain: 2, text: 'Is there a pool pump?', why: 'A pump runs for hours, often at the wrong time.', opts: [['No', 'no'], ['Yes', 'yes']] }
      ];
      function estimate(a) {
        var size = { 1: 7.5, 2: 10.4, 3: 12.9, 4: 15.2, 5: 18.0 }[a.people || 3], h, d = [];
        var shape = a.home === 'most' ? [0.4,0.36,0.34,0.34,0.36,0.46,0.75,1.0,0.95,0.85,0.85,0.85,0.85,0.82,0.8,0.86,1.05,1.4,1.6,1.5,1.25,0.98,0.72,0.5]
          : a.home === 'away' ? [0.42,0.36,0.34,0.34,0.36,0.5,0.9,1.2,0.9,0.5,0.45,0.45,0.45,0.45,0.48,0.7,1.15,1.7,1.95,1.8,1.4,1.05,0.78,0.55] : FN.LOAD;
        var ss = shape.reduce(function (x, y) { return x + y; }, 0);
        for (h = 0; h < 24; h++) d.push(shape[h] * size / ss);
        var ex = { hw: 0, pool: 0 }, ac = a.hvac === undefined || a.hvac === 'ac';
        if (a.hw === 'elec') { for (h = 0; h < 6; h++) d[h] += 4 / 6; ex.hw = 4; }
        if (a.hw === 'hp') { for (h = 11; h < 14; h++) d[h] += 0.5; ex.hw = 1.5; }
        if (ac) { for (h = 17; h < 22; h++) d[h] += 0.25; for (h = 6; h < 9; h++) d[h] += 0.12; for (h = 0; h < 24; h++) d[h] += 0.02; }
        if (a.pool === 'yes') { for (h = 10; h < 16; h++) d[h] += 0.5; ex.pool = 3; }
        return { d: d, ex: ex, ac: ac };
      }
      function render() {
        var a = st.ans, E = estimate(a), curve = st.meter ? FN.base(15) : E.d.slice(), h;
        var tot = curve.reduce(function (x, y) { return x + y; }, 0);
        if (st.bill && !st.meter) { curve = curve.map(function (v) { return v * 15 / tot; }); tot = 15; }
        var sf = st.season === 'summer' ? 1.08 : st.season === 'winter' ? 1.2 : 1;
        var view = curve.map(function (v, i) { var x = v * sf; if (st.weekend) x *= (i >= 9 && i < 17) ? 1.35 : (i >= 17 && i < 21 ? 0.92 : 1); return x; });
        var unc = 30; Q.forEach(function (q) { if (a[q.k] !== undefined) unc -= q.gain; });
        if (st.bill) unc = Math.min(unc, 12); if (st.meter) unc = 5;
        var up = [], lo = [], line = '';
        for (h = 0; h < 24; h++) { var x = 40 + h / 23 * 480, y = 180 - view[h] / 2.6 * 150; line += (h ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; up.push(x.toFixed(1) + ' ' + (180 - view[h] * (1 + unc / 100) / 2.6 * 150).toFixed(1)); lo.unshift(x.toFixed(1) + ' ' + (180 - view[h] * (1 - unc / 100) / 2.6 * 150).toFixed(1)); }
        var spend = tot * 365 * (st.bill || st.meter ? 0.36 : 0.33) + (st.bill || st.meter ? 1.10 : 1.05) * 365;
        var badge = st.meter ? ['Measured', '12 months · half-hourly', 'var(--c-gainSoft)', 'var(--c-gain)'] : st.bill ? ['From your bills', '4 quarters · your plan read', 'var(--c-sunSoft)', 'var(--c-sunText)'] : ['Estimated', Object.keys(a).length + ' of 5 answers', 'var(--c-line2)', 'var(--c-ink2)'];
        var next = Q.filter(function (q) { return a[q.k] === undefined; }), movers = [];
        if (!st.meter) movers.push(['meter', 'Connect your meter', unc - 5, '1 min']);
        if (!st.bill && !st.meter) movers.push(['bill', 'Snap your last bill', unc - 12, '2 min']);
        if (!st.meter && !st.bill && next.length) movers.push(['ask', next[0].text.replace('?', ''), next[0].gain, '5 s']);
        movers = movers.filter(function (m) { return m[2] > 0; }).sort(function (x, y) { return y[2] - x[2]; });
        var o = '<div style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden">';
        o += FN.topbar(['My home', '14 Wattle Lane', 'Energy profile'], FN.tab('1 Profile', true) + FN.tab('2 Plans you can take', false) + FN.tab('3 Next move', false), '<span style="font-size:12px;color:var(--c-ink2)">Meter readings stay with open-energy; we see totals</span>');
        o += '<div style="position:absolute;left:12px;right:12px;top:60px;display:flex;flex-direction:column;gap:10px"><div style="' + FN.card + ';display:flex;align-items:stretch">';
        o += '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px;border-right:1px solid var(--c-line2);min-width:200px"><span style="' + FN.kick + '">Your profile is</span><span style="display:flex;gap:8px;align-items:center"><b style="font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;background:' + badge[2] + ';color:' + badge[3] + '">' + badge[0] + '</b><span style="font-size:12px;color:var(--c-ink2)">' + badge[1] + '</span></span></div>';
        o += '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2)"><span style="' + FN.kick + '">You use a year</span><b style="font-size:20px;font-weight:600">' + FN.n(tot * 365) + ' kWh</b><span style="font-size:12px;color:var(--c-muted)">' + FN.n(tot, 1) + ' kWh a day</span></div>';
        o += '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2)"><span style="' + FN.kick + '">You pay a year</span><b style="font-size:20px;font-weight:600">' + FN.money(spend) + '</b><span style="font-size:12px;color:var(--c-muted)">' + (st.bill || st.meter ? 'on your Flat Rate plan' : 'on a typical plan, assumed') + '</span></div>';
        o += '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px;flex:1"><span style="display:flex;justify-content:space-between;' + FN.kick + '"><span>How sure any saving will be</span><b style="color:var(--c-ink);text-transform:none">±' + unc + ' %</b></span><svg width="100%" height="22" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 H400" stroke="var(--c-line)" stroke-width="2"></path><path d="M' + (200 - unc * 5) + ' 3 H' + (200 + unc * 5) + ' V17 H' + (200 - unc * 5) + ' Z" fill="var(--c-sel)" opacity=".2"></path><path d="M200 1 V19" stroke="var(--c-ink)" stroke-width="1.5"></path></svg><span style="font-size:12px;color:var(--c-ink2)">A saving of $600 would show as ' + FN.money(600 * (1 - unc / 100)) + '–' + FN.money(600 * (1 + unc / 100)) + '</span></div></div>';
        o += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:var(--c-muted)">What narrows it most</span>' + (movers.length ? movers.map(function (m) { return '<button type="button" data-a="' + m[0] + '" style="min-height:40px;padding:0 12px;border-radius:20px;border:1px solid var(--c-line);background:var(--c-paper);color:var(--c-ink);font:inherit;font-size:13px;display:flex;gap:8px;align-items:center;cursor:pointer"><b style="font-weight:600">' + m[1] + '</b><span style="color:var(--c-sel)">−' + m[2] + ' pts</span><span style="color:var(--c-muted)">' + m[3] + '</span></button>'; }).join('') : '<b style="font-size:13px;color:var(--c-gain);font-weight:600">Measured: the narrowest range we can give.</b>') + '</div></div>';
        var src = [
          ['meter', 'Smart meter', '1 min · best', 'Twelve months, every half hour, read with your consent by open-energy.', st.meter, '✓ Measured · range ±5 %', !st.meter, 'Connect', true],
          ['bill', 'Your bill', '2 min', 'A photo or the PDF. We read your plan, your rates and four quarters of use. The bill itself is not kept unless you attach it.', st.bill, '✓ Flat Rate 36 c · supply $1.10 · feed-in 5 c', !st.bill && !st.meter, 'Snap or upload'],
          ['ask', 'A few questions', '5 s each', 'Only the ones that narrow your range, never a kWh to type. ' + Object.keys(a).length + ' of 5 answered.', false, '', next.length > 0 && !st.meter, Object.keys(a).length ? 'Next question' : 'Start']
        ];
        o += '<div style="position:absolute;left:12px;top:214px;width:340px;bottom:12px;display:flex;flex-direction:column;gap:10px">' + src.map(function (s) {
          return '<div style="' + FN.card + ';padding:12px 14px;display:flex;gap:12px">' + FN.icon(s[0], s[4] ? 'var(--c-gain)' : 'var(--c-ink)') + '<div style="display:flex;flex-direction:column;gap:4px;flex:1"><span style="display:flex;justify-content:space-between"><b style="font-size:14px;font-weight:600">' + s[1] + '</b><span style="font-size:11px;color:var(--c-muted)">' + s[2] + '</span></span><span style="font-size:12px;color:var(--c-ink2);line-height:1.45">' + s[3] + '</span>' +
            (s[6] ? '<button type="button" data-a="' + s[0] + '" style="align-self:flex-start;min-height:40px;padding:0 12px;border-radius:8px;border:' + (s[8] ? 'none' : '1px solid var(--c-ink)') + ';background:' + (s[8] ? 'var(--c-live)' : 'var(--c-paper2)') + ';color:' + (s[8] ? 'var(--c-onLive)' : 'var(--c-ink)') + ';font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + s[7] + '</button>' : '') +
            (s[4] ? '<b style="font-size:12px;font-weight:600;color:var(--c-gain)">' + s[5] + '</b>' : '') + '</div></div>';
        }).join('');
        o += '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:8px"><b style="font-size:14px;font-weight:600">Plans for later</b><span style="font-size:12px;color:var(--c-ink2)">Saved as plans and modelled later. Never added to what you use today.</span><div style="display:flex;flex-wrap:wrap;gap:6px">' +
          [['ev', 'Electric car'], ['hp', 'Heat pump'], ['bat', 'Battery'], ['poolhp', 'Pool heat pump']].map(function (p) { var on = !!st.plans[p[0]]; return '<button type="button" data-a="plan" data-v="' + p[0] + '" aria-pressed="' + on + '" style="min-height:36px;padding:0 10px;border-radius:18px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';font:inherit;font-size:12px;cursor:pointer">' + (on ? '✓ ' : '+ ') + p[1] + '</button>'; }).join('') + '</div></div></div>';
        var base24 = Math.min.apply(null, view) * 24, eve = 0; for (h = 17; h < 22; h++) eve += view[h];
        var tg = function (est) { return st.meter ? '<span style="font-size:10px;padding:2px 6px;border-radius:5px;background:var(--c-gainSoft);color:var(--c-gain)">measured</span>' : '<span style="font-size:10px;padding:2px 6px;border-radius:5px;background:var(--c-line2);color:var(--c-ink2)">' + est + '</span>'; };
        var tagM = st.bill ? 'scaled to bill' : 'estimated';
        var rows = [['Always on (fridge, standby)', base24, tagM], ['Evening 5–10 pm', eve, tagM], ['Heating and cooling', E.ac || st.meter ? 2.1 * sf : 0, a.hvac ? 'answered' : 'assumed'], ['Hot water', st.meter ? 0 : E.ex.hw, a.hw ? 'answered' : 'assumed gas'], ['Pool pump', st.meter ? 0 : E.ex.pool, a.pool ? 'answered' : 'assumed none']];
        var bars = '';
        if (st.meter) bars = [1.12, 1.08, 0.98, 0.9, 0.95, 1.12, 1.2, 1.18, 0.98, 0.9, 0.92, 1.06].map(function (f, i) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:100%;height:' + Math.round(f * 62) + 'px;background:var(--c-ink);opacity:.8;border-radius:4px 4px 0 0"></span><span style="font-size:10px;color:var(--c-muted)">' + 'JFMAMJJASOND'[i] + '</span></div>'; }).join('');
        else if (st.bill) bars = [[1310, 'Jan–Mar'], [1260, 'Apr–Jun'], [1480, 'Jul–Sep'], [1425, 'Oct–Dec']].map(function (b) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:100%;height:' + Math.round(b[0] / 1480 * 76) + 'px;background:var(--c-sun);border-radius:4px 4px 0 0"></span><span style="font-size:10px;color:var(--c-muted)">' + FN.n(b[0]) + ' kWh · ' + b[1] + '</span></div>'; }).join('');
        o += '<div style="position:absolute;left:364px;top:214px;right:12px;bottom:12px;' + FN.card + ';padding:14px 16px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px;font-weight:600">Your typical day</b><div style="display:flex;gap:6px">' +
          [['year', 'Year'], ['summer', 'Summer'], ['winter', 'Winter'], ['weekend', 'Weekend']].map(function (v) { var on = v[0] === 'weekend' ? st.weekend : (!st.weekend && st.season === v[0]); return '<button type="button" data-a="view" data-v="' + v[0] + '" aria-pressed="' + on + '" style="min-height:34px;padding:0 10px;border-radius:8px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + v[1] + '</button>'; }).join('') + '</div></div>';
        o += '<div style="display:flex;gap:16px"><svg width="520" height="200" viewBox="0 0 520 200" role="img" aria-label="Average day of use with its uncertainty band"><path d="M0 180 H520" stroke="var(--c-line)"></path><path d="M0 120 H520 M0 60 H520" stroke="var(--c-line2)"></path><text x="0" y="56" font-size="10" fill="var(--c-muted)">2 kWh</text><text x="0" y="116" font-size="10" fill="var(--c-muted)">1 kWh</text><path d="M' + up.join(' L') + ' L' + lo.join(' L') + ' Z" fill="var(--c-sel)" opacity=".18"></path><path d="' + line + '" fill="none" stroke="var(--c-ink)" stroke-width="1.75"></path>' +
          ['0h', '6h', '12h', '18h', '24h'].map(function (l, i) { return '<text x="' + (40 + i * 120 - (i === 4 ? 20 : 0)) + '" y="196" font-size="10" fill="var(--c-muted)">' + l + '</text>'; }).join('') + '</svg>';
        o += '<div style="flex:1;display:flex;flex-direction:column;gap:6px"><span style="' + FN.kick + '">Where it goes, a day</span>' + rows.map(function (r) { return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:4px 0;border-bottom:1px solid var(--c-line2)"><span>' + r[0] + '</span><span style="display:flex;gap:8px;align-items:center"><b style="font-weight:600">' + FN.n(r[1], 1) + ' kWh</b>' + tg(r[2]) + '</span></div>'; }).join('') + '</div></div>';
        o += '<span style="' + FN.kick + '">' + (st.meter ? 'Your months · measured' : st.bill ? 'Your last four bills' : 'Your seasons') + '</span>' + (bars ? '<div style="display:flex;align-items:flex-end;gap:6px;height:90px">' + bars + '</div>' : '<div style="height:90px;border:1px dashed var(--c-line);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--c-muted)">Snap a bill or connect your meter to see your real seasons</div>');
        o += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:8px;border-top:1px solid var(--c-line2)"><span style="font-size:12px;color:var(--c-muted)">Kept in My home · needs layer · totals and an average day only</span><span style="min-height:44px;padding:0 16px;border-radius:10px;background:var(--c-live);color:var(--c-onLive);font-size:14px;font-weight:600;display:flex;align-items:center">See plans you can take</span></div></div>';
        if (st.q && next.length && !st.meter) {
          var q = next[0];
          o += '<div style="position:absolute;left:12px;top:214px;width:340px;' + FN.card + ';border-color:var(--c-sel);padding:14px;box-shadow:0 14px 36px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:10px;z-index:5"><span style="display:flex;justify-content:space-between;font-size:12px;color:var(--c-muted)"><span>Question ' + (Object.keys(a).length + 1) + ' of 5 · the one that narrows most</span><button type="button" data-a="closeq" style="border:none;background:none;color:var(--c-muted);font:inherit;font-size:12px;cursor:pointer">Close</button></span><b style="font-size:17px;font-weight:600;line-height:1.3">' + q.text + '</b><span style="font-size:12px;color:var(--c-ink2)">' + q.why + '</span>' +
            q.opts.map(function (op) { return '<button type="button" data-a="answer" data-v="' + q.k + '|' + op[1] + '" style="min-height:48px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:14px;text-align:left;padding:0 14px;cursor:pointer">' + op[0] + '</button>'; }).join('') + '</div>';
        }
        if (st.consent) o += '<div style="position:absolute;inset:0;background:rgba(29,32,38,.32);display:flex;align-items:center;justify-content:center;z-index:9"><div style="width:480px;' + FN.card + ';padding:20px;display:flex;flex-direction:column;gap:12px"><b style="font-size:18px;font-weight:600">Connect your meter</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">Your meter number (NMI) is on your bill. With your consent, open-energy reads the last 12 months of half-hourly readings from the market operator. Solar Designer receives only totals and an average day. You can withdraw at any time.</span><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-a="noconsent" style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Not now</button><button type="button" data-a="consent" style="min-height:44px;padding:0 16px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-weight:600;cursor:pointer">Allow 12 months</button></div></div></div>';
        if (st.busy) o += '<div style="position:absolute;left:50%;bottom:22px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:10px 14px;border-radius:10px;z-index:8">' + st.busy + '</div>';
        el.innerHTML = o + '</div>';
      }
      function later(msg, patch) { st.busy = msg; st.q = false; render(); clearTimeout(timer); timer = setTimeout(function () { st.busy = ''; for (var k in patch) st[k] = patch[k]; render(); }, 850); }
      FN.wire(el, function (a, v) {
        if (a === 'meter') st.consent = true;
        else if (a === 'consent') { st.consent = false; later('open-energy is reading 12 months of your meter…', { meter: true }); return; }
        else if (a === 'noconsent') st.consent = false;
        else if (a === 'bill') { later('Reading your bill…', { bill: true }); return; }
        else if (a === 'ask') st.q = true;
        else if (a === 'closeq') st.q = false;
        else if (a === 'answer') { var p = v.split('|'); st.ans[p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; st.q = Q.some(function (q) { return st.ans[q.k] === undefined; }); }
        else if (a === 'plan') st.plans[v] = !st.plans[v];
        else if (a === 'view') { if (v === 'weekend') st.weekend = !st.weekend; else { st.season = v; st.weekend = false; } }
        render();
      });
      render();
    });
  });

  /* funnel 2 · my roof at the Guided level: confirm the faces, fill, your day */
  all('figure.bk-widget[data-widget="my-roof"]').forEach(function (fig) {
    FN.when(fig, function () {
      var el = FN.frame(fig, 1180, 820), timer = null;
      var st = { addr: false, conf: { N: false, W: false, E: false }, tool: 'confirm', preview: false, filled: false, ev: true, hp: false, bat: true, hour: 18, playing: false, result: false, next: -1, hist: [] };
      var mods = FN.layout('portrait');
      function opts(s) { return { kwp: s.filled ? 16 * 0.44 : 0, cap: s.filled && s.bat ? 13.5 : 0, ev: s.ev, hp: s.hp, plan: 'best' }; }
      function render() {
        var all3 = st.conf.N && st.conf.W && st.conf.E, step = !st.addr ? 0 : !all3 ? 1 : !st.filled ? 2 : 3, h = st.hour;
        var R = FN.sim(opts(st)), today = FN.TODAY(), save = today - R.total;
        var o = '<div style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);display:flex;flex-direction:column;overflow:hidden;position:relative">';
        o += FN.topbar(['My home', st.addr ? '14 Wattle Lane' : 'new'], ['Address', 'Roof', 'Fill', 'Your day'].map(function (l, i) { return FN.tab((i < step ? '✓ ' : (i + 1) + ' ') + l, i === step); }).join(''), '<span style="font-size:12px;color:var(--c-muted)">Guided · no email needed</span>');
        o += '<div style="flex:1;display:flex;min-height:0">';
        var tools = [['confirm', 'Confirm', false], ['fill', 'Fill zone', !all3], ['panel', 'Modules', !st.filled], ['chimney', 'Obstacle', !all3]];
        o += '<div style="width:80px;background:var(--c-paper);border-right:1px solid var(--c-line);display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:6px" role="toolbar" aria-label="Tools">' + tools.map(function (t) { var on = st.tool === t[0]; return '<button type="button" data-a="tool" data-v="' + t[0] + '"' + (t[2] ? ' disabled' : '') + ' aria-pressed="' + on + '" style="width:64px;min-height:64px;border:none;border-radius:10px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:' + (t[2] ? 'var(--c-faint)' : on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:inherit;cursor:pointer;box-shadow:' + (on ? 'inset 3px 0 0 var(--c-sel)' : 'none') + '">' + FN.icon(t[0]) + '<span style="font-size:11px;font-weight:500">' + t[1] + '</span></button>'; }).join('') +
          '<span style="flex:1"></span><button type="button" data-a="undo" style="width:64px;min-height:64px;border:none;background:transparent;color:' + (st.hist.length ? 'var(--c-ink)' : 'var(--c-faint)') + ';font:inherit;font-size:11px;cursor:pointer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 6.5L4.5 10.5l4 4M4.5 10.5h9a5.5 5.5 0 0 1 0 11H11"></path></svg><br>Undo</button></div>';
        var faces = ['S', 'W', 'E', 'N'].map(function (f) { var c = f !== 'S' && st.conf[f], hi = st.tool === 'confirm' && f !== 'S' && !c; return '<path data-a="face" data-v="' + f + '" d="' + FN.FACES[f] + '" fill="' + (c ? (f === 'N' ? '#CFC9BF' : '#C8C2B7') : f === 'S' ? '#C2BBB0' : '#D5DDD3') + '" stroke="' + (hi ? 'var(--c-sel)' : '#9C958A') + '" stroke-width="' + (hi ? 2.5 : 1) + '" style="cursor:pointer"></path>'; }).join('');
        var ms = (st.filled || st.preview) ? mods.map(function (m) { var g = !st.filled; return '<rect x="' + m.x.toFixed(1) + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="' + (g ? 'var(--c-selSoft)' : '#2B3A4A') + '" stroke="' + (g ? 'var(--c-sel)' : '#55667A') + '" stroke-dasharray="' + (g ? '4 3' : 'none') + '"></rect>'; }).join('') : '';
        var sunUp = st.filled && h >= 6 && h <= 18, ang = Math.PI * (h - 6) / 12, sx = 380 - Math.cos(ang) * 300, sy = 120 - Math.sin(ang) * 80, sl = sunUp ? 60 / Math.max(0.25, Math.sin(ang)) : 0, dx = Math.cos(ang) * sl * 0.8;
        o += '<div style="flex:1;min-width:0;position:relative;background:var(--c-canvas)"><svg width="100%" height="100%" viewBox="0 0 760 712" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Top view of the roof drawn from our own geometry"><g transform="translate(-138 0)">' + faces + ms + '<path d="M368 356 L668 356" stroke="#8F887C" stroke-width="1.5"></path>' +
          (sunUp ? '<path d="M218 556 L818 556 L' + (818 + dx).toFixed(0) + ' ' + (556 + sl * 0.5).toFixed(0) + ' L' + (218 + dx).toFixed(0) + ' ' + (556 + sl * 0.5).toFixed(0) + ' Z" fill="#1D2026" opacity=".14"></path>' : '') + '</g>' +
          (sunUp ? '<circle cx="' + sx.toFixed(0) + '" cy="' + sy.toFixed(0) + '" r="16" fill="var(--c-sun)"></circle>' : '') + '<circle cx="716" cy="44" r="20" fill="var(--c-paper)" stroke="var(--c-line)"></circle><path d="M716 30 L721 46 L716 43 L711 46 Z" fill="var(--c-ink)"></path></svg>';
        o += '<span style="position:absolute;left:12px;top:12px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;background:var(--c-paper);color:var(--c-gain);border:1px solid var(--c-line)">LiDAR-measured · 0.91 · our drawing, not a photo</span>';
        if (st.addr && !all3) [['N', '46%', '20%', 'north'], ['W', '14%', '46%', 'west'], ['E', '70%', '46%', 'east']].forEach(function (c) { var ok = st.conf[c[0]]; o += '<button type="button" data-a="face" data-v="' + c[0] + '" style="position:absolute;left:' + c[1] + ';top:' + c[2] + ';min-height:44px;padding:0 12px;border-radius:22px;border:1px solid ' + (ok ? 'var(--c-gain)' : 'var(--c-sel)') + ';background:' + (ok ? 'var(--c-gainSoft)' : 'var(--c-paper)') + ';color:' + (ok ? 'var(--c-gain)' : 'var(--c-sel)') + ';font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + (ok ? '✓ ' + c[3] + ' confirmed' : 'Confirm ' + c[3] + ' · 22°') + '</button>'; });
        if (st.preview && !st.filled) o += '<div style="position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:6px;' + FN.card + ';padding:6px;align-items:center"><span style="font-size:13px;color:var(--c-muted);padding:0 8px">16 modules · 7.04 kWp · ' + FN.n(16 * 0.44 * 1460) + ' kWh/yr</span><button type="button" data-a="keep" style="min-height:44px;padding:0 14px;border-radius:8px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-size:13px;font-weight:600;cursor:pointer">✓ Keep</button></div>';
        var coach = [['Find your home', 'Type your address and pick it in the list.'], ['Is this your roof?', 'Tap each face to confirm it. The south face gets no panels.'], ['Fill your roof', 'Fill zone, the north face, then ✓ Keep. Three touches.'], ['Your day', 'Press ▶ or slide the hour. Flip a switch and watch the bill.']][step];
        if (!st.result) o += '<div style="position:absolute;left:12px;bottom:12px;max-width:360px;' + FN.card + ';padding:10px 12px;font-size:14px;line-height:1.45"><b>' + coach[0] + '</b><br><span style="color:var(--c-muted)">' + coach[1] + '</span></div>';
        if (!st.addr) o += '<div style="position:absolute;inset:0;background:color-mix(in srgb,var(--c-canvas) 86%,transparent);display:flex;align-items:center;justify-content:center"><div style="width:520px;' + FN.card + ';padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 28px rgba(29,32,38,.16)"><b style="font-size:26px;font-weight:600;line-height:1.2">Your home in the sun, in two minutes.</b><span style="font-size:15px;color:var(--c-ink2);line-height:1.5">We find your roof from open elevation data and draw it; you confirm it with a few taps.</span><span style="min-height:52px;border-radius:10px;border:1px solid var(--c-sel);padding:0 14px;font-size:16px;display:flex;align-items:center;background:var(--c-paper2)">14 Wattle Lane, Marr|</span><div style="display:flex;flex-direction:column;border:1px solid var(--c-line);border-radius:10px;overflow:hidden">' +
          ['14 Wattle Lane, Marrickville NSW 2204', '14 Wattle Lane, Marayong NSW 2148', '14 Wattle Lane, Maroubra NSW 2035'].map(function (t, i) { return '<button type="button" data-a="addr" style="min-height:48px;border:none;border-bottom:1px solid var(--c-line2);background:' + (i ? 'var(--c-paper2)' : 'var(--c-selSoft)') + ';color:var(--c-ink);text-align:left;padding:0 14px;font:inherit;font-size:15px;cursor:pointer">' + t + '</button>'; }).join('') + '</div><span style="font-size:12px;color:var(--c-muted)">Open address file · free · your bill is already in from the plan check</span></div></div>';
        o += '</div>';
        var eff = function (k) { var on = opts(st), off = opts(st); on[k === 'bat' ? 'cap' : k] = k === 'bat' ? 13.5 : true; off[k === 'bat' ? 'cap' : k] = k === 'bat' ? 0 : false; return FN.sim(off).total - FN.sim(on).total; };
        o += '<div style="width:340px;background:var(--c-paper);border-left:1px solid var(--c-line);display:flex;flex-direction:column">';
        o += '<div style="padding:14px 16px;border-bottom:1px solid var(--c-line2);display:flex;flex-direction:column;gap:4px"><span style="font-size:13px;color:var(--c-muted)">Energy spend a year · power, gas, fuel</span><span style="font-size:14px;color:var(--c-muted)">Today <b style="color:var(--c-ink)">' + FN.money(today) + '</b></span><b style="font-size:28px;font-weight:600;color:' + (st.filled ? 'var(--c-gain)' : 'var(--c-faint)') + '">' + (st.filled ? FN.money(R.total) : '—') + '</b><b style="font-size:14px;color:var(--c-gain);font-weight:600">' + (st.filled && save > 0 ? 'You save ' + FN.money(save * 0.85) + '–' + FN.money(save * 1.1) + ' a year' : 'Fill your roof to see it') + '</b><span style="font-size:12px;color:var(--c-muted)">' + (st.filled ? 'Best plan for this home: ' + R.plan : 'Your bill is in from the plan check') + '</span></div>';
        o += '<div style="padding:12px 16px;border-bottom:1px solid var(--c-line2);display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;justify-content:space-between"><b style="font-size:14px;font-weight:600">Your day · ' + (h < 10 ? '0' : '') + h + ':00</b><button type="button" data-a="play" aria-label="Play the day" style="min-width:44px;min-height:44px;border-radius:22px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">' + (st.playing ? '❚❚' : '▶') + '</button></div>' +
          '<svg width="100%" height="96" viewBox="0 0 300 96" role="img" aria-label="Production, home use and battery over a day"><path d="' + FN.path(R.pv, 0, 300, 84, 4.5, 80, true) + '" fill="var(--c-sun)" opacity=".35"></path><path d="' + FN.path(R.load, 0, 300, 84, 4.5, 80) + '" fill="none" stroke="var(--c-ink)" stroke-width="1.75"></path>' + (st.bat && st.filled ? '<path d="' + FN.path(R.socs.map(function (x) { return x * 4.5; }), 0, 300, 84, 4.5, 80) + '" fill="none" stroke="var(--c-battery)" stroke-width="1.8" stroke-dasharray="4 3"></path>' : '') + '<path d="M' + (h / 23 * 300).toFixed(1) + ' 2 V84" stroke="var(--c-live)" stroke-width="2"></path></svg>' +
          '<input type="range" min="0" max="23" step="1" value="' + h + '" data-in="hour" aria-label="Hour of the day" style="width:100%;accent-color:var(--c-sel)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px"><span>Panels <b style="color:var(--c-sunText)">' + R.pv[h].toFixed(1) + ' kW</b></span><span>Home <b>' + R.load[h].toFixed(1) + ' kW</b></span><span>Battery <b style="color:var(--c-battery)">' + (st.bat && st.filled ? Math.round(R.socs[h] * 100) + '%' : '—') + '</b></span><span>Grid <b>' + (R.imp[h] > 0.05 ? 'in ' + R.imp[h].toFixed(1) + ' kW' : R.exp[h] > 0.05 ? 'out ' + R.exp[h].toFixed(1) + ' kW' : '0 kW') + '</b></span></div></div>';
        o += '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;overflow:auto"><b style="font-size:14px;font-weight:600">What would change?</b>' + [['bat', 'Battery 13.5 kWh'], ['ev', 'Electric car · 40 km a day'], ['hp', 'Heat-pump hot water']].map(function (w) {
          var on = st[w[0]], e = st.filled ? eff(w[0]) : 0;
          return '<button type="button" data-a="sw" data-v="' + w[0] + '" aria-pressed="' + on + '" style="min-height:58px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);text-align:left;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font:inherit;cursor:pointer"><span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:14px;font-weight:600">' + w[1] + '</b><b style="font-size:12px;font-weight:600;color:' + (!st.filled ? 'var(--c-muted)' : e >= 0 ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (st.filled ? (e >= 0 ? 'saves ' : 'costs ') + FN.money(e) + ' a year' : 'fill your roof first') + '</b></span><b style="font-size:12px;color:' + (on ? 'var(--c-sel)' : 'var(--c-muted)') + '">' + (on ? 'ON' : 'OFF') + '</b></button>';
        }).join('') + (st.filled ? '<button type="button" data-a="result" style="min-height:48px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px">See what it costs and who can install it</button>' : '') + '</div></div></div>';
        if (st.result) {
          var kwp = 7.04, up = kwp * 900 + (st.bat ? 11500 - FN.rebate(13.5) : 0) + (st.hp ? 3200 : 0) + (st.ev ? 1400 : 0), pay = save > 0 ? up / save : 0;
          o += '<div style="position:absolute;inset:48px 0 0 0;background:var(--c-ground);display:flex;flex-direction:column;padding:22px 28px;gap:14px;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:24px;font-weight:600">Your home, and what it takes</b><button type="button" data-a="close" style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Back to my roof</button></div>';
          o += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' + [['System', kwp.toFixed(2) + ' kWp' + (st.bat ? ' + 13.5 kWh' : ''), '16 modules, north face' + (st.ev ? ' · car charger' : '') + (st.hp ? ' · heat pump' : '')], ['Upfront, after rebates', FN.money(up), st.bat ? 'Battery rebate about ' + FN.money(FN.rebate(13.5)) + ' included' : 'Solar certificates included'], ['Pays back in', save > 0 ? (pay * 0.9).toFixed(1) + '–' + (pay * 1.25).toFixed(1) + ' years' : 'does not pay back', 'A range: sun, use and prices vary']].map(function (c) { return '<div style="' + FN.card + ';padding:14px;display:flex;flex-direction:column;gap:4px"><span style="font-size:13px;color:var(--c-muted)">' + c[0] + '</span><b style="font-size:20px;font-weight:600">' + c[1] + '</b><span style="font-size:13px;color:var(--c-muted)">' + c[2] + '</span></div>'; }).join('') + '</div>';
          o += '<b style="font-size:16px;font-weight:600">Who installs it?</b><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' + [['An installer I choose', 'You pick; they receive your home after you consent.'], ['Let Solar Designer propose 3', 'Matched on area and skills. You see who before they see you.'], ['Keep it for now', 'Saved in My home.']].map(function (n, i) { return '<button type="button" data-a="next" data-v="' + i + '" style="min-height:88px;border-radius:12px;border:1px solid ' + (st.next === i ? 'var(--c-sel)' : 'var(--c-line)') + ';background:var(--c-paper);color:var(--c-ink);text-align:left;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font:inherit;cursor:pointer"><b style="font-size:15px;font-weight:600">' + n[0] + '</b><span style="font-size:13px;color:var(--c-muted);line-height:1.4">' + n[1] + '</span></button>'; }).join('') + '</div>';
          if (st.next === 1) o += '<div style="' + FN.card + ';border-color:var(--c-sel);padding:14px 16px;display:flex;flex-direction:column;gap:10px"><b style="font-size:15px;font-weight:600">Before anyone sees your home</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">These 3 installers receive your roof, your needs as totals (never your meter readings) and this draft. They never see each other’s proposals. Nobody calls you unless you ask.</span><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;font-size:13px"><span style="background:var(--c-line2);border-radius:8px;padding:10px">Installer 1 · 9 km · batteries</span><span style="background:var(--c-line2);border-radius:8px;padding:10px">Installer 2 · 14 km · heat pumps too</span><span style="background:var(--c-line2);border-radius:8px;padding:10px">Installer 3 · 21 km · CEC approved</span></div><span style="align-self:flex-start;min-height:48px;padding:0 18px;border-radius:10px;background:var(--c-live);color:var(--c-onLive);font-size:15px;font-weight:600;display:flex;align-items:center">Share my home with these 3</span></div>';
          o += '</div>';
        }
        el.innerHTML = o + '</div>';
      }
      FN.wire(el, function (a, v) {
        if (a === 'addr') st.addr = true;
        else if (a === 'tool') { st.tool = v; st.preview = false; }
        else if (a === 'face') {
          if ((st.tool === 'confirm' || !(st.conf.N && st.conf.W && st.conf.E)) && v !== 'S' && !st.conf[v]) { st.hist.push(JSON.stringify([st.conf, st.filled])); st.conf[v] = true; }
          else if (st.tool === 'fill' && v === 'N' && !st.filled) st.preview = true;
        }
        else if (a === 'keep') { st.hist.push(JSON.stringify([st.conf, st.filled])); st.filled = true; st.preview = false; st.tool = 'confirm'; }
        else if (a === 'undo' && st.hist.length) { var p = JSON.parse(st.hist.pop()); st.conf = p[0]; st.filled = p[1]; st.preview = false; }
        else if (a === 'hour') st.hour = +v;
        else if (a === 'play') { if (timer) { clearInterval(timer); timer = null; st.playing = false; } else { st.playing = true; timer = setInterval(function () { st.hour = (st.hour + 1) % 24; render(); }, 600); } }
        else if (a === 'sw') st[v] = !st[v];
        else if (a === 'result') st.result = true; else if (a === 'close') st.result = false; else if (a === 'next') st.next = +v;
        render();
      });
      render();
    });
  });

  /* next move: measures ranked by payback, a waterfall, the 3D home */
  all('figure.bk-widget[data-widget="next-move"]').forEach(function (fig) {
    FN.when(fig, function () {
      var el = FN.frame(fig, 1180, 820), st = { plan: true, solar: false, hp: false, ev: false, bat: false, hour: 15, playing: false, top: false }, H = null, timer = null;
      el.innerHTML = '<div style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden">' +
        FN.topbar(['My home', '14 Wattle Lane', 'Next move'], FN.tab('✓ Profile · measured', false) + FN.tab('✓ Plan switched', false) + FN.tab('3 Next move', true), '<span style="font-size:12px;color:var(--c-ink2)">Range ±5 % · measured profile</span>') +
        '<div class="nm-ribbon" style="position:absolute;left:12px;right:12px;top:60px;height:118px;' + FN.card + ';display:flex;align-items:stretch"></div>' +
        '<div class="nm-moves" style="position:absolute;left:12px;top:190px;width:360px;bottom:12px;display:flex;flex-direction:column;gap:8px"></div>' +
        '<div style="position:absolute;left:384px;top:190px;right:12px;bottom:12px;' + FN.card + ';overflow:hidden;display:flex;flex-direction:column"><div style="position:relative;height:520px;background:var(--c-canvas)"><canvas class="nm-canvas" width="784" height="520" aria-label="Your home in 3D: drag to turn around it" style="width:784px;height:520px;display:block;touch-action:none;cursor:grab"></canvas><div class="nm-over"></div></div><div class="nm-strip" style="flex:1;display:flex;align-items:center;gap:14px;padding:0 16px;border-top:1px solid var(--c-line2)"></div></div></div>';
      var q = function (c) { return el.querySelector(c); };
      var INFO = {
        plan: ['plan', 'Plan switch', 'best plan, checked again after each move', 0, 'done in step 2'],
        solar: ['fill', 'Solar 7.04 kWp', '16 modules on the north face', 7.04 * 900, ''],
        hp: ['heat', 'Heat-pump hot water', 'replaces gas · runs at midday', 3200, 'from your plans'],
        ev: ['car', 'Electric car charger', '40 km a day · charges with the sun', 1400, 'from your plans'],
        bat: ['battery', 'Battery 13.5 kWh', 'stores noon for the evening · rebate about ' + FN.money(FN.rebate(13.5)), 11500 - FN.rebate(13.5), '']
      };
      var ORDER = ['plan', 'solar', 'hp', 'ev', 'bat'];
      function opt(m) { return { plan: m.plan ? 'best' : 'flat', kwp: m.solar ? 7.04 : 0, cap: m.bat ? 13.5 : 0, ev: m.ev, hp: m.hp }; }
      function render() {
        var today = FN.TODAY(), acc = { plan: false, solar: false, hp: false, ev: false, bat: false }, prev = today, delta = {};
        ORDER.forEach(function (k) { if (st[k]) { acc[k] = true; var t = FN.sim(opt(acc)).total; delta[k] = t - prev; prev = t; } });
        var fin = prev, save = today - fin, R = FN.sim(opt(st)), h = st.hour;
        var steps = [['Today', today, 1]]; ORDER.forEach(function (k) { if (st[k]) steps.push([{ plan: 'Plan', solar: 'Solar', hp: 'Heat pump', ev: 'Car', bat: 'Battery' }[k], delta[k], 0]); }); steps.push(['New', fin, 1]);
        var mx = today * 1.05, run = today, bars = steps.map(function (s, i) {
          var x = 10 + i * 112, y, hh, fill, val, col;
          if (s[2]) { y = 8 + 84 - s[1] / mx * 84; hh = s[1] / mx * 84; fill = 'var(--c-ink)'; val = FN.money(s[1]); col = 'var(--c-ink)'; }
          else { var a2 = run, b2 = run + s[1]; run = b2; y = 8 + 84 - Math.max(a2, b2) / mx * 84; hh = Math.max(2, Math.abs(s[1]) / mx * 84); fill = s[1] <= 0 ? 'var(--c-gain)' : 'var(--c-loss)'; val = (s[1] <= 0 ? '−' : '+') + FN.money(s[1]); col = fill; }
          return '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="96" height="' + hh.toFixed(1) + '" rx="3" fill="' + fill + '" opacity="' + (i === 0 ? 0.35 : 0.85) + '"></rect><text x="' + (x + 48) + '" y="' + Math.max(10, y - 3).toFixed(1) + '" font-size="11" fill="' + col + '" text-anchor="middle" font-weight="600">' + val + '</text><text x="' + (x + 48) + '" y="112" font-size="11" fill="var(--c-ink2)" text-anchor="middle">' + s[0] + '</text>';
        }).join('');
        q('.nm-ribbon').innerHTML = '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2);min-width:210px"><span style="' + FN.kick + '">Energy spend a year</span><span style="font-size:13px;color:var(--c-ink2)">today ' + FN.money(today) + '</span><b style="font-size:26px;font-weight:600;color:var(--c-gain)">' + FN.money(fin) + '</b><span style="font-size:12px;color:var(--c-ink2)">saves ' + FN.money(save * 0.95) + '–' + FN.money(save * 1.05) + ' · power, gas, fuel</span></div><svg width="900" height="116" viewBox="0 0 900 116" role="img" aria-label="Waterfall from today’s energy spend to the new spend">' + bars + '</svg>';
        var solo = function (k) { var a3 = {}, b3 = {}; for (var x in st) { a3[x] = st[x]; b3[x] = st[x]; } a3[k] = true; b3[k] = false; return FN.sim(opt(b3)).total - FN.sim(opt(a3)).total; };
        var rank = ['solar', 'hp', 'ev', 'bat'].map(function (k) { var s = solo(k); return { k: k, s: s, pay: s > 0 ? INFO[k][3] / s : 99 }; }).sort(function (a4, b4) { return a4.pay - b4.pay; });
        q('.nm-moves').innerHTML = '<span style="' + FN.kick + ';padding:0 4px">Your next moves · ranked by payback</span>' + [{ k: 'plan', s: today - FN.sim({ plan: 'best' }).total, pay: 0 }].concat(rank).map(function (m) {
          var on = st[m.k], I = INFO[m.k], e = on && delta[m.k] !== undefined ? -delta[m.k] : m.s;
          var tag = I[4] || (m.pay < 99 ? 'pays back ~' + m.pay.toFixed(1) + ' yrs' : 'needs solar first');
          return '<div style="' + FN.card + ';border-color:' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';padding:10px 12px;display:flex;gap:10px;align-items:center">' + FN.icon(I[0], on ? 'var(--c-sel)' : 'var(--c-ink2)') + '<div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span style="display:flex;gap:6px;align-items:baseline"><b style="font-size:14px;font-weight:600">' + I[1] + '</b><span style="font-size:11px;color:var(--c-muted)">' + tag + '</span></span><span style="font-size:12px;color:var(--c-ink2)">' + I[2] + (I[3] ? ' · ' + FN.money(I[3]) + ' upfront' : ' · no cost') + '</span><b style="font-size:12px;font-weight:600;color:' + (e >= 0 ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (e >= 0 ? 'saves ' : 'costs ') + FN.money(e) + ' a year' + (on ? '' : ' if added') + '</b></div>' +
            '<button type="button" data-a="toggle" data-v="' + m.k + '" aria-pressed="' + on + '" style="min-width:64px;min-height:40px;border-radius:20px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-live)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-live)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-onLive)') + ';font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + (on ? 'Added' : 'Add') + '</button></div>';
        }).join('') + '<span style="font-size:11px;color:var(--c-muted);line-height:1.5;padding:0 4px;margin-top:auto">Each move is a measure on your scenario. Its effect is measured on top of the moves above it, and the best plan is checked again after each one.</span>';
        var parts = []; if (st.solar) parts.push('panels'); if (st.bat) parts.push('battery'); if (st.ev) parts.push('car'); if (st.hp) parts.push('heat pump');
        q('.nm-over').innerHTML = '<div style="position:absolute;left:12px;top:12px;display:flex;gap:6px"><span style="font-size:12px;padding:5px 9px;border-radius:7px;background:var(--c-paper);color:var(--c-gain);border:1px solid var(--c-line)">LiDAR faces · our drawing</span><span style="font-size:12px;padding:5px 9px;border-radius:7px;background:var(--c-paper);color:var(--c-ink2);border:1px solid var(--c-line)">' + (parts.length ? 'Added: ' + parts.join(', ') : 'Add a move to see it on your home') + '</span></div>' +
          '<div style="position:absolute;right:12px;top:12px;display:flex;background:var(--c-paper);border:1px solid var(--c-line);border-radius:9px;padding:3px">' + [['3d', '3D · show'], ['top', 'Top · edit']].map(function (c) { var on = (c[0] === 'top') === st.top; return '<button type="button" data-a="cam" data-v="' + c[0] + '" aria-pressed="' + on + '" style="min-height:34px;padding:0 12px;border:none;border-radius:7px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + c[1] + '</button>'; }).join('') + '</div>' + (H ? '' : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--c-ink2);pointer-events:none">3D view loading…</div>');
        q('.nm-strip').innerHTML = '<button type="button" data-a="play" aria-label="Play the day" style="min-width:44px;min-height:44px;border-radius:22px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">' + (st.playing ? '❚❚' : '▶') + '</button><b style="font-size:13px;font-weight:600;min-width:46px">' + (h < 10 ? '0' : '') + h + ':00</b><input type="range" min="0" max="23" step="1" value="' + h + '" data-in="hour" aria-label="Hour of the day" style="width:220px;accent-color:var(--c-sel)">' +
          '<span style="font-size:13px">Panels <b style="color:var(--c-sunText)">' + R.pv[h].toFixed(1) + ' kW</b></span><span style="font-size:13px">Home <b>' + R.load[h].toFixed(1) + ' kW</b></span><span style="font-size:13px">Battery <b style="color:var(--c-battery)">' + (st.bat ? Math.round(R.socs[h] * 100) + '%' : '—') + '</b></span><span style="font-size:13px">Grid <b>' + (R.imp[h] > 0.05 ? 'in ' + R.imp[h].toFixed(1) + ' kW' : R.exp[h] > 0.05 ? 'out ' + R.exp[h].toFixed(1) + ' kW' : '0 kW') + '</b></span>';
        if (H) { H.setPanels(st.solar ? FN.layout('portrait') : []); H.bat.visible = st.bat; H.car.visible = st.ev; H.hp.visible = st.hp; H.setHour(h); H.useTop = st.top; }
      }
      FN.wire(el, function (a, v) {
        if (a === 'toggle') st[v] = !st[v];
        else if (a === 'hour') st.hour = +v;
        else if (a === 'cam') st.top = v === 'top';
        else if (a === 'play') { if (timer) { clearInterval(timer); timer = null; st.playing = false; } else { st.playing = true; timer = setInterval(function () { st.hour = (st.hour + 1) % 24; render(); }, 650); } }
        render();
      });
      render();
      FN.three(q('.nm-canvas'), function (h3) { H = h3; H.size(784, 520); H.radius = 40; H.place(); render(); });
    });
  });

  /* the installer studio at the Standard level (design/editor-tools) */
  all('figure.bk-widget[data-widget="studio"]').forEach(function (fig) {
    FN.when(fig, function () {
      var el = FN.frame(fig, 1180, 820), H = null, t3 = null, tChip = null, tToast = null;
      var HOME = { tools: [12, 60], notes: [1108, 60], read: [84, 60], changes: [826, 132], coach: [84, 590], v3: [768, 556] };
      var st = { level: 1, mode: 1, tool: 'select', selFace: false, preview: false, filled: false, variant: 'portrait', chimney: false, chimH: '1.00', pad: false, fresh: true, removed: [], bat: 13.5,
        sheet: false, present: false, imagery: true, shade: true, hist: [], log: [], touches: [0, 0, 0, 0, 0], task: 0, toast: '', busy: false, chip: null, hover: null, notif: false, settings: false,
        pos: JSON.parse(JSON.stringify(HOME)), swapped: false, hour3: 9 };
      el.innerHTML = '<div class="sd-root" style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden;user-select:none">' +
        '<div class="sd-top"></div><div class="sd-plan" style="position:absolute;left:0;top:48px;width:1180px;height:772px"></div>' +
        '<div class="sd-3d" style="position:absolute;overflow:hidden;background:var(--c-canvas)"><canvas class="sd-canvas" width="1180" height="772" aria-label="The roof in 3D, mirroring the plan: drag to turn" style="width:100%;height:100%;display:block;touch-action:none;cursor:grab"></canvas></div>' +
        '<div class="sd-ui"></div></div>';
      var q = function (c) { return el.querySelector(c); };
      function inter(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
      function mods(s) {
        var hc = parseFloat(s.chimH) || 0, keep = { x: 496, y: 174, w: 48, h: 48 }, shadow = { x: 502, y: 210, w: 30, h: hc * 64 };
        return FN.layout(s.variant).map(function (m) { var bl = s.chimney && inter(m, keep); return { id: m.id, x: m.x, y: m.y, w: m.w, h: m.h, blocked: bl, removed: s.removed.indexOf(m.id) >= 0, shaded: s.chimney && !bl && inter(m, shadow) }; });
      }
      function energy(s) {
        if (!s.filled) return { n: 0, kwp: 0, kwh: 0, save: 0, eff: 0 };
        var M = mods(s).filter(function (m) { return !m.blocked && !m.removed; }), n = M.length, loss = M.reduce(function (a, m) { return a + (m.shaded ? 0.15 : 0); }, 0), eff = (n - loss) * 0.44;
        return { n: n, kwp: n * 0.44, kwh: eff * 1460, eff: eff, save: FN.TODAY() - FN.sim({ plan: 'best', kwp: eff, cap: s.bat, ev: true }).total };
      }
      function touch() { if (st.task < 5) st.touches[st.task]++; }
      function check() {
        var k = st.task, ok = [st.filled, st.chimney && parseFloat(st.chimH) === 1.2 && !st.pad, st.removed.length > 0, st.bat !== 13.5, st.present][k];
        if (ok) st.task++;
      }
      function commit(patch, label, chip) {
        var before = energy(st), next = {}; for (var k in st) next[k] = st[k]; for (k in patch) next[k] = patch[k];
        var after = energy(next), dk = after.kwh - before.kwh, dm = after.save - before.save;
        st.hist.push({ snap: JSON.stringify({ filled: st.filled, variant: st.variant, chimney: st.chimney, chimH: st.chimH, removed: st.removed, bat: st.bat }), label: label });
        st.log.unshift({ label: label, delta: (dk >= 0 ? '+' : '−') + FN.n(Math.abs(dk)) + ' kWh/yr · ' + after.n + ' modules', money: (dm >= 0 ? '+' : '−') + FN.money(dm) + '/yr', color: Math.abs(dm) < 1 ? 'var(--c-muted)' : dm > 0 ? 'var(--c-gain)' : 'var(--c-loss)' });
        st.log = st.log.slice(0, 5);
        for (k in patch) st[k] = patch[k];
        st.chip = chip || null; st.busy = true; touch(); check(); render();
        clearTimeout(t3); t3 = setTimeout(function () { st.busy = false; render(); }, 300);
        clearTimeout(tChip); tChip = setTimeout(function () { st.chip = null; render(); }, 2600);
      }
      var TIPS = {
        select: ['Select', 'V', ['Tap a face, a module or an obstacle.', 'Its card opens on the right; actions above.', 'Tap again on overlaps to cycle.'], '1 touch'],
        trace: ['Trace', 'P', ['Tap each corner; snaps show before you touch.', 'Type a length while placing: 2.4, Tab, angle.', 'Tap the first point to close.'], 'n corners + 2'],
        rect3: ['Rectangle from three points', 'R', ['Tap corner A.', 'Tap corner B: the first edge.', 'Tap the opposite side: it closes.'], '4 touches'],
        fill: ['Fill zone', 'F', ['Tap a face: ghost modules appear.', 'Pick portrait, landscape or mixed.', 'Tap ✓ Keep.'], '3 touches'],
        panel: ['Modules', 'G', ['Tap a module to remove it.', 'Tap a free cell to add one.', 'Each change shows what it gains or costs.'], '2 touches'],
        chimney: ['Obstacle', 'O · 1–6', ['Tap where it stands, or drag its footprint.', 'Type its height: shade and loss update.', 'The tool stays on for the next one.'], '2 touches + 1 typed'],
        measure: ['Measure', 'M', ['Tap point A.', 'Tap point B.', 'Read plan and true length; keep it as a dimension.'], '3 touches'],
        dimension: ['Dimension', 'D', ['Tap a first vertex.', 'Tap a second vertex.', 'It follows when the face is corrected.'], '3 touches'],
        note: ['Note', 'N', ['Long press a point.', 'Choose Note here.', 'Type; the note stays tied to that point.'], '2 touches + text'],
        photo: ['Photo', 'I', ['Long press a point.', 'Photo here.', 'Shoot; time and position accuracy are kept.'], '3 touches'],
        layers: ['Layers', 'L', ['Open the layers.', 'Tap an eye to show or hide.', 'Long press to lock a layer.'], '2 touches']
      };
      function top() {
        var btn = function (a, label, svg, on, color) { return '<button type="button" data-a="' + a + '" aria-label="' + label + '" style="width:40px;height:40px;border:none;border-radius:8px;background:' + (on ? 'var(--c-line2)' : 'transparent') + ';color:' + (color || 'var(--c-ink)') + ';cursor:pointer;position:relative">' + svg + '</button>'; };
        var ico = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>'; };
        var sep = '<span style="width:1px;height:24px;background:var(--c-line);margin:0 4px"></span>';
        return FN.topbar(['Sites', '14 Wattle Lane, Marrickville', 'Design v1'], ['Roof', 'Layout', 'Battery', 'Proposal'].map(function (l, i) { return FN.tab(l, i === st.mode, 'mode', i); }).join(''),
          '<span style="font-size:12px;color:var(--c-gain);display:flex;align-items:center;gap:5px;padding:0 6px"><span style="width:7px;height:7px;border-radius:4px;background:var(--c-gain)"></span>Synced 14:02</span>' + sep +
          btn('undo', 'Undo', ico('M8.5 6.5L4.5 10.5l4 4M4.5 10.5h9a5.5 5.5 0 0 1 0 11H11'), false, st.hist.length ? 'var(--c-ink)' : 'var(--c-faint)') + btn('redo', 'Redo', ico('M15.5 6.5l4 4-4 4M19.5 10.5h-9a5.5 5.5 0 0 0 0 11H13'), false, 'var(--c-faint)') + sep +
          btn('notif', 'Notifications, 3 new', ico('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0') + '<span style="position:absolute;top:7px;right:7px;width:15px;height:15px;border-radius:8px;background:var(--c-loss);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">3</span>', st.notif) +
          btn('settings', 'View settings', ico('M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4'), st.settings) + btn('help', 'Help', ico('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2')) +
          '<span style="width:30px;height:30px;border-radius:15px;background:var(--c-ink);color:var(--c-paper);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;margin:0 4px">I1</span><button type="button" data-a="present" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:13px;font-weight:600;cursor:pointer">Present</button>');
      }
      function plan() {
        var M = mods(st), hc = parseFloat(st.chimH) || 0, len = hc * 64, o = '<svg width="1180" height="772" viewBox="0 0 1180 772" role="img" aria-label="Top view of the hip roof">' + (st.imagery ? '<path d="M0 0 H1180 V772 H0 Z" fill="var(--c-canvas)"></path><path d="M0 690 H1180 V740 H0 Z" fill="var(--c-line)" opacity=".5"></path>' : '<path d="M0 0 H1180 V772 H0 Z" fill="var(--c-ground)"></path>') + '<g transform="translate(30 100)">';
        o += ['S', 'W', 'E', 'N'].map(function (k) { var sel = k === 'N' && (st.selFace || st.preview); return '<path data-a="face" data-v="' + k + '" d="' + FN.FACES[k] + '" fill="' + (k === 'N' ? '#CFC9BF' : k === 'S' ? '#C2BBB0' : '#C8C2B7') + '" stroke="' + (sel ? 'var(--c-sel)' : '#9C958A') + '" stroke-width="' + (sel ? 2 : 1) + '" style="cursor:pointer"></path>'; }).join('');
        if (st.filled || st.preview) o += '<path d="M234 172 L802 172 L656 340 L380 340 Z" fill="none" stroke="var(--c-sel)" stroke-dasharray="5 5"></path>';
        if (st.chimney && st.shade && hc > 0.3) o += '<path d="M508 210 L532 210 L526 ' + (210 + len) + ' L502 ' + (210 + len) + ' Z" fill="#1D2026" opacity=".16"></path>';
        if (st.filled || st.preview) M.forEach(function (m) { if (m.blocked) return; var g = st.preview && !st.filled; o += '<rect data-a="mod" data-v="' + m.id + '" x="' + m.x.toFixed(1) + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="' + (m.removed ? 'none' : g ? 'var(--c-selSoft)' : m.shaded && st.shade ? '#46525E' : '#2B3A4A') + '" stroke="' + (m.removed ? 'var(--c-loss)' : g ? 'var(--c-sel)' : '#55667A') + '" stroke-dasharray="' + (m.removed || g ? '4 3' : 'none') + '" style="cursor:pointer"></rect>'; });
        if (st.chimney) o += '<rect x="496" y="174" width="48" height="48" fill="none" stroke="var(--c-loss)" stroke-dasharray="3 4"></rect><rect data-a="pad" x="508" y="186" width="24" height="24" fill="#8C7462" stroke="#5E4B3E" style="cursor:pointer"></rect>';
        return o + '<path d="M368 356 L668 356" stroke="#8F887C" stroke-width="1.5"></path></g><circle cx="1050" cy="716" r="20" fill="var(--c-paper)" stroke="var(--c-line)"></circle><path d="M1050 702 L1055 718 L1050 715 L1045 718 Z" fill="var(--c-ink)"></path></svg>';
      }
      function grip(key, vertical) { return '<div data-grip="' + key + '" title="Drag to move · double tap to dock" style="' + (vertical ? 'width:16px;border-right:1px solid var(--c-line2)' : 'height:16px;width:100%') + ';cursor:grab;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="' + (vertical ? 'width:3px;height:18px' : 'width:18px;height:3px') + ';border-radius:2px;background:var(--c-grip)"></span></div>'; }
      function rail(key, list) {
        var p = st.pos[key];
        return '<div style="position:absolute;left:' + p[0] + 'px;top:' + p[1] + 'px;width:60px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);padding:4px 0 8px;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:4" role="toolbar">' + grip(key) + list.map(function (t, i) {
          var on = t === 'layers' ? st.settings : st.tool === t;
          return '<button type="button" data-a="tool" data-v="' + t + '" data-tip="' + t + '|' + key + '|' + i + '" aria-label="' + TIPS[t][0] + '" aria-pressed="' + on + '" style="width:48px;height:48px;border:none;border-radius:11px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;align-items:center;justify-content:center;cursor:pointer">' + FN.icon(t === 'layers' ? 'layers' : t) + '</button>';
        }).join('') + '</div>';
      }
      function ui() {
        var E = energy(st), o = '', P = st.pos, left = ['select', 'trace', 'rect3', 'fill', 'panel', 'chimney', 'measure'], right = ['dimension', 'note', 'photo', 'layers'];
        if (st.level === 0) { left = ['select', 'fill', 'panel', 'chimney']; right = ['layers']; }
        o += rail('tools', left) + rail('notes', right);
        var c = st.chip; if (c && !st.pad) o += '<div style="position:absolute;left:' + c.x + 'px;top:' + c.y + 'px;' + FN.card + ';padding:7px 10px;font-size:12px;display:flex;gap:8px;z-index:3;pointer-events:none;box-shadow:0 6px 18px rgba(29,32,38,.12)"><span style="width:3px;border-radius:2px;background:' + c.c + '"></span><span><b style="color:' + c.c + '">' + c.t + '</b><br><span style="color:var(--c-ink2)">' + c.b + '</span></span></div>';
        var kp = [['Modules', st.filled ? '' + E.n : '—'], ['Power', st.filled ? E.kwp.toFixed(2) + ' kWp' : '—'], ['Yield', st.filled ? FN.n(E.kwh) + ' kWh/yr' : '—']];
        o += '<div style="position:absolute;left:' + P.read[0] + 'px;top:' + P.read[1] + 'px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);display:flex;align-items:stretch;z-index:4">' + grip('read', true) +
          '<div style="padding:10px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2);min-width:168px"><span style="' + FN.kick + '">Saves a year</span><b style="font-size:22px;font-weight:600;color:' + (st.busy || !st.filled ? 'var(--c-faint)' : 'var(--c-gain)') + '">' + (st.filled ? FN.money(E.save * 0.85) + '–' + FN.money(E.save * 1.1) : '—') + '</b></div>' +
          kp.map(function (k) { return '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--c-line2)"><span style="' + FN.kick + '">' + k[0] + '</span><b style="font-size:16px;font-weight:600;color:' + (st.busy ? 'var(--c-faint)' : 'var(--c-ink)') + '">' + k[1] + '</b></div>'; }).join('') +
          '<button type="button" data-a="sheet" style="border:none;background:transparent;padding:10px 14px;display:flex;flex-direction:column;gap:2px;text-align:left;font:inherit;color:var(--c-ink);cursor:pointer"><span style="' + FN.kick + '">Battery ▸</span><b style="font-size:16px;font-weight:600;color:var(--c-battery)">' + (st.bat ? st.bat + ' kWh' : 'none') + '</b></button><span style="align-self:center;font-size:11px;color:var(--c-muted);padding:0 12px 0 4px;display:flex;gap:6px;align-items:center">' + (st.busy ? '<span style="width:6px;height:6px;border-radius:3px;background:var(--c-live)"></span>computing…' : st.filled ? 'API · 0.3 s' : 'fill a face') + '</span></div>';
        var ctx = [];
        if (st.preview && !st.filled) { ctx = ['portrait', 'landscape', 'mixed'].map(function (v) { return [v.charAt(0).toUpperCase() + v.slice(1), 'variant', v, st.variant === v]; }); ctx.push(['✓ Keep', 'keep', '', 'k']); }
        else if (st.selFace) ctx = [['Edit vertices', 'noop', '', false], ['Setbacks', 'noop', '', false], ['Delete', 'noop', '', false]];
        if (ctx.length) o += '<div style="position:absolute;left:' + P.read[0] + 'px;top:' + (P.read[1] + 70) + 'px;display:flex;align-items:center;gap:4px;' + FN.card + ';padding:4px;box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4"><span style="font-size:12px;color:var(--c-muted);padding:0 8px">North face</span>' + ctx.map(function (x) { var k = x[3] === 'k'; return '<button type="button" data-a="' + x[1] + '" data-v="' + x[2] + '" style="min-height:40px;padding:0 12px;border-radius:8px;border:1px solid ' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (k ? 'var(--c-paper)' : x[3] ? 'var(--c-sel)' : x[0] === 'Delete' ? 'var(--c-loss)' : 'var(--c-ink)') + ';font:inherit;font-size:13px;cursor:pointer">' + x[0] + '</button>'; }).join('') + '</div>';
        if (st.hover) { var tp = TIPS[st.hover.k]; o += '<div style="position:absolute;left:' + st.hover.x + 'px;top:' + st.hover.y + 'px;width:260px;background:var(--c-tip);color:var(--c-paper);border-radius:12px;padding:12px;box-shadow:0 10px 28px rgba(29,32,38,.25);display:flex;flex-direction:column;gap:6px;z-index:6;pointer-events:none"><span style="display:flex;justify-content:space-between"><b style="font-size:14px">' + tp[0] + '</b><span style="font-size:11px;border:1px solid currentColor;opacity:.7;border-radius:4px;padding:1px 5px">' + tp[1] + '</span></span>' + tp[2].map(function (s, i) { return '<span style="font-size:12px;line-height:1.45;opacity:.9">' + (i + 1) + ' · ' + s + '</span>'; }).join('') + '<span style="font-size:11px;opacity:.75">' + tp[3] + '</span></div>'; }
        o += '<div style="position:absolute;left:' + P.changes[0] + 'px;top:' + P.changes[1] + 'px;width:270px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="changes" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">Changes</b><span style="font-size:11px;color:var(--c-muted)">' + (st.log.length ? st.log.length + ' recent' : 'none yet') + '</span></div>' +
          (st.log.length ? st.log.map(function (l) { return '<div style="display:flex;gap:10px;padding:9px 12px;border-bottom:1px solid var(--c-line2);font-size:12px"><span style="width:3px;border-radius:2px;background:' + l.color + '"></span><span style="flex:1"><b style="font-weight:600">' + l.label + '</b><br><span style="color:var(--c-ink2)">' + l.delta + '</span></span><b style="color:' + l.color + ';font-weight:600;white-space:nowrap">' + l.money + '</b></div>'; }).join('') : '<span style="display:block;padding:12px;font-size:12px;color:var(--c-muted);line-height:1.5">Each edit lands here with what it gains or costs. Undo walks back through it.</span>') + '</div>';
        var v = P.v3;
        o += '<div style="position:absolute;left:' + v[0] + 'px;top:' + v[1] + 'px;width:330px;height:252px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.12);z-index:4;overflow:hidden"><div data-grip="v3" style="height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">' + (st.swapped ? 'Plan · editing stays here' : '3D · mirrors the plan') + '</b><span style="display:flex;gap:4px">' +
          [[9, '9 am'], [12, 'noon'], [15, '3 pm']].map(function (x) { var on = st.hour3 === x[0]; return '<button type="button" data-a="hour3" data-v="' + x[0] + '" style="min-height:28px;padding:0 7px;border-radius:6px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:11px;cursor:pointer">' + x[1] + '</button>'; }).join('') +
          '<button type="button" data-a="swap" aria-label="Swap the 3D view and the plan" style="width:32px;height:28px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">⇄</button></span></div>' +
          (st.swapped ? '<svg width="330" height="212" viewBox="200 140 640 420" aria-hidden="true">' + ['S', 'W', 'E', 'N'].map(function (k) { return '<path d="' + FN.FACES[k] + '" fill="#C8C2B7" stroke="#9C958A" stroke-width="2"></path>'; }).join('') + mods(st).filter(function (m) { return st.filled && !m.blocked && !m.removed; }).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" fill="#2B3A4A"></rect>'; }).join('') + '</svg>' : '') + (H ? '' : '<div style="height:212px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--c-ink2)">3D loading…</div>') + '</div>';
        if (st.swapped) o += '<span style="position:absolute;left:92px;bottom:14px;font-size:12px;padding:5px 9px;border-radius:7px;background:var(--c-paper);border:1px solid var(--c-line);color:var(--c-ink2);z-index:3">3D checks · editing stays on the plan · ⇄ to swap back</span>';
        if (st.pad) o += '<div style="position:absolute;left:600px;top:200px;width:210px;' + FN.card + ';border-color:var(--c-sel);padding:10px;box-shadow:0 10px 28px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:8px;z-index:6"><span style="font-size:12px;color:var(--c-muted)">Chimney height above the roof</span><b style="font-size:22px;font-weight:600;color:var(--c-sel);border-bottom:1.5px solid var(--c-sel)">' + st.chimH + ' m</b><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px">' +
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '✓'].map(function (k) { var ok = k === '✓'; return '<button type="button" data-a="key" data-v="' + k + '" style="min-height:44px;border-radius:8px;border:1px solid var(--c-line);background:' + (ok ? 'var(--c-ink)' : 'var(--c-paper2)') + ';color:' + (ok ? 'var(--c-paper)' : 'var(--c-ink)') + ';font:inherit;font-size:16px;cursor:pointer">' + k + '</button>'; }).join('') + '</div></div>';
        var TD = [['Fill the north face', 3], ['Chimney at 1.20 m', 6], ['Remove a module', 2], ['Try another battery', 2], ['Present', 1]];
        var hints = ['Hover a tool for its tutorial. Fill zone, the north face, ✓ Keep.', 'Obstacle, tap the face, 1 . 2 on the pad, ✓.', 'Modules, then tap any module.', 'Battery ▸ in the reading card, pick a size.', 'Present, top right.', 'Done. Drag any card or bar by its grip; settings reset the layout.'];
        o += '<div style="position:absolute;left:' + P.coach[0] + 'px;top:' + P.coach[1] + 'px;width:290px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="coach" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">Demos · touches counted</b><span style="font-size:11px;color:var(--c-muted)">catalogue §6</span></div><div style="padding:6px 8px;display:flex;flex-direction:column;gap:2px">' +
          TD.map(function (t, k) { var cur = k === st.task, dn = k < st.task, u = st.touches[k]; return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 6px;border-radius:6px;background:' + (cur ? 'var(--c-selSoft)' : 'transparent') + '"><span style="color:' + (dn ? 'var(--c-gain)' : 'var(--c-ink)') + ';font-weight:' + (cur ? 600 : 400) + '">' + (dn ? '✓ ' : '') + t[0] + '</span><span style="color:' + (u > t[1] ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + (dn || cur ? u + ' / ' : '') + t[1] + '</span></div>'; }).join('') + '<span style="font-size:11px;color:var(--c-muted);padding:4px 6px">' + hints[Math.min(st.task, 5)] + '</span></div></div>';
        if (st.notif) o += '<div style="position:absolute;right:120px;top:52px;width:320px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;overflow:hidden"><b style="display:block;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--c-line2)">Notifications</b>' + [['Rebate steps down on 1 January', '2 quotes in flight need re-pricing.', 'var(--c-sun)'], ['Survey photos arrived', '12 photos from the phone, attached to this site.', 'var(--c-sel)'], ['Household opened proposal v0', 'Unit 4, 22 Ash Street, yesterday 19:40.', 'var(--c-muted)']].map(function (n) { return '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--c-line2);font-size:12px;line-height:1.45"><span style="width:3px;border-radius:2px;background:' + n[2] + '"></span><span><b style="font-weight:600">' + n[0] + '</b><br><span style="color:var(--c-ink2)">' + n[1] + '</span></span></div>'; }).join('') + '</div>';
        if (st.settings) o += '<div style="position:absolute;right:80px;top:52px;width:280px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;padding:12px;display:flex;flex-direction:column;gap:10px"><b style="font-size:12px;font-weight:600">View settings</b><span style="font-size:12px;color:var(--c-muted)">Disclosure level</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px">' + ['Guided', 'Standard', 'Expert'].map(function (l, k) { return '<button type="button" data-a="level" data-v="' + k + '" style="flex:1;min-height:36px;border:none;border-radius:6px;background:' + (k === st.level ? 'var(--c-paper)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + l + '</button>'; }).join('') + '</div>' +
          [['Imagery · Mar 2026', 'imagery'], ['Shade, 9 am in June', 'shade']].map(function (r) { return '<button type="button" data-a="layer" data-v="' + r[1] + '" style="min-height:40px;display:flex;justify-content:space-between;align-items:center;border:none;background:transparent;color:var(--c-ink);font:inherit;font-size:13px;padding:0;cursor:pointer"><span>' + r[0] + '</span><span style="font-size:12px;color:' + (st[r[1]] ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (st[r[1]] ? 'shown' : 'hidden') + '</span></button>'; }).join('') + '<button type="button" data-a="reset" style="min-height:40px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:13px;cursor:pointer">Reset panels to the F layout</button></div>';
        if (st.toast) o += '<div style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:9px 14px;border-radius:10px;z-index:8">' + st.toast + '</div>';
        if (st.sheet) { var sizes = [0, 10, 13.5, 20, 28]; o += '<div style="position:absolute;left:92px;right:92px;bottom:16px;' + FN.card + ';border-radius:16px;padding:14px 16px;box-shadow:0 14px 36px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:10px;z-index:7"><div style="display:flex;justify-content:space-between"><b style="font-size:14px;font-weight:600">Battery what-if · open-energy</b><span style="font-size:12px;color:var(--c-muted)">Rebate tiers 14 · 28 · 50 kWh · export limit 5 kW</span></div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">' +
          sizes.map(function (s, i) { var sv = FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: s, ev: true }).total, pv0 = i ? FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: sizes[i - 1], ev: true }).total : 0, on = st.bat === s, reb = s ? FN.rebate(s) : 0;
            return '<button type="button" data-a="bat" data-v="' + s + '" aria-pressed="' + on + '" style="min-height:108px;border-radius:12px;border:1px solid ' + (on ? 'var(--c-battery)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-batterySoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:8px 10px;text-align:left;display:flex;flex-direction:column;gap:3px;font:inherit;cursor:pointer"><b style="font-size:15px;font-weight:600">' + (s ? s + ' kWh' : 'None') + '</b><span style="font-size:12px;color:var(--c-muted)">rebate ' + FN.money(reb) + ' · net ' + FN.money(s ? 1100 + 790 * s - reb : 0) + '</span><b style="font-size:13px;font-weight:600;color:var(--c-gain)">saves ' + FN.money(sv) + '/yr</b><span style="font-size:12px;color:' + (s > 14 ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + (i ? '+' + FN.money((sv - pv0) / (s - sizes[i - 1])) + '/yr per kWh' : '—') + '</span></button>'; }).join('') +
          '</div><span style="font-size:12px;color:var(--c-muted)">Past 14 kWh each kWh earns less: the rebate drops to 60 % and the evenings use about 9 kWh.</span></div>'; }
        if (st.present) { var vs = ['mixed', 'portrait', 'landscape'].map(function (vv) { var s2 = {}; for (var k in st) s2[k] = st[k]; s2.variant = vv; s2.removed = []; s2.filled = true; return { v: vv, e: energy(s2) }; }).sort(function (a5, b5) { return b5.e.save - a5.e.save; });
          o += '<div style="position:absolute;inset:0;background:var(--c-ground);display:flex;flex-direction:column;z-index:9"><div style="height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--c-paper);border-bottom:1px solid var(--c-line)"><b style="font-size:14px;font-weight:600">Your home · 14 Wattle Lane</b><button type="button" data-a="unpresent" style="min-height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Back to design</button></div><div style="flex:1;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;padding:20px">' +
            '<div style="' + FN.card + ';border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px"><span style="font-size:13px;color:var(--c-muted)">Three layouts, ranked on your own bill</span>' + vs.map(function (x) { var on = st.variant === x.v; return '<button type="button" data-a="pvariant" data-v="' + x.v + '" style="min-height:72px;border-radius:12px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:10px 14px;text-align:left;display:flex;justify-content:space-between;align-items:center;font:inherit;cursor:pointer"><span><b style="font-size:15px;font-weight:600">' + x.v.charAt(0).toUpperCase() + x.v.slice(1) + ' · ' + x.e.n + ' modules</b><br><span style="font-size:12px;color:var(--c-muted)">' + x.e.kwp.toFixed(2) + ' kWp · ' + FN.n(x.e.kwh) + ' kWh/yr</span></span><b style="font-size:15px;font-weight:600;color:var(--c-gain)">' + FN.money(x.e.save * 0.85) + '–' + FN.money(x.e.save * 1.1) + '</b></button>'; }).join('') + '</div>' +
            '<div style="' + FN.card + ';border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;color:var(--c-muted)">You save, a year</span><b style="font-size:38px;font-weight:600;color:var(--c-gain)">' + (st.filled ? FN.money(E.save * 0.85) + '–' + FN.money(E.save * 1.1) : '—') + '</b><span style="font-size:13px;color:var(--c-ink2)">With ' + E.kwp.toFixed(2) + ' kWp and a ' + (st.bat ? st.bat + ' kWh' : 'no') + ' battery.</span><b style="font-size:13px;font-weight:600;margin-top:8px">What it depends on</b><span style="font-size:13px;color:var(--c-ink2)">Sunshine year to year ±8 % · evening use ±10 % · plan prices · ' + (st.chimney ? mods(st).filter(function (m) { return m.shaded; }).length + ' modules in the chimney’s winter shade' : 'no obstacle drawn') + '</span><span style="font-size:11px;color:var(--c-muted);margin-top:auto">Indicative estimate. The signed proposal freezes these numbers with the engine version.</span></div></div></div>'; }
        return o;
      }
      function place3d() {
        var b = q('.sd-3d'), v = st.pos.v3;
        if (st.swapped) b.setAttribute('style', 'position:absolute;left:0;top:48px;width:1180px;height:772px;z-index:2;overflow:hidden;background:var(--c-canvas)');
        else b.setAttribute('style', 'position:absolute;left:' + (v[0] + 1) + 'px;top:' + (v[1] + 41) + 'px;width:328px;height:210px;z-index:5;overflow:hidden;background:var(--c-canvas)');
        if (H) { H.size(st.swapped ? 1180 : 328, st.swapped ? 772 : 210); H.radius = st.swapped ? 34 : 38; H.place();
          H.setPanels(st.filled ? mods(st).filter(function (m) { return !m.blocked && !m.removed; }).map(function (m) { return { x: m.x, y: m.y, w: m.w, h: m.h, shaded: m.shaded && st.shade }; }) : []);
          H.setChimney(st.chimney, parseFloat(st.chimH) || 1); H.bat.visible = st.bat > 0; H.setHour(st.hour3); }
      }
      function render() { q('.sd-top').innerHTML = top(); q('.sd-plan').innerHTML = plan(); q('.sd-ui').innerHTML = ui(); place3d(); }
      // dragging bars and cards by their grip, in screen pixels whatever the scale
      var drag = null;
      el.addEventListener('pointerdown', function (e) { var g = e.target.closest('[data-grip]'); if (!g) return; var k = g.getAttribute('data-grip'), s = el.getBoundingClientRect().width / 1180; drag = { k: k, x: e.clientX, y: e.clientY, o: st.pos[k].slice(), s: s }; e.preventDefault(); });
      window.addEventListener('pointermove', function (e) { if (!drag) return; st.pos[drag.k] = [Math.max(0, Math.min(1120, drag.o[0] + (e.clientX - drag.x) / drag.s)), Math.max(48, Math.min(780, drag.o[1] + (e.clientY - drag.y) / drag.s))]; q('.sd-ui').innerHTML = ui(); place3d(); });
      window.addEventListener('pointerup', function () { drag = null; });
      el.addEventListener('dblclick', function (e) { var g = e.target.closest('[data-grip]'); if (!g) return; var k = g.getAttribute('data-grip'); if (k === 'v3') st.swapped = !st.swapped; else st.pos[k] = HOME[k].slice(); render(); });
      el.addEventListener('pointerover', function (e) { var b = e.target.closest('[data-tip]'); if (!b) return; var p = b.getAttribute('data-tip').split('|'), base = st.pos[p[1]], nx = p[1] === 'notes' ? base[0] - 272 : base[0] + 70; if (!st.hover || st.hover.k !== p[0]) { st.hover = { k: p[0], x: nx, y: base[1] + 16 + (+p[2]) * 50 }; q('.sd-ui').innerHTML = ui(); } });
      el.addEventListener('pointerout', function (e) { var b = e.target.closest('[data-tip]'); if (b && !b.contains(e.relatedTarget)) { st.hover = null; q('.sd-ui').innerHTML = ui(); } });
      FN.wire(el, function (a, v) {
        if (a === 'tool') { touch(); if (v === 'layers') st.settings = !st.settings; else { st.tool = v; st.preview = false; st.selFace = false; st.pad = false; } st.hover = null; check(); }
        else if (a === 'face') { if (v !== 'N') return; if (st.tool === 'chimney' && !st.chimney) { commit({ chimney: true, pad: true, fresh: true }, 'Chimney added', { t: 'Chimney added', b: 'Type its height on the pad', c: 'var(--c-ink)', x: 560, y: 250 }); return; } touch(); if (st.tool === 'fill') st.preview = true; else if (st.tool === 'select') st.selFace = !st.selFace; check(); }
        else if (a === 'variant') { touch(); st.variant = v; }
        else if (a === 'keep') { commit({ filled: true, preview: false }, 'Zone filled · ' + st.variant, { t: 'Zone filled', b: 'Setbacks 0.40 m from eaves and hips', c: 'var(--c-gain)', x: 420, y: 250 }); return; }
        else if (a === 'mod') { if (st.tool !== 'panel' || !st.filled) return; var r = st.removed.slice(), i = r.indexOf(v), was = i >= 0; if (was) r.splice(i, 1); else r.push(v);
          var m = FN.layout(st.variant).filter(function (x) { return x.id === v; })[0]; commit({ removed: r }, was ? 'Module added' : 'Module removed', { t: was ? '+1 module' : '−1 module', b: (was ? '+' : '−') + '0.44 kWp', c: was ? 'var(--c-gain)' : 'var(--c-loss)', x: Math.round(m.x + 30 + m.w + 8), y: m.y + 148 }); return; }
        else if (a === 'pad') { touch(); st.pad = true; st.fresh = true; }
        else if (a === 'key') { if (v === '✓') { var hv = (parseFloat(st.chimH) || 1).toFixed(2); commit({ pad: false, chimH: hv }, 'Chimney height ' + hv + ' m', { t: 'Chimney ' + hv + ' m', b: 'Winter shade recomputed', c: 'var(--c-loss)', x: 560, y: 250 }); return; } touch(); st.chimH = ((st.fresh ? '' : st.chimH) + v).slice(0, 4); st.fresh = false; }
        else if (a === 'sheet') { touch(); st.sheet = !st.sheet; st.mode = 2; }
        else if (a === 'bat') { commit({ bat: +v }, 'Battery ' + (+v ? v + ' kWh' : 'removed')); return; }
        else if (a === 'mode') { st.mode = +v; st.sheet = +v === 2; }
        else if (a === 'present') { touch(); st.present = true; st.sheet = false; st.notif = false; st.settings = false; check(); }
        else if (a === 'unpresent') st.present = false;
        else if (a === 'pvariant') { st.variant = v; st.removed = []; }
        else if (a === 'notif') { st.notif = !st.notif; st.settings = false; }
        else if (a === 'settings') { st.settings = !st.settings; st.notif = false; }
        else if (a === 'level') st.level = +v;
        else if (a === 'layer') st[v] = !st[v];
        else if (a === 'reset') st.pos = JSON.parse(JSON.stringify(HOME));
        else if (a === 'hour3') st.hour3 = +v;
        else if (a === 'swap') st.swapped = !st.swapped;
        else if (a === 'undo') { if (!st.hist.length) return; var last = st.hist.pop(), sn = JSON.parse(last.snap); for (var k in sn) st[k] = sn[k]; st.log.shift(); st.toast = 'Undone: ' + last.label; st.chip = null; st.pad = false; st.preview = false; clearTimeout(tToast); tToast = setTimeout(function () { st.toast = ''; render(); }, 1600); }
        render();
      });
      render();
      FN.three(q('.sd-canvas'), function (h3) { H = h3; render(); });
    });
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
