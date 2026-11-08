/* BLauncher MOD — shared runtime (vanilla, zero deps) */
window.BFX = (function () {
  'use strict';
  const mod = {};

  /* ---------- storage ---------- */
  const LS = window.localStorage;
  function get(k, d) { try { const v = LS.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } }
  function del(k) { try { LS.removeItem(k); } catch (e) {} }

  /* ---------- cache with TTL + in-flight dedupe ---------- */
  const CK = 'blx_cache_';
  mod.cacheGet = function (key) {
    const e = get(CK + key, null);
    if (!e) return null;
    if (Date.now() > e.ex) { del(CK + key); return null; }
    return e.data;
  };
  mod.cacheSet = function (key, data, ttlMs) { set(CK + key, { data, ex: Date.now() + ttlMs }); };
  mod.cacheClear = function () {
    const kill = [];
    for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && k.indexOf(CK) === 0) kill.push(k); }
    kill.forEach(del); return kill.length;
  };
  mod.cacheStats = function () {
    let n = 0, bytes = 0;
    for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && k.indexOf(CK) === 0) { n++; bytes += (LS.getItem(k) || '').length; } }
    return { entries: n, kb: Math.round(bytes / 1024) };
  };
  const inflight = new Map();
  mod.dedupe = function (key, maker) {
    if (inflight.has(key)) return inflight.get(key);
    const p = maker().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };

  /* ---------- settings ---------- */
  const SKEY = 'blx_settings';
  const defaults = { theme: 'dark', fx: 'ultra', animations: true, reducedMotion: false, cacheEnabled: true, mcVersion: '26.3', loader: 'any', adminHash: '' };
  let settings = Object.assign({}, defaults, get(SKEY, {}));
  function applySettings() {
    const r = document.documentElement;
    r.setAttribute('data-theme', settings.theme);
    r.setAttribute('data-fx', settings.animations ? settings.fx : 'performance');
    r.setAttribute('data-motion', settings.reducedMotion ? 'reduced' : 'motion');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#eef2f7' : '#05070d');
  }
  mod.settings = {
    get: () => settings,
    save(patch) {
      settings = Object.assign({}, settings, patch);
      set(SKEY, settings); applySettings();
      document.dispatchEvent(new CustomEvent('blx:settings'));
    },
    defaults: defaults
  };
  applySettings();

  /* ---------- utils ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  mod.esc = esc;
  mod.debounce = function (fn, ms) {
    let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); };
    f.cancel = () => clearTimeout(t);
    return f;
  };
  mod.fmt = function (n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n / 1e3 >= 100 ? 0 : 1) + 'K';
    return String(n);
  };
  mod.fmtBytes = function (b) {
    if (!b) return '—';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toFixed(b >= 100 || i === 0 ? 0 : 1) + ' ' + u[i];
  };
  mod.ago = function (iso) {
    if (!iso) return '';
    const d = new Date(iso), ms = Date.now() - d.getTime();
    if (isNaN(ms)) return String(iso);
    if (ms < 36e5) return Math.max(1, Math.round(ms / 6e4)) + ' min ago';
    const day = 864e5; let u = ms / day;
    if (u < 30) return Math.round(u) + ' days ago';
    if (u < 365) return Math.round(u / 30) + ' months ago';
    return Math.round(u / 365) + ' years ago';
  };
  mod.date = function (iso) { return iso ? String(iso).slice(0, 10) : ''; };
  mod.toast = function (msg, kind) {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'warn' ? ' warn' : kind === 'bad' ? ' bad' : '');
    t.textContent = msg;
    w.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 3400);
  };

  /* ---------- favorites ---------- */
  const FAV = 'blx_favorites';
  mod.fav = {
    list: () => get(FAV, []),
    has: (id, type) => get(FAV, []).some(f => f.id === id && f.type === type),
    add(fav) {
      const l = get(FAV, []);
      if (!l.some(f => f.id === fav.id && f.type === fav.type)) {
        l.push(fav); set(FAV, l.slice(0, 300));
        document.dispatchEvent(new CustomEvent('blx:favorites'));
      }
    },
    remove(id, type) {
      set(FAV, get(FAV, []).filter(f => !(f.id === id && f.type === type)));
      document.dispatchEvent(new CustomEvent('blx:favorites'));
    },
    toggle(fav) {
      if (this.has(fav.id, fav.type)) { this.remove(fav.id, fav.type); return false; }
      this.add(fav); return true;
    }
  };

  /* ---------- submissions queue (Upload/Publish) ---------- */
  const SUB = 'blx_submissions';
  const SHA = 'blx_abuse_hashes';
  mod.subs = {
    list: () => get(SUB, []),
    add(sub) { const l = get(SUB, []); l.unshift(sub); set(SUB, l.slice(0, 400)); document.dispatchEvent(new CustomEvent('blx:subs')); },
    update(id, patch) { set(SUB, get(SUB, []).map(s => s.id === id ? Object.assign({}, s, patch) : s)); document.dispatchEvent(new CustomEvent('blx:subs')); },
    remove(id) { set(SUB, get(SUB, []).filter(s => s.id !== id)); document.dispatchEvent(new CustomEvent('blx:subs')); },
    approved: () => get(SUB, []).filter(s => s.status === 'approved'),
    ensureNotDup(desc) {           /* lightweight risk check */
      const l = get(SUB, []); return l.some(s => (s.desc + s.title) === desc);
    }
  };

  /* ---------- submission card renderer ---------- */
  mod.subCard = function (s) {
    const typeBadge = '<span class="badge ' + mod.esc(s.type || 'mod') + '">' + mod.esc(s.type || 'mod') + '</span>';
    const img = s.image ? '<img loading="lazy" decoding="async" src="' + mod.esc(s.image) + '" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--border)">' : '';
    return '<article class="card" style="text-align:left">' +
      (img || '') +
      '<div class="top"><div><h3>' + mod.esc(s.title) + '</h3>' +
      '<div class="meta"><span>' + typeBadge + '</span><span class="badge release">approved</span><span>' + mod.esc(s.author || 'Anon') + '</span></div>' +
      '</div></div>' +
      '<p class="desc">' + mod.esc(s.desc) + '</p>' +
      '<div class="tagchips">' +
      '<span class="t">MC ' + mod.esc(s.mcv) + '</span><span class="t">' + mod.esc(s.loader || 'any loader') + '</span>' +
      (s.link ? '<span class="t"><a href="' + mod.esc(s.link) + '" target="_blank" rel="noopener">link &#8599;</a></span>' : '') +
      '</div>' +
      '<div class="meta"><span>Submitted ' + mod.ago(s.ts) + '</span></div>' +
      '</article>';
  };

  /* ---------- nav / header ---------- */
  function initNav() {
    const page = document.body.getAttribute('data-page');
    document.querySelectorAll('.nav a, .mnav a').forEach(a => {
      if (a.getAttribute('data-nav') === page) a.classList.add('active');
    });
    const mb = document.getElementById('menuBtn'), mn = document.getElementById('mnav');
    if (mb && mn) {
      mb.addEventListener('click', () => {
        mn.classList.toggle('open');
        mb.setAttribute('aria-expanded', String(mn.classList.contains('open')));
      });
      mn.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mn.classList.remove('open')));
    }
    const tb = document.getElementById('themeBtn');
    if (tb) {
      const sync = () => { const s = tb.querySelector('span'); if (s) s.textContent = settings.theme === 'light' ? '🌙' : '☀️'; };
      sync();
      tb.addEventListener('click', () => { mod.settings.save({ theme: settings.theme === 'light' ? 'dark' : 'light' }); sync(); });
    }
    document.addEventListener('click', e => {
      if (mn && mn.classList.contains('open') && !mn.contains(e.target) && !mb.contains(e.target)) mn.classList.remove('open');
    });
  }

  /* ---------- lazy images ---------- */
  function initLazy() {
    const imgs = document.querySelectorAll('img[data-src]');
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) { imgs.forEach(el => { el.src = el.dataset.src; }); return; }
    const io = new IntersectionObserver(en => {
      en.forEach(x => {
        if (x.isIntersecting) {
          const el = x.target;
          if (el.dataset.src) { el.src = el.dataset.src; el.removeAttribute('data-src'); }
          if (el.dataset.srcset) { el.srcset = el.dataset.srcset; el.removeAttribute('data-srcset'); }
          io.unobserve(el);
        }
      });
    }, { rootMargin: '260px' });
    imgs.forEach(el => io.observe(el));
  }

  function boot() {
    initNav(); initLazy();
    const y = document.getElementById('fyear'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return mod;
})();
