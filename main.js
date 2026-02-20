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
let markerPreview = null;

const pathColors = {
  EL: 0xffcc00,
  AC: 0x00ccff,
  WP: 0x0066cc,
  WA: 0xff3300,
  GS: 0x33cc33
};

let currentPathType = 'EL';
window.setCurrentPathType = t => currentPathType = t;

init();

function init() {

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;

  const light = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(light);

  loadPanorama();
  setupEvents();
  animate();
}

function loadPanorama() {
  const loader = new THREE.TextureLoader();
  loader.load('./textures/StartPoint.jpg', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.x = -1;

    const geo = new THREE.SphereGeometry(500, 128, 128);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });

    sphereMesh = new THREE.Mesh(geo, mat);
    scene.add(sphereMesh);

    document.getElementById('loader').style.display = 'none';
    setupMarkerPreview();
  });
}

function setupMarkerPreview() {
  const geo = new THREE.SphereGeometry(6, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff });
  markerPreview = new THREE.Mesh(geo, mat);
  markerPreview.visible = false;
  scene.add(markerPreview);
}

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onClick(e) {
  if (!drawMode) return;

  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObject(sphereMesh);

  if (hit.length) {
    selectedPoints.push(hit[0].point.clone());
    addPointMarker(hit[0].point);
    updateTempLine();
  }
}

function addPointMarker(pos) {
  const geo = new THREE.SphereGeometry(5, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType]
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  scene.add(m);
  pointMarkers.push(m);
}

function updateTempLine() {
  if (tempLine) scene.remove(tempLine);
  if (selectedPoints.length < 2) return;

  const geo = new THREE.BufferGeometry().setFromPoints(selectedPoints);
  const mat = new THREE.LineBasicMaterial({ color: pathColors[currentPathType] });
  tempLine = new THREE.Line(geo, mat);
  scene.add(tempLine);
}

function saveCurrentPath() {
  if (selectedPoints.length < 2) return;

  for (let i = 0; i < selectedPoints.length - 1; i++) {
    const a = selectedPoints[i];
    const b = selectedPoints[i + 1];
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();

    const geo = new THREE.CylinderGeometry(3, 3, len, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: pathColors[currentPathType],
      emissive: pathColors[currentPathType]
    });

    const cyl = new THREE.Mesh(geo, mat);
    cyl.position.copy(a).add(b).multiplyScalar(0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(cyl);
    paths.push(cyl);
  }

  clearDrawing();
}

function clearDrawing() {
  selectedPoints = [];
  pointMarkers.forEach(p => scene.remove(p));
  pointMarkers = [];
  if (tempLine) scene.remove(tempLine);
}

function setupEvents() {

  renderer.domElement.addEventListener('click', onClick);

  window.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCurrentPath();
    if (e.key === 'Backspace') {
      selectedPoints.pop();
      const p = pointMarkers.pop();
      if (p) scene.remove(p);
      updateTempLine();
    }
  });

  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
  };

  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    controls.autoRotate = !drawMode;
    markerPreview.visible = drawMode;
  };

  // ✅ زر التصدير (دون أي شروط)
  document.getElementById('exportImage').onclick = exportPanoramaImage;
}

/* 🔥 دالة التصدير النهائية */
function exportPanoramaImage() {
  controls.update();
  renderer.render(scene, camera);

  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = 'panorama_export.png';
  link.click();

  console.log('📸 تم تصدير الصورة بنجاح');
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
