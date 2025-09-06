// select_typeahead_ime.js
// 讓 <select> 直接支援鍵盤索引（含中文 IME）：
// - 聚焦 select 後直接打字（注音/拼音），在 compositionend 拿到中文字後跳轉
// - 英數直接 keydown 就能比對
// - 覆蓋原生 typeahead 的不穩定處，且不需要任何搜尋泡泡

(function(){
  const RESET_MS = 700; // 超過這段時間就重置緩衝
  const TARGET_IDS = [
    // comment 頁
    'education-select','major-select','grade-select',
    // add_comment 頁
    'academic','department','grade','course'
  ];

  // --------- 工具 ---------
  function toHalfWidth(s){
    return (s || "")
      .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/\u3000/g, " ");
  }
  function normalize(s){
    return toHalfWidth(String(s || "").trim()).toLowerCase();
  }

  // 透明 IME 輸入框（為了能看到注音/拼音候選窗）
  function ensureIME(){
    let ime = document.getElementById("__sel_ime_input");
    if (ime) return ime;
    ime = document.createElement("input");
    ime.type = "text";
    ime.id = "__sel_ime_input";
    ime.autocomplete = "off";
    ime.spellcheck = false;
    ime.inputMode = "text";
    Object.assign(ime.style, {
      position: "absolute",
      opacity: 0,               // 完全透明（但保留位置，IME 候選窗才會在附近）
      pointerEvents: "none",
      width: "1px",
      height: "1.4em",
      left: "-9999px",
      top: "-9999px",
      zIndex: 2147483647
    });
    document.body.appendChild(ime);
    return ime;
  }
  function positionIMEOverSelect(ime, select){
    const r = select.getBoundingClientRect();
    const left = window.scrollX + r.left + 12; // 微調到文字區域
    const top  = window.scrollY + r.top  + 10;
    Object.assign(ime.style, {
      left: left + "px",
      top:  top + "px",
      width: Math.max(40, r.width - 24) + "px",
      height: Math.max(20, r.height - 20) + "px",
    });
  }

  // 在 options 中尋找匹配
  function jumpToMatch(select, text){
    const n = normalize(text);
    if (!n) return;
    const opts = Array.from(select.options);
    if (!opts.length) return;

    const cur = Math.max(0, select.selectedIndex);
    // 先找前綴，找不到再包含
    const tryMatch = (pred)=>{
      for (let i = 1; i <= opts.length; i++){
        const idx = (cur + i) % opts.length;
        const txt = normalize(opts[idx].text);
        if (pred(txt)) return idx;
      }
      return -1;
    };
    let idx = tryMatch(t => t.startsWith(n));
    if (idx === -1) idx = tryMatch(t => t.includes(n));

    if (idx !== -1){
      select.selectedIndex = idx;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      // 滾到可視範圍
      try{ opts[idx].scrollIntoView({ block:"nearest" }); }catch(_){}
    }
  }

  function attach(select){
    if (!select || select._typeahead_bound) return;
    select._typeahead_bound = true;

    const ime = ensureIME();

    let buffer = "";
    let lastType = 0;
    let composing = false;
    let composeBuf = "";

    const resetIfTimeout = ()=>{
      const now = Date.now();
      if (now - lastType > RESET_MS) buffer = "";
      lastType = now;
    };

    // 聚焦 select 就把 IME 疊在上面（看得到候選窗），直接可以打注音
    select.addEventListener("focus", ()=>{
      ime.value = "";
      positionIMEOverSelect(ime, select);
      ime.focus({ preventScroll: true });
      select.scrollIntoView({ block:"nearest" });
    });
    select.addEventListener("blur", ()=>{
      // 拉走
      ime.value = "";
      ime.style.left = "-9999px";
      ime.style.top  = "-9999px";
    });
    window.addEventListener("scroll", ()=> {
      if (document.activeElement === select) positionIMEOverSelect(ime, select);
    }, true);
    window.addEventListener("resize", ()=> {
      if (document.activeElement === select) positionIMEOverSelect(ime, select);
    });

    // IME 流程（中文）
    ime.addEventListener("compositionstart", ()=>{
      composing = true;
      composeBuf = "";
    });
    ime.addEventListener("compositionupdate", (e)=>{
      composeBuf = e.data || "";
    });
    ime.addEventListener("compositionend", (e)=>{
      composing = false;
      const result = e.data || composeBuf || "";
      composeBuf = "";
      resetIfTimeout();
      buffer += result;
      jumpToMatch(select, buffer);
    });

    // 英數直接 keydown 到 select → 送到 IME 處理並匹配
    const onKeyDownCapture = (e)=>{
      if (document.activeElement !== select) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const nav = ["ArrowUp","ArrowDown","Home","End","Enter","Tab","Escape","PageUp","PageDown"];
      if (nav.includes(e.key)) return; // 讓原生導覽生效

      // 文字鍵
      if (e.key === "Backspace"){
        e.preventDefault();
        resetIfTimeout();
        buffer = buffer.slice(0,-1);
        // 不立即跳，等下一次輸入或你也可以在這裡做一次包含搜尋
        return;
      }
      if (e.key && e.key.length === 1){
        e.preventDefault();
        if (composing) return; // 交給 IME
        resetIfTimeout();
        buffer += e.key;
        jumpToMatch(select, buffer);
        // 塞到 ime 以便 IME 仍保持活躍（對某些瀏覽器）
        ime.value = buffer;
      }
    };
    document.addEventListener("keydown", onKeyDownCapture, true);
  }

  function init(ids){
    // 綁定指定 id
    (ids || []).forEach(id=>{
      const sel = document.getElementById(id);
      if (sel && sel.tagName === "SELECT") attach(sel);
    });
    // 再保險：若你也想套在任意 .searchable
    document.querySelectorAll("select.searchable").forEach(attach);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=> init(TARGET_IDS));
  }else{
    init(TARGET_IDS);
  }

  // 對外
  window.__SelectTypeaheadIME__ = { attach, init };
})();