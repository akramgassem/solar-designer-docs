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
  /* ---------- widgets: the funnel prototypes (design/funnels, design/editor-tools) ---------- */
  // Intention prototypes, not final screens. Each widget draws product screens at their real size
  // (an 1180 × 820 tablet), scaled to the page, with an Enlarge button; the journey is in 73-journey.js.
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
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
    doc.addEventListener('click', function (e) { if (!menu.hidden && !out.querySelector('.bk-fw-pal').contains(e.target)) open(false); });
    window.addEventListener('sd-palette', mark); mark();
  };

  /* the frame: a fixed-size screen scaled to the figure, with an Enlarge toggle */
  FN.frame = function (fig, w, h) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), fr = FN.isFr(fig);
    if (svg) svg.style.display = 'none';
    out.innerHTML = '<div class="bk-fw-bar"><span>' + (fr ? 'Prototype d’intention · écran du produit australien, en anglais' : 'Intention prototype · a screen of the Australian product') + '</span>' +
      '<span class="bk-fw-act">' + FN.paletteBar(fr) + '<button type="button" class="bk-fw-big">' + (fr ? 'Agrandir' : 'Enlarge') + '</button></span></div><div class="bk-fw"><div class="bk-fw-screen"></div></div>';
    var box = out.querySelector('.bk-fw'), screen = out.querySelector('.bk-fw-screen'), big = out.querySelector('.bk-fw-big');
    FN.wirePalette(out);
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

  /* the 3D house, shared by the household's next move and the studio's 3D card */
  FN.three = function (canvas, done) {
    var go = function () {
      var T = window.THREE, r = new T.WebGLRenderer({ canvas: canvas, antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.outputEncoding = T.sRGBEncoding;
      var C = FN.tokens(), sc = new T.Scene(); sc.background = new T.Color(C.sky);
      var mat = function (c, o) { var m = { color: c, roughness: 0.85 }; for (var k in (o || {})) m[k] = o[k]; return new T.MeshStandardMaterial(m); };
      var gnd = new T.Mesh(new T.PlaneGeometry(80, 80), mat(C.earth)); gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; sc.add(gnd);
      var drive = new T.Mesh(new T.PlaneGeometry(6, 14), mat(C.drive)); drive.rotation.x = -Math.PI / 2; drive.position.set(11, 0.01, 4); drive.receiveShadow = true; sc.add(drive);
      var walls = new T.Mesh(new T.BoxGeometry(15, 3, 10), mat(C.walls)); walls.position.y = 1.5; walls.castShadow = true; walls.receiveShadow = true; sc.add(walls);
      var ry = 3 + 5 * Math.tan(22 * Math.PI / 180), v = [[-7.5, 3, -5], [7.5, 3, -5], [3.75, ry, 0], [-3.75, ry, 0], [-7.5, 3, 5], [7.5, 3, 5]];
      var tri = function (a, b, d) { return v[a].concat(v[b], v[d]); };
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([].concat(tri(0, 2, 1), tri(0, 3, 2), tri(4, 5, 2), tri(4, 2, 3), tri(0, 4, 3), tri(1, 2, 5)), 3)); g.computeVertexNormals();
      var roof = new T.Mesh(g, mat(C.roof3, { side: T.DoubleSide })); roof.castShadow = true; roof.receiveShadow = true; sc.add(roof);
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
      var H = { gnd: gnd, drive: drive, walls: walls, roof: roof, hr: 15, T: T, r: r, scene: sc, cam: cam, top: top, useTop: false, theta: 0.75, radius: 40, panels: panels, bat: bat, car: car, hp: hp, chim: chim, sun: sun, hemi: hemi, w: 0, h: 0, dead: false };
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
        H.hr = hr; sc.background.set(up ? C.sky : '#3A3D45');
      };
      H.paint = function () { C = FN.tokens(); gnd.material.color.set(C.earth); drive.material.color.set(C.drive); walls.material.color.set(C.walls); roof.material.color.set(C.roof3); H.setHour(H.hr); };
      window.addEventListener('sd-palette', function () { if (!H.dead) H.paint(); });
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
    inverters: [{ kw: 5, name: '5 kW hybrid', price: 1650 }, { kw: 6, name: '6 kW hybrid', price: 1900 }, { kw: 8, name: '8 kW hybrid', price: 2600 }]
  };
  FN.studio = function (el, opts) {
    opts = opts || {};
    var J = !!opts.site, S = opts.site;
    (function () {
      var H = null, t3 = null, tChip = null, tToast = null;
      var HOME = { tools: [12, 60], notes: [1108, 60], read: [84, 60], changes: [826, 132], coach: [84, 590], v3: [768, 556] };
      var st = { level: 1, mode: 1, tool: 'select', selFace: false, preview: false, filled: false, variant: 'portrait', chimney: false, chimH: '1.00', pad: false, fresh: true, removed: [], bat: 13.5,
        sheet: false, present: false, imagery: true, shade: true, hist: [], log: [], touches: [0, 0, 0, 0, 0], task: 0, toast: '', busy: false, chip: null, hover: null, notif: false, settings: false, layers: false, mods: true,
        pos: JSON.parse(JSON.stringify(HOME)), swapped: false, hour3: 9, modW: 440, inv: 6, qs: 'cover', qseen: {}, qnotes: [] };
      // in the journey the studio starts on its inbox, and the household's draft (16 portrait modules) comes with the site
      if (J) { st.mode = -1; st.filled = true; st.bat = S.measures.bat ? 13.5 : 0; }
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
        var M = mods(s).filter(function (m) { return !m.blocked && !m.removed; }), n = M.length, loss = M.reduce(function (a, m) { return a + (m.shaded ? 0.15 : 0); }, 0), eff = (n - loss) * s.modW / 1000;
        return { n: n, kwp: n * s.modW / 1000, kwh: eff * 1460, eff: eff, save: FN.TODAY() - FN.sim({ plan: 'best', kwp: eff, cap: s.bat, ev: J ? S.measures.ev : true, hp: J && S.measures.hp }).total };
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
        return FN.topbar(J && !S.shared ? ['Sites', 'Inbox'] : ['Sites', '14 Wattle Lane, Marrickville', 'Design v1'], (J ? [['Inbox', -1], ['Roof', 0], ['Layout', 1], ['Equipment', 2], ['Proposal', 3]] : [['Roof', 0], ['Layout', 1], ['Equipment', 2], ['Proposal', 3]]).map(function (x) { return FN.tab(x[0] + (x[1] === -1 && J && S.shared && !S.opened ? ' · 1' : ''), x[1] === st.mode, 'mode', x[1]); }).join(''),
          '<span style="font-size:12px;color:var(--c-gain);display:flex;align-items:center;gap:5px;padding:0 6px"><span style="width:7px;height:7px;border-radius:4px;background:var(--c-gain)"></span>Synced 14:02</span>' + sep +
          btn('undo', 'Undo', ico('M8.5 6.5L4.5 10.5l4 4M4.5 10.5h9a5.5 5.5 0 0 1 0 11H11'), false, st.hist.length ? 'var(--c-ink)' : 'var(--c-faint)') + btn('redo', 'Redo', ico('M15.5 6.5l4 4-4 4M19.5 10.5h-9a5.5 5.5 0 0 0 0 11H13'), false, 'var(--c-faint)') + sep +
          btn('notif', 'Notifications, 3 new', ico('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0') + '<span style="position:absolute;top:7px;right:7px;width:15px;height:15px;border-radius:8px;background:var(--c-loss);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">3</span>', st.notif) +
          btn('settings', 'View settings', ico('M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4'), st.settings) + btn('help', 'Help', ico('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2')) +
          '<span style="width:30px;height:30px;border-radius:15px;background:var(--c-ink);color:var(--c-paper);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;margin:0 4px">I1</span><button type="button" data-a="present" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:13px;font-weight:600;cursor:pointer">Present</button>');
      }
      function plan() {
        var M = mods(st), hc = parseFloat(st.chimH) || 0, len = hc * 64, o = '<svg width="1180" height="772" viewBox="0 0 1180 772" role="img" aria-label="Top view of the hip roof">' + (st.imagery ? '<path d="M0 0 H1180 V772 H0 Z" fill="var(--c-canvas)"></path><path d="M0 690 H1180 V740 H0 Z" fill="var(--c-line)" opacity=".5"></path>' : '<path d="M0 0 H1180 V772 H0 Z" fill="var(--c-ground)"></path>') + '<g transform="translate(30 100)">';
        o += ['S', 'W', 'E', 'N'].map(function (k) { var sel = k === 'N' && (st.selFace || st.preview); return '<path data-a="face" data-v="' + k + '" d="' + FN.FACES[k] + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : k === 'S' ? 'var(--c-roofS)' : 'var(--c-roof)') + '" stroke="' + (sel ? 'var(--c-sel)' : 'var(--c-roofLine)') + '" stroke-width="' + (sel ? 2 : 1) + '" style="cursor:pointer"></path>'; }).join('');
        if (st.filled || st.preview) o += '<path d="M234 172 L802 172 L656 340 L380 340 Z" fill="none" stroke="var(--c-sel)" stroke-dasharray="5 5"></path>';
        if (st.chimney && st.shade && hc > 0.3) o += '<path d="M508 210 L532 210 L526 ' + (210 + len) + ' L502 ' + (210 + len) + ' Z" fill="#1D2026" opacity=".16"></path>';
        if ((st.filled || st.preview) && st.mods) M.forEach(function (m) { if (m.blocked) return; var g = st.preview && !st.filled; o += '<rect data-a="mod" data-v="' + m.id + '" x="' + m.x.toFixed(1) + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="' + (m.removed ? 'none' : g ? 'var(--c-selSoft)' : m.shaded && st.shade ? '#46525E' : '#2B3A4A') + '" stroke="' + (m.removed ? 'var(--c-loss)' : g ? 'var(--c-sel)' : '#55667A') + '" stroke-dasharray="' + (m.removed || g ? '4 3' : 'none') + '" style="cursor:pointer"></rect>'; });
        if (st.chimney) o += '<rect x="496" y="174" width="48" height="48" fill="none" stroke="var(--c-loss)" stroke-dasharray="3 4"></rect><rect data-a="pad" x="508" y="186" width="24" height="24" fill="#8C7462" stroke="#5E4B3E" style="cursor:pointer"></rect>';
        return o + '<path d="M368 356 L668 356" stroke="var(--c-ridge)" stroke-width="1.5"></path></g><circle cx="1050" cy="716" r="20" fill="var(--c-paper)" stroke="var(--c-line)"></circle><path d="M1050 702 L1055 718 L1050 715 L1045 718 Z" fill="var(--c-ink)"></path></svg>';
      }
      function grip(key, vertical) { return '<div data-grip="' + key + '" title="Drag to move · double tap to dock" style="' + (vertical ? 'width:16px;border-right:1px solid var(--c-line2)' : 'height:16px;width:100%') + ';cursor:grab;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="' + (vertical ? 'width:3px;height:18px' : 'width:18px;height:3px') + ';border-radius:2px;background:var(--c-grip)"></span></div>'; }
      function rail(key, list) {
        var p = st.pos[key];
        return '<div style="position:absolute;left:' + p[0] + 'px;top:' + p[1] + 'px;width:60px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);padding:4px 0 8px;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:4" role="toolbar">' + grip(key) + list.map(function (t, i) {
          var on = t === 'layers' ? st.layers : st.tool === t;
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
          '<button type="button" data-a="sheet" style="border:none;background:transparent;padding:10px 14px;display:flex;flex-direction:column;gap:2px;text-align:left;font:inherit;color:var(--c-ink);cursor:pointer"><span style="' + FN.kick + '">Equipment ▸</span><b style="font-size:14px;font-weight:600;color:var(--c-battery)">' + st.modW + ' W · ' + st.inv + ' kW · ' + (st.bat ? st.bat + ' kWh' : 'no battery') + '</b></button><span style="align-self:center;font-size:11px;color:var(--c-muted);padding:0 12px 0 4px;display:flex;gap:6px;align-items:center">' + (st.busy ? '<span style="width:6px;height:6px;border-radius:3px;background:var(--c-live)"></span>computing…' : st.filled ? 'API · 0.3 s' : 'fill a face') + '</span></div>';
        var ctx = [];
        if (st.preview && !st.filled) { ctx = ['portrait', 'landscape', 'mixed'].map(function (v) { return [v.charAt(0).toUpperCase() + v.slice(1), 'variant', v, st.variant === v]; }); ctx.push(['✓ Keep', 'keep', '', 'k']); }
        else if (st.selFace) ctx = [['Edit vertices', 'noop', '', false], ['Setbacks', 'noop', '', false], ['Delete', 'noop', '', false]];
        if (ctx.length) o += '<div style="position:absolute;left:' + P.read[0] + 'px;top:' + (P.read[1] + 70) + 'px;display:flex;align-items:center;gap:4px;' + FN.card + ';padding:4px;box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4"><span style="font-size:12px;color:var(--c-muted);padding:0 8px">North face</span>' + ctx.map(function (x) { var k = x[3] === 'k'; return '<button type="button" data-a="' + x[1] + '" data-v="' + x[2] + '" style="min-height:40px;padding:0 12px;border-radius:8px;border:1px solid ' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (k ? 'var(--c-ink)' : x[3] ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:' + (k ? 'var(--c-paper)' : x[3] ? 'var(--c-sel)' : x[0] === 'Delete' ? 'var(--c-loss)' : 'var(--c-ink)') + ';font:inherit;font-size:13px;cursor:pointer">' + x[0] + '</button>'; }).join('') + '</div>';
        if (st.hover && !st.layers && !st.settings) { var tp = TIPS[st.hover.k]; o += '<div style="position:absolute;left:' + st.hover.x + 'px;top:' + st.hover.y + 'px;width:260px;background:var(--c-tip);color:var(--c-paper);border-radius:12px;padding:12px;box-shadow:0 10px 28px rgba(29,32,38,.25);display:flex;flex-direction:column;gap:6px;z-index:6;pointer-events:none"><span style="display:flex;justify-content:space-between"><b style="font-size:14px">' + tp[0] + '</b><span style="font-size:11px;border:1px solid currentColor;opacity:.7;border-radius:4px;padding:1px 5px">' + tp[1] + '</span></span>' + tp[2].map(function (s, i) { return '<span style="font-size:12px;line-height:1.45;opacity:.9">' + (i + 1) + ' · ' + s + '</span>'; }).join('') + '<span style="font-size:11px;opacity:.75">' + tp[3] + '</span></div>'; }
        o += '<div style="position:absolute;left:' + P.changes[0] + 'px;top:' + P.changes[1] + 'px;width:270px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="changes" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">Changes</b><span style="font-size:11px;color:var(--c-muted)">' + (st.log.length ? st.log.length + ' recent' : 'none yet') + '</span></div>' +
          (st.log.length ? st.log.map(function (l) { return '<div style="display:flex;gap:10px;padding:9px 12px;border-bottom:1px solid var(--c-line2);font-size:12px"><span style="width:3px;border-radius:2px;background:' + l.color + '"></span><span style="flex:1"><b style="font-weight:600">' + l.label + '</b><br><span style="color:var(--c-ink2)">' + l.delta + '</span></span><b style="color:' + l.color + ';font-weight:600;white-space:nowrap">' + l.money + '</b></div>'; }).join('') : '<span style="display:block;padding:12px;font-size:12px;color:var(--c-muted);line-height:1.5">Each edit lands here with what it gains or costs. Undo walks back through it.</span>') + '</div>';
        var v = P.v3;
        o += '<div style="position:absolute;left:' + v[0] + 'px;top:' + v[1] + 'px;width:330px;height:252px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.12);z-index:4;overflow:hidden"><div data-grip="v3" style="height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">' + (st.swapped ? 'Plan · editing stays here' : '3D · mirrors the plan') + '</b><span style="display:flex;gap:4px">' +
          [[9, '9 am'], [12, 'noon'], [15, '3 pm']].map(function (x) { var on = st.hour3 === x[0]; return '<button type="button" data-a="hour3" data-v="' + x[0] + '" style="min-height:28px;padding:0 7px;border-radius:6px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:11px;cursor:pointer">' + x[1] + '</button>'; }).join('') +
          '<button type="button" data-a="swap" aria-label="Swap the 3D view and the plan" style="width:32px;height:28px;border-radius:6px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);cursor:pointer">⇄</button></span></div>' +
          (st.swapped ? '<svg width="330" height="212" viewBox="200 140 640 420" aria-hidden="true">' + ['S', 'W', 'E', 'N'].map(function (k) { return '<path d="' + FN.FACES[k] + '" fill="var(--c-roof)" stroke="var(--c-roofLine)" stroke-width="2"></path>'; }).join('') + mods(st).filter(function (m) { return st.filled && !m.blocked && !m.removed; }).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" fill="#2B3A4A"></rect>'; }).join('') + '</svg>' : '') + (H ? '' : '<div style="height:212px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--c-ink2)">3D loading…</div>') + '</div>';
        if (st.swapped) o += '<span style="position:absolute;left:92px;bottom:14px;font-size:12px;padding:5px 9px;border-radius:7px;background:var(--c-paper);border:1px solid var(--c-line);color:var(--c-ink2);z-index:3">3D checks · editing stays on the plan · ⇄ to swap back</span>';
        if (st.pad) o += '<div style="position:absolute;left:600px;top:200px;width:210px;' + FN.card + ';border-color:var(--c-sel);padding:10px;box-shadow:0 10px 28px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:8px;z-index:6"><span style="font-size:12px;color:var(--c-muted)">Chimney height above the roof</span><b style="font-size:22px;font-weight:600;color:var(--c-sel);border-bottom:1.5px solid var(--c-sel)">' + st.chimH + ' m</b><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px">' +
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '✓'].map(function (k) { var ok = k === '✓'; return '<button type="button" data-a="key" data-v="' + k + '" style="min-height:44px;border-radius:8px;border:1px solid var(--c-line);background:' + (ok ? 'var(--c-ink)' : 'var(--c-paper2)') + ';color:' + (ok ? 'var(--c-paper)' : 'var(--c-ink)') + ';font:inherit;font-size:16px;cursor:pointer">' + k + '</button>'; }).join('') + '</div></div>';
        var TD = [['Fill the north face', 3], ['Chimney at 1.20 m', 6], ['Remove a module', 2], ['Try another battery', 2], ['Present', 1]];
        var hints = ['Hover a tool for its tutorial. Fill zone, the north face, ✓ Keep.', 'Obstacle, tap the face, 1 . 2 on the pad, ✓.', 'Modules, then tap any module.', 'Battery ▸ in the reading card, pick a size.', 'Present, top right.', 'Done. Drag any card or bar by its grip; settings reset the layout.'];
        if (!J) o += '<div style="position:absolute;left:' + P.coach[0] + 'px;top:' + P.coach[1] + 'px;width:290px;' + FN.card + ';box-shadow:0 8px 24px rgba(29,32,38,.10);z-index:4;overflow:hidden"><div data-grip="coach" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--c-line2);cursor:grab"><b style="font-size:12px;font-weight:600">Demos · touches counted</b><span style="font-size:11px;color:var(--c-muted)">catalogue §6</span></div><div style="padding:6px 8px;display:flex;flex-direction:column;gap:2px">' +
          TD.map(function (t, k) { var cur = k === st.task, dn = k < st.task, u = st.touches[k]; return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 6px;border-radius:6px;background:' + (cur ? 'var(--c-selSoft)' : 'transparent') + '"><span style="color:' + (dn ? 'var(--c-gain)' : 'var(--c-ink)') + ';font-weight:' + (cur ? 600 : 400) + '">' + (dn ? '✓ ' : '') + t[0] + '</span><span style="color:' + (u > t[1] ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + (dn || cur ? u + ' / ' : '') + t[1] + '</span></div>'; }).join('') + '<span style="font-size:11px;color:var(--c-muted);padding:4px 6px">' + hints[Math.min(st.task, 5)] + '</span></div></div>';
        if (st.notif) o += '<div style="position:absolute;right:120px;top:52px;width:320px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;overflow:hidden"><b style="display:block;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--c-line2)">Notifications</b>' + [['Rebate steps down on 1 January', '2 quotes in flight need re-pricing.', 'var(--c-sun)'], ['Survey photos arrived', '12 photos from the phone, attached to this site.', 'var(--c-sel)'], ['Household opened proposal v0', 'Unit 4, 22 Ash Street, yesterday 19:40.', 'var(--c-muted)']].map(function (n) { return '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--c-line2);font-size:12px;line-height:1.45"><span style="width:3px;border-radius:2px;background:' + n[2] + '"></span><span><b style="font-weight:600">' + n[0] + '</b><br><span style="color:var(--c-ink2)">' + n[1] + '</span></span></div>'; }).join('') + '</div>';
        if (st.settings) o += '<div style="position:absolute;right:80px;top:52px;width:280px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;padding:12px;display:flex;flex-direction:column;gap:10px"><b style="font-size:12px;font-weight:600">View settings</b><span style="font-size:12px;color:var(--c-muted)">Disclosure level</span><div style="display:flex;background:var(--c-ground);border-radius:8px;padding:3px">' + ['Guided', 'Standard', 'Expert'].map(function (l, k) { return '<button type="button" data-a="level" data-v="' + k + '" style="flex:1;min-height:36px;border:none;border-radius:6px;background:' + (k === st.level ? 'var(--c-paper)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + l + '</button>'; }).join('') + '</div>' + '<button type="button" data-a="reset" style="min-height:40px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:13px;cursor:pointer">Reset panels to the F layout</button></div>';
        if (st.layers) { var ln = P.notes, li = right.indexOf('layers'); o += '<div style="position:absolute;left:' + (ln[0] - 252) + 'px;top:' + Math.max(56, ln[1] + 16 + li * 50 - 8) + 'px;width:240px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:7;padding:8px;display:flex;flex-direction:column"><b style="font-size:12px;font-weight:600;color:var(--c-muted);padding:6px 8px">Layers</b>' +
          [['Imagery · Mar 2026', 'imagery'], ['Modules', 'mods'], ['Shade, 9 am in June', 'shade']].map(function (r) { return '<button type="button" data-a="layer" data-v="' + r[1] + '" aria-pressed="' + !!st[r[1]] + '" style="min-height:42px;display:flex;justify-content:space-between;align-items:center;border:none;background:transparent;color:var(--c-ink);font:inherit;font-size:13px;padding:0 8px;cursor:pointer"><span>' + r[0] + '</span><span style="font-size:12px;color:' + (st[r[1]] ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (st[r[1]] ? 'shown' : 'hidden') + '</span></button>'; }).join('') + '</div>'; }
        if (st.toast) o += '<div style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:9px 14px;border-radius:10px;z-index:8">' + st.toast + '</div>';
        if (st.sheet) {
          var sizes = [0, 10, 13.5, 20, 28], ratio = E.kwp / st.inv, okRatio = ratio <= 1.33;
          var pick = function (act, v, on, title, sub, extra) { return '<button type="button" data-a="' + act + '" data-v="' + v + '" aria-pressed="' + on + '" style="min-height:62px;border-radius:10px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:6px 10px;text-align:left;display:flex;flex-direction:column;gap:2px;font:inherit;cursor:pointer"><b style="font-size:13px;font-weight:600">' + title + '</b><span style="font-size:11.5px;color:var(--c-muted)">' + sub + '</span>' + (extra || '') + '</button>'; };
          o += '<div style="position:absolute;left:84px;right:84px;bottom:12px;' + FN.card + ';border-radius:16px;padding:12px 16px;box-shadow:0 14px 36px rgba(29,32,38,.18);display:flex;flex-direction:column;gap:9px;z-index:7">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:14px;font-weight:600">Equipment · from your catalogue and price list</b><span style="font-size:12px;color:var(--c-muted)">every choice recomputes yield, savings and incentives</span></div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(3,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Modules</span>' + FN.CAT.modules.map(function (m) { return pick('modw', m.w, st.modW === m.w, m.name, '$' + m.price + ' each · warranty ' + m.warranty + ' · ' + (E.n * m.w / 1000).toFixed(2) + ' kWp'); }).join('') + '</div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(3,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Inverter</span>' + FN.CAT.inverters.map(function (x) { var r = E.kwp / x.kw, ok = r <= 1.33; return pick('inv', x.kw, st.inv === x.kw, x.name, '$' + x.price + ' · panels at ' + Math.round(r * 100) + ' %', '<span style="font-size:11px;font-weight:600;color:' + (ok ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (ok ? '✓ under the 133 % limit' : '✗ over the 133 % limit') + '</span>'); }).join('') + '</div>' +
            '<div style="display:grid;grid-template-columns:110px repeat(5,minmax(0,1fr));gap:8px;align-items:stretch"><span style="font-size:12px;font-weight:600;align-self:center">Battery</span>' + sizes.map(function (z, i) {
              var sv = FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: z, ev: J ? S.measures.ev : true }).total, pv0 = i ? FN.TODAY() - FN.sim({ plan: 'best', kwp: E.eff, cap: sizes[i - 1], ev: J ? S.measures.ev : true }).total : 0;
              return pick('bat', z, st.bat === z, z ? z + ' kWh' : 'None', z ? 'rebate ' + FN.money(FN.rebate(z)) + ' · saves ' + FN.money(sv) + '/yr' : 'saves ' + FN.money(sv) + '/yr', z ? '<span style="font-size:11px;color:' + (z > 14 ? 'var(--c-loss)' : 'var(--c-muted)') + '">+' + FN.money((sv - pv0) / (z - sizes[i - 1])) + '/yr per kWh</span>' : '');
            }).join('') + '</div>' +
            '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;padding-top:2px"><span style="color:' + (okRatio ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (okRatio ? '✓' : '✗') + ' DC/AC ' + ratio.toFixed(2) + '</span><span style="color:var(--c-gain)">✓ battery and inverter compatible (hybrid)</span><span style="color:var(--c-gain)">✓ CEC-listed</span><span style="color:var(--c-gain)">✓ VPP-capable: rebate eligible</span><span style="color:var(--c-muted)">export limit 5 kW · rebate tiers 14 · 28 · 50 kWh</span></div></div>';
        }
        if (st.present) { var vs = ['mixed', 'portrait', 'landscape'].map(function (vv) { var s2 = {}; for (var k in st) s2[k] = st[k]; s2.variant = vv; s2.removed = []; s2.filled = true; return { v: vv, e: energy(s2) }; }).sort(function (a5, b5) { return b5.e.save - a5.e.save; });
          o += '<div style="position:absolute;inset:0;background:var(--c-ground);display:flex;flex-direction:column;z-index:9"><div style="height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--c-paper);border-bottom:1px solid var(--c-line)"><b style="font-size:14px;font-weight:600">Your home · 14 Wattle Lane</b><span style="display:flex;gap:8px"><button type="button" data-a="unpresent" style="min-height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Back to design</button>' + (J ? (function (g) { return '<button type="button" data-a="mode" data-v="' + g.v + '" style="min-height:36px;padding:0 16px;border-radius:8px;' + gateStyle(g) + ';font:inherit;font-weight:600;cursor:pointer">' + g.l + '</button>'; })(gate(E)) : '') + '</span></div><div style="flex:1;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;padding:20px">' +
            '<div style="' + FN.card + ';border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px"><span style="font-size:13px;color:var(--c-muted)">Three layouts, ranked on your own bill</span>' + vs.map(function (x) { var on = st.variant === x.v; return '<button type="button" data-a="pvariant" data-v="' + x.v + '" style="min-height:72px;border-radius:12px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:10px 14px;text-align:left;display:flex;justify-content:space-between;align-items:center;font:inherit;cursor:pointer"><span><b style="font-size:15px;font-weight:600">' + x.v.charAt(0).toUpperCase() + x.v.slice(1) + ' · ' + x.e.n + ' modules</b><br><span style="font-size:12px;color:var(--c-muted)">' + x.e.kwp.toFixed(2) + ' kWp · ' + FN.n(x.e.kwh) + ' kWh/yr</span></span><b style="font-size:15px;font-weight:600;color:var(--c-gain)">' + FN.money(x.e.save * 0.85) + '–' + FN.money(x.e.save * 1.1) + '</b></button>'; }).join('') + '</div>' +
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
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">Roof</span><b style="font-weight:600">3 faces confirmed · LiDAR 0.91</b></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">Needs</span><b style="font-weight:600">15 kWh a day · ' + P.badge + ' (±' + P.unc + ' %)</b></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;font-size:13px"><span style="color:var(--c-muted)">Wants</span><b style="font-weight:600">solar' + (w.length ? ' + ' + w.join(' + ') : '') + ' · plan ' + (S.plan || 'Flat Rate') + '</b></span>' +
          '<button type="button" data-a="open" style="min-height:44px;padding:0 16px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:14px;font-weight:600;cursor:pointer">' + (S.signed ? 'Signed ✓' : S.proposal ? 'Proposal sent' : 'Open in studio') + '</button></div>';
        return o + '<span style="font-size:13px;color:var(--c-muted);line-height:1.5">You see the place and the needs as totals, never the meter readings, and never another installer’s proposal. The household’s draft design comes with the site.</span></div>';
      }
      function gate(E) {
        if (S && S.signed) return { k: 'done', l: 'Signed by the household ✓', v: 3 };
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
        if (st.chimney) notes.push(['Chimney', 'brick, 0.60 × 0.60 m, ' + (parseFloat(st.chimH) || 1).toFixed(2) + ' m above the roof, 1.05 m below the ridge; modules kept 0.40 m away; it shades ' + ms.filter(function (m) { return m.shaded && st.shade; }).length + ' modules on winter mornings', true]);
        if (st.removed.length) notes.push(['Modules', st.removed.length + ' taken off the layout by hand, to clear a vent or a shaded corner', false]);
        notes.push(['Switchboard', 'circuit breakers with room for two more; no upgrade needed', false], ['Meter', 'smart meter, import and export; the network keeps it', false]);
        st.qnotes.forEach(function (i) { notes.push([QNOTES[i][0], QNOTES[i][1], false]); });
        return FN.offer({ n: E.n, kwp: E.kwp, eff: E.eff, kwh: E.kwh, modW: st.modW, inv: st.inv, bat: st.bat, ev: S.measures.ev, hp: S.measures.hp, save: E.save, unc: S.profile.unc, badge: S.profile.badge, mods: ms.map(function (m) { return { x: m.x, y: m.y, w: m.w, h: m.h }; }), chimney: st.chimney ? (parseFloat(st.chimH) || 1).toFixed(2) : 0, shaded: ms.filter(function (m) { return m.shaded && st.shade; }).length, notes: notes });
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
        // what matters to send it: the number, the state, the files
        o += '<div style="display:flex;flex-direction:column;gap:12px"><div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:4px"><span style="font-size:12px;color:var(--c-muted)">The household pays</span><b style="font-size:24px;font-weight:600">' + FN.money(P.total) + '</b><span style="font-size:12px;color:var(--c-gain);font-weight:600">saves ' + FN.money(E.save * (1 - u / 100)) + '–' + FN.money(E.save * (1 + u / 100)) + ' a year</span><span style="font-size:11.5px;color:var(--c-muted)">' + P.kwp.toFixed(2) + ' kWp' + (st.bat ? ' + ' + st.bat + ' kWh' : '') + ' · valid 7 days</span></div>' +
          (function (g) { var ok = (g.k === 'go' && seen === N) || g.k === 'done', l = S.signed ? 'Signed by the household ✓' : sent ? 'Sent · on the household’s site' : g.k !== 'go' ? g.l : seen < N ? 'Review every section · ' + seen + ' of ' + N : 'Send to the household'; return '<button type="button" data-a="' + (ok ? 'send' : g.k !== 'go' ? 'mode' : 'qnext') + '" data-v="' + g.v + '" style="min-height:46px;border-radius:10px;' + gateStyle(ok || g.k === 'done' ? g : { k: 'todo' }) + ';font:inherit;font-size:14px;font-weight:600;cursor:pointer">' + l + '</button>' + (ok || sent ? '' : '<span style="font-size:11.5px;color:var(--c-muted);text-align:center;line-height:1.4">' + (g.v === 2 ? 'The household sees every line: check the equipment first.' : g.v === 1 ? 'Fill a face to price the modules.' : 'The household reads it section by section; so do you, once, before it goes.') + '</span>'); })(gate(E)) +
          FN.exportsCard('installer') + '</div></div>';
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
        if (a === 'tool') { touch(); if (v === 'layers') { st.layers = !st.layers; st.settings = false; st.notif = false; } else { st.tool = v; st.preview = false; st.selFace = false; st.pad = false; } st.hover = null; check(); }
        else if (a === 'face') { if (v !== 'N') return; if (st.tool === 'chimney' && !st.chimney) { commit({ chimney: true, pad: true, fresh: true }, 'Chimney added', { t: 'Chimney added', b: 'Type its height on the pad', c: 'var(--c-ink)', x: 560, y: 250 }); return; } touch(); if (st.tool === 'fill') st.preview = true; else if (st.tool === 'select') st.selFace = !st.selFace; check(); }
        else if (a === 'variant') { touch(); st.variant = v; }
        else if (a === 'keep') { commit({ filled: true, preview: false }, 'Zone filled · ' + st.variant, { t: 'Zone filled', b: 'Setbacks 0.40 m from eaves and hips', c: 'var(--c-gain)', x: 420, y: 250 }); return; }
        else if (a === 'mod') { if (st.tool !== 'panel' || !st.filled) return; var r = st.removed.slice(), i = r.indexOf(v), was = i >= 0; if (was) r.splice(i, 1); else r.push(v);
          var m = FN.layout(st.variant).filter(function (x) { return x.id === v; })[0]; commit({ removed: r }, was ? 'Module added' : 'Module removed', { t: was ? '+1 module' : '−1 module', b: (was ? '+' : '−') + '0.44 kWp', c: was ? 'var(--c-gain)' : 'var(--c-loss)', x: Math.round(m.x + 30 + m.w + 8), y: m.y + 148 }); return; }
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
        else if (a === 'open') { if (S.proposal) { st.mode = 3; } else { st.mode = 1; if (!S.opened) st.bat = S.measures.bat ? 13.5 : 0; S.opened = true; } if (opts.onChange) opts.onChange(); }
        else if (a === 'send') { if (!S.proposal && st.lastOffer) { S.proposal = st.lastOffer; if (opts.onChange) opts.onChange(); } }
        else if (a === 'present') { touch(); st.present = true; st.sheet = false; st.notif = false; st.settings = false; check(); }
        else if (a === 'unpresent') st.present = false;
        else if (a === 'pvariant') { st.variant = v; st.removed = []; }
        else if (a === 'notif') { st.notif = !st.notif; st.settings = false; st.layers = false; }
        else if (a === 'settings') { st.settings = !st.settings; st.notif = false; st.layers = false; }
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
      if (opts.api) opts.api.render = function () { if (J && !S.shared) st.mode = -1; render(); };
    })();
  };
  all('figure.bk-widget[data-widget="studio"]').forEach(function (fig) {
    FN.when(fig, function () { FN.studio(FN.frame(fig, 1180, 820), {}); });
  });
  /* ---------- widget: the journey, two screens and one site (design/funnels) ---------- */
  // The household's screen and the installer's screen, one above the other, joined by the site
  // they share: the household moves step by step (plan, profile, roof, next move, share), the
  // site lands in the installer's inbox, the installer designs and sends a proposal, and the
  // proposal comes back to the household, who compares and signs. Intention prototype.

  // two screens in one figure, with the hand-over between them
  FN.frames = function (fig) {
    var svg = fig.querySelector('svg'), out = fig.querySelector('.bk-widget-out'), fr = FN.isFr(fig), focus = -1;
    if (svg) svg.style.display = 'none';
    var lab = fr ? ['Écran du ménage', 'Écran de l’installateur'] : ['The household’s screen', 'The installer’s screen'];
    var pane = function (i) { return '<div class="bk-jn-pane"><p class="bk-jn-lab"><span>' + lab[i] + '</span><button type="button" class="bk-jn-focus" data-i="' + i + '">' + (fr ? 'Seul' : 'Focus') + '</button></p><div class="bk-fw"><div class="bk-fw-screen"></div></div></div>'; };
    out.innerHTML = '<div class="bk-fw-bar"><span>' + (fr ? 'Prototype d’intention · deux écrans du produit australien, reliés par le site' : 'Intention prototype · two screens of the Australian product, joined by the site') + '</span><span class="bk-fw-act">' + FN.paletteBar(fr) + '<button type="button" class="bk-fw-big">' + (fr ? 'Agrandir' : 'Enlarge') + '</button></span></div>' +
      '<div class="bk-jn-row">' + pane(0) + '<div class="bk-jn-band"></div>' + pane(1) + '</div>';
    var row = out.querySelector('.bk-jn-row'), panes = all('.bk-jn-pane', out), boxes = all('.bk-fw', out), screens = all('.bk-fw-screen', out), big = out.querySelector('.bk-fw-big'), focusBtns = all('.bk-jn-focus', out);
    screens.forEach(function (s) { s.style.width = '1180px'; s.style.height = '820px'; });
    FN.wirePalette(out);
    // enlarged: side by side when the window is wide, stacked otherwise, or one screen alone (Focus)
    function fit() {
      var open = fig.classList.contains('bk-fw-open'), W = window.innerWidth - 48, Hh = window.innerHeight - 120;
      var stacked = Math.min(W / 1180, (Hh - 70) / 2 / 820), side = Math.min((W - 24) / 2 / 1180, Hh / 820), alone = Math.min(W / 1180, Hh / 820);
      var mode = !open ? 'page' : focus >= 0 ? 'alone' : side > stacked ? 'side' : 'stacked';
      row.className = 'bk-jn-row' + (mode === 'side' ? ' side' : '');
      panes.forEach(function (p, i) { p.style.display = mode === 'alone' && i !== focus ? 'none' : ''; });
      out.querySelector('.bk-jn-band').style.display = mode === 'alone' ? 'none' : '';
      focusBtns.forEach(function (b, i) { b.style.display = open ? '' : 'none'; b.textContent = focus === i ? (fr ? 'Les deux' : 'Both') : (fr ? 'Seul' : 'Focus'); });
      var sc = { page: 0, alone: alone, side: side, stacked: stacked }[mode];
      boxes.forEach(function (box, i) {
        var s2 = mode === 'page' ? Math.min(1, box.clientWidth / 1180) : Math.min(1.25, sc);
        screens[i].style.transform = 'scale(' + s2 + ')'; box.style.height = (820 * s2) + 'px'; box.style.width = mode === 'page' ? '' : (1180 * s2) + 'px';
      });
    }
    big.addEventListener('click', function () { var open = fig.classList.toggle('bk-fw-open'); if (!open) focus = -1; big.textContent = open ? (fr ? 'Réduire' : 'Close') : (fr ? 'Agrandir' : 'Enlarge'); fit(); });
    focusBtns.forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-i'); focus = focus === i ? -1 : i; fit(); }); });
    window.addEventListener('resize', fit);
    function paint() { screens.forEach(function (s) { s.setAttribute('style', s.getAttribute('style').replace(/--c-[^;]*;?/g, '') + ';' + FN.vars(FN.tokens())); }); fit(); }
    window.addEventListener('sd-palette', paint); paint();
    if (window.ResizeObserver) boxes.forEach(function (b) { new ResizeObserver(function () { if (!fig.classList.contains('bk-fw-open')) fit(); }).observe(b); });
    return { a: screens[0], b: screens[1], band: out.querySelector('.bk-jn-band'), fr: fr };
  };

  /* the household's screen: one app, six steps that carry their data forward */
  FN.household = function (el, S, changed) {
    var STEPS = ['Your plan', 'Your profile', 'Your roof', 'Next move', 'Share', 'Proposal'];
    var st = { qs: 'cover', qseen: {}, qopen: false, step: 0, chosen: '', prof: { meter: false, bill: false, ans: {}, q: false, consent: false, busy: '' }, conf: { N: false, W: false, E: false }, tool: 'confirm', preview: false, hour: 15, top: false, next: 1, max: 0, seen: false, bell: false }, H = null, timer = null, tBusy = null;
    el.innerHTML = '<div style="width:1180px;height:820px;box-sizing:border-box;background:var(--c-ground);color:var(--c-ink);position:relative;overflow:hidden"><div class="hh-top"></div><div class="hh-body" style="position:absolute;left:0;right:0;top:48px;bottom:64px"></div>' +
      '<div class="hh-3d" style="position:absolute;left:384px;top:190px;width:784px;height:486px;display:none;overflow:hidden;border-radius:14px 14px 0 0;background:var(--c-canvas)"><canvas class="hh-canvas" width="784" height="486" aria-label="Your home in 3D: drag to turn around it" style="width:784px;height:486px;display:block;touch-action:none;cursor:grab"></canvas></div>' +
      '<div class="hh-note"></div><div class="hh-foot" style="position:absolute;left:0;right:0;bottom:0;height:64px;background:var(--c-paper);border-top:1px solid var(--c-line);display:flex;align-items:center;gap:12px;padding:0 16px"></div></div>';
    var q = function (c) { return el.querySelector(c); };
    var cost = function (name) { var p = FN.PLANS.filter(function (x) { return x.name === name; })[0], d = FN.base(15), e = 0; for (var h = 0; h < 24; h++) e += d[h] * p.rate(h); return (e + p.supply) * 365; };
    function unc() { var P = st.prof, u = 30; [['people', 6], ['home', 4], ['hvac', 4], ['hw', 4], ['cook', 1], ['pool', 2], ['have', 1]].forEach(function (k) { if (P.ans[k[0]] !== undefined) u -= k[1]; }); if (P.bill) u = Math.min(u, 12); if (P.meter) u = 5; return u; }
    function badge() { return st.prof.meter ? 'Measured' : st.prof.bill ? 'From your bills' : 'Estimated'; }
    function filled() { return S.measures.solar; }
    function opt(m) { return { plan: m.plan ? 'best' : 'flat', kwp: m.solar ? 7.04 : 0, cap: m.bat ? 13.5 : 0, ev: m.ev, hp: m.hp }; }
    function done(i) { return [!!st.chosen, st.prof.meter || st.prof.bill || Object.keys(st.prof.ans).length >= 3, filled(), st.max > 3, S.shared, S.signed][i]; }
    function reach(i) { for (var k = 0; k < i; k++) if (!done(k)) return false; return i < 5 || !!S.proposal; }
    function P0() { var P = S.proposal; return P ? P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + ' · ' + FN.money(P.total) : ''; }
    function sync() { S.profile = { badge: badge(), unc: unc() }; S.plan = st.chosen; }
    // step 1 · plan: the horizon of the whole journey, the household's day on each plan, its bill read back, its roof already seen
    var OFFERS = {
      'Flat Rate': { who: 'Retailer A · your retailer', chips: ['36 c/kWh all day', '110 c/day supply'], line: 'Your plan today: every kWh at the same price.', terms: 'no exit fee' },
      'Simple Saver': { who: 'Retailer B', chips: ['31 c/kWh all day', '115 c/day supply'], line: 'Same habits, 5 c less on every kWh.', terms: 'no exit fee · price held 12 months' },
      'Time of Use Saver': { who: 'Retailer C', chips: ['52 c 3–9 pm', '30 c day', '22 c night', '105 c/day supply'], line: 'Your 5–9 pm peak falls in the 52 c hours: it costs more unless you shift it.', terms: 'no exit fee · smart meter needed' }
    };
    // the way ahead: today's spend as one bar, the plan's saving solid (now), the later moves hatched (possible), what is left at the end
    function horizon(cur, best) {
      var M = [['Solar', 'pv', { kwp: 7.04 }], ['Battery', 'battery', { cap: 13.5 }], ['Electric car', 'car', { ev: true }], ['Heat pump', 'heat', { hp: true }]];
      var T = FN.TODAY(), first = cur - (st.chosen ? cost(st.chosen) : best), o = { plan: 'best' }, prev = T - first, segs = [], k;
      M.forEach(function (m) { for (k in m[2]) o[k] = m[2][k]; var t = FN.sim(o).total; segs.push({ l: m[0], i: m[1], d: prev - t }); prev = t; });
      var pct = function (v) { return (Math.max(v, 0) / T * 100).toFixed(2) + '%'; }, hatch = 'repeating-linear-gradient(135deg,var(--c-selSoft) 0 7px,var(--c-paper2) 7px 12px)';
      var bar = '<div title="Switching plan, today" style="width:' + pct(first) + ';background:' + (first < 0 ? 'var(--c-loss)' : 'var(--c-gain)') + ';color:var(--c-paper);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;white-space:nowrap">' + (first < 0 ? '' : '−' + FN.money(first)) + '</div>' +
        segs.map(function (s) { return '<div title="' + s.l + ': about −' + FN.money(s.d) + ' a year" style="width:' + pct(s.d) + ';background:' + hatch + ';border-left:2px solid var(--c-paper);display:flex;align-items:center;justify-content:center;gap:5px;font-size:11.5px;color:var(--c-ink2);white-space:nowrap;overflow:hidden">' + (s.d / T > 0.12 ? FN.icon(s.i, 'var(--c-sel)') + s.l + ' −' + FN.money(s.d) : s.d / T > 0.06 ? FN.icon(s.i, 'var(--c-sel)') + '−' + FN.money(s.d) : FN.icon(s.i, 'var(--c-sel)')) + '</div>'; }).join('') +
        '<div style="flex:1;min-width:58px;background:var(--c-line);border-left:2px solid var(--c-paper);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--c-ink)">' + FN.money(prev) + '</div>';
      return '<div style="grid-column:1 / -1;' + FN.card + ';padding:10px 14px;display:flex;flex-direction:column;gap:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-size:13.5px"><span>Today you spend <b>' + FN.money(T) + '</b> a year on power, gas and fuel.' + (first < 0 ? ' <span style="color:var(--c-loss)">This plan costs you ' + FN.money(-first) + ' more.</span>' : '') + '</span><span style="color:var(--c-ink2)">It could drop to <b style="color:var(--c-gain)">' + FN.money(prev) + '</b> a year, ±' + unc() + ' % for now</span></div>' +
        '<div style="display:flex;height:28px;border-radius:8px;overflow:hidden;border:1px solid var(--c-line)">' + bar + '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--c-muted)"><span>↑ <b style="color:var(--c-gain)">now</b>, by switching plan: 2 minutes, nothing to install</span><span>hatched: possible next, with your roof and your choices (steps 3 and 4)</span><span>what is left ↑</span></div></div>';
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
    function stepPlan() {
      var cur = cost('Flat Rate'), plans = ['Flat Rate', 'Simple Saver', 'Time of Use Saver'].map(function (n) { return { n: n, c: cost(n) }; }).sort(function (a, b) { return a.c - b.c; });
      var show = st.chosen || plans[0].n, D = dayOn(show), sc = cost(show);
      var o = '<div style="position:absolute;inset:12px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:12px">' + horizon(cur, plans[0].c);
      // left: the day on the plan shown, then the bill read back and the roof already seen
      o += '<div style="display:flex;flex-direction:column;gap:12px;min-height:0"><div style="' + FN.card + ';padding:14px 16px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;font-weight:600">Your day on ' + show + '</b><span style="font-size:13px;color:var(--c-ink2)"><b style="color:var(--c-ink)">' + FN.money(sc) + '</b> a year</span></div>' +
        D.svg + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--c-ink2)"><span style="display:flex;gap:12px">' + D.legend + '</span><span>tap a plan to see your day on it</span></div>' +
        '<span style="font-size:13px;line-height:1.45;color:var(--c-ink2)"><b style="color:var(--c-ink)">' + D.share + ' % of your use falls between 5 and 9 pm</b>: on this plan those hours cost you ' + FN.money(D.peakCost) + ' a year. That is the part a battery will carry later.</span></div>';
      o += '<div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:12px;flex:1;min-height:0">' +
        '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:12.5px"><span style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px;font-weight:600">Your bill, read</b>' + FN.icon('bill', 'var(--c-sel)') + '</span>' +
        [['Plan', 'Flat Rate · Retailer A'], ['Usage', '1,380 kWh in 92 days'], ['Energy rate', '36 c/kWh'], ['Supply', '110 c/day'], ['Quarter, GST incl.', '$598']].map(function (r) { return '<span style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed var(--c-line2)"><span style="color:var(--c-muted)">' + r[0] + '</span><b style="font-weight:600;background:var(--c-selSoft);border-radius:4px;padding:0 5px">' + r[1] + '</b></span>'; }).join('') +
        '<span style="font-size:11px;color:var(--c-muted);margin-top:auto;line-height:1.4">Highlighted: read from your bill, Jul–Sep 2026. Saved to My home as needs; the raw bill stays only if you attach it.</span></div>' +
        '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:4px"><b style="font-size:13px;font-weight:600">We already see your roof</b>' +
        '<svg width="100%" height="96" viewBox="0 0 200 110" role="img" aria-label="The outline of your hip roof, the north face highlighted"><g transform="translate(25 8)"><path d="M0 0 H150 L100 47 H50 Z" fill="var(--c-sun)" opacity=".55" stroke="var(--c-ink)" stroke-width="1.2"></path><path d="M0 0 L50 47 L0 94 Z M150 0 L100 47 L150 94 Z M0 94 L50 47 H100 L150 94 Z" fill="var(--c-paper2)" stroke="var(--c-ink)" stroke-width="1.2"></path><text x="75" y="26" font-size="11" font-weight="600" text-anchor="middle" fill="var(--c-ink)">N · 54 m²</text></g><text x="186" y="18" font-size="10" fill="var(--c-muted)" text-anchor="middle">N ↑</text></svg>' +
        '<span style="font-size:12px;color:var(--c-ink2);line-height:1.4">4 faces from LiDAR, 3 that can take panels; north face 54 m² at 22°. You confirm them at step 3.</span></div></div></div>';
      // right: the promise, then the plans ranked on the household's own yearly cost
      o += '<div style="' + FN.card + ';padding:16px 18px;display:flex;flex-direction:column;gap:9px;min-height:0"><b style="font-size:24px;font-weight:600;line-height:1.15">Pay less, from this month.</b><span style="font-size:13.5px;color:var(--c-ink2);line-height:1.45">You pay <b style="color:var(--c-ink)">' + FN.money(cur) + '</b> a year for 15 kWh a day. Switching takes 2 minutes and nothing changes at home.</span><span style="' + FN.kick + ';margin-top:4px">Plans you can take · ranked on your own yearly cost</span>' +
        plans.map(function (p, i) {
          var d = cur - p.c, on = st.chosen === p.n, O = OFFERS[p.n], u = unc() / 100;
          return '<button type="button" data-a="plan" data-v="' + p.n + '" aria-pressed="' + on + '" style="border-radius:12px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);padding:10px 14px;text-align:left;display:flex;flex-direction:column;gap:5px;font:inherit;cursor:pointer">' +
            '<span style="width:100%;display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="display:flex;align-items:baseline;gap:8px"><b style="font-size:15.5px;font-weight:600">' + p.n + '</b><span style="font-size:11.5px;color:var(--c-muted)">' + O.who + '</span></span><b style="font-size:17px;font-weight:600">' + FN.money(p.c) + '</b></span>' +
            '<span style="display:flex;gap:5px;flex-wrap:wrap">' + O.chips.map(function (c) { return '<span style="font-size:11px;padding:2px 7px;border-radius:999px;background:var(--c-paper);border:1px solid var(--c-line2)">' + c + '</span>'; }).join('') + '</span>' +
            '<span style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:12px;color:var(--c-ink2);line-height:1.35">' + O.line + ' <span style="color:var(--c-muted)">' + O.terms + '</span></span><span style="flex:none;font-size:12.5px;font-weight:600;color:' + (d > 1 ? 'var(--c-gain)' : d < -1 ? 'var(--c-loss)' : 'var(--c-muted)') + '">' + (d > 1 ? 'saves ' + FN.money(d * (1 - u)) + '–' + FN.money(d * (1 + u)) : d < -1 ? 'costs ' + FN.money(-d) + ' more' : 'your plan today') + '</span></span>' +
            (on && d > 1 ? '<span style="align-self:flex-start;font-size:12px;font-weight:600;color:var(--c-sel)">Chosen ✓ · we switch it when you say, at no cost</span>' : '') + '</button>';
        }).join('') +
        '<div style="border:1px dashed var(--c-line);border-radius:10px;padding:8px 12px;font-size:12px;color:var(--c-muted);display:flex;gap:8px;align-items:center">' + FN.icon('pv', 'var(--c-muted)') + FN.icon('battery', 'var(--c-muted)') + FN.icon('car', 'var(--c-muted)') + '<span>3 plans hidden: they need solar, a battery or an electric car. They come back when your home changes.</span></div>' +
        '<span style="font-size:11.5px;color:var(--c-muted);line-height:1.45;margin-top:auto">No email before your first number. Nobody calls you unless you ask. A $40 commission is shown on every plan, the same for all, and never changes the order.</span></div></div>';
      return o;
    }
    // step 2 · profile: the sources, a home composed with icons, and a day explained by its uses
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
    function stepProfile() {
      var P = st.prof, u = unc(), season = st.season || 'year', D = uses(season), U = D.U, h;
      var o = '<div style="position:absolute;left:12px;right:12px;top:12px;height:64px;' + FN.card + ';display:flex;align-items:center;gap:10px;padding:0 12px">';
      [['meter', 'Smart meter', P.meter ? '✓ measured, 12 months' : 'best · 1 min', P.meter, !P.meter, 'Connect'], ['bill', 'Your bill', P.bill ? '✓ read: Flat Rate, 4 quarters' : 'the one you gave · 2 min', P.bill, !P.bill && !P.meter, 'Use it'], ['ask', 'Your home', Object.keys(P.ans).length + ' of 7 answered', Object.keys(P.ans).length >= 3, false, '']].forEach(function (x) {
        o += '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:' + (x[3] ? 'var(--c-gainSoft)' : 'var(--c-line2)') + '">' + FN.icon(x[0], x[3] ? 'var(--c-gain)' : 'var(--c-ink2)') + '<span style="display:flex;flex-direction:column"><b style="font-size:13px;font-weight:600">' + x[1] + '</b><span style="font-size:11px;color:var(--c-ink2)">' + x[2] + '</span></span>' + (x[4] ? '<button type="button" data-a="src" data-v="' + x[0] + '" style="min-height:32px;padding:0 10px;border-radius:8px;border:' + (x[0] === 'meter' ? 'none' : '1px solid var(--c-ink)') + ';background:' + (x[0] === 'meter' ? 'var(--c-live)' : 'var(--c-paper2)') + ';color:' + (x[0] === 'meter' ? 'var(--c-onLive)' : 'var(--c-ink)') + ';font:inherit;font-size:12px;font-weight:600;cursor:pointer">' + x[5] + '</button>' : '') + '</div>';
      });
      o += '<span style="flex:1"></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><span style="display:flex;gap:8px;align-items:center"><b style="font-size:12px;padding:3px 8px;border-radius:6px;background:' + (P.meter ? 'var(--c-gainSoft)' : P.bill ? 'var(--c-sunSoft)' : 'var(--c-line2)') + ';color:' + (P.meter ? 'var(--c-gain)' : P.bill ? 'var(--c-sunText)' : 'var(--c-ink2)') + '">' + badge() + '</b><b style="font-size:16px;font-weight:600">±' + u + ' %</b></span><span style="font-size:11px;color:var(--c-muted)">on every saving you will see: $600 shows as ' + FN.money(600 * (1 - u / 100)) + '–' + FN.money(600 * (1 + u / 100)) + '</span></span></div>';
      // the home, composed with icons; each open group says how much it narrows the range
      o += '<div style="position:absolute;left:12px;top:88px;width:556px;bottom:12px;' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:7px;overflow:hidden"><span style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;font-weight:600">Your home</b><span style="font-size:11px;color:var(--c-muted)">tap what is true · no kWh to type</span></span>';
      GROUPS.forEach(function (g) {
        var done1 = P.ans[g[0]] !== undefined, eff = '';
        if (done1 && !P.meter) { var tot0 = D.tot; eff = ''; }
        o += '<div style="display:flex;align-items:center;gap:10px"><span style="width:118px;display:flex;flex-direction:column;gap:1px"><b style="font-size:12px;font-weight:600">' + g[1] + '</b><span style="font-size:10.5px;color:' + (done1 ? 'var(--c-gain)' : 'var(--c-sel)') + '">' + (done1 ? '✓ answered' : P.meter ? 'optional' : 'narrows ' + g[2] + ' pts') + '</span></span><span style="display:flex;gap:6px;flex-wrap:wrap">' + g[3].map(function (op) { return tile(g, op); }).join('') + '</span></div>';
      });
      o += '</div>';
      // the day, explained: stacked uses, the sunny hours, the confidence band, two callouts
      var W = 540, X0 = 30, base = 300, max = 0; for (h = 0; h < 24; h++) max = Math.max(max, USES.reduce(function (t, us) { return t + U[us[0]][h]; }, 0) * (1 + u / 100)); max = Math.max(2.2, max * 1.25); var sc = 250 / max, acc = []; for (h = 0; h < 24; h++) acc.push(0);
      var x = function (hh) { return X0 + hh / 23 * W; }, layers = '';
      USES.forEach(function (us) {
        var arr = U[us[0]], top = [], bot = [];
        if (arr.reduce(function (a, b) { return a + b; }, 0) < 0.01) return;
        for (h = 0; h < 24; h++) { bot.unshift(x(h).toFixed(1) + ' ' + (base - acc[h] * sc).toFixed(1)); acc[h] += arr[h]; top.push(x(h).toFixed(1) + ' ' + (base - acc[h] * sc).toFixed(1)); }
        layers += '<path d="M' + top.join(' L') + ' L' + bot.join(' L') + ' Z" fill="' + us[2] + '" opacity=".82"></path>';
      });
      var up = [], lo = []; for (h = 0; h < 24; h++) { up.push(x(h).toFixed(1) + ' ' + (base - acc[h] * (1 + u / 100) * sc).toFixed(1)); lo.push(x(h).toFixed(1) + ' ' + (base - acc[h] * (1 - u / 100) * sc).toFixed(1)); }
      var tot = acc.reduce(function (a, b) { return a + b; }, 0), sun = 0; for (h = 7; h < 17; h++) sun += acc[h];
      var pk = 0; for (h = 1; h < 24; h++) if (acc[h] > acc[pk]) pk = h;
      var top2 = USES.map(function (us) { return [us[1], U[us[0]][pk]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).filter(function (z) { return z[1] > 0.05; }).map(function (z) { return z[0].toLowerCase(); });
      var night = 0; for (h = 0; h < 6; h++) night += acc[h];
      o += '<div style="position:absolute;left:580px;top:88px;right:12px;bottom:12px;' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px;font-weight:600">Your day, explained</b><span style="display:flex;gap:4px">' +
        [['year', 'Year'], ['summer', 'Summer'], ['winter', 'Winter']].map(function (v) { var on = season === v[0]; return '<button type="button" data-a="season" data-v="' + v[0] + '" style="min-height:30px;padding:0 10px;border-radius:8px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);font:inherit;font-size:12px;cursor:pointer">' + v[1] + '</button>'; }).join('') + '</span></div>' +
        '<svg width="570" height="320" viewBox="0 0 570 320" role="img" aria-label="Your average day stacked by use, with the sunny hours and the confidence band">' +
        '<rect x="' + x(7) + '" y="40" width="' + (x(17) - x(7)) + '" height="260" fill="var(--c-sunSoft)" opacity=".7"></rect><text x="' + ((x(7) + x(17)) / 2) + '" y="54" font-size="11" fill="var(--c-sunText)" text-anchor="middle" font-weight="600">when the sun shines · ' + Math.round(sun / tot * 100) + ' % of your use</text>' +
        '<path d="M' + X0 + ' ' + base + ' H' + (X0 + W) + '" stroke="var(--c-line)"></path>' + layers +
        '<path d="M' + up.join(' L') + '" fill="none" stroke="var(--c-ink)" stroke-dasharray="3 3" opacity=".55"></path><path d="M' + lo.join(' L') + '" fill="none" stroke="var(--c-ink)" stroke-dasharray="3 3" opacity=".55"></path>' +
        '<path d="M' + x(pk) + ' ' + (base - acc[pk] * sc - 4) + ' V' + (base - acc[pk] * sc - 26) + '" stroke="var(--c-ink)"></path><text x="' + (x(pk) + 6) + '" y="' + (base - acc[pk] * sc - 30) + '" font-size="11" fill="var(--c-ink)" text-anchor="end" font-weight="600">' + pk + ':00 peak · ' + acc[pk].toFixed(1) + ' kW · ' + top2.join(' + ') + '</text>' +
        (night > 2.5 ? '<text x="' + x(2.5) + '" y="' + (base - 30) + '" font-size="10.5" fill="var(--c-ink2)" text-anchor="middle">night: ' + night.toFixed(1) + ' kWh</text>' : '') +
        ['0h', '6h', '12h', '18h', '24h'].map(function (l, i) { return '<text x="' + (X0 + i * W / 4 - (i === 4 ? 16 : 0)) + '" y="316" font-size="10" fill="var(--c-muted)">' + l + '</text>'; }).join('') + '<text x="0" y="' + (base - 2 * sc + 4) + '" font-size="10" fill="var(--c-muted)">2 kW</text><path d="M' + X0 + ' ' + (base - 2 * sc) + ' H' + (X0 + W) + '" stroke="var(--c-line2)"></path></svg>';
      o += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 14px">' + USES.map(function (us) { var v = U[us[0]].reduce(function (a, b) { return a + b; }, 0); if (v < 0.01) return ''; var src = P.meter ? 'split estimated' : (us[0] === 'base' || us[0] === 'living') ? (P.bill ? 'scaled to bill' : 'estimated') : (P.ans[{ cook: 'cook', hw: 'hw', hvac: 'hvac', pool: 'pool', ev: 'have' }[us[0]]] !== undefined ? 'answered' : 'assumed'); return '<span style="display:flex;align-items:center;gap:6px;font-size:12px;padding:2px 0"><span style="width:10px;height:10px;border-radius:2px;background:' + us[2] + '"></span><span style="flex:1">' + us[1] + '</span><b style="font-weight:600">' + v.toFixed(1) + ' kWh</b><span style="font-size:10px;color:var(--c-muted);width:78px;text-align:right">' + src + '</span></span>'; }).join('') + '</div>';
      var eve = 0; for (h = 17; h < 23; h++) eve += acc[h];
      o += '<span style="font-size:12.5px;color:var(--c-ink2);line-height:1.5;margin-top:auto"><b style="color:var(--c-ink)">What it means</b> · ' + Math.round(sun / tot * 100) + ' % of your ' + tot.toFixed(1) + ' kWh a day falls when panels produce; ' + eve.toFixed(1) + ' kWh fall between 5 and 11 pm, the part a battery can carry.' + (st.prof.ans.have === 'pv' ? ' You already have solar: your next move starts from a battery.' : '') + '</span></div>';
      if (P.consent) o += '<div style="position:absolute;inset:0;background:rgba(29,32,38,.32);display:flex;align-items:center;justify-content:center"><div style="width:460px;' + FN.card + ';padding:20px;display:flex;flex-direction:column;gap:12px"><b style="font-size:18px;font-weight:600">Connect your meter</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">With your consent, open-energy reads 12 months of half-hourly readings for the meter on your bill. Solar Designer receives totals and an average day only.</span><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-a="noconsent" style="min-height:42px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;cursor:pointer">Not now</button><button type="button" data-a="consent" style="min-height:42px;padding:0 16px;border-radius:10px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-weight:600;cursor:pointer">Allow 12 months</button></div></div></div>';
      if (P.busy) o += '<div style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:var(--c-tip);color:var(--c-paper);font-size:13px;padding:9px 14px;border-radius:10px">' + P.busy + '</div>';
      return o;
    }
    // step 3 · roof
    function stepRoof() {
      var all3 = st.conf.N && st.conf.W && st.conf.E, mods = FN.layout('portrait'), f = filled();
      var o = '<div style="position:absolute;left:12px;top:12px;bottom:12px;width:80px;' + FN.card + ';display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:6px" role="toolbar">' + [['confirm', 'Confirm', false], ['fill', 'Fill zone', !all3]].map(function (t) { var on = st.tool === t[0]; return '<button type="button" data-a="tool" data-v="' + t[0] + '"' + (t[2] ? ' disabled' : '') + ' style="width:64px;min-height:64px;border:none;border-radius:10px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:' + (t[2] ? 'var(--c-faint)' : on ? 'var(--c-sel)' : 'var(--c-ink)') + ';display:flex;flex-direction:column;align-items:center;gap:4px;justify-content:center;font:inherit;cursor:pointer">' + FN.icon(t[0]) + '<span style="font-size:11px">' + t[1] + '</span></button>'; }).join('') + '</div>';
      o += '<div style="position:absolute;left:104px;top:12px;bottom:12px;right:352px;' + FN.card + ';overflow:hidden;background:var(--c-canvas)"><svg width="100%" height="100%" viewBox="150 110 740 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your roof from our drawing">' + ['S', 'W', 'E', 'N'].map(function (k) { var c = k !== 'S' && st.conf[k], hi = k !== 'S' && !c; return '<path data-a="face" data-v="' + k + '" d="' + FN.FACES[k] + '" fill="' + (c ? (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') : k === 'S' ? 'var(--c-roofS)' : 'var(--c-selSoft)') + '" stroke="' + (hi ? 'var(--c-sel)' : 'var(--c-roofLine)') + '" stroke-width="' + (hi ? 2.5 : 1) + '" style="cursor:pointer"></path>'; }).join('') +
        ((f || st.preview) ? mods.map(function (m) { var g = !f; return '<rect x="' + m.x.toFixed(1) + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="' + (g ? 'var(--c-selSoft)' : '#2B3A4A') + '" stroke="' + (g ? 'var(--c-sel)' : '#55667A') + '" stroke-dasharray="' + (g ? '4 3' : 'none') + '"></rect>'; }).join('') : '') + '<path d="M368 356 L668 356" stroke="var(--c-ridge)" stroke-width="1.5"></path></svg>' +
        '<span style="position:absolute;left:12px;top:12px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;background:var(--c-paper);color:var(--c-gain);border:1px solid var(--c-line)">LiDAR-measured · 0.91 · our drawing, not a photo</span>' +
        (st.preview && !f ? '<div style="position:absolute;left:50%;top:12px;transform:translateX(-50%);' + FN.card + ';padding:6px;display:flex;gap:6px;align-items:center"><span style="font-size:13px;color:var(--c-muted);padding:0 8px">16 modules · 7.04 kWp · ' + FN.n(16 * 0.44 * 1460) + ' kWh/yr</span><button type="button" data-a="keep" style="min-height:42px;padding:0 14px;border-radius:8px;border:none;background:var(--c-ink);color:var(--c-paper);font:inherit;font-size:13px;font-weight:600;cursor:pointer">✓ Keep</button></div>' : '') + '</div>';
      o += '<div style="position:absolute;right:12px;top:12px;bottom:12px;width:328px;' + FN.card + ';padding:16px;display:flex;flex-direction:column;gap:10px"><b style="font-size:16px;font-weight:600">' + (!all3 ? 'Is this your roof?' : !f ? 'Fill your roof' : 'Your roof is ready') + '</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">' + (!all3 ? 'Tap each face to confirm it: north, west and east. The south face gets no panels.' : !f ? 'Fill zone, the north face, then ✓ Keep: three touches.' : '16 modules on the north face after 0.40 m setbacks from the edges. Next: what solar, a battery, a car or a heat pump would change.') + '</span>' +
        ['N', 'W', 'E'].map(function (k) { return '<span style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span>' + { N: 'North', W: 'West', E: 'East' }[k] + ' · 22°</span><b style="color:' + (st.conf[k] ? 'var(--c-gain)' : 'var(--c-muted)') + '">' + (st.conf[k] ? 'confirmed' : 'to confirm') + '</b></span>'; }).join('') + '<span style="font-size:12px;color:var(--c-muted);margin-top:auto">Faces fitted from open LiDAR by our API when the site was created; your confirmation goes into the place layer of your site.</span></div>';
      return o;
    }
    // what the household gets, and the incentives that come with it (design/markets/incentives)
    function equipment(M) {
      var r = [];
      if (M.solar) r.push(['pv', 'Solar panels', '16 × 440 W monocrystalline · 7.04 kWp', '25-year warranty', 'fits the north face after 0.40 m setbacks']);
      if (M.solar || M.bat) r.push(['plan', 'Hybrid inverter', '6 kW, battery-ready', '10 years', 'panels at 117 % of the inverter, under the 133 % limit']);
      if (M.bat) r.push(['battery', 'Home battery', '13.5 kWh lithium iron phosphate, VPP-ready', '10 years', 'carries most of your evening']);
      if (M.ev) r.push(['car', 'Car charger', '7 kW single phase, charges on solar', '3 years', '40 km a day, charged at noon']);
      if (M.hp) r.push(['heat', 'Heat-pump water heater', '270 L', '7 years', 'replaces gas; runs at midday']);
      return r;
    }
    function incentives(M) {
      var r = [];
      if (M.solar) { var n = FN.stcSolar(7.04); r.push(['Solar certificates (STCs)', 'floor(7.04 kW × 1.382 zone × 5 years) = ' + n + ' STCs × $39.90', n * FN.STC, 'deeming years fall each year: 5 in 2026', true]); }
      if (M.bat) { var b = FN.batteryCerts(13.5, 6.8), b2 = FN.batteryCerts(13.5, 5.7); r.push(['Cheaper Home Batteries', '13.5 kWh × 6.8 STC/kWh = ' + b + ' STCs × $39.90', b * FN.STC, '6.8 until 31 Dec 2026, then 5.7: −' + FN.money((b - b2) * FN.STC), true]); }
      if (M.hp) r.push(['Heat-pump water heater', 'certificates may apply', 0, 'amount to check with the installer', false]);
      if (M.ev) r.push(['Solar Sharer', 'three free midday hours to charge', 0, 'NSW, from 1 Jul 2026, if your retailer offers it', false]);
      return r;
    }
    // step 4 · next move (the 3D home)
    var ORDER = ['plan', 'solar', 'hp', 'ev', 'bat'], INFO = { plan: ['plan', 'Plan switch', 0], solar: ['fill', 'Solar 7.04 kWp', 7.04 * 900], hp: ['heat', 'Heat-pump hot water', 3200], ev: ['car', 'Electric car charger', 1400], bat: ['battery', 'Battery 13.5 kWh', 11500 - FN.rebate(13.5)] };
    function stepNext() {
      var M = S.measures, today = FN.TODAY(), acc = {}, prev = today, delta = {}, u = unc();
      ORDER.forEach(function (k) { acc[k] = false; }); ORDER.forEach(function (k) { if (M[k]) { acc[k] = true; var t = FN.sim(opt(acc)).total; delta[k] = t - prev; prev = t; } });
      var fin = prev, save = today - fin, steps = [['Today', today, 1]];
      ORDER.forEach(function (k) { if (M[k]) steps.push([{ plan: 'Plan', solar: 'Solar', hp: 'Heat pump', ev: 'Car', bat: 'Battery' }[k], delta[k], 0]); }); steps.push(['New', fin, 1]);
      var mx = today * 1.05, run = today, bars = steps.map(function (s, i) {
        var x, y, hh, fill, val;
        x = 8 + i * 106;
        if (s[2]) { y = 16 + 30 - s[1] / mx * 30; hh = Math.max(2, s[1] / mx * 30); fill = 'var(--c-ink)'; val = FN.money(s[1]); }
        else { var a2 = run, b2 = run + s[1]; run = b2; y = 16 + 30 - Math.max(a2, b2) / mx * 30; hh = Math.max(2, Math.abs(s[1]) / mx * 30); fill = s[1] <= 0 ? 'var(--c-gain)' : 'var(--c-loss)'; val = (s[1] <= 0 ? '−' : '+') + FN.money(s[1]); }
        return '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="70" height="' + hh.toFixed(1) + '" rx="2" fill="' + fill + '" opacity="' + (i === 0 ? 0.3 : 0.75) + '"></rect><text x="' + (x + 35) + '" y="11" font-size="10.5" fill="' + (s[2] ? 'var(--c-ink2)' : fill) + '" text-anchor="middle" font-weight="600">' + val + '</text><text x="' + (x + 35) + '" y="58" font-size="10" fill="var(--c-muted)" text-anchor="middle">' + s[0] + '</text>';
      }).join('');
      var solo = function (k) { var a3 = {}, b3 = {}; ORDER.forEach(function (x) { a3[x] = M[x]; b3[x] = M[x]; }); a3[k] = true; b3[k] = false; return FN.sim(opt(b3)).total - FN.sim(opt(a3)).total; };
      var rank = ['hp', 'ev', 'bat'].map(function (k) { var s = solo(k); return { k: k, s: s, pay: s > 0 ? INFO[k][2] / s : 99 }; }).sort(function (a, b) { return a.pay - b.pay; });
      var o = '<div style="position:absolute;left:12px;right:12px;top:12px;height:68px;' + FN.card + ';display:flex;align-items:center;gap:18px;padding:0 16px"><span style="display:flex;flex-direction:column;gap:1px;min-width:250px"><span style="' + FN.kick + '">Energy spend a year · power, gas, fuel</span><span style="display:flex;align-items:baseline;gap:8px"><span style="font-size:13px;color:var(--c-muted)">' + FN.money(today) + ' →</span><b style="font-size:20px;font-weight:600;color:var(--c-gain)">' + FN.money(fin) + '</b></span><span style="font-size:11px;color:var(--c-ink2)">saves ' + FN.money(save * (1 - u / 100)) + '–' + FN.money(save * (1 + u / 100)) + ' · ±' + u + ' % (' + badge().toLowerCase() + ')</span></span><svg width="' + (steps.length * 106) + '" height="62" viewBox="0 0 ' + (steps.length * 106) + ' 62" role="img" aria-label="Waterfall from today’s spend to the new one">' + bars + '</svg></div>';
      o += '<div style="position:absolute;left:12px;top:92px;width:360px;bottom:12px;display:flex;flex-direction:column;gap:8px"><span style="' + FN.kick + ';padding:0 4px">Your moves · ranked by payback</span>' + [{ k: 'plan', s: 0, pay: 0 }, { k: 'solar', s: 0, pay: 0 }].concat(rank).map(function (m) {
        var on = M[m.k], I = INFO[m.k], fixed = m.k === 'plan' || m.k === 'solar', e = on && delta[m.k] !== undefined ? -delta[m.k] : m.s;
        return '<div style="' + FN.card + ';border-color:' + (on ? 'var(--c-sel)' : 'var(--c-line)') + ';padding:9px 12px;display:flex;gap:10px;align-items:center">' + FN.icon(I[0], on ? 'var(--c-sel)' : 'var(--c-ink2)') + '<div style="display:flex;flex-direction:column;gap:2px;flex:1"><b style="font-size:14px;font-weight:600">' + I[1] + '</b><span style="font-size:12px;color:var(--c-ink2)">' + (m.k === 'plan' ? (S.plan || 'Flat Rate') + ' · step 1' : m.k === 'solar' ? '16 × 440 W · 6 kW inverter · ' + FN.money(I[2]) : { hp: '270 L', ev: '7 kW', bat: '13.5 kWh LFP' }[m.k] + ' · ' + FN.money(I[2]) + ' · ' + (m.pay < 99 ? 'pays back ~' + m.pay.toFixed(1) + ' yrs' : 'needs solar')) + '</span>' + (m.k === 'solar' ? '<span style="font-size:11px;color:var(--c-sel)">after −' + FN.money(FN.stcSolar(7.04) * FN.STC) + ' certificates</span>' : m.k === 'bat' ? '<span style="font-size:11px;color:var(--c-sel)">after −' + FN.money(FN.rebate(13.5)) + ' rebate · factor drops 1 Jan</span>' : '') + '<b style="font-size:12px;font-weight:600;color:' + (e >= 0 ? 'var(--c-gain)' : 'var(--c-loss)') + '">' + (e >= 0 ? 'saves ' : 'costs ') + FN.money(e) + ' a year' + (on ? '' : ' if added') + '</b></div>' +
          (fixed ? '<b style="font-size:12px;color:var(--c-sel)">in</b>' : '<button type="button" data-a="move" data-v="' + m.k + '" style="min-width:62px;min-height:38px;border-radius:19px;border:1px solid ' + (on ? 'var(--c-sel)' : 'var(--c-live)') + ';background:' + (on ? 'var(--c-selSoft)' : 'var(--c-live)') + ';color:' + (on ? 'var(--c-sel)' : 'var(--c-onLive)') + ';font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + (on ? 'Added' : 'Add') + '</button>') + '</div>';
      }).join('') + '</div>';
      var R = FN.sim(opt(M)), h = st.hour;
      var EQ = st.view4 === 'eq';
      o += '<div style="position:absolute;left:384px;top:92px;right:12px;bottom:12px;' + FN.card + ';overflow:hidden"><div style="position:absolute;left:12px;top:12px;z-index:2;display:flex;background:var(--c-paper);border:1px solid var(--c-line);border-radius:9px;padding:3px">' + [['3d', 'Your home in 3D'], ['eq', 'Equipment & incentives']].map(function (c) { var on = (c[0] === 'eq') === EQ; return '<button type="button" data-a="view4" data-v="' + c[0] + '" style="min-height:32px;padding:0 12px;border:none;border-radius:7px;background:' + (on ? 'var(--c-selSoft)' : 'transparent') + ';color:var(--c-ink);font:inherit;font-size:12px;font-weight:' + (on ? 600 : 400) + ';cursor:pointer">' + c[1] + '</button>'; }).join('') + '</div>' +
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
    // step 5 · share
    function stepShare() {
      var M = S.measures, w = ['solar 7.04 kWp']; if (M.bat) w.push('battery'); if (M.ev) w.push('car charger'); if (M.hp) w.push('heat pump');
      var o = '<div style="position:absolute;inset:12px;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:16px"><div style="' + FN.card + ';padding:20px;display:flex;flex-direction:column;gap:12px"><b style="font-size:22px;font-weight:600">Who installs it?</b>' +
        [['An installer I choose', 'You pick; they receive your home after you consent.'], ['Let Solar Designer propose', 'Matched on area and skills. You see who before they see you.'], ['Keep it for now', 'Saved in My home.']].map(function (n, i) { return '<button type="button" data-a="who" data-v="' + i + '" style="min-height:68px;border-radius:12px;border:1px solid ' + (st.next === i ? 'var(--c-sel)' : 'var(--c-line)') + ';background:' + (st.next === i ? 'var(--c-selSoft)' : 'var(--c-paper2)') + ';color:var(--c-ink);text-align:left;padding:10px 14px;display:flex;flex-direction:column;gap:3px;font:inherit;cursor:pointer"><b style="font-size:15px;font-weight:600">' + n[0] + '</b><span style="font-size:13px;color:var(--c-muted)">' + n[1] + '</span></button>'; }).join('') + '</div>';
      o += '<div style="' + FN.card + ';border-color:var(--c-sel);padding:18px;display:flex;flex-direction:column;gap:10px"><b style="font-size:16px;font-weight:600">Before anyone sees your home</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5"><b>Installer 1</b> (9 km, batteries) would receive:</span>' +
        [['Your roof', '3 faces confirmed, our drawing'], ['Your needs', '15 kWh a day, as totals · ' + badge()], ['Your draft', w.join(' · ')], ['Never', 'your meter readings, another installer’s proposal, a phone call you did not ask for']].map(function (r) { return '<span style="display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span style="color:var(--c-muted)">' + r[0] + '</span><b style="font-weight:600;text-align:right">' + r[1] + '</b></span>'; }).join('') +
        '<button type="button" data-a="share" style="margin-top:auto;min-height:48px;border-radius:10px;border:none;background:' + (S.shared ? 'var(--c-selSoft)' : 'var(--c-live)') + ';color:' + (S.shared ? 'var(--c-sel)' : 'var(--c-onLive)') + ';font:inherit;font-size:15px;font-weight:600;cursor:pointer">' + (S.shared ? 'Shared with Installer 1 ✓ · see the installer’s screen' : 'Share my home with Installer 1') + '</button></div></div>';
      return o;
    }
    // step 6 · the proposal, compared with our estimate
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
        o += '<span style="font-size:13px;color:var(--c-sel);font-weight:600">Installer 1 · proposal · Q-2026-0148</span><b style="font-size:22px;font-weight:600">' + P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + '</b>' +
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
      o += '<div style="' + FN.card + ';padding:18px;display:flex;flex-direction:column;gap:10px"><span style="font-size:13px;color:var(--c-gain);font-weight:600">Our independent estimate</span><b style="font-size:22px;font-weight:600">' + FN.money(ours * (1 - u / 100)) + '–' + FN.money(ours * (1 + u / 100)) + ' a year</b><span style="font-size:14px;color:var(--c-ink2);line-height:1.5">Same engine, same bill, same roof as the proposal. ' + (Math.abs(gap) < 60 ? 'The proposal matches it.' : gap > 0 ? 'The proposal saves ' + FN.money(gap) + ' more a year: it changed the system (' + (P.bat ? P.bat + ' kWh battery' : 'no battery') + ', ' + P.n + ' modules).' : 'The proposal saves ' + FN.money(gap) + ' less a year: ' + (P.n < 16 ? 'fewer modules (' + P.n + '), shade from the chimney' : 'a smaller battery or none') + '.') + '</span>' + checks(P) + FN.exportsCard('household') + '<span style="font-size:12px;color:var(--c-muted);margin-top:auto">If another installer had sent a proposal, it would sit here too; installers never see each other’s.</span></div></div>';
      return o;
    }
    function render() {
      sync();
      var s = st.step;
      q('.hh-top').innerHTML = FN.topbar(['My home', '14 Wattle Lane'], STEPS.map(function (l, i) { var ok = done(i) && i !== s, can = reach(i); return '<button type="button" data-a="go" data-v="' + i + '"' + (can ? '' : ' disabled') + ' style="min-height:36px;padding:0 12px;border:none;border-radius:7px;background:' + (i === s ? 'var(--c-paper)' : 'transparent') + ';color:' + (i === s ? 'var(--c-ink)' : can ? (ok ? 'var(--c-gain)' : 'var(--c-ink2)') : 'var(--c-faint)') + ';font:inherit;font-size:13px;font-weight:500;cursor:' + (can ? 'pointer' : 'default') + ';' + (i === s ? 'box-shadow:0 1px 2px rgba(29,32,38,.12)' : '') + '">' + (ok ? '✓ ' : (i + 1) + ' ') + l + (i === 5 && S.proposal && !S.signed ? ' · 1' : '') + '</button>'; }).join(''), '<span style="font-size:12px;color:var(--c-muted)">' + badge() + ' profile · ±' + unc() + ' %</span>' +
        '<button type="button" data-a="bell" aria-label="Notifications' + (S.proposal && !st.seen ? ', 1 new' : '') + '" style="width:40px;height:40px;border:none;border-radius:8px;background:' + (st.bell ? 'var(--c-line2)' : 'transparent') + ';color:var(--c-ink);cursor:pointer;position:relative"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"></path></svg>' + (S.proposal && !st.seen ? '<span style="position:absolute;top:7px;right:7px;width:15px;height:15px;border-radius:8px;background:var(--c-loss);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">1</span>' : '') + '</button>');
      // the proposal arrives: a banner until the household opens it, and the bell's list
      var note = '';
      if (S.proposal && !st.seen && st.step !== 5) note = '<div style="position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:12px;background:var(--c-tip);color:var(--c-paper);border-radius:12px;padding:10px 10px 10px 16px;box-shadow:0 10px 28px rgba(29,32,38,.25);font-size:14px"><span><b>Installer 1 sent you a proposal</b> · ' + P0() + '</span><button type="button" data-a="go" data-v="5" style="min-height:36px;padding:0 14px;border-radius:8px;border:none;background:var(--c-live);color:var(--c-onLive);font:inherit;font-size:13px;font-weight:600;cursor:pointer">See it</button></div>';
      if (st.bell) note += '<div style="position:absolute;right:12px;top:52px;width:320px;' + FN.card + ';box-shadow:0 12px 32px rgba(29,32,38,.16);z-index:9;overflow:hidden"><b style="display:block;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--c-line2)">Notifications</b>' +
        (S.proposal ? '<button type="button" data-a="go" data-v="5" style="display:flex;gap:10px;width:100%;text-align:left;padding:10px 12px;border:none;border-bottom:1px solid var(--c-line2);background:' + (st.seen ? 'transparent' : 'var(--c-selSoft)') + ';color:var(--c-ink);font:inherit;font-size:12px;line-height:1.45;cursor:pointer"><span style="width:3px;border-radius:2px;background:var(--c-live)"></span><span><b style="font-weight:600">Installer 1 sent you a proposal</b><br><span style="color:var(--c-ink2)">' + P0() + ' · compare it with our estimate</span></span></button>' : '') +
        (S.shared ? '<div style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--c-line2);font-size:12px;line-height:1.45"><span style="width:3px;border-radius:2px;background:var(--c-sel)"></span><span><b style="font-weight:600">Installer 1 received your home</b><br><span style="color:var(--c-ink2)">roof, needs as totals and your draft</span></span></div>' : '') +
        (!S.proposal && !S.shared ? '<span style="display:block;padding:12px;font-size:12px;color:var(--c-muted)">Nothing yet. You will hear here when an installer answers.</span>' : '') + '</div>';
      q('.hh-note').innerHTML = note;
      q('.hh-body').innerHTML = [stepPlan, stepProfile, stepRoof, stepNext, stepShare, stepProposal][s]();
      var canNext = (s === 3 ? filled() : done(s)) && s < 5 && (s === 3 || reach(s + 1));
      var hint = ['Pick the plan you take: it stays in your scenario.', 'Connect your meter, use your bill, or tap at least three things about your home.', 'Confirm the three faces, then fill the north face.', 'Add what you want; each move shows its effect on top of the others.', 'Name who receives your home, then share.', S.proposal ? 'Compare, then sign.' : 'The installer works on its own screen.'][s];
      q('.hh-foot').innerHTML = '<button type="button" data-a="back"' + (s ? '' : ' disabled') + ' style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-paper2);color:' + (s ? 'var(--c-ink)' : 'var(--c-faint)') + ';font:inherit;cursor:pointer">Back</button><span style="flex:1;font-size:13px;color:var(--c-ink2)">' + hint + '</span>' +
        (s < 5 ? '<button type="button" data-a="next"' + (canNext ? '' : ' disabled') + ' style="min-height:44px;padding:0 18px;border-radius:10px;border:none;background:' + (canNext ? 'var(--c-live)' : 'var(--c-line)') + ';color:' + (canNext ? 'var(--c-onLive)' : 'var(--c-faint)') + ';font:inherit;font-size:14px;font-weight:600;cursor:' + (canNext ? 'pointer' : 'default') + '">Next · ' + STEPS[s + 1] + '</button>' : '');
      var box = q('.hh-3d'); box.style.display = s === 3 && st.view4 !== 'eq' ? 'block' : 'none'; box.style.top = '141px'; box.style.left = '385px'; box.style.width = '782px'; box.style.height = '542px';
      if (H) { H.size(782, 542); H.setPanels(S.measures.solar ? FN.layout('portrait') : []); H.bat.visible = S.measures.bat; H.car.visible = S.measures.ev; H.hp.visible = S.measures.hp; H.setHour(st.hour); H.useTop = st.top; }
    }
    FN.wire(el, function (a, v) {
      var P = st.prof;
      if (a === 'bell') { st.bell = !st.bell; render(); return; }
      if (a === 'go') { st.step = +v; st.bell = false; if (+v === 5 && S.proposal) st.seen = true; }
      else if (a === 'next') { st.step++; st.max = Math.max(st.max, st.step); }
      else if (a === 'back') st.step = Math.max(0, st.step - 1);
      else if (a === 'plan') { st.chosen = v; S.measures.plan = v !== 'Flat Rate'; }
      else if (a === 'src') { if (v === 'meter') P.consent = true; else if (v === 'bill') { P.busy = 'Reading your bill…'; clearTimeout(tBusy); tBusy = setTimeout(function () { P.busy = ''; P.bill = true; render(); changed(); }, 700); } else P.q = true; }
      else if (a === 'consent') { P.consent = false; P.busy = 'open-energy is reading 12 months of your meter…'; clearTimeout(tBusy); tBusy = setTimeout(function () { P.busy = ''; P.meter = true; render(); changed(); }, 900); }
      else if (a === 'noconsent') P.consent = false;
      else if (a === 'ans') { var p = v.split('|'); P.ans[p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; }
      else if (a === 'season') st.season = v;
      else if (a === 'face') { if (v !== 'S' && !st.conf[v]) st.conf[v] = true; else if (st.tool === 'fill' && v === 'N' && !filled()) st.preview = true; }
      else if (a === 'tool') { st.tool = v; st.preview = false; }
      else if (a === 'keep') { S.measures.solar = true; st.preview = false; }
      else if (a === 'move') S.measures[v] = !S.measures[v];
      else if (a === 'cam') st.top = v === 'top';
      else if (a === 'view4') st.view4 = v;
      else if (a === 'hour') st.hour = +v;
      else if (a === 'play') { if (timer) { clearInterval(timer); timer = null; } else timer = setInterval(function () { st.hour = (st.hour + 1) % 24; render(); }, 650); }
      else if (a === 'who') st.next = +v;
      else if (a === 'share') { if (!S.shared) { S.shared = true; S.sharedAt = 'today'; } }
      else if (a === 'sign') { if (S.proposal) S.signed = true; }
      else if (a === 'qopen') { st.qopen = true; var ks = FN.SECTIONS.map(function (x) { return x[0]; }); st.qs = ks.filter(function (k) { return !st.qseen[k]; })[0] || st.qs; }
      else if (a === 'qclose') st.qopen = false;
      else if (a === 'qs') { st.qopen = true; st.qs = v; }
      else if (a === 'qnext' || a === 'qprev') { var ks2 = FN.SECTIONS.map(function (x) { return x[0]; }), j = ks2.indexOf(st.qs); st.qs = ks2[Math.max(0, Math.min(ks2.length - 1, j + (a === 'qnext' ? 1 : -1)))]; }
      else if (a === 'export') { if (S.proposal) FN.exportQuote(v, S.proposal); return; }
      render(); changed();
    });
    render();
    FN.three(q('.hh-canvas'), function (h3) { H = h3; H.radius = 40; H.place(); render(); });
    return { render: render };
  };

  all('figure.bk-widget[data-widget="journey"]').forEach(function (fig) {
    FN.when(fig, function () {
      var F = FN.frames(fig), S = { plan: '', profile: { badge: 'Estimated', unc: 30 }, measures: { plan: false, solar: false, hp: false, ev: false, bat: false }, shared: false, opened: false, sharedAt: '', proposal: null, signed: false };
      var hh = null, ins = {};
      function band() {
        var fr = F.fr, t = S.signed ? (fr ? '↑ Proposition signée · le site garde la trace du système à poser' : '↑ Proposal signed · the site keeps a record of the system to install')
          : S.proposal ? (fr ? '↑ Proposition envoyée · elle arrive sur le site du ménage, étape 6' : '↑ Proposal sent · it lands on the household’s site, step 6')
          : S.shared ? (fr ? '↓ Site partagé · il arrive dans la boîte de l’installateur' : '↓ Site shared · it lands in the installer’s inbox')
          : (fr ? 'Le ménage avance étape par étape ; à l’étape 5, il partage son site avec l’installateur.' : 'The household moves step by step; at step 5 it shares its site with the installer.');
        F.band.innerHTML = '<span class="' + (S.shared ? 'on' : '') + '">' + t + '</span>';
      }
      function changed() { band(); if (ins.render) ins.render(); if (hh) hh.render(); }
      hh = FN.household(F.a, S, function () { band(); if (ins.render) ins.render(); });
      FN.studio(F.b, { site: S, api: ins, onChange: function () { band(); hh.render(); } });
      band();
    });
  });
  /* ---------- the quote: one document, read by both screens of the journey (design/funnels) ---------- */
  // The installer builds it in the studio's Proposal tab, the household reads and signs it at step 6.
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
    var c = { modules: d.n * mod.price * 1.18, inverter: inv.price * 1.18, battery: d.bat ? (1100 + 790 * d.bat) * 1.18 : 0, charger: d.ev ? 1400 * 1.18 : 0, install: (1800 + 60 * d.n) * 1.18 };
    var stc = FN.stcSolar(d.kwp), bc = d.bat ? FN.batteryCerts(d.bat) : 0;
    var lines = [[d.n + ' × ' + mod.name, 'price list', c.modules], [inv.name + ' inverter', 'price list', c.inverter]];
    if (d.bat) lines.push([d.bat + ' kWh battery, LFP, VPP-ready', 'price list', c.battery]);
    if (d.ev) lines.push(['Car charger, 7 kW', 'price list', c.charger]);
    lines.push(['Installation and design', 'price list', c.install], [stc + ' solar certificates (STC)', 'open-energy', -stc * FN.STC]);
    if (d.bat) lines.push([bc + ' battery certificates', 'open-energy', -FN.rebate(d.bat)]);
    var o = { plan: 'best', kwp: d.eff, ev: d.ev, hp: d.hp }, solo = FN.sim(o), withB = d.bat ? FN.sim({ plan: 'best', kwp: d.eff, ev: d.ev, hp: d.hp, cap: d.bat }) : solo;
    var self = function (r) { var pv = 0, ex = 0; for (var h = 0; h < 24; h++) { pv += r.pv[h]; ex += r.exp[h]; } return pv ? (pv - ex) / pv : 0; };
    var solarSave = FN.TODAY() - solo.total - (d.ev ? 2044 : 0) - (d.hp ? 520 : 0), batSave = d.bat ? solo.total - withB.total : 0;
    var p = {}; for (var k in d) p[k] = d[k];
    p.mod = mod; p.invP = inv; p.cost = c; p.stc = stc; p.bc = bc; p.lines = lines; p.total = lines.reduce(function (a, l) { return a + l[2]; }, 0);
    p.self0 = self(solo); p.self1 = self(withB); p.solarSave = solarSave; p.batSave = batSave;
    p.payS = (c.modules + c.inverter + c.install - stc * FN.STC) / Math.max(solarSave, 1); p.payB = d.bat ? (c.battery - FN.rebate(d.bat)) / Math.max(batSave, 1) : 0;
    return p;
  };

  // strings: the north face split over the inverter's two MPPT inputs, checked hot and cold
  FN.strings = function (P) {
    var s = FN.SPEC[P.modW], a = Math.ceil(P.n / 2), b = P.n - a, cold = s.voc * (1 + 0.0026 * 25), hot = s.vmp * (1 - 0.0034 * 45);
    return { a: a, b: b, vocA: a * cold, vmpB: b * hot, isc: s.isc * 1.25, ok: a * cold < 600 && b * hot > 80 };
  };

  // the single-line diagram, AS/NZS 5033 on the DC side, AS/NZS 4777.1 at the grid, AS/NZS 5139 for the battery
  FN.sld = function (P, ink, line, soft) {
    ink = ink || '#1D2026'; line = line || '#9C958A'; soft = soft || '#F3F1EC';
    var S = FN.strings(P), box = function (x, y, w, h, t, sub) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + soft + '" stroke="' + ink + '"></rect><text x="' + (x + w / 2) + '" y="' + (y + h / 2 - (sub ? 3 : -4)) + '" font-size="12" font-weight="600" text-anchor="middle" fill="' + ink + '">' + t + '</text>' + (sub ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 12) + '" font-size="10" text-anchor="middle" fill="' + ink + '" opacity=".75">' + sub + '</text>' : ''); };
    var wire = function (d, lab, lx, ly) { return '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="1.6"></path>' + (lab ? '<text x="' + lx + '" y="' + ly + '" font-size="9.5" fill="' + ink + '" opacity=".7">' + lab + '</text>' : ''); };
    var o = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 640 300" font-family="Inter, system-ui, sans-serif" role="img" aria-label="Single-line diagram of the system">';
    o += box(10, 20, 130, 46, 'String 1', S.a + ' × ' + P.modW + ' W · Voc ' + Math.round(S.vocA) + ' V') + box(10, 84, 130, 46, 'String 2', S.b + ' × ' + P.modW + ' W');
    o += wire('M140 43 H190 V64 H210', 'DC 4 mm²', 146, 37) + wire('M140 107 H190 V86 H210');
    o += box(210, 52, 80, 46, 'DC isolator', '2-pole · 600 V') + wire('M290 75 H330', '', 0, 0);
    o += box(330, 40, 120, 70, P.inv + ' kW hybrid', '2 MPPT · AS/NZS 4777.2') + (P.bat ? wire('M390 110 V160', 'DC battery cable', 396, 140) + box(330, 160, 120, 46, P.bat + ' kWh battery', 'LFP · AS/NZS 5139') : '');
    o += wire('M450 75 H480', 'AC 6 mm²', 452, 69) + box(480, 52, 70, 46, 'AC isolator', '') + wire('M550 75 H570 V150', '', 0, 0);
    o += box(500, 150, 130, 50, 'Main switchboard', 'solar main switch · RCBO') + (P.ev ? wire('M500 190 H470 V250', '', 0, 0) + box(400, 250, 120, 40, 'Car charger', '7 kW · own RCBO') : '');
    o += wire('M565 200 V230', '', 0, 0) + box(530, 230, 70, 34, 'Meter', 'import / export') + wire('M565 264 V284 H620', 'grid · export limit 5 kW', 540, 296);
    o += '<text x="10" y="170" font-size="10" fill="' + ink + '" opacity=".75">Cold Voc ' + Math.round(S.vocA) + ' V &lt; 600 V · hot Vmp ' + Math.round(S.vmpB) + ' V &gt; 80 V · ' + (S.ok ? 'strings fit' : 'check the strings') + '</text>';
    o += '<text x="10" y="186" font-size="10" fill="' + ink + '" opacity=".75">Voltage rise 0.9 % · earthing per AS/NZS 3000 · labels per AS/NZS 5033</text>';
    return o + '</svg>';
  };

  // what each section says in one line: read first, the detail under it
  FN.quoteLead = function (key, P) {
    var u = (P.unc || 12) / 100;
    return { cover: 'You can cancel within 10 business days. ' + P.kwp.toFixed(2) + ' kWp' + (P.bat ? ' + ' + P.bat + ' kWh' : '') + ' for ' + FN.money(P.total) + '.',
      system: P.n + ' modules on the north face, ' + Math.round(P.kwp / P.inv * 100) + ' % of a ' + P.inv + ' kW inverter.',
      measures: 'Measured on site: a 15.00 × 10.00 m hip roof at 22°; the array takes ' + FN.arrayBox(P).w.toFixed(2) + ' × ' + FN.arrayBox(P).h.toFixed(2) + ' m.',
      notes: (P.notes || []).length + ' things the installer saw on site and what was done about them.',
      equipment: 'Every product itemised, CEC-listed, with its warranty.',
      wiring: 'Two strings, inside the inverter\'s voltage window, hot and cold.',
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
    o += ['S', 'W', 'E', 'N'].map(function (k) { return '<path d="' + FN.FACES[k] + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') + '" stroke="var(--c-roofLine)"></path>'; }).join('');
    o += '<path d="M234 172 L802 172 L656 340 L380 340 Z" fill="none" stroke="var(--c-sel)" stroke-dasharray="6 5"></path>';
    o += (P.mods || []).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" fill="#2B3A4A" opacity=".55"></rect>'; }).join('');
    if (P.chimney) o += '<rect x="508" y="186" width="24" height="24" fill="#8C7462" stroke="#5E4B3E"></rect><text x="560" y="203" font-size="14" fill="var(--c-ink)">chimney 0.60 m, ' + P.chimney + ' m high</text>';
    o += dim(218, 120, 818, 120, '15.00 m eave', 518, 110) + dim(368, 380, 668, 380, 'ridge 7.50 m', 518, 400) + dim(860, 156, 860, 356, '5.00 m plan · 5.39 m on the slope', 885, 256, true) + dim(150, 156, 150, 556, '10.00 m', 135, 356, true);
    if (A.w) o += dim(A.x0, A.y1 + 30, A.x1, A.y1 + 30, 'array ' + A.w.toFixed(2) + ' m', (A.x0 + A.x1) / 2, A.y1 + 52);
    o += '<text x="234" y="166" font-size="13" fill="var(--c-sel)">0.40 m setback</text><text x="518" y="610" font-size="14" text-anchor="middle" fill="var(--c-muted)">N ↑ · eave height 3.0 m · pitch 22° · tape and inclinometer, 30 Oct 2026</text>';
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
      o += '<svg width="100%" height="200" viewBox="150 120 740 470" role="img" aria-label="Layout of the modules on your roof">' + ['S', 'W', 'E', 'N'].map(function (k) { return '<path d="' + FN.FACES[k] + '" fill="' + (k === 'N' ? 'var(--c-roofN)' : 'var(--c-roof)') + '" stroke="var(--c-roofLine)"></path>'; }).join('') + (P.mods || []).map(function (m) { return '<rect x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="1.5" fill="#2B3A4A" stroke="#55667A"></rect>'; }).join('') + '<text x="518" y="580" font-size="16" text-anchor="middle" fill="var(--c-muted)">N ↑ · our drawing from LiDAR, checked on site 30 Oct 2026</text></svg>';
      o += row('Array', P.n + ' × ' + P.modW + ' W = ' + P.kwp.toFixed(2) + ' kWp, north face, 22° tilt, azimuth 0°', true) + row('Roof', 'concrete tile, single storey · setbacks 0.40 m from every edge') + row('Mounting', 'rail kit for wind region A, terrain category 3, per AS/NZS 1170.2') + row('Shade', P.shaded ? P.shaded + ' modules shaded by the chimney in winter mornings' : 'no shading object on the north face') + row('Inverter sizing', 'panels at ' + Math.round(P.kwp / P.inv * 100) + ' % of the inverter (limit 133 %)') + row('Export limit', '5 kW, set by the network at pre-approval');
    } else if (key === 'measures') {
      var A = FN.arrayBox(P);
      o += FN.measurePlan(P) + row('Roof', 'hip roof, 15.00 × 10.00 m outside the gutters, ridge 7.50 m, eave 3.0 m above the ground') + row('North face', 'trapezoid 15.00 m at the eave, 7.50 m at the ridge, 5.39 m along the slope at 22°') + row('Array', A.w.toFixed(2) + ' × ' + A.h.toFixed(2) + ' m on the slope, inside the 0.40 m setbacks') + row('Checked against', 'the LiDAR faces (fit 0.91): within 6 cm on every edge');
    } else if (key === 'notes') {
      o += (P.notes || []).map(function (n) { return '<div style="display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--c-line2)"><b style="color:' + (n[2] ? 'var(--c-sunText)' : 'var(--c-sel)') + '">' + (n[2] ? '!' : '•') + '</b><span><b style="font-weight:600">' + n[0] + '</b> · ' + n[1] + '</span></div>'; }).join('') || '<span style="font-size:12.5px;color:var(--c-muted)">No note yet.</span>';
    } else if (key === 'equipment') {
      var it = [['Solar modules', P.n + ' × ' + spec.model, P.modW + ' W, ' + spec.eff + ' efficient, Voc ' + spec.voc + ' V, Isc ' + spec.isc + ' A', spec.warranty],
        ['Inverter', P.invP.name + ' · HYB-' + P.inv + 'K', '2 MPPT inputs, 80–550 V, max 600 V DC; AS/NZS 4777.2, CSIP-AUS ready', '10-year product'],
        P.bat ? ['Battery', 'LFP ' + P.bat + ' kWh · BAT-' + P.bat, 'usable ' + P.bat + ' kWh, 5 kW, AS/NZS 5139, VPP-capable', '10 years or 70 % capacity'] : null,
        P.ev ? ['Car charger', 'EVC-7 · single phase', '7 kW, solar-follow mode, own RCBO', '3-year product'] : null,
        ['Mounting', 'RAIL-A tile kit', 'certified for wind region A, AS/NZS 1170.2', '15-year product'],
        ['Protection', 'DC isolator, AC isolator, solar main switch', 'per AS/NZS 5033 and AS/NZS 3000', 'covered by workmanship']].filter(Boolean);
      o += it.map(function (r) { return '<div style="display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:10px;font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--c-line2)"><b style="font-weight:600">' + r[0] + '</b><span>' + r[1] + '<br><span style="color:var(--c-muted);font-size:11.5px">' + r[2] + '</span></span><span style="font-size:11.5px;color:var(--c-ink2)">' + r[3] + '<br><span style="color:var(--c-gain)">✓ CEC-listed, not expired</span></span></div>'; }).join('');
      o += '<span style="font-size:11.5px;color:var(--c-muted);margin-top:6px">Brands and models are placeholders in this prototype; the real quote names each manufacturer and its Australian warranty contact.</span>';
    } else if (key === 'wiring') {
      var s = FN.strings(P);
      o += FN.sld(P, 'var(--c-ink)', 'var(--c-line)', 'var(--c-paper2)');
      o += row('Strings', s.a + ' + ' + s.b + ' modules on two MPPT inputs') + row('Cold open-circuit voltage', Math.round(s.vocA) + ' V at 0 °C, under the 600 V maximum ✓') + row('Hot operating voltage', Math.round(s.vmpB) + ' V at 70 °C cell, above the 80 V start ✓') + row('DC current', s.isc.toFixed(1) + ' A design current per string; 4 mm² solar cable') + row('AC side', '6 mm² to the switchboard, voltage rise 0.9 % (limit 2 %)') + row('Standards', 'AS/NZS 5033 (DC), AS/NZS 4777.1 (grid connection), AS/NZS 5139 (battery), AS/NZS 3000 (wiring rules)');
    } else if (key === 'savings') {
      var max = 1.3, bars = MONTH.map(function (f, i) { var v = P.kwh / 365 * f, hh = f / max * 80; return '<rect x="' + (30 + i * 46) + '" y="' + (96 - hh) + '" width="30" height="' + hh + '" rx="3" fill="var(--c-sun)" opacity=".8"></rect><text x="' + (45 + i * 46) + '" y="' + (90 - hh) + '" font-size="10" text-anchor="middle" fill="var(--c-ink)">' + v.toFixed(0) + '</text><text x="' + (45 + i * 46) + '" y="112" font-size="10" text-anchor="middle" fill="var(--c-muted)">' + 'JFMAMJJASOND'[i] + '</text>'; }).join('');
      o += '<span style="font-size:12px;color:var(--c-muted)">Average daily kWh by month, as the SAA design gives it</span><svg width="100%" height="118" viewBox="0 0 590 118">' + bars + '</svg>';
      o += row('Yearly output', Math.round(P.kwh).toLocaleString('en-AU') + ' kWh, after losses', true) + row('Used in your home', Math.round(P.self0 * 100) + ' % of the solar without battery' + (P.bat ? ', ' + Math.round(P.self1 * 100) + ' % with it' : '')) + row('Savings, on your bill', FN.money(P.save * (1 - u)) + '–' + FN.money(P.save * (1 + u)) + ' a year', true) + row('Solar payback', P.payS.toFixed(1) + ' years, on its own') + (P.bat ? row('Battery payback', P.payB.toFixed(1) + ' years, counted apart from the solar') : '') + row('Assumptions', 'your ' + (P.badge || 'estimated').toLowerCase() + ' profile, ±' + (P.unc || 12) + ' %; your new plan; sunshine varies ±8 % year to year; the car charger is left out of the paybacks') + row('Limitations', 'an estimate, not a guarantee: output depends on weather, shade, tariffs and how you use energy');
    } else if (key === 'price') {
      o += P.lines.map(function (l) { return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 100px 100px;gap:10px;font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--c-line2)"><span>' + l[0] + '</span><span style="color:var(--c-muted)">' + l[1] + '</span><b style="text-align:right;font-weight:600;color:' + (l[2] < 0 ? 'var(--c-gain)' : 'var(--c-ink)') + '">' + (l[2] < 0 ? '−' : '') + FN.money(l[2]) + '</b></div>'; }).join('');
      o += '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;padding:8px 0">You pay, GST included<span>' + FN.money(P.total) + '</span></div>';
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
    if (kind === 'bom') { var rows = [['item', 'model', 'quantity', 'unit', 'price_aud_incl_gst']], sp = FN.SPEC[P.modW]; rows.push(['solar module', sp.model, P.n, 'each', (P.cost.modules / P.n).toFixed(2)], ['hybrid inverter', 'HYB-' + P.inv + 'K', 1, 'each', P.cost.inverter.toFixed(2)]); if (P.bat) rows.push(['battery', 'BAT-' + P.bat, 1, 'each', P.cost.battery.toFixed(2)]); if (P.ev) rows.push(['car charger', 'EVC-7', 1, 'each', P.cost.charger.toFixed(2)]); rows.push(['installation and design', '', 1, 'job', P.cost.install.toFixed(2)], ['solar certificates (STC)', '', P.stc, 'certificate', (-FN.STC).toFixed(2)]); if (P.bat) rows.push(['battery certificates', '', P.bc, 'certificate', (-FN.STC).toFixed(2)]); FN.download('Q-2026-0148-bom.csv', 'text/csv', rows.map(function (r) { return r.map(function (c) { return /[",]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n') + '\n'); }
    if (kind === 'sld') FN.download('Q-2026-0148-single-line.svg', 'image/svg+xml', FN.sld(P));
    if (kind === 'json') FN.download('Q-2026-0148.json', 'application/json', JSON.stringify({ quote: 'Q-2026-0148', date: '2026-10-31', validUntil: '2026-11-07', site: { address: '14 Wattle Lane, Marrickville NSW 2204', network: 'Ausgrid' }, design: { modules: { count: P.n, watts: P.modW, kwp: +P.kwp.toFixed(2), tilt: 22, azimuth: 0 }, inverterKw: P.inv, batteryKwh: P.bat, carCharger: !!P.ev, strings: FN.strings(P) }, yieldKwh: Math.round(P.kwh), lines: P.lines.map(function (l) { return { item: l[0], source: l[1], aud: +l[2].toFixed(2) }; }), totalAud: +P.total.toFixed(2), certificates: { stc: P.stc, battery: P.bc, spotAud: FN.STC }, engine: 'open-energy (prototype)' }, null, 2));
    if (kind === 'print') { var w = window.open('', '_blank'); if (!w) return; var t = FN.tokens(), css = ':root{' + FN.vars(t) + '}body{font:13px/1.45 Inter,system-ui,sans-serif;color:#1D2026;max-width:760px;margin:24px auto;padding:0 16px}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}div,span{box-sizing:border-box}'; w.document.write('<!doctype html><meta charset="utf-8"><title>Quote Q-2026-0148</title><style>' + css + '</style><h1 style="font-size:20px">Quote Q-2026-0148 · 14 Wattle Lane</h1>' + FN.SECTIONS.map(function (s) { return '<h2>' + s[1] + '</h2><div style="display:flex;flex-direction:column">' + FN.quoteSection(s[0], P) + '</div>'; }).join('')); w.document.close(); w.focus(); w.print(); }
  };
  // the exports card, shared by both screens
  FN.exportsCard = function (who) {
    var b = function (k, t, f) { return '<button type="button" data-a="export" data-v="' + k + '" style="display:flex;justify-content:space-between;align-items:center;min-height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--c-line);background:var(--c-paper2);color:var(--c-ink);font:inherit;font-size:12.5px;cursor:pointer"><span>' + t + '</span><span style="font-size:11px;color:var(--c-muted)">' + f + '</span></button>'; };
    return '<div style="' + FN.card + ';padding:12px 14px;display:flex;flex-direction:column;gap:6px"><b style="font-size:13px;font-weight:600">Files</b>' + b('print', 'Quote, to print or save', 'PDF') + b('sld', 'Single-line diagram', 'SVG') + (who === 'installer' ? b('bom', 'Bill of materials', 'CSV') + b('json', 'Design and quote data', 'JSON') + '<span style="font-size:11px;color:var(--c-muted);line-height:1.4">From the API later: PDF/A with the data embedded, the diagram in DXF, the certificate claim for the REC Registry, the network application.</span>' : '') + '</div>';
  };
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
