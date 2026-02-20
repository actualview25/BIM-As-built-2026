import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;

// =======================================
// المتغيرات الأساسية للرسم
// =======================================
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

// =======================================
// تهيئة المشهد والكاميرا
// =======================================
init();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 0.1); // داخل الكرة

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.2;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  loadPanorama();
  setupEvents();
  animate();
}

// =======================================
// تحميل الصورة البانورامية بأفضل جودة
// =======================================
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  loader.load(
    './textures/StartPoint.jpg',
    (texture) => {
      texture.encoding = THREE.sRGBEncoding;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;

      const geometry = new THREE.SphereGeometry(500, 128, 128); // segments مضاعفة
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      sphereMesh = new THREE.Mesh(geometry, material);
      scene.add(sphereMesh);

      console.log('✅ Panorama Loaded');
    },
    undefined,
    (err) => console.error(err)
  );
}

// =======================================
// رسم المسارات باستخدام مؤشر ماوس
// =======================================

// مؤشر ماوس على الكرة
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const markerPreview = new THREE.Mesh(
  new THREE.SphereGeometry(5, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
);
scene.add(markerPreview);
markerPreview.visible = false;

// النقر على الكرة لإضافة نقطة
function onClick(e) {
  if (!drawMode || !sphereMesh) return;

  // تجاهل أي نقر خارج canvas
  if (e.target !== renderer.domElement) return;

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);

  if (hits.length) {
    addPoint(hits[0].point);
  }
}

// تحديث موقع مؤشر الماوس قبل النقر
function onMouseMove(e) {
  if (!drawMode || !sphereMesh) {
    markerPreview.visible = false;
    return;
  }

  // تجاهل أي مؤشر خارج الـ canvas
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

  const g = new THREE.SphereGeometry(5, 12, 12);
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
  const m = new THREE.LineBasicMaterial({ color: pathColors[currentPathType], linewidth: 2 });
  tempLine = new THREE.Line(g, m);
  scene.add(tempLine);
}

function saveCurrentPath() {
  if (selectedPoints.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(selectedPoints);
  const tubeGeo = new THREE.TubeGeometry(curve, 100, 3, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.2
  });

  const pathMesh = new THREE.Mesh(tubeGeo, mat);
  pathMesh.userData = { type: currentPathType, points: [...selectedPoints], createdAt: Date.now() };
  scene.add(pathMesh);
  paths.push(pathMesh);

  clearCurrentDrawing();
}

function clearCurrentDrawing() {
  selectedPoints = [];
  pointMarkers.forEach(m => scene.remove(m));
  pointMarkers = [];
  if (tempLine) { scene.remove(tempLine); tempLine.geometry.dispose(); tempLine=null; }
}

// =======================================
// أحداث لوحة المفاتيح
// =======================================
function onKeyDown(e) {
  if (!drawMode) return;

  switch(e.key) {
    case 'Enter': saveCurrentPath(); break;
    case 'Backspace':
      if (selectedPoints.length>0){
        selectedPoints.pop();
        const last = pointMarkers.pop();
        if(last) scene.remove(last);
        updateTempLine();
      }
      break;
    case 'Escape': clearCurrentDrawing(); break;
    case 'n': case 'N': clearCurrentDrawing(); break;
    case '1': currentPathType='EL'; break;
    case '2': currentPathType='AC'; break;
    case '3': currentPathType='WP'; break;
    case '4': currentPathType='WA'; break;
    case '5': currentPathType='GS'; break;
  }
}

// =======================================
// إعداد الأحداث
// =======================================
function setupEvents() {
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
  };

  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    document.body.style.cursor = drawMode ? 'crosshair' : 'default';
    markerPreview.visible = drawMode;

    // السماح بالدوران دائمًا
    controls.enableRotate = true;
    controls.autoRotate = autorotate;

    if (!drawMode) clearCurrentDrawing();
  };
}

// =======================================
// Resize
// =======================================
function onResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
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
