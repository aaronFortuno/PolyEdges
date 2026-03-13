import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls;
let currentMesh = null;
let edgeLines = null;
let material, wireframeMaterial, edgeMaterial;
let showingWireframe = false;

export function initScene(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x1a1a2e);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 4);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Lighting — 3-point setup for good edge visibility
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Key light — strong, from upper-right-front
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  // Fill light — softer, from left
  const fillLight = new THREE.DirectionalLight(0x8899bb, 0.6);
  fillLight.position.set(-6, 2, 3);
  scene.add(fillLight);

  // Rim/back light — to highlight edges from behind
  const rimLight = new THREE.DirectionalLight(0xaabbcc, 0.5);
  rimLight.position.set(0, -4, -6);
  scene.add(rimLight);

  // Materials
  material = new THREE.MeshPhysicalMaterial({
    color: 0x4ecdc4,
    metalness: 0.05,
    roughness: 0.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    side: THREE.FrontSide
  });

  wireframeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4ecdc4,
    wireframe: true
  });

  // Edge overlay material
  edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x1a3a3a,
    linewidth: 1
  });

  handleResize();
  window.addEventListener('resize', handleResize);

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function handleResize() {
  const container = renderer.domElement.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/**
 * Fit camera so the mesh occupies ~50% of the smallest viewport dimension
 */
function fitCamera(geometry) {
  geometry.computeBoundingSphere();
  const sphere = geometry.boundingSphere;
  const radius = sphere.radius;

  // Distance needed so the sphere subtends ~50% of the viewport
  const fovRad = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;
  const effectiveFov = aspect < 1 ? fovRad : 2 * Math.atan(Math.tan(fovRad / 2) / aspect);
  // Factor 2.0 = fill ~50% of the smaller dimension
  const dist = (radius * 2.0) / Math.tan(effectiveFov / 2);

  // Keep the current direction but adjust distance
  const dir = camera.position.clone().normalize();
  camera.position.copy(dir.multiplyScalar(dist));
  camera.lookAt(sphere.center);
  controls.target.copy(sphere.center);
  controls.update();
}

export function updateMesh(geometry) {
  // Remove old mesh and edges
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
  }
  if (edgeLines) {
    scene.remove(edgeLines);
    edgeLines.geometry.dispose();
  }

  // Add solid mesh
  currentMesh = new THREE.Mesh(geometry, showingWireframe ? wireframeMaterial : material);
  scene.add(currentMesh);

  // Add edge lines overlay (only visible in solid mode)
  if (!showingWireframe) {
    const edgesGeom = new THREE.EdgesGeometry(geometry, 1);
    edgeLines = new THREE.LineSegments(edgesGeom, edgeMaterial);
    scene.add(edgeLines);
  }

  // Auto-fit camera
  fitCamera(geometry);
}

export function setWireframe(enabled) {
  showingWireframe = enabled;
  if (currentMesh) {
    currentMesh.material = enabled ? wireframeMaterial : material;
  }
  // Toggle edge lines
  if (edgeLines) {
    edgeLines.visible = !enabled;
  }
}

export function getCurrentGeometry() {
  return currentMesh ? currentMesh.geometry : null;
}
