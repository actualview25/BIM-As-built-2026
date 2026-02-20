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
let pipes = [];
let markers = []; // للعلامات

// ألوان الأنظمة - أكثر إشراقاً
const pipeColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPipeType = 'EL';

// ==================== Scene ====================
scene = new THREE.Scene();
scene.background = null; // الحفاظ على الشفافية

// ==================== Lights ====================
// إضاءة محيطة أقوى
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

// إضاءة اتجاهية رئيسية
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// إضاءة إضافية من الخلف
const backLight = new THREE.DirectionalLight(0x88aaff, 0.8);
backLight.position.set(-10, -5, -10);
scene.add(backLight);

// إضاءة من الأسفل
const bottomLight = new THREE.PointLight(0x446688, 0.5);
bottomLight.position.set(0, -20, 0);
scene.add(bottomLight);

// ==================== Camera ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1); // نبقى داخل الكرة

// ==================== Renderer ====================
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('container').appendChild(renderer.domElement);

// ==================== Controls ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; // تفعيل الزوم مهم للرؤية
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

// ==================== Panorama ====================
const loader = new THREE.TextureLoader();
loader.load('./textures/StartPoint.jpg', texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  // تحسين جودة النسيج
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const geo = new THREE.SphereGeometry(500, 64, 64);
  geo.scale(-1, 1, 1);

  const mat = new THREE.MeshBasicMaterial({ 
    map: texture,
    side: THREE.BackSide // تأكيد الرؤية من الداخل
  });
  
  sphereMesh = new THREE.Mesh(geo, mat);
  scene.add(sphereMesh);

  console.log('✅ Panorama loaded');
  
  // إضافة مسار تجريبي بعد تحميل الصورة
  setTimeout(addDemoPath, 2000);
}, undefined, (error) => {
  console.error('❌ خطأ في تحميل الصورة:', error);
});

// ==================== إضافة مسار تجريبي ====================
function addDemoPath() {
  // إنشاء مسار حلزوني جميل
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 4) * Math.PI;
    const radius = 350;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle * 3) * 150;
    const z = Math.sin(angle) * radius;
    
    // تحويل النقطة إلى سطح الكرة
    const point = new THREE.Vector3(x, y, z).normalize().multiplyScalar(480);
    points.push(point);
  }
  
  selectedPoints = points;
  
  // إضافة علامات للنقاط
  points.forEach(point => addMarker(point));
  
  // رسم خط المعاينة
  drawPreview();
  
  console.log('✅ مسار تجريبي تم إنشاؤه');
}

// ==================== Raycaster ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', e => {
  if (!sphereMesh || !drawMode) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    const point = hits[0].point.clone();
    selectedPoints.push(point);
    
    // إضافة علامة مرئية
    addMarker(point);
    
    drawPreview();
    console.log('📍 نقطة مضافة:', point);
  }
});

// ==================== إضافة علامة ====================
function addMarker(position) {
  // إنشاء كرة صغيرة في موقع النقطة
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pipeColors[currentPipeType],
    emissive: pipeColors[currentPipeType],
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.1
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  scene.add(marker);
  markers.push(marker);
}

// ==================== Preview ====================
function drawPreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
  }

  if (selectedPoints.length < 2) return;

  // خط معاينة أكثر وضوحاً
  const geo = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const mat = new THREE.LineBasicMaterial({ 
    color: pipeColors[currentPipeType],
    linewidth: 2 // ملاحظة: linewidth غير مدعوم في كل المتصفحات
  });
  previewLine = new THREE.Line(geo, mat);
  scene.add(previewLine);
}

// ==================== Final Pipe ====================
function finalizePipe() {
  if (selectedPoints.length < 2) {
    alert('⚠️ الرجاء إضافة نقطتين على الأقل');
    return;
  }

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
    // إنشاء المسار
    const curve = new THREE.CatmullRomCurve3(selectedPoints);
    
    // زيادة سمك الأنبوب ليكون مرئياً بشكل أفضل
    const geo = new THREE.TubeGeometry(curve, 100, 4, 12, false);

    const mat = new THREE.MeshStandardMaterial({
      color: pipeColors[currentPipeType],
      emissive: pipeColors[currentPipeType],
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });

    const pipe = new THREE.Mesh(geo, mat);
    pipe.userData.type = currentPipeType;
    pipes.push(pipe);
    scene.add(pipe);
    
    // إضافة نقاط مضيئة في البداية والنهاية
    addEndpoints(selectedPoints[0], selectedPoints[selectedPoints.length - 1]);

    console.log('✅ تم إنشاء مسار جديد بنجاح');
    selectedPoints = [];
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المسار:', error);
  }
}

// ==================== إضافة نقاط البداية والنهاية ====================
function addEndpoints(start, end) {
  const geometry = new THREE.SphereGeometry(12, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: pipeColors[currentPipeType],
    emissive: pipeColors[currentPipeType],
    emissiveIntensity: 0.8
  });
  
  const startPoint = new THREE.Mesh(geometry, material);
  startPoint.position.copy(start);
  scene.add(startPoint);
  
  const endPoint = new THREE.Mesh(geometry, material);
  endPoint.position.copy(end);
  scene.add(endPoint);
  
  // إزالة النقاط بعد ثانيتين
  setTimeout(() => {
    scene.remove(startPoint);
    scene.remove(endPoint);
  }, 2000);
}

// ==================== Undo ====================
function undoLast() {
  if (selectedPoints.length > 0) {
    selectedPoints.pop();
    
    // حذف آخر علامة
    if (markers.length > 0) {
      const lastMarker = markers.pop();
      scene.remove(lastMarker);
    }
    
    drawPreview();
    console.log('⏪ تم التراجع');
  }
}

window.addEventListener('keydown', e => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    finalizePipe();
  }
  // مفاتيح لتغيير نوع المسار
  if (e.key === '1') currentPipeType = 'EL';
  if (e.key === '2') currentPipeType = 'AC';
  if (e.key === '3') currentPipeType = 'WP';
  if (e.key === '4') currentPipeType = 'WA';
  if (e.key === '5') currentPipeType = 'GS';
});

// ==================== UI ====================
document.getElementById('toggleRotate').onclick = () => {
  autorotate = !autorotate;
  const btn = document.getElementById('toggleRotate');
  btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
};

document.getElementById('toggleDraw').onclick = e => {
  drawMode = !drawMode;
  e.target.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
  e.target.style.background = drawMode ? '#aa3333' : 'rgba(20, 30, 40, 0.8)';
  document.body.style.cursor = drawMode ? 'crosshair' : 'default';
};

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    // تدوير بطيء حول المحور Y
    const time = Date.now() * 0.0004;
    camera.position.x = 0.1 * Math.sin(time);
    camera.position.z = 0.1 * Math.cos(time);
    camera.position.y = 0.05 * Math.sin(time * 0.5);
    camera.lookAt(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ==================== Resize ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
