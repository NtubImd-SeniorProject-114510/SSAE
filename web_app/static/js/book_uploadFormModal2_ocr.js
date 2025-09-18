// static/js/uploadFormModal2_ocr_noworker.js
(function () {
  // —— 安全 selector（避免其他 JS 錯誤把我們拖死）
  const $ = (sel, root = document) => root.querySelector(sel) || null;

  const fileInput    = $("#bookImage");
  const btnRecognize = $("#recognizeBtn");
  const previewWrap  = $("#previewWrap");
  const previewImg   = $("#previewImg");
  const ocrProgress  = $("#ocrProgressWrap");
  const ocrBar       = $("#ocrProgressBar");
  const ocrStatus    = $("#ocr-status");

  const titleTargets  = ["#book_title", "input[name='book_title']", "input[name='title']"];
  const authorTargets = ["#book_author", "input[name='book_author']", "input[name='author']"];
  const pubTargets    = ["#book_publisher", "input[name='book_publisher']", "input[name='publisher']"];
  const linkInput     = $("#book_link");
  const linkOpen      = $("#open_link");

  if (!fileInput || !btnRecognize) {
    console.warn("[OCR] 缺少 #bookImage / #recognizeBtn，已跳過初始化");
    return;
  }

  // —— UI helpers
  function setVal(selectors, value) {
    for (const sel of selectors) {
      const el = $(sel);
      if (el) { el.value = value || ""; return el; }
    }
    return null;
  }
  function setProgress(pct, label) {
    if (!ocrProgress || !ocrBar) return;
    ocrProgress.style.display = "block";
    ocrBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (ocrStatus) ocrStatus.textContent = label || "";
  }
  function resetProgress() {
    if (!ocrProgress || !ocrBar) return;
    ocrProgress.style.display = "none";
    ocrBar.style.width = "0%";
    if (ocrStatus) ocrStatus.textContent = "";
  }
  function preview(file) {
    if (!file || !previewWrap || !previewImg) return;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewWrap.style.display = "block";
  }
  function makeBooksSearchLink(title, author) {
    const key = encodeURIComponent([title, author].filter(Boolean).join(" "));
    return key ? `https://search.books.com.tw/search/query/key/${key}/cat/all` : "";
  }

  // —— 輕量前處理（縮放 + 對比/亮度）
  async function preprocessToBlob(file) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.filter = 'contrast(1.15) brightness(1.05)';
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
  }

  // —— 無 worker 的 OCR（中英雙語、走本機 tessdata；不傳 logger，避免 DataCloneError）
  const TESS_OPTS = {
    workerPath: '/static/tesseract/worker.min.js',
    corePath:   '/static/tesseract/tesseract-core.wasm.js',
    langPath:   '/static/tessdata'
  };

  // 加上逾時保護，避免網路/讀檔卡住
  async function recognizeNoWorker(blob, lang = 'chi_tra+eng', timeoutMs = 25000) {
    if (!window.Tesseract) throw new Error('Tesseract.js 未載入');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort('OCR_TIMEOUT'), timeoutMs);

    try {
      // 注意：無 worker 版本只要這一行，不會觸發 postMessage
      const res = await Tesseract.recognize(blob, lang, { ...TESS_OPTS, signal: ctrl.signal });
      return res?.data || {};
    } finally {
      clearTimeout(timeout);
    }
  }

  // —— 把 words 聚成行並做版面判斷（最大字=書名；右下小字=作者；底部=出版社）
  function splitToLines(words, imgW, imgH) {
    const filtered = (words || [])
      .filter(w => (w.conf ?? 0) > 70 && w.text)
      .map(w => {
        const t = w.text.replace(/\s+/g, '');
        const x0 = w.bbox?.x0 ?? 0, x1 = w.bbox?.x1 ?? 0;
        const y0 = w.bbox?.y0 ?? 0, y1 = w.bbox?.y1 ?? 0;
        const ww = Math.max(1, x1 - x0), hh = Math.max(1, y1 - y0);
        return { text: t, x0, x1, y0, y1, w: ww, h: hh, conf: w.conf ?? 0 };
      })
      .filter(w => /[\u4e00-\u9fa5A-Za-z0-9]/.test(w.text))
      .filter(w => (w.h / w.w) < 2.2)       // 排除近直排
      .filter(w => w.x1 > imgW * 0.28);     // 丟左側裝飾/直排英文

    if (!filtered.length) return [];

    const lines = [];
    const Y_TOL = 0.035 * imgH;
    filtered
      .sort((a,b) => (a.y0+a.y1)/2 - (b.y0+b.y1)/2)
      .forEach(w => {
        const yc = (w.y0 + w.y1) / 2;
        let bucket = lines.find(L => Math.abs(L.yc - yc) < Y_TOL);
        if (!bucket) { bucket = { yc, words: [] }; lines.push(bucket); }
        bucket.words.push(w);
        bucket.yc = bucket.words.reduce((s, ww) => s + (ww.y0+ww.y1)/2, 0) / bucket.words.length;
      });

    return lines.map(L => {
      const wordsSorted = [...L.words].sort((a,b) => a.x0 - b.x0);
      const text = wordsSorted.map(w => w.text).join('');
      const zhCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const heights = wordsSorted.map(w => w.h).sort((a,b)=>a-b);
      const medianH = heights[Math.floor(heights.length/2)];
      const xMin = Math.min(...wordsSorted.map(w => w.x0));
      const xMax = Math.max(...wordsSorted.map(w => w.x1));
      const yMin = Math.min(...wordsSorted.map(w => w.y0));
      const yMax = Math.max(...wordsSorted.map(w => w.y1));
      return { text, zhCount, medianH, bbox: {xMin,xMax,yMin,yMax}, yc: L.yc };
    });
  }

  function chooseTitle(lines, imgW, imgH) {
    const bandTop = imgH * 0.28, bandBottom = imgH * 0.72;
    const cands = lines
      .filter(s => s.yc > bandTop && s.yc < bandBottom && s.zhCount >= 2 && s.text.length >= 2)
      .sort((a, b) => {
        if (b.zhCount !== a.zhCount) return b.zhCount - a.zhCount;
        if (b.medianH !== a.medianH) return b.medianH - a.medianH;
        return (b.bbox.xMax - b.bbox.xMin) - (a.bbox.xMax - a.bbox.xMin);
      });

    let title = cands[0]?.text || '';
    let edition = '';
    const ed = title.match(/(二版|第[一二三四五六七八九十0-9]+版|增訂|修訂)/);
    if (ed) { edition = ed[1]; title = title.replace(ed[1], '').trim(); }
    title = title.replace(/(作者|著|編|譯|出版社|出版).*/,'').trim();
    if (edition) title += `（${edition}）`;
    return { title, titleLine: cands[0] || null };
  }

  function chooseAuthor(lines, imgW, imgH, titleLine) {
    const titleBottom = titleLine ? titleLine.bbox.yMax : imgH * 0.5;
    const rightEdge = imgW * 0.6;
    const cands = lines
      .filter(s =>
        s.yc > Math.max(titleBottom + imgH * 0.02, imgH * 0.45) &&
        s.bbox.xMax > rightEdge &&
        s.medianH < (titleLine?.medianH || Infinity) * 0.85 &&
        ( /[\u4e00-\u9fa5]{2,}/.test(s.text) || /著/.test(s.text) ) &&
        s.text.length <= 12
      )
      .sort((a,b) => {
        const aScore = (a.bbox.xMax / (imgW+1)) + (a.bbox.yMax / (imgH+1));
        const bScore = (b.bbox.xMax / (imgW+1)) + (b.bbox.yMax / (imgH+1));
        return bScore - aScore;
      });

    let author = cands[0]?.text || '';
    author = author.replace(/(作者|著|編|譯)\s*$/,'').replace(/[，。．·•\s]+$/,'');
    return author;
  }

  function choosePublisher(lines, imgW, imgH) {
    const bottomBand = imgH * 0.80;
    const midL = imgW * 0.25, midR = imgW * 0.75;
    const cands = lines
      .filter(s => s.yc > bottomBand && s.bbox.xMin > midL && s.bbox.xMax < midR)
      .sort((a,b) => a.text.length - b.text.length);

    const withKw = cands.find(s => /(出版社|文化|出版|Press|Publishing)/.test(s.text));
    const pick = withKw || cands[0];
    let publisher = pick?.text || '';
    publisher = publisher.replace(/(出版社|文化|出版).*/,(m)=>m)
                         .replace(/\s*since\s*\d{2,4}.*/i,'')
                         .trim();
    return publisher;
  }

  async function doOCRNoWorker(file) {
    const preBlob = await preprocessToBlob(file);

    // 無 worker → 不會觸發 postMessage
    setProgress(8, "載入語言檔…");
    let data;
    try {
      data = await recognizeNoWorker(preBlob, 'chi_tra+eng', 30000);
    } catch (e) {
      console.warn("[OCR] 雙語辨識失敗，改英文備援：", e);
      data = await recognizeNoWorker(preBlob, 'eng', 20000);
    }

    const w = data?.width  || (previewImg?.naturalWidth  || 1000);
    const h = data?.height || (previewImg?.naturalHeight || 1500);
    const rawText = (data?.text || "").replace(/\r/g, "");
    let words = Array.isArray(data?.words) && data.words.length
      ? data.words
      : (Array.isArray(data?.lines) ? data.lines.flatMap(l => l.words || []) : []);

    // --- 版面規則（如原來）---
    const lines = splitToLines(words, w, h);
    let title = "", author = "", publisher = "";

    if (lines.length) {
      const { title: t, titleLine } = chooseTitle(lines, w, h);
      title = t || "";
      author = chooseAuthor(lines, w, h, titleLine) || "";
      publisher = choosePublisher(lines, w, h) || "";
    }

    // --- 保底：若有缺，從 rawText 直接抽（一定給出值）---
    if (!title || title.length < 2) {
      // 先選「中文字最多且最長的一行」；沒有中文就選最長英文字母行
      const lns = rawText.split("\n").map(s => s.trim()).filter(Boolean);
      const zhLines = lns.filter(s => /[\u4e00-\u9fa5]/.test(s));
      const enLines = lns.filter(s => /[A-Za-z]/.test(s));

      const pickLongest = arr => arr.sort((a,b)=>b.length-a.length)[0] || "";
      title = pickLongest(zhLines) || pickLongest(enLines) || lns[0] || "";
      // 清理尾巴的「作者／出版社」噪音 + 版次括號化
      let ed = title.match(/(二版|第[一二三四五六七八九十0-9]+版|增訂|修訂)/);
      if (ed) { title = title.replace(ed[1], '').trim() + `（${ed[1]}）`; }
      title = title.replace(/(作者|著|編|譯|出版社|出版).*/,'').trim();
    }

    if (!author) {
      // 常見關鍵詞或姓名樣式
      const lns = rawText.split("\n").map(s => s.trim()).filter(Boolean);
      let cand = lns.find(l => /(作者|著|編|譯)/.test(l) && l.length < 30);
      if (cand) {
        author = cand.replace(/^.*?(作者|著|編|譯)\s*[:：]?\s*/,'')
                    .replace(/(著|編|譯)$/, '')
                    .replace(/[（）\(\)]/g,'').trim();
      } else {
        cand = lns.find(l => /^[\u4e00-\u9fa5·．]{2,6}(?:\s*[／/、,&]\s*[\u4e00-\u9fa5·．]{2,6})*$/.test(l));
        if (cand) author = cand.replace(/[／/、,&]/g, "、").trim();
      }
    }

    if (!publisher) {
      const lns = rawText.split("\n").map(s => s.trim()).filter(Boolean);
      let cand = lns.find(l => /(出版社|文化|出版|Press|Publishing)/i.test(l));
      if (cand) {
        publisher = cand.replace(/.*?([\u4e00-\u9fa5A-Za-z]{2,12}(出版社|文化|出版)|Press|Publishing).*/i, "$1").trim();
        if (!publisher) publisher = cand.trim();
      }
    }

    // 最後再清理一次
    author = (author || "").replace(/(作者|著|編|譯)\s*$/,'').replace(/[，。．·•\s]+$/,'').trim();
    title  = (title  || "").replace(/^[\-\—–·•\s]+/, "").replace(/[\s\-—–·•]+$/, "").trim();

    // 印到 Console，方便核對
    console.log("[OCR] rawText:", rawText);
    console.log("[OCR] filled =>", { title, author, publisher });

    return { title, author, publisher, rawText };
  }

  // —— 綁定事件
  let pickedFile = null;

  fileInput.addEventListener("change", () => {
    pickedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    preview(pickedFile);
    resetProgress();
  });

  btnRecognize.addEventListener("click", async () => {
  if (!pickedFile) { fileInput.click(); return; }
  btnRecognize.disabled = true;
  setProgress(2, "準備中…");

  try {
    const info = await doOCRNoWorker(pickedFile);   // 會回 { title, author, publisher, rawText? }
    setProgress(100, "辨識完成");

    // ---- 一定寫回（空字串也寫回，避免維持舊值）----
    const titleEl  = setVal(titleTargets,  info.title  || "");
    const authorEl = setVal(authorTargets, info.author || "");
    const pubEl    = setVal(pubTargets,    info.publisher || "");

    // 沒找到對應欄位就提醒（請把實際 id/name 加到陣列最前面）
    if (!titleEl)  console.warn("[OCR] 找不到書名欄位，請把實際 selector 加到 titleTargets：", titleTargets);
    if (!authorEl) console.warn("[OCR] 找不到作者欄位，請把實際 selector 加到 authorTargets：", authorTargets);
    if (!pubEl)    console.warn("[OCR] 找不到出版社欄位，請把實際 selector 加到 pubTargets：", pubTargets);

    // ---- 產生博客來連結 ----
    const link = makeBooksSearchLink(titleEl?.value || info.title, authorEl?.value || info.author);
    if (linkInput) linkInput.value = link;
    if (linkOpen) {
      linkOpen.href = link || "#";
      linkOpen.classList.toggle("disabled", !link);
    }

    // 方便你在 Console 檢查實際填入
    console.log("[OCR] filled =>", {
      title: titleEl?.value || info.title,
      author: authorEl?.value || info.author,
      publisher: pubEl?.value || info.publisher
    });

  } catch (err) {
    console.error(err);
    alert("辨識失敗。請確認 /static/tessdata 有 chi_tra(.gz) 與 eng(.gz) 並查看 Console/Network。");
  } finally {
    btnRecognize.disabled = false;
    setTimeout(resetProgress, 500);
  }
});
})();