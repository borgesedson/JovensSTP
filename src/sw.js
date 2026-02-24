/* eslint-disable no-undef */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

// Set up precaching
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();
clientsClaim();

// CRITICAL: Never cache Cloud Functions - always use network
registerRoute(
    ({ url }) => url.origin === 'https://us-central1-jovens-stp.cloudfunctions.net',
    new NetworkOnly(),
    'POST'
);

// Load Firebase Scripts (compat)
importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js');

// Load config
importScripts('/firebase-config.js');

if (self.firebaseConfig && self.firebaseConfig.messagingSenderId) {
    firebase.initializeApp(self.firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
        console.log('[sw] Background message received', payload);

        // The OS usually displays the notification automatically if 'notification' field is present in payload.
        // If not, we show it manually.
        if (!payload.notification) {
            const title = payload.data?.title || 'JovensSTP';
            const options = {
                body: payload.data?.body || '',
                icon: payload.data?.icon || '/generated-icons/manifest-icon-192.maskable.png',
                data: payload.data
            };
            self.registration.showNotification(title, options);
        }
    });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};

    let url = '/';
    if (data.type === 'incoming_call' || data.type === 'new_message') {
        url = '/chat';
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus().then((c) => {
                        if (c.navigate) return c.navigate(url);
                    });
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
        })
    );
});

// Skip waiting to activate new SW immediately
self.addEventListener('install', () => self.skipWaiting());
