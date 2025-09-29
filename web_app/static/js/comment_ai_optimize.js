(function(){
  const INPUT_ID   = "comment_text";
  const BUTTON_ID  = "convert-btn";
  const PREVIEW_ID = "comment-preview";
  const HIDDEN_ID  = "optimized_comment"; // 可選：若頁面有 <input type="hidden" id="optimized_comment" name="optimized_comment">

  function $(id){ return document.getElementById(id); }

  function getCSRFToken(){
    const t1 = document.querySelector("input[name='csrfmiddlewaretoken']")?.value;
    if (t1) return t1;
    const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setLoading(on){
    const btn = $(BUTTON_ID);
    if (!btn) return;
    btn.disabled = !!on;
    if (on){ btn.dataset._label = btn.textContent; btn.textContent = "轉換中…"; }
    else if (btn.dataset._label){ btn.textContent = btn.dataset._label; delete btn.dataset._label; }
  }

  function putPreview(val){
    const preview = $(PREVIEW_ID) || $("preview_text");
    if (preview){
      if ("value" in preview) preview.value = val;
      else preview.textContent = val;
    }
    const hid = $(HIDDEN_ID);
    if (hid) hid.value = val;
    document.dispatchEvent(new CustomEvent("comment:optimized", { detail: { text: val }}));
  }

  function fetchWithTimeout(resource, options = {}, timeoutMs = 15000){
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const merged = { ...options, signal: controller.signal };
    return fetch(resource, merged).finally(() => clearTimeout(id));
  }

  async function callAPI(text){
    const body = new URLSearchParams();
    body.set("content", text || "");

    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const csrf = getCSRFToken();
    if (csrf) headers["X-CSRFToken"] = csrf;

    const res = await fetchWithTimeout("/api/comment/optimize_ai", {
      method: "POST",
      headers,
      body
    }, 20000);

    if (!res.ok){
      let serverMsg = "AI 轉換失敗";
      try{ const j = await res.json(); if (j && j.error) serverMsg = j.error; }catch(_){}
      throw new Error(serverMsg);
    }
    const data = await res.json();
    return data.result || "";
  }

  async function optimizeFlow(raw){
    return await callAPI(raw);  // 交給後端處理
  }

  function bind(){
    const btn = $(BUTTON_ID);
    if (!btn) return;

    btn.addEventListener("click", async (e)=>{
      e.preventDefault();
      const src = $(INPUT_ID);
      const raw = (src?.value || src?.textContent || "").trim();
      if (!raw){ putPreview(""); return; }

      setLoading(true);
      try{
        const out = await optimizeFlow(raw);
        putPreview(out);
      }catch(err){
        console.error(err);
        putPreview("（轉換失敗，請稍後重試）");
      }finally{
        setLoading(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bind);
})();


// ===== 送出前檢查：避免送出過短提示，並回填優化內容 =====
(function(){
  const FORM_ID    = "comment-form";
  const SUBMIT_ID  = "submit-btn";
  const INPUT_ID   = "comment_text";
  const PREVIEW_ID = "comment-preview"; // 你的頁面也有 #preview_text，我們會同時支援
  const SHORT_PREFIX = "（內容過短）";

  function $(id){ return document.getElementById(id); }

  function getPreviewText(){
    const preview = $(PREVIEW_ID) || $("preview_text");
    if (!preview) return "";
    return "value" in preview ? (preview.value || "") : (preview.textContent || "");
  }

  function setPreviewText(val){
    const preview = $(PREVIEW_ID) || $("preview_text");
    if (!preview) return;
    if ("value" in preview) preview.value = val;
    else preview.textContent = val;
  }

  function bindSubmitGuard(){
    const btn = $(SUBMIT_ID);
    if (!btn) return;

    btn.addEventListener("click", function(e){
      const form = $(FORM_ID);
      const preview = (getPreviewText() || "").trim();

      // 1) 尚未轉換（或空白）
      if (!preview){
        e.preventDefault(); e.stopPropagation();
        alert("請先按「轉換」，產生可提交的評論內容，再送出。");
        return;
      }

      // 2) 是「內容過短」的系統提示 → 禁止送出
      if (preview.startsWith(SHORT_PREFIX)){
        e.preventDefault(); e.stopPropagation();
        alert("評論內容過短，請補充具體細節後再送出。");
        return;
      }

      // 3) 一切正常 → 回填到 #comment_text，確保送出是優化後內容
      const input = $(INPUT_ID);
      if (input) input.value = preview;

      // 若你的表單送出是由其它 JS 控制（onsubmit return false），這裡只做資料回填
      // 交由現有 add_comment.js 去處理實際送出流程即可
    });
  }

  document.addEventListener("DOMContentLoaded", bindSubmitGuard);
})();