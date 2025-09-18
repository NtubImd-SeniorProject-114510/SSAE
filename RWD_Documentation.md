# 活動頁面響應式網頁設計 (RWD) 文檔

## 📱 概述

本文檔詳細說明活動頁面的響應式網頁設計實現，包含斷點設計、元素縮放策略和用戶體驗優化。

## 🎯 設計原則

### 1. **等比例縮放**
- 所有元素隨螢幕尺寸平滑縮放
- 避免突兀的佈局跳躍
- 保持視覺比例和諧

### 2. **漸進式增強**
- 從小螢幕開始設計 (Mobile First)
- 逐步增加大螢幕功能
- 確保核心功能在所有設備可用

### 3. **內容優先**
- 重要內容優先顯示
- 次要元素在小螢幕隱藏或簡化
- 保持可讀性和可操作性

## 📐 斷點系統

### 主要斷點
```css
/* 超大螢幕 */
@media (min-width: 1401px) { /* 桌面 */ }

/* 大螢幕 */
@media (max-width: 1400px) { /* 大桌面 */ }

/* 中大螢幕 */
@media (max-width: 1200px) { /* 小桌面 */ }

/* 中螢幕 */
@media (max-width: 1024px) { /* 平板橫向 */ }

/* 小中螢幕 */
@media (max-width: 900px) { /* 小平板 */ }

/* 小螢幕 */
@media (max-width: 768px) { /* 平板直向/大手機 */ }

/* 超小螢幕 */
@media (max-width: 480px) { /* 手機 */ }

/* 極小螢幕 */
@media (max-width: 400px) { /* 小手機 */ }
```

## 🎛️ 組件響應式設計

### 1. 活動卡片 (Activity Cards)

#### 卡片數量適配
```css
/* 桌面: 1-5個選項全支援 */
.card-size-1 { width: 100%; max-width: 600px; }
.card-size-2 { width: calc(50% - 20px); }
.card-size-3 { width: calc(33.333% - 20px); }
.card-size-4 { width: calc(25% - 15px); }
.card-size-5 { width: calc(20% - 12.8px); }

/* 平板: 5個→3個, 4個保持 */
@media (max-width: 1024px) {
  .card-size-5 { width: calc(33.333% - 20px); }
}

/* 手機: 4-5個→2個, 1-3個→1個 */
@media (max-width: 768px) {
  .card-size-4, .card-size-5 { width: calc(50% - 12px); }
}

/* 小手機: 全部→1個 */
@media (max-width: 480px) {
  .activity-card { width: 100%; }
}
```

#### 高度等比例縮放
```css
/* 1400px */
.card-size-1 { height: 580px; }
.card-size-2 { height: 500px; }
.card-size-3 { height: 460px; }
.card-size-4 { height: 420px; }
.card-size-5 { height: 380px; }

/* 1200px */
.card-size-1 { height: 560px; }
.card-size-2 { height: 480px; }
.card-size-3 { height: 440px; }
.card-size-4 { height: 400px; }
.card-size-5 { height: 360px; }

/* 持續遞減... */
```

### 2. 篩選器 (Filter Section)

#### 佈局轉換
```css
/* 桌面: 水平排列 */
.filter-section {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 15px;
}

/* 小平板: 垂直居中 */
@media (max-width: 900px) {
  .filter-section {
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
}

/* 手機: 完全垂直 + 寬度限制 */
@media (max-width: 768px) {
  .filter-item {
    width: 90%;
    max-width: 200px;
  }
}
```

#### 尺寸縮放
```css
/* 1400px → 1200px → 1024px → 900px → 768px */
padding: 12px 25px → 11px 22px → 10px 20px → 9px 18px → 8px 16px → 7px 14px;
font-size: 15px → 14px → 13px → 12px → 11px → 10px;
```

### 3. 顯示控制器 (Display Controls)

#### 佈局適配
```css
/* 桌面: 水平對齊 */
.display-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 平板: 垂直堆疊 */
@media (max-width: 768px) {
  .display-controls {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}
```

## 🎨 視覺效果響應式

### 1. 間距系統
```css
/* 大螢幕 */
gap: 40px; /* 2個卡片 */
gap: 30px; /* 3個卡片 */
gap: 20px; /* 4個卡片 */
gap: 16px; /* 5個卡片 */

/* 小螢幕統一 */
@media (max-width: 480px) {
  gap: 20px; /* 所有佈局 */
}
```

### 2. 字體縮放
```css
/* 標題 */
h1: 48px → 42px → 36px → 32px → 28px
h2: 32px → 28px → 24px → 22px → 20px
h3: 24px → 22px → 20px → 18px → 16px

/* 內文 */
body: 16px → 15px → 14px → 13px → 12px
small: 14px → 13px → 12px → 11px → 10px
```

### 3. 圓角和陰影
```css
/* 桌面 */
border-radius: 24px;
box-shadow: 0 25px 50px rgba(0,0,0,0.15);

/* 平板 */
border-radius: 20px;
box-shadow: 0 20px 40px rgba(0,0,0,0.12);

/* 手機 */
border-radius: 16px;
box-shadow: 0 15px 30px rgba(0,0,0,0.1);
```

## 🚀 性能優化

### 1. CSS 優化
```css
/* 使用 transform 而非改變 width/height */
.activity-card {
  transition: transform 0.3s ease;
  will-change: transform;
}

/* 避免重繪的屬性 */
.activity-card:hover {
  transform: translateY(-4px) scale(1.02);
}
```

### 2. 圖片響應式
```css
.activity-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
```

### 3. 字體載入優化
```css
/* 系統字體優先 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

## 📊 測試矩陣

### 設備測試
| 設備類型 | 解析度 | 卡片數量 | 佈局 | 狀態 |
|---------|--------|----------|------|------|
| 桌面 | 1920×1080 | 1-5個 | 水平 | ✅ |
| 筆電 | 1366×768 | 1-5個 | 水平 | ✅ |
| 平板橫 | 1024×768 | 1-4個 | 水平 | ✅ |
| 平板直 | 768×1024 | 1-3個 | 垂直 | ✅ |
| 手機大 | 414×896 | 1-2個 | 垂直 | ✅ |
| 手機小 | 375×667 | 1個 | 垂直 | ✅ |

### 瀏覽器支援
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

## 🎯 用戶體驗優化

### 1. 觸控友好
```css
/* 最小觸控目標 44px */
.filter-item, .items-selector {
  min-height: 44px;
  min-width: 44px;
}

/* 觸控間距 */
@media (max-width: 768px) {
  .filter-item {
    margin: 8px 4px;
  }
}
```

### 2. 可讀性保證
```css
/* 最小字體 12px */
@media (max-width: 480px) {
  body { font-size: max(12px, 1rem); }
}

/* 對比度 4.5:1 以上 */
color: #2d3748; /* 對白色背景 */
```

### 3. 載入體驗
```css
/* 骨架屏動畫 */
.activity-card {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.activity-card.visible {
  opacity: 1;
  transform: translateY(0);
}
```

## 🔧 實現技巧

### 1. Flexbox 佈局
```css
.activity-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
}

.activity-card {
  flex: 0 0 calc(33.333% - 20px);
}
```

### 2. CSS Grid 替代方案
```css
/* 可選的 Grid 實現 */
.activity-grid-alt {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

### 3. 容器查詢 (未來)
```css
/* CSS Container Queries (實驗性) */
@container (max-width: 600px) {
  .activity-card {
    flex-direction: column;
  }
}
```

## 📈 效能指標

### Core Web Vitals
- **LCP**: < 2.5s (圖片優化)
- **FID**: < 100ms (CSS 動畫優化)
- **CLS**: < 0.1 (固定尺寸)

### 載入時間
- **首屏**: < 1.5s
- **互動**: < 2s
- **完整載入**: < 3s

## 🛠️ 開發工具

### 測試工具
```bash
# Chrome DevTools
# Firefox Responsive Design Mode
# Safari Web Inspector
```

### 自動化測試
```javascript
// Playwright 響應式測試
const { test, expect } = require('@playwright/test');

test('responsive design', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/activities');
  
  const cards = await page.locator('.activity-card');
  expect(await cards.count()).toBeGreaterThan(0);
});
```

## 📝 維護指南

### 1. 新增斷點
1. 在 CSS 中添加 `@media` 查詢
2. 測試所有組件在新斷點的表現
3. 更新文檔和測試用例

### 2. 修改組件
1. 確保在所有斷點正常工作
2. 檢查觸控友好性
3. 驗證可讀性和對比度

### 3. 性能監控
1. 定期檢查 Core Web Vitals
2. 監控不同設備的載入時間
3. 優化關鍵渲染路徑

---

*最後更新: 2025-09-18*
*版本: 1.0*
