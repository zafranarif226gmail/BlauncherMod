/* BLauncher MOD — Special: curated Modrinth legends + approved community submissions */
document.addEventListener('DOMContentLoaded', function () {
  /* verified real project IDs (fetched & confirmed at build time) */
  const CURATED = [
    'AANobbMI',  /* Sodium */
    'YL57xq9U',  /* Iris Shaders */
    'P7dR8mSH',  /* Fabric API */
    'LNytGWDc',  /* Create */
    '8oi3bsk5',  /* Terralith */
    'uCdwusMi',  /* Distant Horizons */
    'HVnmMxH1',  /* Complementary Shaders - Reimagined */
    '50dA9Sha',  /* Fresh Animations */
    'u6dRKJwZ'   /* Just Enough Items (JEI) */
  ];
  const BOX = document.getElementById('curated');

  BFX.mrBatch(CURATED).then(list => {
    if (!list || !list.length) return BOX.innerHTML = '<p class="help">Modrinth unreachable — refresh to retry.</p>';
    BOX.innerHTML = list.map(p => BFX.mapMR(p)).map(BFX.cardHtml).join('');
    BFX.bindCards(BOX);
  }).catch(() => {
    BOX.innerHTML = '<p class="help">Could not reach Modrinth right now. Check your connection.</p>';
  });

  /* community spotlight — approved submissions from the local review queue */
  const COMM = document.getElementById('comm'), EMPTY = document.getElementById('commEmpty');
  function render() {
    const subs = BFX.subs.approved();
    COMM.innerHTML = subs.map(BFX.subCard).join('');
    EMPTY.textContent = subs.length ? '' : 'No approved community submissions yet. Be the first — hit "Submit yours".';
  }
  document.addEventListener('blx:subs', render);
  render();
});
