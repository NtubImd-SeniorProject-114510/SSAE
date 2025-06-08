// //loading
// document.addEventListener("DOMContentLoaded", () => {
//   const loadingScreen = document.getElementById("loading-screen");
//   const finalText = document.getElementById("final-text");

//   // 開始翻轉：Welcome 顯示 0.8 秒後
//   setTimeout(() => {
//     document.querySelector('.cube').style.animation = 'flip-up 0.4s ease forwards';
//   }, 800);

//   // 顯示「智能校事專家」0.3 秒後縮小 + 移動
//   setTimeout(() => {
//     finalText.classList.add("shrink-and-move");
//   }, 1200); // 延遲讓動畫顯得更平滑

//   // 整個 loading 淡出
//   setTimeout(() => {
//     loadingScreen.style.transition = "opacity 0.3s ease";
//     loadingScreen.style.opacity = "0";

//     setTimeout(() => {
//       loadingScreen.style.display = "none";
//     }, 300);
//   }, 1500); // 1.5秒後開始淡出
// });




//圓圈線條
// document.addEventListener("DOMContentLoaded", function () {
//   const path = document.querySelector("#circle-stroke path");
//   const pathLength = path.getTotalLength();
//   console.log("圓形路徑長度:", pathLength);

//   // 使用 JavaScript 設定動畫的 dash 值
//   path.style.strokeDasharray = pathLength;
//   path.style.strokeDashoffset = pathLength;

//   // 觸發動畫（加上類名或強制重繪）
//   path.getBoundingClientRect(); // 強制重繪
//   setTimeout(() => {
//     path.style.animation = "drawCircle 3s ease-in-out forwards";
//   }, 3000);
// });
  
document.addEventListener("DOMContentLoaded", function () {
  const path = document.querySelector("#circle-stroke path");
  const strokeGroup = document.querySelector(".stroke-group");
  const strokeGroupR = document.querySelector(".stroke-group-r");

  if (path) {
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    // 播放圓圈動畫
    path.style.animation = "drawCircle 3s ease-in-out forwards";

    // 當圓圈動畫完成後才啟用觀察器
    path.addEventListener("animationend", function () {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains("stroke-group")) {
              entry.target.classList.add("animate-stroke-left");
            } else if (entry.target.classList.contains("stroke-group-r")) {
              entry.target.classList.add("animate-stroke-right");
            }
            observer.unobserve(entry.target); // 只觸發一次
          }
        });
      }, {
        threshold: 0.5 // 超過一半才觸發
      });

      if (strokeGroup) observer.observe(strokeGroup);
      if (strokeGroupR) observer.observe(strokeGroupR);
    });
  }
});






//dialog
window.addEventListener('DOMContentLoaded', () => {
  const circle = document.querySelector('.circle-container');
  const dialogs = document.querySelectorAll('.dialog-group-l, .dialog-group-r');

  if (!circle) return;

  const circleRect = circle.getBoundingClientRect();

  dialogs.forEach((dialog, index) => {
    const dialogRect = dialog.getBoundingClientRect();

    // 計算中心點差距
    const startX = circleRect.left + circleRect.width ;
    const startY = circleRect.top + circleRect.height ;

    // 設定 CSS 變數
    dialog.style.setProperty('--start-x', `${startX}px`);
    dialog.style.setProperty('--start-y', `${startY}px`);
  });
});



// 立體模型
document.addEventListener('DOMContentLoaded', () => {
  import('https://unpkg.com/@splinetool/runtime@0.9.457/build/runtime.js')
    .then(({ Application }) => {
      const canvas1 = document.getElementById('canvas3d');
      const app1 = new Application(canvas1);
      app1.load('https://prod.spline.design/g8Q9YXB6eDm5SOmP/scene.splinecode');
    })
    .catch(error => console.error('Failed to load Spline:', error));
});

// 浮動標語
document.addEventListener("DOMContentLoaded", () => {
  const slogans = document.querySelectorAll(".floating-slogan");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const inner = entry.target.querySelector('.slogan-inner');
        if (entry.isIntersecting) {
          // 當元素進入視口時，觸發動畫
          inner.classList.remove("animate-in"); // 移除動畫類
          void inner.offsetWidth; // 強制重繪，這是觸發重新動畫的技巧
          inner.classList.add("animate-in"); // 重新添加動畫類
        }
      });
    },
    { threshold: 0.5 } // 當元素的 50% 進入視口時觸發
  );

  slogans.forEach(el => observer.observe(el));  
});



// 字母
// document.addEventListener("DOMContentLoaded", () => {
//   const icons = document.querySelectorAll('.icon-container');

//   const observer = new IntersectionObserver((entries) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         entry.target.classList.add('animate');

//         // 移除後可再次進入視窗時再觸發
//         setTimeout(() => {
//           entry.target.classList.remove('animate');
//         }, 1000);
//       }
//     });
//   }, {
//     threshold: 0.6 // 元素進入畫面 60% 時觸發
//   });

//   icons.forEach(icon => {
//     observer.observe(icon);
//   });
// });


// 文字
document.addEventListener('DOMContentLoaded', () => {
    const featureItems = document.querySelectorAll('.feature-item');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');  // 進入視口 => 顯示
        } else {
          entry.target.classList.remove('visible');  // 離開視口 => 隱藏
        }
      });
    }, {
      threshold: 0.3 // 元素進入 30% 時觸發
    });

    featureItems.forEach(item => {
      observer.observe(item);
    });
  });




//線條
document.addEventListener("DOMContentLoaded", function() {
    const path = document.querySelector("#animated-line path");
  
    // 獲取路徑的實際長度
    const pathLength = path.getTotalLength();
    console.log("SVG路徑長度:", pathLength);
  
    // 顯示初始的 5% 線段
    const initialVisiblePercentage = 0.02; // 5%
    const initialDrawLength = pathLength * (1 - initialVisiblePercentage);
  
    // 設置初始狀態 - 顯示一小段線條
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = initialDrawLength;
  
    // 監聽滾動事件
    window.addEventListener("scroll", function() {
      // 計算滾動百分比
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercentage = scrollTop / height;
  
      // 根據滾動百分比更新線條長度（從初始狀態繼續）
      const drawLength = pathLength * (1 - scrollPercentage);
      path.style.strokeDashoffset = Math.min(drawLength, initialDrawLength); // 防止倒退
    });
  });
  

//背景
  const MIN_SPEED = 0.5;
  const MAX_SPEED = 2;
  
  // Seeded random
  function seededRandom(seed) {
    let x = Math.sin(seed) * 980;
    return x - Math.floor(x);
  }
  
  function randomNumber(min, max, seed) {
    return seededRandom(seed) * (max - min) + min;
  }
  
  class Blob {
    constructor(el, seed) {
      this.el = el;
      const boundingRect = this.el.getBoundingClientRect();
      this.size = boundingRect.width;
  
      // 使用固定種子來生成穩定的初始位置
      this.initialX = randomNumber(0, window.innerWidth - this.size, seed + 1);
      this.initialY = randomNumber(0, window.innerHeight - this.size, seed + 2);
      this.el.style.top = `${this.initialY}px`;
      this.el.style.left = `${this.initialX}px`;
  
      // 固定速度與方向
      const directionX = (seed % 2 === 0) ? 1 : -1;
      const directionY = (seed % 3 === 0) ? 1 : -1;
      this.vx = randomNumber(MIN_SPEED, MAX_SPEED, seed + 3) * directionX;
      this.vy = randomNumber(MIN_SPEED, MAX_SPEED, seed + 4) * directionY;
  
      this.x = this.initialX;
      this.y = this.initialY;
    }
  
    update() {
      this.x += this.vx;
      this.y += this.vy;
  
      if (this.x >= window.innerWidth - this.size || this.x <= 0) {
        this.vx *= -1;
      }
      if (this.y >= window.innerHeight - this.size || this.y <= 0) {
        this.vy *= -1;
      }
  
      this.el.style.transform =
        `translate(${this.x - this.initialX}px, ${this.y - this.initialY}px)`;
    }
  }
  
  function initBlobs() {
    const blobs = document.querySelectorAll('.blob');
  
    blobs.forEach((blob, index) => {
      const seed = index + 100; // 確保每個 blob 都有不同但固定的 seed
  
      const initialXPercent = randomNumber(0, 100, seed + 10);
      const initialYPercent = randomNumber(0, 100, seed + 11);
      blob.style.left = `${initialXPercent}%`;
      blob.style.top = `${initialYPercent}%`;
  
      const keyframes = [
        {
          transform: `translate(${randomNumber(-25, 25, seed + 20)}%, ${randomNumber(-25, 25, seed + 21)}%)`
        },
        {
          transform: `translate(${randomNumber(-25, 25, seed + 22)}%, ${randomNumber(-25, 25, seed + 23)}%)`
        },
        {
          transform: `translate(${randomNumber(-25, 25, seed + 24)}%, ${randomNumber(-25, 25, seed + 25)}%)`
        },
        {
          transform: `translate(${randomNumber(-25, 25, seed + 26)}%, ${randomNumber(-25, 25, seed + 27)}%)`
        }
      ];
  
      blob.animate(keyframes, {
        duration: 2000 + index * 1000,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out'
      });
    });
  }
  


// 粒子
function initTechParticles() {
  const particleContainer = document.getElementById('tsparticles');
  if (!particleContainer) return;
  
  // 創建自定義流場函數 - 模擬流體動力學
  const customFlowField = {
    resolution: 40, // 流場網格解析度
    points: [],
    time: 0,
    
    // 初始化流場
    initialize: function() {
      this.points = [];
      
      // 建立流場網格
      for (let y = 0; y < this.resolution; y++) {
        for (let x = 0; x < this.resolution; x++) {
          // 將座標正規化到 0-1 範圍
          const nx = x / this.resolution;
          const ny = y / this.resolution;
          
          // 使用某種函數生成初始流場向量
          const angle = this.simplex2(nx * 5, ny * 5 + this.time) * Math.PI * 2;
          
          // 均勻的微小流動，沒有整體向右的偏移
          const vx = Math.cos(angle) * 0.8;
          const vy = Math.sin(angle) * 0.8;
          
          this.points.push({ vx, vy });
        }
      }
    },
    
    update: function() {
      this.time += 0.002;
      
      // 更新流場向量
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        const nx = i % this.resolution / this.resolution;
        const ny = Math.floor(i / this.resolution) / this.resolution;
        
        const angle = this.simplex2(nx * 5, ny * 5 + this.time) * Math.PI * 2;
        
        p.vx = Math.cos(angle) * 0.8;
        p.vy = Math.sin(angle) * 0.8;
      }
    },
    
    // 簡化的柏林噪聲函數
    simplex2: function(x, y) {
      const dot = (x, y, vx, vy) => x * vx + y * vy;
      const F2 = 0.5 * (Math.sqrt(3) - 1);
      const G2 = (3 - Math.sqrt(3)) / 6;
      
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const t = (i + j) * G2;
      
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = x0 > y0 ? 0 : 1;
      
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      
      // 使用哈希函數生成偽隨機梯度向量
      const hash = (x, y) => {
        return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
      };
      
      const n0 = this.gradientDot(hash(i, j), hash(i + 1, j), x0, y0);
      const n1 = this.gradientDot(hash(i + i1, j + j1), hash(i + i1 + 1, j + j1), x1, y1);
      const n2 = this.gradientDot(hash(i + 1, j + 1), hash(i + 2, j + 1), x2, y2);
      
      // 混合結果
      return 0.5 * (n0 + n1 + n2);
    },
    
    gradientDot: function(h1, h2, x, y) {
      const angle1 = h1 * Math.PI * 2;
      const angle2 = h2 * Math.PI * 2;
      const vx1 = Math.cos(angle1);
      const vy1 = Math.sin(angle1);
      const vx2 = Math.cos(angle2);
      const vy2 = Math.sin(angle2);
      
      return x * vx1 + y * vy1 + x * vx2 + y * vy2;
    },
    
    // 獲取指定位置的流場向量
    getFlowVector: function(x, y) {
      // 將座標歸一化到 0-1 範圍
      const nx = Math.max(0, Math.min(1, x));
      const ny = Math.max(0, Math.min(1, y));
      
      // 找到最近的流場點
      const gridX = Math.floor(nx * this.resolution);
      const gridY = Math.floor(ny * this.resolution);
      const index = gridY * this.resolution + gridX;
      
      if (index >= 0 && index < this.points.length) {
        return this.points[index];
      }
      
      return { vx: 0, vy: 0 };
    }
  };
  
  // 初始化流場
  customFlowField.initialize();
  
  // 粒子系統配置 - 超高密度粒子效果，充滿整個圓形
  const particleConfig = {
    particles: {
      number: {
        value: 1500, // 大幅增加粒子數量使圓形充滿
        density: {
          enable: true,
          value_area: 400 // 降低面積使粒子更密集
        }
      },
      color: {
        // value: ["#D1C5D1", "#AA9DA9", "#e0d3e0", "#c8b8c8", "#d8d0d8", "#ffffff", "#f0e8f0"] // 紫色系粒子
        // value: ["#9761DD", "#A577E6", "#BA91EC", "#C6A3F0", "#D4B7F4", "#ffffff"]
        value: ["#B5A9B5", "#8F7C8F", "#C2B3C2", "#A899A8", "#B9ADB9", "#ffffff"]
      },
      shape: {
        type: "triangle", // 使用三角形形狀
      },
      opacity: {
        value: 0.9, // 增加不透明度
        random: true,
        anim: {
          enable: true,
          speed: 0.9,
          opacity_min: 0.4,
          sync: false
        }
      },
      size: {
        value: 2.5, // 使粒子大小適中
        random: true,
        anim: {
          enable: true,
          speed: 0.5,
          size_min: 1.2, // 增加最小尺寸
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 50, // 增加連線距離以創建更多連接
        color: "#D1C5D1", // 紫色系連線
        opacity: 0.25, // 增加線條不透明度
        width: 1.5 // 調整線條粗細
      },
      move: {
        enable: true,
        speed: 0.6,
        direction: "none",
        random: false,
        straight: false,
        out_mode: "bounce", // 確保粒子不會離開容器
        bounce: true, // 開啟反彈效果
        attract: {
          enable: false
        }
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: true,
          mode: "repulse"
        },
        onclick: {
          enable: true,
          mode: "push"
        },
        resize: true
      },
      modes: {
        repulse: {
          distance: 120,
          duration: 0.8,
          speed: 10,
          easing: "ease-out-cubic"
        },
        push: {
          particles_nb: 6
        }
      }
    },
    retina_detect: true,
    fpsLimit: 60,
    fullScreen: {
      enable: false
    }
  };

  // 初始化粒子系統
  const particles = tsParticles.load("tsparticles", particleConfig);
  
  // 添加自定義更新函數，實現流體動力學效果
  let lastTime = 0;
  let mouseX = 0, mouseY = 0;
  let isMouseInteracting = false;
  let mouseInteractionTimeout;
  
  // 追蹤滑鼠位置和互動
  let isMouseOver = false;
  let lastMouseMove = Date.now();
  let flowAnimation;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMouseMove = Date.now();
    
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    
    // 檢測滑鼠是否在圓形附近
    if (distance < rect.width) {
      isMouseInteracting = true;
      isMouseOver = true;
      // 不再使用延遲恢復，當滑鼠離開區域時會立即重設狀態
      
      // 停止自動流動動畫
      if (flowAnimation) {
        cancelAnimationFrame(flowAnimation);
        flowAnimation = null;
      }
    } else if (isMouseOver) {
      isMouseOver = false;
      isMouseInteracting = false; // 立即停止互動狀態
      // 立即恢復圓形狀態，不再有任何延遲
      startFlowAnimation(); // 直接啟動流動動畫，無需等待
    }
  });
  
  // 圓形容器上的互動事件
  const circleContainer = document.querySelector('.circle-particles');
  if (circleContainer) {
    circleContainer.addEventListener('mouseover', () => {
      isMouseOver = true;
      if (flowAnimation) {
        cancelAnimationFrame(flowAnimation);
        flowAnimation = null;
      }
    });
    
    circleContainer.addEventListener('mouseout', () => {
      isMouseOver = false;
      isMouseInteracting = false; // 立即停止互動狀態
      // 立即恢復圓形狀態，不再有任何延遲
      startFlowAnimation(); // 直接啟動流動動畫，無需等待
    });
  }
  
  // 自定義粒子更新函數
  function customParticleUpdate(container) {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (!container || !container.particles) return;
    
    // 更新流場
    customFlowField.update();
    
    // 獲取圓形容器
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    
    // 更新每個粒子
    container.particles.array.forEach(particle => {
      // 計算粒子在畫布中的相對位置 (0-1)
      const canvasWidth = container.canvas.size.width;
      const canvasHeight = container.canvas.size.height;
      const relX = particle.position.x / canvasWidth;
      const relY = particle.position.y / canvasHeight;
      
      // 獲取流場向量
      const flowVector = customFlowField.getFlowVector(relX, relY);
      
      // 計算粒子到圓心的距離
      const particleScreenX = rect.left + relX * rect.width;
      const particleScreenY = rect.top + relY * rect.height;
      const distToCenter = Math.sqrt(Math.pow(particleScreenX - centerX, 2) + Math.pow(particleScreenY - centerY, 2));
      
      // 計算粒子到滑鼠的距離
      const distToMouse = Math.sqrt(Math.pow(particleScreenX - mouseX, 2) + Math.pow(particleScreenY - mouseY, 2));
      
      // 基本流場影響
      let vx = flowVector.vx * 0.3;
      let vy = flowVector.vy * 0.3;
      
      // 計算到圓心的正規化距離
      const normalizedDist = distToCenter / radius;
      
      // 根據是否有滑鼠互動來調整粒子行為
      const isParticleInteracting = distToMouse < 80; // 判斷該粒子是否與滑鼠互動

      if (isParticleInteracting) {
        // 滑鼠靠近該粒子，讓它逃離並加些隨機擾動
        const angleFromMouse = Math.atan2(particleScreenY - mouseY, particleScreenX - mouseX);
        const repulseFactor = Math.max(0, 1 - distToMouse / 80) * 6;
        vx += Math.cos(angleFromMouse) * repulseFactor;
        vy += Math.sin(angleFromMouse) * repulseFactor;

        // 添加隨機擾動
        vx += (Math.random() - 0.5) * 0.6;
        vy += (Math.random() - 0.5) * 0.6;
      } else {
        // 滑鼠不再靠近此粒子，回歸原位（有晃動）
        if (!particle.basePosition) {
          particle.basePosition = { x: particle.position.x, y: particle.position.y };
        }
        if (!particle.baseOrigin) {
          particle.baseOrigin = { x: particle.basePosition.x, y: particle.basePosition.y };
        }

        const t = Date.now() * 0.002 + (particle.baseOrigin.x % 100);
        const swing = Math.sin(t) * 6;
        const swingX = particle.baseOrigin.x + swing;

        const dx = swingX - particle.position.x;
        const dy = particle.baseOrigin.y - particle.position.y;
        const distToBase = Math.sqrt(dx * dx + dy * dy);
        const returnSpeed = 0.18;
        if (distToBase > 0.5) {
          vx = dx * returnSpeed;
          vy = dy * returnSpeed;
        } else {
          particle.position.x = swingX;
          particle.position.y = particle.baseOrigin.y;
          particle.velocity.x = 0;
          particle.velocity.y = 0;
          vx = 0;
          vy = 0;
        }
      }

      
      
      // 滑鼠互動 - 逃離效果，減少互動範圍
      if (isMouseInteracting && distToMouse < 200) { // 減少影響半徑從 150 到 80
        const repulseFactor = Math.max(0, 1 - distToMouse / 80) * 6; // 增強逃離力度
        const angleFromMouse = Math.atan2(particleScreenY - mouseY, particleScreenX - mouseX);
        vx += Math.cos(angleFromMouse) * repulseFactor;
        vy += Math.sin(angleFromMouse) * repulseFactor;
      }
      
      // 應用速度（滑鼠不在時，直接設為 vx/vy）
      if (!isMouseInteracting) {
        particle.velocity.x = vx;
        particle.velocity.y = vy;
      } else {
        particle.velocity.x = particle.velocity.x * 0.92 + vx * 0.08;
        particle.velocity.y = particle.velocity.y * 0.92 + vy * 0.08;
      }
      
      // 限制最大速度
      const speed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y);
      if (speed > 2) {
        particle.velocity.x = (particle.velocity.x / speed) * 2;
        particle.velocity.y = (particle.velocity.y / speed) * 2;
      }
    });
  }
  
  // 添加自定義更新函數到粒子系統
  particles.then(container => {
    if (container) {
      // 覆蓋默認更新函數
      const originalUpdate = container.particles.update.bind(container.particles);
      container.particles.update = (delta) => {
        originalUpdate(delta);
        customParticleUpdate(container);
      };
    }
  });
  
  // 自動流動動畫函數 - 小幅度均勻流動
  function startFlowAnimation() {
    if (isMouseOver || flowAnimation) return;
    
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    let time = 0;
    const animate = () => {
      time += 0.006; // 降低速度，使運動更柔和
      
      // 創建均勻的圓形路徑運動，不往任何特定方向偏移
      const x = Math.sin(time) * 3;
      const y = Math.cos(time * 1.2) * 3; // 使用不同的频率使運動更自然
      
      circle.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      
      flowAnimation = requestAnimationFrame(animate);
    };
    
    flowAnimation = requestAnimationFrame(animate);
  }
  
  // 圓形容器的輕微移動效果
  function animateCircleContainer() {
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    // 初始化圓形狀態 - 將容器置中
    circle.style.transform = 'translate(-50%, -50%)';
    
    // 立即啟動均勻的微小流動，不會往任何特定方向偏移
    startFlowAnimation();
  }
  
  // 啟動圓形容器動畫
  animateCircleContainer();
  
  // SVG 筆畫動畫觸發
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0
    );
  }

  function triggerSvgDrawAnimation() {
    document.querySelectorAll('.feature-item').forEach(item => {
      const svg = item.querySelector('svg.animated-stroke');
      if (svg) {
        if (isInViewport(item)) {
          svg.classList.add('svg-animate-start');
        } else {
          svg.classList.remove('svg-animate-start');
        }
      }
    });
  }

  window.addEventListener('scroll', triggerSvgDrawAnimation);
  window.addEventListener('resize', triggerSvgDrawAnimation);
  document.addEventListener('DOMContentLoaded', triggerSvgDrawAnimation);

}

document.addEventListener("DOMContentLoaded", () => {
  initBlobs();
  initTechParticles();
  initFeatureSvgAnimation();
});

// SVG 畫線動畫 - 專門針對 feature-item 中的 SVG
function initFeatureSvgAnimation() {
  // 選取所有 feature-item 元素
  const featureItems = document.querySelectorAll('.feature-item');
  
  // 設定 CSS 變數以供動畫使用
  featureItems.forEach(item => {
    const svg = item.querySelector('svg');
    if (!svg) return;
    
    // 修改 SVG 元素，使其能夠顯示畫線動畫
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
      // 檢查是否有 fill 屬性
      const fill = path.getAttribute('fill');
      
      // 如果是填充路徑，設定為線條路徑
      if (fill && fill !== 'none') {
        path.setAttribute('stroke', '#000');
        path.setAttribute('stroke-width', '4'); // 增加線條粗細
        path.setAttribute('fill', 'none');
      }
      
      // 計算路徑總長度
      const pathLength = path.getTotalLength ? path.getTotalLength() : 1000;
      console.log("SVG路徑總長度:", pathLength);
      
      // 設定 CSS 變數以供動畫使用
      document.documentElement.style.setProperty('--path-length', pathLength);
      
      // 初始化路徑樣式
      path.style.strokeDasharray = pathLength;
      path.style.strokeDashoffset = pathLength;
    });
  });
  
  // 初始化 Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const featureItem = entry.target;
      const svg = featureItem.querySelector('svg');
      if (!svg) return;
      
      const paths = svg.querySelectorAll('path');
      
      if (entry.isIntersecting) {
        // 元素進入視窗範圍
        console.log("元素進入視窗，開始動畫");
        
        // 添加淡入效果
        featureItem.classList.add('fade-in');
        
        // 重置動畫狀態
        svg.classList.remove('animated');
        paths.forEach(path => {
          const pathLength = path.getTotalLength ? path.getTotalLength() : 1000;
          path.style.animation = 'none';
          path.style.strokeDashoffset = pathLength;
        });
        
        // 延遲 0.5 秒後開始 SVG 動畫
        setTimeout(() => {
          svg.classList.add('animated');
          paths.forEach(path => {
            path.style.animation = 'drawPath 3s ease-in-out forwards';
          });
        }, 500);
        
      } else {
        // 元素離開視窗範圍
        console.log("元素離開視窗，重置動畫");
        
        // 移除淡入效果
        featureItem.classList.remove('fade-in');
        
        // 重置 SVG 動畫狀態
        svg.classList.remove('animated');
        paths.forEach(path => {
          const pathLength = path.getTotalLength ? path.getTotalLength() : 1000;
          path.style.animation = 'none';
          path.style.strokeDashoffset = pathLength;
        });
      }
    });
  }, {
    // 當元素 30% 進入視窗時觸發
    threshold: 0.3,
    // 提前 50px 開始觸發
    rootMargin: '0px 0px -50px 0px'
  });
  
  // 開始觀察目標元素（不移除觀察器以實現重複動畫）
  featureItems.forEach(item => {
    observer.observe(item);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const featureItem = document.getElementById('feature-item');
  const svgElement = document.querySelector('.rules');
  const path = svgElement.querySelector('path');
  
  // 計算路徑總長度
  const pathLength = path.getTotalLength();
  console.log("SVG路徑總長度:", pathLength);
  
  // 設定CSS變量以供動畫使用
  document.documentElement.style.setProperty('--path-length', pathLength);
  
  // 初始化路徑樣式
  path.style.strokeDasharray = pathLength;
  path.style.strokeDashoffset = pathLength;
  
  // 創建 Intersection Observer
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              // 元素進入視窗範圍
              console.log("元素進入視窗，開始動畫");
              
              // 添加淡入效果
              featureItem.classList.add('fade-in');
              
              // 重置動畫狀態
              svgElement.classList.remove('animated');
              path.style.animation = 'none';
              path.style.strokeDashoffset = pathLength;
              
              // 延遲0.5秒後開始SVG動畫
              setTimeout(() => {
                  svgElement.classList.add('animated');
                  path.style.animation = 'drawPath 3s ease-in-out forwards';
              }, 500);
              
          } else {
              // 元素離開視窗範圍
              console.log("元素離開視窗，重置動畫");
              
              // 移除淡入效果
              featureItem.classList.remove('fade-in');
              
              // 重置SVG動畫狀態
              svgElement.classList.remove('animated');
              path.style.animation = 'none';
              path.style.strokeDashoffset = pathLength;
          }
      });
  }, {
      // 當元素30%進入視窗時觸發
      threshold: 0.3,
      // 提前50px開始觸發
      rootMargin: '0px 0px -50px 0px'
  });
  
  // 開始觀察目標元素（不移除觀察器以實現重複動畫）
  observer.observe(featureItem);
  
  // 移除滾動指示器當用戶開始滾動
  let hasScrolled = false;
  window.addEventListener('scroll', function() {
      if (!hasScrolled) {
          const indicator = document.querySelector('.scroll-indicator');
          if (indicator) {
              indicator.style.opacity = '0';
              setTimeout(() => {
                  indicator.remove();
              }, 500);
          }
          hasScrolled = true;
      }
  });
});