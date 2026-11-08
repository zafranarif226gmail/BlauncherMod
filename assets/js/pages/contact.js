/* BLauncher MOD — Contact console: composes a real mailto: (no third-party forms) */
document.addEventListener('DOMContentLoaded', function () {
  /* set your real inbox here once — used by the mail composer */
  const INBOX = 'arifthegamer.contact@gmail.com';

  document.getElementById('cInbox').textContent = INBOX;

  const $ = id => document.getElementById(id);
  $('cf').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('cName').value.trim(), topic = $('cTopic').value, body = $('cBody').value.trim();
    let ok = true;
    if (name.length < 2) { $('cNameErr').textContent = 'Name (2+ chars)'; ok = false; } else $('cNameErr').textContent = '';
    if (body.length < 20) { $('cBodyErr').textContent = 'Message (20+ chars)'; ok = false; } else $('cBodyErr').textContent = '';
    if (!ok) { BFX.toast('Fix the highlighted fields', 'bad'); return; }
    const subject = '[BLauncher MOD] ' + topic + ' — ' + name;
    location.href = 'mailto:' + INBOX +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body + '\n\n---\nSent from BLauncher MOD contact console\nName: ' + name + '\nTopic: ' + topic);
    BFX.toast('Opening your mail app…', 'warn');
  });
});
