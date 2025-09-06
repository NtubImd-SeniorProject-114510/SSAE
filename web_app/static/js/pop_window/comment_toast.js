// comment_toast.js — comment 功能專用 Toast + 輔助 API
(function () {
  function ensureRoot() {
    let root = document.getElementById('comment-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'comment-toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function iconFor(type) {
    // 若有 Font Awesome 會以 <i> 顯示；否則用符號
    const useFA = !!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"], link[href*="fa"]');
    if (useFA) {
      if (type === 'success') return '<i class="fa-solid fa-circle-check"></i>';
      if (type === 'error')   return '<i class="fa-solid fa-circle-exclamation"></i>';
      return '<i class="fa-solid fa-circle-info"></i>';
    } else {
      if (type === 'success') return '✅';
      if (type === 'error')   return '⚠️';
      return 'ℹ️';
    }
  }

  function toast({ title = '通知', message = '', type = 'info', duration = 3000 } = {}) {
    const root = ensureRoot();
    const wrap = document.createElement('div');
    wrap.className = `comment-toast ${type}`;
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');

    wrap.innerHTML = `
      <div class="ct-icon">${iconFor(type)}</div>
      <div class="ct-body">
        <div class="ct-title">${title}</div>
        ${message ? `<div class="ct-msg">${message}</div>` : ''}
      </div>
      <button class="ct-close" aria-label="關閉">×</button>
    `;

    const closer = wrap.querySelector('.ct-close');
    let timer = null;
    const remove = () => {
      if (!wrap.isConnected) return;
      wrap.style.transition = 'opacity .15s ease';
      wrap.style.opacity = '0';
      setTimeout(() => wrap.remove(), 160);
    };

    closer.addEventListener('click', remove);
    wrap.addEventListener('mouseenter', () => timer && clearTimeout(timer));
    wrap.addEventListener('mouseleave', () => { timer = setTimeout(remove, 1200); });

    root.appendChild(wrap);
    timer = setTimeout(remove, duration);
    return remove;
  }

  // 專用快捷函式
  function toastSuccess(msg, opts) { return toast({ title: '感謝上傳', message: msg || '', type: 'success', duration: 2600, ...(opts||{}) }); }
  function toastError(msg, opts)   { return toast({ title: '發生錯誤', message: msg || '請稍後再試', type: 'error',   duration: 3200, ...(opts||{}) }); }
  function toastInfo(msg, opts)    { return toast({ title: '提示',   message: msg || '', type: 'info',    duration: 2600, ...(opts||{}) }); }

  // 對外
  window.CommentToast = { toast, toastSuccess, toastError, toastInfo };
})();