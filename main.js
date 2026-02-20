import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ==================== Variables ====================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh = null;
let selectedPoints = [];
let previewLine = null;
let markers = [];
let pipes = [];

// ألوان المسارات
const pathColors = {
  EL: 0xffaa00, // ذهبي
  AC: 0x00ccff, // أزرق فاتح
  WP: 0x0066cc, // أزرق غامق
  WA: 0xff3300, // أحمر
  GS: 0x33cc33  // أخضر
};

let currentPathType = 'EL';

// ==================== تهيئة المشهد ====================
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510); // خلفية داكنة

  // ===== الإضاءة =====
  // إضاءة محيطة
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // إضاءة اتجاهية رئيسية
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  // إضاءة خلفية
  const backLight = new THREE.DirectionalLight(0x446688, 0.5);
  backLight.position.set(-1, 0, -1);
  scene.add(backLight);

  // ===== الكاميرا =====
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 0.1); // داخل الكرة

  // ===== Renderer =====
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050510); // لون الخلفية

  document.getElementById('container').appendChild(renderer.domElement);

  // ===== التحكم =====
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.autoRotate = false;

  // ===== تحميل الصورة البانورامية =====
  loadPanorama();

  // ===== إضافة عناصر المساعدة =====
  addHelpers();

  // ===== إعداد الأحداث =====
  setupEventListeners();

  // ===== بدء الرسم =====
  animate();
}

// ===== تحميل الصورة البانورامية =====
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  
  // استخدام صورة افتراضية إذا لم توجد الصورة المطلوبة
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      console.log('✅ تم تحميل الصورة بنجاح');
      
      // ضبط إعدادات النسيج
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      // إنشاء كرة بانوراما
      const geometry = new THREE.SphereGeometry(500, 64, 64);
      geometry.scale(-1, 1, 1); // لعكس الكرة للداخل
      
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide // مهم جداً للرؤية من الداخل
      });
      
      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);
      
      console.log('✅ تم إنشاء المشهد البانورامي');
      
      // إضافة مسار تجريبي
      addDemoPath();
    },
    (progress) => {
      console.log('⏳ جاري التحميل:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('❌ فشل تحميل الصورة:', error);
      createColoredSphere();
    }
  );
}

// ===== إنشاء كرة ملونة للاختبار =====
function createColoredSphere() {
  console.log('⚪ إنشاء كرة ملونة للاختبار');
  
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  geometry.scale(-1, 1, 1);
  
  // إنشاء نسيج ملون
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // رسم خلفية متدرجة
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#223344');
  gradient.addColorStop(0.5, '#445566');
  gradient.addColorStop(1, '#667788');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // رسم شبكة
  ctx.strokeStyle = '#88aaff';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (canvas.width/16), 0);
    ctx.lineTo(i * (canvas.width/16), canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (canvas.height/8));
    ctx.lineTo(canvas.width, i * (canvas.height/8));
    ctx.stroke();
  }
  
  // رسم نص
  ctx.font = 'bold 80px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BIM Virtual Tour', 400, 500);
  
  const texture = new THREE.CanvasTexture(canvas);
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });
  
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
}

// ===== إضافة مسار تجريبي =====
function addDemoPath() {
  setTimeout(() => {
    // إنشاء مسار حلزوني
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 4) * Math.PI;
      const radius = 300;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle * 2) * 100;
      const z = Math.sin(angle) * radius;
      
      // تحويل النقطة إلى سطح الكرة
      const point = new THREE.Vector3(x, y, z).normalize().multiplyScalar(480);
      points.push(point);
    }
    
    selectedPoints = points;
    createPath('EL');
    console.log('✅ تم إنشاء مسار تجريبي');
  }, 2000);
}

// ===== إضافة عناصر المساعدة =====
function addHelpers() {
  // إضافة نقاط مرجعية
  const dotGeometry = new THREE.SphereGeometry(5, 16, 16);
  
  // نقاط الاتجاهات الرئيسية
  const directions = [
    { pos: [500, 0, 0], color: 0xff3333 }, // يمين
    { pos: [-500, 0, 0], color: 0x33ff33 }, // يسار
    { pos: [0, 500, 0], color: 0x3333ff }, // فوق
    { pos: [0, -500, 0], color: 0xffff33 }, // تحت
    { pos: [0, 0, 500], color: 0xff33ff }, // أمام
    { pos: [0, 0, -500], color: 0x33ffff } // خلف
  ];
  
  directions.forEach(dir => {
    const material = new THREE.MeshStandardMaterial({ color: dir.color, emissive: dir.color });
    const dot = new THREE.Mesh(dotGeometry, material);
    dot.position.set(dir.pos[0], dir.pos[1], dir.pos[2]);
    scene.add(dot);
  });
}

// ===== إعداد الأحداث =====
function setupEventListeners() {
  window.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  
  document.getElementById('toggleRotate').onclick = toggleRotate;
  document.getElementById('toggleDraw').onclick = toggleDraw;
}

// ===== معالج النقر =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(e) {
  if (!sphereMesh || !drawMode) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    const point = hits[0].point.clone();
    selectedPoints.push(point);
    
    // إضافة علامة
    addMarker(point);
    
    // تحديث خط المعاينة
    updatePreview();
    
    console.log(`📍 نقطة ${selectedPoints.length}:`, point);
  }
}

// ===== إضافة علامة =====
function addMarker(position) {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.5
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  markers.push(marker);
}

// ===== تحديث خط المعاينة =====
function updatePreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
  }
  
  if (selectedPoints.length >= 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints(selectedPoints);
    const material = new THREE.LineBasicMaterial({ 
      color: pathColors[currentPathType],
      linewidth: 2
    });
    previewLine = new THREE.Line(geometry, material);
    scene.add(previewLine);
  }
}

// ===== إنشاء المسار النهائي =====
function createPath(type = currentPathType) {
  if (selectedPoints.length < 2) return;
  
  // حذف خط المعاينة
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }
  
  // حذف العلامات
  markers.forEach(marker => scene.remove(marker));
  markers = [];
  
  try {
    // إنشاء منحنى ناعم
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    
    // إنشاء أنبوب
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 4, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: pathColors[type],
      emissive: pathColors[type],
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9
    });
    
    const path = new THREE.Mesh(tubeGeometry, material);
    path.userData.type = type;
    pipes.push(path);
    scene.add(path);
    
    // إضافة نقاط مضيئة عند البداية والنهاية
    addEndpoints(selectedPoints[0], selectedPoints[selectedPoints.length - 1], type);
    
    console.log(`✅ تم إنشاء مسار ${type} بنجاح`);
    selectedPoints = [];
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المسار:', error);
  }
}

// ===== إضافة نقاط البداية والنهاية =====
function addEndpoints(start, end, type) {
  const geometry = new THREE.SphereGeometry(12, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[type],
    emissive: pathColors[type],
    emissiveIntensity: 0.8
  });
  
  const startPoint = new THREE.Mesh(geometry, material);
  startPoint.position.copy(start);
  scene.add(startPoint);
  
  const endPoint = new THREE.Mesh(geometry, material);
  endPoint.position.copy(end);
  scene.add(endPoint);
  
  // إضافة وهج خفيف
  setTimeout(() => {
    scene.remove(startPoint);
    scene.remove(endPoint);
  }, 2000);
}

// ===== التراجع =====
function undoLast() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    
    if (markers.length > 0) {
      const lastMarker = markers.pop();
      scene.remove(lastMarker);
    }
    
    updatePreview();
    console.log('⏪ تم التراجع');
  }
}

// ===== معالج المفاتيح =====
function onKeyDown(e) {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    createPath();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    // إلغاء الرسم
    selectedPoints = [];
    markers.forEach(marker => scene.remove(marker));
    markers = [];
    if (previewLine) {
      scene.remove(previewLine);
      previewLine.geometry.dispose();
      previewLine = null;
    }
  }
}

// ===== وظائف التحكم =====
function toggleRotate() {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  btn.style.background = autorotate ? 'rgba(40, 60, 80, 0.95)' : 'rgba(20, 30, 40, 0.9)';
}

function toggleDraw() {
  drawMode = !drawMode;
  const btn = document.getElementById('toggleDraw');
  btn.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  btn.style.background = drawMode ? '#aa3333' : 'rgba(20, 30, 40, 0.9)';
  document.body.style.cursor = drawMode ? 'crosshair' : 'default';
  console.log('🎨 وضع الرسم:', drawMode ? 'مفعل' : 'معطل');
}

// ===== تغيير الحجم =====
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== حلقة الرسوم المتحركة =====
function animate() {
  requestAnimationFrame(animate);
  
  if (autorotate && sphereMesh) {
    // تدوير بطيء
    const time = Date.now() * 0.0002;
    camera.position.x = 0.1 * Math.sin(time);
    camera.position.z = 0.1 * Math.cos(time);
    camera.position.y = 0;
    camera.lookAt(0, 0, 0);
  }
  
  controls.update();
  renderer.render(scene, camera);
}

// ===== تشغيل التطبيق =====
init();
