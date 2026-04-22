// Firebase Messaging Service Worker v3.1 — Modern Push with Photos & Diagnostic Logs
// This file lives at /firebase-messaging-sw.js (public/ folder)

self.addEventListener('install', () => {
  console.log('✅ SW: Installing v3.1...');
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Activated!');
  event.waitUntil(self.clients.claim());
});

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Load config from firebase-config.js
try {
  importScripts('/firebase-config.js');
} catch (err) {
  console.warn('Config not found');
}

if (self.firebaseConfig) {
  firebase.initializeApp(self.firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('📩 SW Background Message received:', payload);
    const { senderName, senderPhoto, channelId, type, title: dataTitle, body: dataBody } = payload.data || {};
    
    const title = payload.notification?.title || dataTitle || senderName || 'JovensSTP';
    const body = payload.notification?.body || dataBody || 'Nova mensagem';

    self.registration.showNotification(title, {
      body,
      icon: senderPhoto || '/icon-192.png',
      badge: '/icon-72.png',
      data: { ...payload.data, url: payload.data?.url },
    });
  });

  self.addEventListener('notificationclick', (event) => {
    console.log('🔘 SW: Notification clicked!');
    event.notification.close();

    const data = event.notification.data || {};
    let targetPath = data.url || '/home';
    
    if (data.type === 'blog' || data.type === 'new_blog_post') {
      targetPath = data.url || (data.postId ? `/blog/${data.postId}` : '/blog');
    }

    const absoluteUrl = new URL(targetPath, self.location.origin).href;
    console.log('🚀 SW: Redirecting to:', absoluteUrl);

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ((client.url === absoluteUrl || client.url === absoluteUrl + '/') && 'focus' in client) {
            console.log('🎯 SW: Focusing existing tab');
            return client.focus();
          }
        }
        if (clients.openWindow) {
          console.log('🌐 SW: Opening new window');
          return clients.openWindow(absoluteUrl);
        }
      })
    );
  });
}
