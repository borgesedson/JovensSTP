// Firebase Messaging Service Worker (background push handler)
// This file must live at /firebase-messaging-sw.js (public/ folder)
// Uses Firebase compat SDK for SW compatibility.

// Match project Firebase version (compat builds)
/* eslint-disable no-undef */
// Service Worker global scope provides importScripts.
importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js')

// Load public Firebase config (create /public/firebase-config.js with your config)
// Expected to set: self.firebaseConfig = { messagingSenderId: 'XXXXXXX', ...optional }
try {
  importScripts('/firebase-config.js')
} catch (err) {
  // Continue; we'll error below if config is missing
  void err
}

if (!self.firebaseConfig || !self.firebaseConfig.messagingSenderId) {
  console.error('[firebase-messaging-sw] Missing firebaseConfig or messagingSenderId. Create public/firebase-config.js and set self.firebaseConfig.')
} else {
  // Initialize Firebase in SW (full config or just messagingSenderId both work in compat)
  try {
    firebase.initializeApp(self.firebaseConfig)
  } catch (err) {
    // Already initialized or other benign conditions should not break background handler
    void err
  }

  const messaging = firebase.messaging()

  // Handle background messages
  messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw] Background message received', payload)
    
    const notificationTitle = payload.notification?.title || 'JovensSTP'
    const notificationData = payload.data || {}
    
    // Definir som apenas para chamadas
    let soundFile = undefined
    if (notificationData.type === 'incoming_call') {
      soundFile = '/sounds/ringtone.mp3' // Toque de chamada
    }

    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/manifest-icon-192.maskable.png',
      badge: '/manifest-icon-192.maskable.png',
      data: notificationData,
      vibrate: [200, 100, 200],
      requireInteraction: notificationData.type === 'incoming_call',
      tag: notificationData.callId || notificationData.type || 'general',
      ...(soundFile ? { sound: soundFile } : {}),
      actions: []
    }

    // Adicionar ações específicas para chamadas
    if (notificationData.type === 'incoming_call') {
      notificationOptions.actions = [
        { action: 'accept', title: 'Aceitar', icon: '/phone-icon.png' },
        { action: 'decline', title: 'Recusar', icon: '/phone-off-icon.png' }
      ]
    }

    // (Som de notificação desabilitado temporariamente)

    self.registration.showNotification(notificationTitle, notificationOptions)
  })

  // Handle notification clicks
  self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw] Notification clicked', event)
    event.notification.close()

    const notificationData = event.notification.data || {}
    const action = event.action

    // URL para abrir
    let urlToOpen = '/'

    // Definir URL baseado no tipo de notificação
    if (notificationData.type === 'incoming_call') {
      if (action === 'decline') {
        // Apenas fechar - não abrir o app
        return
      }
      // Aceitar ou clique geral na notificação de chamada
      urlToOpen = '/chat'
    } else if (notificationData.type === 'new_message') {
      urlToOpen = '/chat'
    } else if (notificationData.type === 'new_post') {
      urlToOpen = '/'
    }

    // Abrir ou focar a janela
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // Verificar se já há uma janela aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(function(focusedClient) {
              // Navegar para a URL correta
              if (focusedClient.navigate) {
                return focusedClient.navigate(urlToOpen)
              }
              return focusedClient
            })
          }
        }

        // Se não há janela aberta, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(self.location.origin + urlToOpen)
        }
      })
    )
  })
}



