import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

// ======================
// المتغيرات الأساسية
// ======================
let scene, camera, renderer, controls;
let autorotate = true;
let drawMode = false;
let sphereMesh = null;
let selectedPoints = [];
let paths = [];
let tempLine = null;
let pointMarkers = [];
let markerPreview = null;
let exportCanvas, exportContext;
let isExporting = false;

const pathColors = {
  EL: 0xffcc00, AC: 0x00ccff, WP: 0x0066cc, WA: 0xff3300, GS: 0x33cc33
};

let currentPathType = 'EL';
window.setCurrentPathType = (t) => {
  currentPathType = t;
  console.log('🎨 تغيير النوع إلى:', t);
  if (markerPreview) {
    markerPreview.material.color.setHex(pathColors[currentPathType]);
    markerPreview.material.emissive.setHex(pathColors[currentPathType]);
  }
};

// ======================
// التهيئة
// ======================
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0.1);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = autorotate;
  controls.autoRotateSpeed = 0.5;
  
  loadPanorama();
  setupEvents();
  setupExportCanvas();
  animate();
}

// ======================
// تحميل الصورة
// ======================
function loadPanorama() {
  const loader = new THREE.TextureLoader();
  loader.load('./textures/StartPoint.jpg', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.x = -1;
    
    const geometry = new THREE.SphereGeometry(500, 128, 128);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
    
    document.getElementById('loader').style.display = 'none';
    setupMarkerPreview();
  }, undefined, (error) => {
    console.error('خطأ في تحميل الصورة:', error);
    createTestSphere();
  });
}

// ======================
// كرة اختبارية
// ======================
function createTestSphere() {
  const geometry = new THREE.SphereGeometry(500, 64, 64);
  const material = new THREE.MeshBasicMaterial({ color: 0x224466, wireframe: true, side: THREE.BackSide });
  sphereMesh = new THREE.Mesh(geometry, material);
  scene.add(sphereMesh);
  document.getElementById('loader').style.display = 'none';
  setupMarkerPreview();
}

// ======================
// معاينة المؤشر
// ======================
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

// ======================
// Raycaster
// ======================
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function onClick(e) {
  if (!drawMode || !sphereMesh) return;
  
  mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphereMesh);
  
  if (hits.length) {
    selectedPoints.push(hits[0].point.clone());
    addPointMarker(hits[0].point.clone());
    updateTempLine();
  }
}

function onMouseMove(e) {
  if (!drawMode || !sphereMesh || !markerPreview) {
    if (markerPreview) markerPreview.visible = false;
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

// ======================
// إدارة النقاط
// ======================
function addPointMarker(position) {
  const geometry = new THREE.SphereGeometry(6, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: pathColors[currentPathType],
    emissive: pathColors[currentPathType],
    emissiveIntensity: 0.6
  });
  const marker = new THREE.Mesh(geometry, material);
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
  
  if (selectedPoints.length >= 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints(selectedPoints);
    const material = new THREE.LineBasicMaterial({ color: pathColors[currentPathType] });
    tempLine = new THREE.Line(geometry, material);
    scene.add(tempLine);
  }
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

// ======================
// حفظ المسار
// ======================
function saveCurrentPath() {
  if (selectedPoints.length < 2) {
    alert('⚠️ أضف نقطتين على الأقل');
    return;
  }
  
  const color = pathColors[currentPathType];
  
  for (let i = 0; i < selectedPoints.length - 1; i++) {
    const start = selectedPoints[i];
    const end = selectedPoints[i + 1];
    
    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();
    
    const cylinderGeo = new THREE.CylinderGeometry(3.5, 3.5, distance, 12);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    
    const material = new THREE.MeshStandardMaterial({
      color: color, emissive: color, emissiveIntensity: 0.4,
      roughness: 0.2, metalness: 0.3
    });
    
    const cylinder = new THREE.Mesh(cylinderGeo, material);
    cylinder.applyQuaternion(quaternion);
    
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    cylinder.position.copy(center);
    
    cylinder.userData = { type: currentPathType, points: [start.clone(), end.clone()] };
    scene.add(cylinder);
    paths.push(cylinder);
  }
  
  selectedPoints.forEach((point, i) => {
    const sphereGeo = new THREE.SphereGeometry(i === 0 || i === selectedPoints.length-1 ? 6 : 5, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: color, emissive: color, emissiveIntensity: 0.5
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(point);
    sphere.userData = { type: currentPathType, points: [point.clone()] };
    scene.add(sphere);
    paths.push(sphere);
  });
  
  clearCurrentDrawing();
  console.log('✅ تم حفظ المسار');
}

// ======================
// Canvas التصدير
// ======================
function setupExportCanvas() {
  exportCanvas = document.createElement('canvas');
  exportCanvas.width = 4096;
  exportCanvas.height = 2048;
  exportContext = exportCanvas.getContext('2d');
}

function projectToUV(point) {
  const n = point.clone().normalize();
  const theta = Math.acos(n.y);
  let phi = Math.atan2(n.z, n.x);
  phi = -phi;
  let u = (phi + Math.PI) / (2 * Math.PI);
  const v = theta / Math.PI;
  u = (u + 1) % 1;
  return { u, v };
}

function drawPath(ctx, points, color, width = 4) {
  if (points.length < 2) return;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  
  const uv = points.map(p => projectToUV(p));
  
  ctx.beginPath();
  for (let i = 0; i < uv.length - 1; i++) {
    const x1 = uv[i].u * exportCanvas.width;
    const y1 = uv[i].v * exportCanvas.height;
    const x2 = uv[i+1].u * exportCanvas.width;
    const y2 = uv[i+1].v * exportCanvas.height;
    
    if (Math.abs(x2 - x1) > exportCanvas.width/2) {
      ctx.stroke();
      ctx.beginPath();
      if (x1 < exportCanvas.width/2) {
        ctx.moveTo(x1, y1); ctx.lineTo(exportCanvas.width, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(x2, y2);
      } else {
        ctx.moveTo(x1, y1); ctx.lineTo(0, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(exportCanvas.width, y2); ctx.lineTo(x2, y2);
      }
    } else {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();
  
  uv.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(p.u * exportCanvas.width, p.v * exportCanvas.height, i === 0 || i === uv.length-1 ? 10 : 8, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  
  ctx.restore();
}

function exportPanorama(includePaths = true) {
  if (!sphereMesh?.material?.map) { alert('❌ الصورة غير متوفرة'); return; }
  
  const image = sphereMesh.material.map.image;
  exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);
  
  if (includePaths) {
    paths.forEach(p => {
      if (p.userData?.points?.length > 0) {
        const color = '#' + pathColors[p.userData.type].toString(16).padStart(6, '0');
        drawPath(exportContext, p.userData.points, color);
      }
    });
  }
  
  const link = document.createElement('a');
  link.download = `panorama-${includePaths ? 'with' : 'without'}-paths-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

function exportMarzipanoData() {
  const data = {
    version: "1.0",
    timestamp: Date.now(),
    imageSize: [exportCanvas.width, exportCanvas.height],
    paths: paths.map(p => ({
      type: p.userData.type,
      color: '#' + pathColors[p.userData.type].toString(16).padStart(6, '0'),
      points: p.userData.points.map(pt => {
        const uv = projectToUV(pt);
        return [uv.u, uv.v];
      })
    })).filter(p => p.points.length > 0)
  };
  
  const link = document.createElement('a');
  link.download = `marzipano-data-${Date.now()}.json`;
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  link.click();
}

// ======================
// أحداث المفاتيح
// ======================
function onKeyDown(e) {
  if (!drawMode) return;
  
  switch(e.key) {
    case 'Enter': e.preventDefault(); saveCurrentPath(); break;
    case 'Backspace':
      e.preventDefault();
      if (selectedPoints.length > 0) {
        selectedPoints.pop();
        if (pointMarkers.length > 0) scene.remove(pointMarkers.pop());
        updateTempLine();
      }
      break;
    case 'Escape': e.preventDefault(); clearCurrentDrawing(); break;
    case '1': currentPathType = 'EL'; window.setCurrentPathType('EL'); break;
    case '2': currentPathType = 'AC'; window.setCurrentPathType('AC'); break;
    case '3': currentPathType = 'WP'; window.setCurrentPathType('WP'); break;
    case '4': currentPathType = 'WA'; window.setCurrentPathType('WA'); break;
    case '5': currentPathType = 'GS'; window.setCurrentPathType('GS'); break;
  }
}

// ======================
// إعداد الأحداث
// ======================
function setupEvents() {
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  document.getElementById('toggleRotate').onclick = () => {
    autorotate = !autorotate;
    controls.autoRotate = autorotate;
    document.getElementById('toggleRotate').textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
  };
  
  document.getElementById('toggleDraw').onclick = () => {
    drawMode = !drawMode;
    const btn = document.getElementById('toggleDraw');
    btn.textContent = drawMode ? '⛔ إيقاف الرسم' : '✏️ تفعيل الرسم';
    btn.style.background = drawMode ? '#aa3333' : 'rgba(20,30,40,0.9)';
    document.body.style.cursor = drawMode ? 'crosshair' : 'default';
    if (markerPreview) markerPreview.visible = drawMode;
    controls.autoRotate = drawMode ? false : autorotate;
    if (!drawMode) clearCurrentDrawing();
  };
  
  // أزرار إضافية
  const finalizeBtn = document.createElement('button');
  finalizeBtn.textContent = '💾 تثبيت المسار';
  finalizeBtn.style.cssText = 'position:absolute; bottom:25px; left:400px; padding:12px 24px; z-index:100; border-radius:40px; background:#228822; color:white; border:2px solid #88ff88; cursor:pointer;';
  finalizeBtn.onclick = saveCurrentPath;
  document.body.appendChild(finalizeBtn);
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️ مسح الكل';
  clearBtn.style.cssText = 'position:absolute; bottom:25px; left:600px; padding:12px 24px; z-index:100; border-radius:40px; background:#882222; color:white; border:2px solid #ff8888; cursor:pointer;';
  clearBtn.onclick = () => { if(confirm('مسح جميع المسارات؟')) { paths.forEach(p => scene.remove(p)); paths = []; } };
  document.body.appendChild(clearBtn);
  
  // أزرار التصدير
  const exportDiv = document.createElement('div');
  exportDiv.style.cssText = 'position:absolute; bottom:100px; right:25px; display:flex; flex-direction:column; gap:10px; z-index:1000; background:rgba(0,0,0,0.8); padding:15px; border-radius:20px; border:2px solid #4a6c8f;';
  
  const exportWithBtn = document.createElement('button');
  exportWithBtn.textContent = '🌐 تصدير مع المسارات';
  exportWithBtn.style.cssText = 'padding:12px 24px; background:#8844aa; color:white; border:2px solid #cc88ff; border-radius:40px; cursor:pointer;';
  exportWithBtn.onclick = () => exportPanorama(true);
  
  const exportWithoutBtn = document.createElement('button');
  exportWithoutBtn.textContent = '🌅 تصدير بدون مسارات';
  exportWithoutBtn.style.cssText = 'padding:12px 24px; background:#448844; color:white; border:2px solid #88ff88; border-radius:40px; cursor:pointer;';
  exportWithoutBtn.onclick = () => exportPanorama(false);
  
  const exportDataBtn = document.createElement('button');
  exportDataBtn.textContent = '📊 تصدير بيانات';
  exportDataBtn.style.cssText = 'padding:12px 24px; background:#aa44aa; color:white; border:2px solid #ff88ff; border-radius:40px; cursor:pointer;';
  exportDataBtn.onclick = exportMarzipanoData;
  
  exportDiv.appendChild(exportWithBtn);
  exportDiv.appendChild(exportWithoutBtn);
  exportDiv.appendChild(exportDataBtn);
  document.body.appendChild(exportDiv);
}

// ======================
// Animation
// ======================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ======================
// بدء التشغيل
// ======================
init();
