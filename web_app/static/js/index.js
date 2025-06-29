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
    path.style.animation = "drawCircle 3s ease-in-out forwards";

    path.addEventListener("animationend", function () {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const el = entry.target;

          if (entry.isIntersecting) {
            // 👉 強制重播動畫的技巧
            el.classList.remove("animate-stroke"); // 自訂共用 class
            void el.offsetWidth; // 觸發 reflow
            el.classList.add("animate-stroke");
          } else {
            el.classList.remove("animate-stroke");
          }
        });
      }, {
        threshold: 0.5
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



//
// 場景設置
document.addEventListener('DOMContentLoaded', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 使用指定的 canvas 元素
    const canvas = document.createElement('canvas');
    // 清空 owl-container 並插入canvas
    const container = document.getElementById('owl-container');
    container.innerHTML = '';
    container.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true, 
        alpha: true
    });
    renderer.setSize(400, 400);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xD1C5D1, 0.3);
    // renderer.setClearColor(0xffffff);

    // 燈光設置
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(7, 7, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-10, 10, 10);
    scene.add(pointLight);

    // 貓頭鷹群組
    const owl = new THREE.Group();

    // 材質定義
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x9479C1 });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    const capMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
    const tassalMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const footMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // 創建七邊形幾何體
    function createHeptagonGeometry(radius, depth) {
        const shape = new THREE.Shape();
        const sides = 7;
        
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        
        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelSegments: 7,
            steps: 6,
            bevelSize: 0.2,
            bevelThickness: 0.2
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    // 七邊形身體 - 改為垂直方向，底邊平行於畫面，尖角朝上
    const bodyGeometry = createHeptagonGeometry(1.2, 0.7);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // 旋轉讓底邊平行於畫面，尖角朝上
    body.rotation.z = -Math.PI / 14; // 負角度讓尖角朝上
    body.position.y = 0; // 調整到中心位置
    body.position.z = -0.3;
    body.castShadow = true;
    owl.add(body);


    // 大眼睛 - 向前移動避免與身體重疊
    const leftEyeGeometry = new THREE.SphereGeometry(0.55, 32, 32);
    const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 0.3, 0.5); // z軸向前移動更多
    leftEye.scale.set(0.85, 1, 0.8);
    leftEye.castShadow = true;
    owl.add(leftEye);

    const rightEyeGeometry = new THREE.SphereGeometry(0.55, 32, 32);
    const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 0.3, 0.5); // z軸向前移動更多
    rightEye.scale.set(0.85, 1, 0.8);
    rightEye.castShadow = true;
    owl.add(rightEye);

    // 瞳孔（眯眯眼）- 對應眼睛位置調整
    const leftPupilGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const leftPupil = new THREE.Mesh(leftPupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.4, 0.3, 0.85); // 對應調整
    leftPupil.scale.set(1, 0.25, 1);
    leftPupil.rotation.z = Math.PI / 12; // 左眼下垂
    leftPupil.castShadow = true;
    owl.add(leftPupil);

    const rightPupilGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const rightPupil = new THREE.Mesh(rightPupilGeometry, pupilMaterial);
    rightPupil.position.set(0.4, 0.3, 0.85); // 對應調整
    rightPupil.scale.set(1, 0.25, 1);
    rightPupil.rotation.z = -Math.PI / 12; // 右眼下垂
    rightPupil.castShadow = true;
    owl.add(rightPupil);

    // // 眉毛 - 對應眼睛位置調整
    // const leftEyebrowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    // const leftEyebrow = new THREE.Mesh(leftEyebrowGeometry, eyebrowMaterial);
    // leftEyebrow.position.set(-0.4, 0.95, 1.2); // 向上和向前移動
    // leftEyebrow.scale.set(2, 0.3, 0.5);
    // leftEyebrow.rotation.z = 0.3;
    // owl.add(leftEyebrow);

    // const rightEyebrowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    // const rightEyebrow = new THREE.Mesh(rightEyebrowGeometry, eyebrowMaterial);
    // rightEyebrow.position.set(0.4, 0.95, 1.2); // 向上和向前移動
    // rightEyebrow.scale.set(2, 0.3, 0.5);
    // rightEyebrow.rotation.z = -0.3;
    // owl.add(rightEyebrow);

    // 嘴巴 - 向前移動
    const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, -0.1, 0.9); // 向前移動
    // 讓鳥喙稍微後仰（大約 15 度）
    beak.rotation.x = Math.PI - (Math.PI / 8);
    beak.castShadow = true;
    owl.add(beak);

    // 白色肚子
    const bellyGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    belly.position.set(0, -0.6, 0.7); // 在身體前方
    belly.scale.set(1.4, 1, 0.3); // 稍微拉長，壓扁
    belly.castShadow = true;
    owl.add(belly);

    // 肚子上的四個黑色彎曲線條
    const curveGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI * 0.6);

    // 左內側弧線
    const curve1 = new THREE.Mesh(curveGeometry, pupilMaterial);
    curve1.position.set(-0.15, -0.5, 0.9);
    curve1.rotation.z = 2;
    curve1.castShadow = true;
    owl.add(curve1);
    
    // 右內側弧線
    const curve2 = new THREE.Mesh(curveGeometry, pupilMaterial);
    curve2.position.set(0.15, -0.5, 0.9);
    curve2.rotation.z = -1;
    curve2.castShadow = true;
    owl.add(curve2);
    
    // 左外側弧線
    const curve3 = new THREE.Mesh(curveGeometry, pupilMaterial);
    curve3.position.set(-0.4, -0.5, 0.9);
    curve3.rotation.z = 2;
    curve3.castShadow = true;
    owl.add(curve3);
    
    // 右外側弧線
    const curve4 = new THREE.Mesh(curveGeometry, pupilMaterial);
    curve4.position.set(0.4, -0.5, 0.9);
    curve4.rotation.z = -1;
    curve4.castShadow = true;
    owl.add(curve4);



    // 手
    // 手臂曲線：上段較平，後段才彎下
    class CurvedHipArm extends THREE.Curve {
    getPoint(t) {
        const arcAngle = Math.PI * 0.8; // 弧度略小於半圓
        const radius = 0.5;
        const angle = t * arcAngle + Math.PI * 0.1; // 起點向下偏，讓手從下往上彎

        const y = Math.sin(angle) * radius;              // 垂直方向
        const x = Math.cos(angle) * radius * 0.6;        // 水平收進來一點
        const z = 0;
        return new THREE.Vector3(x, y, z);
    }
    }

    // 幾何
    const armPath = new CurvedHipArm();
    const armGeometry = new THREE.TubeGeometry(armPath, 64, 0.03, 8, false);

    // 左手
    const leftArm = new THREE.Mesh(armGeometry, pupilMaterial);
    leftArm.position.set(-1.1, -0.3, 0.4);  // 微調貼近身體
    leftArm.rotation.z = Math.PI / 2;       // 垂直
    leftArm.castShadow = true;
    owl.add(leftArm);

    // 右手
    const rightArm = new THREE.Mesh(armGeometry.clone(), pupilMaterial);
    rightArm.scale.x = -1;
    rightArm.position.set(1.1, -0.3, 0.4);
    rightArm.rotation.z = -Math.PI / 2;     // 垂直、鏡像
    rightArm.castShadow = true;
    owl.add(rightArm);

    // 拳頭大小
    const fistRadius = 0.06;
    const fistGeometry = new THREE.SphereGeometry(fistRadius, 16, 16);

    // 拿到手臂終點位置（t = 1）
    const leftEnd = armPath.getPoint(1);
    const rightEnd = armPath.getPoint(1).clone().multiply(new THREE.Vector3(-1, 1, 1)); // 鏡像

    // 左拳頭
    const leftFist = new THREE.Mesh(fistGeometry, pupilMaterial);
    leftFist.position.copy(leftEnd);
    leftFist.position.add(new THREE.Vector3(-0.95, -0.78, 0.4)); // 加上左手基礎位置
    leftFist.scale.set(1.3, 1, 1.8);
    leftFist.castShadow = true; 
    owl.add(leftFist);

    // 右拳頭
    const rightFist = new THREE.Mesh(fistGeometry.clone(), pupilMaterial);
    rightFist.position.copy(rightEnd);
    rightFist.position.add(new THREE.Vector3(0.95, -0.78, 0.4)); // 加上右手基礎位置
    rightFist.scale.set(1.3, 1, 1.3);
    rightFist.castShadow = true;
    owl.add(rightFist);


    // 小腳 - 反轉 180 度
    // 1. 小腳的圓弧曲線（反向）
    class CurvedFoot extends THREE.Curve {
    getPoint(t) {
        const arcAngle = Math.PI * 0.9;  // 弧度略小於半圓
        const radius = 0.3;              // 比手臂短
        const angle = t * arcAngle + Math.PI * 0.2; // 起點稍微偏角度

        // 反向方向：將腳彎曲向上
        const y = Math.sin(angle) * radius + 1.2;   // 往上偏移，讓腳朝向反向
        const x = Math.cos(angle) * radius * 0.7;   // 水平收進來一點，更貼腳
        const z = 0;
        return new THREE.Vector3(x, y, z);
    }
    }

    // 2. 幾何與材質
    const footPath = new CurvedFoot();
    // 改變 `radius` 來使線條變細
    const footGeometry = new THREE.TubeGeometry(footPath, 32, 0.025, 8, false);  // 將半徑設為 0.02

    // 左腳
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(1.35, -0.6, 0.3); // 左腳微調位置
    leftFoot.rotation.z = 2;    // 旋轉180度，朝下
    leftFoot.scale.x = -1;      // 反轉 x 軸
    leftFoot.scale.y = 1.3;
    leftFoot.castShadow = true;
    owl.add(leftFoot);

    // 右腳
    const rightFoot = new THREE.Mesh(footGeometry.clone(), footMaterial);
    rightFoot.scale.x = 1;                 // 反轉回來
    rightFoot.position.set(-1.35, -0.6, 0.3); // 右腳微調位置
    rightFoot.rotation.z = -2;    // 旋轉180度，朝下
    rightFoot.scale.y = 1.3;
    rightFoot.castShadow = true;
    owl.add(rightFoot);


    // 3. 腳趾球（橢圓形）
    const toeRadius = 0.08;
    const toeGeometry = new THREE.SphereGeometry(toeRadius, 16, 16);

    // 左腳趾
    const leftToe = new THREE.Mesh(toeGeometry, footMaterial);
    const leftEndF = footPath.getPoint(1);
    leftToe.position.copy(leftEndF);
    leftToe.position.add(new THREE.Vector3(-0.03, -2.67, 0.3)); // 加上左腳基礎位置
    leftToe.scale.set(1.5, 1, 1.3);  // 橢圓
    leftToe.castShadow = true;
    owl.add(leftToe);

    // 右腳趾
    const rightToe = new THREE.Mesh(toeGeometry.clone(), footMaterial);
    const rightEndF = footPath.getPoint(1).clone().multiply(new THREE.Vector3(-1, 1, 1)); // 鏡像
    rightToe.position.copy(rightEndF);
    rightToe.position.add(new THREE.Vector3(0.03, -2.67, 0.3)); // 加上右腳基礎位置
    rightToe.scale.set(1.5, 1, 1.3);  // 橢圓
    rightToe.castShadow = true;
    owl.add(rightToe);



    // 學士帽 - 向上移動更多
    // 帽子底部
    const capBaseGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.4, 32);
    const capBase = new THREE.Mesh(capBaseGeometry, capMaterial);
    capBase.position.set(0, 1.4, 0.1); // 向上移動更多
    capBase.castShadow = true;
    owl.add(capBase);

    // 帽子頂部方形
    const capTopGeometry = new THREE.BoxGeometry(1.7, 0.1, 1.7);
    const capTop = new THREE.Mesh(capTopGeometry, capMaterial);
    capTop.position.set(0, 1.6, 0.1); // 對應調整
    capTop.castShadow = true;
    owl.add(capTop);

    // 流蘇 - 對應帽子位置調整
    // 創建流蘇的曲線（從平行開始轉到垂直）
    class TassalCurve extends THREE.Curve {
        constructor(start, mid, end) {
            super();
            this.start = start; // 起點
            this.mid = mid;     // 轉彎的中點
            this.end = end;     // 終點
        }

        getPoint(t) {
            if (t < 0.5) {
                // 前半段（直線從起點到轉彎點）
                const x = this.start.x + (this.mid.x - this.start.x) * 2 * t;
                const y = this.start.y + (this.mid.y - this.start.y) * 2 * t;
                const z = this.start.z + (this.mid.z - this.start.z) * 2 * t;
                return new THREE.Vector3(x, y, z);
            } else {
                // 後半段（直線從轉彎點到終點）
                const x = this.mid.x + (this.end.x - this.mid.x) * 2 * (t - 0.5);
                const y = this.mid.y + (this.end.y - this.mid.y) * 2 * (t - 0.5);
                const z = this.mid.z + (this.end.z - this.mid.z) * 2 * (t - 0.5);
                return new THREE.Vector3(x, y, z);
            }
        }
    }

    // 設置流蘇曲線的起點、中點控制點和終點
    const start = new THREE.Vector3(0, 1.68, 0.25); // 起點
    const end = new THREE.Vector3(0.78, 1.4, 0.95);   // 終點（稍微向下）
    const mid = new THREE.Vector3(0.78, 1.68, 0.95); // 中間控制點，讓它有點彎曲的效果

    // 創建曲線
    const tassalCurve = new TassalCurve(start, mid, end);

    // 使用曲線來生成流蘇的幾何形狀
    const path = new THREE.CurvePath();
    path.add(tassalCurve);

    // 創建流蘇的圓柱形網格
    const tassalStringGeometry = new THREE.TubeGeometry(path, 50, 0.02, 8, false);
    const tassalString = new THREE.Mesh(tassalStringGeometry, tassalMaterial);

    // 將流蘇放置到帽子上
    tassalString.castShadow = true;
    owl.add(tassalString);

    const tassalGroup = new THREE.Group(); // 群組來收所有流蘇線
    const numStrands = 12; // 線條數
    const radius = 0.02; // 流蘇線離中心的距離
    const strandLength = 0.2;

    for (let i = 0; i < numStrands; i++) {
        const angle = (i / numStrands) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // 每條線的起點是中心，終點是這個 (x, -length/2, z)
        const strandGeometry = new THREE.CylinderGeometry(0.005, 0.005, strandLength, 3);
        const strand = new THREE.Mesh(strandGeometry, tassalMaterial);

        // 將圓柱先移動到底部對準原點，讓它從中心「伸出去」
        strand.position.set(x, -strandLength, z); // 中心與終點中間點
        strand.lookAt(new THREE.Vector3(x, -strandLength, z)); // 朝向末端方向
        strand.castShadow = true;

        tassalGroup.add(strand);
    }

    // 設定整個流蘇群組的位置（同原本球體）
    tassalGroup.position.set(0.78, 1.5, 0.95);

    // 將整個流蘇群組加到 tassalString 上
    tassalString.add(tassalGroup);

    // 展示台
    const platformGeometry = new THREE.CylinderGeometry(2, 2, 0.3, 32);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -2;
    platform.receiveShadow = true;
    scene.add(platform);

    const owlGroup = new THREE.Group();
    owlGroup.add(owl);
    owlGroup.add(platform);
    owlGroup.scale.set(1.5, 1.5, 1.5); // 調整倍率
    owlGroup.position.y = 0.2; // 調高一點

    scene.add(owlGroup);

    // 相機位置 - 調整以適應新的佈局
    camera.position.set(0, 1, 9);
    camera.lookAt(0, 0, 0);

    
    let mouseNormX = 0;
    let mouseNormY = 0;

    window.addEventListener('mousemove', (event) => {
        // 將滑鼠座標轉換為 -1 到 1 的範圍（相對於整個視窗）
        mouseNormX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseNormY = -((event.clientY / window.innerHeight) * 2 - 1); // Y 軸反轉
    });

    // // 滑鼠控制變數
    // let mouseX = 0;
    // let mouseY = 0;
    // let targetRotationX = 0;
    // let targetRotationY = 0;
    // let mouseDown = false;
    // let userControlling = false;

    // // 滑鼠事件，只作用在 owlContainer 上
    // const interactionCanvas = canvas;
    // interactionCanvas.addEventListener('mousedown', (event) => {
    //     mouseDown = true;
    //     userControlling = true;
    //     mouseX = event.clientX;
    //     mouseY = event.clientY;
    // });

    // window.addEventListener('mouseup', () => {
    //     mouseDown = false;
    //     setTimeout(() => {
    //         userControlling = false;
    //     }, 3000);
    // });

    // interactionCanvas.addEventListener('mousemove', (event) => {
    //     if (mouseDown) {
    //         targetRotationY += (event.clientX - mouseX) * 0.01;
    //         targetRotationX += (event.clientY - mouseY) * 0.01;
    //         mouseX = event.clientX;
    //         mouseY = event.clientY;
    //     }
    // });

    // // 滾輪縮放，只在 canvas 上觸發
    // interactionCanvas.addEventListener('wheel', (event) => {
    //     event.preventDefault(); // 防止頁面滾動
    //     camera.position.z += event.deltaY * 0.01;
    //     camera.position.z = Math.max(3, Math.min(10, camera.position.z));
    // }, { passive: false });

    // 眨眼動畫
    let blinkTimer = 0;
    let isBlinking = false;

    function animate() {
        requestAnimationFrame(animate);

        // 根據滑鼠位置讓 owlGroup 轉動
        const targetY = mouseNormX * Math.PI / 6;  // 左右最多 ±30 度
        const targetX = -mouseNormY * Math.PI / 12; // 上下最多 ±15 度

        owl.rotation.y += (targetY - owl.rotation.y) * 0.05;
        owl.rotation.x += (targetX - owl.rotation.x) * 0.05;

        // 自動旋轉（當用戶沒有控制時）
        // if (!userControlling) {
        //     const time = Date.now() * 0.0005; // 調整速度變慢
        //     owl.rotation.y = Math.sin(time - Math.PI / 4) * (Math.PI / 4);
        // } else {
        //     owl.rotation.y += (targetRotationY - owl.rotation.y) * 0.05;
        //     owl.rotation.x += (targetRotationX - owl.rotation.x) * 0.05;
        // }

        // 輕微的上下浮動
        owl.position.y = Math.sin(Date.now() * 0.001) * 0.05;

        // 流蘇輕微搖擺
        tassalString.rotation.z = Math.sin(Date.now() * 0.003) * 0.02;
        tassalGroup.rotation.z = Math.sin(Date.now() * 0.003) * 0.03;

        // 眨眼動畫
        blinkTimer++;
        if (blinkTimer > 80 && !isBlinking) {
            isBlinking = true;
            blinkTimer = 0;
        }

        if (isBlinking) {
            const blinkProgress = blinkTimer / 8;
            if (blinkProgress < 1) {
                leftEye.scale.y = 1 - blinkProgress * 0.8;
                rightEye.scale.y = 1 - blinkProgress * 0.8;
            } else if (blinkProgress < 2) {
                leftEye.scale.y = 0.2 + (blinkProgress - 1) * 0.8;
                rightEye.scale.y = 0.2 + (blinkProgress - 1) * 0.8;
            } else {
                leftEye.scale.y = 1;
                rightEye.scale.y = 1;
                isBlinking = false;
                blinkTimer = 0;
            }
        }

        renderer.render(scene, camera);
    }

    // 響應式設計
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});

        


// 便利標籤貼
document.addEventListener("DOMContentLoaded", function () {
  const slogans = document.querySelectorAll('.slogan-inner');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      } else {
        entry.target.classList.remove('animate-in');
      }
    });
  }, {
    threshold: 0.3
  });

  slogans.forEach(slogan => observer.observe(slogan));
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

// // 3D 貓頭鷹模型初始化
// function initOwl3D() {
//   if (!window.THREE) return;
//   const container = document.getElementById('owl-container');
//   if (!container) return;
//   // 清空內容
//   container.innerHTML = '';
//   // 建立 canvas
//   const canvas = document.createElement('canvas');
//   canvas.width = 400;
//   canvas.height = 400;
//   canvas.style.width = '400px';
//   canvas.style.height = '400px';
//   container.appendChild(canvas);

//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
//   const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
//   renderer.setSize(400, 400);
//   renderer.shadowMap.enabled = true;
//   renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//   renderer.setClearColor(0xf0e6ff);

//   // 燈光
//   const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
//   scene.add(ambientLight);
//   const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
//   directionalLight.position.set(7, 7, 5);
//   directionalLight.castShadow = true;
//   directionalLight.shadow.mapSize.width = 2048;
//   directionalLight.shadow.mapSize.height = 2048;
//   scene.add(directionalLight);
//   const pointLight = new THREE.PointLight(0xffffff, 0.5);
//   pointLight.position.set(-10, 10, 10);
//   scene.add(pointLight);

//   // 貓頭鷹群組
//   const owl = new THREE.Group();
//   // 材質
//   const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x9479C1 });
//   const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
//   const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
//   const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
//   const capMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
//   const tassalMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
//   const eyebrowMaterial = new THREE.MeshLambertMaterial({ color: 0x7a6bb0 });
//   const footMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

//   // 七邊形身體
//   function createHeptagonGeometry(radius, depth) {
//     const shape = new THREE.Shape();
//     const sides = 7;
//     for (let i = 0; i < sides; i++) {
//       const angle = (i / sides) * Math.PI * 2;
//       const x = Math.cos(angle) * radius;
//       const y = Math.sin(angle) * radius;
//       if (i === 0) shape.moveTo(x, y);
//       else shape.lineTo(x, y);
//     }
//     const extrudeSettings = {
//       depth: depth,
//       bevelEnabled: true,
//       bevelSegments: 7,
//       steps: 6,
//       bevelSize: 0.2,
//       bevelThickness: 0.2
//     };
//     return new THREE.ExtrudeGeometry(shape, extrudeSettings);
//   }
//   const bodyGeometry = createHeptagonGeometry(1.2, 0.45);
//   const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
//   body.rotation.z = -Math.PI / 14;
//   body.position.y = 0;
//   body.castShadow = true;
//   owl.add(body);
//   // 眼睛
//   const leftEyeGeometry = new THREE.SphereGeometry(0.55, 32, 32);
//   const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
//   leftEye.position.set(-0.4, 0.3, 0.5);
//   leftEye.scale.set(0.85, 1, 0.8);
//   leftEye.castShadow = true;
//   owl.add(leftEye);
//   const rightEyeGeometry = new THREE.SphereGeometry(0.55, 32, 32);
//   const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
//   rightEye.position.set(0.4, 0.3, 0.5);
//   rightEye.scale.set(0.85, 1, 0.8);
//   rightEye.castShadow = true;
//   owl.add(rightEye);
//   // 瞳孔
//   const leftPupilGeometry = new THREE.SphereGeometry(0.12, 16, 16);
//   const leftPupil = new THREE.Mesh(leftPupilGeometry, pupilMaterial);
//   leftPupil.position.set(-0.4, 0.3, 0.85);
//   leftPupil.scale.set(1, 0.25, 1);
//   leftPupil.rotation.z = Math.PI / 12;
//   leftPupil.castShadow = true;
//   owl.add(leftPupil);
//   const rightPupilGeometry = new THREE.SphereGeometry(0.12, 16, 16);
//   const rightPupil = new THREE.Mesh(rightPupilGeometry, pupilMaterial);
//   rightPupil.position.set(0.4, 0.3, 0.85);
//   rightPupil.scale.set(1, 0.25, 1);
//   rightPupil.rotation.z = -Math.PI / 12;
//   rightPupil.castShadow = true;
//   owl.add(rightPupil);
//   // 嘴巴
//   const beakGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
//   const beak = new THREE.Mesh(beakGeometry, beakMaterial);
//   beak.position.set(0, -0.1, 0.9); // 向前移動
//   // 讓鳥喙稍微後仰（大約 15 度）
//   beak.rotation.x = Math.PI - (Math.PI / 8);
//   beak.castShadow = true;
//   owl.add(beak);
//   // 白色肚子
//   const bellyGeometry = new THREE.SphereGeometry(0.6, 32, 32);
//   const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
//   const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
//   belly.position.set(0, -0.6, 0.7); // 在身體前方
//   belly.scale.set(1.4, 1, 0.3); // 稍微拉長，壓扁
//   belly.castShadow = true;
//   owl.add(belly);
//   // 肚子上的四個黑色彎曲線條
//   const curveGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI * 0.6);
//   const curve1 = new THREE.Mesh(curveGeometry, pupilMaterial);
//   curve1.position.set(-0.15, -0.5, 0.9);
//   curve1.rotation.z = 2;
//   curve1.castShadow = true;
//   owl.add(curve1);
//   const curve2 = new THREE.Mesh(curveGeometry, pupilMaterial);
//   curve2.position.set(0.15, -0.5, 0.9);
//   curve2.rotation.z = -1;
//   curve2.castShadow = true;
//   owl.add(curve2);
//   const curve3 = new THREE.Mesh(curveGeometry, pupilMaterial);
//   curve3.position.set(-0.4, -0.5, 0.9);
//   curve3.rotation.z = 2;
//   curve3.castShadow = true;
//   owl.add(curve3);
//   const curve4 = new THREE.Mesh(curveGeometry, pupilMaterial);
//   curve4.position.set(0.4, -0.5, 0.9);
//   curve4.rotation.z = -1;
//   curve4.castShadow = true;
//   owl.add(curve4);
//   // 手臂
//   class CurvedHipArm extends THREE.Curve {
//     getPoint(t) {
//       const arcAngle = Math.PI * 0.8;
//       const radius = 0.5;
//       const angle = t * arcAngle + Math.PI * 0.1;
//       const y = Math.sin(angle) * radius;
//       const x = Math.cos(angle) * radius * 0.6;
//       const z = 0;
//       return new THREE.Vector3(x, y, z);
//     }
//   }
//   const armPath = new CurvedHipArm();
//   const armGeometry = new THREE.TubeGeometry(armPath, 64, 0.03, 8, false);
//   const leftArm = new THREE.Mesh(armGeometry, pupilMaterial);
//   leftArm.position.set(-1.1, -0.3, 0.4);
//   leftArm.rotation.z = Math.PI / 2;
//   leftArm.castShadow = true;
//   owl.add(leftArm);
//   const rightArm = new THREE.Mesh(armGeometry.clone(), pupilMaterial);
//   rightArm.scale.x = -1;
//   rightArm.position.set(1.1, -0.3, 0.4);
//   rightArm.rotation.z = -Math.PI / 2;
//   rightArm.castShadow = true;
//   owl.add(rightArm);
//   // 拳頭
//   const fistRadius = 0.06;
//   const fistGeometry = new THREE.SphereGeometry(fistRadius, 16, 16);
//   const leftEnd = armPath.getPoint(1);
//   const rightEnd = armPath.getPoint(1).clone().multiply(new THREE.Vector3(-1, 1, 1));
//   const leftFist = new THREE.Mesh(fistGeometry, pupilMaterial);
//   leftFist.position.copy(leftEnd);
//   leftFist.position.add(new THREE.Vector3(-0.95, -0.78, 0.4));
//   leftFist.scale.set(1.3, 1, 1.8);
//   leftFist.castShadow = true;
//   owl.add(leftFist);
//   const rightFist = new THREE.Mesh(fistGeometry.clone(), pupilMaterial);
//   rightFist.position.copy(rightEnd);
//   rightFist.position.add(new THREE.Vector3(0.95, -0.78, 0.4));
//   rightFist.scale.set(1.3, 1, 1.3);
//   rightFist.castShadow = true;
//   owl.add(rightFist);
//   // 小腳
//   class CurvedFoot extends THREE.Curve {
//     getPoint(t) {
//       const arcAngle = Math.PI * 0.9;
//       const radius = 0.3;
//       const angle = t * arcAngle + Math.PI * 0.2;
//       const y = Math.sin(angle) * radius + 1.2;
//       const x = Math.cos(angle) * radius * 0.7;
//       const z = 0;
//       return new THREE.Vector3(x, y, z);
//     }
//   }
//   const footPath = new CurvedFoot();
//   const footGeometry = new THREE.TubeGeometry(footPath, 32, 0.025, 8, false);
//   const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
//   leftFoot.position.set(1.35, -0.6, 0.3);
//   leftFoot.rotation.z = 2;
//   leftFoot.scale.x = -1;
//   leftFoot.scale.y = 1.3;
//   leftFoot.castShadow = true;
//   owl.add(leftFoot);
//   const rightFoot = new THREE.Mesh(footGeometry.clone(), footMaterial);
//   rightFoot.scale.x = 1;
//   rightFoot.position.set(-1.35, -0.6, 0.3);
//   rightFoot.rotation.z = -2;
//   rightFoot.scale.y = 1.3;
//   rightFoot.castShadow = true;
//   owl.add(rightFoot);
//   // 腳趾
//   const toeRadius = 0.08;
//   const toeGeometry = new THREE.SphereGeometry(toeRadius, 16, 16);
//   const leftToe = new THREE.Mesh(toeGeometry, footMaterial);
//   const leftEndF = footPath.getPoint(1);
//   leftToe.position.copy(leftEndF);
//   leftToe.position.add(new THREE.Vector3(-0.03, -2.67, 0.3)); // 加上左腳基礎位置
//   leftToe.scale.set(1.5, 1, 1.3);  // 橢圓
//   leftToe.castShadow = true;
//   owl.add(leftToe);
//   const rightToe = new THREE.Mesh(toeGeometry.clone(), footMaterial);
//   const rightEndF = footPath.getPoint(1).clone().multiply(new THREE.Vector3(-1, 1, 1)); // 鏡像
//   rightToe.position.copy(rightEndF);
//   rightToe.position.add(new THREE.Vector3(0.03, -2.67, 0.3)); // 加上右腳基礎位置
//   rightToe.scale.set(1.5, 1, 1.3);  // 橢圓
//   rightToe.castShadow = true;
//   owl.add(rightToe);



//   // 學士帽
//   const capBaseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
//   const capBase = new THREE.Mesh(capBaseGeometry, capMaterial);
//   capBase.position.set(0, 1.4, 0.25); // 向上移動更多
//   capBase.castShadow = true;
//   owl.add(capBase);
//   const capTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.5);
//   const capTop = new THREE.Mesh(capTopGeometry, capMaterial);
//   capTop.position.set(0, 1.6, 0.25); // 對應調整
//   capTop.castShadow = true;
//   owl.add(capTop);
//   // 流蘇 - 對應帽子位置調整
//   class TassalCurve extends THREE.Curve {
//       constructor(start, mid, end) {
//           super();
//           this.start = start; // 起點
//           this.mid = mid;     // 轉彎的中點
//           this.end = end;     // 終點
//       }

//       getPoint(t) {
//           if (t < 0.5) {
//               // 前半段（直線從起點到轉彎點）
//               const x = this.start.x + (this.mid.x - this.start.x) * 2 * t;
//               const y = this.start.y + (this.mid.y - this.start.y) * 2 * t;
//               const z = this.start.z + (this.mid.z - this.start.z) * 2 * t;
//               return new THREE.Vector3(x, y, z);
//           } else {
//               // 後半段（直線從轉彎點到終點）
//               const x = this.mid.x + (this.end.x - this.mid.x) * 2 * (t - 0.5);
//               const y = this.mid.y + (this.end.y - this.mid.y) * 2 * (t - 0.5);
//               const z = this.mid.z + (this.end.z - this.mid.z) * 2 * (t - 0.5);
//               return new THREE.Vector3(x, y, z);
//           }
//       }
//   }
//   const start = new THREE.Vector3(0, 1.68, 0.25);
//   const end = new THREE.Vector3(0.78, 1.4, 0.95);
//   const mid = new THREE.Vector3(0.78, 1.68, 0.95);
//   const tassalCurve = new TassalCurve(start, mid, end);
//   const path = new THREE.CurvePath();
//   path.add(tassalCurve);
//   const tassalStringGeometry = new THREE.TubeGeometry(path, 50, 0.02, 8, false);
//   const tassalString = new THREE.Mesh(tassalStringGeometry, tassalMaterial);
//   tassalString.castShadow = true;
//   owl.add(tassalString);
//   const tassalGroup = new THREE.Group();
//   const numStrands = 12;
//   const tassalRadius = 0.02;
//   const strandLength = 0.2;
//   for (let i = 0; i < numStrands; i++) {
//     const angle = (i / numStrands) * Math.PI * 2;
//     const x = Math.cos(angle) * tassalRadius;
//     const z = Math.sin(angle) * tassalRadius;
//     const strandGeometry = new THREE.CylinderGeometry(0.005, 0.005, strandLength, 3);
//     const strand = new THREE.Mesh(strandGeometry, tassalMaterial);
//     strand.position.set(x, -strandLength, z);
//     strand.lookAt(new THREE.Vector3(x, -strandLength, z));
//     strand.castShadow = true;
//     tassalGroup.add(strand);
//   }
//   tassalGroup.position.set(0.78, 1.5, 0.95);
//   tassalString.add(tassalGroup);
//   scene.add(owl);
//   // 展示台
//   const platformGeometry = new THREE.CylinderGeometry(2, 2, 0.3, 32);
//   const platformMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
//   const platform = new THREE.Mesh(platformGeometry, platformMaterial);
//   platform.position.y = -2;
//   platform.receiveShadow = true;
//   scene.add(platform);
//   camera.position.set(0, 1, 7);
//   camera.lookAt(0, 0, 0);
//   // 滑鼠互動
//   let mouseX = 0, mouseY = 0, targetRotationX = 0, targetRotationY = 0, mouseDown = false, userControlling = false;
//   canvas.addEventListener('mousedown', (event) => {
//     mouseDown = true;
//     userControlling = true;
//     mouseX = event.clientX;
//     mouseY = event.clientY;
//   });
//   window.addEventListener('mouseup', () => {
//     mouseDown = false;
//     setTimeout(() => { userControlling = false; }, 3000);
//   });
//   window.addEventListener('mousemove', (event) => {
//     if (mouseDown) {
//       targetRotationY += (event.clientX - mouseX) * 0.01;
//       targetRotationX += (event.clientY - mouseY) * 0.01;
//       mouseX = event.clientX;
//       mouseY = event.clientY;
//     }
//   });
//   canvas.addEventListener('wheel', (event) => {
//     camera.position.z += event.deltaY * 0.01;
//     camera.position.z = Math.max(3, Math.min(10, camera.position.z));
//   });
//   // 眨眼動畫
//   let blinkTimer = 0;
//   let isBlinking = false;
//   function animate() {
//     requestAnimationFrame(animate);
//     if (!userControlling) {
//       owl.rotation.y += 0.005;
//     } else {
//       owl.rotation.y += (targetRotationY - owl.rotation.y) * 0.05;
//       owl.rotation.x += (targetRotationX - owl.rotation.x) * 0.05;
//     }
//     owl.position.y = Math.sin(Date.now() * 0.001) * 0.05;
//     tassalString.rotation.z = Math.sin(Date.now() * 0.003) * 0.01;
//     tassalGroup.rotation.z = Math.sin(Date.now() * 0.003) * 0.02;
//     blinkTimer++;
//     if (blinkTimer > 240 && !isBlinking) {
//       isBlinking = true;
//       blinkTimer = 0;
//     }
//     if (isBlinking) {
//       const blinkProgress = blinkTimer / 8;
//       if (blinkProgress < 1) {
//         leftEye.scale.y = 1 - blinkProgress * 0.8;
//         rightEye.scale.y = 1 - blinkProgress * 0.8;
//       } else if (blinkProgress < 2) {
//         leftEye.scale.y = 0.2 + (blinkProgress - 1) * 0.8;
//         rightEye.scale.y = 0.2 + (blinkProgress - 1) * 0.8;
//       } else {
//         leftEye.scale.y = 1;
//         rightEye.scale.y = 1;
//         isBlinking = false;
//         blinkTimer = 0;
//       }
//     }
//     renderer.render(scene, camera);
//   }
//   animate();
// }

// document.addEventListener('DOMContentLoaded', () => {
//   initOwl3D();
// });