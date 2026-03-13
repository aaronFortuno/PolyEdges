import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls;
let solidMesh = null;
let grooveGroup = null;
let edgeLines = null;
let material, edgeMaterial, grooveMaterial;
let showingWireframe = false;
let cameraInitialized = false;

// Stored data for toggling between modes
let currentGrooveRadius = 0;
let currentEdges = null;
let currentBaseGeometry = null;
let currentSegments = 16;

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

  // 3-point lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8899bb, 0.6);
  fillLight.position.set(-6, 2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xaabbcc, 0.5);
  rimLight.position.set(0, -4, -6);
  scene.add(rimLight);

  material = new THREE.MeshPhysicalMaterial({
    color: 0x4ecdc4, metalness: 0.05, roughness: 0.4,
    clearcoat: 0.3, clearcoatRoughness: 0.2, side: THREE.FrontSide
  });

  grooveMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe94560, metalness: 0.1, roughness: 0.3
  });

  edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4ecdc4 });

  handleResize();
  window.addEventListener('resize', handleResize);

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

function handleResize() {
  const container = renderer.domElement.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function fitCamera(geometry) {
  geometry.computeBoundingSphere();
  const { radius, center } = geometry.boundingSphere;
  const fovRad = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;
  const effectiveFov = aspect < 1 ? fovRad : 2 * Math.atan(Math.tan(fovRad / 2) / aspect);
  const dist = (radius * 2.0) / Math.tan(effectiveFov / 2);
  const dir = camera.position.clone().normalize();
  camera.position.copy(dir.multiplyScalar(dist));
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

// Reset camera only when changing solid type
export function resetCamera() {
  if (currentBaseGeometry) {
    fitCamera(currentBaseGeometry);
  }
}

// --- Cleanup ---

function clearSolid() {
  if (solidMesh) { scene.remove(solidMesh); solidMesh.geometry.dispose(); solidMesh = null; }
}

function clearGrooveGroup() {
  if (grooveGroup) {
    if (grooveGroup.userData.templateGeoms) {
      grooveGroup.userData.templateGeoms.forEach(g => g.dispose());
    }
    scene.remove(grooveGroup);
    grooveGroup = null;
  }
}

function clearEdgeLines() {
  if (edgeLines) { scene.remove(edgeLines); edgeLines.geometry.dispose(); edgeLines = null; }
}

// --- Wireframe mode: cylinder+sphere or lines ---

function buildGrooveGroup(baseGeometry, edges, radius, segments) {
  const posAttr = baseGeometry.getAttribute('position');
  const group = new THREE.Group();

  // For square grooves use BoxGeometry, for round use CylinderGeometry
  const isSquare = segments <= 4;
  const shapeGeom = isSquare
    ? new THREE.BoxGeometry(1, 1, 1)
    : new THREE.CylinderGeometry(1, 1, 1, segments);
  const sphGeom = isSquare
    ? new THREE.BoxGeometry(1, 1, 1)
    : new THREE.SphereGeometry(1, segments, Math.ceil(segments / 2));

  const up = new THREE.Vector3(0, 1, 0);

  for (const [i, j] of edges) {
    const a = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    const b = new THREE.Vector3(posAttr.getX(j), posAttr.getY(j), posAttr.getZ(j));
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    dir.normalize();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

    const mesh = new THREE.Mesh(shapeGeom, grooveMaterial);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(up, dir);
    if (isSquare) {
      // Box: width=diameter, height=length, depth=diameter
      mesh.scale.set(radius * 2, len, radius * 2);
    } else {
      mesh.scale.set(radius, len, radius);
    }
    group.add(mesh);
  }

  const usedVerts = new Set();
  for (const [i, j] of edges) { usedVerts.add(i); usedVerts.add(j); }

  for (const vi of usedVerts) {
    const sph = new THREE.Mesh(sphGeom, grooveMaterial);
    sph.position.set(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi));
    sph.scale.setScalar(isSquare ? radius * 2 : radius);
    group.add(sph);
  }

  group.userData.templateGeoms = [shapeGeom, sphGeom];
  return group;
}

function buildEdgeLines(baseGeometry, edges) {
  const posAttr = baseGeometry.getAttribute('position');
  const pts = new Float32Array(edges.length * 6);
  for (let e = 0; e < edges.length; e++) {
    const [i, j] = edges[e];
    pts[e * 6]     = posAttr.getX(i); pts[e * 6 + 1] = posAttr.getY(i); pts[e * 6 + 2] = posAttr.getZ(i);
    pts[e * 6 + 3] = posAttr.getX(j); pts[e * 6 + 4] = posAttr.getY(j); pts[e * 6 + 5] = posAttr.getZ(j);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  return new THREE.LineSegments(geom, edgeMaterial);
}

// --- Public API ---

export function updateMesh(groovedGeometry, realEdges, baseGeometry, grooveRadius, segments) {
  clearSolid();
  clearGrooveGroup();
  clearEdgeLines();

  currentEdges = realEdges;
  currentBaseGeometry = baseGeometry;
  currentGrooveRadius = grooveRadius;
  currentSegments = segments;

  solidMesh = new THREE.Mesh(groovedGeometry, material);
  scene.add(solidMesh);

  if (showingWireframe) {
    solidMesh.visible = false;
    showWireframeObjects();
  }

  // Only fit camera on first render
  if (!cameraInitialized) {
    fitCamera(baseGeometry);
    cameraInitialized = true;
  }
}

function showWireframeObjects() {
  clearGrooveGroup();
  clearEdgeLines();
  if (!currentEdges || !currentBaseGeometry) return;

  if (currentGrooveRadius > 0) {
    grooveGroup = buildGrooveGroup(currentBaseGeometry, currentEdges, currentGrooveRadius, currentSegments);
    scene.add(grooveGroup);
  } else {
    edgeLines = buildEdgeLines(currentBaseGeometry, currentEdges);
    scene.add(edgeLines);
  }
}

export function setWireframe(enabled) {
  showingWireframe = enabled;
  if (solidMesh) solidMesh.visible = !enabled;
  clearGrooveGroup();
  clearEdgeLines();
  if (enabled) showWireframeObjects();
}

export function getCurrentGeometry() {
  return solidMesh ? solidMesh.geometry : null;
}
