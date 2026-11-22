// Scramjet's service worker: the controller script does the work, this just asks it which
// requests are its own (everything under this folder's per-tab prefix).
importScripts('controller.sw.js');

addEventListener('fetch', (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
