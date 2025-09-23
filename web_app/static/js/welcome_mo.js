
// ---- 先強化「確保自動播放」 ----
document.addEventListener('DOMContentLoaded', function () {
  const video =
    document.querySelector('video.welcome-mobile-video') ||
    document.querySelector('video');
  if (!video) return;

  // 1) 同步設置屬性與 JS 屬性（iOS 有時只吃其中一種）
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;          // 對應 playsinline
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');

  // 2) 當拿到足夠資料時主動 play；若已可播立即嘗試
  const forcePlay = () => { try { video.play().catch(() => {}); } catch(_) {} };

  if (video.readyState >= 2) {
    forcePlay();
  } else {
    video.addEventListener('loadeddata', forcePlay, { once: true });
    video.addEventListener('canplay',    forcePlay, { once: true });
  }

  // 3) 有些 iOS 在背景載入時會被暫停：頁面可見時再嘗試一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused) forcePlay();
  });

  // 4) 再給幾次重試（避免網速慢或 HEVC/H.265 轉碼延遲）
  let retries = 3;
  const retryTimer = setInterval(() => {
    if (!video.paused || retries-- <= 0) return clearInterval(retryTimer);
    forcePlay();
  }, 500);
});

// ---- 你的「可跳過＋自動跳轉」程式（原樣保留） ----
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

  // 搭配上方「強化自動播放」，這裡保留一次 play 嘗試即可
  try { video.play().catch(() => {}); } catch (_) {}

  // 任何一個「可播放」信號來了就排程跳轉
  video.addEventListener('playing',    scheduleAfterLoad, { once: true });
  video.addEventListener('canplay',    scheduleAfterLoad, { once: true });
  video.addEventListener('loadeddata', scheduleAfterLoad, { once: true });

  // 影片錯誤 → 立刻跳
  video.addEventListener('error', redirectOnce, { once: true });

  // 硬性超時（不管影片狀態）
  setTimeout(redirectOnce, HARD_TIMEOUT);

  // 點一下立即跳（桌機 + 行動）— 保留你的需求
  const skip = () => redirectOnce();
  document.addEventListener('click', skip, { once: true });
  document.addEventListener('touchstart', skip, { once: true, passive: true });
});