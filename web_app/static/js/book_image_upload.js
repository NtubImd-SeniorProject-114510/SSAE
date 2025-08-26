// 書籍封面圖片上傳區塊互動（仿活動召集）
document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('book-image-upload-area');
  const fileInput = document.getElementById('book-cover-image-input');

  // 預覽圖動態插入
  let previewImg = null;
  function setPreview(src) {
    if (!previewImg) {
      previewImg = document.createElement('img');
      previewImg.style.maxHeight = '200px';
      previewImg.style.maxWidth = '95%';
      previewImg.style.objectFit = 'contain';
      previewImg.style.margin = '12px auto 0';
      previewImg.style.display = 'block';
      previewImg.style.borderRadius = '12px';
      previewImg.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
      uploadArea.appendChild(previewImg);
    }
    previewImg.src = src;
    previewImg.style.display = 'block';
  }

  // 點擊區塊觸發 input
  uploadArea.addEventListener('click', () => fileInput.click());

  // 檔案選擇即時預覽
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => setPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  });

  // 拖曳互動
  ['dragenter','dragover','dragleave','drop'].forEach(ev => {
    uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
  });
  ['dragenter','dragover'].forEach(ev => {
    uploadArea.addEventListener(ev, () => uploadArea.style.borderColor = '#6F557D');
  });
  ['dragleave','drop'].forEach(ev => {
    uploadArea.addEventListener(ev, () => uploadArea.style.borderColor = '#ddd');
  });
  uploadArea.addEventListener('drop', function(e) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => setPreview(event.target.result);
      reader.readAsDataURL(file);
      fileInput.files = e.dataTransfer.files;
    }
  });
});
