/* public/firebase-messaging-sw.js */
/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAlhcCtBwCb2yQA7eoo1d_6o4ZStiZxFjQ",
  authDomain: "family-huddle-2062.firebaseapp.com",
  projectId: "family-huddle-2062",
  messagingSenderId: "897887762238",
  appId: "1:897887762238:web:7e8a5677529e040ccbde6f",
});

const messaging = firebase.messaging();

/** Background handler (when the page is closed/inactive) */
messaging.onBackgroundMessage((payload) => {
  // Expecting payload.notification.{title, body} or payload.data
  const title = payload?.notification?.title || payload?.data?.title || "Family Huddle";
  const body = payload?.notification?.body || payload?.data?.body || "You have a new update";
  const icon = "/favicon.ico"; // put your own icon path if you like

  self.registration.showNotification(title, { body, icon, data: payload?.data || {} });
});

/** (Optional) Click behavior: focus existing window or open root */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      const url = "/";
      for (const c of allClients) {
        if ("focus" in c) {
          c.focus();
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })(),
  );
});
