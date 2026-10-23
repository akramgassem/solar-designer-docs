/* Shared language toggle for the key-concepts chapters.
   Same storage key and ?lang= propagation as the rest of the research folder.
   Widgets listen to the "langchange" event on document. */
(function () {
  var KEY = 'sd-lang';
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-fr]'));
  var arias = Array.prototype.slice.call(document.querySelectorAll('[data-fr-aria]'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.lang button'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.topbar nav a, .crumbs a, .pager a'));
  var titleEl = document.querySelector('meta[name="title-fr"]');
  var titles = { en: document.title, fr: titleEl ? titleEl.getAttribute('content') : document.title };
  nodes.forEach(function (n) { n.setAttribute('data-en', n.innerHTML); });
  arias.forEach(function (n) { n.setAttribute('data-en-aria', n.getAttribute('aria-label')); });
  function withLang(h, l) { return h.replace(/[?&]lang=(en|fr)/, '') + '?lang=' + l; }
  function apply(l) {
    window.courseLang = l;
    document.documentElement.lang = l;
    document.title = titles[l];
    nodes.forEach(function (n) { n.innerHTML = n.getAttribute(l === 'fr' ? 'data-fr' : 'data-en'); });
    arias.forEach(function (n) { n.setAttribute('aria-label', n.getAttribute(l === 'fr' ? 'data-fr-aria' : 'data-en-aria')); });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === l)); });
    links.forEach(function (a) { a.setAttribute('href', withLang(a.getAttribute('href'), l)); });
    try { localStorage.setItem(KEY, l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-set')); }); });
  var fromUrl = new URLSearchParams(location.search).get('lang');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  window.courseFmt = function (x, d) { var s = x.toFixed(d); return window.courseLang === 'fr' ? s.replace('.', ',') : s; };
  document.addEventListener('DOMContentLoaded', function () {});
  apply(fromUrl === 'fr' || fromUrl === 'en' ? fromUrl : (stored === 'fr' ? 'fr' : 'en'));
})();
