// ====================
// Imports
// ====================
import * as THREE from 'three';
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ====================
// Variables
// ====================
let scene, camera, renderer, controls;
let autorotate = true;

// ====================
// Scene
// ====================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // لون فاتح قليلاً للتأكد أن المشهد يعمل

// ====================
// Camera
// ====================
camera = new THREE.PerspectiveCamera(
  90, // زاوية أوسع قليلاً
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0); // داخل الكرة بالضبط

console.log('📷 Camera position:', camera.position);

// ====================
// Renderer
// ====================
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('container').appendChild(renderer.domElement);
console.log('🎨 Renderer created');

// ====================
// Controls
// ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

// ====================
// إضافة كرة اختبارية صغيرة للتأكد أن المشهد يعمل
// ====================
function addTestSphere() {
  const testGeometry = new THREE.SphereGeometry(2, 32, 16);
  const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const testSphere = new THREE.Mesh(testGeometry, testMaterial);
  testSphere.position.set(10, 0, -10); // وضعها أمام الكاميرا
  scene.add(testSphere);
  console.log('🔴 تم إضافة كرة اختبار حمراء');
}

// إضافة كرة اختبار مؤقتاً
addTestSphere();

// ====================
// Panorama Sphere
// ====================
const loader = new THREE.TextureLoader();

// تجربة مسار مختلف للصورة
const imagePath = './textures/StartPoint.jpg';
console.log('🔄 محاولة تحميل الصورة من:', imagePath);

loader.load(
  imagePath,
  (texture) => {
    console.log('✅ تم تحميل الصورة بنجاح!');
    console.log('📐 أبعاد الصورة:', texture.image.width, 'x', texture.image.height);
    
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // إنشاء الكرة البانورامية
    const geometry = new THREE.SphereGeometry(100, 64, 64); // تصغير الحجم قليلاً
    
    const material = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.BackSide // استخدام BackSide بدلاً من scale(-1,1,1)
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0); // التأكد من أن الكرة في المركز
    scene.add(sphere);
    
    console.log('🌍 تم إضافة الكرة البانورامية');
    
    // إزالة كرة الاختبار بعد نجاح التحميل
    scene.remove(scene.getObjectById(testSphereId));
  },
  (progress) => {
    console.log(`📊 التحميل: ${Math.round((progress.loaded / progress.total) * 100)}%`);
  },
  (error) => {
    console.error('❌ فشل تحميل الصورة:', error);
    console.log('⚠️ المسار الذي حاولت:', imagePath);
    console.log('📍 تأكد من وجود الملف في: textures/StartPoint.jpg');
  }
);

// حفظ ID كرة الاختبار لإزالتها لاحقاً
let testSphereId;

// ====================
// Animation Loop
// ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    camera.rotation.y += 0.001;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====================
// UI
// ====================
const btn = document.getElementById('toggleRotate');
if (btn) {
  btn.onclick = () => {
    autorotate = !autorotate;
    btn.textContent = autorotate ? '⏸️ AutoRotate' : '▶️ Rotate';
  };
}

// ====================
// Resize
// ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====================
// تشخيص إضافي
// ====================
console.log('🔍 موقع الملف الحالي:', window.location.pathname);
console.log('🔍 المسار الكامل للصورة:', new URL(imagePath, window.location.href).href);
