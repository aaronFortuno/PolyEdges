import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export function exportSTL(geometry, filename) {
  if (!geometry) return;

  const exporter = new STLExporter();
  const mesh = new THREE.Mesh(geometry);
  // Convert Y-up (Three.js) to Z-up (STL/slicer convention)
  mesh.rotation.x = -Math.PI / 2;
  mesh.updateMatrixWorld(true);
  const buffer = exporter.parse(mesh, { binary: true });

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'polyedge.stl';
  a.click();

  URL.revokeObjectURL(url);
}
