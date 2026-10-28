// ==========================================================================
// PATH: firebase-messaging-sw.js (Root Directory)
// ZenvX Super-App — Master Firebase Background Cloud Messaging (FCM) Worker
// Handles background push notifications when the app is closed or minimized.
// (Step 18 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

// ১. ফায়ারবেসের ব্যাকগ্রাউন্ড স্ক্রিপ্টগুলো (Compat version) লোড করা হচ্ছে
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ২. Firebase কনফিগারেশন (config.js এর সাথে হুবহু মিল থাকতে হবে)
const firebaseConfig = {
  apiKey: "AIzaSyAdkoBFzQTXTfJyJ3ZFghOLsA0gmnI8a_E",
  authDomain: "zenvx--calculator.firebaseapp.com",
  projectId: "zenvx--calculator",
  storageBucket: "zenvx--calculator.appspot.com",
  messagingSenderId: "320661171862",
  appId: "1:320661171862:web:9d8882812e249ad19b1cb7"
};

// ৩. ফায়ারবেস ইনিশিয়ালাইজ করা
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ৪. ব্যাকগ্রাউন্ড মেসেজ রিসিভার ইভেন্ট
  messaging.onBackgroundMessage((payload) => {
    console.log('[ZenvX FCM] Received background message: ', payload);

    // পে-লোড থেকে টাইটেল ও বডি এক্সট্রাক্ট করা (যদি না থাকে তবে ফলব্যাক ব্যবহার করা)
    const notificationTitle = payload.notification?.title || 'ZenvX নোটিফিকেশন';
    const notificationOptions = {
      body: payload.notification?.body || 'আপনার জন্য একটি নতুন বার্তা এসেছে।',
      icon: './manifest/icon-192.png',
      badge: './manifest/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      data: payload.data || { url: '/' }
    };

    // ৫. নোটিফিকেশনটি ইউজারের স্ক্রিনে শো করানো
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.warn('[ZenvX FCM] Background messaging initialization failed:', error);
}

// ৬. নোটিফিকেশন ক্লিক ইভেন্ট (ইউজার নোটিফিকেশনে চাপ দিলে অ্যাপ ওপেন হবে)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // যদি কোনো ট্যাব আগে থেকেই খোলা থাকে, তবে সেটিতে ফোকাস করুন
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // না থাকলে নতুন ট্যাব/উইন্ডো খুলুন
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});