import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

let sphereMesh;
let selectedPoints = [];
let paths = [];
let tempLine = null;
let pointMarkers = [];

const pathColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPathType = 'EL';
window.setCurrentPathType = (t) => currentPathType = t;

// ==================== Init ====================
init();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0,0,0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.2; // بطئ جدًا للتدوير السلس

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  loadPanorama();
  setupEvents();
  animate();
}

// ==================== Load Panorama ====================
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      texture.encoding = THREE.sRGBEncoding; // ⚡ تصحيح الألوان
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;

      const geometry = new THREE.SphereGeometry(500, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);

      document.getElementById('loader').style.display = 'none';
      console.log('✅ Panorama Loaded');
    },
    undefined,
    (err) => console.error(err)
  );
}

// ==================== Drawing ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(e) {
  if (!drawMode || !sphereMesh) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) addPoint(hits[0].point);
}

function addPoint(pos) {
  selectedPoints.push(pos.clone());

  const markerRadius = 5; // مناسب لنصف قطر 500
  const g = new THREE.SphereGeometry(markerRadius, 12, 12);
  const m = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.5
  });

  const marker = new THREE.Mesh(g, m);
  marker.position.copy(pos);
  scene.add(marker);
  pointMarkers.push(marker);

  updateTempLine();
}

function updateTempLine() {
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }

  if (selectedPoints.length < 2) return;

  const g = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const m = new THREE.LineBasicMaterial({
    color: pathColors[currentPathType],
    linewidth: 2
  });

  tempLine = new THREE.Line(g, m);
  scene.add(tempLine);
}

// ==================== Events ====================
function setupEvents() {
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
  };

  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    document.body.style.cursor = drawMode ? 'crosshair' : 'default';
    if (!drawMode) clearDrawing();
  };
}

function clearDrawing() {
  selectedPoints = [];
  pointMarkers.forEach(m=>scene.remove(m));
  pointMarkers = [];
  if (tempLine) {
    scene.remove(tempLine);
    tempLine.geometry.dispose();
    tempLine = null;
  }
}

function onResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== Animate ====================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
