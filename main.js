// ====================
// Imports
// ====================
import * as THREE from 'three'; // يستخدم importmap المحلي
import { OrbitControls } from './libs/OrbitControls.js';

console.log('✅ Three.js version:', THREE.REVISION);

// ====================
// Variables
// ====================
let scene, camera, renderer, controls;
let autorotate = true;
let sphereMesh = null;

// ====================
// Scene
// ====================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// ====================
// Camera
// ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1);

// ====================
// Renderer
// ====================
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('container').appendChild(renderer.domElement);

// ====================
// Controls
// ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = autorotate;
controls.autoRotateSpeed = 0.3;
controls.target.set(0, 0, 0);

// ====================
// Panorama Sphere
// ====================
const loader = new THREE.TextureLoader();
loader.load(
  './textures/StartPoint.jpg', // عدل المسار حسب مجلدك
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.SphereGeometry(500, 64, 64);
    geometry.scale(-1, 1, 1); // للعرض من الداخل

    const material = new THREE.MeshBasicMaterial({ map: texture });
    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    console.log('✅ Panorama loaded successfully');
  },
  (progress) => {
    console.log(`🔄 Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
  },
  (error) => {
    console.error('❌ Error loading panorama:', error);
  }
);

// ====================
// Animation Loop
// ====================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====================
// Toggle AutoRotate
// ====================
const btn = document.getElementById('toggleRotate');
if (btn) {
  btn.onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
    btn.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  };
}

// ====================
// Resize Handler
// ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('🌍 Virtual Tour ready!');
