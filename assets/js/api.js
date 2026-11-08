/* BLauncher MOD — API clients + shared UI builders
   Official Modrinth v2 (browser, public CORS API) + CurseForge officially proxied
   server-side via Cloudflare Functions (key never in the frontend). Zero deps. */
window.BFX = window.BFX || {};
(function (mod) {
  'use strict';

  const MR = 'https://api.modrinth.com/v2';
  const CF_PROXY = '/api/curseforge';

  function json(r, url) {
    if (!r.ok) { const e = new Error('HTTP ' + r.status + (url ? ' — ' + url : '')); e.status = r.status; throw e; }
    return r.json();
  }
  mod.setupError = false;

  /* ================= Modrinth ================= */
  mod.mrSearch = function (opts) {
    opts = opts || {};
    const p = new URLSearchParams();
    if (opts.query) p.set('query', opts.query);
    p.set('index', opts.index || 'relevance');
    p.set('limit', String(opts.limit || 20));
    p.set('offset', String(opts.offset || 0));
    const facets = [];
    if (opts.type) facets.push(['project_type:' + opts.type]);
    if (opts.categories && opts.categories.length) facets.push(opts.categories.map(c => 'categories:' + c));
    if (opts.mcv) facets.push(['versions:' + opts.mcv]);
    if (opts.loader) facets.push(['categories:' + opts.loader]);
    if (facets.length) p.set('facets', JSON.stringify(facets));
    const key = 'mr|' + p.toString();
    if (BFX.settings.get().cacheEnabled) {
      const c = BFX.cacheGet(key); if (c) return Promise.resolve(c);
    }
    return BFX.dedupe(key, () =>
      fetch(MR + '/search?' + p.toString(), { headers: { 'Accept': 'application/json' } })
        .then(r => json(r, MR))
        .then(d => { if (BFX.settings.get().cacheEnabled) BFX.cacheSet(key, d, 10 * 60e3); return d; })
    );
  };

  mod.mrProject = function (idOrSlug) {
    const key = 'mrp|' + idOrSlug;
    if (BFX.settings.get().cacheEnabled) { const c = BFX.cacheGet(key); if (c) return Promise.resolve(c); }
    return BFX.dedupe(key, () =>
      fetch(MR + '/project/' + encodeURIComponent(idOrSlug)).then(r => json(r))
        .then(d => { if (BFX.settings.get().cacheEnabled) BFX.cacheSet(key, d, 20 * 60e3); return d; })
    );
  };

  mod.mrBatch = function (ids) {
    if (!ids.length) return Promise.resolve([]);
    const key = 'mrb|' + ids.join(',');
    if (BFX.settings.get().cacheEnabled) { const c = BFX.cacheGet(key); if (c) return Promise.resolve(c); }
    return fetch(MR + '/projects?ids=' + encodeURIComponent(JSON.stringify(ids))).then(json)
      .then(d => { if (BFX.settings.get().cacheEnabled) BFX.cacheSet(key, d, 20 * 60e3); return d; });
  };

  mod.mrVersions = function (id) {
    const key = 'mrv|' + id;
    if (BFX.settings.get().cacheEnabled) { const c = BFX.cacheGet(key); if (c) return Promise.resolve(c); }
    return BFX.dedupe(key, () =>
      fetch(MR + '/project/' + encodeURIComponent(id) + '/version').then(json)
        .then(d => { if (BFX.settings.get().cacheEnabled) BFX.cacheSet(key, d, 15 * 60e3); return d; })
    );
  };

  mod.mrAutocomplete = function (query) {
    return fetch(MR + '/search?' + new URLSearchParams({ query: query, limit: '6' })).then(json);
  };

  /* ============== Minecraft versions (official Mojang piston-meta) ============== */
  mod.mcVersions = function () {
    return BFX.dedupe('mcvers', () =>
      fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
        .then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
        .then(d => {
          const n = d.versions.map(v => ({ id: v.id, type: v.type, time: String(v.releaseTime).slice(0, 10), url: v.url }));
          if (BFX.settings.get().cacheEnabled) BFX.cacheSet('mc|snap', n, 6 * 36e5);
          return n;
        })
        .catch(() => {
          const fb = BFX.cacheGet('mc|snap');
          if (fb) return fb;
          return window.BFX_VERSIONS_FALLBACK || [];
        })
    );
  };

  /* ================= CurseForge (proxied; api key stays server-side) ================= */
  function loaderId(l) { return { forge: 1, quilt: 3, fabric: 4, neoforge: 6 }[l] || null; }

  mod.cfApi = function (path, params) {
    const q = new URLSearchParams(params || {}).toString();
    const url = CF_PROXY + '/' + path.replace(/^\//, '') + (q ? '?' + q : '');
    return BFX.dedupe('cf|' + url, () =>
      fetch(url).then(r => {
        if (r.status === 503 || r.status === 401) {
          return r.json().then(j => ({ error: 'setup', message: j.message || j.error }));
        }
        return json(r, url);
      })
    ).then(d => {
      if (d && d.error === 'setup') {
        mod.setupError = true;
        throw Object.assign(new Error(d.message || 'CURSEFORGE_API_KEY missing'), { setup: true });
      }
      return d;
    });
  };

  mod.cfSearch = function (opts) {
    opts = opts || {};
    const p = {
      gameId: '432',                                   /* official Minecraft game id */
      searchFilter: opts.query || '',
      pageSize: String(opts.limit || 10),
      index: String(Math.max(0, opts.offset || 0)),
      sortField: String(opts.sortField || 2),           /* 2 = popularity (official enum) */
      sortDescending: 'true'
    };
    if (opts.mcv) p.gameVersion = opts.mcv;
    if (opts.cls) p.classId = String(opts.cls);
    const lt = loaderId(opts.loader); if (lt) p.modLoaderType = String(lt);
    if (opts.category) p.categoryId = String(opts.category);
    return mod.cfApi('search', p).then(r => r.data || []);
  };

  mod.cfCategories = function () { return mod.cfApi('categories', { gameId: '432' }).then(r => r.data || []); };
  mod.cfProject = function (id) { return mod.cfApi('projects/' + encodeURIComponent(id)).then(r => r.data); };
  mod.cfFiles = function (id) {
    return mod.cfApi('projects/' + encodeURIComponent(id) + '/files', { pageSize: '12', sort: 'desc' });
  };

  /* ================= Mapping to a shared card shape ================= */
  mod.mapMR = function (h) {
    return {
      id: h.project_id, slug: h.slug, type: h.project_type, title: h.title,
      desc: h.description, icon: h.icon_url || '',
      downloads: h.downloads || 0, follows: h.follows || 0,
      updated: h.date_modified, author: h.author || '',
      categories: (h.display_categories || []).slice(0, 4),
      source: 'modrinth', url: 'https://modrinth.com/' + h.project_type + '/' + h.slug
    };
  };
  mod.mapCF = function (h) {
    return {
      id: String(h.id), slug: h.slug, type: 'mod', title: h.name,
      desc: h.summary, icon: (h.logo && (h.logo.thumbnailUrl || h.logo.url)) || '',
      downloads: h.downloadCount || 0, follows: h.thumbsUpCount || 0,
      updated: h.dateModified ? h.dateModified.split('.')[0] : '',
      author: (h.authors && h.authors[0] && h.authors[0].name) || '',
      categories: (h.categories || []).slice(0, 3).map(c => c.name),
      gameVersions: h.gameVersion || [],
      source: 'curseforge', url: h.links && h.links.websiteUrl
    };
  };

  /* ================= Universal search ================= */
  mod.universalSearch = function (opts) {
    opts = opts || {};
    const jobs = [];
    if (opts.source !== 'curseforge') jobs.push(
      mod.mrSearch(opts).then(r => ({ total: r.total_hits || 0, items: (r.hits || []).map(mod.mapMR) }))
    );
    if (opts.source !== 'modrinth') jobs.push(
      mod.cfSearch(opts).then(list => ({ total: null, items: list.map(mod.mapCF) }))
        .catch(function (e) { return { setup: true, total: null, items: [] }; })
    );
    return Promise.all(jobs).then(rs => {
      let items = [], setup = false, total = 0;
      rs.forEach(r => {
        if (r.setup) { setup = true; return; }
        if (r.total !== null && r.total > total) total = r.total;
        items = items.concat(r.items);
      });
      return { items: items, setup: setup, total: total };
    });
  };

  /* ================= Shared card UI ================= */
  mod.fallbackIcon = function (title) {
    title = title || '?';
    let h = 0; for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',60%,42%)"/><stop offset="1" stop-color="hsl(' + ((hue + 70) % 360) + ',65%,26%)"/>' +
      '</linearGradient></defs><rect width="96" height="96" fill="url(#g)"/>' +
      '<path d="M0 24h24v24H0zM72 0v24H48V0zM48 48h24v24H48zM0 72h24v24H0z" fill="rgba(0,0,0,.30)"/>' +
      '</svg>');
  };

  mod.cardHtml = function (m) {
    const ic = m.icon ? esc(m.icon) : mod.fallbackIcon(m.title);
    return '<article class="card" data-mid="' + esc(m.source) + ':' + esc(m.id) + '">' +
      '<div class="top"><img class="ic" loading="lazy" decoding="async" src="' + ic + '" alt="' + esc(m.title) + '" onerror="this.onerror=null;this.src=BFX.fallbackIcon(this.alt)">' +
      '<div><h3>' + esc(m.title) + '</h3><div class="meta">' +
      '<span>&#8881; ' + BFX.fmt(m.downloads) + '</span>' +
      '<span>&#9829; ' + BFX.fmt(m.follows) + '</span>' +
      '<span class="badge ' + esc(m.type) + '">' + esc(m.type) + '</span>' +
      '<span>' + BFX.ago(m.updated) + '</span>' +
      '</div></div></div>' +
      '<p class="desc">' + esc(m.desc) + '</p>' +
      '<div class="row">' +
      '<span class="count-pill">' + esc(m.source) + '</span>' +
      '<button class="btn btn-sm btn-p" data-act="detail">Details</button>' +
      '<button class="btn btn-sm btn-gh" data-act="fav" title="Save to Favorites">&#9733; Fav</button>' +
      '<a class="btn btn-sm btn-gh" target="_blank" rel="noopener" href="' + esc(m.url || '#') + '">Official &#8599;</a>' +
      '</div></article>';
  };

  /* grid delegation: detail / fav / download-lite */
  mod.bindCards = function (root, onDetail) {
    if (!root || root.__bound) return; root.__bound = true;
    root.addEventListener('click', e => {
      const card = e.target.closest('.card'); if (!card) return;
      const [source, id] = (card.dataset.mid || ':').split(':');
      const act = e.target.closest('[data-act]');
      const title = (card.querySelector('h3') || {}).textContent || 'Mod';
      const icon = (card.querySelector('.ic') || {}).currentSrc || '';
      if (act) {
        if (act.dataset.act === 'fav') {
          e.preventDefault();
          const on = BFX.fav.toggle({ id, type: source === 'curseforge' ? 'curseforge' : 'modrinth', name: title, icon, source });
          BFX.toast(on ? 'Saved to Favorites — ' + title : 'Removed from Favorites');
        } else if (act.dataset.act === 'detail') {
          e.preventDefault();
          mod.detail.open(source, id, { title, icon });
        }
      }
    });
  };

  function setupWarn() {
    document.querySelectorAll('.cfwarn').forEach(el => {
      el.classList.remove('hidden');
      el.innerHTML = '<strong>CurseForge API not configured.</strong> The official server proxy needs a <code>CURSEFORGE_API_KEY</code> — ' +
        'see the About page or API_SETUP.md. Modrinth browsing works fully meanwhile.';
    });
  }
  mod.setupWarn = setupWarn;

  /* ================= Detail modal (both sources) ================= */
  const stripMD = s => String(s || '')
    .replace(/```([\s\S]*?)```/g, '\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_>|~]/g, '')
    .replace(/\r/g, '')
    .trim();

  mod.detail = {
    open(source, id, ctx) {
      ctx = ctx || {};
      let box = document.getElementById('modalBox');
      if (!box) {
        box = document.createElement('div'); box.id = 'modalBox'; box.className = 'modal';
        box.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true"><div class="modal-head">' +
          '<div class="modal-close"><button class="icon-btn" data-close aria-label="Close">✕</button></div>' +
          '<img id="xIcon" alt=""><div style="margin-right:48px"><h3 id="xTitle">Loading…</h3>' +
          '<div id="xMeta" class="stats-line"></div></div></div>' +
          '<div class="modal-body"><div id="xBody"></div></div></div>';
        document.body.appendChild(box);
        box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-close]')) mod.detail.close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') mod.detail.close(); });
      }
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
      const t = document.getElementById('xTitle'), meta = document.getElementById('xMeta'),
        body = document.getElementById('xBody'), ic = document.getElementById('xIcon');
      const S = BFX.settings.get();
      if (source === 'modrinth') {
        Promise.all([mod.mrProject(id), mod.mrVersions(id)]).then(([p, vs]) => {
          if (ic) ic.src = p.icon_url || mod.fallbackIcon(p.title);
          t.textContent = p.title;
          meta.innerHTML = '<span>&#8881; ' + mod.fmt(p.downloads) + ' downloads</span>' +
            '<span>&#9829; ' + mod.fmt(p.follows) + '</span>' +
            '<span class="badge ' + esc(p.project_type) + '">' + esc(p.project_type) + '</span>' +
            (p.source_url ? '<a target="_blank" rel="noopener" href="' + esc(p.source_url) + '">Source &#8599;</a>' : '') +
            '<a target="_blank" rel="noopener" href="' + esc(mod.mapMR(p).url) + '">Modrinth page &#8599;</a>';
          const gal = (p.gallery || []).slice(0, 6).map(g =>
            '<a href="' + esc(g.url) + '" target="_blank" rel="noopener"><img loading="lazy" decoding="async" src="' + esc(g.url) + '" alt="' + esc(g.title || '') + '"></a>').join('');
          const rows = vs.slice(0, 12).map(v => {
            const size = (v.files && v.files[0]) ? v.files[0].size : 0;
            const prim = (v.files.filter(f => f.primary)[0] || v.files[0] || {}).url || '#';
            const compat = (v.game_versions || []).includes(S.mcVersion);
            const lcomp = S.loader === 'any' || S.loader === '' || (v.loaders || []).includes(S.loader);
            const relUrl = 'https://modrinth.com/' + p.project_type + '/' + p.slug + '/version/' + encodeURIComponent(v.version_number);
            return '<div class="vrow"><span class="vid">' + esc(v.version_number) + '</span>' +
              '<span class="vmeta"><span class="badge ' + esc(v.version_type) + '">' + esc(v.version_type) + '</span>' +
              '<span>' + esc((v.loaders || []).join(' + ')) + '</span>' +
              '<span>MC ' + esc((v.game_versions || []).slice(-1)[0] || '') + (compat ? '' : ' (untested on ' + esc(S.mcVersion) + ')') + '</span>' +
              '<span>' + mod.fmtBytes(size) + '</span><span>' + BFX.ago(v.date_published) + '</span></span>' +
              '<span class="act">' + (compat && lcomp ? '' : '<span class="badge beta">compat?</span>') +
              '<a class="btn btn-sm btn-p" href="' + esc(prim) + '" download rel="noopener" title="Official Modrinth download">Download</a>' +
              '<a class="btn btn-sm btn-gh" target="_blank" rel="noopener" href="' + esc(relUrl) + '">Info</a>' +
              '</span></div>';
          }).join('');
          body.innerHTML = mod.chipRow(p) +
            (p.body ? '<details class="mt-s jv"><summary>Full description (from Modrinth)</summary><div class="prose" style="color:var(--muted);max-height:300px;overflow:auto;margin-top:8px">' + esc(stripMD(p.body)).slice(0, 5000) + '</div></details>' : '') +
            (gal ? '<h3 class="mt" style="font-size:.8rem;letter-spacing:1px">GALLERY</h3><div class="gal mt-s">' + gal + '</div>' : '') +
            '<h3 class="mt" style="font-size:.8rem;letter-spacing:1px">VERSION HISTORY</h3>' +
            (rows || '<p class="help">No published versions yet.</p>') +
            '<p class="help mt-s">Official data &amp; downloads are served directly by Modrinth.</p>';
        }).catch(e => { body.innerHTML = '<div class="warnbox">Could not load project: ' + esc(e.message) + '</div>'; });
      } else if (source === 'curseforge') {
        Promise.all([mod.cfProject(id), mod.cfFiles(id).catch(() => [])]).then(([p, files]) => {
          if (ic) ic.src = (p.logo && (p.logo.thumbnailUrl || p.logo.url)) || mod.fallbackIcon(p.name || ctx.title);
          t.textContent = p.name || ctx.title;
          meta.innerHTML = '<span>&#8881; ' + mod.fmt(p.downloadCount) + ' downloads</span>' +
            '<span>&#9829; ' + mod.fmt(p.thumbsUpCount) + '</span>' +
            (p.websiteUrl ? '<a target="_blank" rel="noopener" href="' + esc(p.websiteUrl) + '">CurseForge page &#8599;</a>' : '') +
            '<span>Updated ' + BFX.ago(p.dateModified) + '</span>';
          const rows = (files.list || files).slice(0, 12).map(f => {
            const rt = { 1: ['release', 'release'], 2: ['beta', 'beta'], 3: ['alpha', 'alpha'] }[f.releaseType] || ['snapshot', 'snapshot'];
            const compat = (f.gameVersions || []).indexOf(S.mcVersion) >= 0;
            return '<div class="vrow"><span class="vid">' + esc(f.displayName) + '</span>' +
              '<span class="vmeta"><span class="badge ' + rt[0] + '">' + rt[1] + '</span>' +
              '<span>' + mod.fmtBytes(f.fileLength) + '</span>' +
              '<span>MC ' + esc((f.gameVersions || []).slice(-2).join(', ')) + (compat ? '' : ' (untested on ' + esc(S.mcVersion) + ')') + '</span>' +
              '<span>' + BFX.ago(f.fileDate) + '</span></span>' +
              '<span class="act">' + (compat ? '' : '<span class="badge beta">compat?</span>') +
              '<a class="btn btn-sm btn-p" href="' + esc(f.downloadUrl || '#') + '" target="_blank" rel="noopener">Download</a>' +
              '</span></div>';
          }).join('');
          body.innerHTML = '<div class="tagchips mb-s">' + (p.gameVersionLatestFiles ? '' : (p.gameVersion || []).slice(0, 5).map(g => '<span class="t">MC ' + esc(g) + '</span>').join('')) + '</div>' +
            '<p class="prose">' + esc(stripMD(p.summary)) + '</p>' +
            '<h3 class="mt" style="font-size:.8rem;letter-spacing:1px">FILES</h3>' +
            (rows || '<p class="help">No downloadable files returned.</p>') +
            '<p class="help mt-s">Official CurseForge data via server proxy.</p>';
        }).catch(e => {
          const msg = e.setup ? 'CurseForge API is not configured on this server yet (CURSEFORGE_API_KEY needed). See About → API Setup.' : e.message;
          body.innerHTML = '<div class="warnbox">' + esc(msg) + '</div>';
        });
      }
    },
    close() {
      const b = document.getElementById('modalBox');
      if (b) { b.classList.remove('open'); document.body.style.overflow = ''; }
    }
  };

  mod.compatNote = function (ev, mcVer, okGit, okLoader) {
    if (!okGit) BFX.toast('Official download started — file targets a different Minecraft version than your default ' + mcVer, 'warn');
    else if (!okLoader) BFX.toast('Download started — loader differs from your default loader', 'warn');
  };
  mod.chipRow = function (p) {
    return '<div class="tagchips mb-s">' +
      (p.loaders || []).map(l => '<span class="t">' + esc(l) + '</span>').join('') +
      (p.game_versions || []).slice(-4).map(g => '<span class="t">MC ' + esc(g) + '</span>').join('') +
      (p.client_side ? '<span class="t">client: ' + esc(p.client_side) + '</span>' : '') +
      (p.server_side ? '<span class="t">server: ' + esc(p.server_side) + '</span>' : '') +
      '</div>';
  };
})(BFX);
