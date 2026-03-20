import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export function exportSTL(geometry, filename) {
  if (!geometry) return;

  const exporter = new STLExporter();

  // Convert Y-up (Three.js) to Z-up (STL/slicer convention)
  // and ensure the solid sits on the build plate (min Z = 0)
  const geomClone = geometry.clone();
  const rotMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  geomClone.applyMatrix4(rotMatrix);
  geomClone.computeBoundingBox();
  const minZ = geomClone.boundingBox.min.z;
  geomClone.translate(0, 0, -minZ);

  const mesh = new THREE.Mesh(geomClone);
  mesh.updateMatrixWorld(true);
  const buffer = exporter.parse(mesh, { binary: true });
  geomClone.dispose();

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'polyedge.stl';
  a.click();

  URL.revokeObjectURL(url);
}
