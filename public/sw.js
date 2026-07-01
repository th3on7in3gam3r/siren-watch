const CACHE_VERSION = "siren-watch-v4";
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/og-image.png",
  "/icons/badge.svg",
  "/yamnet_labels.txt",
  "/pcm-capture-processor.js",
];

const NOTIFICATION_ICON = "/icons/icon-192.png";
const NOTIFICATION_BADGE = "/icons/badge.svg";

const NOTIFICATION_ACTIONS = [
  { action: "open", title: "Open app" },
  { action: "snooze", title: "Snooze 5 min" },
  { action: "dismiss", title: "Dismiss" },
];

function showSirenNotification(payload = {}) {
  const {
    title = "Siren detected",
    body = "Emergency siren pattern detected nearby.",
    tag = "siren-alert",
  } = payload;

  return self.registration.showNotification(title, {
    body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
    tag,
    renotify: true,
    vibrate: [180, 80, 180, 80, 240],
    requireInteraction: true,
    actions: NOTIFICATION_ACTIONS,
    data: { url: "/", ...payload },
  });
}

async function cacheShell() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(SHELL_URLS.filter((url) => url !== "/"));
  try {
    const res = await fetch("/");
    if (res.ok) await cache.put("/", res);
  } catch {
    // offline install — shell URLs still cached
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/") || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    showSirenNotification({
      title: payload.title ?? "Siren Watch alert",
      body:
        payload.body ??
        "Emergency siren detected. Open Siren Watch for details.",
      tag: payload.tag ?? "siren-push",
      ...payload,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;

  if (action === "dismiss") {
    return;
  }

  if (action === "snooze") {
    const until = Date.now() + 5 * 60 * 1000;
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          if (clients.length === 0 && self.clients.openWindow) {
            return self.clients.openWindow("/?snooze=5");
          }
          clients.forEach((client) => {
            client.postMessage({ type: "SNOOZE_ALERTS", until });
          });
        })
    );
    return;
  }

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage({ type: "FOCUS_APP" });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SIREN_ALERT") return;

  event.waitUntil(
    showSirenNotification({
      title: "Siren detected",
      body: event.data.body,
      tag: "siren-alert",
      peakFreq: event.data.peakFreq,
      aiLabel: event.data.aiLabel,
      confidence: event.data.confidence,
    })
  );
});
