/* public/firebase-messaging-sw.js */
/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC3gtPDwXXiSwTelOBuTp6P6pIUpE_xY48",
  authDomain: "family-huddle-15398.firebaseapp.com",
  projectId: "family-huddle-15398",
  messagingSenderId: "926874914730",
  appId: "1:926874914730:web:7b9ec4525a2ce0e48d25d3",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Family Huddle", {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
    data: payload.data || {},
  });
});
