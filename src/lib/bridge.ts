/**
 * The small script placed at the top of every puzzle the site shows.
 * It gives the puzzle a `window.CK` object and reports back to the site:
 *   CK.started()                              first tap (also detected automatically)
 *   CK.completed({ time_ms, mistakes, hints }) solved (also detected from brandFinish())
 *   CK.shared('whatsapp' | 'facebook' | 'instagram' | 'copy' | 'native')
 *   CK.link                                   the short link to put in share messages
 * Share buttons are also detected automatically from WhatsApp / Facebook / Instagram links.
 */
export function bridgeScript(shortLink: string): string {
  const js = `(function(){
  if (window.CK) return;
  var post = function(m){ m.__ck = 1; try { parent.postMessage(m, '*'); } catch(e) {} };
  var started = false, done = false, explicitShareAt = 0;
  function start(){ if (started) return; started = true; post({ type: 'started' }); }
  function chan(u){ u = String(u || '');
    if (/wa\\.me|whatsapp/i.test(u)) return 'whatsapp';
    if (/facebook\\.com|fb\\.me/i.test(u)) return 'facebook';
    if (/instagram/i.test(u)) return 'instagram';
    return null; }
  var lastShareAt = 0;
  function autoShare(c){ var now = Date.now();
    if (!c || now - explicitShareAt < 1500 || now - lastShareAt < 1500) return;
    lastShareAt = now; post({ type: 'shared', channel: c }); }
  function later(c){ setTimeout(function(){ autoShare(c); }, 0); }
  function readStats(){ var o = {};
    try { if (typeof TIMER !== 'undefined' && TIMER && TIMER.total) o.time_ms = Math.round(TIMER.total()); } catch(e) {}
    try { if (typeof BR !== 'undefined' && BR && BR.result) { var r = BR.result() || {};
      if (o.time_ms == null && typeof r.time_ms === 'number') o.time_ms = r.time_ms;
      if (typeof r.mistakes === 'number') o.mistakes = r.mistakes;
      if (typeof r.hints === 'number') o.hints = r.hints; } } catch(e) {}
    return o; }
  window.CK = {
    link: ${JSON.stringify(shortLink)},
    started: start,
    completed: function(d){ if (done) return; done = true; d = d || {}; var s = readStats();
      post({ type: 'completed', time_ms: d.time_ms != null ? d.time_ms : s.time_ms,
             mistakes: d.mistakes != null ? d.mistakes : s.mistakes, hints: d.hints != null ? d.hints : s.hints }); },
    shared: function(c){ explicitShareAt = Date.now(); post({ type: 'shared', channel: c || 'other' }); }
  };
  document.addEventListener('pointerdown', start, true);
  document.addEventListener('keydown', start, true);
  function hookFinish(){ var f = window.brandFinish;
    if (typeof f === 'function' && !f.__ck) {
      var w = function(){ var r = f.apply(this, arguments); setTimeout(function(){ window.CK.completed(); }, 60); return r; };
      w.__ck = 1; window.brandFinish = w; } }
  document.addEventListener('DOMContentLoaded', hookFinish);
  window.addEventListener('load', hookFinish);
  var wo = window.open;
  window.open = function(u){ later(chan(u)); return wo.apply(window, arguments); };
  // Runs after the puzzle's own click handlers (which may fill in the link at tap time).
  window.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a,button,[role=button]') : null; if (!el) return;
    var h = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
    var external = /^(https?:|whatsapp:|intent:|fb:|instagram:)/i.test(h);
    var c = chan(h) || chan(el.textContent) || chan(el.getAttribute('aria-label')) || chan(el.id) || chan(el.className);
    if (external && !e.defaultPrevented) { e.preventDefault(); wo.call(window, el.href, '_blank', 'noopener'); }
    if (c) autoShare(c);
  });
  try { if (navigator.share) { var ns = navigator.share.bind(navigator);
    navigator.share = function(d){ later('native'); return ns(d); }; } } catch(e) {}
  try { if (navigator.clipboard && navigator.clipboard.writeText) { var cw = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function(t){ later('copy'); return cw(t); }; } } catch(e) {}
})();`;
  return `<script>${js}</script>`;
}

/** Put <base> (so sounds/images load from the puzzle's folder) and the bridge at the top of <head>. */
export function preparePuzzleHtml(html: string, folderUrl: string, shortLink: string): string {
  // Puzzles built to the Puzzle Standard v1 read SHARE_URL; inside the site they cannot see their own
  // address, so hand them the puzzle's short link.
  html = html.replace(/const SHARE_URL = (['"])\1;/, "const SHARE_URL = (window.CK && window.CK.link) || '';");
  const head = `<base href="${folderUrl.replace(/"/g, '%22')}/">${bridgeScript(shortLink)}`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${head}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`);
  return `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
}
