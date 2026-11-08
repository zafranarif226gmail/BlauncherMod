/* BLauncher MOD — Settings wiring */
document.addEventListener('DOMContentLoaded', function () {
  const $ = id => document.getElementById(id);
  const S = BFX.settings.get();

  $('oTheme').checked = S.theme === 'light';
  $('oAnim').checked = S.animations;
  $('oMotion').checked = S.reducedMotion;
  $('oFx').value = S.fx;
  $('oCache').checked = S.cacheEnabled;
  $('oLoader').value = S.loader || 'any';

  $('oTheme').addEventListener('change', e => BFX.settings.save({ theme: e.target.checked ? 'light' : 'dark' }));
  $('oAnim').addEventListener('change', e => BFX.settings.save({ animations: e.target.checked }));
  $('oMotion').addEventListener('change', e => BFX.settings.save({ reducedMotion: e.target.checked }));
  $('oFx').addEventListener('change', e => BFX.settings.save({ fx: e.target.value }));
  $('oLoader').addEventListener('change', e => { BFX.settings.save({ loader: e.target.value }); BFX.toast('Loader saved — compatibility checks updated.'); });

  /* official version list */
  BFX.mcVersions().then(list => {
    const groups = { release: 'Releases (incl. 1.0 → 26.3)', snapshot: 'Snapshots', old_beta: 'Beta', old_alpha: 'Alpha' };
    const sel = $('oMcv');
    sel.innerHTML = Object.keys(groups).map(t =>
      '<optgroup label="' + groups[t] + '">' +
      list.filter(v => v.type === t).slice(0, t === 'release' ? 300 : 40)
        .map(v => '<option value="' + BFX.esc(v.id) + '">' + BFX.esc(v.id) + '</option>').join('') +
      '</optgroup>').join('');
    const cur = (BFX.settings.get().mcVersion || 'latest');
    if ([].some.call(sel.options, o => o.value === cur)) sel.value = cur;
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      BFX.settings.save({ mcVersion: sel.value });
      BFX.toast('Default MC version: ' + sel.value);
    });
  });

  function cacheStats() {
    const st = BFX.cacheStats();
    $('oCacheStat').textContent = st.entries + ' entries · ' + st.kb + ' KB';
  }
  cacheStats();

  $('oCache').addEventListener('change', e => {
    BFX.settings.save({ cacheEnabled: e.target.checked });
    BFX.toast(e.target.checked ? 'API caching on — faster searches.' : 'API caching off.', e.target.checked ? '' : 'warn');
  });

  $('oClear').addEventListener('click', () => {
    const n = BFX.cacheClear(); cacheStats(); BFX.toast(n + ' cache entr' + (n === 1 ? 'y' : 'ies') + ' cleared.');
  });
  $('oWipe').addEventListener('click', () => {
    if (!confirm('Reset EVERYTHING on this device — favorites, submissions, cache (settings kept)?')) return;
    const s = localStorage.getItem('blx_settings') || '';
    localStorage.clear();
    try { if (s) localStorage.setItem('blx_settings', s); } catch (e) {}
    BFX.toast('Local data wiped. Settings kept.');
    BFX.cacheClear(); cacheStats();
    location.href = '/';
  });
});
