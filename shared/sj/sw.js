// Scramjet's service worker: the controller script does the work, this just asks it which
// requests are its own (everything under this folder's per-tab prefix).
importScripts('controller.sw.js');

// A browser stops an idle service worker and later starts it again with a blank memory: it no
// longer knows which Veil tab it was serving, so it stops answering and the page load falls
// through to the file host (which redirects to raw.githubusercontent.com: "refused to connect").
// The controller script asks tabs to sign up again, but only tabs this worker controls, and
// Veil's own page is outside this folder, so it never hears. This stub fixes that: it asks every
// open tab, and waits for the answer before deciding what to do with the request.
const SCOPE = new URL(registration.scope).pathname;
const OURS = new RegExp('^' + SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z0-9]{3,16}/[a-z0-9]{3,16}/');

// Ask only once per restart: every sign-up replaces the tab's connection to this worker, so a
// second ask would cut off the request that the first one just made possible.
let lastAsk = 0;
async function askTabsToSignUp(retry) {
  const now = Date.now();
  if (!retry && now - lastAsk < 4000) return;
  lastAsk = now;
  for (const c of await clients.matchAll({ includeUncontrolled: true, type: 'window' })) {
    c.postMessage({ $controller$swrevive: {} });
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LOST = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Reconnecting</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#020604;color:#39ff7a;font:15px ui-monospace,Consolas,monospace;text-align:center">' +
  '<div><p style="letter-spacing:.2em">[ VEIL ]</p><p>This tab lost its link to Veil.</p><p>Reload the Veil page (Ctrl+R) and try again.</p></div>';

async function waitThenRoute(event) {
  askTabsToSignUp();
  for (let i = 0; i < 160; i++) { // up to about 8 seconds
    await sleep(50);
    if ($scramjetController.shouldRoute(event)) return $scramjetController.route(event);
    // The controller ignores sign-up requests for its first 5 seconds after a tab opens: ask again.
    if (i === 70) askTabsToSignUp(true);
  }
  return new Response(LOST, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

addEventListener('fetch', (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  } else if (OURS.test(new URL(event.request.url).pathname)) {
    event.respondWith(waitThenRoute(event));
  }
});
