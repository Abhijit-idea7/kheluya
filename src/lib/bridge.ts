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
  // Messages from the site, shown inside the puzzle so they are visible in full screen too.
  window.addEventListener('message', function(e){
    var d = e.data; if (e.source !== parent || !d || d.__ckHost !== 1 || d.type !== 'toast') return;
    var old = document.getElementById('ck-toast'); if (old) old.remove();
    var box = document.createElement('div'); box.id = 'ck-toast'; box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;width:min(92vw,440px);box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 16px;background:#DDF0DA;color:#10233F;border:3px solid #10233F;border-radius:18px;box-shadow:0 5px 0 #10233F;font-family:Mukta,"Baloo 2",sans-serif;line-height:1.3;text-align:left';
    var txt = document.createElement('div'); txt.style.cssText = 'flex:1;min-width:0';
    var t1 = document.createElement('div'); t1.style.cssText = 'font-weight:800;font-size:20px'; t1.textContent = String(d.title || '');
    txt.appendChild(t1);
    if (d.sub) { var t2 = document.createElement('div'); t2.style.cssText = 'font-size:17px;margin-top:2px'; t2.textContent = String(d.sub); txt.appendChild(t2); }
    var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', String(d.close || 'Close')); x.textContent = '\u2715';
    x.style.cssText = 'flex:none;width:44px;height:44px;border-radius:12px;border:3px solid #10233F;background:#FFFAF0;color:#10233F;font-size:20px;font-weight:800;cursor:pointer';
    x.onclick = function(){ box.remove(); };
    box.appendChild(txt); box.appendChild(x);
    (document.body || document.documentElement).appendChild(box);
  });
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
