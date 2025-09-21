
(function () {
  // ===== 共用設定 =====
  const MOBILE_MAX = 768;
  const TO_MOBILE  = '/welcome_mo/';  // 確認你的實際路由
  const TO_INDEX   = '/index/';

  // ===== 工具函式 =====
  const pathNoTrailingSlash = () => window.location.pathname.replace(/\/+$/, '');
  const isOnMobilePage = () => pathNoTrailingSlash() === '/welcome_mo';

  // 依視窗寬度導到手機版（避免無限重導）
  let rAF;
  function maybeRedirectToMobile() {
    if (window.innerWidth <= MOBILE_MAX && !isOnMobilePage()) {
      console.log('[welcome] redirecting to mobile:', TO_MOBILE);
      window.location.replace(TO_MOBILE);
    }
  }

  // 首次判斷 + resize（防抖）
  maybeRedirectToMobile();
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(maybeRedirectToMobile);
  });

  // ===== 點一下就到 index（桌機 & 手機）=====
  function goIndex() { window.location.href = TO_INDEX; }
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', goIndex, { once: true });
    document.addEventListener('touchstart', goIndex, { once: true, passive: true });
  });

  // ===== 手機頁（含影片）處理：載入後延遲跳、失敗或超時也跳 =====
  document.addEventListener('DOMContentLoaded', function () {
    // 只有在有影片的頁面才執行（例如 welcome_mo.html）
    const video = document.querySelector('video.welcome-mobile-video') || document.querySelector('video');

    const REDIRECT_DELAY_AFTER_LOAD = 4200; // 保留你的設定
    const HARD_TIMEOUT              = 6000; // 保留你的設定
    const FALLBACK_DELAY            = 5000; // 保留你的設定

    let redirected = false;
    let delayTimer = null;

    const redirectOnce = () => {
      if (redirected) return;
      redirected = true;
      clearTimeout(delayTimer);
      console.log('[welcome] Redirecting to', TO_INDEX);
      window.location.replace(TO_INDEX);
    };

    const scheduleAfterLoad = () => {
      if (redirected) return;
      clearTimeout(delayTimer);
      delayTimer = setTimeout(redirectOnce, REDIRECT_DELAY_AFTER_LOAD);
    };

    if (video) {
      // iOS 自動播放保險：確保屬性存在並嘗試播放
      try {
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('muted', '');
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        // 若瀏覽器允許，先嘗試播放以觸發 canplay/playing
        Promise.resolve(video.play()).catch(() => {});
      } catch (_) {}

      // 任一可播放事件來了就排程延遲跳轉
      video.addEventListener('playing',    scheduleAfterLoad, { once: true });
      video.addEventListener('canplay',    scheduleAfterLoad, { once: true });
      video.addEventListener('loadeddata', scheduleAfterLoad, { once: true });

      // 影片錯誤 → 直接跳
      video.addEventListener('error', redirectOnce, { once: true });

      // 硬性超時（不管影片狀態）
      setTimeout(redirectOnce, HARD_TIMEOUT);
    } else {
      // 找不到影片 → 保險延遲跳
      console.warn('[welcome] no <video> found; fallback redirect in', FALLBACK_DELAY, 'ms');
      setTimeout(redirectOnce, FALLBACK_DELAY);
    }
  });
})();