document.addEventListener('DOMContentLoaded', function () {
  const viewer = document.querySelector('spline-viewer');
  const REDIRECT_DELAY = 800; // 毫秒延遲
  const FALLBACK_DELAY = 2000; // 如果未載入 spline-viewer，5 秒後跳轉
  const redirect = () => window.location.replace('/index/');
  let redirected = false;

  const tryRedirect = () => {
    if (!redirected) {
      redirected = true;
      console.log('Redirecting to /index/');
      redirect();
    }
  };

  if (viewer) {
    // 設定保險機制：載入後不管如何都要跳轉
    viewer.addEventListener('load', () => {
      console.log('Spline viewer loaded.');
      setTimeout(tryRedirect, REDIRECT_DELAY);
    });

    // 確保即使 load 事件未觸發，也能在 10 秒後跳轉（保險計時器）
    setTimeout(() => {
      console.warn('Fallback timeout reached, forcing redirect.');
      tryRedirect();
    }, 7000);

    // 點擊立即跳轉
    viewer.addEventListener('click', () => {
      console.log('User clicked, skipping animation.');
      tryRedirect();
    });
  } else {
    console.error('spline-viewer not found, fallback redirect in 5s.');
    setTimeout(tryRedirect, FALLBACK_DELAY);
  }
});