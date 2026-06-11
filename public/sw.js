self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "BeTheHero", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "BeTheHero", {
      body:  data.body ?? "",
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data:  { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
