// Notification Service for background notifications
let serviceWorkerRegistration = null;
let notificationClickHandler = null;

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
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
      // console.error('Service Worker registration failed:', error);
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
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted. Current permission:', Notification.permission);
    return false;
  }

  // Store the callback for when notification is clicked
  if (onClickCallback) {
    setNotificationClickHandler(onClickCallback);
  }

  // Try Service Worker first (works even when tab is closed or not focused)
  try {
    // Get or wait for Service Worker registration
    let registration = serviceWorkerRegistration;
    if (!registration && 'serviceWorker' in navigator) {
      // Wait for Service Worker to be ready
      registration = await navigator.serviceWorker.ready;
      serviceWorkerRegistration = registration;
      // console.log('Service Worker ready:', registration);
    }

    if (registration) {
      // Use registration.showNotification directly - this works even when tab is not focused
      // console.log('Showing notification via Service Worker registration...');
      await registration.showNotification('Quick Check!', {
        body: 'Answer this question to continue',
        tag: 'attendance-question',
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
      });
      // console.log('Service Worker notification shown successfully');
      return true;
    } else {
      console.warn('Service Worker registration not available');
    }
  } catch (error) {
    console.error('Service Worker notification failed:', error);
    // Fall through to regular notification
  }
  
  // Fallback to regular notification (only works when tab is focused)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification('Quick Check!', {
        body: 'Answer this question to continue',
        tag: 'attendance-question',
        icon: '/favicon.ico',
        requireInteraction: true,
      });
      
      notification.onclick = () => {
        // Focus the window
        window.focus();
        
        // Call the callback to show modal
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

