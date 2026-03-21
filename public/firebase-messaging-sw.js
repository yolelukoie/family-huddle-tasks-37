/* public/firebase-messaging-sw.js */
/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBES2a1nZEqfBKk7GkNc5nkFACOe60JV8E",
  authDomain: "family-huddle-app.firebaseapp.com",
  projectId: "family-huddle-app",
  storageBucket: "family-huddle-app.firebasestorage.app",
  messagingSenderId: "508239163662",
  appId: "1:508239163662:web:4192a2e3ca9746bcdea75f",
});

const messaging = firebase.messaging();

/** Background handler (when the page is closed/inactive) */
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "Family Huddle";
  const body = payload?.notification?.body || payload?.data?.body || "You have a new update";
  const icon = "/favicon.ico";
  const data = payload?.data || {};
  
  // Build a route URL based on notification type
  let route = "/";
  const eventType = data.event_type || data.type;
  if (eventType === "assigned" || eventType === "task_assigned") {
    route = data.task_id ? `/tasks?taskId=${data.task_id}` : "/tasks";
  } else if (eventType === "chat_message") {
    route = data.family_id ? `/chat?familyId=${data.family_id}` : "/chat";
  } else if (eventType === "kicked" || eventType === "member_removed") {
    route = "/onboarding";
  }

  self.registration.showNotification(title, { body, icon, data: { ...data, route } });
});

/** Click behavior: navigate to the correct route */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route || "/";
  
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      
      // Try to find an existing window and navigate it
      for (const c of allClients) {
        if ("focus" in c) {
          await c.focus();
          if (c.url && "navigate" in c) {
            await c.navigate(route);
          }
          return;
        }
      }
      
      // No existing window — open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(route);
      }
    })(),
  );
});
