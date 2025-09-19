
(function () {
  const MOBILE_MAX = 768;
  const toMobile = '/welcome_mo/';  // 確認實際路由（有無斜線）
  const toIndex  = '/index/';

  // 安全取得目前路徑（兼容末尾斜線）
  function isOnMobilePage() {
    const p = window.location.pathname.replace(/\/+$/, '');
    return p === '/welcome_mo';
  }

  // 防抖 + 螢幕寬度偵測
  let rAF;
  function maybeRedirectToMobile() {
    if (window.innerWidth <= MOBILE_MAX && !isOnMobilePage()) {
      console.log('[welcome] redirecting to mobile:', toMobile);
      window.location.replace(toMobile);
    }
  }

  // 首次判斷
  maybeRedirectToMobile();

  // resize 時再判斷（用 rAF 防抖）
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(maybeRedirectToMobile);
  });

  // 點一下就去 index（桌機與手機都能用）
  function goIndex() {
    window.location.href = toIndex;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', goIndex, { once: true });
    document.addEventListener('touchstart', goIndex, { once: true, passive: true });
  });
})();