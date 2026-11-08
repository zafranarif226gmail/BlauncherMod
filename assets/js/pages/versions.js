/* BLauncher MOD — Versions: official Mojang manifest, searchable + paginated */
document.addEventListener('DOMContentLoaded', function () {
  const list = document.getElementById('vlist'), q = document.getElementById('vq'),
    sort = document.getElementById('vsort'), more = document.getElementById('vmore'),
    count = document.getElementById('vcount'), src = document.getElementById('vsrc');
  const PAGE = 60;
  let all = [], shown = 0, tab = '', live = false;

  const LABEL = { release: 'Release', snapshot: 'Snapshot', old_beta: 'Beta', old_alpha: 'Alpha' };

  function filtered() {
    const needle = q.value.trim().toLowerCase();
    let out = all.filter(v => !tab || v.type === tab);
    if (needle) out = out.filter(v => v.id.toLowerCase().indexOf(needle) >= 0);
    if (sort.value === 'old') return out.slice().reverse();
    return out;
  }

  function row(v) {
    return '<div class="vrow"><span class="vid">' + BFX.esc(v.id) + '</span>' +
      '<span class="badge ' + BFX.esc(v.type) + '">' + (LABEL[v.type] || v.type) + '</span>' +
      '<span class="vmeta"><span>' + BFX.date(v.time) + '</span><span>' + BFX.ago(v.time) + '</span></span>' +
      '<span class="act"><a class="btn btn-sm btn-gh" target="_blank" rel="noopener" href="' + BFX.esc(v.url) + '">Changelog &#8599;</a></span>' +
      '</div>';
  }

  function render() {
    const out = filtered();
    count.textContent = BFX.fmt(out.length) + ' versions';
    if (!all.length) { list.innerHTML = '<div class="skel skel-row"></div>'; return; }
    const slice = out.slice(0, shown);
    list.innerHTML = slice.map(row).join('') || '<p class="help center">No versions match that filter.</p>';
    more.style.display = shown < out.length ? 'inline-flex' : 'none';
  }

  q.addEventListener('input', BFX.debounce(() => { shown = PAGE; render(); }, 250));
  sort.addEventListener('change', () => { shown = PAGE; render(); });
  document.querySelectorAll('.tab[data-t]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-t]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    tab = b.dataset.t;
    document.getElementById('moddedPanel').style.display = tab === 'modded' ? '' : 'none';
    if (tab !== 'modded') { shown = PAGE; render(); }
  }));
  more.addEventListener('click', () => { shown += PAGE; render(); });

  BFX.mcVersions().then(vs => {
    if (!vs.length) throw new Error('empty');
    all = vs; shown = PAGE;
    live = vs.length > 900;
    src.innerHTML = live
      ? '<span class="ok">LIVE</span> — Official data from piston-meta.mojang.com (version_manifest_v2)'
      : '<span style="color:var(--amber)">OFFLINE SNAPSHOT</span> — bundled official manifest data (fetched at build time). Refresh online for live data.';
    render();
  }).catch(() => {
    src.innerHTML = '<span style="color:var(--amber)">OFFLINE</span> — no manifest reachable; showing bundled official snapshot.';
    all = [];
    render();
  });
});
