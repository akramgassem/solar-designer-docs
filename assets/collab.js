/* Collaboration layer of the private site: annotations on sentences (comment, question,
   link, suggested change), replies, resolve, activity, and the search of the whole book.

   It switches itself on only when the page is served by the private AWS site, where
   /api/me answers for a signed-in reader. Opened from disk or from the encrypted GitHub
   Pages copy, it does nothing. Annotations are anchored by the exact quote with a few
   words before and after, so they find their sentence again after the book is rebuilt;
   one that cannot be found is listed as detached in the panel. */
(function () {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  var doc = document, root = doc.documentElement;
  var T = {
    en: {
      annotate: 'Annotate', comment: 'Comment', question: 'Question', link: 'Link', suggestion: 'Suggest a change',
      kinds: { comment: 'Comment', question: 'Question', link: 'Link', suggestion: 'Suggestion' },
      text: 'Your comment', url: 'Link (address or book page)', replacement: 'Proposed text', save: 'Save', cancel: 'Cancel',
      reply: 'Reply', send: 'Send', resolve: 'Resolve', reopen: 'Reopen', edit: 'Edit', del: 'Delete', confirmDel: 'Delete this annotation?',
      notes: 'Notes', page: 'This page', open: 'To handle', activity: 'Activity', showResolved: 'Show resolved',
      none: 'No annotation on this page yet. Select a sentence to add one.', noneOpen: 'Nothing waiting.', noneAct: 'No activity yet.',
      detached: 'Detached: the sentence changed', proposed: 'Proposed', current: 'Current', resolved: 'resolved',
      search: 'Search the book', searchPh: 'Search… (Ctrl+K)', noResult: 'No result.', signOut: 'Sign out',
      actions: { created: 'annotated', replied: 'replied on', resolved: 'resolved', reopened: 'reopened', edited: 'edited', deleted: 'deleted',
        'action-created': 'created an action', 'action-edited': 'edited an action', 'action-todo': 'reopened an action', 'action-doing': 'started an action',
        'action-done': 'completed an action', 'action-dropped': 'dropped an action', 'action-deleted': 'deleted an action' },
      mine: 'For me', myActions: 'My actions', mentions: 'Mentioning me', repliesMine: 'Replies to my notes', news: 'New since your last visit',
      nothingMine: 'Nothing for you right now.', makeAction: 'Create an action', actTitle: 'What to do', owner: 'Owner', nobody: 'nobody',
      due: 'Due', serves: 'Serves (D-41, A-03…)', created: 'Action created.', board: 'See the board', newAction: 'New action',
      status: { todo: 'To do', doing: 'In progress', done: 'Done', dropped: 'Dropped' }, fromSite: 'site', asMarkdown: 'Copy as Markdown',
      copiedMd: 'Copied: paste it in a page and give it a number.', noHandle: 'Your account has no handle yet (owner, partner…): actions cannot be assigned to you.',
      error: 'Could not save. Try again.', thisPageOnly: 'This page only', history: 'Page history', lastChange: 'Text last changed on'
    },
    fr: {
      annotate: 'Annoter', comment: 'Commentaire', question: 'Question', link: 'Lien', suggestion: 'Suggérer une modification',
      kinds: { comment: 'Commentaire', question: 'Question', link: 'Lien', suggestion: 'Suggestion' },
      text: 'Votre commentaire', url: 'Lien (adresse ou page du livre)', replacement: 'Texte proposé', save: 'Enregistrer', cancel: 'Annuler',
      reply: 'Répondre', send: 'Envoyer', resolve: 'Résoudre', reopen: 'Rouvrir', edit: 'Modifier', del: 'Supprimer', confirmDel: 'Supprimer cette annotation ?',
      notes: 'Notes', page: 'Cette page', open: 'À traiter', activity: 'Activité', showResolved: 'Afficher les résolues',
      none: 'Aucune annotation sur cette page. Sélectionnez une phrase pour en ajouter une.', noneOpen: 'Rien en attente.', noneAct: 'Pas encore d’activité.',
      detached: 'Détachée : la phrase a changé', proposed: 'Proposé', current: 'Actuel', resolved: 'résolue',
      search: 'Rechercher dans le livre', searchPh: 'Rechercher… (Ctrl+K)', noResult: 'Aucun résultat.', signOut: 'Se déconnecter',
      actions: { created: 'a annoté', replied: 'a répondu sur', resolved: 'a résolu', reopened: 'a rouvert', edited: 'a modifié', deleted: 'a supprimé',
        'action-created': 'a créé une action', 'action-edited': 'a modifié une action', 'action-todo': 'a rouvert une action', 'action-doing': 'a commencé une action',
        'action-done': 'a terminé une action', 'action-dropped': 'a abandonné une action', 'action-deleted': 'a supprimé une action' },
      mine: 'Pour moi', myActions: 'Mes actions', mentions: 'Me mentionnent', repliesMine: 'Réponses à mes notes', news: 'Nouveau depuis votre dernière visite',
      nothingMine: 'Rien pour vous pour l’instant.', makeAction: 'Créer une action', actTitle: 'Ce qu’il faut faire', owner: 'Responsable', nobody: 'personne',
      due: 'Échéance', serves: 'Sert (D-41, A-03…)', created: 'Action créée.', board: 'Voir le tableau', newAction: 'Nouvelle action',
      status: { todo: 'À faire', doing: 'En cours', done: 'Fait', dropped: 'Abandonnée' }, fromSite: 'site', asMarkdown: 'Copier en Markdown',
      copiedMd: 'Copié : collez-le dans une page et donnez-lui un numéro.', noHandle: 'Votre compte n’a pas encore de rôle (owner, partner…) : on ne peut pas vous assigner d’action.',
      error: 'Enregistrement impossible. Réessayez.', thisPageOnly: 'Cette page seulement', history: 'Historique de la page', lastChange: 'Texte modifié le'
    }
  };
  function at(e, sel) { var n = e.target; if (n && n.nodeType !== 1) n = n.parentElement; return n && n.closest ? n.closest(sel) : null; }
  function lang() { return window.courseLang === 'fr' ? 'fr' : 'en'; }
  function t() { return T[lang()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function when(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  var PAGE = decodeURIComponent(location.pathname.replace(/^\//, '')) || 'index.html';
  if (/\/$/.test(PAGE)) PAGE += 'index.html';

  function call(method, path, body) {
    var opt = { method: method, credentials: 'same-origin', headers: {} };
    if (body) { opt.headers['content-type'] = 'application/json'; opt.headers['x-sb'] = '1'; opt.body = JSON.stringify(body); }
    return fetch('/api/' + path, opt).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; });
    });
  }

  var me = null, items = [], marks = {}, showResolved = false, pageInfo = null, people = {}, gitActions = [], mineData = null;
  function rich(s) { return esc(s).replace(/\n/g, '<br>').replace(/(^|[^\w/])@([a-z][\w-]{1,30})/g, '$1<span class="sb-at">@$2</span>'); }

  /* ---------------------------------------------------------------- text and anchors */
  function container() {
    var main = doc.getElementById('bk-content') || doc.body;
    return main.querySelector('article[data-lang="' + lang() + '"]') || main;
  }
  function textNodes(rootEl) {
    var out = [], pos = 0;
    var w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || p.closest('.sb-ui, script, style, svg, .bk-pop, textarea')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n, s = '';
    while ((n = w.nextNode())) { out.push({ node: n, start: pos, end: pos + n.data.length }); pos += n.data.length; s += n.data; }
    return { nodes: out, text: s };
  }
  function sectionOf(node, rootEl) {
    var heads = rootEl.querySelectorAll('h2[id], h3[id]'), id = '';
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) id = heads[i].id; else break;
    }
    return id.replace(/-fr$/, '');
  }
  function selectionQuote() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0), rootEl = container();
    if (!rootEl.contains(range.commonAncestorContainer)) return null;
    var exact = sel.toString().replace(/\s+/g, ' ').trim();
    if (exact.length < 3 || exact.length > 1000) return null;
    var tn = textNodes(rootEl), start = -1, end = -1;
    tn.nodes.forEach(function (x) {
      if (x.node === range.startContainer) start = x.start + range.startOffset;
      if (x.node === range.endContainer) end = x.start + range.endOffset;
    });
    if (start < 0 || end < 0) {
      var i = norm(tn.text).indexOf(norm(exact));
      if (i < 0) return null;
      start = i; end = i + exact.length;
    }
    return {
      exact: tn.text.slice(start, end), prefix: tn.text.slice(Math.max(0, start - 32), start),
      suffix: tn.text.slice(end, end + 32), section: sectionOf(range.startContainer, rootEl), rect: range.getBoundingClientRect()
    };
  }
  function norm(s) { return s.replace(/\s+/g, ' '); }
  function common(a, b, fromEnd) {
    var n = 0, i = 0;
    while (i < a.length && i < b.length) {
      var x = fromEnd ? a[a.length - 1 - i] : a[i], y = fromEnd ? b[b.length - 1 - i] : b[i];
      if (x !== y) break; n++; i++;
    }
    return n;
  }
  function locate(q, tn) {
    var text = tn.text, best = null, score = -1, from = 0, i;
    while ((i = text.indexOf(q.exact, from)) >= 0) {
      var sc = common(text.slice(Math.max(0, i - 32), i), q.prefix || '', true) + common(text.slice(i + q.exact.length, i + q.exact.length + 32), q.suffix || '', false);
      if (sc > score) { score = sc; best = i; }
      from = i + 1;
    }
    if (best === null) {
      // whitespace may differ after a rebuild
      var ns = norm(text), ne = norm(q.exact), j = ns.indexOf(ne);
      if (j < 0) return null;
      var k = 0, m = 0;
      while (m < j && k < text.length) { if (/\s/.test(text[k])) { while (k + 1 < text.length && /\s/.test(text[k + 1])) k++; } k++; m++; }
      best = k;
      return [best, best + q.exact.length];
    }
    return [best, best + q.exact.length];
  }
  function wrap(range, tn, a) {
    var out = [];
    tn.nodes.forEach(function (x) {
      var s = Math.max(range[0], x.start), e = Math.min(range[1], x.end);
      if (s >= e) return;
      var node = x.node;
      if (e - x.start < node.data.length) node.splitText(e - x.start);
      if (s - x.start > 0) node = node.splitText(s - x.start);
      if (!node.data.trim()) return;
      var m = el('mark', 'sb-hl sb-k-' + a.kind + (a.status === 'resolved' ? ' sb-done' : ''));
      m.setAttribute('data-sb', a.id);
      m.setAttribute('tabindex', '0');
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
      out.push(m);
    });
    return out;
  }
  function unwrapAll() {
    Array.prototype.slice.call(doc.querySelectorAll('mark.sb-hl')).forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
    marks = {};
  }
  function render() {
    unwrapAll();
    var rootEl = container();
    items.filter(function (a) { return a.lang === lang() && (showResolved || a.status !== 'resolved'); })
      .forEach(function (a) {
        var tn = textNodes(rootEl), r = locate(a.quote, tn);
        a._detached = !r;
        if (r) marks[a.id] = wrap(r, tn, a);
      });
    renderPanel();
    updateBadge();
  }

  /* ---------------------------------------------------------------- floating UI */
  var fab = el('button', 'sb-ui sb-annotate'); fab.type = 'button'; fab.hidden = true;
  var pop = el('div', 'sb-ui sb-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog');
  var pending = null;

  function placeNear(box, rect) {
    box.style.left = '0px'; box.style.top = '0px';
    var w = box.offsetWidth, h = box.offsetHeight, vw = root.clientWidth, vh = window.innerHeight;
    var left = Math.max(10, Math.min(rect.left, vw - w - 10)), top = rect.bottom + 8;
    if (top + h > vh - 10 && rect.top - h - 8 > 10) top = rect.top - h - 8;
    box.style.left = left + 'px'; box.style.top = Math.max(10, top) + 'px';
  }
  function onSelect() {
    if (!me || !pop.hidden) return;
    var q = selectionQuote();
    if (!q) { fab.hidden = true; return; }
    pending = q;
    fab.textContent = t().annotate;
    fab.hidden = false;
    placeNear(fab, q.rect);
  }
  doc.addEventListener('mouseup', function (e) { if (!at(e, '.sb-ui')) setTimeout(onSelect, 0); });
  doc.addEventListener('keyup', function (e) { if (e.shiftKey && !at(e, '.sb-ui')) onSelect(); });
  doc.addEventListener('selectionchange', function () {
    if (window.matchMedia('(pointer: coarse)').matches) { clearTimeout(onSelect.t); onSelect.t = setTimeout(onSelect, 400); }
  });
  fab.addEventListener('mousedown', function (e) { e.preventDefault(); });
  fab.addEventListener('click', function () { fab.hidden = true; openForm(pending); });

  function openForm(q, a) {
    var L = t(), kind = a ? a.kind : 'comment';
    pop.innerHTML =
      '<p class="sb-quote">« ' + esc(q.exact.length > 160 ? q.exact.slice(0, 160) + '…' : q.exact) + ' »</p>' +
      (a ? '' : '<div class="sb-kinds" role="radiogroup">' + ['comment', 'question', 'link', 'suggestion'].map(function (k) {
        return '<label><input type="radio" name="sb-kind" value="' + k + '"' + (k === kind ? ' checked' : '') + '> ' + esc(L.kinds[k]) + '</label>';
      }).join('') + '</div>') +
      '<textarea class="sb-body" rows="3" placeholder="' + esc(L.text) + '"></textarea>' +
      '<input class="sb-url" type="text" placeholder="' + esc(L.url) + '">' +
      '<textarea class="sb-repl" rows="3" placeholder="' + esc(L.replacement) + '"></textarea>' +
      '<div class="sb-row"><button type="button" class="sb-btn sb-primary sb-save">' + esc(L.save) + '</button>' +
      '<button type="button" class="sb-btn sb-cancel">' + esc(L.cancel) + '</button><span class="sb-msg" role="status"></span></div>';
    var body = pop.querySelector('.sb-body'), url = pop.querySelector('.sb-url'), repl = pop.querySelector('.sb-repl');
    if (a) { body.value = a.body || ''; url.value = a.url || ''; repl.value = a.replacement || ''; }
    else repl.value = q.exact;
    function show() {
      var k = a ? a.kind : pop.querySelector('input[name=sb-kind]:checked').value;
      url.hidden = k !== 'link' && !(a && a.url);
      repl.hidden = k !== 'suggestion';
    }
    show();
    Array.prototype.forEach.call(pop.querySelectorAll('input[name=sb-kind]'), function (r) { r.addEventListener('change', show); });
    pop.querySelector('.sb-cancel').addEventListener('click', closePop);
    pop.querySelector('.sb-save').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      var req = a
        ? call('POST', 'annotations/edit', { page: PAGE, id: a.id, body: body.value, url: url.value, replacement: repl.value })
        : call('POST', 'annotations', {
            page: PAGE, lang: lang(), section: q.section, quote: { exact: q.exact, prefix: q.prefix, suffix: q.suffix },
            kind: pop.querySelector('input[name=sb-kind]:checked').value, body: body.value, url: url.value,
            replacement: pop.querySelector('input[name=sb-kind]:checked').value === 'suggestion' ? repl.value : ''
          });
      req.then(function (r) {
        if (a) items = items.map(function (x) { return x.id === r.item.id ? r.item : x; }); else items.push(r.item);
        closePop(); window.getSelection().removeAllRanges(); render();
        var m = marks[r.item.id]; if (m && m[0]) openThread(r.item, m[0].getBoundingClientRect());
      }).catch(function (e) { btn.disabled = false; pop.querySelector('.sb-msg').textContent = e.message || t().error; });
    });
    pop.hidden = false;
    placeNear(pop, q.rect || { left: 40, top: 80, bottom: 80 });
    body.focus();
  }

  function openThread(a, rect) {
    var L = t(), mine = me && a.author.sub === me.sub;
    var h = '<div class="sb-head"><span class="sb-kind sb-k-' + a.kind + '">' + esc(L.kinds[a.kind]) + '</span>' +
      (a.status === 'resolved' ? ' <span class="sb-state">' + esc(L.resolved) + '</span>' : '') +
      '<button type="button" class="sb-x" aria-label="' + esc(L.cancel) + '">×</button></div>' +
      '<p class="sb-quote">« ' + esc(a.quote.exact.length > 200 ? a.quote.exact.slice(0, 200) + '…' : a.quote.exact) + ' »</p>' +
      '<div class="sb-msgs"><div class="sb-m"><b>' + esc(a.author.name) + '</b> <small>' + esc(when(a.created)) + '</small>' +
      (a.body ? '<p>' + rich(a.body) + '</p>' : '') +
      (a.url ? '<p><a href="' + esc(a.url) + '"' + (/^https?:/.test(a.url) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(a.url) + '</a></p>' : '') +
      (a.replacement ? '<div class="sb-diff"><p><small>' + esc(L.current) + '</small><del>' + esc(a.quote.exact) + '</del></p><p><small>' + esc(L.proposed) + '</small><ins>' + esc(a.replacement) + '</ins></p></div>' : '') +
      '</div>' + a.replies.map(function (r) {
        return '<div class="sb-m"><b>' + esc(r.author.name) + '</b> <small>' + esc(when(r.created)) + '</small><p>' + rich(r.body) + '</p></div>';
      }).join('') + '</div>' +
      '<textarea class="sb-body" rows="2" placeholder="' + esc(L.reply) + '"></textarea>' +
      '<div class="sb-row"><button type="button" class="sb-btn sb-primary sb-send">' + esc(L.send) + '</button>' +
      '<button type="button" class="sb-btn sb-status">' + esc(a.status === 'resolved' ? L.reopen : L.resolve) + '</button>' +
      '<button type="button" class="sb-btn sb-mkact">' + esc(L.makeAction) + '</button>' +
      (mine ? '<button type="button" class="sb-btn sb-edit">' + esc(L.edit) + '</button><button type="button" class="sb-btn sb-del">' + esc(L.del) + '</button>' : '') +
      '<span class="sb-msg" role="status"></span></div>';
    pop.innerHTML = h;
    function done(r) {
      items = items.map(function (x) { return x.id === r.item.id ? r.item : x; });
      render();
      var m = marks[r.item.id];
      if (m && m[0]) openThread(r.item, m[0].getBoundingClientRect()); else closePop();
    }
    function err(e) { pop.querySelector('.sb-msg').textContent = e.message || t().error; }
    pop.querySelector('.sb-x').addEventListener('click', closePop);
    pop.querySelector('.sb-send').addEventListener('click', function () {
      var v = pop.querySelector('.sb-body').value.trim(); if (!v) return;
      call('POST', 'annotations/reply', { page: PAGE, id: a.id, body: v }).then(done).catch(err);
    });
    pop.querySelector('.sb-mkact').addEventListener('click', function () {
      actionForm({ title: a.body || a.quote.exact, page: PAGE, annotation: { page: PAGE, id: a.id } }, rect);
    });
    pop.querySelector('.sb-status').addEventListener('click', function () {
      call('POST', 'annotations/status', { page: PAGE, id: a.id, status: a.status === 'resolved' ? 'open' : 'resolved' }).then(done).catch(err);
    });
    if (mine) {
      pop.querySelector('.sb-edit').addEventListener('click', function () { openForm({ exact: a.quote.exact, rect: rect }, a); });
      pop.querySelector('.sb-del').addEventListener('click', function () {
        if (!confirm(t().confirmDel)) return;
        call('POST', 'annotations/delete', { page: PAGE, id: a.id }).then(function () {
          items = items.filter(function (x) { return x.id !== a.id; }); closePop(); render();
        }).catch(err);
      });
    }
    pop.hidden = false;
    placeNear(pop, rect);
  }
  function closePop() { pop.hidden = true; pop.innerHTML = ''; }
  doc.addEventListener('click', function (e) {
    var m = at(e, 'mark.sb-hl');
    if (m) {
      var a = items.filter(function (x) { return x.id === m.getAttribute('data-sb'); })[0];
      if (a) { e.preventDefault(); openThread(a, m.getBoundingClientRect()); }
      return;
    }
    // A button the popover just replaced is no longer in the page: that click was inside.
    if (!pop.hidden && doc.contains(e.target) && !at(e, '.sb-ui')) closePop();
    if (!at(e, '.sb-annotate')) setTimeout(function () { if (window.getSelection().isCollapsed) fab.hidden = true; }, 0);
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePop(); closeSearch(); }
    var m = at(e, 'mark.sb-hl');
    if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); m.click(); }
  });

  /* ---------------------------------------------------------------- side panel */
  var panelBtn = el('button', 'sb-ui sb-notes'); panelBtn.type = 'button';
  var panel = el('aside', 'sb-ui sb-panel'); panel.hidden = true;
  var tab = 'page', openItems = null, activity = null, actThisPage = false;

  function updateBadge() {
    var n = items.filter(function (a) { return a.status === 'open'; }).length;
    var news = mineData ? mineData.news.length : 0;
    panelBtn.innerHTML = '<span>' + esc(t().notes) + '</span>' + (n ? '<b>' + n + '</b>' : '') +
      (news ? '<i class="sb-news" title="' + esc(t().news) + '">' + news + '</i>' : '');
  }
  panelBtn.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderPanel();
  });
  function excerpt(s, n) { s = s || ''; return s.length > n ? s.slice(0, n) + '…' : s; }
  function pageHref(p, id) { return '/' + p + '?lang=' + lang() + (id ? '#sb-' + id : ''); }

  function renderPanel() {
    if (panel.hidden) return;
    var L = t();
    var h = '<div class="sb-tabs" role="tablist">' + [['page', L.page], ['mine', L.mine + (mineData && mineData.news.length ? ' •' : '')], ['open', L.open], ['activity', L.activity]].map(function (x) {
      return '<button type="button" role="tab" aria-selected="' + (tab === x[0]) + '" data-tab="' + x[0] + '">' + esc(x[1]) + '</button>';
    }).join('') + '<button type="button" class="sb-x" aria-label="' + esc(L.cancel) + '">×</button></div><div class="sb-list">';
    if (tab === 'page') {
      var list = items.filter(function (a) { return a.lang === lang() && (showResolved || a.status !== 'resolved'); });
      h += '<label class="sb-check"><input type="checkbox" class="sb-showres"' + (showResolved ? ' checked' : '') + '> ' + esc(L.showResolved) + '</label>';
      h += list.length ? list.map(function (a) {
        return '<button type="button" class="sb-item' + (a._detached ? ' sb-detached' : '') + '" data-id="' + esc(a.id) + '">' +
          '<span class="sb-kind sb-k-' + a.kind + '">' + esc(L.kinds[a.kind]) + '</span> <small>' + esc(a.author.name) + ' · ' + esc(when(a.updated)) +
          (a.replies.length ? ' · ' + a.replies.length + ' ↩' : '') + (a.status === 'resolved' ? ' · ' + esc(L.resolved) : '') + '</small>' +
          '<span class="sb-q">« ' + esc(excerpt(a.quote.exact, 90)) + ' »</span>' +
          (a._detached ? '<span class="sb-warn">' + esc(L.detached) + '</span>' : '') +
          '<span>' + esc(excerpt(a.body || a.url || a.replacement, 140)) + '</span></button>';
      }).join('') : '<p class="sb-empty">' + esc(L.none) + '</p>';
    } else if (tab === 'mine') {
      if (!mineData) { h += '<p class="sb-empty">…</p>'; loadMine(); }
      else h += mineHtml();
    } else if (tab === 'open') {
      if (!openItems) { h += '<p class="sb-empty">…</p>'; call('GET', 'open').then(function (r) { openItems = r.items; renderPanel(); }); }
      else {
        var mine = openItems.filter(function (a) { return a.lang === lang(); });
        h += mine.length ? mine.map(function (a) {
          return '<a class="sb-item" href="' + esc(pageHref(a.page, a.id)) + '"><span class="sb-kind sb-k-' + a.kind + '">' + esc(L.kinds[a.kind]) + '</span> <small>' +
            esc(a.page) + ' · ' + esc(a.author.name) + ' · ' + esc(when(a.updated)) + '</small><span class="sb-q">« ' + esc(excerpt(a.quote.exact, 90)) + ' »</span>' +
            '<span>' + esc(excerpt(a.body || a.url || a.replacement, 140)) + '</span></a>';
        }).join('') : '<p class="sb-empty">' + esc(L.noneOpen) + '</p>';
      }
    } else {
      h += '<label class="sb-check"><input type="checkbox" class="sb-actpage"' + (actThisPage ? ' checked' : '') + '> ' + esc(L.thisPageOnly) + '</label>';
      if (pageInfo && (pageInfo.date || pageInfo.history)) {
        h += '<p class="sb-small">' + (pageInfo.date ? esc(L.lastChange) + ' ' + esc(pageInfo.date) : '') +
          (pageInfo.history ? (pageInfo.date ? ' · ' : '') + '<a href="' + esc(pageInfo.history) + '" target="_blank" rel="noopener">' + esc(L.history) + '</a>' : '') + '</p>';
      }
      if (!activity) { h += '<p class="sb-empty">…</p>'; call('GET', 'activity?limit=100').then(function (r) { activity = r.items; renderPanel(); }); }
      else {
        var acts = activity.filter(function (x) { return !actThisPage || x.page === PAGE; });
        h += acts.length ? acts.map(function (x) {
          return '<a class="sb-item" href="' + esc(pageHref(x.page, x.action === 'deleted' ? '' : x.id)) + '"><small>' + esc(when(x.at)) + '</small>' +
            '<span><b>' + esc(x.author) + '</b> ' + esc(L.actions[x.action] || x.action) + ' <i>' + esc(x.page) + '</i></span>' +
            (x.quote ? '<span class="sb-q">« ' + esc(excerpt(x.quote, 80)) + ' »</span>' : '') + (x.text ? '<span>' + esc(excerpt(x.text, 120)) + '</span>' : '') + '</a>';
        }).join('') : '<p class="sb-empty">' + esc(L.noneAct) + '</p>';
      }
    }
    h += '</div><div class="sb-foot"><span>' + esc(me ? me.name : '') + '</span><a href="/api/auth/logout">' + esc(L.signOut) + '</a></div>';
    panel.innerHTML = h;
    Array.prototype.forEach.call(panel.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () {
        tab = b.getAttribute('data-tab');
        if (tab === 'open') openItems = null;
        if (tab === 'activity') activity = null;
        if (tab === 'mine') { mineData = null; seenSent = false; }
        renderPanel();
      });
    });
    panel.querySelector('.sb-x').addEventListener('click', function () { panel.hidden = true; });
    var sr = panel.querySelector('.sb-showres'); if (sr) sr.addEventListener('change', function () { showResolved = sr.checked; render(); });
    var ap = panel.querySelector('.sb-actpage'); if (ap) ap.addEventListener('change', function () { actThisPage = ap.checked; renderPanel(); });
    Array.prototype.forEach.call(panel.querySelectorAll('button.sb-item'), function (b) {
      b.addEventListener('click', function () { goTo(b.getAttribute('data-id')); });
    });
  }
  function goTo(id) {
    var a = items.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var m = marks[id];
    if (m && m[0]) {
      m[0].scrollIntoView({ block: 'center' });
      setTimeout(function () { openThread(a, m[0].getBoundingClientRect()); }, 250);
    } else {
      openThread(a, { left: 40, top: 90, bottom: 90 });
    }
  }

  /* ---------------------------------------------------------------- for me */
  var seenSent = false;
  function loadMine() {
    return call('GET', 'mine').then(function (r) {
      mineData = r;
      updateBadge();
      renderPanel();
      if (tab === 'mine' && !panel.hidden && !seenSent) { seenSent = true; call('POST', 'seen', {}).catch(function () {}); }
    });
  }
  function actionLine(a, L) {
    return '<a class="sb-item" href="' + esc(a.page ? pageHref(a.page, '') : BOARD) + '"><span><b>' + esc(a.id) + '</b> ' + esc(excerpt(a.title, 120)) + '</span>' +
      '<small>' + esc(L.status[a.status] || a.status) + (a.due ? ' · ⏳ ' + esc(a.due) : '') + (a.refs && a.refs.length ? ' · → ' + esc(a.refs.join(', ')) : '') + '</small></a>';
  }
  function mineHtml() {
    var L = t(), d = mineData, h = '';
    if (!me.handle) h += '<p class="sb-warn">' + esc(L.noHandle) + '</p>';
    var acts = d.actions.concat(gitActions.filter(function (a) {
      return me.handle && a.owners.indexOf(me.handle) >= 0 && (a.status === 'todo' || a.status === 'doing');
    }));
    function section(title, list, fn) { return list.length ? '<p class="sb-sec">' + esc(title) + ' <b>' + list.length + '</b></p>' + list.map(fn).join('') : ''; }
    function ann(a) {
      return '<a class="sb-item" href="' + esc(pageHref(a.page, a.id)) + '"><span class="sb-kind sb-k-' + a.kind + '">' + esc(L.kinds[a.kind]) + '</span> <small>' +
        esc(a.page) + ' · ' + esc(a.author.name) + '</small><span class="sb-q">« ' + esc(excerpt(a.quote.exact, 90)) + ' »</span><span>' + rich(excerpt(a.body, 140)) + '</span></a>';
    }
    h += section(L.news, d.news, function (x) {
      return '<a class="sb-item" href="' + esc(x.page ? pageHref(x.page, x.action.indexOf('action') === 0 || x.action === 'deleted' ? '' : x.id) : BOARD) + '"><small>' + esc(when(x.at)) + '</small>' +
        '<span><b>' + esc(x.author) + '</b> ' + esc(L.actions[x.action] || x.action) + (x.page ? ' <i>' + esc(x.page) + '</i>' : '') + '</span>' +
        (x.quote ? '<span class="sb-q">« ' + esc(excerpt(x.quote, 80)) + ' »</span>' : '') + '</a>';
    });
    h += section(L.myActions, acts, function (a) { return actionLine(a, L); });
    h += section(L.mentions, d.mentions, ann);
    h += section(L.repliesMine, d.replies, ann);
    return h || '<p class="sb-empty">' + esc(L.nothingMine) + '</p>';
  }

  /* ---------------------------------------------------------------- actions */
  var BOARD = '/intent/actions.html';
  function ownerOptions(selected) {
    var L = t();
    return '<option value="">' + esc(L.nobody) + '</option>' + Object.keys(people).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === selected ? ' selected' : '') + '>@' + esc(k) + ' — ' + esc(people[k][lang()] || '') + '</option>';
    }).join('');
  }
  function actionForm(seed, rect) {
    var L = t();
    pop.innerHTML = '<div class="sb-head"><b>' + esc(L.makeAction) + '</b><button type="button" class="sb-x" aria-label="' + esc(L.cancel) + '">×</button></div>' +
      '<textarea class="sb-body sb-a-title" rows="2" placeholder="' + esc(L.actTitle) + '"></textarea>' +
      '<div class="sb-grid"><label>' + esc(L.owner) + '<select class="sb-a-owner">' + ownerOptions(seed.owner || '') + '</select></label>' +
      '<label>' + esc(L.due) + '<input type="date" class="sb-a-due"></label></div>' +
      '<input type="text" class="sb-a-refs" placeholder="' + esc(L.serves) + '">' +
      '<div class="sb-row"><button type="button" class="sb-btn sb-primary sb-a-save">' + esc(L.save) + '</button>' +
      '<button type="button" class="sb-btn sb-cancel">' + esc(L.cancel) + '</button><span class="sb-msg" role="status"></span></div>';
    pop.querySelector('.sb-a-title').value = (seed.title || '').slice(0, 300);
    pop.querySelector('.sb-x').addEventListener('click', closePop);
    pop.querySelector('.sb-cancel').addEventListener('click', closePop);
    pop.querySelector('.sb-a-save').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      var owner = pop.querySelector('.sb-a-owner').value;
      call('POST', 'actions', {
        title: pop.querySelector('.sb-a-title').value, owners: owner ? [owner] : [], due: pop.querySelector('.sb-a-due').value,
        refs: (pop.querySelector('.sb-a-refs').value.match(/[DQA]-\d{2,3}/g) || []), page: seed.page || '', annotation: seed.annotation || null
      }).then(function (r) {
        pop.querySelector('.sb-row').innerHTML = '<span class="sb-msg">' + esc(L.created) + '</span> <a href="' + BOARD + '?lang=' + lang() + '">' + esc(L.board) + '</a>';
        boardAdd(r.item);
        mineData = null;
      }).catch(function (e) { btn.disabled = false; pop.querySelector('.sb-msg').textContent = e.message || L.error; });
    });
    pop.hidden = false;
    placeNear(pop, rect || { left: 40, top: 90, bottom: 90 });
    pop.querySelector('.sb-a-title').focus();
  }
  function markdownLine(a) {
    var box = { todo: ' ', doing: '/', done: 'x', dropped: '-' }[a.status] || ' ';
    return '- [' + box + '] **A-??** ' + a.title + a.owners.map(function (o) { return ' @' + o; }).join('') +
      (a.due ? ' ⏳' + a.due : '') + (a.done && a.status === 'done' ? ' ✅' + a.done : '') + (a.refs.length ? ' → ' + a.refs.join(', ') : '') +
      a.tags.map(function (x) { return ' #' + x; }).join('');
  }
  function cardHtml(a) {
    var L = t(), mine = me && a.author.sub === me.sub;
    return '<a class="bk-card-t" href="' + (a.page ? esc(pageHref(a.page, a.annotation ? a.annotation.id : '')) : '#') + '"><b>' + esc(a.id.slice(0, 8)) + '</b> ' + esc(a.title) + '</a>' +
      '<span class="bk-tk-meta"><span class="sb-site">' + esc(L.fromSite) + '</span>' + a.owners.map(function (o) { return '<span class="bk-tk-who">@' + esc(o) + '</span>'; }).join('') +
      (a.due && (a.status === 'todo' || a.status === 'doing') ? '<span class="bk-tk-due' + (a.due < new Date().toISOString().slice(0, 10) ? ' bk-late' : '') + '">⏳ ' + esc(a.due) + '</span>' : '') +
      a.refs.map(function (r) { return '<span class="bk-tk-ref">→ ' + esc(r) + '</span>'; }).join('') + '</span>' +
      '<span class="sb-card-tools"><select aria-label="' + esc(L.owner) + '" class="sb-c-status">' + ['todo', 'doing', 'done', 'dropped'].map(function (s) {
        return '<option value="' + s + '"' + (s === a.status ? ' selected' : '') + '>' + esc(L.status[s]) + '</option>';
      }).join('') + '</select><button type="button" class="sb-btn sb-c-md">' + esc(L.asMarkdown) + '</button>' +
      (mine ? '<button type="button" class="sb-btn sb-c-del">' + esc(L.del) + '</button>' : '') + '</span>' +
      '<small>' + esc(a.author.name) + ' · ' + esc(when(a.created)) + '</small>';
  }
  var siteActions = [];
  function boardAdd(a) {
    siteActions = siteActions.filter(function (x) { return x.id !== a.id; }).concat([a]);
    boardRender();
  }
  function boardRender() {
    Array.prototype.forEach.call(doc.querySelectorAll('.bk-card.sb-card'), function (c) { c.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll('.bk-board'), function (b) {
      siteActions.forEach(function (a) {
        var col = b.querySelector('[data-col="' + (a.status === 'dropped' ? 'done' : a.status) + '"] ul');
        if (!col) return;
        var li = el('li', 'bk-card sb-card', cardHtml(a));
        li.setAttribute('data-owners', a.owners.join(' '));
        li.setAttribute('data-site', a.id);
        var empty = col.querySelector('.bk-empty'); if (empty) empty.hidden = true;
        col.insertBefore(li, col.firstChild);
      });
    });
  }
  doc.addEventListener('change', function (e) {
    var s = e.target.closest && e.target.closest('.sb-c-status');
    if (!s) return;
    var id = s.closest('[data-site]').getAttribute('data-site');
    call('POST', 'actions/update', { id: id, status: s.value }).then(function (r) { boardAdd(r.item); });
  });
  doc.addEventListener('click', function (e) {
    var b = at(e, '.sb-c-md, .sb-c-del, .sb-newaction');
    if (!b) return;
    if (b.classList.contains('sb-newaction')) { actionForm({ page: '' }, b.getBoundingClientRect()); return; }
    var id = b.closest('[data-site]').getAttribute('data-site'), a = siteActions.filter(function (x) { return x.id === id; })[0];
    if (b.classList.contains('sb-c-md')) {
      var text = markdownLine(a);
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = t().copiedMd; }, function () { window.prompt('', text); });
    } else if (confirm(t().confirmDel)) {
      call('POST', 'actions/delete', { id: id }).then(function () { siteActions = siteActions.filter(function (x) { return x.id !== id; }); boardRender(); });
    }
  });
  function boardStart() {
    var bars = doc.querySelectorAll('.bk-board-bar');
    if (!bars.length) return;
    Array.prototype.forEach.call(bars, function (bar) {
      var bt = el('button', 'sb-ui bk-btn sb-newaction', esc(t().newAction)); bt.type = 'button';
      bar.appendChild(bt);
    });
    doc.addEventListener('langchange', function () {
      Array.prototype.forEach.call(doc.querySelectorAll('.sb-newaction'), function (x) { x.textContent = t().newAction; });
      boardRender();
    });
    call('GET', 'actions').then(function (r) { siteActions = r.items; boardRender(); });
  }

  /* ---------------------------------------------------------------- search */
  var searchBox = el('div', 'sb-ui sb-search'); searchBox.hidden = true;
  var index = null;
  function fold(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'"); }
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch('/search/index.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      index = j.map(function (s) { return { p: s.p, a: s.a, l: s.l, t: s.t, pt: s.pt, x: s.x, ft: fold(s.t), fx: fold(s.x) }; });
      return index;
    });
  }
  function openSearch() {
    var L = t();
    searchBox.innerHTML = '<div class="sb-search-in"><input type="search" placeholder="' + esc(L.searchPh) + '" aria-label="' + esc(L.search) + '"><ol class="sb-results"></ol></div>';
    searchBox.hidden = false;
    var input = searchBox.querySelector('input'), list = searchBox.querySelector('.sb-results'), sel = 0, results = [];
    input.focus();
    loadIndex();
    function run() {
      var q = fold(input.value.trim());
      if (q.length < 2) { list.innerHTML = ''; return; }
      loadIndex().then(function (ix) {
        var terms = q.split(/\s+/).filter(Boolean);
        var res = [];
        ix.forEach(function (s) {
          if (s.l !== lang()) return;
          var score = 0;
          for (var i = 0; i < terms.length; i++) {
            var re = new RegExp('(^|[^a-z0-9])' + terms[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            var inT = (s.ft.match(re) || []).length, inX = (s.fx.match(re) || []).length;
            if (!inT && !inX) return;
            score += inT * 8 + Math.min(inX, 10);
          }
          res.push({ s: s, score: score });
        });
        res.sort(function (a, b) { return b.score - a.score; });
        results = res.slice(0, 30);
        sel = 0;
        list.innerHTML = results.length ? results.map(function (r, i) {
          var fx = r.s.fx, k = fx.indexOf(terms[0]), from = Math.max(0, k - 60);
          var snip = (from ? '…' : '') + r.s.x.slice(from, from + 180) + '…';
          snip = esc(snip);
          terms.forEach(function (term) {
            snip = snip.replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
          });
          return '<li><a href="/' + esc(r.s.p) + '?lang=' + lang() + (r.s.a ? '#' + esc(r.s.a) : '') + '"' + (i === 0 ? ' class="sb-sel"' : '') + '>' +
            '<b>' + esc(r.s.t) + '</b><small>' + esc(r.s.pt) + '</small><span>' + snip + '</span></a></li>';
        }).join('') : '<li class="sb-empty">' + esc(t().noResult) + '</li>';
      });
    }
    input.addEventListener('input', function () { clearTimeout(run.t); run.t = setTimeout(run, 120); });
    input.addEventListener('keydown', function (e) {
      var links = list.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!links.length) return;
        links[sel].classList.remove('sb-sel');
        sel = (sel + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length;
        links[sel].classList.add('sb-sel'); links[sel].scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter' && links[sel]) location.href = links[sel].href;
    });
  }
  function closeSearch() { searchBox.hidden = true; searchBox.innerHTML = ''; }
  searchBox.addEventListener('click', function (e) { if (e.target === searchBox) closeSearch(); });
  doc.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && me) { e.preventDefault(); searchBox.hidden ? openSearch() : closeSearch(); }
  });

  /* ---------------------------------------------------------------- start */
  function start() {
    var tools = doc.querySelector('.bk-tools');
    if (tools) {
      var sb = el('button', 'bk-btn sb-ui sb-find', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>');
      sb.type = 'button';
      function label() { sb.setAttribute('aria-label', t().search); sb.title = t().search + ' (Ctrl+K)'; }
      label();
      doc.addEventListener('langchange', label);
      sb.addEventListener('click', openSearch);
      tools.insertBefore(sb, tools.firstChild);
      var ws = el('a', 'bk-btn sb-ui sb-ws', '');
      ws.href = '/app/index.html';
      function wsLabel() { ws.textContent = lang() === 'fr' ? 'Espace de travail' : 'Workspace'; }
      wsLabel();
      doc.addEventListener('langchange', wsLabel);
      tools.insertBefore(ws, tools.firstChild);
    }
    [fab, pop, panelBtn, panel, searchBox].forEach(function (x) { doc.body.appendChild(x); });
    root.classList.add('sb-on');
    updateBadge();
    call('GET', 'annotations?page=' + encodeURIComponent(PAGE)).then(function (r) {
      items = r.items;
      render();
      var m = /^#sb-(.+)$/.exec(location.hash);
      if (m) goTo(m[1]);
    });
    doc.addEventListener('langchange', function () { closePop(); render(); });
    fetch('/search/pages.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (j) { pageInfo = j[PAGE] || null; }).catch(function () {});
    fetch('/search/people.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (j) { people = j; }).catch(function () {});
    fetch('/search/actions.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (j) { gitActions = j; }).catch(function () {});
    loadMine().catch(function () {});
    boardStart();
  }
  fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (u) { if (u && u.sub) { me = u; start(); } }).catch(function () {});
})();
