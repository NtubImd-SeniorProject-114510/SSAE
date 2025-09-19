document.addEventListener('DOMContentLoaded', function () {
  // 如果頁面上不只一支影片，建議加 class 再改成 querySelector('video.welcome-mobile-video')
  const video = document.querySelector('video');

  const REDIRECT_DELAY_AFTER_LOAD = 4200;   // 影片可播放後延遲跳轉（毫秒）
  const HARD_TIMEOUT              = 6000;  // 不管是否載入成功，6 秒後強制跳轉（保險）
  const FALLBACK_DELAY            = 5000;  // 找不到 <video> 節點時，5 秒後跳轉
  const redirect = () => window.location.replace('/index/');

  let redirected = false;
  const tryRedirect = () => {
    if (!redirected) {
      redirected = true;
      console.log('Redirecting to /index/');
      redirect();
    }
  };

  if (video) {
    // 影片「可播放」後，稍等一下就跳（避免畫面黑一瞬間）
    const scheduleAfterLoad = () => setTimeout(tryRedirect, REDIRECT_DELAY_AFTER_LOAD);
    video.addEventListener('loadeddata', scheduleAfterLoad, { once: true });
    video.addEventListener('canplay',    scheduleAfterLoad, { once: true });

    // 影片載入失敗就直接跳
    video.addEventListener('error', tryRedirect, { once: true });

    // 無論如何，6 秒到就強制跳
    setTimeout(tryRedirect, HARD_TIMEOUT);

    // 點一下螢幕（或觸控）立刻跳
    const skipNow = () => tryRedirect();
    document.addEventListener('click', skipNow, { once: true });
    document.addEventListener('touchstart', skipNow, { once: true, passive: true });
  } else {
    console.error('video element not found, fallback redirect in 5s.');
    setTimeout(tryRedirect, FALLBACK_DELAY);
  }
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