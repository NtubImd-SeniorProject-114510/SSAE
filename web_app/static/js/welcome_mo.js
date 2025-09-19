
document.addEventListener('DOMContentLoaded', function () {
  const video =
    document.querySelector('video.welcome-mobile-video') ||
    document.querySelector('video');

  const TO_INDEX = '/index/';
  const REDIRECT_DELAY_AFTER_LOAD = 4200; // 影片可播後延遲跳
  const HARD_TIMEOUT = 6000;              // 最長等待
  const FALLBACK_DELAY = 5000;            // 找不到 <video> 的保險

  let redirected = false;
  let delayTimer = null;
  const redirectOnce = () => {
    if (redirected) return;
    redirected = true;
    clearTimeout(delayTimer);
    window.location.replace(TO_INDEX);
  };

  const scheduleAfterLoad = () => {
    if (redirected) return;
    clearTimeout(delayTimer);
    delayTimer = setTimeout(redirectOnce, REDIRECT_DELAY_AFTER_LOAD);
  };

  if (!video) {
    console.warn('[welcome] no <video> element found; fallback redirect.');
    setTimeout(redirectOnce, FALLBACK_DELAY);
    document.addEventListener('click', redirectOnce, { once: true });
    document.addEventListener('touchstart', redirectOnce, { once: true, passive: true });
    return;
  }

  // 嘗試啟播（有些瀏覽器需要這步驟來觸發 playing/canplay）
  try { video.play().catch(() => {}); } catch (_) {}

  // 任何一個「可播放」信號來了就排程跳轉
  video.addEventListener('playing',    scheduleAfterLoad, { once: true });
  video.addEventListener('canplay',    scheduleAfterLoad, { once: true });
  video.addEventListener('loadeddata', scheduleAfterLoad, { once: true });

  // 影片錯誤 → 立刻跳
  video.addEventListener('error', redirectOnce, { once: true });

  // 硬性超時（不管影片狀態）
  setTimeout(redirectOnce, HARD_TIMEOUT);

  // 點一下立即跳（桌機 + 行動）
  const skip = () => redirectOnce();
  document.addEventListener('click', skip, { once: true });
  document.addEventListener('touchstart', skip, { once: true, passive: true });
});



// document.addEventListener('DOMContentLoaded', function () {
//   const viewer = document.querySelector('spline-viewer');
//   const REDIRECT_DELAY = 800; // 毫秒延遲
//   const FALLBACK_DELAY = 3000; // 如果未載入 spline-viewer，5 秒後跳轉
//   const redirect = () => window.location.replace('/index/');
//   let redirected = false;

//   const tryRedirect = () => {
//     if (!redirected) {
//       redirected = true;
//       console.log('Redirecting to /index/');
//       redirect();
//     }
//   };

//   if (viewer) {
//     // 設定保險機制：載入後不管如何都要跳轉
//     viewer.addEventListener('load', () => {
//       console.log('Spline viewer loaded.');
//       setTimeout(tryRedirect, REDIRECT_DELAY);
//     });

//     // 確保即使 load 事件未觸發，也能在 10 秒後跳轉（保險計時器）
//     setTimeout(() => {
//       console.warn('Fallback timeout reached, forcing redirect.');
//       tryRedirect();
//     }, 7000);

//     // 點擊立即跳轉
//     viewer.addEventListener('click', () => {
//       console.log('User clicked, skipping animation.');
//       tryRedirect();
//     });
//   } else {
//     console.error('spline-viewer not found, fallback redirect in 5s.');
//     setTimeout(tryRedirect, FALLBACK_DELAY);
//   }
// });