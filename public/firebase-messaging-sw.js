{\rtf1\ansi\ansicpg1251\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset0 HelveticaNeue;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c1\c1;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 /* public/firebase-messaging-sw.js */\
/* global importScripts, firebase */\
importS\cf2 cripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");\
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");\
\
firebase.initializeApp(\{\
  apiKey: "
\f1\fs26 \cf2 AIzaSyC3gtPDwXXiSwTelOBuTp6P6pIUpE_xY48
\f0\fs24 \cf2 ",\
  authDomain: "family-huddle-15398.firebaseapp.com",\
  projectId: "
\f1\fs26 \cf2 family-huddle-15398
\f0\fs24 \cf2 ",\
  messagingSenderId: "
\f1\fs26 \cf2 926874914730
\f0\fs24 \cf2 ",\
  appId: "
\f1\fs26 \cf2 1:926874914730:web:7b9ec4525a2ce0e48d25d3
\f0\fs24 \cf2 ",\
\});\
\
const messaging = firebase.messaging();\
\
messaging.onBackgroundMessage((payload) => \{\
  const \{ title, body, icon \} = payload.notification || \{\};\
  self.registration.showNotification(title || "Family Huddle", \{\
    body: body || "",\
    icon: icon || "/icons/app-192.png"",\
    data: payload.data || \{\},\
  \});\
\});\
}