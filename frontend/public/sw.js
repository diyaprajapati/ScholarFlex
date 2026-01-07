// Service Worker for background notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    
    console.log('Service Worker attempting to show notification:', { title, body, tag });
    
    // Use event.waitUntil to keep Service Worker alive during async operation
    event.waitUntil(
      self.registration.showNotification(title || 'Quick Check!', {
        body: body || 'Answer this question to continue',
        tag: tag || 'attendance-question',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'open',
            title: 'Open & Answer'
          }
        ]
      })
      .then(() => {
        console.log('Service Worker notification shown successfully');
      })
      .catch((error) => {
        console.error('Service Worker notification error:', error);
        // Send error back to client
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ 
              type: 'NOTIFICATION_ERROR', 
              error: error.message 
            });
          });
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus/open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window and send message to show modal
          client.focus();
          // Send message to client to show modal
          client.postMessage({ type: 'SHOW_ATTENDANCE_MODAL' });
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/student/dashboard').then((windowClient) => {
          // Wait a bit for the page to load, then send message
          setTimeout(() => {
            if (windowClient) {
              windowClient.postMessage({ type: 'SHOW_ATTENDANCE_MODAL' });
            }
          }, 1000);
        });
      }
    })
  );
});

