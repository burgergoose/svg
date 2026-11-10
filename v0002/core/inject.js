/* global __uv$config, $, home, browser, frame, settings, saveSettings, applyTheme, SEARCH_ENGINES, THEMES, SHORTCUTS, ready, start */
'use strict';

// Turn what the user typed into a full address, or a search.
function toUrl(input) {
  const text = input.trim();
  if (!text) return '';
  try {
    const u = new URL(text);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch { /* not a full address */ }
  if (!/\s/.test(text) && /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(text)) {
    try { return new URL('https://' + text).href; } catch { /* fall through to search */ }
  }
  return SEARCH_ENGINES[settings.search].replace('%s', encodeURIComponent(text));
}

async function open(input) {
  const url = toUrl(input);
  if (!url) return;
  try {
    await ready;
  } catch {
    return;
  }
  home.hidden = true;
  browser.hidden = false;
  $('bar-address').value = url;
  frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
}

// Show the real (unscrambled) address in the bar as the user clicks around.
function currentUrl() {
  try {
    const loc = frame.contentWindow.location;
    const p = loc.pathname + loc.search + loc.hash;
    if (!p.startsWith(__uv$config.prefix)) return '';
    return __uv$config.decodeUrl(p.slice(__uv$config.prefix.length));
  } catch {
    return '';
  }
}

frame.addEventListener('load', () => {
  const url = currentUrl();
  if (url && document.activeElement !== $('bar-address')) $('bar-address').value = url;
});

$('go').addEventListener('submit', (e) => {
  e.preventDefault();
  open($('address').value);
});

$('bar').addEventListener('submit', (e) => {
  e.preventDefault();
  open($('bar-address').value);
  $('bar-address').blur();
});

$('home-btn').addEventListener('click', () => {
  frame.src = 'about:blank';
  browser.hidden = true;
  home.hidden = false;
  $('address').value = '';
  $('address').focus();
});
$('back-btn').addEventListener('click', () => { try { frame.contentWindow.history.back(); } catch { /* ignore */ } });
$('fwd-btn').addEventListener('click', () => { try { frame.contentWindow.history.forward(); } catch { /* ignore */ } });
$('reload-btn').addEventListener('click', () => { try { frame.contentWindow.location.reload(); } catch { /* ignore */ } });
$('full-btn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
});

// ---------- shortcuts ----------
for (const [name, url] of SHORTCUTS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'shortcut';
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = name[0];
  icon.setAttribute('aria-hidden', 'true');
  b.append(icon, name);
  b.addEventListener('click', () => open(url));
  $('shortcuts').append(b);
}

// ---------- settings panel ----------
for (const [name, color] of Object.entries(THEMES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.theme = name;
  b.style.background = color;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', name);
  b.title = name;
  b.addEventListener('click', () => {
    settings.theme = name;
    saveSettings();
    applyTheme();
  });
  $('set-theme').append(b);
}

$('set-search').value = settings.search;
$('set-ads').checked = settings.ads;
applyTheme();

$('settings-btn').addEventListener('click', () => $('settings').showModal());

$('set-search').addEventListener('change', () => {
  settings.search = $('set-search').value;
  saveSettings();
});

$('set-ads').addEventListener('change', () => {
  settings.ads = $('set-ads').checked;
  saveSettings();
  // Swap the service worker for the blocking / non-blocking version.
  ready = Promise.resolve(ready).catch(() => {}).then(registerWorker);
  ready.catch((err) => setStatus(err.message, true));
});

start();
