//book_image_rectangle.js
// 長方形圖片上傳框互動
// 遵循紫色主題、圓角、hover動畫、即時預覽

document.addEventListener('DOMContentLoaded', function() {
  const area = document.getElementById('custom-image-upload-area');
  const input = document.getElementById('custom-image-input');
  const preview = document.getElementById('custom-preview-img');

  if (!area || !input || !preview) return;

  area.addEventListener('click', () => input.click());

  // 拖曳互動加 class 實現框變色
  ['dragenter','dragover'].forEach(ev => {
    area.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      area.classList.add('active');
    });
  });
  ['dragleave','drop'].forEach(ev => {
    area.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      area.classList.remove('active');
    });
  });

  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        preview.src = event.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
  ['dragenter','dragover','dragleave','drop'].forEach(ev => {
    area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
  });
  ['dragenter','dragover'].forEach(ev => {
    area.addEventListener(ev, () => area.style.borderColor = '#6F557D');
  });
  ['dragleave','drop'].forEach(ev => {
    area.addEventListener(ev, () => area.style.borderColor = '#ddd');
  });
  area.addEventListener('drop', function(e) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        preview.src = event.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
      input.files = e.dataTransfer.files;
    }
  });
});
