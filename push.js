'use strict';
/* اشتراك Web Push (تنبيهات الخلفية) — يطلب الإذن، يشترك بمفتاح VAPID، ويبعت الاشتراك للسيرفر */

function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { uiToast('متصفحك مش بيدعم تنبيهات الخلفية'); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { uiToast('لازم تسمح بالتنبيهات عشان توصلك'); return false; }
    const reg = await navigator.serviceWorker.ready;
    const vk = await api('vapid');
    if (!vk.publicKey) { uiToast('تنبيهات الخلفية لسه مش متظبطة على السيرفر'); return false; }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(vk.publicKey) });
    const j = sub.toJSON();
    await api('push', 'POST', { endpoint: j.endpoint, keys: j.keys, tzOffset: -new Date().getTimezoneOffset() });
    return true;
  } catch (e) { console.warn('push', e); return false; }
}
