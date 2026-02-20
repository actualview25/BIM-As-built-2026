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

// ألوان الأنظمة
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
scene.background = null;

// ==================== Lights ====================
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// ==================== Camera ====================
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 0.1);

// ==================== Renderer ====================
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('container').appendChild(renderer.domElement);

// ==================== Controls ====================
controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ==================== Panorama ====================
const loader = new THREE.TextureLoader();
loader.load('./textures/StartPoint.jpg', texture => {
  texture.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.SphereGeometry(500, 64, 64);
  geo.scale(-1, 1, 1);

  const mat = new THREE.MeshBasicMaterial({ map: texture });
  sphereMesh = new THREE.Mesh(geo, mat);
  scene.add(sphereMesh);

  console.log('✅ Panorama loaded');
});

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
    selectedPoints.push(hits[0].point.clone());
    drawPreview();
  }
});

// ==================== Preview ====================
function drawPreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
  }

  if (selectedPoints.length < 2) return;

  const geo = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  previewLine = new THREE.Line(geo, mat);
  scene.add(previewLine);
}

// ==================== Final Pipe ====================
function finalizePipe() {
  if (selectedPoints.length < 2) return;

  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    previewLine = null;
  }

  const curve = new THREE.CatmullRomCurve3(selectedPoints);
  const geo = new THREE.TubeGeometry(curve, 64, 0.6, 12, false);

  const mat = new THREE.MeshStandardMaterial({
    color: pipeColors[currentPipeType],
    roughness: 0.4,
    metalness: 0.1
  });

  const pipe = new THREE.Mesh(geo, mat);
  pipe.userData.type = currentPipeType;
  pipes.push(pipe);
  scene.add(pipe);

  selectedPoints = [];
}

// ==================== Undo ====================
function undoLast() {
  selectedPoints.pop();
  drawPreview();
}

window.addEventListener('keydown', e => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'Enter') {
    finalizePipe();
  }
});

// ==================== UI ====================
document.getElementById('toggleRotate').onclick = () => {
  autorotate = !autorotate;
};

document.getElementById('toggleDraw').onclick = e => {
  drawMode = !drawMode;
  e.target.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
};

// ==================== Animation ====================
function animate() {
  requestAnimationFrame(animate);

  if (autorotate) {
    camera.position.x = 0.1 * Math.sin(Date.now() * 0.0006);
    camera.position.z = 0.1 * Math.cos(Date.now() * 0.0006);
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
