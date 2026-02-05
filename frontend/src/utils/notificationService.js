// Notification Service for background notifications
let serviceWorkerRegistration = null;
let notificationClickHandler = null;

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Check if we're on HTTPS or localhost (required for Service Workers)
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (!isSecureContext) {
        console.warn('Service Workers require HTTPS or localhost. Current protocol:', location.protocol);
        return null;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      serviceWorkerRegistration = registration;
      // console.log('Service Worker registered successfully', registration);
      
      // Wait for Service Worker to be ready
      await navigator.serviceWorker.ready;
      // console.log('Service Worker is ready');
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service Workers are not supported in this browser');
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
  return false;
};

// Set callback for when notification is clicked
export const setNotificationClickHandler = (callback) => {
  notificationClickHandler = callback;
};

export const showBackgroundNotification = async (onClickCallback) => {
  // Check notification permission first
  if (!('Notification' in window)) {
    console.warn('Notification API not available in this browser');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted. Current permission:', Notification.permission);
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('User denied notification permission');
          return false;
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    } else {
      // Explicitly denied
      return false;
    }
  }

  // Store the callback for when notification is clicked (used for fallback path)
  if (onClickCallback) {
    setNotificationClickHandler(onClickCallback);
  }

  // Ensure Service Worker is registered first
  if (!serviceWorkerRegistration && 'serviceWorker' in navigator) {
    try {
      await registerServiceWorker();
    } catch (error) {
      console.error('Failed to register Service Worker:', error);
    }
  }

  // Preferred: use Service Worker registration so notification works even
  // when this tab is not focused or is closed.
  try {
    let registration = serviceWorkerRegistration;
    if (!registration && 'serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.ready;
        serviceWorkerRegistration = registration;
        // console.log('Service Worker ready:', registration);
      } catch (error) {
        console.error('Service Worker not ready:', error);
      }
    }

    if (registration && registration.showNotification) {
      try {
        // Use a unique tag each time so every attendance check
        // creates a fresh OS notification instead of merely
        // updating/replacing the previous one.
        const uniqueTag = `attendance-check-${Date.now()}`;

        await registration.showNotification('Attendance Check Required', {
          body: 'Answer the question within 2 minutes to continue tracking.',
          icon: '/logo.png',
          badge: '/logo.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          tag: uniqueTag,
          data: { type: 'SHOW_ATTENDANCE_MODAL' }
        });
        // console.log('Service Worker notification shown successfully');
        return true;
      } catch (error) {
        console.error('Error showing notification via Service Worker:', error);
        // Fall through to regular notification
      }
    } else {
      console.warn('Service Worker registration not available or showNotification not supported');
    }
  } catch (error) {
    console.error('Service Worker notification failed:', error);
    // Fall through to regular notification
  }

  // Fallback: regular Notification API (only reliable when tab is active)
  if (Notification.permission === 'granted') {
    try {
      // console.log('Falling back to regular Notification API...');
      const notification = new Notification('Attendance Check Required', {
        body: 'Answer the question within 2 minutes to continue tracking.',
        // No static tag here so multiple notifications can appear
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        if (notificationClickHandler) {
          notificationClickHandler();
        }
        notification.close();
      };

      // console.log('Regular notification shown (fallback)');
      return true;
    } catch (error) {
      console.error('Notification failed:', error);
    }
  }

  console.warn('Failed to show notification - no method available');
  return false;
};

export const sendMessageToServiceWorker = (message) => {
  if (serviceWorkerRegistration && serviceWorkerRegistration.active) {
    serviceWorkerRegistration.active.postMessage(message);
  }
};

// Test notification function for debugging
export const testNotification = async () => {
  // console.log('Testing notification...');
  // console.log('Notification API available:', 'Notification' in window);
  // console.log('Service Worker available:', 'serviceWorker' in navigator);
  // console.log('Current notification permission:', Notification.permission);
  
  if (!('Notification' in window)) {
    alert('This browser does not support notifications.');
    return false;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    // console.log('Permission result:', permission);
    if (permission !== 'granted') {
      alert('Notification permission was denied. Please enable notifications in your browser settings.');
      return false;
    }
  } else if (Notification.permission === 'denied') {
    alert('Notifications are blocked. Please enable them in your browser settings.');
    return false;
  }

  // Test Service Worker notification
  try {
    if ('serviceWorker' in navigator) {
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification('Test Notification', {
          body: 'If you see this, notifications are working!',
          icon: '/favicon.ico',
          tag: 'test-notification'
        });
        // console.log('Test notification shown via Service Worker');
        return true;
      }
    }
  } catch (error) {
    console.error('Service Worker test notification failed:', error);
  }

  // Fallback to regular notification
  try {
    const notification = new Notification('Test Notification', {
      body: 'If you see this, notifications are working!',
      icon: '/favicon.ico'
    });
    // console.log('Test notification shown via regular API');
    return true;
  } catch (error) {
    console.error('Regular test notification failed:', error);
    alert('Failed to show test notification: ' + error.message);
    return false;
  }
};

