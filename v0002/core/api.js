/* global __uv$config, BareMux, $, settings, setStatus */
'use strict';

let ready = null;

function registerWorker() {
  const script = 'a/sw.js' + (settings.ads ? '' : '?ads=0');
  return navigator.serviceWorker.register(script, { scope: __uv$config.prefix });
}

// Where the backend lives. Empty = the same server that served this page.
const BACKEND = (window.V1 || '').replace(/[/]+$/, '') ||
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
const REMOTE = !!window.V1;

// On a static host the access code travels in the link (#k=code) and is remembered in this browser.
let accessKey = '';
if (REMOTE) {
  const m = /[#&]k=([^&]+)/.exec(location.hash);
  try {
    if (m) {
      accessKey = decodeURIComponent(m[1]);
      localStorage.setItem('auth', accessKey);
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      accessKey = localStorage.getItem('auth') || '';
    }
  } catch { /* storage unavailable */ }
}

function connUrl() {
  return BACKEND + (accessKey ? '/k/' + encodeURIComponent(accessKey) : '') + '/t/';
}

// Quick check that the backend is up and accepts us.
function probe(url) {
  return new Promise((resolve) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return resolve(false); }
    const done = (ok) => { clearTimeout(timer); try { ws.close(); } catch { /* ignore */ } resolve(ok); };
    const timer = setTimeout(() => done(false), 8000);
    ws.onopen = () => done(true);
    ws.onerror = () => done(false);
  });
}

async function setup() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.');
  }
  if (!window.isSecureContext) {
    throw new Error('Open this site over https:// (or http://localhost) - it cannot start on plain http.');
  }
  if (!(await probe(connUrl()))) {
    if (REMOTE) $('unlock').hidden = false;
    throw new Error(REMOTE ? 'Could not connect. The server is offline or the access code is wrong.'
      : 'Could not reach the server.');
  }
  $('unlock').hidden = true;
  await registerWorker();

  // window.V3: when set, the transport library's own files live in a different repo.
  const engine = window.V3 || '';
  const asset = (p) => (engine ? engine + p : new URL(p, location.href).pathname);
  const connection = new BareMux.BareMuxConnection(asset('transport/worker.js'));
  await connection.setTransport(asset('networking/index.mjs'), [{ wisp: connUrl() }]);
}

function start() {
  setStatus('Connecting…');
  ready = setup().then(
    () => setStatus('Ready'),
    (err) => { setStatus(err.message, true); throw err; }
  );
  ready.catch(() => {});
}

$('unlock').addEventListener('submit', (e) => {
  e.preventDefault();
  accessKey = $('unlock-code').value.trim();
  try { localStorage.setItem('auth', accessKey); } catch { /* ignore */ }
  $('unlock-code').value = '';
  start();
});
