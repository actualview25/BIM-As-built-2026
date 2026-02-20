import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

// =======================================
// المتغيرات الأساسية
// =======================================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh = null;
let selectedPoints = [];
let paths = [];
let tempLine = null;
let pointMarkers = [];
let markerPreview = null;

// متغيرات التصدير
let exportCanvas, exportContext;
let isExporting = false;

const pathColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPathType = 'EL';
window.setCurrentPathType = (t) => {
  currentPathType = t;
  console.log('🎨 تغيير النوع إلى:', t);
  if (markerPreview) {
    markerPreview.material.color.setHex(pathColors[currentPathType]);
    markerPreview.material.emissive.setHex(pathColors[currentPathType]);
  }
  
  // تحديث شريط الحالة
  const statusSpan = document.querySelector('#status span');
  if (statusSpan) {
    statusSpan.style.color = '#' + pathColors[t].toString(16).padStart(6, '0');
    statusSpan.textContent = t;
  }
};

// =======================================
// تهيئة المشهد والكاميرا
// =======================================
init();

function init() {
  console.log('🚀 بدء التهيئة...');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 0.1);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.3;
  controls.target.set(0, 0, 0);
  controls.maxDistance = 5;
  controls.minDistance = 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-1, -1, -0.5);
  scene.add(dirLight2);

  loadPanorama();
  setupEvents();
  setupExportCanvas();
  animate();
  
  console.log('✅ التهيئة اكتملت');
}

// =======================================
// تحميل البانوراما بأفضل جودة
// =======================================
function loadPanorama() {
  console.log('🔄 جاري تحميل البانوراما...');
  
  const loader = new THREE.TextureLoader();
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      console.log('✅ تم تحميل الصورة');
      
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.x = -1;

      const geometry = new THREE.SphereGeometry(500, 128, 128);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      if (sphereMesh) scene.remove(sphereMesh);
      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);

      // إخفاء شاشة التحميل
      const loaderEl = document.getElementById('loader');
      if (loaderEl) loaderEl.style.display = 'none';
      
      setupMarkerPreview();
      console.log('✅ Panorama Loaded');
    },
    (progress) => {
      console.log(`⏳ التحميل: ${Math.round((progress.loaded / progress.total) * 100)}%`);
    },
    (err) => {
      console.error('❌ خطأ تحميل البانوراما:', err);
      createTestSphere();
    }
  );
}

// =======================================
// إنشاء كرة اختبارية
// =======================================
function createTestSphere() {
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x224466,
    wireframe: true,
    side: THREE.BackSide
  });
  
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
  
  document.getElementById('loader').style.display = 'none';
  setupMarkerPreview();
}

// =======================================
// إعداد معاينة المؤشر
// =======================================
function setupMarkerPreview() {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.8
  });
  
  markerPreview = new THREE.Mesh(geometry, material);
  scene.add(markerPreview);
  markerPreview.visible = false;
}

// =======================================
// الرسم بالماوس
// =======================================
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onClick(e) {
  if (!drawMode || !sphereMesh) return;
  if (e.target !== renderer.domElement) return;

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) addPoint(hits[0].point);
}

function onMouseMove(e) {
  if (!drawMode || !sphereMesh || !markerPreview) {
    if (markerPreview) markerPreview.visible = false;
    return;
  }
  if (e.target !== renderer.domElement) {
    markerPreview.visible = false;
    return;
  }

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    markerPreview.position.copy(hits[0].point);
    markerPreview.visible = true;
  } else {
    markerPreview.visible = false;
  }
}

// =======================================
// إدارة النقاط والمسارات
// =======================================
function addPoint(pos) {
  selectedPoints.push(pos.clone());
  console.log(`📍 نقطة ${selectedPoints.length} مضافة`);

  addPointMarker(pos);
  updateTempLine();
}

function addPointMarker(position) {
  const g = new THREE.SphereGeometry(6, 16, 16);
  const m = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.6
  });
  const marker = new THREE.Mesh(g, m);
  marker.position.copy(position);
  scene.add(marker);
  pointMarkers.push(marker);
}

function updateTempLine() {
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
  if (selectedPoints.length < 2) return;

  const g = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const m = new THREE.LineBasicMaterial({ color: pathColors[currentPathType] });
  tempLine = new THREE.Line(g, m);
  scene.add(tempLine);
}

function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }

  // حذف خط المعاينة
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }

  const color = pathColors[currentPathType];

  // إنشاء أجزاء مستقيمة بين كل نقطتين
  for (let i = 0; i < selectedPoints.length - 1; i++) {
    const start = selectedPoints[i];
    const end = selectedPoints[i + 1];

    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();

    if (distance < 5) continue;

    const cylinderGeo = new THREE.CylinderGeometry(3.5, 3.5, distance, 12);
    
    const quaternion = new THREE.Quaternion();
    const defaultDir = new THREE.Vector3(0, 1, 0);
    const targetDir = direction.clone().normalize();
    quaternion.setFromUnitVectors(defaultDir, targetDir);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.3
    });

    const cylinder = new THREE.Mesh(cylinderGeo, material);
    cylinder.applyQuaternion(quaternion);

    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    cylinder.position.copy(center);

    cylinder.userData = {
      type: currentPathType,
      points: [start.clone(), end.clone()],
      isPathSegment: true
    };

    scene.add(cylinder);
    paths.push(cylinder);
  }

  // إضافة كرات عند نقاط الانكسار
  selectedPoints.forEach((point, i) => {
    const sphereRadius = (i === 0 || i === selectedPoints.length - 1) ? 6 : 5;
    
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.2
    });

    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(point);

    sphere.userData = {
      type: currentPathType,
      points: [point.clone()],
      isJoint: true,
      pointIndex: i
    };

    scene.add(sphere);
    paths.push(sphere);
  });

  clearCurrentDrawing();
  console.log('✅ تم حفظ المسار المستقيم');
}

function clearCurrentDrawing() {
  selectedPoints = [];
  pointMarkers.forEach(m => scene.remove(m));
  pointMarkers = [];
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
}

// =======================================
// نظام تصدير الصور البانورامية 360 درجة
// =======================================
function setupExportCanvas() {
  exportCanvas = document.createElement('canvas');
  exportCanvas.width = 4096;
  exportCanvas.height = 2048;
  exportContext = exportCanvas.getContext('2d');
  console.log('✅ Canvas التصدير جاهز');
}

function projectToUV(point) {
  const normalized = point.clone().normalize();
  const theta = Math.acos(normalized.y);
  let phi = Math.atan2(normalized.z, normalized.x);
  phi = -phi;
  let u = (phi + Math.PI) / (2 * Math.PI);
  const v = theta / Math.PI;
  u = (u + 1) % 1;
  return { u, v };
}

function drawPathOnCanvas(ctx, points, color, width = 4) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const uvPoints = points.map(p => projectToUV(p));

  ctx.beginPath();
  for (let i = 0; i < uvPoints.length - 1; i++) {
    const p1 = uvPoints[i];
    const p2 = uvPoints[i + 1];

    const x1 = p1.u * exportCanvas.width;
    const y1 = p1.v * exportCanvas.height;
    const x2 = p2.u * exportCanvas.width;
    const y2 = p2.v * exportCanvas.height;

    if (Math.abs(x2 - x1) > exportCanvas.width / 2) {
      ctx.stroke();
      ctx.beginPath();
      
      if (x1 < exportCanvas.width / 2) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(exportCanvas.width, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y2);
        ctx.lineTo(x2, y2);
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(0, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(exportCanvas.width, y2);
        ctx.lineTo(x2, y2);
      }
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();

  // رسم النقاط
  uvPoints.forEach((uv, index) => {
    const x = uv.u * exportCanvas.width;
    const y = uv.v * exportCanvas.height;
    const radius = (index === 0 || index === uvPoints.length - 1) ? width * 2.5 : width * 2;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.restore();
}

function exportPanorama(includePaths = true) {
  if (isExporting) {
    console.log('⏳ جاري التصدير بالفعل...');
    return;
  }

  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  isExporting = true;
  console.log(`🔄 جاري تصدير البانوراما 360 ${includePaths ? 'مع' : 'بدون'} المسارات...`);

  const texture = sphereMesh.material.map;
  const image = texture.image;

  exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);

  if (includePaths) {
    paths.forEach(path => {
      if (path.userData && path.userData.points && path.userData.points.length > 0) {
        const points = path.userData.points;
        const color = pathColors[path.userData.type] || 0xffcc00;
        const colorStr = '#' + color.toString(16).padStart(6, '0');
        drawPathOnCanvas(exportContext, points, colorStr, 4);
      }
    });

    if (selectedPoints.length > 0) {
      const colorStr = '#' + pathColors[currentPathType].toString(16).padStart(6, '0');
      drawPathOnCanvas(exportContext, selectedPoints, colorStr, 3);
    }
  }

  try {
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `panorama-360-${includePaths ? 'with-paths' : 'without-paths'}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    console.log('✅ تم تصدير البانوراما 360 بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تصدير البانوراما:', error);
    alert('حدث خطأ في تصدير الصورة');
  }

  isExporting = false;
}

function exportMarzipanoData() {
  if (!sphereMesh || !sphereMesh.material || !sphereMesh.material.map) {
    alert('❌ الصورة البانورامية غير متوفرة');
    return;
  }

  console.log('🎯 تحضير بيانات Marzipano...');

  const pathsData = [];

  paths.forEach(path => {
    if (path.userData && path.userData.points && path.userData.points.length > 0) {
      const points = path.userData.points;
      const uvPoints = points.map(p => {
        const uv = projectToUV(p);
        return [uv.u, uv.v];
      });

      pathsData.push({
        type: path.userData.type,
        color: '#' + pathColors[path.userData.type].toString(16).padStart(6, '0'),
        points: uvPoints
      });
    }
  });

  if (selectedPoints.length > 0) {
    const uvPoints = selectedPoints.map(p => {
      const uv = projectToUV(p);
      return [uv.u, uv.v];
    });

    pathsData.push({
      type: currentPathType,
      color: '#' + pathColors[currentPathType].toString(16).padStart(6, '0'),
      points: uvPoints,
      isTemporary: true
    });
  }

  const marzipanoData = {
    version: "1.0",
    timestamp: Date.now(),
    imageSize: [exportCanvas.width, exportCanvas.height],
    paths: pathsData
  };

  const jsonStr = JSON.stringify(marzipanoData, null, 2);
  const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);

  const jsonLink = document.createElement('a');
  jsonLink.download = `marzipano-paths-${Date.now()}.json`;
  jsonLink.href = jsonUrl;
  jsonLink.click();

  console.log('✅ تم تصدير بيانات Marzipano');
}

function exportComplete() {
  exportPanorama(true);
  setTimeout(() => {
    exportMarzipanoData();
  }, 500);
}

// =======================================
// أحداث لوحة المفاتيح
// =======================================
function onKeyDown(e) {
  if (!drawMode) return;

  switch(e.key) {
    case 'Enter':
      e.preventDefault();
      saveCurrentPath();
      break;
      
    case 'Backspace':
      e.preventDefault();
      if (selectedPoints.length > 0) {
        selectedPoints.pop();
        const last = pointMarkers.pop();
        if (last) scene.remove(last);
        updateTempLine();
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      clearCurrentDrawing();
      break;
      
    case 'n':
    case 'N':
      e.preventDefault();
      clearCurrentDrawing();
      break;
      
    case '1':
      currentPathType = 'EL';
      window.setCurrentPathType('EL');
      break;
    case '2':
      currentPathType = 'AC';
      window.setCurrentPathType('AC');
      break;
    case '3':
      currentPathType = 'WP';
      window.setCurrentPathType('WP');
      break;
    case '4':
      currentPathType = 'WA';
      window.setCurrentPathType('WA');
      break;
    case '5':
      currentPathType = 'GS';
      window.setCurrentPathType('GS');
      break;
  }
}

// =======================================
// إعداد الأحداث والأزرار
// =======================================
function setupEvents() {
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  // تنظيف الأزرار القديمة
  const oldControls = document.querySelector('.main-controls');
  const oldExport = document.querySelector('.export-controls');
  if (oldControls) oldControls.remove();
  if (oldExport) oldExport.remove();

  // ===== حاوية الأزرار الرئيسية =====
  const mainControls = document.createElement('div');
  mainControls.className = 'main-controls';
  mainControls.innerHTML = `
    <button id="toggleRotate">⏸️ إيقاف التدوير</button>
    <button id="toggleDraw">✏️ تفعيل الرسم</button>
    <button id="finalizeBtn">💾 تثبيت المسار</button>
    <button id="clearBtn">🗑️ مسح الكل</button>
  `;
  document.body.appendChild(mainControls);

  // ===== حاوية أزرار التصدير =====
  const exportControls = document.createElement('div');
  exportControls.className = 'export-controls';
  exportControls.innerHTML = `
    <button class="export-with">🌐 تصدير مع المسارات</button>
    <button class="export-without">🌅 تصدير بدون مسارات</button>
    <button class="export-data">📊 تصدير بيانات Marzipano</button>
    <button class="export-complete">📦 تصدير كامل</button>
  `;
  document.body.appendChild(exportControls);

  // أحداث الأزرار الرئيسية
  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
    document.getElementById('toggleRotate').textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  };

  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    const btn = document.getElementById('toggleDraw');
    btn.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
    btn.style.background = drawMode ? '#aa3333' : '#8f6c4a';
    document.body.style.cursor = drawMode ? 'crosshair' : 'default';
    if (markerPreview) markerPreview.visible = drawMode;
    controls.autoRotate = drawMode ? false : autorotate;
    if (!drawMode) clearCurrentDrawing();
  };

  document.getElementById('finalizeBtn').onclick = saveCurrentPath;

  document.getElementById('clearBtn').onclick = () => {
    if (confirm('هل أنت متأكد من مسح جميع المسارات؟')) {
      paths.forEach(p => scene.remove(p));
      paths = [];
      clearCurrentDrawing();
    }
  };

  // أحداث أزرار التصدير
  document.querySelector('.export-with').onclick = () => exportPanorama(true);
  document.querySelector('.export-without').onclick = () => exportPanorama(false);
  document.querySelector('.export-data').onclick = exportMarzipanoData;
  document.querySelector('.export-complete').onclick = exportComplete;
}

// =======================================
// Resize
// =======================================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =======================================
// Animate
// =======================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
