// ====================
// Imports
// ====================
import * as THREE from 'three';
import { OrbitControls } from './libs/OrbitControls.js';

// ====================
// Variables
// ====================
let scene, camera, renderer, controls;
let sphereMesh = null;
let autorotate = true;

// لكل المسارات الكهربائية
let electricalPaths = {}; // مثال: { "EL": [ [Vector3, Vector3, ...], "AC": [...] ] }
let currentPathType = 'EL'; // يمكنك تغييره حسب النوع
let currentPoints = []; // نقاط المسار الحالي

// ====================
// Scene
// ====================
scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);

// ====================
// Camera
// ====================
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 0.1);

// ====================
// Renderer
// ====================
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
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

// ====================
// Load Panorama
// ====================
const loader = new THREE.TextureLoader();
loader.load('./textures/StartPoint.jpg', texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.SphereGeometry(500, 64, 64);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
});

// ====================
// Raycaster للنقر على الكرة
// ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sphereMesh, true);

    if(intersects.length > 0) {
        const point = intersects[0].point.clone();
        console.log('تم تحديد النقطة:', point);

        // إضافة نقطة للمسار الحالي
        currentPoints.push(point);

        // إنشاء نقطة مرئية
        createHotspot(point, currentPoints.length);

        // إذا هناك نقطتان أو أكثر، رسم خط
        if(currentPoints.length >= 2) {
            drawLine(currentPoints[currentPoints.length-2], currentPoints[currentPoints.length-1], currentPathType);
        }

        // تحديث المسار في المخزن
        electricalPaths[currentPathType] = [...currentPoints];
        console.log('📌 المسار الحالي:', currentPathType, electricalPaths[currentPathType]);
    }
});

// ====================
// رسم نقطة hotspot
// ====================
function createHotspot(position, labelNumber) {
    const geometry = new THREE.SphereGeometry(3, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.userData.label = `نقطة ${labelNumber}`;
    scene.add(sphere);
    return sphere;
}

// ====================
// رسم خط بين نقطتين
// ====================
function drawLine(start, end, type='EL') {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // لون الخط حسب نوع المسار
    let color = 0xffaa00;
    if(type === 'AC') color = 0x00aaff;

    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

// ====================
// تغيير نوع المسار (مثال EL أو AC)
function setPathType(type) {
    currentPathType = type;
    currentPoints = electricalPaths[type] ? [...electricalPaths[type]] : [];
    console.log(`🔄 تم التبديل إلى نوع المسار: ${type}`);
}

// ====================
// Animation Loop
// ====================
function animate() {
    requestAnimationFrame(animate);

    if(autorotate) {
        camera.position.x = 0.1 * Math.sin(Date.now()*0.0006);
        camera.position.z = 0.1 * Math.cos(Date.now()*0.0006);
        camera.lookAt(0,0,0);
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// ====================
// UI - Toggle AutoRotate
// ====================
const btnRotate = document.getElementById('toggleRotate');
btnRotate.onclick = () => {
    autorotate = !autorotate;
    btnRotate.textContent = autorotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير';
};
