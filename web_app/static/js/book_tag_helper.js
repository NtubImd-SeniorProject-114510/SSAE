// 快速標籤功能
function toggleTag(element, text) {
    const textarea = document.getElementById('description');
    let currentValue = textarea.value;
    
    if (element.classList.contains('active')) {
        element.classList.remove('active');
        
        let newValue = currentValue;
        
        if (newValue === text) {
            newValue = '';
        } else if (newValue.startsWith(text + '、')) {
            newValue = newValue.replace(text + '、', '');
        } else if (newValue.includes('、' + text + '、')) {
            newValue = newValue.replace('、' + text + '、', '、');
        } else if (newValue.endsWith('、' + text)) {
            newValue = newValue.replace('、' + text, '');
        } else {
            newValue = newValue.replace(text, '');
        }
        
        newValue = newValue.replace(/^[、，,\s]+/, '').replace(/[、，,\s]+$/, '');
        newValue = newValue.replace(/[、，,\s]+/g, '、');
        
        textarea.value = newValue;
    } else {
        element.classList.add('active');
        
        if (!currentValue.includes(text)) {
            if (currentValue.trim()) {
                textarea.value = currentValue + '、' + text;
            } else {
                textarea.value = text;
            }
        }
    }
}

function clearSelectedTags() {
    const tags = document.querySelectorAll('.quick-tag.active');
    tags.forEach(tag => {
        tag.classList.remove('selected');
    });
    document.getElementById('description').value = '';
}

// 監聽文字區域變化，同步更新標籤狀態
document.getElementById('description').addEventListener('input', function() {
    const value = this.value;
    const tags = document.querySelectorAll('.quick-tag');
    
    tags.forEach(tag => {
        const text = tag.textContent.replace(/^[📝📄💥✏️✨📦🔥💬🤝⭐]\s/, ''); // 移除 emoji
        
        if (value.includes(text)) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
});