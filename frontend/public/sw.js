self.addEventListener("push", (event) => {
  let payload = { title: "Managora", body: "You have a new notification." };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_error) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/managora-logo.svg",
      badge: "/managora-logo.svg",
      data: payload.data ?? {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/messages";
  event.waitUntil(clients.openWindow(targetUrl));
});