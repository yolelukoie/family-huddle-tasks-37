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

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Family Huddle", {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
    data: payload.data || {},
  });
});
